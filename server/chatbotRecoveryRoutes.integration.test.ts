import express from 'express';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlannerDraft } from '@shared/plannerSchemas';
const { create, save } = vi.hoisted(() => ({ create: vi.fn(), save: vi.fn() }));
vi.mock('openai', () => ({ default: class { chat = { completions: { create } }; } }));
vi.mock('./storage', () => ({ storage: { createTripIfAbsent: save } }));
vi.mock('./supabase', () => ({ supabase: { auth: { getUser: vi.fn() } } }));
vi.mock('./zapier-integration', () => ({ registerZapierRoutes: vi.fn() }));
const empty = { origin: null, destination: null, startDate: null, endDate: null, participants: null, budgetPerPerson: null, preferenceArchetype: null, interests: null, clearFields: [] };
const tool = (args: unknown) => ({ async *[Symbol.asyncIterator]() {
  // Fragmented arguments model the actual OpenAI transport.
  const json = JSON.stringify(args);
  yield { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call', function: { name: 'update_planner', arguments: json.slice(0, 20) } }] } }] };
  yield { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: json.slice(20) } }] } }] };
} });
describe('real planner adapter through local SSE route, mocked OpenAI', () => {
  let server: Awaited<ReturnType<typeof import('./routes').registerRoutes>>;
  let base: string;
  beforeAll(async () => {
    const app = express(); app.use(express.json());
    server = await (await import('./routes')).registerRoutes(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(() => { create.mockReset(); save.mockClear(); vi.stubEnv('OPENAI_API_KEY', 'synthetic-not-a-credential'); });
  afterAll(async () => {
    vi.unstubAllEnvs();
    if (server?.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  async function post(body: unknown) {
    const response = await fetch(`${base}/api/chat/openai-stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { response, events: (await response.text()).split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6))) };
  }
  it.each(['byebro', 'byebride'] as const)('hydrates the %s brief and completes Milano–Palma without persistence', async brand => {
    // Freeze Date only, leaving real network/deadline timers intact.
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
    try {
      const planner = createPlannerDraft({ brand, destination: 'Palma di Maiorca', startDate: '2027-02-24', endDate: '2027-02-27', participants: 5 });
      create.mockResolvedValueOnce(tool({ ...empty, origin: 'milano' }));
      const { response, events } = await post({ message: 'milano', locale: 'it', planner, conversationHistory: [{ role: 'assistant', content: 'Partiamo dal percorso: da quale città partite?' }] });
      expect(response.status).toBe(200);
      const result = events.find(event => event.tool_result)?.tool_result.result;
      expect(result).toMatchObject({ planner: { brand, origin: { canonical: 'Milano' }, destination: { canonical: 'Palma de Mallorca' }, startDate: '2027-02-24', endDate: '2027-02-27', participants: 5, status: 'review-ready' }, missingFields: [] });
      expect(events.at(-1)).toEqual({ done: true });
      expect(events.find(event => event.content)?.content).toContain('pronto');
      expect(create.mock.calls[0][0].messages[0].content).toContain('2027-02-24');
      expect(create).toHaveBeenCalledTimes(1); expect(save).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
  it('returns a correction rather than silent completion on repeated invalid updates', async () => {
    const planner = createPlannerDraft({ brand: 'byebro', destination: 'Palma di Maiorca', participants: 5 });
    create.mockImplementation(() => tool({ ...empty, participants: 0 }));
    const { events } = await post({ message: 'milano', planner, locale: 'it' });
    expect(events.some(event => event.tool_result?.result.planner)).toBe(false);
    expect(events.find(event => event.content)?.content).toContain('1 a 50');
    expect(events.at(-1)).toEqual({ done: true });
    expect(save).not.toHaveBeenCalled(); expect(create).toHaveBeenCalledTimes(2);
  });
  it('aborts the provider at the server 45-second deadline and emits an SSE error', async () => {
    const realSetTimeout = globalThis.setTimeout;
    let expire: (() => void) | undefined;
    const timer = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, ms?: number, ...args: unknown[]) => {
      if (ms === 45_000) expire = callback;
      return realSetTimeout(callback, ms, ...args);
    }) as typeof setTimeout);
    let providerSignal: AbortSignal | undefined;
    create.mockImplementation((_request, options) => {
      providerSignal = options.signal;
      return { async *[Symbol.asyncIterator]() {
        await new Promise<void>(resolve => providerSignal!.addEventListener('abort', () => resolve(), { once: true }));
      } };
    });
    try {
      const pending = post({ message: 'milano', locale: 'it' });
      await vi.waitFor(() => expect(providerSignal).toBeDefined());
      expect(expire).toBeDefined(); expire!();
      const { events } = await pending;
      expect(providerSignal?.aborted).toBe(true);
      expect(events).toEqual([{ error: 'Assistant request timed out' }]);
      expect(create).toHaveBeenCalledTimes(1); expect(save).not.toHaveBeenCalled();
    } finally { timer.mockRestore(); }
  });

  it('propagates a client disconnect to the provider without another request or a save', async () => {
    let providerSignal: AbortSignal | undefined;
    create.mockImplementation((_request, options) => {
      providerSignal = options.signal;
      return { async *[Symbol.asyncIterator]() {
        await new Promise<void>(resolve => providerSignal!.addEventListener('abort', () => resolve(), { once: true }));
      } };
    });
    const controller = new AbortController();
    const pending = fetch(`${base}/api/chat/openai-stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'milano', locale: 'it' }), signal: controller.signal });
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(providerSignal).toBeDefined());
    controller.abort(); await rejection;
    await vi.waitFor(() => expect(providerSignal?.aborted).toBe(true));
    expect(create).toHaveBeenCalledTimes(1); expect(save).not.toHaveBeenCalled();
  });

});
