import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { TaskBoard } from "@/components/features/tasks/task-board";
import type { Task } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Wedding Tasks Kanban · Vivona Operations",
};

export default async function EmployeeWeddingTasksPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const data = await withUser(session.profile.id, async (sql) => {
    const [wedding] = await sql`
      SELECT id, code, title FROM public.weddings WHERE id = ${params.id}
    `;
    if (!wedding) return null;

    const tasks = await sql`
      SELECT * FROM public.tasks
      WHERE wedding_id = ${params.id}
      ORDER BY due_date ASC
    `;

    return { wedding, tasks };
  });

  if (!data || !data.wedding) {
    notFound();
  }

  return (
    <TaskBoard
      weddingId={data.wedding.id}
      weddingCode={data.wedding.code}
      weddingTitle={data.wedding.title}
      initialTasks={(data.tasks || []) as unknown as Task[]}
      userRole={session.profile.role || "employee"}
    />
  );
}
