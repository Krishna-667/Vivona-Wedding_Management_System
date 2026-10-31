import { type NextRequest } from "next/server";
import postgres from "postgres";
import { getSessionProfile } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { weddingId: string } }
) {
  const weddingId = params.weddingId;
  const session = await getSessionProfile();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create dedicated subscriber client for PostgreSQL LISTEN/NOTIFY
  const listenerUrl =
    process.env.DATABASE_URL ||
    "postgres://vivona_app:ChangeMe_App#2026@127.0.0.1:5432/vivona";

  const subSql = postgres(listenerUrl, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 10,
  });

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // 1. Initial connection ack
  await writer.write(
    encoder.encode(`event: connected\ndata: ${JSON.stringify({ weddingId, status: "live" })}\n\n`)
  );

  // 2. Setup PostgreSQL LISTEN
  let isClosed = false;

  const subscription = await subSql.listen("vivona_changes", async (notificationPayload) => {
    if (isClosed) return;
    try {
      const parsed = JSON.parse(notificationPayload);
      if (!parsed.wedding_id || parsed.wedding_id === weddingId) {
        await writer.write(encoder.encode(`data: ${notificationPayload}\n\n`));
      }
    } catch {
      // payload not JSON or wedding mismatch
    }
  });

  // 3. Heartbeat every 20 seconds to keep connection alive through proxies
  const heartbeatInterval = setInterval(async () => {
    if (isClosed) return;
    try {
      await writer.write(encoder.encode(": ping\n\n"));
    } catch {
      clearInterval(heartbeatInterval);
    }
  }, 20000);

  // 4. Clean up connection on client abort
  request.signal.addEventListener("abort", async () => {
    isClosed = true;
    clearInterval(heartbeatInterval);
    try {
      await subscription.unlisten();
      await subSql.end();
      await writer.close();
    } catch {
      // ignore
    }
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
