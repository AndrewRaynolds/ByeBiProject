import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
import * as schema from "@shared/schema";
import type { AppDatabase } from "./db";

// Only the disposable-cluster runner can enable this suite. Never uses DATABASE_URL.
describe.skipIf(!process.env.BYEBI_TEST_PG_TOKEN)("planning on isolated real PostgreSQL", () => {
  let pool: Pool, verified = false;
  let Store: typeof import("./storage").DatabaseStorage;
  let store: InstanceType<typeof Store>; let db: AppDatabase;
  beforeAll(async () => {
    const token = process.env.BYEBI_TEST_PG_TOKEN!, port = Number(process.env.BYEBI_TEST_PG_PORT);
    if (!/^[a-f0-9]{48}$/.test(token) || !Number.isInteger(port) || port < 1024 || port > 65535) throw Error("Use disposable runner");
    pool = new Pool({ host: "127.0.0.1", port, user: "byebi_fixture", database: "postgres", ssl: false, max: 5, connectionTimeoutMillis: 2000, statement_timeout: 5000 });
    if ((await pool.query("select current_setting('byebi.test_run', true) as marker")).rows[0].marker !== token) throw Error("Not a disposable test database");
    verified = true;
    await pool.query("CREATE ROLE anon; CREATE ROLE authenticated");
    await pool.query(`CREATE TABLE public.trips (id serial PRIMARY KEY, user_id text NOT NULL, name text NOT NULL, participants integer NOT NULL,
      start_date text NOT NULL, end_date text NOT NULL, departure_city text NOT NULL, destinations text[], experience_type text NOT NULL,
      budget integer, activities text[], special_requests text, include_merch boolean DEFAULT false, created_at timestamp DEFAULT now())`);
    // Execute the actual repository migration, in this new disposable cluster only.
    await pool.query(await readFile(new URL("../supabase/migrations/20261016120000_add_trip_planning.sql", import.meta.url), "utf8"));
    vi.stubEnv("CRITICAL_DATA_PERSISTENCE", "memory"); ({ DatabaseStorage: Store } = await import("./storage"));
    db = drizzle(pool, { schema }); store = new Store({ db, close: async () => {} });
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE public.trips RESTART IDENTITY CASCADE");
    await pool.query(`INSERT INTO public.trips (user_id,name,participants,start_date,end_date,departure_city,destinations,experience_type,budget)
      VALUES ('owner','Fixture',6,'2099-10-10','2099-10-13','Rome',ARRAY['Lisbon'],'bachelor',700)`);
  });
  afterAll(async () => {
    // The runner removes the whole owned cluster; never clean an unverified DB.
    if (verified) await pool.query("DROP TABLE public.trip_planning; DROP TABLE public.trips; DROP ROLE anon; DROP ROLE authenticated");
    await pool?.end(); vi.unstubAllEnvs();
  });
  const patch = async () => {
    const base = (await store.getTripPlanningForUser(1, "owner"))!;
    return { expectedRevision: base.revision, expectedContextRevision: base.contextRevision, plan: base.plan };
  };
  it("has no backfill, persists through a new storage client and atomically updates the trip budget", async () => {
    const p = await patch(); expect(p.expectedRevision).toBe(0);
    expect((await pool.query("SELECT count(*)::int n FROM public.trip_planning")).rows[0].n).toBe(0);
    await store.updateTripPlanningForUser(1, "owner", { ...p, plan: { ...p.plan, budgetPerPerson: 850 } });
    const secondClient = new Store({ db: drizzle(pool, { schema }), close: async () => {} });
    expect(await secondClient.getTripPlanningForUser(1, "owner")).toMatchObject({ revision: 1, plan: { budgetPerPerson: 850 } });
    expect((await store.getTripForUser(1, "owner"))!.budget).toBe(850);
  });
  it.each([0, 1])("serializes simultaneous writes including first creation at revision %s", async (revision) => {
    if (revision) await store.updateTripPlanningForUser(1, "owner", await patch());
    const p = await patch(); const results = await Promise.all([800, 900].map((cap) => store.updateTripPlanningForUser(1, "owner", { ...p, plan: { ...p.plan, budgetPerPerson: cap } })));
    expect(results.map((r) => r.status).sort()).toEqual(["conflict", "updated"]);
    const current = (await store.getTripPlanningForUser(1, "owner"))!;
    expect(current.revision).toBe(revision + 1); expect(current.plan.budgetPerPerson).toBe((await store.getTripForUser(1, "owner"))!.budget);
  });
  it("rejects foreign ownership and stale context, and cascades deletion", async () => {
    const p = await patch(); expect(await store.getTripPlanningForUser(1, "other")).toBeUndefined();
    expect(await store.updateTripPlanningForUser(1, "other", p)).toEqual({ status: "not_found" });
    await pool.query("UPDATE public.trips SET participants=7 WHERE id=1");
    expect(await store.updateTripPlanningForUser(1, "owner", p)).toEqual({ status: "conflict" });
    await store.updateTripPlanningForUser(1, "owner", await patch());
    await store.deleteTripForUser(1, "owner");
    expect((await pool.query("SELECT count(*)::int n FROM public.trip_planning")).rows[0].n).toBe(0);
  });
  it("enables RLS and denies direct anonymous/authenticated access", async () => {
    expect((await pool.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.trip_planning'::regclass")).rows[0].relrowsecurity).toBe(true);
    for (const role of ["anon", "authenticated"]) for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      expect((await pool.query("SELECT has_table_privilege($1,'public.trip_planning',$2) allowed", [role, privilege])).rows[0].allowed).toBe(false);
    }
  });
  it("rolls back plan and trip budget together after a failed write", async () => {
    const p = await patch();
    const failingDb = new Proxy(db, { get(target, key) {
      if (key === "transaction") return (work: Parameters<AppDatabase["transaction"]>[0]) => target.transaction(async (tx) => {
        const result = await work(tx); expect(result).toMatchObject({ status: "updated" }); throw Error("injected before commit");
      });
      return Reflect.get(target, key);
    } });
    const failing = new Store({ db: failingDb, close: async () => {} });
    await expect(failing.updateTripPlanningForUser(1, "owner", { ...p, plan: { ...p.plan, budgetPerPerson: 900 } })).rejects.toThrow("injected");
    expect((await store.getTripPlanningForUser(1, "owner"))!.revision).toBe(0);
    expect((await store.getTripForUser(1, "owner"))!.budget).toBe(700);
  });
});
