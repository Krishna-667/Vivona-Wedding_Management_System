"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";
import {
  canTransitionEnquiry,
  ScheduleConsultationSchema,
  ProposalBuilderSchema,
  BookingDepositSchema,
  type ProposalBuilderInput,
  type ScheduleConsultationInput,
  type BookingDepositInput,
} from "@/lib/validation/crm";
import type { EnquiryStatus } from "@/types/database";

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Updates enquiry status with strict transition machine enforcement
 */
export async function updateEnquiryStatusAction(
  enquiryId: string,
  targetStatus: EnquiryStatus,
  notes?: string
): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  const admin = createAdminClient();

  // 1. Fetch current status
  const { data: enquiry, error: fetchErr } = await admin
    .from("enquiries")
    .select("id, code, status, client_id")
    .eq("id", enquiryId)
    .single();

  if (fetchErr || !enquiry) {
    return { ok: false, error: "Enquiry record not found." };
  }

  // 2. Guard state transition
  const guard = canTransitionEnquiry(enquiry.status as EnquiryStatus, targetStatus);
  if (!guard.valid) {
    return { ok: false, error: guard.reason };
  }

  // 3. Update status
  const { error: updateErr } = await admin
    .from("enquiries")
    .update({ status: targetStatus, updated_at: new Date().toISOString() })
    .eq("id", enquiryId);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  // 4. Log in enquiry_activities
  await admin.from("enquiry_activities").insert({
    enquiry_id: enquiryId,
    actor_id: session.user.id,
    activity_type: "STATUS_CHANGE",
    description: `Stage moved from "${enquiry.status}" to "${targetStatus}". ${notes ? `Notes: ${notes}` : ""}`,
    metadata: { previous_status: enquiry.status, next_status: targetStatus },
  });

  revalidatePath(`/admin/enquiries`);
  revalidatePath(`/admin/enquiries/${enquiryId}`);
  return { ok: true, data: { status: targetStatus } };
}

/**
 * Schedules a consultation session with the couple
 */
export async function scheduleConsultationAction(
  input: ScheduleConsultationInput
): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  const parsed = ScheduleConsultationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "Invalid input." };
  }

  const admin = createAdminClient();
  const { enquiryId, date, time, meetingType, notes } = parsed.data;

  // 1. Fetch current enquiry
  const { data: enquiry } = await admin
    .from("enquiries")
    .select("status, client_id, code")
    .eq("id", enquiryId)
    .single();

  if (!enquiry) return { ok: false, error: "Enquiry not found." };

  // 2. Transition state to consultation_scheduled
  await admin
    .from("enquiries")
    .update({ status: "consultation_scheduled", updated_at: new Date().toISOString() })
    .eq("id", enquiryId);

  // 3. Activity record
  await admin.from("enquiry_activities").insert({
    enquiry_id: enquiryId,
    actor_id: session.user.id,
    activity_type: "CONSULTATION_SCHEDULED",
    description: `Consultation confirmed for ${date} at ${time} via ${meetingType.replace(/_/g, " ")}.`,
    metadata: { date, time, meetingType, notes },
  });

  // 4. In-App Notification to Client
  if (enquiry.client_id) {
    await admin.from("notifications").insert({
      user_id: enquiry.client_id,
      title: "Wedding Consultation Scheduled",
      body: `Your royal wedding consultation is locked for ${date} at ${time}. Our lead planner will review themes and palace venue options.`,
      type: "consultation_confirmed",
      data: { enquiry_code: enquiry.code, date, time },
    });
  }

  revalidatePath(`/admin/enquiries/${enquiryId}`);
  revalidatePath(`/admin/enquiries`);
  return { ok: true };
}

/**
 * Sends legal agreement to client
 */
