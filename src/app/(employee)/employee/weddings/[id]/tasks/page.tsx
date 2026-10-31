import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";
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
  const admin = createAdminClient();

  const [weddingRes, tasksRes] = await Promise.all([
    admin.from("weddings").select("id, code, title").eq("id", params.id).single(),
    admin.from("tasks").select("*").eq("wedding_id", params.id).order("due_date", { ascending: true }),
  ]);

  if (weddingRes.error || !weddingRes.data) {
    notFound();
  }

  return (
    <TaskBoard
      weddingId={weddingRes.data.id}
      weddingCode={weddingRes.data.code}
      weddingTitle={weddingRes.data.title}
      initialTasks={(tasksRes.data || []) as Task[]}
      userRole={session?.profile.role || "employee"}
    />
  );
}
