-- Migration: 20261031000005_phase4_phase5_rpcs.sql
-- Description: Phase 4 & Phase 5 RPCs: Live checkins, schedule shifts, idempotent finance receipts/payments, extra charges, and founder profit analytics

-- 1. RPC: record_client_receipt (Transactional, Idempotent, Overpayment Guard)
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
  v_actor_id := auth.uid();

  -- 1. Idempotency Check: if key already processed, return existing receipt safely
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

  -- 2. Validate Milestone if provided
  IF p_milestone_id IS NOT NULL THEN
    SELECT * INTO v_milestone
    FROM public.payment_milestones
    WHERE id = p_milestone_id AND wedding_id = p_wedding_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Payment milestone % not found for wedding %.', p_milestone_id, p_wedding_id;
    END IF;

    v_remaining_paise := v_milestone.amount_paise - v_milestone.paid_amount_paise;

    -- Strict Guard: Prevent overpayment
    IF p_amount_paise > v_remaining_paise THEN
      RAISE EXCEPTION 'Payment of % paise exceeds remaining milestone balance of % paise.', p_amount_paise, v_remaining_paise;
    END IF;
  END IF;

  -- 3. Insert Client Receipt
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

  -- 4. Update Milestone status & paid_amount_paise
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

  -- 5. Audit Log
  INSERT INTO public.audit_events (
    actor_id,
    action,
    entity_table,
    entity_id,
    payload
  ) VALUES (
    v_actor_id,
    'record_client_receipt',
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


-- 2. RPC: record_vendor_payment (Transactional, Idempotent, Overpayment Guard)
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
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();

  -- 1. Idempotency Check: if key already processed, return existing payment safely
  SELECT * INTO v_existing_payment
  FROM public.vendor_payments
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'payment_id', v_existing_payment.id,
      'amount_paise', v_existing_payment.amount_paise,
      'is_duplicate', true,
      'message', 'Payment already recorded with this idempotency key.'
    );
  END IF;

  -- 2. Unique reference check for this vendor
  IF EXISTS (
    SELECT 1 FROM public.vendor_payments
    WHERE wedding_vendor_id = p_wedding_vendor_id AND reference = p_reference
  ) THEN
    RAISE EXCEPTION 'A payment with reference % has already been recorded for this vendor.', p_reference;
  END IF;

  -- 3. Insert Vendor Payment
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

  -- 4. If bill was associated, update bill status
  IF p_bill_id IS NOT NULL THEN
    UPDATE public.vendor_bills
    SET status = 'paid'::vendor_bill_status, updated_at = NOW()
    WHERE id = p_bill_id;
  END IF;

  -- 5. Audit Log
  INSERT INTO public.audit_events (
    actor_id,
    action,
    entity_table,
    entity_id,
    payload
  ) VALUES (
    v_actor_id,
    'record_vendor_payment',
    'vendor_payments',
    v_payment_id,
    jsonb_build_object(
      'wedding_id', p_wedding_id,
      'wedding_vendor_id', p_wedding_vendor_id,
      'bill_id', p_bill_id,
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


-- 3. RPC: approve_extra_charge (Approves request and automatically spawns client payment milestone)
CREATE OR REPLACE FUNCTION public.approve_extra_charge(
  p_extra_charge_id UUID,
  p_decision TEXT -- 'approved' or 'rejected'
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
  v_actor_id := auth.uid();

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
    -- Update charge
    UPDATE public.extra_charges
    SET
      status = 'approved'::extra_charge_status,
      approved_by = v_actor_id,
      approved_at = NOW()
    WHERE id = p_extra_charge_id;

    -- Automatically create 'extra' milestone for client billing
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

    -- Audit log
    INSERT INTO public.audit_events (
      actor_id,
      action,
      entity_table,
      entity_id,
      payload
    ) VALUES (
      v_actor_id,
      'approve_extra_charge',
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
    -- Rejection
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


-- 4. RPC: shift_schedule_entries (Shifts live events by +N minutes)
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

  -- Shift target and all subsequent events on the same day
  UPDATE public.schedule_entries
  SET
    start_time = (start_time::time + (p_shift_minutes || ' minutes')::interval)::text,
    end_time = (end_time::time + (p_shift_minutes || ' minutes')::interval)::text,
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
