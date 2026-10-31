-- ==============================================================================
-- Migration: 003_private_schema.sql
-- Isolated Authentication Credentials & Session Security
-- Strictly inaccessible to vivona_app role. Accessible only to vivona_auth & vivona_service.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS private.auth_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  failure_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS private.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON private.sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_profile ON private.sessions(profile_id);

CREATE TABLE IF NOT EXISTS private.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON private.login_attempts(email, attempted_at);

CREATE TABLE IF NOT EXISTS private.invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'employee',
  full_name TEXT NOT NULL,
  phone TEXT,
  hourly_rate_paise BIGINT NOT NULL DEFAULT 100000,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS private.auth_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce_hash TEXT UNIQUE NOT NULL,
  kid TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'signup', 'invite')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_challenges_nonce ON private.auth_challenges(nonce_hash);
