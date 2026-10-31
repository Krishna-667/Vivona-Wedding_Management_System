-- ==============================================================================
-- Migration: 006_rpcs.sql
-- Transactional Functions: select_quote, confirm_wedding, record_client_receipt, record_vendor_payment, approve_extra_charge, shift_schedule_entries
-- ==============================================================================

-- 1. RPC: select_quote
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
  v_actor_id := public.app_user_id();

  SELECT * INTO v_quote
  FROM public.vendor_quotes
  WHERE id = p_quote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor quote % not found.', p_quote_id;
  END IF;

  SELECT * INTO v_rfq
  FROM public.rfqs
  WHERE id = v_quote.rfq_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent RFQ % not found.', v_quote.rfq_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.vendor_quotes
    WHERE rfq_id = v_quote.rfq_id AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'A winning quote has already been selected for this RFQ category.';
  END IF;

  UPDATE public.vendor_quotes
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_quote_id;

  UPDATE public.vendor_quotes
  SET status = 'closed_not_selected', updated_at = NOW()
  WHERE rfq_id = v_quote.rfq_id AND id <> p_quote_id AND status <> 'rejected';

  UPDATE public.rfqs
  SET status = 'closed_not_selected', updated_at = NOW()
  WHERE id = v_quote.rfq_id;

  SELECT start_date INTO v_wedding_start_date
  FROM public.weddings
  WHERE id = v_rfq.wedding_id;

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
    'vendor_quotes',
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

