-- Authentication and premium metadata live in Supabase Auth (auth.users).
-- The unused public.users table was empty and duplicated identity data.
DROP TABLE public.users;
