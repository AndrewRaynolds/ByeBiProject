import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Pool, type PoolClient } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import type { AppDatabase } from "./db";
import { tripPreferencesSnapshot } from "./tripPreferences";

// Opt in only via the disposable-cluster runner, never a configured application DB.
const enabled = Boolean(process.env.BYEBI_TEST_PG_TOKEN);
describe.skipIf(!enabled)("preference updates on real isolated PostgreSQL", () => {
  let pool: Pool, writerPool: Pool;
  let db: AppDatabase;
  let Store: typeof import("./storage").DatabaseStorage;
  let store: InstanceType<typeof Store>;
  let verified = false;
  const fixture = "byebi_e20_fixture";
  beforeAll(async () => {
    const port = Number(process.env.BYEBI_TEST_PG_PORT);
    const token = process.env.BYEBI_TEST_PG_TOKEN!;
    if (!Number.isInteger(port) || port < 1024 || port > 65535 || !/^[a-f0-9]{48}$/.test(token)) throw Error("Use the temporary PostgreSQL runner");
    const config = { host: "127.0.0.1", port, user: "byebi_fixture", database: "postgres", ssl: false as const,
      connectionTimeoutMillis: 2000, statement_timeout: 5000, options: `-c search_path=${fixture}` };
    pool = new Pool({ ...config, max: 3, application_name: "byebi_e20_observer" });
    const result = await pool.query("select current_setting('byebi.test_run', true) as marker, version() as version");
    if (result.rows[0].marker !== token) throw Error("Refusing a database not owned by the temporary runner");
    verified = true;
    console.log(`Real engine: ${result.rows[0].version.split(" on ")[0]}`);
    await pool.query(`CREATE SCHEMA ${fixture}`);
    // Fixture DDL only, matching the existing trips contract; no migration runner.
    await pool.query(`CREATE TABLE ${fixture}.trips (
      id serial PRIMARY KEY, user_id text NOT NULL, name text NOT NULL, participants integer NOT NULL,
      start_date text NOT NULL, end_date text NOT NULL, departure_city text NOT NULL, destinations text[],
      experience_type text NOT NULL, budget integer, activities text[], special_requests text,
      include_merch boolean DEFAULT false, created_at timestamp DEFAULT now()
    )`);
    writerPool = new Pool({ ...config, max: 3, application_name: "byebi_e20_writer" });
    db = drizzle(writerPool, { schema });
    vi.stubEnv("CRITICAL_DATA_PERSISTENCE", "memory");
    ({ DatabaseStorage: Store } = await import("./storage"));
    store = new Store({ db, close: async () => {} });
  });
  beforeEach(async () => {
    await pool.query(`TRUNCATE ${fixture}.trips RESTART IDENTITY`);
    await pool.query(`INSERT INTO ${fixture}.trips (user_id,name,participants,start_date,end_date,departure_city,destinations,experience_type,budget,activities,special_requests,include_merch)
      VALUES ('owner','Fixture',6,'2099-10-10','2099-10-13','Rome',ARRAY['Lisbon'],'bachelor',600,ARRAY['museums'],'keep this',true),
      ('other','Other fixture',4,'2099-10-10','2099-10-13','Rome',ARRAY['Lisbon'],'bachelorette',NULL,NULL,NULL,false)`);
  });
  afterAll(async () => {
    await writerPool?.end();
    if (verified) await pool.query(`DROP SCHEMA ${fixture} CASCADE`);
    await pool?.end(); vi.unstubAllEnvs();
  });
  const revision = async () => tripPreferencesSnapshot((await store.getTripForUser(1, "owner"))!).revision;
  async function waitForBlockedWriter(blocker: PoolClient) {
    const { rows: [{ pid }] } = await blocker.query("SELECT pg_backend_pid() AS pid");
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const { rows } = await pool.query(`SELECT pid, pg_blocking_pids(pid) AS blockers FROM pg_stat_activity
        WHERE application_name='byebi_e20_writer' AND wait_event_type='Lock'`);
      if (rows.some(row => row.blockers.includes(pid))) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw Error("Writer never waited on the real row lock");
  }
  it("updates only preference notes, preserves legacy null and removes explicitly", async () => {
    const original = (await store.getTripForUser(1, "owner"))!;
    const outcome = await store.updateTripPreferencesForUser(1, "owner", { notes: ["team games"], expectedRevision: await revision() });
    expect(outcome.status).toBe("updated");
    expect(await store.getTripForUser(1, "owner")).toEqual({ ...original, activities: ["team games"] });
    expect((await store.getTripForUser(2, "other"))?.activities).toBeNull();
    await store.updateTripPreferencesForUser(1, "owner", { notes: [], expectedRevision: await revision() });
    expect((await store.getTripForUser(1, "owner"))?.activities).toEqual([]);
    expect((await pool.query(`SELECT count(*)::int AS count FROM ${fixture}.trips`)).rows[0].count).toBe(2);
  });
  it("isolates owners and missing IDs even with a valid revision", async () => {
    const before = await pool.query(`SELECT * FROM ${fixture}.trips ORDER BY id`);
    const patch = { notes: ["forbidden"], expectedRevision: await revision() };
    expect(await store.getTripForUser(1, "other")).toBeUndefined();
    expect(await store.updateTripPreferencesForUser(1, "other", patch)).toEqual({ status: "not_found" });
    expect(await store.updateTripPreferencesForUser(999, "owner", patch)).toEqual({ status: "not_found" });
    expect((await pool.query(`SELECT * FROM ${fixture}.trips ORDER BY id`)).rows).toEqual(before.rows);
  });
  it("serializes two real connections: one winner, one conflict, safe idempotent retry", async () => {
    const base = await revision();
    const results = await Promise.all(["first", "second"].map(note => store.updateTripPreferencesForUser(1, "owner", { notes: [note], expectedRevision: base })));
    expect(results.map(r => r.status).sort()).toEqual(["conflict", "updated"]);
    const winner = results.find(r => r.status === "updated")!;
    if (winner.status !== "updated") throw Error("No winning write");
    const current = (await store.getTripForUser(1, "owner"))!;
    expect(current.activities).toEqual(winner.preferences.notes);
    const conflict = results.find(r => r.status === "conflict")!;
    expect(conflict).toMatchObject({ status: "conflict", preferences: tripPreferencesSnapshot(current) });
    expect(await store.updateTripPreferencesForUser(1, "owner", { notes: current.activities!, expectedRevision: base })).toMatchObject({ status: "updated", preferences: tripPreferencesSnapshot(current) });
  });
  it("waits on a real row lock and compares the post-commit value before writing", async () => {
    const base = await revision(), blocker = await pool.connect();
    let pending: ReturnType<typeof store.updateTripPreferencesForUser> | undefined;
    try {
      await blocker.query("BEGIN"); await blocker.query(`SELECT id FROM ${fixture}.trips WHERE id=1 FOR UPDATE`);
      pending = store.updateTripPreferencesForUser(1, "owner", { notes: ["stale"], expectedRevision: base });
      // Attach a rejection handler immediately, including when a failed assertion takes time.
      void pending.catch(() => {});
      await waitForBlockedWriter(blocker);
      await blocker.query(`UPDATE ${fixture}.trips SET activities=ARRAY['committed elsewhere'] WHERE id=1`);
      await blocker.query("COMMIT");
      expect(await pending).toMatchObject({ status: "conflict", preferences: { notes: ["committed elsewhere"] } });
      expect((await store.getTripForUser(1, "owner"))?.activities).toEqual(["committed elsewhere"]);
    } finally { await blocker.query("ROLLBACK"); blocker.release(); if (pending) await pending.catch(() => {}); }
  });
  it("rolls back a failure after the actual update and releases its lock", async () => {
    const original = (await store.getTripForUser(1, "owner"))!;
    let reachedUpdated = false;
    // Inject failure after the real callback/SQL, before PostgreSQL COMMIT.
    const failingDb = new Proxy(db, { get(target, key) {
      if (key === "transaction") return (work: Parameters<AppDatabase["transaction"]>[0]) => target.transaction(async tx => {
        const outcome = await work(tx);
        expect(outcome).toMatchObject({ status: "updated", preferences: { notes: ["must roll back"] } });
        reachedUpdated = true; throw Error("injected before commit");
      });
      return Reflect.get(target, key);
    } });
    const failing = new Store({ db: failingDb, close: async () => {} });
    await expect(failing.updateTripPreferencesForUser(1, "owner", { notes: ["must roll back"], expectedRevision: await revision() })).rejects.toThrow("injected before commit");
    expect(reachedUpdated).toBe(true);
    expect(await store.getTripForUser(1, "owner")).toEqual(original);
    expect((await pool.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name='byebi_e20_writer' AND state='idle in transaction'")).rows[0].count).toBe(0);
    expect((await store.updateTripPreferencesForUser(1, "owner", { notes: ["after rollback"], expectedRevision: await revision() })).status).toBe("updated");
  });
});
