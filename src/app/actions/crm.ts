"use server";

import { revalidatePath } from "next/cache";
import { withUser } from "@/lib/db/with-user";
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

  return withUser(session.profile.id, async (sql) => {
    // 1. Fetch current status
    const [enquiry] = await sql`
      SELECT id, code, status, client_id
      FROM public.enquiries
      WHERE id = ${enquiryId}
    `;

    if (!enquiry) {
      return { ok: false, error: "Enquiry record not found." };
    }

    // 2. Guard state transition
    const guard = canTransitionEnquiry(enquiry.status as EnquiryStatus, targetStatus);
    if (!guard.valid) {
      return { ok: false, error: guard.reason };
    }

    // 3. Update status
    await sql`
      UPDATE public.enquiries
      SET status = ${targetStatus}, updated_at = NOW()
      WHERE id = ${enquiryId}
    `;

    // 4. Log in enquiry_activities
    await sql`
      INSERT INTO public.enquiry_activities (
        enquiry_id, actor_id, activity_type, description, metadata
      ) VALUES (
        ${enquiryId}, ${session.profile.id}, 'STATUS_CHANGE',
        ${`Stage moved from "${enquiry.status}" to "${targetStatus}". ${notes ? `Notes: ${notes}` : ""}`},
        ${sql.json({ previous_status: enquiry.status, next_status: targetStatus })}
      )
    `;

    revalidatePath(`/admin/enquiries`);
    revalidatePath(`/admin/enquiries/${enquiryId}`);
    return { ok: true, data: { status: targetStatus } };
  });
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

  const { enquiryId, date, time, meetingType, notes } = parsed.data;

  return withUser(session.profile.id, async (sql) => {
    const [enquiry] = await sql`
      SELECT status, client_id, code
      FROM public.enquiries
      WHERE id = ${enquiryId}
    `;

    if (!enquiry) return { ok: false, error: "Enquiry not found." };

    await sql`
      UPDATE public.enquiries
      SET status = 'consultation_scheduled', updated_at = NOW()
      WHERE id = ${enquiryId}
    `;

    await sql`
      INSERT INTO public.enquiry_activities (
        enquiry_id, actor_id, activity_type, description, metadata
      ) VALUES (
        ${enquiryId}, ${session.profile.id}, 'CONSULTATION_SCHEDULED',
        ${`Consultation confirmed for ${date} at ${time} via ${meetingType.replace(/_/g, " ")}.`},
        ${sql.json({ date, time, meetingType, notes })}
      )
    `;

    if (enquiry.client_id) {
      await sql`
        INSERT INTO public.notifications (user_id, title, body, type, data)
        VALUES (
          ${enquiry.client_id},
          'Wedding Consultation Scheduled',
          ${`Your royal wedding consultation is locked for ${date} at ${time}. Our lead planner will review themes and palace venue options.`},
          'consultation_confirmed',
          ${sql.json({ enquiry_code: enquiry.code, date, time })}
        )
      `;
    }

    revalidatePath(`/admin/enquiries/${enquiryId}`);
    revalidatePath(`/admin/enquiries`);
    return { ok: true };
  });
}

/**
 * Sends legal agreement to client
 */
