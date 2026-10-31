-- ==============================================================================
-- Migration: 008_grants.sql
-- Least-Privilege Grants & Privilege Hardening for Local PostgreSQL
-- ==============================================================================

-- 1. REVOKE DEFAULT PRIVILEGES FROM PUBLIC
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA private FROM PUBLIC;

-- 2. VIVONA_APP (Regular Web Request Path)
-- Must NEVER access private schema. Must obey RLS (NOBYPASSRLS).
GRANT USAGE ON SCHEMA public TO vivona_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vivona_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vivona_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO vivona_app;

ALTER DEFAULT PRIVILEGES FOR ROLE vivona_owner IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vivona_app;

ALTER DEFAULT PRIVILEGES FOR ROLE vivona_owner IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO vivona_app;

-- 3. VIVONA_AUTH (Authentication Module Only)
-- Manages private credentials and sessions. Reads profiles.
GRANT USAGE ON SCHEMA public TO vivona_auth;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO vivona_auth;

GRANT USAGE, CREATE ON SCHEMA private TO vivona_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA private TO vivona_auth;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA private TO vivona_auth;

ALTER DEFAULT PRIVILEGES FOR ROLE vivona_owner IN SCHEMA private
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vivona_auth;

-- 4. VIVONA_SERVICE (Seeding, Background Jobs, Invites)
GRANT USAGE, CREATE ON SCHEMA public TO vivona_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vivona_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vivona_service;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO vivona_service;

GRANT USAGE, CREATE ON SCHEMA private TO vivona_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA private TO vivona_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA private TO vivona_service;
