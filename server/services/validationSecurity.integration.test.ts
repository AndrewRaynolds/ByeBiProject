import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { plannerUpdateArgumentsSchema } from '@shared/plannerSchemas';

// Keep a parser regression from terminating the test runner if it reappears.
it('survives a compressed request with trailing invalid bytes and continues serving', async () => {
  const child: ChildProcess = spawn(process.execPath, ['--input-type=module', '-e', `
    import express from 'express';
    const app = express();
    app.use(express.json());
    app.post('/echo', (req, res) => res.json(req.body));
    app.get('/health', (_req, res) => res.json({ ok: true }));
    app.use((error, _req, res, _next) => res.status(error.status || 400).end());
    const server = app.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
    process.on('SIGTERM', () => { server.closeAllConnections(); server.close(() => process.exit(0)); });
  `], { cwd: process.cwd(), stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  try {
    const address = await Promise.race([
      once(child, 'message').then(([message]) => message as { port: number }),
      once(child, 'exit').then(() => { throw new Error('Local parser fixture exited early'); }),
    ]);
    const base = `http://127.0.0.1:${address.port}`;
    const payload = Buffer.concat([gzipSync(Buffer.from('{"value":"synthetic"}')), Buffer.from('trailing invalid bytes')]);
    const response = await fetch(`${base}/echo`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }, body: payload });
    await response.arrayBuffer();
    expect([200, 400]).toContain(response.status);
    expect((await (await fetch(`${base}/health`)).json())).toEqual({ ok: true });
    expect(child.exitCode).toBeNull();
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  }
});

describe('bounded validation after Zod migration', () => {
  it('rejects oversized planner interests with a bounded issue list', () => {
    const update = { origin: null, destination: null, startDate: null, endDate: null, participants: null, budgetPerPerson: null, preferenceArchetype: null, clearFields: [] };
    const result = plannerUpdateArgumentsSchema.safeParse({ ...update, interests: Array(10_000).fill({ privateMarker: 'synthetic' }) });
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected oversized interests to fail');
    expect(result.error.issues).toHaveLength(1);
    expect(result.error.issues[0]).toMatchObject({ code: 'too_big', path: ['interests'] });
    expect(JSON.stringify(result.error.issues)).not.toContain('privateMarker');
  });
});
