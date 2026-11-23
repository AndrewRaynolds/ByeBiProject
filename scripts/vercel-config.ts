import { buildContentSecurityPolicy } from "../server/httpSecurity";

export function createVercelConfig(env: NodeJS.ProcessEnv) {
  const invalidOrigin = () => new Error("API_BACKEND_ORIGIN must be a separate HTTPS origin without credentials, path, query or fragment");
  let backend: URL;
  try {
    backend = new URL(env.API_BACKEND_ORIGIN || "");
  } catch {
    throw invalidOrigin();
  }
  if (backend.protocol !== "https:" || backend.username || backend.password ||
      backend.pathname !== "/" || backend.search || backend.hash ||
      backend.hostname === "byebi.it" || backend.hostname === "www.byebi.it" ||
      [env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL].includes(backend.host)) {
    throw invalidOrigin();
  }

  const policy = buildContentSecurityPolicy("production", env.VITE_SUPABASE_URL);
  const csp = policy ? Object.entries(policy.directives).map(([name, values]) =>
    `${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} ${values.join(" ")}`.trim(),
  ).join("; ") : "";

  return {
    version: 3,
    routes: [
      // API matching is terminal and precedes the SPA fallback, for every method.
      {
        src: "^(/api(?:/.*)?)$",
        dest: `${backend.origin}$1`,
        headers: {
          "Cache-Control": "no-store",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
          "x-vercel-enable-rewrite-caching": "0",
        },
      },
      {
        src: "/(.*)",
        headers: {
          "Content-Security-Policy": csp,
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Referrer-Policy": "no-referrer",
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
          "Cache-Control": "no-cache",
        },
        continue: true,
      },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index.html" },
    ],
  };
}
