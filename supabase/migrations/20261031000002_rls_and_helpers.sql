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
