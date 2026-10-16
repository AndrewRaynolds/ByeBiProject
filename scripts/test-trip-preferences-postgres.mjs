// Runs only against a fresh temporary PostgreSQL cluster owned by this process.
// No DATABASE_URL, application .env, system service or application migration is used.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
if (process.argv.length !== 4 || process.argv[2] !== "--pg-bin" || !path.isAbsolute(process.argv[3])) {
  console.error("Usage: node scripts/test-trip-preferences-postgres.mjs --pg-bin /absolute/path/to/postgres/bin");
  process.exit(2);
}
const bin = process.argv[3];
for (const name of ["initdb", "pg_ctl", "postgres"]) if (!(await stat(path.join(bin, name))).isFile()) throw Error(`Missing ${name}`);
const env = { ...process.env, NODE_ENV: "test", CRITICAL_DATA_PERSISTENCE: "memory" };
for (const key of Object.keys(env)) if (key.startsWith("PG") || key === "DATABASE_URL" || key.startsWith("BYEBI_TEST_PG_")) delete env[key];
function run(command, args, inherit = false, timeout = 30_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: inherit ? "inherit" : "pipe" });
    let output = "";
    if (!inherit) { child.stdout.on("data", b => output += b); child.stderr.on("data", b => output += b); }
    const timer = setTimeout(() => child.kill("SIGTERM"), timeout);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("close", code => { clearTimeout(timer); code === 0 ? resolve(output) : reject(Error(`Test command failed (${code}): ${output.slice(-2000)}`)); });
  });
}
const temp = await mkdtemp(path.join(tmpdir(), "byebi-e20-pg-"));
const data = path.join(temp, "data");
let attemptedStart = false, stopped = true;
try {
  await run(path.join(bin, "initdb"), ["-D", data, "-U", "byebi_fixture", "--auth=trust", "--encoding=UTF8", "--locale=C"]);
  const server = createServer();
  const port = await new Promise((resolve, reject) => {
    server.once("error", reject); server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  const token = randomBytes(24).toString("hex");
  attemptedStart = true; stopped = false;
  await run(path.join(bin, "pg_ctl"), ["-D", data, "-l", path.join(temp, "postgres.log"), "-w", "-t", "10", "-o", `-h 127.0.0.1 -k ${temp} -p ${port} -c byebi.test_run=${token} -c max_connections=12`, "start"]);
  env.BYEBI_TEST_PG_PORT = String(port); env.BYEBI_TEST_PG_TOKEN = token;
  console.log("Temporary PostgreSQL ready on loopback; running the real DatabaseStorage tests.");
  await run(process.execPath, [path.join(root, "node_modules/vitest/vitest.mjs"), "run", "server/tripPreferences.postgres.test.ts", "--reporter=verbose"], true);
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally {
  if (attemptedStart) {
    try { await run(path.join(bin, "pg_ctl"), ["-D", data, "-w", "-t", "10", "-m", "immediate", "stop"]); stopped = true; }
    catch { console.error(`Could not confirm PostgreSQL shutdown. Temporary files retained: ${temp}`); process.exitCode = 1; }
  }
  if (stopped) { await rm(temp, { recursive: true, force: true }); console.log("Temporary cluster stopped and removed."); }
}
