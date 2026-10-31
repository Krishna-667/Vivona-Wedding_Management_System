-- ==============================================================================
-- Migration: 004_rls_helpers.sql
-- Native Row-Level Security & Access Helpers using transaction-local app.user_id
-- ==============================================================================

-- 1. APP_USER_ID HELPER
CREATE OR REPLACE FUNCTION public.app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::UUID;
$$;

-- 2. SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = public.app_user_id()
      AND role = 'admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned(p_wedding_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.wedding_assignments
    WHERE wedding_id = p_wedding_id
      AND employee_id = public.app_user_id()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_client_of(p_wedding_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.weddings
    WHERE id = p_wedding_id
      AND client_id = public.app_user_id()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.agreement_signed(p_wedding_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agreements
    WHERE wedding_id = p_wedding_id
      AND status = 'signed'
  );
END;
$$;

-- 3. ROLE TAMPERING GUARD TRIGGER
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('vivona_owner', 'vivona_service', 'postgres') THEN
    RETURN NEW;
  END IF;

  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.hourly_rate_paise IS DISTINCT FROM NEW.hourly_rate_paise) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only an administrator can modify user roles or hourly rates.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_profile_role_guard ON public.profiles;
CREATE TRIGGER check_profile_role_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();

-- 4. ENABLE RLS ON ALL PUBLIC TABLES
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
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- FORCE RLS on sensitive tables
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.weddings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.proposals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.agreements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.files FORCE ROW LEVEL SECURITY;

-- 5. RLS POLICIES

-- Profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (
  public.is_admin() OR id = public.app_user_id() OR is_active = true
);

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE USING (
  public.is_admin() OR id = public.app_user_id()
);

-- Packages & Public Content (Public Read, Admin Write)
CREATE POLICY "packages_read_public" ON public.packages
FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "packages_admin_all" ON public.packages
FOR ALL USING (public.is_admin());

CREATE POLICY "service_catalog_read_public" ON public.service_catalog
FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "service_catalog_admin_all" ON public.service_catalog
FOR ALL USING (public.is_admin());

CREATE POLICY "social_proof_read_public" ON public.social_proof
FOR SELECT USING (true);
CREATE POLICY "social_proof_admin_all" ON public.social_proof
FOR ALL USING (public.is_admin());

-- Notifications
CREATE POLICY "notifications_user_all" ON public.notifications
FOR ALL USING (user_id = public.app_user_id() OR public.is_admin());

-- Enquiries
CREATE POLICY "enquiries_admin_all" ON public.enquiries
FOR ALL USING (public.is_admin());

CREATE POLICY "enquiries_client_select" ON public.enquiries
FOR SELECT USING (client_id = public.app_user_id());

CREATE POLICY "enquiries_insert_public" ON public.enquiries
FOR INSERT WITH CHECK (true);

-- Enquiry Activities
CREATE POLICY "enquiry_activities_admin_all" ON public.enquiry_activities
FOR ALL USING (public.is_admin());

CREATE POLICY "enquiry_activities_client_select" ON public.enquiry_activities
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enquiries
    WHERE enquiries.id = enquiry_activities.enquiry_id
      AND enquiries.client_id = public.app_user_id()
  )
);

-- Proposals & Lines
CREATE POLICY "proposals_admin_all" ON public.proposals
FOR ALL USING (public.is_admin());

CREATE POLICY "proposals_client_select" ON public.proposals
FOR SELECT USING (client_id = public.app_user_id());

CREATE POLICY "proposal_lines_admin_all" ON public.proposal_lines
FOR ALL USING (public.is_admin());

CREATE POLICY "proposal_lines_client_select" ON public.proposal_lines
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.proposals
    WHERE proposals.id = proposal_lines.proposal_id
      AND proposals.client_id = public.app_user_id()
  )
);

-- Weddings
CREATE POLICY "weddings_admin_all" ON public.weddings
FOR ALL USING (public.is_admin());

CREATE POLICY "weddings_assigned_select" ON public.weddings
FOR SELECT USING (
  public.is_assigned(id) OR public.is_client_of(id)
);

-- Wedding Assignments
CREATE POLICY "wedding_assignments_admin_all" ON public.wedding_assignments
FOR ALL USING (public.is_admin());

CREATE POLICY "wedding_assignments_emp_select" ON public.wedding_assignments
FOR SELECT USING (employee_id = public.app_user_id());

CREATE POLICY "wedding_assignments_client_select" ON public.wedding_assignments
FOR SELECT USING (public.is_client_of(wedding_id));

-- Agreements
CREATE POLICY "agreements_admin_all" ON public.agreements
FOR ALL USING (public.is_admin());

CREATE POLICY "agreements_client_policy" ON public.agreements
FOR SELECT USING (client_id = public.app_user_id());

CREATE POLICY "agreements_client_update" ON public.agreements
FOR UPDATE USING (client_id = public.app_user_id());

-- Vendors & RFQs (Shortlist hidden from client until agreement signed)
CREATE POLICY "vendors_admin_all" ON public.vendors
FOR ALL USING (public.is_admin());

CREATE POLICY "vendors_employee_select" ON public.vendors
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.wedding_assignments wa
    JOIN public.wedding_vendors wv ON wv.wedding_id = wa.wedding_id
    WHERE wa.employee_id = public.app_user_id()
      AND wv.vendor_id = vendors.id
  )
);

