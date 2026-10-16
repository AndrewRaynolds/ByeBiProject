/** @vitest-environment jsdom */
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { createClient, signInWithOAuth, exchangeCodeForSession, setSession } = vi.hoisted(()=>({createClient:vi.fn(),signInWithOAuth:vi.fn(),exchangeCodeForSession:vi.fn(),setSession:vi.fn()}));
vi.mock("@supabase/supabase-js",()=>({createClient}));
vi.mock("./supabase",()=>({supabase:{auth:{setSession}}}));
let auth:typeof import("./googleAuth");
const key="byebi:googleOAuth:v1", attemptKey=key+":attempt";
beforeEach(async()=>{
 vi.resetModules();vi.stubGlobal("crypto",webcrypto);vi.stubEnv("VITE_GOOGLE_AUTH_ENABLED","true");vi.stubEnv("VITE_SUPABASE_URL","https://example.supabase.co");vi.stubEnv("VITE_SUPABASE_ANON_KEY","fake");
 sessionStorage.clear();localStorage.clear();window.history.replaceState({},"","/auth?next=%2Fcheckout");
 for(const fn of [createClient,signInWithOAuth,exchangeCodeForSession,setSession])fn.mockReset();
 createClient.mockReturnValue({auth:{signInWithOAuth,exchangeCodeForSession}});
 signInWithOAuth.mockImplementation(async()=>{sessionStorage.setItem(key+"-code-verifier","sdk-verifier");return{data:{url:"https://example.supabase.co/auth/v1/authorize?provider=google"},error:null};});
 exchangeCodeForSession.mockResolvedValue({data:{session:{access_token:"fake-access",refresh_token:"fake-refresh"},user:{id:"owner"}},error:null});
 setSession.mockResolvedValue({data:{session:{user:{id:"owner"}},user:{id:"owner"}},error:null});auth=await import("./googleAuth");
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function callback(extra="&code=fixture-code") {await auth.startGoogleSignIn(window.location.search);const attempt=JSON.parse(sessionStorage.getItem(attemptKey)!);window.history.replaceState({},"",`/auth/callback?attempt=${attempt.id}${extra}`);return attempt;}
describe("isolated Google PKCE handoff",()=>{
 it("defaults off, without creating a client or modifying a draft",async()=>{
  vi.stubEnv("VITE_GOOGLE_AUTH_ENABLED","false");localStorage.setItem("currentItinerary","preserve");await expect(auth.startGoogleSignIn("?next=/checkout")).rejects.toMatchObject({reason:"disabled"});expect(createClient).not.toHaveBeenCalled();expect(localStorage.getItem("currentItinerary")).toBe("preserve");
 });
 it("uses a per-tab PKCE namespace, minimal scopes and internal callback without trip data",async()=>{
  localStorage.setItem("byebi:plannerDraft:v1","draft");const a=auth.startGoogleSignIn("?next=/trips/42"),b=auth.startGoogleSignIn("?next=/checkout");expect(a).toBe(b);await a;
  expect(signInWithOAuth).toHaveBeenCalledTimes(1);expect(createClient).toHaveBeenCalledWith("https://example.supabase.co","fake",expect.objectContaining({auth:expect.objectContaining({flowType:"pkce",detectSessionInUrl:false,autoRefreshToken:false,storageKey:key,storage:sessionStorage})}));
  const options=signInWithOAuth.mock.calls[0][0].options;expect(options).toMatchObject({skipBrowserRedirect:true,scopes:"openid email profile"});const url=new URL(options.redirectTo);expect(url.pathname).toBe("/auth/callback");expect([...url.searchParams.keys()]).toEqual(["attempt"]);expect(localStorage.getItem("byebi:plannerDraft:v1")).toBe("draft");
 });
 it.each(["https://evil.example/authorize?provider=google","https://example.supabase.co/other?provider=google","https://example.supabase.co/auth/v1/authorize?provider=github"])("refuses unexpected authorization URL %s",async url=>{
  signInWithOAuth.mockResolvedValue({data:{url},error:null});await expect(auth.startGoogleSignIn("?next=/checkout")).rejects.toMatchObject({reason:"failed"});expect(sessionStorage.getItem(attemptKey)).toBeNull();
 });
 it("exchanges once, transfers only the resulting session, sanitizes URL and preserves the brief",async()=>{
  localStorage.setItem("currentItinerary","original brief");await callback();const a=auth.finishGoogleSignIn(),b=auth.finishGoogleSignIn();expect(a).toBe(b);expect(window.location.search).toBe("");expect(await a).toBe("/checkout");expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);expect(setSession).toHaveBeenCalledWith({access_token:"fake-access",refresh_token:"fake-refresh"});expect(sessionStorage.getItem(attemptKey)).toBeNull();expect(sessionStorage.getItem(key+"-code-verifier")).toBeNull();expect(localStorage.getItem("currentItinerary")).toBe("original brief");
 });
 it.each(["", "&code=one&code=two", "&error=access_denied&error_description=secret-provider-details", "#error=access_denied"])("fails without exchanging malformed or denied callback %s",async extra=>{
  await callback(extra);await expect(auth.finishGoogleSignIn()).rejects.toBeInstanceOf(auth.GoogleAuthError);expect(exchangeCodeForSession).not.toHaveBeenCalled();expect(setSession).not.toHaveBeenCalled();expect(window.location.search+window.location.hash).toBe("");
 });
 it("does not consume a different attempt and rejects a missing or expired context",async()=>{
  await callback();const attempt=JSON.parse(sessionStorage.getItem(attemptKey)!);window.history.replaceState({},"","/auth/callback?attempt=other&code=bad");await expect(auth.finishGoogleSignIn()).rejects.toMatchObject({reason:"failed"});expect(JSON.parse(sessionStorage.getItem(attemptKey)!).id).toBe(attempt.id);expect(setSession).not.toHaveBeenCalled();
 });
 it.each(["missing","expired","future"])("rejects %s attempt",async kind=>{
  const a=await callback();if(kind==="missing")sessionStorage.removeItem(attemptKey);else sessionStorage.setItem(attemptKey,JSON.stringify({...a,startedAt:Date.now()+(kind==="future"?10000:-601000)}));
  await expect(auth.finishGoogleSignIn()).rejects.toMatchObject({reason:"failed"});expect(exchangeCodeForSession).not.toHaveBeenCalled();
 });
 it.each(["exchange","transfer","identity"])("reports %s failure without returning success",async failure=>{
  await callback();if(failure==="exchange")exchangeCodeForSession.mockResolvedValue({data:{session:null,user:null},error:Error("sensitive provider error")});
  if(failure==="transfer")setSession.mockResolvedValue({data:{session:null,user:null},error:Error("sensitive transfer error")});
  if(failure==="identity")setSession.mockResolvedValue({data:{session:{},user:{id:"another"}},error:null});
  await expect(auth.finishGoogleSignIn()).rejects.toMatchObject({reason:"failed",message:"failed"});expect(sessionStorage.getItem(attemptKey)).toBeNull();
 });
 it("refuses to transfer a late response after another attempt replaces it",async()=>{
  await callback();let resolve!:(value:unknown)=>void;exchangeCodeForSession.mockReturnValue(new Promise(r=>resolve=r));const pending=auth.finishGoogleSignIn();
  const newer={version:1,id:crypto.randomUUID(),startedAt:Date.now(),next:"/"};sessionStorage.setItem(attemptKey,JSON.stringify(newer));
  resolve({data:{session:{access_token:"late",refresh_token:"late"},user:{id:"owner"}},error:null});await expect(pending).rejects.toMatchObject({reason:"failed"});expect(setSession).not.toHaveBeenCalled();expect(JSON.parse(sessionStorage.getItem(attemptKey)!).id).toBe(newer.id);
 });
});


describe("installed Supabase SDK PKCE compatibility",()=>{
 it("generates an S256 challenge with its verifier in per-tab storage without contacting Google",async()=>{
  const fetchSpy=vi.fn().mockRejectedValue(Error("Unexpected network"));vi.stubGlobal("fetch",fetchSpy);
  const sdk=await vi.importActual<typeof import("@supabase/supabase-js")>("@supabase/supabase-js");
  const {webcrypto}=await import("node:crypto");vi.stubGlobal("crypto",webcrypto);vi.stubGlobal("BroadcastChannel",undefined);
  createClient.mockImplementation(sdk.createClient);
  const url=new URL(await auth.startGoogleSignIn("?next=/checkout"));
  expect(url.searchParams.get("code_challenge_method")?.toLowerCase()).toBe("s256");expect(url.searchParams.get("code_challenge")).toBeTruthy();
  expect(sessionStorage.getItem(key+"-code-verifier")).toBeTruthy();expect(localStorage.getItem(key+"-code-verifier")).toBeNull();
  expect(new URL(url.searchParams.get("redirect_to")!).pathname).toBe("/auth/callback");expect(fetchSpy).not.toHaveBeenCalled();
 });
 it("fails safely when browser storage is unavailable",async()=>{
  vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw Error("blocked");});
  await expect(auth.startGoogleSignIn("?next=/checkout")).rejects.toMatchObject({reason:"failed"});expect(signInWithOAuth).not.toHaveBeenCalled();
 });
});

it("does not fall back to plain PKCE when Web Crypto is unavailable",async()=>{
 vi.stubGlobal("crypto",{randomUUID:()=>"fixture"});await expect(auth.startGoogleSignIn("?next=/checkout")).rejects.toMatchObject({reason:"failed"});expect(signInWithOAuth).not.toHaveBeenCalled();
});
