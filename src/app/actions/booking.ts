"use server";

import { FullBookingSubmissionSchema, type FullBookingSubmission } from "@/lib/validation/booking";
import { withService } from "@/lib/db/with-user";
import { getSessionProfile } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/resend";
import {
  renderEnquiryConfirmationEmail,
  renderAdminEnquiryAlertEmail,
} from "@/lib/email/templates";

export interface BookingActionResult {
  ok: boolean;
  data?: {
    enquiryId: string;
    code: string;
    contactEmail: string;
    message: string;
  };
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

async function verifyTurnstileToken(token?: string): Promise<boolean> {
  if (!token || token.trim() === "") {
    return false;
  }
  const secretKey =
    process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";

  if (token === "dev-bypass-token" && process.env.NODE_ENV !== "production") {
    return true;
  }

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(
          secretKey
        )}&response=${encodeURIComponent(token)}`,
      }
    );
    const data = await res.json();
    return !!data.success;
  } catch {
    return process.env.NODE_ENV !== "production";
  }
}

export async function createEnquiryAction(payload: unknown): Promise<BookingActionResult> {
  const parsed = FullBookingSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted form errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data: FullBookingSubmission = parsed.data;

  // 1. Turnstile Verification
  const isHuman = await verifyTurnstileToken(data.turnstileToken);
  if (!isHuman) {
    return {
      ok: false,
      error: "Security verification failed. Please refresh and try again.",
    };
  }

  return withService(async (sql) => {
    // 2. Identify or create Client Account
    let clientId: string | null = null;
    const session = await getSessionProfile();

    if (session) {
      clientId = session.profile.id;
    } else {
      const [existing] = await sql`
        SELECT id FROM public.profiles WHERE LOWER(email) = LOWER(${data.contactEmail})
      `;

      if (existing) {
        clientId = existing.id;
      } else {
        const demoPass = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";
        const hashedPassword = await hashPassword(demoPass);

        const [newUser] = await sql`
          INSERT INTO public.profiles (
            email, role, full_name, phone, is_active
          ) VALUES (
            ${data.contactEmail}, 'client', ${data.contactName}, ${data.contactPhone || null}, true
          )
          RETURNING id
        `;

        await sql`
          INSERT INTO private.auth_credentials (profile_id, password_hash)
          VALUES (${newUser.id}, ${hashedPassword})
        `;

        clientId = newUser.id;
      }
    }

    // 3. Resolve package if package-based
    let packageId: string | null = null;
    if (data.type === "package" && data.packageSlug) {
      const [pkg] = await sql`
        SELECT id FROM public.packages WHERE slug = ${data.packageSlug}
      `;
      if (pkg) {
        packageId = pkg.id;
      }
    }

    // 4. Generate unique enquiry reference code
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const enquiryCode = `ENQ-2026-${randomSuffix}`;

    // 5. Idempotency Check
    const [recentDuplicate] = await sql`
      SELECT id, code FROM public.enquiries
      WHERE contact_email = ${data.contactEmail}
        AND preferred_start_date = ${data.preferredStartDate}
        AND guest_count = ${data.guestCount}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (recentDuplicate) {
      return {
        ok: true,
        data: {
          enquiryId: recentDuplicate.id,
          code: recentDuplicate.code,
          contactEmail: data.contactEmail,
          message: "Your enquiry was already received and is under review by our executive team.",
        },
      };
    }

    // 6. Insert into enquiries
    const [insertedEnquiry] = await sql`
      INSERT INTO public.enquiries (
        code, client_id, source, type, package_id, city,
        preferred_start_date, preferred_end_date, guest_count,
        theme, budget_max_paise, custom_services, status,
        contact_name, contact_email, contact_phone, notes
      ) VALUES (
        ${enquiryCode}, ${clientId}, 'website_wizard', ${data.type}, ${packageId}, ${data.city},
        ${data.preferredStartDate || null}, ${data.preferredEndDate || null}, ${data.guestCount},
        ${data.theme || null}, ${data.budgetMaxPaise}, ${sql.json(data.customServices || [])}, 'new',
        ${data.contactName}, ${data.contactEmail}, ${data.contactPhone}, ${data.notes || null}
      )
      RETURNING id, code
    `;

    // 7. Activity Timeline Record
    await sql`
      INSERT INTO public.enquiry_activities (
        enquiry_id, actor_id, activity_type, description, metadata
      ) VALUES (
        ${insertedEnquiry.id}, ${clientId}, 'ENQUIRY_SUBMITTED',
        ${`Submitted ${data.type} wedding plan for ${data.guestCount} guests in ${data.city}.`},
        ${sql.json({
          budget_max_paise: data.budgetMaxPaise,
          theme: data.theme,
          package_slug: data.packageSlug,
        })}
      )
    `;

    // 8. In-App Notifications
    if (clientId) {
      await sql`
        INSERT INTO public.notifications (user_id, title, body, type, data)
        VALUES (
          ${clientId},
          'Wedding Blueprint Received',
          ${`Your request (${insertedEnquiry.code}) has been logged. Our lead planner will review dates and prepare your tailored proposal.`},
          'enquiry_received',
          ${sql.json({ enquiry_code: insertedEnquiry.code })}
        )
      `;
    }

    const adminProfiles = await sql`
      SELECT id FROM public.profiles WHERE role = 'admin' AND is_active = true
    `;

    for (const adm of adminProfiles) {
      await sql`
        INSERT INTO public.notifications (user_id, title, body, type, data)
        VALUES (
          ${adm.id},
          'New High-Value Enquiry',
          ${`${data.contactName} submitted a ${data.type} plan in ${data.city} (${data.guestCount} guests, Ref: ${insertedEnquiry.code}).`},
          'admin_new_enquiry',
          ${sql.json({ enquiry_id: insertedEnquiry.id, code: insertedEnquiry.code })}
        )
      `;
    }

    // 9. Resend Email Dispatch (Non-blocking)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const clientEmailData = renderEnquiryConfirmationEmail({
      clientName: data.contactName,
      enquiryCode: insertedEnquiry.code,
      weddingType: data.type,
      guestCount: data.guestCount,
      city: data.city,
      portalUrl: `${siteUrl}/login`,
    });

    sendEmail({
      to: data.contactEmail,
      subject: clientEmailData.subject,
      html: clientEmailData.html,
    }).catch(() => {});

    return {
      ok: true,
      data: {
        enquiryId: insertedEnquiry.id,
        code: insertedEnquiry.code,
        contactEmail: data.contactEmail,
        message: "Your enquiry has been received. Check your email for login access to the client portal.",
      },
    };
  });
}