CREATE POLICY "vendors_client_select" ON public.vendors
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.wedding_vendors wv
    JOIN public.weddings w ON w.id = wv.wedding_id
    WHERE w.client_id = public.app_user_id()
      AND wv.vendor_id = vendors.id
      AND public.agreement_signed(w.id)
  )
);

CREATE POLICY "rfqs_admin_all" ON public.rfqs
FOR ALL USING (public.is_admin());

CREATE POLICY "vendor_quotes_admin_all" ON public.vendor_quotes
FOR ALL USING (public.is_admin());

CREATE POLICY "quote_lines_admin_all" ON public.quote_lines
FOR ALL USING (public.is_admin());

CREATE POLICY "wedding_vendors_admin_all" ON public.wedding_vendors
FOR ALL USING (public.is_admin());

CREATE POLICY "wedding_vendors_assigned_select" ON public.wedding_vendors
FOR SELECT USING (
  public.is_assigned(wedding_id) OR
  (public.is_client_of(wedding_id) AND public.agreement_signed(wedding_id))
);

-- Task Templates
CREATE POLICY "task_templates_read" ON public.task_templates
FOR SELECT USING (true);
CREATE POLICY "task_templates_admin" ON public.task_templates
FOR ALL USING (public.is_admin());

-- Tasks
CREATE POLICY "tasks_admin_all" ON public.tasks
FOR ALL USING (public.is_admin());

CREATE POLICY "tasks_assigned_employee" ON public.tasks
FOR ALL USING (public.is_assigned(wedding_id));

CREATE POLICY "tasks_client_select" ON public.tasks
FOR SELECT USING (public.is_client_of(wedding_id));

-- Live Ops (Schedule, Checkins, Incidents)
CREATE POLICY "schedule_entries_admin_all" ON public.schedule_entries
FOR ALL USING (public.is_admin());
CREATE POLICY "schedule_entries_assigned" ON public.schedule_entries
FOR ALL USING (public.is_assigned(wedding_id));
CREATE POLICY "schedule_entries_client_select" ON public.schedule_entries
FOR SELECT USING (public.is_client_of(wedding_id));

CREATE POLICY "vendor_checkins_admin_all" ON public.vendor_checkins
FOR ALL USING (public.is_admin());
CREATE POLICY "vendor_checkins_assigned" ON public.vendor_checkins
FOR ALL USING (public.is_assigned(wedding_id));

CREATE POLICY "incidents_admin_all" ON public.incidents
FOR ALL USING (public.is_admin());
CREATE POLICY "incidents_assigned" ON public.incidents
FOR ALL USING (public.is_assigned(wedding_id));

-- Messaging (Threads and Messages)
CREATE POLICY "message_threads_admin_all" ON public.message_threads
FOR ALL USING (public.is_admin());

CREATE POLICY "message_threads_assigned" ON public.message_threads
FOR SELECT USING (public.is_assigned(wedding_id) OR client_id = public.app_user_id());

CREATE POLICY "messages_select_policy" ON public.messages
FOR SELECT USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.message_threads mt
    WHERE mt.id = messages.thread_id
      AND (public.is_assigned(mt.wedding_id) OR mt.client_id = public.app_user_id())
  )
);

CREATE POLICY "messages_insert_policy" ON public.messages
FOR INSERT WITH CHECK (
  public.is_admin() OR
  (
    sender_id = public.app_user_id() AND
    EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = messages.thread_id
        AND (public.is_assigned(mt.wedding_id) OR mt.client_id = public.app_user_id())
    )
  )
);

-- Finance
CREATE POLICY "payment_milestones_admin_all" ON public.payment_milestones
FOR ALL USING (public.is_admin());
CREATE POLICY "payment_milestones_assigned_select" ON public.payment_milestones
FOR SELECT USING (public.is_assigned(wedding_id));
CREATE POLICY "payment_milestones_client_select" ON public.payment_milestones
FOR SELECT USING (public.is_client_of(wedding_id));

CREATE POLICY "client_receipts_admin_all" ON public.client_receipts
FOR ALL USING (public.is_admin());
CREATE POLICY "client_receipts_client_select" ON public.client_receipts
FOR SELECT USING (public.is_client_of(wedding_id));

CREATE POLICY "vendor_bills_admin_all" ON public.vendor_bills
FOR ALL USING (public.is_admin());

CREATE POLICY "vendor_payments_admin_all" ON public.vendor_payments
FOR ALL USING (public.is_admin());

CREATE POLICY "extra_charges_admin_all" ON public.extra_charges
FOR ALL USING (public.is_admin());
CREATE POLICY "extra_charges_assigned" ON public.extra_charges
FOR ALL USING (public.is_assigned(wedding_id));
CREATE POLICY "extra_charges_client_select" ON public.extra_charges
FOR SELECT USING (public.is_client_of(wedding_id) AND status = 'approved');

CREATE POLICY "timesheets_admin_all" ON public.timesheets
FOR ALL USING (public.is_admin());
CREATE POLICY "timesheets_employee" ON public.timesheets
FOR ALL USING (employee_id = public.app_user_id() OR public.is_assigned(wedding_id));

CREATE POLICY "audit_events_admin_all" ON public.audit_events
FOR ALL USING (public.is_admin());

-- Files
CREATE POLICY "files_admin_all" ON public.files
FOR ALL USING (public.is_admin());
CREATE POLICY "files_public_select" ON public.files
FOR SELECT USING (is_public = true);
CREATE POLICY "files_owner_select" ON public.files
FOR SELECT USING (owner_id = public.app_user_id() OR public.is_assigned(wedding_id) OR public.is_client_of(wedding_id));
