import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("[Supabase] Missing SUPABASE_URL (or VITE_SUPABASE_URL) environment variable");
}
if (!supabaseKey) {
  throw new Error("[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) environment variable");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[Supabase] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key for server auth. " +
    "Set SUPABASE_SERVICE_ROLE_KEY for production use."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
