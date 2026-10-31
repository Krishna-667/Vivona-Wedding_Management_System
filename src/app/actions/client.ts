"use server";

import * as fs from "node:fs";
import * as path from "node:path";
import { revalidatePath } from "next/cache";
import { withUser } from "@/lib/db/with-user";
import { getSessionProfile } from "@/lib/auth/session";

export interface ClientActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Accept a proposal
 */
export async function acceptProposalAction(
  proposalId: string
): Promise<ClientActionResult<{ proposalId: string }>> {
  const session = await getSessionProfile();
  if (!session) {
    return { ok: false, error: "Unauthorized. Please sign in." };
  }

  return withUser(session.profile.id, async (sql) => {
    const [proposal] = await sql`
      SELECT id, enquiry_id, client_id, version, total_paise
      FROM public.proposals
      WHERE id = ${proposalId}
    `;

    if (!proposal) {
      return { ok: false, error: "Proposal not found." };
    }

    if (session.profile.role !== "admin" && proposal.client_id !== session.profile.id) {
      return { ok: false, error: "Access denied. You do not own this proposal." };
    }

    await sql`
      UPDATE public.proposals
      SET status = 'accepted', updated_at = NOW()
      WHERE id = ${proposalId}
    `;

    await sql`
      INSERT INTO public.enquiry_activities (
        enquiry_id, actor_id, activity_type, description
      ) VALUES (
        ${proposal.enquiry_id}, ${session.profile.id}, 'PROPOSAL_ACCEPTED',
        ${`Accepted wedding proposal (v${proposal.version}) for ₹${Number(proposal.total_paise) / 100}. Ready for booking deposit.`}
      )
    `;

    await sql`
      INSERT INTO public.notifications (user_id, title, body, type)
      VALUES (
        ${proposal.client_id},
        'Proposal Accepted',
        ${`You have formally accepted Proposal v${proposal.version}. Our admin will issue the booking deposit receipt to confirm your wedding.`},
        'proposal_accepted'
      )
    `;

    revalidatePath("/client");
    revalidatePath("/client/proposal");

    return { ok: true, data: { proposalId } };
  });
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

  return withUser(session.profile.id, async (sql) => {
    const [agreement] = await sql`
      SELECT id, wedding_id, client_id, version, status
      FROM public.agreements
      WHERE id = ${payload.agreementId}
    `;

    if (!agreement) {
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

    // Save signature file to local storage directory
    const storageDir = path.resolve(process.cwd(), "storage", "agreements");
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const base64Data = payload.signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const sigBuffer = Buffer.from(base64Data, "base64");
    const sigDiskPath = path.join(storageDir, signatureFileName);
    fs.writeFileSync(sigDiskPath, sigBuffer);

    // Record in files table
    await sql`
      INSERT INTO public.files (
        bucket, owner_id, wedding_id, original_name, mime_type, size_bytes, sha256, is_public, storage_path
      ) VALUES (
        'agreements', ${session.profile.id}, ${agreement.wedding_id}, ${signatureFileName},
        'image/png', ${sigBuffer.length}, 'sha256-signature', false,
        ${path.join("storage", "agreements", signatureFileName)}
      )
    `;

    await sql`
      UPDATE public.agreements
      SET
        status = 'signed',
        signed_at = ${signedTimestamp},
        signed_by_name = ${payload.signerName.trim()},
        signature_path = ${signatureFileName},
        signed_pdf_path = ${`agreements/${agreement.id}/agreement-v${agreement.version}-signed.pdf`},
        signer_meta = ${sql.json({
          timestamp: signedTimestamp,
          signer_declared_name: payload.signerName.trim(),
          user_id: session.profile.id,
          user_email: session.user.email,
          ip_recorded: "127.0.0.1 (local)",
          consent: true,
        })},
        updated_at = NOW()
      WHERE id = ${agreement.id}
    `;

    await sql`
      INSERT INTO public.notifications (user_id, title, body, type, data)
      VALUES (
        ${agreement.client_id},
        'Service Agreement Successfully Signed',
        ${`Service agreement v${agreement.version} executed by ${payload.signerName.trim()}. Vendor shortlist and floor plans are now unlocked.`},
        'agreement_signed',
        ${sql.json({ agreement_id: agreement.id })}
      )
    `;

    await sql`
      INSERT INTO public.audit_events (actor_id, action, entity_type, entity_id, new_data)
      VALUES (
        ${session.profile.id},
        'SIGN_AGREEMENT',
        'agreements',
        ${agreement.id},
        ${sql.json({
          signed_by_name: payload.signerName.trim(),
          signed_at: signedTimestamp,
        })}
      )
    `;

    revalidatePath("/client");
    revalidatePath("/client/agreement");

    return {
      ok: true,
      data: {
        agreementId: agreement.id,
        signedAt: signedTimestamp,
      },
    };
  });
}
