import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { ChatThread } from "@/components/features/chat/chat-thread";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Messages & Team Thread · Vivona Client Portal",
};

export default async function ClientMessagesPage() {
  const session = await getSessionProfile();
  if (!session) return null;

  const data = await withUser(session.profile.id, async (sql) => {
    const [wedding] = await sql`
      SELECT id, code, title
      FROM public.weddings
      WHERE client_id = ${session.profile.id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    let messages: any[] = [];
    if (wedding) {
      const [thread] = await sql`
        SELECT id FROM public.message_threads
        WHERE wedding_id = ${wedding.id}
        LIMIT 1
      `;

      if (thread) {
        messages = await sql`
          SELECT 
            m.id, 
            m.sender_id, 
            m.body, 
            m.created_at,
            json_build_object('full_name', p.full_name, 'role', p.role) as profiles
          FROM public.messages m
          LEFT JOIN public.profiles p ON p.id = m.sender_id
          WHERE m.thread_id = ${thread.id}
          ORDER BY m.created_at ASC
        `;
      }
    }

    return { wedding, messages };
  });

  const weddingId = data.wedding?.id || "00000000-0000-0000-0000-000000000000";
  const weddingCode = data.wedding?.code || "VIV-DEMO";
  const weddingTitle = data.wedding?.title || "Your Wedding Celebration";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <ChatThread
        weddingId={weddingId}
        weddingCode={weddingCode}
        weddingTitle={weddingTitle}
        initialMessages={data.messages}
        currentUserId={session.profile.id}
        currentRole="client"
      />
    </div>
  );
}
