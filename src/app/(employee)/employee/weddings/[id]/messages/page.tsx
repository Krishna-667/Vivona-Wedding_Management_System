import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { decryptField } from "@/lib/crypto/field-encryption";
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
  if (!session) redirect("/login");

  const data = await withUser(session.profile.id, async (sql) => {
    const [wedding] = await sql`
      SELECT id, code, title
      FROM public.weddings
      WHERE id = ${params.id}
    `;

    if (!wedding) return null;

    const [thread] = await sql`
      SELECT id FROM public.message_threads
      WHERE wedding_id = ${params.id}
      LIMIT 1
    `;

    let messages: any[] = [];
    if (thread) {
      const rawMessages = await sql`
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
      messages = (rawMessages || []).map((m: any) => ({
        ...m,
        body: decryptField("messages", "body", m.body) || m.body,
      }));
    }

    return { wedding, messages };
  });

  if (!data || !data.wedding) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      <ChatThread
        weddingId={data.wedding.id}
        weddingCode={data.wedding.code}
        weddingTitle={data.wedding.title}
        initialMessages={data.messages}
        currentUserId={session.profile.id}
        currentRole={session.profile.role || "employee"}
      />
    </div>
  );
}
