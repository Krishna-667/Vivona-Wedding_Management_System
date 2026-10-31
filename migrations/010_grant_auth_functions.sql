-- ==============================================================================
-- Migration: 010_grant_auth_functions.sql
-- Grant function execution permissions to vivona_auth for RLS evaluation
-- ==============================================================================

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO vivona_auth;
ALTER DEFAULT PRIVILEGES FOR ROLE vivona_owner IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO vivona_auth;

-- Also ensure vivona_auth can bypass RLS on profiles since authentication must read user info by email prior to session creation
ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO vivona_auth;
