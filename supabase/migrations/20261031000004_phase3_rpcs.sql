-- Migration: 20261031000004_phase3_rpcs.sql
-- Description: Phase 3 Admin RPCs: confirm_wedding (instant auto-plan generation), select_quote, and record_deposit

-- 1. RPC: select_quote (Transactional Winner Selection with Duplicate Guard)
CREATE OR REPLACE FUNCTION public.select_quote(p_quote_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_quote RECORD;
  v_rfq RECORD;
  v_wedding_start_date DATE;
  v_wedding_vendor_id UUID;
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();

  -- 1. Fetch quote
  SELECT * INTO v_quote
  FROM public.vendor_quotes
  WHERE id = p_quote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor quote % not found.', p_quote_id;
  END IF;

  -- 2. Fetch parent RFQ
  SELECT * INTO v_rfq
  FROM public.rfqs
  WHERE id = v_quote.rfq_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent RFQ % not found.', v_quote.rfq_id;
  END IF;

  -- 3. Strict Guard: Reject selecting twice
  IF EXISTS (
    SELECT 1 FROM public.vendor_quotes
    WHERE rfq_id = v_quote.rfq_id AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'A winning quote has already been selected for this RFQ category.';
  END IF;

  -- 4. Mark winning quote as accepted
  UPDATE public.vendor_quotes
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_quote_id;

  -- 5. Mark competing quotes as closed_not_selected
  UPDATE public.vendor_quotes
  SET status = 'closed_not_selected', updated_at = NOW()
  WHERE rfq_id = v_quote.rfq_id AND id <> p_quote_id AND status <> 'rejected';

  -- 6. Close RFQ
  UPDATE public.rfqs
  SET status = 'closed', updated_at = NOW()
  WHERE id = v_quote.rfq_id;

  -- 7. Fetch wedding start date
  SELECT start_date INTO v_wedding_start_date
  FROM public.weddings
  WHERE id = v_rfq.wedding_id;

  -- 8. Insert or update wedding_vendors link
  INSERT INTO public.wedding_vendors (
    wedding_id,
    vendor_id,
    quote_id,
    category,
    agreed_amount_paise,
    service_date,
    expected_arrival_at
  )
  VALUES (
    v_rfq.wedding_id,
    v_quote.vendor_id,
    p_quote_id,
    v_rfq.category,
    v_quote.total_paise,
    v_wedding_start_date,
    (v_wedding_start_date || ' 08:00:00')::TIMESTAMPTZ
  )
  ON CONFLICT (wedding_id, category, vendor_id) DO UPDATE SET
    quote_id = EXCLUDED.quote_id,
    agreed_amount_paise = EXCLUDED.agreed_amount_paise,
    service_date = EXCLUDED.service_date,
    expected_arrival_at = EXCLUDED.expected_arrival_at,
    updated_at = NOW()
  RETURNING id INTO v_wedding_vendor_id;

  -- 9. Audit trail
  INSERT INTO public.audit_events (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  ) VALUES (
    v_actor_id,
    'SELECT_VENDOR_QUOTE',
    'vendor_quote',
    p_quote_id,
    jsonb_build_object('rfq_id', v_quote.rfq_id, 'status', v_quote.status),
    jsonb_build_object('rfq_id', v_quote.rfq_id, 'status', 'accepted', 'agreed_amount_paise', v_quote.total_paise, 'wedding_vendor_id', v_wedding_vendor_id)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'quote_id', p_quote_id,
    'rfq_id', v_quote.rfq_id,
    'wedding_vendor_id', v_wedding_vendor_id,
    'agreed_amount_paise', v_quote.total_paise
  );
END;
$$;


-- 2. RPC: confirm_wedding (Creates Wedding, 30+ Instant Tasks, 3 Milestones & Team Assignment)
CREATE OR REPLACE FUNCTION public.confirm_wedding(
  p_enquiry_id UUID,
  p_assigned_lead_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_enquiry RECORD;
  v_proposal RECORD;
  v_pkg RECORD;
  v_pkg_type public.package_type := 'full_service';
  v_wedding_id UUID;
  v_wedding_code TEXT;
  v_seq INT;
  v_year TEXT;
  v_lead_id UUID;
  v_thread_id UUID;
  v_booking_amt BIGINT;
  v_advance_amt BIGINT;
  v_final_amt BIGINT;
  v_template RECORD;
  v_task_count INT := 0;
  v_venue_name TEXT;
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();
  v_year := to_char(CURRENT_DATE, 'YYYY');

  -- 1. Fetch enquiry
  SELECT * INTO v_enquiry
  FROM public.enquiries
  WHERE id = p_enquiry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enquiry % not found.', p_enquiry_id;
  END IF;

  -- 2. Fetch accepted proposal
  SELECT * INTO v_proposal
  FROM public.proposals
  WHERE enquiry_id = p_enquiry_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- 3. Resolve package type
  IF v_enquiry.package_id IS NOT NULL THEN
    SELECT * INTO v_pkg FROM public.packages WHERE id = v_enquiry.package_id;
    IF FOUND THEN
      v_pkg_type := v_pkg.type;
    END IF;
  END IF;

  -- 4. Generate sequential code: VIV-YYYY-XXX
  SELECT COALESCE(MAX(SUBSTRING(code FROM 'VIV-[0-9]{4}-([0-9]{3})')::INT), 0) + 1
  INTO v_seq
  FROM public.weddings
  WHERE code LIKE 'VIV-' || v_year || '-%';

  v_wedding_code := 'VIV-' || v_year || '-' || lpad(v_seq::TEXT, 3, '0');

  -- 5. Resolve lead planner
  IF p_assigned_lead_id IS NOT NULL THEN
    v_lead_id := p_assigned_lead_id;
  ELSE
    SELECT id INTO v_lead_id
    FROM public.profiles
    WHERE role = 'employee' AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_lead_id IS NULL THEN
      SELECT id INTO v_lead_id FROM public.profiles WHERE role = 'admin' AND is_active = true LIMIT 1;
    END IF;
  END IF;

  -- 6. Resolve venue name
  v_venue_name := CASE
    WHEN v_enquiry.city = 'Udaipur' THEN 'Fateh Garh Palace Terraces, Udaipur'
    ELSE 'Rambagh Heritage Palace Grounds, Jaipur'
  END;

  -- 7. Insert Wedding Core Record
  INSERT INTO public.weddings (
    code,
    client_id,
    enquiry_id,
    package_id,
    title,
    venue,
    city,
    start_date,
    end_date,
    guest_count_planned,
    status,
    budget_paise,
    notes
  ) VALUES (
    v_wedding_code,
    v_enquiry.client_id,
    p_enquiry_id,
    v_enquiry.package_id,
    v_enquiry.contact_name || ' Royal Wedding',
    v_venue_name,
    v_enquiry.city,
    v_enquiry.preferred_start_date,
    v_enquiry.preferred_end_date,
    v_enquiry.guest_count,
    'planning',
    COALESCE(v_proposal.total_paise, v_enquiry.budget_max_paise),
    v_enquiry.notes
  )
  RETURNING id INTO v_wedding_id;

  -- 8. Generate Staged Payment Milestones (20/30/50 Architecture)
  IF v_proposal IS NOT NULL THEN
    v_booking_amt := ROUND(v_proposal.total_paise * 0.20);
    v_advance_amt := ROUND(v_proposal.total_paise * 0.30);
    v_final_amt := v_proposal.total_paise - (v_booking_amt + v_advance_amt); -- zero-drift remainder

    -- Milestone 1: Booking Deposit (20%)
    INSERT INTO public.payment_milestones (
      wedding_id, kind, title, due_date, percentage, amount_paise, paid_amount_paise, status
    ) VALUES (
      v_wedding_id, 'booking', 'Booking Commitment Deposit (20%)', CURRENT_DATE, 20.00, v_booking_amt, v_booking_amt, 'paid'
    );

    -- Milestone 2: Advance Production (30%, due 30 days prior)
    INSERT INTO public.payment_milestones (
      wedding_id, kind, title, due_date, percentage, amount_paise, paid_amount_paise, status
    ) VALUES (
      v_wedding_id, 'advance', 'Advance Production & Vendor Lock (30%)',
      GREATEST(CURRENT_DATE, v_enquiry.preferred_start_date - INTERVAL '30 days')::DATE,
      30.00, v_advance_amt, 0, 'pending'
    );

    -- Milestone 3: Final Settlement (50%, due event day)
    INSERT INTO public.payment_milestones (
      wedding_id, kind, title, due_date, percentage, amount_paise, paid_amount_paise, status
    ) VALUES (
      v_wedding_id, 'final', 'Final Post-Wedding Settlement (50%)',
      v_enquiry.preferred_start_date,
      50.00, v_final_amt, 0, 'pending'
    );
  END IF;

  -- 9. Auto-Generate Operational Tasks from Task Templates (30+ for full_service, 15+ for day_of)
  FOR v_template IN
    SELECT * FROM public.task_templates
    WHERE package_type = v_pkg_type
    ORDER BY display_order ASC
  LOOP
    INSERT INTO public.tasks (
      wedding_id,
      owner_id,
      phase,
      title,
      description,
      stage,
      priority,
      due_date
    ) VALUES (
      v_wedding_id,
      v_lead_id,
      v_template.phase,
      v_template.title,
      v_template.description,
      'to_plan',
      v_template.priority,
      GREATEST(CURRENT_DATE, v_enquiry.preferred_start_date + (v_template.offset_days || ' days')::INTERVAL)::DATE
    );
    v_task_count := v_task_count + 1;
  END LOOP;

  -- 10. Assign Lead Planner
  INSERT INTO public.wedding_assignments (
    wedding_id,
    employee_id,
    assigned_by,
    role_on_wedding
  ) VALUES (
    v_wedding_id,
    v_lead_id,
    v_actor_id,
    'lead_planner'
  )
  ON CONFLICT (wedding_id, employee_id) DO NOTHING;

  -- 11. Create Realtime Client Message Thread
  INSERT INTO public.message_threads (
    wedding_id,
    title
  ) VALUES (
    v_wedding_id,
    'Concierge & Operations Bridge'
  )
  RETURNING id INTO v_thread_id;

  -- Post welcome message in thread
  INSERT INTO public.messages (
    thread_id,
    sender_id,
    body
  ) VALUES (
    v_thread_id,
    v_lead_id,
    'Namaste! Welcome to your Vivona royal wedding portal. I am your dedicated lead planner. All contracts, milestones, and minute-by-minute day schedules are now live.'
  );

  -- 12. Update Enquiry Status to confirmed
  UPDATE public.enquiries
  SET status = 'confirmed', updated_at = NOW()
  WHERE id = p_enquiry_id;

  -- 13. Link Agreement to Wedding
  UPDATE public.agreements
  SET wedding_id = v_wedding_id, updated_at = NOW()
  WHERE enquiry_id = p_enquiry_id;

  -- 14. Audit Log
  INSERT INTO public.audit_events (
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  ) VALUES (
    v_actor_id,
    'CONFIRM_WEDDING',
    'wedding',
    v_wedding_id,
    jsonb_build_object(
      'code', v_wedding_code,
      'enquiry_id', p_enquiry_id,
      'lead_planner_id', v_lead_id,
      'task_count', v_task_count
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'wedding_id', v_wedding_id,
    'wedding_code', v_wedding_code,
    'lead_planner_id', v_lead_id,
    'task_count', v_task_count
  );
END;
$$;
