# Real PostgreSQL verification for saved preferences

This opt-in storage integration test complements the simulated adapter tests in
`server/tripPreferences.test.ts`. It runs the actual `DatabaseStorage` implementation
and Drizzle SQL on a fresh local PostgreSQL cluster using the existing `pg` dependency.
It does not start the application server or test production.

## Run

Provide an existing PostgreSQL binary directory containing `postgres`, `initdb` and
`pg_ctl` (run as a regular user):

```sh
node scripts/test-trip-preferences-postgres.mjs --pg-bin /absolute/path/to/postgres/bin
```

The runner creates a new private directory in the OS temporary location, initializes
a disposable cluster, selects an available loopback port, starts PostgreSQL listening
only on `127.0.0.1` and its temporary Unix socket, and runs the dedicated Vitest suite.
It stops PostgreSQL and removes its data directory after success or ordinary command
failure. If shutdown cannot be confirmed, it preserves the directory and reports its
location for inspection. An abrupt process/OS kill can still require manual cleanup.
No persistent service or project dependency is installed by the runner.

The runner discards inherited PostgreSQL variables and `DATABASE_URL`, forces the
application storage singleton to memory, and never reads the application `.env`.
The suite connects only to a fixed fixture user on loopback. Before any fixture DDL
it verifies a random per-run marker configured by its parent PostgreSQL process.
It neither accepts a database URL nor falls back to the application's database.
Do not configure or run this suite against production or an existing shared cluster.
Ordinary `npm test` skips the five cases unless invoked with the runner's marker.

Fixture DDL creates only an isolated schema and a `trips` table matching the existing
column contract. It is not an application migration and does not validate migration
history. The table has no Supabase authentication/RLS configuration. The injected
Drizzle connection uses local plaintext transport; production connection setup and TLS
in `createDatabase` are outside this storage-level test.

## Coverage

- Update/remove only preference notes, preserving all other trip columns and legacy
  null notes on another row; no duplicate trip is created.
- A non-owner and a missing ID cannot update a row, even with a valid revision.
- Concurrent requests through separate PostgreSQL connections produce one accepted
  update and one conflict; retrying the applied content is idempotent.
- A separate connection holds an actual row lock. The test observes the writer's
  `Lock` wait and blocker PID in PostgreSQL statistics, changes the notes, commits,
  then checks that the waiting adapter compares the committed value and refuses
  its stale write. This does not rely on an arbitrary delay to assert lock behavior.
- An injected failure after the real SQL update but before commit rolls back the
  change. Another connection sees the original row; no writer is left idle in a
  transaction, and a subsequent update succeeds.

## Runtime used for the local audit

The 16 October 2026 audit used PostgreSQL **16.14** on macOS arm64, from npm package
[`@embedded-postgres/darwin-arm64@16.14.0-beta.17`](https://www.npmjs.com/package/@embedded-postgres/darwin-arm64/v/16.14.0-beta.17).
The package is only a temporary test runtime, not a ByeBi dependency. Its package
integrity was:

```text
sha512-CB1DFZ08zfmNapx231rAJW74UZfs1jQmeGLwbQSaAIRVs2uqEdMhVNLwVlztFG3ZPSeuCsgTn/0yeYDmKF67og==
```

The package's `beta.17` suffix is its distribution version; the executable identified
itself as PostgreSQL 16.14. Tests do not establish the version or configuration of
production. For another platform, supply its own PostgreSQL binaries without changing
project dependencies. Native binaries must be obtained and reviewed separately.
