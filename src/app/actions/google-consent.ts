"use server";

import { z } from "zod";
import { issueLocalGoogleAuthCode } from "@/lib/auth/google-local";

export async function authorizeGoogleAccountAction(data: {
  email: string;
  name: string;
  avatarUrl?: string;
  state: string;
  redirectUri: string;
}): Promise<{ ok: true; callbackUrl: string } | { ok: false; error: string }> {
  const emailParsed = z.string().email().safeParse(data.email.trim());
  if (!emailParsed.success) {
    return { ok: false, error: "Please enter a valid Google email address." };
  }

  const cleanEmail = data.email.toLowerCase().trim();
  const cleanName = data.name.trim() || "Google Client";

  const code = issueLocalGoogleAuthCode({
    email: cleanEmail,
    name: cleanName,
    avatarUrl: data.avatarUrl,
    state: data.state,
  });

  const baseOrigin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const callbackUrl = new URL(data.redirectUri, baseOrigin);
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("state", data.state);

  return { ok: true, callbackUrl: callbackUrl.toString() };
}
