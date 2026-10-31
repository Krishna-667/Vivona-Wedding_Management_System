-- 011_field_encryption_and_hardening.sql
-- Adds blind index columns for encrypted exact-match search and hardens database privileges

-- 1. Blind Index Columns & Indexes for Searchable Encrypted Fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_bidx TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_phone_bidx ON public.profiles(phone_bidx);

ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS contact_phone_bidx TEXT,
  ADD COLUMN IF NOT EXISTS contact_email_bidx TEXT;
CREATE INDEX IF NOT EXISTS idx_enquiries_contact_phone_bidx ON public.enquiries(contact_phone_bidx);
CREATE INDEX IF NOT EXISTS idx_enquiries_contact_email_bidx ON public.enquiries(contact_email_bidx);

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS contact_phone_bidx TEXT,
  ADD COLUMN IF NOT EXISTS contact_email_bidx TEXT;
CREATE INDEX IF NOT EXISTS idx_vendors_contact_phone_bidx ON public.vendors(contact_phone_bidx);
CREATE INDEX IF NOT EXISTS idx_vendors_contact_email_bidx ON public.vendors(contact_email_bidx);

-- 2. Revoke Schema Creation & Schema Private from untrusted roles
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM vivona_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM vivona_app;

-- 3. Grant Explicit Scoped Access to vivona_auth & vivona_service
GRANT USAGE ON SCHEMA private TO vivona_auth, vivona_service;
GRANT ALL ON ALL TABLES IN SCHEMA private TO vivona_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA private TO vivona_auth;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA private TO vivona_auth, vivona_service;

-- 4. Enforce FORCE ROW LEVEL SECURITY across all tables in public schema
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
