"use server";

import { revalidatePath } from "next/cache";
import { withUser } from "@/lib/db/with-user";
import { getSessionProfile } from "@/lib/auth/session";
import type { VendorCategory } from "@/types/database";

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface QuoteLineInput {
  label: string;
  qty: number;
  unit: string;
  unitPricePaise: number;
  taxPct: number;
  included?: boolean;
  isExtra?: boolean;
}

export interface SubmitQuoteInput {
  rfqId: string;
  vendorId: string;
  extraHourRatePaise: number;
  validUntil?: string;
  notes?: string;
  lines: QuoteLineInput[];
}

/**
 * Creates an RFQ for a category on a wedding
 */
export async function createRfqAction(
  weddingId: string,
  category: VendorCategory,
  vendorIds: string[],
  deadline?: string,
  requirements?: Record<string, unknown>
): Promise<ActionResult<{ rfqId: string }>> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  if (vendorIds.length < 2) {
    return { ok: false, error: "Per agency standards, an RFQ must compare at least 2 vendors." };
  }

  return withUser(session.profile.id, async (sql) => {
    const [rfq] = await sql`
      INSERT INTO public.rfqs (
        wedding_id, category, deadline, requirements, status
      ) VALUES (
        ${weddingId}, ${category}, ${deadline || null},
        ${sql.json(requirements || {})}, 'open'
      )
      RETURNING id
    `;

    revalidatePath(`/admin/vendors`);
    revalidatePath(`/admin/weddings/${weddingId}`);
    return { ok: true, data: { rfqId: rfq.id } };
  });
}

/**
 * Submits structured quote with line items on vendor's behalf
 */
export async function submitVendorQuoteAction(
  input: SubmitQuoteInput
): Promise<ActionResult<{ quoteId: string; totalPaise: number }>> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  let subtotalPaise = 0;
  let taxPaise = 0;

  input.lines.forEach((l) => {
    const lineTotal = Math.round(l.qty * l.unitPricePaise);
    const lineTax = Math.round((lineTotal * (l.taxPct || 0)) / 100);
    subtotalPaise += lineTotal;
    taxPaise += lineTax;
  });

  const totalPaise = subtotalPaise + taxPaise;

  return withUser(session.profile.id, async (sql) => {
    const [quote] = await sql`
      INSERT INTO public.vendor_quotes (
        rfq_id, vendor_id, subtotal_paise, tax_paise, total_paise,
        extra_hour_rate_paise, valid_until, notes, status
      ) VALUES (
        ${input.rfqId}, ${input.vendorId}, ${subtotalPaise}, ${taxPaise}, ${totalPaise},
        ${input.extraHourRatePaise}, ${input.validUntil || null}, ${input.notes || null}, 'submitted'
      )
      RETURNING id
    `;

    for (let i = 0; i < input.lines.length; i++) {
      const l = input.lines[i];
      const lineTotal = Math.round(l.qty * l.unitPricePaise);
      const lineTax = Math.round((lineTotal * (l.taxPct || 0)) / 100);

      await sql`
        INSERT INTO public.quote_lines (
          quote_id, label, qty, unit, unit_price_paise, tax_pct, total_paise, included, is_extra, display_order
        ) VALUES (
          ${quote.id}, ${l.label}, ${l.qty}, ${l.unit}, ${l.unitPricePaise},
          ${l.taxPct}, ${lineTotal + lineTax}, ${l.included ?? true}, ${l.isExtra ?? false}, ${i + 1}
        )
      `;
    }

    revalidatePath(`/admin/vendors/compare/${input.rfqId}`);
    return { ok: true, data: { quoteId: quote.id, totalPaise } };
  });
}

/**
 * Transactionally selects winning quote via PostgreSQL select_quote RPC
 */
export async function selectQuoteAction(
  quoteId: string
): Promise<ActionResult<{ weddingVendorId: string; agreedAmountPaise: number }>> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  return withUser(session.profile.id, async (sql) => {
    const [row] = await sql`
      SELECT public.select_quote(${quoteId}) as res
    `;

    const result = row?.res as {
      ok: boolean;
      wedding_vendor_id: string;
      agreed_amount_paise: number;
      rfq_id: string;
    };

    revalidatePath("/admin/vendors");
    revalidatePath(`/admin/vendors/compare/${result.rfq_id}`);
    return {
      ok: true,
      data: {
        weddingVendorId: result.wedding_vendor_id,
        agreedAmountPaise: result.agreed_amount_paise,
      },
    };
  });
}