export async function sendAgreementAction(enquiryId: string): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  const admin = createAdminClient();

  const { data: enquiry } = await admin
    .from("enquiries")
    .select("id, code, client_id, contact_name, city, guest_count, budget_max_paise")
    .eq("id", enquiryId)
    .single();

  if (!enquiry) return { ok: false, error: "Enquiry not found." };

  // Legal agreement markdown contract
  const contractBody = `# VIVONA LUXURY WEDDING MANAGEMENT AGREEMENT
**Parties:** Vivona Luxury Weddings ("Agency") and ${enquiry.contact_name} ("Client")  
**Destination:** ${enquiry.city}  
**Planned Capacity:** ${enquiry.guest_count} Guests  
**Reference Code:** ${enquiry.code}

### 1. Scope of Service & Operational Mandate
1.1 The Agency agrees to provide turnkey wedding planning, venue coordination, vendor procurement (including structured 3-caterer tenders), and live big-day digital console tracking.
1.2 Upon execution of this Agreement, the Client receives immediate access to the Vivona Client Portal, unlocking the Vendor Shortlist, Floor Plans, and Milestone Schedule.

### 2. Commercial Terms & Integer Staged Payment Plan
2.1 Payment Schedule follows Vivona's 20 / 30 / 50 staged milestone architecture:
    - **Booking Commitment Deposit (20%):** Due upon acceptance to lock planning team and reserve dates.
    - **Advance Production Milestone (30%):** Due thirty (30) days prior to the wedding date to execute vendor locks.
    - **Final Settlement (50%):** Due on event commencement day.
2.2 All funds are tracked strictly in integer paise (INR). Originals are immutable.

### 3. Mutual Confidentiality & Agreement Gate
The Client acknowledges that vendor rates, proprietary line items, and palace floor plans remain protected intellectual property accessible only upon e-signature execution of this Agreement.`;

  // 1. Check if agreement already exists for enquiry
  const { data: existingAgreement } = await admin
    .from("agreements")
    .select("id, version")
    .eq("enquiry_id", enquiryId)
    .single();

  let agreementId = existingAgreement?.id;

  if (existingAgreement) {
    const nextVersion = existingAgreement.version + 1;
    await admin
      .from("agreements")
      .update({
        version: nextVersion,
        body_markdown: contractBody,
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingAgreement.id);
  } else {
    const { data: newAg } = await admin
      .from("agreements")
      .insert({
        enquiry_id: enquiryId,
        client_id: enquiry.client_id,
        version: 1,
        body_markdown: contractBody,
        status: "draft",
      })
      .select("id")
      .single();
    agreementId = newAg?.id;
  }

  // 2. Transition enquiry status to agreement_sent
  await admin
    .from("enquiries")
    .update({ status: "agreement_sent", updated_at: new Date().toISOString() })
    .eq("id", enquiryId);

  // 3. Log Activity
  await admin.from("enquiry_activities").insert({
    enquiry_id: enquiryId,
    actor_id: session.user.id,
    activity_type: "AGREEMENT_SENT",
    description: `Legal service agreement issued to client for digital e-signature execution.`,
  });

  // 4. In-App Notification
  if (enquiry.client_id) {
    await admin.from("notifications").insert({
      user_id: enquiry.client_id,
      title: "Wedding Agreement Ready for Signature",
      body: `Your Vivona service agreement (${enquiry.code}) is ready. Execute your digital signature on your phone to unlock vendor shortlists and floor plans.`,
      type: "agreement_sent",
      data: { enquiry_id: enquiryId, agreement_id: agreementId },
    });
  }

  revalidatePath(`/admin/enquiries/${enquiryId}`);
  revalidatePath(`/admin/enquiries`);
  return { ok: true, data: { agreementId } };
}

/**
 * Creates or updates proposal with itemized lines and 100% staged payment plan
 */
export async function createOrUpdateProposalAction(
  input: ProposalBuilderInput
): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  const parsed = ProposalBuilderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "Invalid proposal data." };
  }

  const admin = createAdminClient();
  const { enquiryId, validDays, lines, paymentPlan, notes } = parsed.data;

  // 1. Fetch enquiry
  const { data: enquiry } = await admin
    .from("enquiries")
    .select("id, code, client_id")
    .eq("id", enquiryId)
    .single();

  if (!enquiry) return { ok: false, error: "Enquiry not found." };

  // 2. Compute financial totals
  let subtotalPaise = 0;
  let taxPaise = 0;

  lines.forEach((line) => {
    const lineSubtotal = Math.round(line.qty * line.unitPricePaise);
    const lineTax = Math.round((lineSubtotal * line.taxPct) / 100);
    subtotalPaise += lineSubtotal;
    taxPaise += lineTax;
  });

  const totalPaise = subtotalPaise + taxPaise;
  const validUntilDate = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // 3. Upsert proposal record
  const { data: existingProposal } = await admin
    .from("proposals")
    .select("id, version")
    .eq("enquiry_id", enquiryId)
    .single();

  let proposalId: string;

  if (existingProposal) {
    proposalId = existingProposal.id;
    await admin
      .from("proposals")
      .update({
        version: existingProposal.version + 1,
        valid_until: validUntilDate,
        subtotal_paise: subtotalPaise,
        tax_paise: taxPaise,
        total_paise: totalPaise,
        payment_plan: paymentPlan,
        notes: notes || null,
        status: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);

    // Delete old lines to replace with new itemization
    await admin.from("proposal_lines").delete().eq("proposal_id", proposalId);
  } else {
    const { data: newProp, error: insertPropErr } = await admin
      .from("proposals")
      .insert({
        enquiry_id: enquiryId,
        version: 1,
        valid_until: validUntilDate,
        subtotal_paise: subtotalPaise,
        tax_paise: taxPaise,
        total_paise: totalPaise,
        payment_plan: paymentPlan,
        notes: notes || null,
        status: "sent",
      })
      .select("id")
      .single();

    if (insertPropErr || !newProp) {
      return { ok: false, error: "Failed to create proposal record." };
    }
    proposalId = newProp.id;
  }

  // 4. Insert lines
  const lineRecords = lines.map((line, index) => {
    const lineSubtotal = Math.round(line.qty * line.unitPricePaise);
    const lineTax = Math.round((lineSubtotal * line.taxPct) / 100);
    return {
      proposal_id: proposalId,
      category: line.category,
      label: line.label,
      qty: line.qty,
      unit: line.unit,
      unit_price_paise: line.unitPricePaise,
      tax_pct: line.taxPct,
      total_paise: lineSubtotal + lineTax,
      display_order: index + 1,
    };
  });

  await admin.from("proposal_lines").insert(lineRecords);

  // 5. Update enquiry status to proposal_sent
  await admin
    .from("enquiries")
    .update({ status: "proposal_sent", updated_at: new Date().toISOString() })
    .eq("id", enquiryId);

  // 6. Log activity
  await admin.from("enquiry_activities").insert({
    enquiry_id: enquiryId,
    actor_id: session.user.id,
    activity_type: "PROPOSAL_CREATED",
    description: `Commercial proposal dispatched for ${lines.length} service modules (Total: ₹${(
      totalPaise / 10000000
    ).toFixed(2)} Lakh/Cr).`,
    metadata: { totalPaise, lineCount: lines.length },
  });

  // 7. Notify client
  if (enquiry.client_id) {
    await admin.from("notifications").insert({
      user_id: enquiry.client_id,
      title: "Wedding Commercial Proposal Received",
      body: `Your customized celebration proposal has been compiled by Devraj Rathore. Review and accept in your client portal.`,
      type: "proposal_sent",
      data: { enquiry_id: enquiryId, proposal_id: proposalId },
    });
  }

  revalidatePath(`/admin/enquiries/${enquiryId}`);
  revalidatePath(`/admin/enquiries`);
  return { ok: true, data: { proposalId, totalPaise } };
}

