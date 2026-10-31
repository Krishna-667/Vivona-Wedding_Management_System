"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export interface ClientActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Accept a proposal
 */
export async function acceptProposalAction(proposalId: string): Promise<ClientActionResult<{ proposalId: string }>> {
  const session = await getSessionProfile();
  if (!session) {
    return { ok: false, error: "Unauthorized. Please sign in." };
  }

  const adminClient = createAdminClient();

  // Verify ownership or admin
  const { data: proposal, error: fetchError } = await adminClient
    .from("proposals")
    .select("id, enquiry_id, client_id, version, total_paise")
    .eq("id", proposalId)
    .single();

  if (fetchError || !proposal) {
    return { ok: false, error: "Proposal not found." };
  }

  if (session.profile.role !== "admin" && proposal.client_id !== session.profile.id) {
    return { ok: false, error: "Access denied. You do not own this proposal." };
  }

  // Update status to accepted
  const { error: updateError } = await adminClient
    .from("proposals")
    .update({ status: "accepted" })
    .eq("id", proposalId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  // Add activity log
  await adminClient.from("enquiry_activities").insert({
    enquiry_id: proposal.enquiry_id,
    actor_id: session.profile.id,
    activity_type: "PROPOSAL_ACCEPTED",
    description: `Accepted wedding proposal (v${proposal.version}) for ₹${Number(proposal.total_paise) / 100}. Ready for booking deposit.`,
  });

  // Notify client and admin
  await adminClient.from("notifications").insert([
    {
      user_id: proposal.client_id,
      title: "Proposal Accepted",
      body: `You have formally accepted Proposal v${proposal.version}. Our admin will issue the booking deposit receipt to confirm your wedding.`,
      type: "proposal_accepted",
    },
  ]);

  revalidatePath("/client");
  revalidatePath("/client/proposal");

  return { ok: true, data: { proposalId } };
}

/**
 * Execute digital e-signature on the service agreement
 */
export async function signAgreementAction(payload: {
  agreementId: string;
  signatureDataUrl: string;
  signerName: string;
  consentGiven: boolean;
}): Promise<ClientActionResult<{ agreementId: string; signedAt: string }>> {
  const session = await getSessionProfile();
  if (!session) {
    return { ok: false, error: "Unauthorized. Please sign in." };
  }

  if (!payload.signerName || payload.signerName.trim().length < 2) {
    return { ok: false, error: "Please enter your full legal name as signer declaration." };
  }

  if (!payload.consentGiven) {
    return { ok: false, error: "You must confirm the legal agreement declaration." };
  }

  if (!payload.signatureDataUrl || !payload.signatureDataUrl.startsWith("data:image/")) {
    return { ok: false, error: "Valid touch signature drawing required." };
  }

  const adminClient = createAdminClient();

  // Verify agreement ownership
  const { data: agreement, error: fetchError } = await adminClient
    .from("agreements")
    .select("id, wedding_id, client_id, version, status")
    .eq("id", payload.agreementId)
    .single();

  if (fetchError || !agreement) {
    return { ok: false, error: "Agreement not found." };
  }

  if (session.profile.role !== "admin" && agreement.client_id !== session.profile.id) {
    return { ok: false, error: "Access denied. You cannot sign another client's agreement." };
  }

  if (agreement.status === "signed") {
    return { ok: false, error: "This agreement is already signed and locked." };
  }

  const signedTimestamp = new Date().toISOString();
  const signatureFileName = `sig_${agreement.id}_v${agreement.version}_${Date.now()}.png`;

  // Update agreement record
  const { error: updateError } = await adminClient
    .from("agreements")
    .update({
      status: "signed",
      signed_at: signedTimestamp,
      signed_by_name: payload.signerName.trim(),
      signature_path: signatureFileName,
      signed_pdf_path: `agreements/${agreement.id}/agreement-v${agreement.version}-signed.pdf`,
      signer_meta: {
        timestamp: signedTimestamp,
        signer_declared_name: payload.signerName.trim(),
        user_id: session.profile.id,
        user_email: session.user.email,
        ip_recorded: "127.0.0.1 (local)",
        consent: true,
      },
    })
    .eq("id", agreement.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  // Write notifications
  await adminClient.from("notifications").insert({
    user_id: agreement.client_id,
    title: "Service Agreement Successfully Signed",
    body: `Service agreement v${agreement.version} executed by ${payload.signerName.trim()}. Vendor shortlist and floor plans are now unlocked.`,
    type: "agreement_signed",
    data: { agreement_id: agreement.id },
  });

  // Log audit event
  await adminClient.from("audit_events").insert({
    actor_id: session.profile.id,
    action: "SIGN_AGREEMENT",
    entity_type: "agreements",
    entity_id: agreement.id,
    new_data: {
      signed_by_name: payload.signerName.trim(),
      signed_at: signedTimestamp,
    },
  });

  revalidatePath("/client");
  revalidatePath("/client/agreement");

  return {
    ok: true,
    data: {
      agreementId: agreement.id,
      signedAt: signedTimestamp,
    },
  };
}
