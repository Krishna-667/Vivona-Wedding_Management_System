import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { formatPaise } from "@/lib/utils";
import { RunRemindersButton } from "./run-reminders-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finance & Milestones Engine · Vivona Admin",
};

export default async function AdminFinanceMasterPage() {
  const session = await getSessionProfile();
  const userId = session?.profile.id || "00000000-0000-0000-0000-000000000000";

  const { weddings, milestones, extraCharges } = await withUser(userId, async (sql) => {
    const weddings = await sql`
      SELECT id, code, title, venue, city, budget_paise
      FROM public.weddings
      ORDER BY start_date ASC
    `;
    const milestones = await sql`
      SELECT wedding_id, amount_paise, paid_amount_paise, status
      FROM public.payment_milestones
    `;
    const extraCharges = await sql`
      SELECT wedding_id, total_paise, status
      FROM public.extra_charges
    `;
    return {
      weddings: weddings as any[],
      milestones: milestones as any[],
      extraCharges: extraCharges as any[],
    };
  });

  const totalRecognizedPaise = milestones.reduce((sum, m) => sum + Number(m.amount_paise), 0);
  const totalCollectedPaise = milestones.reduce((sum, m) => sum + Number(m.paid_amount_paise), 0);
  const totalOutstandingPaise = totalRecognizedPaise - totalCollectedPaise;

  const pendingExtras = extraCharges.filter((ec) => ec.status === "requested");

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
            Integer Paise Financial Engine
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Cashflow, Staged Milestones & Vendor Settlement
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Immutable originals, idempotent payments, overpayment guards, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RunRemindersButton />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">
            Total Recognized Revenue
          </span>
          <p className="font-mono text-2xl font-bold text-charcoal mt-1">
            {formatPaise(BigInt(totalRecognizedPaise), { showCompact: true })}
          </p>
          <span className="text-[10px] text-charcoal/50">Across all milestone contracts</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">
            Total Collected Receipts
          </span>
          <p className="font-mono text-2xl font-bold text-sage-800 mt-1">
            {formatPaise(BigInt(totalCollectedPaise), { showCompact: true })}
          </p>
          <span className="text-[10px] text-sage-700">Bank verified integer receipts</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">
            Pending Receivables
          </span>
          <p className="font-mono text-2xl font-bold text-maroon mt-1">
            {formatPaise(BigInt(totalOutstandingPaise), { showCompact: true })}
          </p>
          <span className="text-[10px] text-charcoal/50">
            {pendingExtras.length} on-ground extras pending approval
          </span>
        </div>
      </div>

      {/* Wedding Finance Ledgers List */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <h2 className="font-serif text-xl font-semibold text-charcoal border-b border-border/80 pb-3">
          Active Celebrations & Reconciliation Ledgers
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-ivory-100/50 text-charcoal/60 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Code / Celebration</th>
                <th className="py-3 px-4">Venue & City</th>
                <th className="py-3 px-4">Budget</th>
                <th className="py-3 px-4">Collected</th>
                <th className="py-3 px-4">Balance Due</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {weddings.map((w) => {
                const wMilestones = milestones.filter((m) => m.wedding_id === w.id);
                const rec = wMilestones.reduce((sum, m) => sum + Number(m.amount_paise), 0);
                const paid = wMilestones.reduce((sum, m) => sum + Number(m.paid_amount_paise), 0);
                const balance = rec - paid;

                return (
                  <tr key={w.id} className="hover:bg-ivory-100/30">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-maroon block">
                        {w.code}
                      </span>
                      <span className="font-semibold text-charcoal">{w.title}</span>
                    </td>
                    <td className="py-3 px-4 text-charcoal/80">
                      {w.venue} ({w.city})
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-charcoal">
                      {formatPaise(BigInt(rec || w.budget_paise), { showCompact: true })}
                    </td>
                    <td className="py-3 px-4 font-mono text-sage-800 font-semibold">
                      {formatPaise(BigInt(paid), { showCompact: true })}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-maroon">
                      {formatPaise(BigInt(balance))}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/weddings/${w.id}/finance`}
                        className="rounded-lg bg-maroon text-ivory px-3 py-1.5 text-xs font-semibold hover:bg-maroon-600 shadow-2xs"
                      >
                        Open Ledger →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