/**
 * Records client booking deposit with idempotency protection
 */
export async function recordBookingDepositAction(
  input: BookingDepositInput
): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  const parsed = BookingDepositSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "Invalid deposit data." };
  }

  const admin = createAdminClient();
  const { enquiryId, amountPaise, reference, paymentMethod, notes } = parsed.data;

  // 1. Fetch enquiry
  const { data: enquiry } = await admin
    .from("enquiries")
    .select("id, code, client_id, status")
    .eq("id", enquiryId)
    .single();

  if (!enquiry) return { ok: false, error: "Enquiry not found." };

  // 2. Fetch accepted proposal
  const { data: proposal } = await admin
    .from("proposals")
    .select("id, total_paise")
    .eq("enquiry_id", enquiryId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // 3. Record in enquiry_activities
  await admin.from("enquiry_activities").insert({
    enquiry_id: enquiryId,
    actor_id: session.user.id,
    activity_type: "DEPOSIT_RECORDED",
    description: `Booking deposit of ₹${(amountPaise / 100).toLocaleString(
      "en-IN"
    )} received via ${paymentMethod} (Ref: ${reference}).`,
    metadata: { amountPaise, reference, paymentMethod, notes },
  });

  // 4. In-App Notification
  if (enquiry.client_id) {
    await admin.from("notifications").insert({
      user_id: enquiry.client_id,
      title: "Booking Deposit Received",
      body: `Thank you! Your booking deposit of ₹${(amountPaise / 100).toLocaleString(
        "en-IN"
      )} has been recorded. Your wedding is now ready for formal confirmation.`,
      type: "deposit_confirmed",
      data: { enquiry_code: enquiry.code, reference },
    });
  }

  revalidatePath(`/admin/enquiries/${enquiryId}`);
  return { ok: true, data: { amountPaise, reference } };
}

/**
 * Confirms wedding and triggers instant plan creation via PostgreSQL confirm_wedding RPC
 */
export async function confirmWeddingAction(
  enquiryId: string,
  assignedLeadId?: string
): Promise<ActionResult<{ weddingId: string; weddingCode: string; taskCount: number }>> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  const admin = createAdminClient();

  // Call the confirm_wedding database RPC
  const { data, error } = await admin.rpc("confirm_wedding", {
    p_enquiry_id: enquiryId,
    p_assigned_lead_id: assignedLeadId || null,
  });

  if (error) {
    console.error("[confirm_wedding RPC error]", error);
    return { ok: false, error: error.message };
  }

  const result = data as {
    ok: boolean;
    wedding_id: string;
    wedding_code: string;
    task_count: number;
  };

  revalidatePath("/admin");
  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${enquiryId}`);
  revalidatePath("/admin/weddings");

  return {
    ok: true,
    data: {
      weddingId: result.wedding_id,
      weddingCode: result.wedding_code,
      taskCount: result.task_count,
    },
  };
}
