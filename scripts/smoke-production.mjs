const requestedBaseUrl = process.argv[2] || process.env.APP_BASE_URL;

if (!requestedBaseUrl) {
  console.error(
    "Usage: npm run smoke:production -- https://your-production-domain.example",
  );
  process.exit(1);
}

let baseUrl;
try {
  const parsed = new URL(requestedBaseUrl);
  if (parsed.protocol !== "https:") throw new Error("HTTPS is required");
  baseUrl = parsed.origin;
} catch (error) {
  console.error(`Invalid production URL: ${error.message}`);
  process.exit(1);
}

async function check(path, validate) {
  const url = new URL(path, baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ByeBi-production-smoke-test" },
      redirect: "follow",
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await validate(response, body);
    console.log(`PASS ${url.pathname} (${response.status})`);
  } finally {
    clearTimeout(timeout);
  }
}

const checks = [
  check("/", async (response, body) => {
    if (!response.headers.get("content-type")?.includes("text/html")) {
      throw new Error("Homepage did not return HTML");
    }
    if (!body.toLowerCase().includes("byebi")) {
      throw new Error("Homepage does not contain the ByeBi brand");
    }
  }),
  check("/api/health", async (response, body) => {
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Health endpoint did not return JSON");
    }
    const data = JSON.parse(body);
    if (data.status !== "ok") throw new Error("Server is not healthy");
  }),
  check("/api/ready", async (_response, body) => {
    const data = JSON.parse(body);
    if (data.status !== "ready" || data.persistence !== "database") {
      throw new Error("Application or database is not ready");
    }
  }),
];

const results = await Promise.allSettled(checks);
const failures = results.filter((result) => result.status === "rejected");

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL ${failure.reason?.message || failure.reason}`);
  }
  process.exit(1);
}

console.log(`Production smoke test passed for ${baseUrl}`);
