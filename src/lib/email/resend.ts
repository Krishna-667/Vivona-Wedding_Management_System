import { Resend } from "resend";
import { BRAND } from "@/lib/brand";

let resendInstance: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Sends an email via Resend with graceful fallback for development.
 * If RESEND_API_KEY is missing, logs the email output and resolves cleanly.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResendClient();
  const defaultFrom =
    process.env.RESEND_FROM_EMAIL ||
    `${BRAND.name} Concierge <onboarding@resend.dev>`;

  const sender = from || defaultFrom;
  const recipient = Array.isArray(to) ? to : [to];

  if (!resend) {
    console.info(
      `[Resend Notice] RESEND_API_KEY not configured. Mocking dispatch to: ${recipient.join(
        ", "
      )} | Subject: "${subject}"`
    );
    return { ok: true, id: `mock-${Date.now()}` };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: sender,
      to: recipient,
      subject,
      html,
      text: text || subject,
    });

    if (error) {
      console.error("[Resend Error]", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Resend Exception]", message);
    return { ok: false, error: message };
  }
}
