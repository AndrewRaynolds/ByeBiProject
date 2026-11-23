import { describe, expect, it } from "vitest";
import { createVercelConfig } from "./vercel-config";

const env = { API_BACKEND_ORIGIN: "https://api.example.com", VITE_SUPABASE_URL: "https://auth.example.com" };

describe("Vercel deployment routing", () => {
  it.each([undefined, "http://api.example.com", "https://user:secret@api.example.com", "https://api.example.com/api", "https://api.example.com?key=secret", "https://api.example.com/#fragment", "https://byebi.it", "https://www.byebi.it", "https://preview.vercel.app"])("rejects unsafe or recursive origin %s", (origin) => {
    expect(() => createVercelConfig({ ...env, API_BACKEND_ORIGIN: origin, VERCEL_URL: "preview.vercel.app" })).toThrow("API_BACKEND_ORIGIN");
  });

  it("proxies all API paths before static routing without caching private responses", () => {
    const { routes } = createVercelConfig(env);
    const api = routes[0];
    for (const path of ["/api", "/api/health", "/api/chat/openai-stream", "/api/stripe/webhook", "/api/trips/1/planning"]) {
      expect(path.replace(new RegExp(api.src!), api.dest!)).toBe(`https://api.example.com${path}`);
    }
    expect(new RegExp(api.src!).test("/apiary")).toBe(false);
    expect(api).not.toHaveProperty("methods");
    expect(api.headers?.["Cache-Control"]).toBe("no-store");
    expect(api.headers?.["x-vercel-enable-rewrite-caching"]).toBe("0");
    expect(routes[2]).toEqual({ handle: "filesystem" });
    expect(routes[3].dest).toBe("/index.html");
  });

  it("retains the application CSP for frontend pages, including custom Supabase origins", () => {
    const headers = createVercelConfig(env).routes[1].headers!;
    expect(headers["Content-Security-Policy"]).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co https://auth.example.com");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Cache-Control"]).toBe("no-cache");
  });
});
