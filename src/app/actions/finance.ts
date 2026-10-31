"use server";

import { revalidatePath } from "next/cache";
import { withUser } from "@/lib/db/with-user";
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

    return withUser(session.profile.id, async (sql) => {
      const [row] = await sql`
        SELECT public.record_client_receipt(
          ${validated.weddingId},
          ${validated.milestoneId || null},
          ${amountPaise},
          ${validated.paymentMethod},
          ${validated.reference},
          ${validated.idempotencyKey},
          ${validated.notes || null}
        ) as res
      `;

      revalidatePath(`/admin/weddings/${validated.weddingId}`);
      revalidatePath(`/admin/weddings/${validated.weddingId}/finance`);
      return { ok: true, data: row?.res };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record client receipt.";
    return { ok: false, error: message };
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

    return withUser(session.profile.id, async (sql) => {
      const [row] = await sql`
        SELECT public.record_vendor_payment(
          ${validated.weddingId},
          ${validated.weddingVendorId},
          ${validated.billId || null},
          ${amountPaise},
          ${validated.paymentMethod},
          ${validated.reference},
          ${validated.idempotencyKey},
          ${validated.notes || null}
        ) as res
      `;

      revalidatePath(`/admin/weddings/${validated.weddingId}`);
      revalidatePath(`/admin/weddings/${validated.weddingId}/finance`);
      return { ok: true, data: row?.res };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record vendor payment.";
    return { ok: false, error: message };
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

    return withUser(session.profile.id, async (sql) => {
      const [row] = await sql`
        SELECT public.approve_extra_charge(${extraChargeId}, ${decision}) as res
      `;

      const result = row?.res as { ok: boolean; status: string; milestone_id?: string };

      revalidatePath("/admin/analytics");
      return { ok: true, data: result };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to decide extra charge.";
    return { ok: false, error: message };
  }
}
