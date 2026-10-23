import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlannerDraft } from '@shared/plannerSchemas';
import type { StreamChunk } from './openai';
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('openai', () => ({ default: class { chat = { completions: { create } }; } }));
import { executeToolCall, streamOpenAIChatCompletionWithTools } from './openai';
const empty = { origin: null, destination: null, startDate: null, endDate: null, participants: null, budgetPerPerson: null, preferenceArchetype: null, interests: null, clearFields: [] };
const tool = (args: unknown, name = 'update_planner') => ({ async *[Symbol.asyncIterator]() {
  yield { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call', function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args) } }] } }] };
} });
async function collect(context: Parameters<typeof streamOpenAIChatCompletionWithTools>[1], message = 'milano') {
  const chunks: StreamChunk[] = [];
  for await (const chunk of streamOpenAIChatCompletionWithTools(message, context)) chunks.push(chunk);
  return { chunks, text: chunks.filter(c => c.type === 'content').map(c => c.content).join('') };
}
describe('reported Milano–Palma planner failure', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T12:00:00Z')); create.mockReset(); });
  afterEach(() => vi.useRealTimers());
  it('stops repeated invalid dates with a targeted correction and preserves the draft', async () => {
    create.mockImplementation(() => tool({ ...empty, origin: 'milano', destination: 'Palma di Maiorca', startDate: '2026-02-24', endDate: '2026-02-27', participants: 5 }));
    const planner = createPlannerDraft({ brand: 'byebro', destination: 'Palma di Maiorca', participants: 5 });
    const context = { locale: 'it' as const, planner };
    const result = await collect(context);
    expect(context.planner).toEqual(planner);
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.text).toContain('Le date proposte non sono valide');
    expect(result.chunks.filter(c => c.type === 'tool_result')).toHaveLength(1);
  });
});

