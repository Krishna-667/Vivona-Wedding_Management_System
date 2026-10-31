-- ==============================================================================
-- Migration: 009_more_rpcs.sql
-- Extra RPCs: approve_extra_charge, shift_schedule_entries
-- ==============================================================================

-- 1. RPC: approve_extra_charge
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

-- 2. RPC: shift_schedule_entries
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
