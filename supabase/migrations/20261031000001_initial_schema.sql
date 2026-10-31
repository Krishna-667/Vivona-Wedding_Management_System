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
