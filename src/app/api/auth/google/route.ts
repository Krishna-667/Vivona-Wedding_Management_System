import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Redirects legacy /api/auth/google to /api/auth/google/start
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = "/api/auth/google/start";
  return NextResponse.redirect(url);
}
