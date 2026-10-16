/** @vitest-environment jsdom */
import {afterEach,describe,expect,it,vi} from "vitest";
const {createClient}=vi.hoisted(()=>({createClient:vi.fn(()=>({}))}));
vi.mock("@supabase/supabase-js",()=>({createClient}));
afterEach(()=>vi.unstubAllEnvs());
describe("existing Supabase client callback isolation",()=>{
 it.each(["/auth","/auth/reset-password","/checkout","/auth/callback"])("preserves existing flow at %s",async path=>{
  vi.resetModules();createClient.mockClear();vi.stubEnv("VITE_SUPABASE_URL","https://example.supabase.co");vi.stubEnv("VITE_SUPABASE_ANON_KEY","fake");window.history.replaceState({},"",path);await import("./supabase");
  expect(createClient).toHaveBeenCalledWith("https://example.supabase.co","fake",{auth:{detectSessionInUrl:path!=="/auth/callback"}});
 });
});
