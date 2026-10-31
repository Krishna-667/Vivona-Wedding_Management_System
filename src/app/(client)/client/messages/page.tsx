import { getSessionProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatThread } from "@/components/features/chat/chat-thread";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Messages & Team Thread · Vivona Client Portal",
};

export default async function ClientMessagesPage() {
  const session = await getSessionProfile();
  const admin = createAdminClient();

  if (!session) return null;

  // Find client's wedding
  const { data: wedding } = await admin
    .from("weddings")
    .select("id, code, title")
    .eq("client_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const weddingId = wedding?.id || "00000000-0000-0000-0000-000000000000";
  const weddingCode = wedding?.code || "VIV-DEMO";
  const weddingTitle = wedding?.title || "Your Wedding Celebration";

  // Fetch thread messages
  let messages: any[] = [];
  if (wedding) {
    const { data: thread } = await admin
      .from("message_threads")
      .select("id")
      .eq("wedding_id", wedding.id)
      .maybeSingle();

    if (thread) {
      const { data: msgData } = await admin
        .from("messages")
        .select("id, sender_id, body, created_at, profiles(full_name, role)")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });
      messages = msgData || [];
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <ChatThread
        weddingId={weddingId}
        weddingCode={weddingCode}
        weddingTitle={weddingTitle}
        initialMessages={messages}
        currentUserId={session.user.id}
        currentRole="client"
      />
    </div>
  );
}
