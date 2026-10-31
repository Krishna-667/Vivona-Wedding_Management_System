"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";
import {
  RecordClientReceiptSchema,
  RecordVendorPaymentSchema,
  DecideExtraChargeSchema,
  type RecordClientReceiptInput,
  type RecordVendorPaymentInput,
} from "@/lib/validation/finance";

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Record a client payment milestone receipt (Idempotent + Overpayment Guard)
 */
export async function recordClientReceiptAction(
  input: RecordClientReceiptInput
): Promise<ActionResult> {
  try {
    const session = await getSessionProfile();
    if (!session || session.profile.role !== "admin") {
      return { ok: false, error: "Unauthorized. Admin role required." };
    }

    const validated = RecordClientReceiptSchema.parse(input);
    const amountPaise = Math.round(validated.amountRupees * 100);
    const admin = createAdminClient();

    // Try PostgreSQL RPC first
    const { data, error } = await admin.rpc("record_client_receipt", {
      p_wedding_id: validated.weddingId,
      p_milestone_id: validated.milestoneId || null,
      p_amount_paise: amountPaise,
      p_payment_method: validated.paymentMethod,
      p_reference: validated.reference,
      p_idempotency_key: validated.idempotencyKey,
      p_notes: validated.notes || null,
    });

    if (error) {
      console.error("[record_client_receipt RPC error]", error);
      // Fallback: Safe transactional application logic
      // 1. Idempotency check
      const { data: existing } = await admin
        .from("client_receipts")
        .select("id, amount_paise")
        .eq("idempotency_key", validated.idempotencyKey)
        .maybeSingle();

      if (existing) {
        return { ok: true, data: { isDuplicate: true, receiptId: existing.id } };
      }

      // 2. Overpayment check on milestone
      if (validated.milestoneId) {
        const { data: milestone } = await admin
          .from("payment_milestones")
          .select("amount_paise, paid_amount_paise")
          .eq("id", validated.milestoneId)
          .single();

        if (milestone) {
          const remaining = BigInt(milestone.amount_paise) - BigInt(milestone.paid_amount_paise);
          if (BigInt(amountPaise) > remaining) {
            return {
              ok: false,
              error: `Payment of ₹${validated.amountRupees} exceeds milestone balance of ₹${Number(remaining) / 100}.`,
            };
          }
        }
      }

      // 3. Insert receipt
      const { data: receipt, error: insertErr } = await admin
        .from("client_receipts")
        .insert({
          wedding_id: validated.weddingId,
          milestone_id: validated.milestoneId || null,
          amount_paise: amountPaise,
          payment_method: validated.paymentMethod,
          reference: validated.reference,
          idempotency_key: validated.idempotencyKey,
          notes: validated.notes || null,
        })
        .select("id")
        .single();

      if (insertErr || !receipt) throw insertErr;

      // 4. Update milestone
      if (validated.milestoneId) {
        const { data: m } = await admin
          .from("payment_milestones")
          .select("amount_paise, paid_amount_paise")
          .eq("id", validated.milestoneId)
          .single();

        if (m) {
          const newPaid = BigInt(m.paid_amount_paise) + BigInt(amountPaise);
          const isFull = newPaid >= BigInt(m.amount_paise);
          await admin
            .from("payment_milestones")
            .update({
              paid_amount_paise: Number(newPaid),
              status: isFull ? "paid" : "partially_paid",
              updated_at: new Date().toISOString(),
            })
            .eq("id", validated.milestoneId);
        }
      }

      revalidatePath(`/admin/weddings/${validated.weddingId}`);
      revalidatePath(`/admin/weddings/${validated.weddingId}/finance`);
      return { ok: true, data: { receiptId: receipt.id, isDuplicate: false } };
    }

    revalidatePath(`/admin/weddings/${validated.weddingId}`);
    revalidatePath(`/admin/weddings/${validated.weddingId}/finance`);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to record client receipt." };
  }
}

/**
 * Record a vendor bill payment (Idempotent + Duplicate Reference Guard)
 */
