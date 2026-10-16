import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "./supabase";
import { getSafePostAuthPath } from "./authNavigation";

export const GOOGLE_OAUTH_KEY = "byebi:googleOAuth:v1";
const ATTEMPT_KEY = `${GOOGLE_OAUTH_KEY}:attempt`;
const MAX_AGE = 10 * 60_000;
const attemptSchema = z.object({ version: z.literal(1), id: z.string().uuid(), startedAt: z.number().finite(), next: z.string().max(2048) }).strict();
import { isGoogleAuthEnabled } from "./googleAuthConfig";
export class GoogleAuthError extends Error {
  constructor(public readonly reason: "failed" | "cancelled" | "disabled") { super(reason); }
}
let client: SupabaseClient | undefined;
function oauthClient() {
  // Separate per-tab verifier/session namespace preserves password/email recovery behavior.
  return client ??= createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { flowType: "pkce", detectSessionInUrl: false, autoRefreshToken: false,
      persistSession: true, storageKey: GOOGLE_OAUTH_KEY, storage: sessionStorage },
  });
}
function readAttempt() {
  try { return attemptSchema.parse(JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) ?? "null")); }
  catch { return null; }
}
function clearAttempt(id?: string) {
  // Never clear an attempt started after this operation.
  if (id && readAttempt()?.id !== id) return;
  for (const key of [ATTEMPT_KEY, GOOGLE_OAUTH_KEY, `${GOOGLE_OAUTH_KEY}-code-verifier`, `${GOOGLE_OAUTH_KEY}-user`]) sessionStorage.removeItem(key);
}
export function googleRetryPath() {
  const next = readAttempt()?.next ?? "/";
  return `/auth?next=${encodeURIComponent(getSafePostAuthPath(`?next=${encodeURIComponent(next)}`))}`;
}
let starting: Promise<string> | null = null;
export function startGoogleSignIn(search: string): Promise<string> {
  if (starting) return starting;
  starting = (async () => {
    if (!isGoogleAuthEnabled()) throw new GoogleAuthError("disabled");
    if (!crypto.subtle || typeof crypto.randomUUID !== "function") throw new GoogleAuthError("failed");
    const id = crypto.randomUUID();
    try {
      clearAttempt();
      sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify({ version: 1, id, startedAt: Date.now(), next: getSafePostAuthPath(search) }));
      const redirect = new URL("/auth/callback", window.location.origin); redirect.searchParams.set("attempt", id);
      const { data, error } = await oauthClient().auth.signInWithOAuth({ provider: "google", options: {
        redirectTo: redirect.toString(), skipBrowserRedirect: true, scopes: "openid email profile",
      } });
      if (error || !data.url || readAttempt()?.id !== id) throw new GoogleAuthError("failed");
      const url = new URL(data.url), configured = new URL(import.meta.env.VITE_SUPABASE_URL);
      if (url.username || url.password || url.hash || url.searchParams.getAll("provider").length !== 1 || url.origin !== configured.origin || url.pathname !== `${configured.pathname.replace(/\/$/, "")}/auth/v1/authorize` || url.searchParams.get("provider") !== "google") throw new GoogleAuthError("failed");
      return url.toString();
    } catch { try { clearAttempt(id); } catch { /* Storage can be unavailable. */ } throw new GoogleAuthError("failed"); }
  })().finally(() => { starting = null; });
  return starting;
}

let completion: Promise<string> | null = null;
/** One exchange per document, including StrictMode effect replays. No token/code logging. */
export function finishGoogleSignIn(): Promise<string> {
  if (completion) return completion;
  const url = new URL(window.location.href);
  // Remove provider parameters before any awaited work; do not expose raw error descriptions.
  window.history.replaceState(window.history.state, "", "/auth/callback");
  completion = (async () => {
    const attempt = readAttempt();
    const matchingAttempt = attempt && url.searchParams.getAll("attempt").length === 1 && url.searchParams.get("attempt") === attempt.id;
    try {
      if (!isGoogleAuthEnabled()) throw new GoogleAuthError("disabled");
      if (!attempt || !matchingAttempt || Date.now() - attempt.startedAt > MAX_AGE || attempt.startedAt > Date.now()) throw new GoogleAuthError("failed");
      const hash = new URLSearchParams(url.hash.slice(1));
      if (url.searchParams.has("error") || hash.has("error")) throw new GoogleAuthError("cancelled");
      const codes = url.searchParams.getAll("code");
      if (codes.length !== 1 || !codes[0] || codes[0].length > 2048 || url.hash) throw new GoogleAuthError("failed");
      const { data, error } = await oauthClient().auth.exchangeCodeForSession(codes[0]);
      if (error || !data.session || !data.user || readAttempt()?.id !== attempt.id || Date.now() - attempt.startedAt > MAX_AGE) throw new GoogleAuthError("failed");
      const { data: primary, error: transferError } = await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      if (transferError || !primary.session || primary.user?.id !== data.user.id) throw new GoogleAuthError("failed");
      return getSafePostAuthPath(`?next=${encodeURIComponent(attempt.next)}`);
    } catch (error) { throw error instanceof GoogleAuthError ? error : new GoogleAuthError("failed"); }
    finally { if (matchingAttempt) try { clearAttempt(attempt.id); } catch { /* No application data is cleared. */ } }
  })();
  return completion;
}

export function navigateToGoogle(url: string) { window.location.assign(url); }
export function navigateAfterGoogle(next: string) { window.location.replace(getSafePostAuthPath(`?next=${encodeURIComponent(next)}`)); }