-- 2. RPC: confirm_wedding
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
  v_actor_id := public.app_user_id();
  v_year := to_char(CURRENT_DATE, 'YYYY');

  SELECT * INTO v_enquiry
  FROM public.enquiries
  WHERE id = p_enquiry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enquiry % not found.', p_enquiry_id;
  END IF;

  SELECT * INTO v_proposal
  FROM public.proposals
  WHERE enquiry_id = p_enquiry_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_enquiry.package_id IS NOT NULL THEN
    SELECT * INTO v_pkg FROM public.packages WHERE id = v_enquiry.package_id;
    IF FOUND THEN
      v_pkg_type := v_pkg.type;
    END IF;
  END IF;

  SELECT COALESCE(MAX(SUBSTRING(code FROM 'VIV-[0-9]{4}-([0-9]{3})')::INT), 0) + 1
  INTO v_seq
  FROM public.weddings
  WHERE code LIKE 'VIV-' || v_year || '-%';

  v_wedding_code := 'VIV-' || v_year || '-' || lpad(v_seq::TEXT, 3, '0');

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

  v_venue_name := CASE
    WHEN v_enquiry.city = 'Udaipur' THEN 'Fateh Garh Palace Terraces, Udaipur'
    ELSE 'Rambagh Heritage Palace Grounds, Jaipur'
  END;

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
    COALESCE(v_enquiry.preferred_start_date, CURRENT_DATE + INTERVAL '90 days'),
    COALESCE(v_enquiry.preferred_end_date, CURRENT_DATE + INTERVAL '93 days'),
    v_enquiry.guest_count,
    'planning',
    COALESCE(v_proposal.total_paise, v_enquiry.budget_max_paise),
    v_enquiry.notes
  )
  RETURNING id INTO v_wedding_id;

  IF v_proposal IS NOT NULL THEN
    v_booking_amt := ROUND(v_proposal.total_paise * 0.20);
    v_advance_amt := ROUND(v_proposal.total_paise * 0.30);
    v_final_amt := v_proposal.total_paise - (v_booking_amt + v_advance_amt);

    INSERT INTO public.payment_milestones (
      wedding_id, kind, title, due_date, percentage, amount_paise, paid_amount_paise, status
    ) VALUES (
      v_wedding_id, 'booking', 'Booking Commitment Deposit (20%)', CURRENT_DATE, 20.00, v_booking_amt, v_booking_amt, 'paid'
    );

    INSERT INTO public.payment_milestones (
      wedding_id, kind, title, due_date, percentage, amount_paise, paid_amount_paise, status
    ) VALUES (
      v_wedding_id, 'advance', 'Main Event Advance Milestone (30%)', COALESCE(v_enquiry.preferred_start_date, CURRENT_DATE + 90) - INTERVAL '30 days', 30.00, v_advance_amt, 0, 'pending'
    );

    INSERT INTO public.payment_milestones (
      wedding_id, kind, title, due_date, percentage, amount_paise, paid_amount_paise, status
    ) VALUES (
      v_wedding_id, 'final', 'Post-Event Final Settlement (50%)', COALESCE(v_enquiry.preferred_end_date, CURRENT_DATE + 93) + INTERVAL '7 days', 50.00, v_final_amt, 0, 'pending'
    );
  END IF;

  FOR v_template IN
    SELECT * FROM public.task_templates
    WHERE package_type = v_pkg_type
    ORDER BY display_order ASC, offset_days DESC
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
      COALESCE(v_lead_id, v_actor_id),
      v_template.phase,
      v_template.title,
      v_template.description,
      'to_plan',
      v_template.priority,
      COALESCE(v_enquiry.preferred_start_date, CURRENT_DATE + 90) - (v_template.offset_days || ' days')::INTERVAL
    );
    v_task_count := v_task_count + 1;
  END LOOP;

  IF v_lead_id IS NOT NULL THEN
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
    ) ON CONFLICT (wedding_id, employee_id) DO NOTHING;
  END IF;

  INSERT INTO public.message_threads (
    wedding_id,
    client_id
  ) VALUES (
    v_wedding_id,
    v_enquiry.client_id
  ) RETURNING id INTO v_thread_id;

  UPDATE public.enquiries
  SET status = 'confirmed', updated_at = NOW()
  WHERE id = p_enquiry_id;

  INSERT INTO public.audit_events (
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  ) VALUES (
    v_actor_id,
    'CONFIRM_WEDDING',
    'weddings',
    v_wedding_id,
    jsonb_build_object(
      'code', v_wedding_code,
      'enquiry_id', p_enquiry_id,
      'tasks_generated', v_task_count,
      'lead_planner_id', v_lead_id
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'wedding_id', v_wedding_id,
    'wedding_code', v_wedding_code,
    'tasks_count', v_task_count,
    'lead_id', v_lead_id
  );
END;
$$;

-- 3. RPC: record_client_receipt
CREATE OR REPLACE FUNCTION public.record_client_receipt(
  p_wedding_id UUID,
  p_milestone_id UUID,
  p_amount_paise BIGINT,
  p_payment_method TEXT,
  p_reference TEXT,
  p_idempotency_key TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_milestone RECORD;
  v_existing_receipt RECORD;
  v_receipt_id UUID;
  v_remaining_paise BIGINT;
  v_actor_id UUID;
BEGIN
  v_actor_id := public.app_user_id();

  SELECT * INTO v_existing_receipt
  FROM public.client_receipts
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'receipt_id', v_existing_receipt.id,
      'amount_paise', v_existing_receipt.amount_paise,
      'is_duplicate', true,
      'message', 'Receipt already recorded with this idempotency key.'
    );
  END IF;

  IF p_milestone_id IS NOT NULL THEN
    SELECT * INTO v_milestone
    FROM public.payment_milestones
    WHERE id = p_milestone_id AND wedding_id = p_wedding_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Payment milestone % not found for wedding %.', p_milestone_id, p_wedding_id;
    END IF;

    v_remaining_paise := v_milestone.amount_paise - v_milestone.paid_amount_paise;

    IF p_amount_paise > v_remaining_paise THEN
      RAISE EXCEPTION 'Payment of % paise exceeds remaining milestone balance of % paise.', p_amount_paise, v_remaining_paise;
    END IF;
  END IF;

  INSERT INTO public.client_receipts (
    wedding_id,
    milestone_id,
    amount_paise,
    payment_method,
    reference,
    idempotency_key,
    notes,
    received_at
  ) VALUES (
    p_wedding_id,
    p_milestone_id,
    p_amount_paise,
    COALESCE(p_payment_method, 'bank_transfer'),
    p_reference,
    p_idempotency_key,
    p_notes,
    NOW()
  )
  RETURNING id INTO v_receipt_id;

  IF p_milestone_id IS NOT NULL THEN
    UPDATE public.payment_milestones
    SET
      paid_amount_paise = paid_amount_paise + p_amount_paise,
      status = CASE
        WHEN (paid_amount_paise + p_amount_paise) >= amount_paise THEN 'paid'::milestone_status
        ELSE 'partially_paid'::milestone_status
      END,
      updated_at = NOW()
    WHERE id = p_milestone_id;
  END IF;

  INSERT INTO public.audit_events (
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  ) VALUES (
    v_actor_id,
    'RECORD_CLIENT_RECEIPT',
    'client_receipts',
    v_receipt_id,
    jsonb_build_object(
      'wedding_id', p_wedding_id,
      'milestone_id', p_milestone_id,
      'amount_paise', p_amount_paise,
      'reference', p_reference
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'receipt_id', v_receipt_id,
    'amount_paise', p_amount_paise,
    'is_duplicate', false
  );
END;
$$;

-- 4. RPC: record_vendor_payment
CREATE OR REPLACE FUNCTION public.record_vendor_payment(
  p_wedding_id UUID,
  p_wedding_vendor_id UUID,
  p_bill_id UUID,
  p_amount_paise BIGINT,
  p_payment_method TEXT,
  p_reference TEXT,
  p_idempotency_key TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_payment RECORD;
  v_payment_id UUID;
  v_bill RECORD;
  v_wv RECORD;
  v_total_paid BIGINT;
  v_actor_id UUID;
BEGIN
  v_actor_id := public.app_user_id();

  SELECT * INTO v_existing_payment
  FROM public.vendor_payments
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'payment_id', v_existing_payment.id,
      'amount_paise', v_existing_payment.amount_paise,
      'is_duplicate', true,
      'message', 'Vendor payment already recorded with this idempotency key.'
    );
  END IF;

  SELECT * INTO v_wv
  FROM public.wedding_vendors
  WHERE id = p_wedding_vendor_id AND wedding_id = p_wedding_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wedding vendor % not found for wedding %.', p_wedding_vendor_id, p_wedding_id;
  END IF;

  SELECT COALESCE(SUM(amount_paise), 0) INTO v_total_paid
  FROM public.vendor_payments
  WHERE wedding_vendor_id = p_wedding_vendor_id;

  IF p_bill_id IS NOT NULL THEN
    SELECT * INTO v_bill
    FROM public.vendor_bills
    WHERE id = p_bill_id AND wedding_vendor_id = p_wedding_vendor_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vendor bill % not found.', p_bill_id;
    END IF;

    IF (v_total_paid + p_amount_paise) > v_bill.amount_paise THEN
      RAISE EXCEPTION 'Payment of % paise would exceed total bill amount of % paise.', p_amount_paise, v_bill.amount_paise;
    END IF;
  END IF;

  INSERT INTO public.vendor_payments (
    wedding_id,
    wedding_vendor_id,
    bill_id,
    amount_paise,
    payment_method,
    reference,
    idempotency_key,
    notes,
    paid_at
  ) VALUES (
    p_wedding_id,
    p_wedding_vendor_id,
    p_bill_id,
    p_amount_paise,
    COALESCE(p_payment_method, 'bank_transfer'),
    p_reference,
    p_idempotency_key,
    p_notes,
    NOW()
  )
  RETURNING id INTO v_payment_id;

  IF p_bill_id IS NOT NULL AND (v_total_paid + p_amount_paise) >= v_bill.amount_paise THEN
    UPDATE public.vendor_bills
    SET status = 'paid', updated_at = NOW()
    WHERE id = p_bill_id;
  END IF;

  INSERT INTO public.audit_events (
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  ) VALUES (
    v_actor_id,
    'RECORD_VENDOR_PAYMENT',
    'vendor_payments',
    v_payment_id,
    jsonb_build_object(
      'wedding_id', p_wedding_id,
      'wedding_vendor_id', p_wedding_vendor_id,
      'amount_paise', p_amount_paise,
      'reference', p_reference
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'payment_id', v_payment_id,
    'amount_paise', p_amount_paise,
    'is_duplicate', false
  );
END;
$$;

-- 5. RPC: approve_extra_charge
CREATE OR REPLACE FUNCTION public.approve_extra_charge(
  p_extra_charge_id UUID,
  p_decision TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_charge RECORD;
  v_milestone_id UUID;
  v_actor_id UUID;
BEGIN
  v_actor_id := public.app_user_id();

  SELECT * INTO v_charge
  FROM public.extra_charges
  WHERE id = p_extra_charge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Extra charge % not found.', p_extra_charge_id;
  END IF;

  IF v_charge.status != 'requested' THEN
    RAISE EXCEPTION 'Extra charge is already %.', v_charge.status;
  END IF;

  IF p_decision = 'approved' THEN
    UPDATE public.extra_charges
    SET
      status = 'approved'::extra_charge_status,
      approved_by = v_actor_id,
      approved_at = NOW()
    WHERE id = p_extra_charge_id;

    INSERT INTO public.payment_milestones (
      wedding_id,
      kind,
      title,
      due_date,
      percentage,
      amount_paise,
      paid_amount_paise,
      status
    ) VALUES (
      v_charge.wedding_id,
      'extra'::milestone_kind,
      'Extra Approved: ' || v_charge.title || ' (' || v_charge.qty || ' units)',
      CURRENT_DATE + INTERVAL '7 days',
      0,
      v_charge.total_paise,
      0,
      'pending'::milestone_status
    )
    RETURNING id INTO v_milestone_id;

    INSERT INTO public.audit_events (
      actor_id,
      action,
      entity_type,
      entity_id,
      new_data
    ) VALUES (
      v_actor_id,
      'APPROVE_EXTRA_CHARGE',
      'extra_charges',
      p_extra_charge_id,
      jsonb_build_object(
        'status', 'approved',
        'milestone_id', v_milestone_id,
        'total_paise', v_charge.total_paise
      )
    );

    RETURN jsonb_build_object(
      'ok', true,
      'status', 'approved',
      'milestone_id', v_milestone_id
    );
  ELSE
    UPDATE public.extra_charges
    SET
      status = 'rejected'::extra_charge_status,
      approved_by = v_actor_id,
      approved_at = NOW()
    WHERE id = p_extra_charge_id;

    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;
END;
$$;

-- 6. RPC: shift_schedule_entries
CREATE OR REPLACE FUNCTION public.shift_schedule_entries(
  p_wedding_id UUID,
  p_from_entry_id UUID,
  p_shift_minutes INT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_ref_entry RECORD;
  v_shifted_count INT;
BEGIN
  SELECT * INTO v_ref_entry
  FROM public.schedule_entries
  WHERE id = p_from_entry_id AND wedding_id = p_wedding_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule entry % not found.', p_from_entry_id;
  END IF;

  UPDATE public.schedule_entries
  SET
    start_time = (start_time::time + (p_shift_minutes || ' minutes')::interval)::time,
    end_time = (end_time::time + (p_shift_minutes || ' minutes')::interval)::time,
    updated_at = NOW()
  WHERE
    wedding_id = p_wedding_id
    AND day_number = v_ref_entry.day_number
    AND start_time >= v_ref_entry.start_time;

  GET DIAGNOSTICS v_shifted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'shifted_count', v_shifted_count,
    'shift_minutes', p_shift_minutes
  );
END;
$$;