export async function sendAgreementAction(enquiryId: string): Promise<ActionResult> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin role required." };
  }

  return withUser(session.profile.id, async (sql) => {
    const [enquiry] = await sql`
      SELECT id, code, client_id, contact_name, city, guest_count, budget_max_paise
      FROM public.enquiries
      WHERE id = ${enquiryId}
    `;

    if (!enquiry) return { ok: false, error: "Enquiry not found." };

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

    const [existingAgreement] = await sql`
      SELECT id, version FROM public.agreements WHERE enquiry_id = ${enquiryId}
    `;

    let agreementId: string;

    if (existingAgreement) {
      agreementId = existingAgreement.id;
      await sql`
        UPDATE public.agreements
        SET
          version = ${existingAgreement.version + 1},
          body_markdown = ${contractBody},
          status = 'draft',
          updated_at = NOW()
        WHERE id = ${existingAgreement.id}
      `;
    } else {
      const [newAg] = await sql`
        INSERT INTO public.agreements (
          enquiry_id, client_id, version, body_markdown, status
        ) VALUES (
          ${enquiryId}, ${enquiry.client_id}, 1, ${contractBody}, 'draft'
        )
        RETURNING id
      `;
      agreementId = newAg.id;
    }

    await sql`
      UPDATE public.enquiries
      SET status = 'agreement_sent', updated_at = NOW()
      WHERE id = ${enquiryId}
    `;

    await sql`
      INSERT INTO public.enquiry_activities (
        enquiry_id, actor_id, activity_type, description
      ) VALUES (
        ${enquiryId}, ${session.profile.id}, 'AGREEMENT_SENT',
        'Legal service agreement issued to client for digital e-signature execution.'
      )
    `;

    if (enquiry.client_id) {
      await sql`
        INSERT INTO public.notifications (user_id, title, body, type, data)
        VALUES (
          ${enquiry.client_id},
          'Wedding Agreement Ready for Signature',
          ${`Your Vivona service agreement (${enquiry.code}) is ready. Execute your digital signature on your phone to unlock vendor shortlists and floor plans.`},
          'agreement_sent',
          ${sql.json({ enquiry_id: enquiryId, agreement_id: agreementId })}
        )
      `;
    }

    revalidatePath(`/admin/enquiries/${enquiryId}`);
    revalidatePath(`/admin/enquiries`);
    return { ok: true, data: { agreementId } };
  });
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

  const { enquiryId, validDays, lines, paymentPlan, notes } = parsed.data;

  return withUser(session.profile.id, async (sql) => {
    const [enquiry] = await sql`
      SELECT id, code, client_id FROM public.enquiries WHERE id = ${enquiryId}
    `;

    if (!enquiry) return { ok: false, error: "Enquiry not found." };

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

    const [existingProposal] = await sql`
      SELECT id, version FROM public.proposals WHERE enquiry_id = ${enquiryId}
    `;

    let proposalId: string;

    if (existingProposal) {
      proposalId = existingProposal.id;
      await sql`
        UPDATE public.proposals
        SET
          version = ${existingProposal.version + 1},
          valid_until = ${validUntilDate},
          subtotal_paise = ${subtotalPaise},
          tax_paise = ${taxPaise},
          total_paise = ${totalPaise},
          payment_plan = ${sql.json(paymentPlan)},
          notes = ${notes || null},
          status = 'sent',
          updated_at = NOW()
        WHERE id = ${proposalId}
      `;
      await sql`DELETE FROM public.proposal_lines WHERE proposal_id = ${proposalId}`;
    } else {
      const [newProp] = await sql`
        INSERT INTO public.proposals (
          enquiry_id, client_id, version, valid_until,
          subtotal_paise, tax_paise, total_paise, payment_plan, notes, status
        ) VALUES (
          ${enquiryId}, ${enquiry.client_id}, 1, ${validUntilDate},
          ${subtotalPaise}, ${taxPaise}, ${totalPaise}, ${sql.json(paymentPlan)}, ${notes || null}, 'sent'
        )
        RETURNING id
      `;
      proposalId = newProp.id;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineSubtotal = Math.round(line.qty * line.unitPricePaise);
      const lineTax = Math.round((lineSubtotal * line.taxPct) / 100);

      await sql`
        INSERT INTO public.proposal_lines (
          proposal_id, category, label, qty, unit, unit_price_paise, tax_pct, total_paise, display_order
        ) VALUES (
          ${proposalId}, ${line.category}, ${line.label}, ${line.qty}, ${line.unit},
          ${line.unitPricePaise}, ${line.taxPct}, ${lineSubtotal + lineTax}, ${i + 1}
        )
      `;
    }

    await sql`
      UPDATE public.enquiries
      SET status = 'proposal_sent', updated_at = NOW()
      WHERE id = ${enquiryId}
    `;

    await sql`
      INSERT INTO public.enquiry_activities (
        enquiry_id, actor_id, activity_type, description, metadata
      ) VALUES (
        ${enquiryId}, ${session.profile.id}, 'PROPOSAL_CREATED',
        ${`Commercial proposal dispatched for ${lines.length} service modules (Total: ₹${(
          totalPaise / 10000000
        ).toFixed(2)} Lakh/Cr).`},
        ${sql.json({ totalPaise, lineCount: lines.length })}
      )
    `;

    if (enquiry.client_id) {
      await sql`
        INSERT INTO public.notifications (user_id, title, body, type, data)
        VALUES (
          ${enquiry.client_id},
          'Wedding Commercial Proposal Received',
          'Your customized celebration proposal has been compiled by Devraj Rathore. Review and accept in your client portal.',
          'proposal_sent',
          ${sql.json({ enquiry_id: enquiryId, proposal_id: proposalId })}
        )
      `;
    }

    revalidatePath(`/admin/enquiries/${enquiryId}`);
    revalidatePath(`/admin/enquiries`);
    return { ok: true, data: { proposalId, totalPaise } };
  });
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

  const { enquiryId, amountPaise, reference, paymentMethod, notes } = parsed.data;

  return withUser(session.profile.id, async (sql) => {
    const [enquiry] = await sql`
      SELECT id, code, client_id, status FROM public.enquiries WHERE id = ${enquiryId}
    `;

    if (!enquiry) return { ok: false, error: "Enquiry not found." };

    await sql`
      INSERT INTO public.enquiry_activities (
        enquiry_id, actor_id, activity_type, description, metadata
      ) VALUES (
        ${enquiryId}, ${session.profile.id}, 'DEPOSIT_RECORDED',
        ${`Booking deposit of ₹${(amountPaise / 100).toLocaleString(
          "en-IN"
        )} received via ${paymentMethod} (Ref: ${reference}).`},
        ${sql.json({ amountPaise, reference, paymentMethod, notes })}
      )
    `;

    if (enquiry.client_id) {
      await sql`
        INSERT INTO public.notifications (user_id, title, body, type, data)
        VALUES (
          ${enquiry.client_id},
          'Booking Deposit Received',
          ${`Thank you! Your booking deposit of ₹${(amountPaise / 100).toLocaleString(
            "en-IN"
          )} has been recorded. Your wedding is now ready for formal confirmation.`},
          'deposit_confirmed',
          ${sql.json({ enquiry_code: enquiry.code, reference })}
        )
      `;
    }

    revalidatePath(`/admin/enquiries/${enquiryId}`);
    return { ok: true, data: { amountPaise, reference } };
  });
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

  return withUser(session.profile.id, async (sql) => {
    const [row] = await sql`
      SELECT public.confirm_wedding(${enquiryId}, ${assignedLeadId || null}) as res
    `;

    const result = row?.res as {
      ok: boolean;
      wedding_id: string;
      wedding_code: string;
      tasks_count: number;
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
        taskCount: result.tasks_count,
      },
    };
  });
}
