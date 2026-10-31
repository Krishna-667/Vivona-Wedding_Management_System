import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPaise } from "@/lib/utils";
import type { Wedding, Task, PaymentMilestone } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Wedding Operations Master · Vivona Admin",
};

export default async function AdminWeddingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = createAdminClient();

  const [weddingRes, tasksRes, milestonesRes, assignmentsRes, teamRes] = await Promise.all([
    admin.from("weddings").select("*, profiles!weddings_client_id_fkey(full_name, phone, email)").eq("id", params.id).single(),
    admin.from("tasks").select("*, profiles!tasks_owner_id_fkey(full_name)").eq("wedding_id", params.id).order("due_date", { ascending: true }),
    admin.from("payment_milestones").select("*").eq("wedding_id", params.id).order("due_date", { ascending: true }),
    admin.from("wedding_assignments").select("*, profiles(full_name, role)").eq("wedding_id", params.id),
    admin.from("profiles").select("id, full_name, role").in("role", ["admin", "employee"]).eq("is_active", true),
  ]);

  if (weddingRes.error || !weddingRes.data) {
    notFound();
  }

  const wedding = weddingRes.data as unknown as Wedding & {
    profiles?: { full_name: string; phone: string; email: string } | null;
  };
  const tasks = (tasksRes.data || []) as unknown as Array<Task & { profiles?: { full_name: string } | null }>;
  const milestones = (milestonesRes.data || []) as PaymentMilestone[];
  const assignments = (assignmentsRes.data || []) as Array<any>;

  const doneCount = tasks.filter((t) => t.stage === "done").length;
  const progressPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <Link
            href="/admin/weddings"
            className="text-xs text-charcoal/60 hover:text-maroon transition-colors block mb-1"
          >
            ← Back to Weddings List
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold bg-maroon/10 text-maroon px-2.5 py-1 rounded-md">
              {wedding.code}
            </span>
            <h1 className="font-serif text-3xl font-semibold text-charcoal">
              {wedding.title}
            </h1>
          </div>
          <p className="text-xs text-charcoal/70 mt-1">
            📍 {wedding.venue} ({wedding.city}) · 👥 {wedding.guest_count_planned} Guests · 📅 {wedding.start_date} → {wedding.end_date}
          </p>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="text-[11px] text-charcoal/60 block">Recognized Budget</span>
            <span className="font-mono text-xl font-bold text-gold-700">
              {formatPaise(BigInt(wedding.budget_paise))}
            </span>
          </div>
        </div>
      </div>

      {/* Progress & Team Assignment Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Card */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-charcoal">Overall Task Completion</span>
            <span className="font-mono font-bold text-maroon">{progressPct}%</span>
          </div>
          <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
            <div
              className="bg-maroon h-full rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[11px] text-charcoal/60 block">
            {doneCount} of {tasks.length} auto-generated tasks completed
          </span>
        </div>

        {/* Client Card */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-1 text-xs shadow-xs">
          <span className="text-[11px] uppercase font-semibold text-gold-600 block">Client Contact</span>
          <h4 className="font-semibold text-charcoal text-sm">{wedding.profiles?.full_name || "Client"}</h4>
          <p className="text-charcoal/60">{wedding.profiles?.email}</p>
          <p className="text-charcoal/60 font-mono">{wedding.profiles?.phone}</p>
        </div>

        {/* Assigned Staff */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2 text-xs shadow-xs">
          <span className="text-[11px] uppercase font-semibold text-gold-600 block">Assigned Operations Team</span>
          {assignments.length === 0 ? (
            <p className="text-charcoal/50">Lead planner assigned automatically.</p>
          ) : (
            <div className="space-y-1">
              {assignments.map((a, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="font-medium text-charcoal">{a.profiles?.full_name}</span>
                  <span className="font-mono text-[10px] uppercase bg-ivory-100 px-2 py-0.5 rounded border border-border">
                    {a.role_on_wedding.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staged Payment Milestones (20 / 30 / 50) */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <h3 className="font-serif text-xl font-semibold text-charcoal border-b border-border/60 pb-3">
          Staged Payment Milestones (Integer Paise INR)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {milestones.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-border bg-ivory-100/40 p-4 space-y-2 text-xs"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold uppercase text-[10px] bg-maroon/10 text-maroon px-2 py-0.5 rounded">
                  {m.kind} ({m.percentage}%)
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    m.status === "paid"
                      ? "bg-sage-600 text-ivory"
                      : "bg-gold-100 text-gold-800"
                  }`}
                >
                  {m.status.toUpperCase()}
                </span>
              </div>
              <h4 className="font-semibold text-charcoal">{m.title}</h4>
              <div className="font-mono text-base font-bold text-charcoal">
                {formatPaise(BigInt(m.amount_paise))}
              </div>
              <span className="text-[11px] text-charcoal/60 block">
                Due: {m.due_date}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-Generated 30+ Operational Tasks */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="font-serif text-xl font-semibold text-charcoal">
              Operational Task Engine ({tasks.length} Tasks Auto-Generated)
            </h3>
            <p className="text-xs text-charcoal/60 mt-0.5">
              Instantiated automatically from package templates with calendar offsets.
            </p>
          </div>
          <span className="text-xs font-semibold bg-sage-50 text-sage-800 px-3 py-1 rounded-full border border-sage-200">
            ✓ Auto-Plan Ready
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-charcoal/60 bg-ivory-100/50">
              <tr>
                <th className="py-2.5 px-3">Phase</th>
                <th className="py-2.5 px-3">Task Title & Scope</th>
                <th className="py-2.5 px-3">Owner</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-ivory-100/40">
                  <td className="py-2.5 px-3 font-mono text-[10px] uppercase text-charcoal/60">
                    {t.phase.replace(/_/g, " ")}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-charcoal block">{t.title}</span>
                    {t.description && (
                      <span className="text-[11px] text-charcoal/60 line-clamp-1">{t.description}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-charcoal">
                    {t.profiles?.full_name || "Lead Planner"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        t.priority === "critical"
                          ? "bg-terracotta text-ivory"
                          : t.priority === "high"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-charcoal/10 text-charcoal/70"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium text-charcoal">
                    {t.due_date}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        t.stage === "done"
                          ? "bg-sage-600 text-ivory"
                          : t.stage === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-charcoal/10 text-charcoal/70"
                      }`}
                    >
                      {t.stage.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
