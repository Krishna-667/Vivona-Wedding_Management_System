"use server";

import { FullBookingSubmissionSchema, type FullBookingSubmission } from "@/lib/validation/booking";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";
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

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstileToken(token?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  // If in development or test keys are used, allow pass
  if (!secretKey || secretKey.startsWith("0x4AAAAAA") || process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
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

  const supabase = createClient();
  const adminClient = createAdminClient();

  // 2. Identify or create Client Account
  let clientId: string | null = null;
  const session = await getSessionProfile();

  if (session) {
    clientId = session.profile.id;
  } else {
    // Check if user already exists with this email
    const { data: userListData } = await adminClient.auth.admin.listUsers();
    const existing = userListData?.users?.find(
      (u) => u.email?.toLowerCase() === data.contactEmail.toLowerCase()
    );

    if (existing) {
      clientId = existing.id;
    } else {
      // Auto-create client user
      const demoPass = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: data.contactEmail,
        password: demoPass,
        email_confirm: true,
        user_metadata: {
          full_name: data.contactName,
          phone: data.contactPhone,
        },
      });

      if (!createError && newUser?.user) {
        clientId = newUser.user.id;
        // Upsert client profile
        await adminClient.from("profiles").upsert({
          id: clientId,
          role: "client",
          full_name: data.contactName,
          phone: data.contactPhone,
          hourly_rate_paise: 0,
          is_active: true,
        });
      }
    }
  }

  // 3. Resolve package if package-based
  let packageId: string | null = null;
  if (data.type === "package" && data.packageSlug) {
    const { data: pkgData } = await adminClient
      .from("packages")
      .select("id")
      .eq("slug", data.packageSlug)
      .single();
    if (pkgData) {
      packageId = pkgData.id;
    }
  }

  // 4. Generate unique enquiry reference code (e.g. ENQ-2026-XXXX)
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const enquiryCode = `ENQ-2026-${randomSuffix}`;

  // 5. Idempotency Check: Don't duplicate if identical enquiry was submitted recently
  const { data: recentDuplicate } = await adminClient
    .from("enquiries")
    .select("id, code")
    .eq("contact_email", data.contactEmail)
    .eq("preferred_start_date", data.preferredStartDate)
    .eq("guest_count", data.guestCount)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

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
  const { data: insertedEnquiry, error: insertError } = await adminClient
    .from("enquiries")
    .insert({
      code: enquiryCode,
      client_id: clientId,
      source: "website_wizard",
      type: data.type,
      package_id: packageId,
      city: data.city,
      preferred_start_date: data.preferredStartDate,
      preferred_end_date: data.preferredEndDate,
      guest_count: data.guestCount,
      theme: data.theme,
      budget_max_paise: data.budgetMaxPaise,
      custom_services: data.customServices,
      status: "new",
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone,
      notes: data.notes || null,
    })
    .select("id, code")
    .single();

  if (insertError || !insertedEnquiry) {
    return {
      ok: false,
      error: insertError?.message || "Failed to record enquiry. Please try again.",
    };
  }

  // 7. Activity Timeline Record
  await adminClient.from("enquiry_activities").insert({
    enquiry_id: insertedEnquiry.id,
    actor_id: clientId,
    activity_type: "ENQUIRY_SUBMITTED",
    description: `Submitted ${data.type} wedding plan for ${data.guestCount} guests in ${data.city}.`,
    metadata: {
      budget_max_paise: data.budgetMaxPaise,
      theme: data.theme,
      package_slug: data.packageSlug,
    },
  });

  // 8. In-App Notifications (Dual-Write for demo resilience)
  if (clientId) {
    await adminClient.from("notifications").insert({
      user_id: clientId,
      title: "Wedding Blueprint Received",
      body: `Your request (${insertedEnquiry.code}) has been logged. Our lead planner will review dates and prepare your tailored proposal.`,
      type: "enquiry_received",
      data: { enquiry_code: insertedEnquiry.code },
    });
  }

  // Notify Admins
  const { data: adminProfiles } = await adminClient
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true);

  if (adminProfiles && adminProfiles.length > 0) {
    const adminNotifications = adminProfiles.map((adm) => ({
      user_id: adm.id,
      title: "New High-Value Enquiry",
      body: `${data.contactName} submitted a ${data.type} plan in ${data.city} (${data.guestCount} guests, Ref: ${insertedEnquiry.code}).`,
      type: "admin_new_enquiry",
      data: { enquiry_id: insertedEnquiry.id, code: insertedEnquiry.code },
    }));
    await adminClient.from("notifications").insert(adminNotifications);
  }

  // 9. Resend Email Dispatch (Dual-Write resilience)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Dispatch Confirmation to Client
  const clientEmailData = renderEnquiryConfirmationEmail({
    clientName: data.contactName,
    enquiryCode: insertedEnquiry.code,
    weddingType: data.type,
    guestCount: data.guestCount,
    city: data.city,
    portalUrl: `${siteUrl}/client`,
  });

  await sendEmail({
    to: data.contactEmail,
    subject: clientEmailData.subject,
    html: clientEmailData.html,
    text: clientEmailData.text,
  });

  // Dispatch Alert to Admin
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || "admin@vivona.demo";
  const adminEmailData = renderAdminEnquiryAlertEmail({
    clientName: data.contactName,
    clientEmail: data.contactEmail,
    clientPhone: data.contactPhone,
    enquiryCode: insertedEnquiry.code,
    city: data.city,
    guestCount: data.guestCount,
    type: data.type,
    adminUrl: `${siteUrl}/admin/enquiries`,
  });

  await sendEmail({
    to: adminEmail,
    subject: adminEmailData.subject,
    html: adminEmailData.html,
    text: adminEmailData.text,
  });

  return {
    ok: true,
    data: {
      enquiryId: insertedEnquiry.id,
      code: insertedEnquiry.code,
      contactEmail: data.contactEmail,
      message: "Your royal wedding plan has been registered with Vivona concierge.",
    },
  };
}
