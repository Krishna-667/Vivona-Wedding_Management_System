-- ==============================================================================
-- VIVONA — Initial Schema Migration (Phase 1)
-- End-to-end Luxury Wedding Planning Operations Platform (Jaipur & Udaipur)
-- All money amounts are strictly stored as integer paise (bigint, INR).
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'employee', 'client');
CREATE TYPE package_type AS ENUM ('full_service', 'day_of');
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
CREATE TYPE enquiry_type AS ENUM ('package', 'custom');
CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'superseded');
CREATE TYPE agreement_status AS ENUM ('draft', 'sent', 'signed', 'cancelled');
CREATE TYPE wedding_status AS ENUM ('planning', 'live', 'completed', 'settled', 'archived');
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
CREATE TYPE rfq_status AS ENUM ('open', 'quotes_received', 'awarded', 'closed_not_selected', 'cancelled');
CREATE TYPE quote_status AS ENUM ('submitted', 'under_review', 'selected', 'closed_not_selected', 'rejected');
CREATE TYPE task_phase AS ENUM (
  'pre_wedding',
  'mehendi',
  'sangeet',
  'wedding_day',
  'reception',
  'post_wedding'
);
CREATE TYPE task_stage AS ENUM ('to_plan', 'in_progress', 'blocked', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE checkin_status AS ENUM ('pending', 'arrived', 'late', 'no_show');
CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE incident_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE milestone_kind AS ENUM ('booking', 'advance', 'final', 'extra');
CREATE TYPE milestone_status AS ENUM ('pending', 'partially_paid', 'paid', 'overdue');
CREATE TYPE payment_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE extra_charge_status AS ENUM ('requested', 'approved', 'rejected', 'billed');
CREATE TYPE vendor_bill_status AS ENUM ('received', 'verified', 'paid', 'disputed');

-- 3. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. IDENTITY TABLES

-- Profiles: 1:1 with auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 5. SITE CONTENT TABLES

-- Packages
CREATE TABLE packages (
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

-- Service Catalog for custom planning
CREATE TABLE service_catalog (
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

-- Social Proof / Citations (curated posts and reviews)
CREATE TABLE social_proof (
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

-- In-app Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- 6. CRM TABLES

-- Enquiries
CREATE TABLE enquiries (
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
CREATE INDEX idx_enquiries_status ON enquiries(status);
CREATE INDEX idx_enquiries_client_id ON enquiries(client_id);
CREATE TRIGGER set_enquiries_updated_at BEFORE UPDATE ON enquiries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enquiry Activities / Timeline
CREATE TABLE enquiry_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_enquiry_activities_enquiry ON enquiry_activities(enquiry_id);

-- Proposals
CREATE TABLE proposals (
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
CREATE INDEX idx_proposals_enquiry ON proposals(enquiry_id);
CREATE TRIGGER set_proposals_updated_at BEFORE UPDATE ON proposals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Proposal Lines
CREATE TABLE proposal_lines (
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
CREATE INDEX idx_proposal_lines_proposal ON proposal_lines(proposal_id);

-- 7. WEDDING CORE RECORD

CREATE TABLE weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g. VIV-2026-001
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
CREATE INDEX idx_weddings_client_id ON weddings(client_id);
CREATE INDEX idx_weddings_status ON weddings(status);
CREATE TRIGGER set_weddings_updated_at BEFORE UPDATE ON weddings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agreements
CREATE TABLE agreements (
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
CREATE INDEX idx_agreements_wedding ON agreements(wedding_id);
CREATE INDEX idx_agreements_enquiry ON agreements(enquiry_id);
CREATE TRIGGER set_agreements_updated_at BEFORE UPDATE ON agreements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Wedding Assignments (Team)
CREATE TABLE wedding_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role_on_wedding TEXT NOT NULL CHECK (role_on_wedding IN ('lead_planner', 'coordinator', 'assistant')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wedding_id, employee_id)
);
CREATE INDEX idx_wedding_assignments_emp ON wedding_assignments(employee_id);
CREATE INDEX idx_wedding_assignments_wedding ON wedding_assignments(wedding_id);

-- 8. VENDORS & PROCUREMENT MODULE

CREATE TABLE vendors (
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
CREATE INDEX idx_vendors_category ON vendors(category);
CREATE TRIGGER set_vendors_updated_at BEFORE UPDATE ON vendors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RFQs (Request for Quote)
CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  category vendor_category NOT NULL,
  status rfq_status NOT NULL DEFAULT 'open',
  deadline DATE,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rfqs_wedding ON rfqs(wedding_id);
CREATE TRIGGER set_rfqs_updated_at BEFORE UPDATE ON rfqs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vendor Quotes
CREATE TABLE vendor_quotes (
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
CREATE INDEX idx_vendor_quotes_rfq ON vendor_quotes(rfq_id);
CREATE INDEX idx_vendor_quotes_vendor ON vendor_quotes(vendor_id);
CREATE TRIGGER set_vendor_quotes_updated_at BEFORE UPDATE ON vendor_quotes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Quote Lines (Structured itemization)
CREATE TABLE quote_lines (
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
CREATE INDEX idx_quote_lines_quote ON quote_lines(quote_id);

-- Wedding Vendors (Selected winners for wedding)
CREATE TABLE wedding_vendors (
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
CREATE INDEX idx_wedding_vendors_wedding ON wedding_vendors(wedding_id);
CREATE TRIGGER set_wedding_vendors_updated_at BEFORE UPDATE ON wedding_vendors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. PLANNING & TASKS MODULE

CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_type package_type NOT NULL,
  phase task_phase NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  offset_days INT NOT NULL, -- relative to wedding start date
  priority task_priority NOT NULL DEFAULT 'medium',
  default_owner_role TEXT NOT NULL DEFAULT 'lead_planner',
  display_order INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_task_templates_pkg ON task_templates(package_type, phase);

CREATE TABLE tasks (
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
CREATE INDEX idx_tasks_wedding ON tasks(wedding_id);
CREATE INDEX idx_tasks_owner ON tasks(owner_id);
CREATE INDEX idx_tasks_stage ON tasks(stage);
CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. LIVE OPERATIONS MODULE

-- Minute-by-minute day schedule
CREATE TABLE schedule_entries (
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
CREATE INDEX idx_schedule_entries_wedding ON schedule_entries(wedding_id, day_number);
CREATE TRIGGER set_schedule_entries_updated_at BEFORE UPDATE ON schedule_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vendor Check-ins
CREATE TABLE vendor_checkins (
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
CREATE INDEX idx_vendor_checkins_wedding ON vendor_checkins(wedding_id);
CREATE TRIGGER set_vendor_checkins_updated_at BEFORE UPDATE ON vendor_checkins
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Incidents
CREATE TABLE incidents (
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
CREATE INDEX idx_incidents_wedding ON incidents(wedding_id);
CREATE TRIGGER set_incidents_updated_at BEFORE UPDATE ON incidents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. MESSAGING MODULE

CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID UNIQUE NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_message_threads_updated_at BEFORE UPDATE ON message_threads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_thread ON messages(thread_id, created_at);

-- 12. FINANCE & SETTLEMENT MODULE

-- Client Payment Milestones
CREATE TABLE payment_milestones (
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
CREATE INDEX idx_payment_milestones_wedding ON payment_milestones(wedding_id);
CREATE TRIGGER set_payment_milestones_updated_at BEFORE UPDATE ON payment_milestones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Client Receipts (Inbound payments)
CREATE TABLE client_receipts (
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
CREATE INDEX idx_client_receipts_wedding ON client_receipts(wedding_id);

-- Vendor Bills (Invoices from vendors)
CREATE TABLE vendor_bills (
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
CREATE INDEX idx_vendor_bills_wedding ON vendor_bills(wedding_id);
CREATE TRIGGER set_vendor_bills_updated_at BEFORE UPDATE ON vendor_bills
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vendor Payments (Outbound payments to vendors)
CREATE TABLE vendor_payments (
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
CREATE INDEX idx_vendor_payments_wedding ON vendor_payments(wedding_id);

-- Extra Charges (Cost uplift & Client rebill)
CREATE TABLE extra_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL, -- e.g. "extra_guests", "extra_dj_hours", "generator"
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
CREATE INDEX idx_extra_charges_wedding ON extra_charges(wedding_id);
CREATE TRIGGER set_extra_charges_updated_at BEFORE UPDATE ON extra_charges
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Timesheets (Staff labour cost tracking)
CREATE TABLE timesheets (
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
CREATE INDEX idx_timesheets_wedding ON timesheets(wedding_id);
CREATE INDEX idx_timesheets_employee ON timesheets(employee_id);
CREATE TRIGGER set_timesheets_updated_at BEFORE UPDATE ON timesheets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. AUDIT TRAIL

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. "RECORD_PAYMENT", "UPDATE_STATUS", "ASSIGN_EMPLOYEE"
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id);
-- ==============================================================================
-- VIVONA — RLS Helpers and Policies Migration (Phase 1)
-- Strict Role-Based Security: Admin, Employee, Client
-- Security Definer Functions with locked search_path
-- ==============================================================================

-- 1. SECURITY DEFINER HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_assigned(p_wedding_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.wedding_assignments
    WHERE wedding_id = p_wedding_id
      AND employee_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_client_of(p_wedding_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.weddings
    WHERE id = p_wedding_id
      AND client_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.agreement_signed(p_wedding_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agreements
    WHERE wedding_id = p_wedding_id
      AND status = 'signed'
  );
END;
$$;

-- 2. ROLE TAMPERING GUARD TRIGGER
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow service_role key or postgres admin to seed/modify roles
  IF (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user = 'supabase_admin' THEN
    RETURN NEW;
  END IF;

  -- If role or hourly_rate_paise is changing, ensure actor is admin
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.hourly_rate_paise IS DISTINCT FROM NEW.hourly_rate_paise) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only an administrator can modify user roles or hourly rates.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_profile_role_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();

-- 3. NEW AUTH USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'client', -- Public sign-up creates client only
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ENABLE RLS ON EVERY TABLE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_proof ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES

-- Profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (
  public.is_admin() OR id = auth.uid() OR is_active = true
);

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE USING (
  public.is_admin() OR id = auth.uid()
);

-- Wedding Assignments
CREATE POLICY "wedding_assignments_admin_all" ON public.wedding_assignments
FOR ALL USING (public.is_admin());

CREATE POLICY "wedding_assignments_emp_select" ON public.wedding_assignments
FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "wedding_assignments_client_select" ON public.wedding_assignments
FOR SELECT USING (public.is_client_of(wedding_id));

-- Packages & Service Catalog (Public Read, Admin Write)
CREATE POLICY "packages_read_public" ON public.packages
FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "packages_admin_all" ON public.packages
FOR ALL USING (public.is_admin());

CREATE POLICY "service_catalog_read_public" ON public.service_catalog
FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "service_catalog_admin_all" ON public.service_catalog
FOR ALL USING (public.is_admin());

-- Social Proof
CREATE POLICY "social_proof_read_public" ON public.social_proof
FOR SELECT USING (true);

CREATE POLICY "social_proof_admin_all" ON public.social_proof
FOR ALL USING (public.is_admin());

-- Notifications
CREATE POLICY "notifications_owner" ON public.notifications
FOR ALL USING (user_id = auth.uid());

-- Enquiries
CREATE POLICY "enquiries_admin_all" ON public.enquiries
FOR ALL USING (public.is_admin());

CREATE POLICY "enquiries_client_select" ON public.enquiries
FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "enquiries_client_insert" ON public.enquiries
FOR INSERT WITH CHECK (
  auth.uid() IS NULL OR client_id = auth.uid() OR public.is_admin()
);

CREATE POLICY "enquiries_client_update" ON public.enquiries
FOR UPDATE USING (
  (client_id = auth.uid() AND status IN ('new', 'contacted')) OR public.is_admin()
);

-- Enquiry Activities
CREATE POLICY "enquiry_activities_admin_all" ON public.enquiry_activities
FOR ALL USING (public.is_admin());

CREATE POLICY "enquiry_activities_client_select" ON public.enquiry_activities
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enquiries WHERE id = enquiry_id AND client_id = auth.uid())
);

-- Proposals & Lines
CREATE POLICY "proposals_admin_all" ON public.proposals
FOR ALL USING (public.is_admin());

CREATE POLICY "proposals_client_select" ON public.proposals
FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "proposal_lines_admin_all" ON public.proposal_lines
FOR ALL USING (public.is_admin());

CREATE POLICY "proposal_lines_client_select" ON public.proposal_lines
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.proposals WHERE id = proposal_id AND client_id = auth.uid())
);

-- Agreements
CREATE POLICY "agreements_admin_all" ON public.agreements
FOR ALL USING (public.is_admin());

CREATE POLICY "agreements_client_select" ON public.agreements
FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "agreements_client_update_sign" ON public.agreements
FOR UPDATE USING (client_id = auth.uid());

-- Weddings
CREATE POLICY "weddings_admin_all" ON public.weddings
FOR ALL USING (public.is_admin());

CREATE POLICY "weddings_assigned_emp_select" ON public.weddings
FOR SELECT USING (public.is_assigned(id));

CREATE POLICY "weddings_client_select" ON public.weddings
FOR SELECT USING (client_id = auth.uid());

-- Vendors (shortlist gate: client only sees if agreement signed)
CREATE POLICY "vendors_admin_all" ON public.vendors
FOR ALL USING (public.is_admin());

CREATE POLICY "vendors_assigned_emp_select" ON public.vendors
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.wedding_vendors wv
    WHERE wv.vendor_id = vendors.id
      AND public.is_assigned(wv.wedding_id)
  )
);

CREATE POLICY "vendors_client_select" ON public.vendors
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.wedding_vendors wv
    WHERE wv.vendor_id = vendors.id
      AND public.is_client_of(wv.wedding_id)
      AND public.agreement_signed(wv.wedding_id)
  )
);

-- RFQs and Vendor Quotes (Admin only)
CREATE POLICY "rfqs_admin_all" ON public.rfqs FOR ALL USING (public.is_admin());
CREATE POLICY "vendor_quotes_admin_all" ON public.vendor_quotes FOR ALL USING (public.is_admin());
CREATE POLICY "quote_lines_admin_all" ON public.quote_lines FOR ALL USING (public.is_admin());

-- Wedding Vendors
CREATE POLICY "wedding_vendors_admin_all" ON public.wedding_vendors
FOR ALL USING (public.is_admin());

CREATE POLICY "wedding_vendors_assigned_emp" ON public.wedding_vendors
FOR SELECT USING (public.is_assigned(wedding_id));

CREATE POLICY "wedding_vendors_client_signed" ON public.wedding_vendors
FOR SELECT USING (
  public.is_client_of(wedding_id) AND public.agreement_signed(wedding_id)
);

-- Task Templates
CREATE POLICY "task_templates_read" ON public.task_templates
FOR SELECT USING (true);
CREATE POLICY "task_templates_admin" ON public.task_templates
FOR ALL USING (public.is_admin());

-- Tasks
CREATE POLICY "tasks_admin_all" ON public.tasks FOR ALL USING (public.is_admin());
CREATE POLICY "tasks_assigned_emp" ON public.tasks FOR ALL USING (public.is_assigned(wedding_id));
CREATE POLICY "tasks_client_select" ON public.tasks FOR SELECT USING (public.is_client_of(wedding_id));

-- Schedule Entries
CREATE POLICY "schedule_entries_admin_all" ON public.schedule_entries FOR ALL USING (public.is_admin());
CREATE POLICY "schedule_entries_assigned_emp" ON public.schedule_entries FOR ALL USING (public.is_assigned(wedding_id));
CREATE POLICY "schedule_entries_client_select" ON public.schedule_entries FOR SELECT USING (public.is_client_of(wedding_id));

-- Vendor Check-ins
CREATE POLICY "vendor_checkins_admin_all" ON public.vendor_checkins FOR ALL USING (public.is_admin());
CREATE POLICY "vendor_checkins_assigned_emp" ON public.vendor_checkins FOR ALL USING (public.is_assigned(wedding_id));
CREATE POLICY "vendor_checkins_client_select" ON public.vendor_checkins FOR SELECT USING (public.is_client_of(wedding_id));

-- Incidents (Admin and assigned employees only)
CREATE POLICY "incidents_admin_all" ON public.incidents FOR ALL USING (public.is_admin());
CREATE POLICY "incidents_assigned_emp" ON public.incidents FOR ALL USING (public.is_assigned(wedding_id));

-- Messaging
CREATE POLICY "message_threads_admin_all" ON public.message_threads FOR ALL USING (public.is_admin());
CREATE POLICY "message_threads_assigned_emp" ON public.message_threads FOR SELECT USING (public.is_assigned(wedding_id));
CREATE POLICY "message_threads_client" ON public.message_threads FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "messages_admin_all" ON public.messages FOR ALL USING (public.is_admin());
CREATE POLICY "messages_assigned_emp" ON public.messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.message_threads mt
    WHERE mt.id = messages.thread_id AND public.is_assigned(mt.wedding_id)
  )
);
CREATE POLICY "messages_client" ON public.messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.message_threads mt
    WHERE mt.id = messages.thread_id AND mt.client_id = auth.uid()
  )
);

-- Payment Milestones
CREATE POLICY "milestones_admin_all" ON public.payment_milestones FOR ALL USING (public.is_admin());
CREATE POLICY "milestones_client_select" ON public.payment_milestones FOR SELECT USING (public.is_client_of(wedding_id));
CREATE POLICY "milestones_assigned_emp_select" ON public.payment_milestones FOR SELECT USING (public.is_assigned(wedding_id));

-- Client Receipts
CREATE POLICY "receipts_admin_all" ON public.client_receipts FOR ALL USING (public.is_admin());
CREATE POLICY "receipts_client_select" ON public.client_receipts FOR SELECT USING (public.is_client_of(wedding_id));

-- Vendor Bills & Vendor Payments (Strictly Admin Only)
CREATE POLICY "vendor_bills_admin_only" ON public.vendor_bills FOR ALL USING (public.is_admin());
CREATE POLICY "vendor_payments_admin_only" ON public.vendor_payments FOR ALL USING (public.is_admin());

-- Extra Charges
CREATE POLICY "extra_charges_admin_all" ON public.extra_charges FOR ALL USING (public.is_admin());
CREATE POLICY "extra_charges_assigned_emp" ON public.extra_charges FOR ALL USING (public.is_assigned(wedding_id));
CREATE POLICY "extra_charges_client_select" ON public.extra_charges FOR SELECT USING (
  public.is_client_of(wedding_id) AND status = 'approved'
);

-- Timesheets
CREATE POLICY "timesheets_admin_all" ON public.timesheets FOR ALL USING (public.is_admin());
CREATE POLICY "timesheets_emp_own" ON public.timesheets FOR ALL USING (employee_id = auth.uid());

-- Audit Events
CREATE POLICY "audit_events_admin_all" ON public.audit_events FOR ALL USING (public.is_admin());
-- ==============================================================================
-- VIVONA — Storage Buckets and Policies Migration (Phase 1)
-- Public: site-assets
-- Private: agreements, quotes, invoices, evidence
-- ==============================================================================

-- 1. INSERT BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('site-assets', 'site-assets', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('agreements', 'agreements', false, 10485760, ARRAY['application/pdf', 'image/png']),
  ('quotes', 'quotes', false, 10485760, ARRAY['application/pdf']),
  ('invoices', 'invoices', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('evidence', 'evidence', false, 20971520, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. STORAGE POLICIES

-- Public site-assets: Anyone can read, only admin can insert/update/delete
CREATE POLICY "site_assets_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'site-assets');

CREATE POLICY "site_assets_admin_write" ON storage.objects
FOR ALL USING (bucket_id = 'site-assets' AND public.is_admin());

-- Agreements (Private): Admin full access; Client can read signed agreements
CREATE POLICY "agreements_admin_all" ON storage.objects
FOR ALL USING (bucket_id = 'agreements' AND public.is_admin());

CREATE POLICY "agreements_client_read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'agreements' AND auth.uid() IS NOT NULL
);

-- Quotes (Private): Admin only
CREATE POLICY "quotes_admin_all" ON storage.objects
FOR ALL USING (bucket_id = 'quotes' AND public.is_admin());

-- Invoices (Private): Admin only
CREATE POLICY "invoices_admin_all" ON storage.objects
FOR ALL USING (bucket_id = 'invoices' AND public.is_admin());

-- Evidence (Private): Admin and authenticated employees
CREATE POLICY "evidence_admin_all" ON storage.objects
FOR ALL USING (bucket_id = 'evidence' AND public.is_admin());

CREATE POLICY "evidence_emp_read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'evidence' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'employee')
  )
);
-- ==============================================================================
-- VIVONA — Static Reference Seed (Packages, Catalog, Task Templates)
-- ==============================================================================

-- 1. PACKAGES
INSERT INTO public.packages (id, slug, name, type, tagline, description, starting_price_paise, inclusions, display_order, is_active)
VALUES
(
  'a1111111-1111-1111-1111-111111111111',
  'full-service',
  'Full-Service Royal Wedding',
  'full_service',
  'Complete 3-Day Wedding Architecture & White-Glove Production in Rajasthan',
  'End-to-end management spanning bespoke heritage theme design, palace venue curation, 18+ vendor RFQ negotiations, 400+ guest logistics, rehearsal orchestration, and minute-by-minute live day operations.',
  350000000, -- ₹35,00,000 in paise
  '[
    "Full wedding concept, mood boards and palace decor styling",
    "Comprehensive vendor curation, RFQ bidding and contract management",
    "Staged 3-day guest hospitality, luxury airport transfers and room drops",
    "Dedicated lead planner + 3 on-site coordinators throughout the season",
    "Minute-by-minute live digital console and vendor check-in tracking",
    "Post-wedding itemized settlement and audit reconciliation"
  ]'::jsonb,
  1,
  true
),
(
  'a2222222-2222-2222-2222-222222222222',
  'day-of',
  'Partial & Big-Day Orchestration',
  'day_of',
  'Precision On-Site Operations, Vendor Check-in & Live Flow Management',
  'Designed for couples who have booked key vendors but require a rigorous operations team to take over 4 weeks prior: vendor synchronization, arrival enforcement, incident mitigation, and seamless day-of execution.',
  120000000, -- ₹12,00,000 in paise
  '[
    "Handover and vendor synchronization 30 days prior to event",
    "Master minute-by-minute event schedule and procession cues",
    "Live on-site check-in board with automated late detection",
    "On-ground lead coordinator and rapid incident response team",
    "Guest reception coordination and family procession timing",
    "Post-event vendor clear-up and asset return supervision"
  ]'::jsonb,
  2,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  starting_price_paise = EXCLUDED.starting_price_paise,
  inclusions = EXCLUDED.inclusions;

-- 2. SERVICE CATALOG
INSERT INTO public.service_catalog (category, name, description, base_price_paise, unit_label, min_guests, max_guests)
VALUES
('venue', 'Heritage Palace & Haveli Curation', 'Securing prime heritage locations in Udaipur and Jaipur including lake palace lawns and banquet havelis.', 150000000, 'venue', 200, 1000),
('catering', 'Royal Rajputana & Global Gastronomy', '3-day multi-cuisine gourmet spread (Rajasthani Thali, Awadhi Dum, Pan-Asian, Continental) with live stations.', 350000, 'plate', 100, 1500),
('decor', 'Grand Mandap & Thematic Floral Architecture', 'Imported exotic florals, palace lighting, royal canopies, chandeliers, and custom stage carpentry.', 180000000, 'setup', 200, 1000),
('entertainment', 'Symphonic Sangeet & Folk Troupe', 'Curated celebrity DJ, live percussionists, Rajasthani Manganiyar folk singers, and sound/light engineering.', 75000000, 'package', NULL, NULL),
('photography', 'Cinematic Wedding Film & Royal Portraiture', 'Editorial team with drones, prime lenses, same-day teaser delivery, and archival leather albums.', 90000000, 'package', NULL, NULL),
('makeup', 'Bridal & Groom Couture Styling', 'Celebrity bridal hair and HD airbrush makeup for all ceremonies with personal draper.', 30000000, 'service', NULL, NULL),
('logistics', 'Luxury Chauffeur Fleet & Airport Hospitality', 'Fleet of luxury sedans and vintage royal procession cars with dedicated airport concierge desk.', 60000000, 'fleet', NULL, NULL)
ON CONFLICT DO NOTHING;

-- 3. TASK TEMPLATES (30+ for Full-Service, 15 for Day-of)
-- Full-Service Templates
INSERT INTO public.task_templates (package_type, phase, title, description, offset_days, priority, default_owner_role, display_order)
VALUES
-- Pre-Wedding Phase (Full-Service)
('full_service', 'pre_wedding', 'Initial Couple Vision & Theme Blueprint', 'Define royal Rajasthan aesthetic, color palette and ceremony guidelines.', -90, 'high', 'lead_planner', 1),
('full_service', 'pre_wedding', 'Palace Venue Contract & Booking Deposit', 'Execute agreement with heritage property and secure ceremony dates.', -85, 'critical', 'lead_planner', 2),
('full_service', 'pre_wedding', 'Issue Catering RFQ to Shortlisted Caterers', 'Send structured menu requirement and per-plate tender to 3 caterers.', -80, 'high', 'lead_planner', 3),
('full_service', 'pre_wedding', 'Catering Tasting & Menu Selection', 'Conduct tasting session for couple and finalize per-plate menu selection.', -70, 'high', 'lead_planner', 4),
('full_service', 'pre_wedding', 'Decor & Floral Architectural 3D Renders', 'Finalize stage layout, mandap florals and palace lighting simulations.', -65, 'medium', 'lead_planner', 5),
('full_service', 'pre_wedding', 'Photographer & Cinematography Crew Briefing', 'Confirm shot list, drone permits, and lighting requirements.', -60, 'medium', 'coordinator', 6),
('full_service', 'pre_wedding', 'Sound, Light & Entertainment Contractor Lock', 'Finalize stage AV, generator backups, and artist tech riders.', -55, 'high', 'coordinator', 7),
('full_service', 'pre_wedding', 'Bridal Makeup & Trousseau Schedule', 'Lock artist call-times for Mehendi, Sangeet and Wedding ceremonies.', -50, 'medium', 'coordinator', 8),
('full_service', 'pre_wedding', 'Guest Room Inventory & Room Drops Setup', 'Map 400+ guest allocations across heritage suites and prepare welcome hampers.', -45, 'medium', 'assistant', 9),
('full_service', 'pre_wedding', 'Luxury Airport Transfer Logistics Matrix', 'Coordinate flight arrival lists with chauffeur fleet.', -40, 'medium', 'assistant', 10),
('full_service', 'pre_wedding', 'Ceremony Priest & Ritual Material Check', 'Review samagri list, havan setup, and priest movement timings.', -35, 'medium', 'coordinator', 11),
('full_service', 'pre_wedding', 'Draft Minute-by-Minute Master Timeline', 'Assemble run-of-show with bride and groom families.', -30, 'high', 'lead_planner', 12),
('full_service', 'pre_wedding', 'Collect Advance Payment Milestone (30%)', 'Confirm second staged milestone receipt and reconcile vendor balances.', -30, 'critical', 'lead_planner', 13),
('full_service', 'pre_wedding', 'Security, Valet & Fire Safety Permits', 'Obtain local authorities permits and inspect emergency fire exits.', -20, 'high', 'coordinator', 14),
('full_service', 'pre_wedding', 'Vendor Production Site Recce', 'On-ground walkthrough with decorators, caterers and sound engineers.', -14, 'high', 'lead_planner', 15),

-- Day 1: Mehendi
('full_service', 'mehendi', 'Inspect Mehendi Cabana & Floral Backdrop', 'Verify marigold installations, low seating cushions and shade sails.', -2, 'high', 'coordinator', 16),
('full_service', 'mehendi', 'Check-in Mehendi Artists & Henna Cones', 'Verify arrival of 12 henna artists and guest seating station.', -2, 'medium', 'assistant', 17),
('full_service', 'mehendi', 'Traditional Street Food & Chaat Station Check', 'Verify live station hygiene, temperature and server uniforms.', -2, 'high', 'coordinator', 18),
('full_service', 'mehendi', 'Folk Troupe Soundcheck & Welcome Dholis', 'Conduct mic check for Manganiyar singers and greet guests at portico.', -2, 'medium', 'assistant', 19),

-- Day 2: Sangeet
('full_service', 'sangeet', 'Sangeet Stage AV & Truss Rigging Inspection', 'Sign off on LED screen pixel-mapping, audio line arrays, and stage safety.', -1, 'critical', 'lead_planner', 20),
('full_service', 'sangeet', 'Family Dance Rehearsal Run-Through', 'Queue audio tracks with DJ and run through family choreography entries.', -1, 'high', 'coordinator', 21),
('full_service', 'sangeet', 'Bar Counter Inventory & Royal Mixology Check', 'Audit beverage glassware, ice dry-storage, and garnish quality.', -1, 'medium', 'coordinator', 22),
('full_service', 'sangeet', 'Late Night Buffet & Midnight Snack Setup', 'Coordinate midnight food replenishment with catering captain.', -1, 'medium', 'assistant', 23),

-- Day 3: Wedding Day & Reception
('full_service', 'wedding_day', 'Mandap Construction & Sacred Fire Setup', 'Verify 4-pillar floral mandap, samagri trays, and airflow for smoke.', 0, 'critical', 'lead_planner', 24),
('full_service', 'wedding_day', 'Baraat Procession, Vintage Car & Band Alignment', 'Coordinate vintage car arrival, brass band, safa tying crew and dholis.', 0, 'critical', 'lead_planner', 25),
('full_service', 'wedding_day', 'Varmala Stage & Cold Pyro Coordination', 'Coordinate bride reveal walk, music cues, and electronic cold pyro safely.', 0, 'high', 'coordinator', 26),
('full_service', 'wedding_day', 'Royal Banquet Line Inspection', 'Verify silver service banquet, 400+ guest covers, and food replenishment.', 0, 'high', 'coordinator', 27),
('full_service', 'wedding_day', 'Pheras Seating & Family Support', 'Ensure parents, priest and immediate relatives are comfortably situated.', 0, 'high', 'assistant', 28),
('full_service', 'reception', 'Vidaai Car Floral Decoration & Luggage Dispatch', 'Decorate departure car and dispatch couple luggage to presidential suite.', 0, 'high', 'assistant', 29),

-- Post-Wedding
('full_service', 'post_wedding', 'Collect Final Client Milestone & Settle Vendors', 'Reconcile receipts, bill variances, approved extras, and vendor balance dues.', 3, 'critical', 'lead_planner', 30),
('full_service', 'post_wedding', 'Palace Venue Deposit Return & Damage Inspection', 'Joint walkthrough with venue general manager to recover security deposit.', 5, 'medium', 'lead_planner', 31),
('full_service', 'post_wedding', 'Deliver Raw Photo Teasers & Thank You Notes', 'Coordinate client social media assets with cinematography team.', 7, 'medium', 'assistant', 32);

-- Day-of Templates (15 tasks)
INSERT INTO public.task_templates (package_type, phase, title, description, offset_days, priority, default_owner_role, display_order)
VALUES
('day_of', 'pre_wedding', 'Collect Existing Vendor Contracts & Contact List', 'Import all couple-contracted vendors into Vivona contact ledger.', -28, 'critical', 'lead_planner', 1),
('day_of', 'pre_wedding', 'Build Master Production Schedule', 'Consolidate 18 vendor call-times and delivery schedules into single run-of-show.', -21, 'high', 'lead_planner', 2),
('day_of', 'pre_wedding', 'Conduct Venue Walkthrough & Loading Dock Review', 'Check generator hookups, freight elevator rules, and venue curfew policies.', -14, 'high', 'coordinator', 3),
('day_of', 'pre_wedding', 'Vendor Final Confirmation Calls', 'Confirm arrival time, crew headcounts, and vehicle numbers with all vendors.', -7, 'high', 'coordinator', 4),
('day_of', 'pre_wedding', 'Emergency Contingency Kit Assembly', 'Pack bridal sewing kits, medical supplies, wireless radios, and backup mic batteries.', -2, 'medium', 'assistant', 5),
('day_of', 'wedding_day', 'Morning Venue Opening & Loading Supervision', 'Check in early setup crews for florists, AV engineers, and caterers.', 0, 'high', 'coordinator', 6),
('day_of', 'wedding_day', 'Live Vendor Check-In Tracking', 'Record server timestamps on arrival board and monitor grace period alerts.', 0, 'critical', 'coordinator', 7),
('day_of', 'wedding_day', 'Bridal Suite Check-in & Makeup Timing Watch', 'Ensure bridal styling stays strictly on schedule for reveal photography.', 0, 'high', 'assistant', 8),
('day_of', 'wedding_day', 'Baraat Assembly & Safa Tying Station', 'Manage guest turban tying station and line up procession.', 0, 'high', 'coordinator', 9),
('day_of', 'wedding_day', 'Varmala Music & Flower Petal Cueing', 'Distribute rose petals to guests and trigger varmala background score.', 0, 'high', 'assistant', 10),
('day_of', 'wedding_day', 'Mandap Pheras Timekeeper', 'Liaise gently with priest to ensure auspicious muhurat timeline is respected.', 0, 'high', 'lead_planner', 11),
('day_of', 'wedding_day', 'Buffet Opening & Dinner Headcount Verification', 'Coordinate with banquet captain on guest count pacing and plate counts.', 0, 'high', 'coordinator', 12),
('day_of', 'wedding_day', 'Vidaai Coordination & Transport', 'Organize family procession, vidaai vehicle, and luggage transfer.', 0, 'high', 'assistant', 13),
('day_of', 'post_wedding', 'Oversee Venue Teardown & Clear-up', 'Ensure all rental decor and AV gear are safely de-rigged without venue damage.', 1, 'high', 'coordinator', 14),
('day_of', 'post_wedding', 'Vendor Timesheet & Day-of Log Handoff', 'Compile signed delivery slips, incident notes, and timesheets for admin.', 2, 'medium', 'lead_planner', 15);
