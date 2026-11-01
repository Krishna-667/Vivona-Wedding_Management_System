-- Migration 013: Google OAuth 2.0 PKCE Transactions & Identity Federation
-- Schema: private (oauth_identities, oauth_transactions)
-- Schema: public.profiles (email_verified column)
-- Table: private.auth_credentials (nullable password_hash)

-- 1. Add email_verified to public.profiles if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. Allow password_hash in private.auth_credentials to be NULL for OAuth-only users
ALTER TABLE private.auth_credentials ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Create private.oauth_identities table (links Google sub to Vivona profile)
CREATE TABLE IF NOT EXISTS private.oauth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_sub TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_oauth_provider_sub UNIQUE (provider, provider_sub)
);

CREATE INDEX IF NOT EXISTS idx_oauth_identities_profile ON private.oauth_identities(profile_id);
CREATE INDEX IF NOT EXISTS idx_oauth_identities_email ON private.oauth_identities(LOWER(email));

-- 4. Create private.oauth_transactions table (ephemeral single-use PKCE state & nonce store)
CREATE TABLE IF NOT EXISTS private.oauth_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash TEXT NOT NULL UNIQUE,
  nonce TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  return_to TEXT NOT NULL DEFAULT '/client',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_tx_state_hash ON private.oauth_transactions(state_hash);
CREATE INDEX IF NOT EXISTS idx_oauth_tx_expires ON private.oauth_transactions(expires_at);

-- 5. Constraint / Validation Function: User must have at least one auth method
-- Either a non-null password_hash in private.auth_credentials OR a linked identity in private.oauth_identities
CREATE OR REPLACE FUNCTION private.ensure_user_has_auth_method(p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_password BOOLEAN;
  v_has_oauth BOOLEAN;
BEGIN
  SELECT (password_hash IS NOT NULL AND length(password_hash) > 0)
  INTO v_has_password
  FROM private.auth_credentials
  WHERE profile_id = p_id;

  SELECT EXISTS (
    SELECT 1 FROM private.oauth_identities WHERE profile_id = p_id
  ) INTO v_has_oauth;

  RETURN COALESCE(v_has_password, false) OR COALESCE(v_has_oauth, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Role Permissions (Least Privilege Rule 0.2)
-- Schema private is inaccessible to vivona_app.
-- Grant access exclusively to vivona_auth and vivona_service.
GRANT ALL ON private.oauth_identities TO vivona_auth;
GRANT ALL ON private.oauth_identities TO vivona_service;
GRANT ALL ON private.oauth_identities TO vivona_owner;

GRANT ALL ON private.oauth_transactions TO vivona_auth;
GRANT ALL ON private.oauth_transactions TO vivona_service;
GRANT ALL ON private.oauth_transactions TO vivona_owner;