describe('bounded planner recovery and realistic updates', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T12:00:00Z')); create.mockReset(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  for (const brand of ['byebro', 'byebride'] as const) {
    for (const locale of ['it', 'en', 'es'] as const) {
      it(`completes Milano–Palma 24–27 February 2027 for 5 in ${brand}/${locale}`, async () => {
        const planner = createPlannerDraft({ brand, destination: 'Palma di Maiorca', startDate: '2027-02-24', endDate: '2027-02-27', participants: 5 });
        create.mockImplementation(() => tool({ ...empty, origin: 'milano' }));
        const context = { planner, locale };
        const result = await collect(context);
        expect(context.planner).toMatchObject({ origin: { canonical: 'Milano' }, destination: planner.destination, startDate: '2027-02-24', endDate: '2027-02-27', participants: 5, status: 'review-ready', brand, budgetPerPerson: null, preferences: null });
        expect(result.text).toMatch(/pronto|ready|listo/);
        expect(create).toHaveBeenCalledTimes(1);
        expect(result.chunks.some(c => c.type === 'tool_result' && 'checkoutUrl' in c.result)).toBe(false);
      });
    }
  }
  it('can correct the invalid year on the one allowed repair using history, without losing notes', async () => {
    const planner = createPlannerDraft({ brand: 'byebride', destination: 'Palma di Maiorca', participants: 5, budgetPerPerson: 600, interests: ['food'] });
    create.mockResolvedValueOnce(tool({ ...empty, origin: 'milano', startDate: '2026-02-24', endDate: '2026-02-27' }))
      .mockResolvedValueOnce(tool({ ...empty, origin: 'milano', startDate: '2027-02-24', endDate: '2027-02-27' }));
    const context = { planner, locale: 'it' as const };
    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools('milano', context, [{ role: 'user', content: 'Palma di Maiorca dal 24 al 27 febbraio, siamo 5' }, { role: 'assistant', content: 'Partiamo dal percorso: da quale città partite?' }])) chunks.push(chunk);
    expect(context.planner).toMatchObject({ status: 'review-ready', startDate: '2027-02-24', budgetPerPerson: 600, preferences: planner.preferences, createdAt: planner.createdAt });
    expect(create.mock.calls[1][0].messages).toContainEqual(expect.objectContaining({ role: 'tool', content: expect.stringContaining('startDate') }));
    expect(chunks.at(-1)).toMatchObject({ type: 'content', content: expect.stringContaining('pronto') });
    expect(create).toHaveBeenCalledTimes(2);
  });
  it('uses today at request time rather than the date the server module loaded', async () => {
    vi.setSystemTime(new Date('2026-10-24T12:00:00Z'));
    create.mockResolvedValueOnce({ async *[Symbol.asyncIterator]() { yield { choices: [{ delta: { content: 'ciao' } }] }; } });
    await collect({ locale: 'it' });
    expect(create.mock.calls[0][0].messages[0].content).toContain('Today is 2026-10-24');
    expect(create.mock.calls[0][0].messages[0].content).toContain('NEXT occurrence');
  });
  it.each(['', '2027-02-30', 'garbage'])('rejects invalid date %s without silently erasing known dates', async startDate => {
    const planner = createPlannerDraft({ brand: 'byebro', startDate: '2027-02-24', endDate: '2027-02-27' });
    const result = await executeToolCall('update_planner', { ...empty, origin: 'milano', startDate }, { planner });
    expect(result).toMatchObject({ error: 'Invalid planner details', fields: ['startDate'] });
    expect(planner.origin).toBeNull(); expect(planner.startDate).toBe('2027-02-24');
  });
  it('rejects reversed dates, then accepts a user correction preserving route, group and optional notes', async () => {
    const planner = createPlannerDraft({ brand: 'byebro', origin: 'milano', destination: 'Palma di Maiorca', startDate: '2027-02-24', endDate: '2027-02-27', participants: 5, interests: ['food'] });
    expect(await executeToolCall('update_planner', { ...empty, endDate: '2027-02-23' }, { planner })).toMatchObject({ error: 'Invalid planner details', fields: ['endDate'] });
    const result = await executeToolCall('update_planner', { ...empty, endDate: '2027-02-28' }, { planner });
    expect(result).toMatchObject({ planner: { ...planner, endDate: '2027-02-28', updatedAt: expect.any(String) } });
  });
  it.each([0, 51, 1.5])('asks only for the invalid group count %s', async participants => {
    create.mockImplementation(() => tool({ ...empty, participants }));
    const { text } = await collect({ locale: 'it' });
    expect(text).toBe('Quante persone partecipano, da 1 a 50?');
    expect(create).toHaveBeenCalledTimes(2);
  });
  it.each(['{bad json', 'null', '[]', '{"unknown":true}'])('bounds malformed tool arguments %s', async args => {
    create.mockImplementation(() => tool(args));
    const result = await collect({ locale: 'es' });
    expect(result.text).not.toBe(''); expect(create).toHaveBeenCalledTimes(2);
    expect(result.chunks.some(c => c.type === 'tool_result')).toBe(false);
  });
  it.each(['empty', 'missing-id', 'missing-name'])('does not silently finish a %s stream', async variant => {
    create.mockResolvedValueOnce({ async *[Symbol.asyncIterator]() {
      yield { choices: [{ delta: variant === 'empty' ? {} : { tool_calls: [{ index: 0, ...(variant === 'missing-id' ? {} : { id: 'x' }), function: { ...(variant === 'missing-name' ? {} : { name: 'update_planner' }), arguments: '{}' } }] } }] };
    } });
    expect((await collect({ locale: 'it' })).text).toContain('riscrivere');
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('does not accept an unvalidated model recap after an update failed', async () => {
    create.mockResolvedValueOnce(tool({ ...empty, participants: 0 })).mockResolvedValueOnce({ async *[Symbol.asyncIterator]() { yield { choices: [{ delta: { content: 'Change your destination and retry' } }] }; } });
    const { text } = await collect({ locale: 'en' });
    expect(text).toBe('How many people are traveling, from 1 to 50?');
  });
  it('bounds changing invalid calls as well as exact repeats', async () => {
    let count = 0;
    create.mockImplementation(() => tool({ ...empty, participants: 51 + count++ }));
    expect((await collect({ locale: 'en' })).text).toContain('1 to 50');
    expect(create).toHaveBeenCalledTimes(2);
  });
  it('does not emit state or retry after cancellation during the stream', async () => {
    const controller = new AbortController();
    create.mockResolvedValueOnce({ async *[Symbol.asyncIterator]() { controller.abort(); yield { choices: [{ delta: { content: 'discard' } }] }; } });
    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools('milano', {}, [], controller.signal)) chunks.push(chunk);
    expect(chunks).toEqual([]); expect(create).toHaveBeenCalledTimes(1);
  });
  it('does not log model filler, arguments or provider error messages', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    create.mockResolvedValueOnce({ async *[Symbol.asyncIterator]() {
      yield { choices: [{ delta: { content: 'PRIVATE_MARKER', tool_calls: [{ index: 0, id: 'id', function: { name: 'update_planner', arguments: JSON.stringify({ ...empty, origin: 'PRIVATE_MARKER' }) } }] } }] };
    } });
    await collect({ locale: 'it' });
    create.mockRejectedValueOnce(new Error('PRIVATE_MARKER'));
    await collect({ locale: 'it' });
    expect(JSON.stringify([...log.mock.calls, ...error.mock.calls])).not.toContain('PRIVATE_MARKER');
  });
});


it('interprets yearless February dates as 2027 on 23 October 2026', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
  try {
    const result = await executeToolCall('update_planner', { ...empty, origin: 'milano', destination: 'Palma di Maiorca', startDate: '24/02', endDate: '27/02', participants: 5 }, { planner: createPlannerDraft({ brand: 'byebro' }) });
    expect(result).toMatchObject({ planner: { startDate: '2027-02-24', endDate: '2027-02-27', status: 'review-ready' } });
  } finally { vi.useRealTimers(); }
});


it.each([false, true])('deduplicates valid parallel updates and reports a subsequent invalid proposal: %s', async invalid => {
  create.mockReset();
  create.mockResolvedValueOnce({ async *[Symbol.asyncIterator]() {
    yield { choices: [{ delta: { tool_calls: [
      { index: 0, id: 'one', function: { name: 'update_planner', arguments: JSON.stringify({ ...empty, origin: 'milano' }) } },
      { index: 1, id: 'two', function: { name: 'update_planner', arguments: JSON.stringify({ ...empty, origin: 'milano' }) } },
      ...(invalid ? [{ index: 2, id: 'three', function: { name: 'update_planner', arguments: JSON.stringify({ ...empty, participants: 0 }) } }] : []),
    ] } }] };
  } });
  const { chunks, text } = await collect({ locale: 'it' });
  expect(create).toHaveBeenCalledTimes(1);
  expect(chunks.filter(c => c.type === 'tool_result')).toHaveLength(1);
  expect(text).toContain(invalid ? '1 a 50' : 'Milano');
});
