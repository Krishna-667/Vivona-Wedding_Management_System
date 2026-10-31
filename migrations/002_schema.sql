-- ==============================================================================
-- Migration: 002_schema.sql
-- Complete Vivona Database Schema (Native Local PostgreSQL 16)
-- All money amounts are strictly stored as integer paise (bigint, INR).
-- ==============================================================================

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'employee', 'client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE package_type AS ENUM ('full_service', 'day_of');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enquiry_status AS ENUM (
    'new',
    'contacted',
    'consultation_scheduled',
    'agreement_sent',
    'agreement_signed',
    'proposal_sent',
    'confirmed',
    'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enquiry_type AS ENUM ('package', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'superseded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE agreement_status AS ENUM ('draft', 'sent', 'signed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wedding_status AS ENUM ('planning', 'live', 'completed', 'settled', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vendor_category AS ENUM (
    'catering',
    'decor',
    'photography',
    'entertainment',
    'makeup',
    'logistics',
    'venue',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rfq_status AS ENUM ('open', 'quotes_received', 'awarded', 'closed_not_selected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM ('submitted', 'under_review', 'selected', 'closed_not_selected', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_phase AS ENUM (
    'pre_wedding',
    'mehendi',
    'sangeet',
    'wedding_day',
    'reception',
    'post_wedding'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_stage AS ENUM ('to_plan', 'in_progress', 'blocked', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE checkin_status AS ENUM ('pending', 'arrived', 'late', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('open', 'in_progress', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE milestone_kind AS ENUM ('booking', 'advance', 'final', 'extra');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE milestone_status AS ENUM ('pending', 'partially_paid', 'paid', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE extra_charge_status AS ENUM ('requested', 'approved', 'rejected', 'billed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vendor_bill_status AS ENUM ('received', 'verified', 'paid', 'disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  full_name TEXT NOT NULL,
  phone TEXT,
  hourly_rate_paise BIGINT NOT NULL DEFAULT 0 CHECK (hourly_rate_paise >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. SITE CONTENT
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type package_type NOT NULL,
  tagline TEXT,
  description TEXT,
  inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  starting_price_paise BIGINT NOT NULL CHECK (starting_price_paise >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_packages_updated_at BEFORE UPDATE ON packages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category vendor_category NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price_paise BIGINT NOT NULL DEFAULT 0 CHECK (base_price_paise >= 0),
  unit_label TEXT NOT NULL DEFAULT 'unit',
  min_guests INT,
  max_guests INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_service_catalog_updated_at BEFORE UPDATE ON service_catalog
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS social_proof (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'google_review')),
  handle TEXT NOT NULL,
  author_name TEXT NOT NULL,
  post_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  featured BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_social_proof_updated_at BEFORE UPDATE ON social_proof
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- 5. CRM
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'website',
  type enquiry_type NOT NULL DEFAULT 'package',
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  city TEXT NOT NULL CHECK (city IN ('Jaipur', 'Udaipur')),
  preferred_start_date DATE,
  preferred_end_date DATE,
  guest_count INT NOT NULL CHECK (guest_count > 0),
  theme TEXT,
  budget_max_paise BIGINT NOT NULL CHECK (budget_max_paise >= 0),
  custom_services JSONB DEFAULT '[]'::jsonb,
  status enquiry_status NOT NULL DEFAULT 'new',
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_enquiries_updated_at BEFORE UPDATE ON enquiries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS enquiry_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status proposal_status NOT NULL DEFAULT 'draft',
  valid_until DATE NOT NULL,
  subtotal_paise BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
  tax_paise BIGINT NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  total_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
  payment_plan JSONB NOT NULL DEFAULT '[{"kind":"booking","pct":20},{"kind":"advance","pct":30},{"kind":"final","pct":50}]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_proposals_updated_at BEFORE UPDATE ON proposals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS proposal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  category vendor_category NOT NULL,
  label TEXT NOT NULL,
  qty NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit TEXT NOT NULL DEFAULT 'service',
  unit_price_paise BIGINT NOT NULL CHECK (unit_price_paise >= 0),
  tax_pct NUMERIC(5, 2) NOT NULL DEFAULT 18.00 CHECK (tax_pct >= 0),
  total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
  display_order INT NOT NULL DEFAULT 0
);

-- 6. WEDDING CORE
CREATE TABLE IF NOT EXISTS weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  enquiry_id UUID UNIQUE REFERENCES enquiries(id) ON DELETE SET NULL,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('Jaipur', 'Udaipur')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guest_count_planned INT NOT NULL CHECK (guest_count_planned > 0),
  status wedding_status NOT NULL DEFAULT 'planning',
  budget_paise BIGINT NOT NULL CHECK (budget_paise >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_wedding_dates CHECK (end_date >= start_date)
);
CREATE TRIGGER set_weddings_updated_at BEFORE UPDATE ON weddings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  enquiry_id UUID REFERENCES enquiries(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  version INT NOT NULL DEFAULT 1,
  body_markdown TEXT NOT NULL,
  status agreement_status NOT NULL DEFAULT 'draft',
  signed_at TIMESTAMPTZ,
  signed_by_name TEXT,
  signature_path TEXT,
  signed_pdf_path TEXT,
  signer_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_agreements_updated_at BEFORE UPDATE ON agreements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS wedding_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role_on_wedding TEXT NOT NULL CHECK (role_on_wedding IN ('lead_planner', 'coordinator', 'assistant')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wedding_id, employee_id)
);

-- 7. VENDORS & PROCUREMENT
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category vendor_category NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Jaipur',
  address TEXT,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_vendors_updated_at BEFORE UPDATE ON vendors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  category vendor_category NOT NULL,
  status rfq_status NOT NULL DEFAULT 'open',
  deadline DATE,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_rfqs_updated_at BEFORE UPDATE ON rfqs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS vendor_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status quote_status NOT NULL DEFAULT 'submitted',
  subtotal_paise BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
  tax_paise BIGINT NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  total_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
  extra_hour_rate_paise BIGINT NOT NULL DEFAULT 0 CHECK (extra_hour_rate_paise >= 0),
  valid_until DATE,
  document_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_vendor_quotes_updated_at BEFORE UPDATE ON vendor_quotes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES vendor_quotes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  qty NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit TEXT NOT NULL DEFAULT 'plate',
  unit_price_paise BIGINT NOT NULL CHECK (unit_price_paise >= 0),
  tax_pct NUMERIC(5, 2) NOT NULL DEFAULT 18.00 CHECK (tax_pct >= 0),
  total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
  included BOOLEAN NOT NULL DEFAULT true,
  is_extra BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wedding_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  quote_id UUID REFERENCES vendor_quotes(id) ON DELETE SET NULL,
  category vendor_category NOT NULL,
  agreed_amount_paise BIGINT NOT NULL CHECK (agreed_amount_paise >= 0),
  service_date DATE,
  expected_arrival_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wedding_id, category, vendor_id)
);
CREATE TRIGGER set_wedding_vendors_updated_at BEFORE UPDATE ON wedding_vendors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. PLANNING & TASKS
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_type package_type NOT NULL,
  phase task_phase NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  offset_days INT NOT NULL,
  priority task_priority NOT NULL DEFAULT 'medium',
  default_owner_role TEXT NOT NULL DEFAULT 'lead_planner',
  display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  phase task_phase NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  stage task_stage NOT NULL DEFAULT 'to_plan',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date DATE NOT NULL,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. LIVE OPS
CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  day_number INT NOT NULL DEFAULT 1 CHECK (day_number BETWEEN 1 AND 5),
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'delayed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_schedule_entries_updated_at BEFORE UPDATE ON schedule_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS vendor_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  wedding_vendor_id UUID NOT NULL REFERENCES wedding_vendors(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  expected_at TIMESTAMPTZ NOT NULL,
  arrived_at TIMESTAMPTZ,
  grace_minutes INT NOT NULL DEFAULT 10,
  status checkin_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_vendor_checkins_updated_at BEFORE UPDATE ON vendor_checkins
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  severity incident_severity NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status incident_status NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_incidents_updated_at BEFORE UPDATE ON incidents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. MESSAGING
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID UNIQUE NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_message_threads_updated_at BEFORE UPDATE ON message_threads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. FINANCE & SETTLEMENT
CREATE TABLE IF NOT EXISTS payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  kind milestone_kind NOT NULL,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  paid_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount_paise >= 0),
  status milestone_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_payment_milestones_updated_at BEFORE UPDATE ON payment_milestones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS client_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES payment_milestones(id) ON DELETE SET NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_receipt_ref UNIQUE (wedding_id, reference)
);

CREATE TABLE IF NOT EXISTS vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  wedding_vendor_id UUID NOT NULL REFERENCES wedding_vendors(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  status vendor_bill_status NOT NULL DEFAULT 'received',
  bill_date DATE NOT NULL,
  due_date DATE,
  document_path TEXT,
  variance_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wedding_vendor_id, bill_number)
);
CREATE TRIGGER set_vendor_bills_updated_at BEFORE UPDATE ON vendor_bills
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  wedding_vendor_id UUID NOT NULL REFERENCES wedding_vendors(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES vendor_bills(id) ON DELETE SET NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_vendor_payment_ref UNIQUE (wedding_vendor_id, reference)
);

CREATE TABLE IF NOT EXISTS extra_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  qty NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price_paise BIGINT NOT NULL CHECK (unit_price_paise >= 0),
  total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
  reason TEXT NOT NULL,
  evidence_path TEXT,
  status extra_charge_status NOT NULL DEFAULT 'requested',
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_extra_charges_updated_at BEFORE UPDATE ON extra_charges
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  hourly_rate_paise BIGINT NOT NULL CHECK (hourly_rate_paise >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_timesheets_updated_at BEFORE UPDATE ON timesheets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. AUDIT TRAIL
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. FILES (Local Filesystem Metadata)
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL CHECK (bucket IN ('agreements', 'quotes', 'invoices', 'evidence', 'site-assets')),
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  wedding_id UUID REFERENCES weddings(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
