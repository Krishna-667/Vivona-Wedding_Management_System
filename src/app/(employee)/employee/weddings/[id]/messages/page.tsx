import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { ChatThread } from "@/components/features/chat/chat-thread";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Client & Operations Chat · Vivona",
};

export default async function EmployeeWeddingMessagesPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSessionProfile();
  const admin = createAdminClient();

  const { data: wedding } = await admin
    .from("weddings")
    .select("id, code, title")
    .eq("id", params.id)
    .single();

  if (!wedding) notFound();

  // Fetch thread and messages
  const { data: thread } = await admin
    .from("message_threads")
    .select("id")
    .eq("wedding_id", params.id)
    .maybeSingle();

  let messages: any[] = [];
  if (thread) {
    const { data: msgData } = await admin
      .from("messages")
      .select("id, sender_id, body, created_at, profiles(full_name, role)")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });
    messages = msgData || [];
  }

  return (
    <div className="max-w-4xl mx-auto">
      <ChatThread
        weddingId={wedding.id}
        weddingCode={wedding.code}
        weddingTitle={wedding.title}
        initialMessages={messages}
        currentUserId={session?.user.id || ""}
        currentRole={session?.profile.role || "employee"}
      />
    </div>
  );
}
