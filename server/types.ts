import type { User as SupabaseUser } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      supabaseUser?: SupabaseUser;
    }
  }
}
