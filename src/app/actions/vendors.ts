"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const admin = createAdminClient();

  // 1. Create RFQ
  const { data: rfq, error: rfqErr } = await admin
    .from("rfqs")
    .insert({
      wedding_id: weddingId,
      category,
      deadline: deadline || null,
      requirements: requirements || {},
      status: "open",
    })
    .select("id")
    .single();

  if (rfqErr || !rfq) {
    return { ok: false, error: rfqErr?.message || "Failed to create RFQ." };
  }

  revalidatePath(`/admin/vendors`);
  revalidatePath(`/admin/weddings/${weddingId}`);
  return { ok: true, data: { rfqId: rfq.id } };
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

  const admin = createAdminClient();

  // Compute totals
  let subtotalPaise = 0;
  let taxPaise = 0;

  input.lines.forEach((l) => {
    const lineTotal = Math.round(l.qty * l.unitPricePaise);
    const lineTax = Math.round((lineTotal * (l.taxPct || 0)) / 100);
    subtotalPaise += lineTotal;
    taxPaise += lineTax;
  });

  const totalPaise = subtotalPaise + taxPaise;

  // 1. Insert Quote
  const { data: quote, error: quoteErr } = await admin
    .from("vendor_quotes")
    .insert({
      rfq_id: input.rfqId,
      vendor_id: input.vendorId,
      subtotal_paise: subtotalPaise,
      tax_paise: taxPaise,
      total_paise: totalPaise,
      extra_hour_rate_paise: input.extraHourRatePaise,
      valid_until: input.validUntil || null,
      notes: input.notes || null,
      status: "submitted",
    })
    .select("id")
    .single();

  if (quoteErr || !quote) {
    return { ok: false, error: quoteErr?.message || "Failed to record quote." };
  }

  // 2. Insert Quote Lines
  const lineRecords = input.lines.map((l, index) => ({
    quote_id: quote.id,
    label: l.label,
    qty: l.qty,
    unit: l.unit,
    unit_price_paise: l.unitPricePaise,
    tax_pct: l.taxPct,
    total_paise: Math.round(l.qty * l.unitPricePaise) + Math.round((l.qty * l.unitPricePaise * (l.taxPct || 0)) / 100),
    included: l.included ?? true,
    is_extra: l.isExtra ?? false,
    display_order: index + 1,
  }));

  await admin.from("quote_lines").insert(lineRecords);

  revalidatePath(`/admin/vendors/compare/${input.rfqId}`);
  return { ok: true, data: { quoteId: quote.id, totalPaise } };
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

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("select_quote", {
    p_quote_id: quoteId,
  });

  if (error) {
    console.error("[select_quote RPC error]", error);
    return { ok: false, error: error.message };
  }

  const result = data as {
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
}