export async function recordVendorPaymentAction(
  input: RecordVendorPaymentInput
): Promise<ActionResult> {
  try {
    const session = await getSessionProfile();
    if (!session || session.profile.role !== "admin") {
      return { ok: false, error: "Unauthorized. Admin role required." };
    }

    const validated = RecordVendorPaymentSchema.parse(input);
    const amountPaise = Math.round(validated.amountRupees * 100);
    const admin = createAdminClient();

    // Call RPC
    const { data, error } = await admin.rpc("record_vendor_payment", {
      p_wedding_id: validated.weddingId,
      p_wedding_vendor_id: validated.weddingVendorId,
      p_bill_id: validated.billId || null,
      p_amount_paise: amountPaise,
      p_payment_method: validated.paymentMethod,
      p_reference: validated.reference,
      p_idempotency_key: validated.idempotencyKey,
      p_notes: validated.notes || null,
    });

    if (error) {
      console.error("[record_vendor_payment RPC error]", error);
      // Fallback
      const { data: existing } = await admin
        .from("vendor_payments")
        .select("id")
        .eq("idempotency_key", validated.idempotencyKey)
        .maybeSingle();

      if (existing) {
        return { ok: true, data: { isDuplicate: true, paymentId: existing.id } };
      }

      // Check unique reference for vendor
      const { data: dupRef } = await admin
        .from("vendor_payments")
        .select("id")
        .eq("wedding_vendor_id", validated.weddingVendorId)
        .eq("reference", validated.reference)
        .maybeSingle();

      if (dupRef) {
        return {
          ok: false,
          error: `Payment reference ${validated.reference} has already been recorded for this vendor.`,
        };
      }

      const { data: pay, error: insErr } = await admin
        .from("vendor_payments")
        .insert({
          wedding_id: validated.weddingId,
          wedding_vendor_id: validated.weddingVendorId,
          bill_id: validated.billId || null,
          amount_paise: amountPaise,
          payment_method: validated.paymentMethod,
          reference: validated.reference,
          idempotency_key: validated.idempotencyKey,
          notes: validated.notes || null,
        })
        .select("id")
        .single();

      if (insErr || !pay) throw insErr;

      if (validated.billId) {
        await admin
          .from("vendor_bills")
          .update({ status: "paid", updated_at: new Date().toISOString() })
          .eq("id", validated.billId);
      }

      revalidatePath(`/admin/weddings/${validated.weddingId}`);
      revalidatePath(`/admin/weddings/${validated.weddingId}/finance`);
      return { ok: true, data: { paymentId: pay.id, isDuplicate: false } };
    }

    revalidatePath(`/admin/weddings/${validated.weddingId}`);
    revalidatePath(`/admin/weddings/${validated.weddingId}/finance`);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to record vendor payment." };
  }
}

/**
 * Approve or Reject Extra Charge Request
 */
export async function decideExtraChargeAction(
  extraChargeId: string,
  decision: "approved" | "rejected"
): Promise<ActionResult> {
  try {
    const session = await getSessionProfile();
    if (!session || session.profile.role !== "admin") {
      return { ok: false, error: "Unauthorized. Admin role required." };
    }

    DecideExtraChargeSchema.parse({ extraChargeId, decision });
    const admin = createAdminClient();

    const { data, error } = await admin.rpc("approve_extra_charge", {
      p_extra_charge_id: extraChargeId,
      p_decision: decision,
    });

    if (error) {
      console.error("[approve_extra_charge RPC error]", error);
      // Fallback
      const { data: charge } = await admin
        .from("extra_charges")
        .select("*")
        .eq("id", extraChargeId)
        .single();

      if (!charge) return { ok: false, error: "Charge not found." };

      if (decision === "approved") {
        await admin
          .from("extra_charges")
          .update({
            status: "approved",
            approved_by: session.user.id,
            approved_at: new Date().toISOString(),
          })
          .eq("id", extraChargeId);

        // Add milestone
        await admin.from("payment_milestones").insert({
          wedding_id: charge.wedding_id,
          kind: "extra",
          title: `Extra Approved: ${charge.title} (${charge.qty} units)`,
          due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          percentage: 0,
          amount_paise: charge.total_paise,
          paid_amount_paise: 0,
          status: "pending",
        });
      } else {
        await admin
          .from("extra_charges")
          .update({
            status: "rejected",
            approved_by: session.user.id,
            approved_at: new Date().toISOString(),
          })
          .eq("id", extraChargeId);
      }

      revalidatePath(`/admin/weddings/${charge.wedding_id}`);
      revalidatePath(`/admin/weddings/${charge.wedding_id}/finance`);
      return { ok: true, data: { decision } };
    }

    revalidatePath("/admin/analytics");
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to decide extra charge." };
  }
}
