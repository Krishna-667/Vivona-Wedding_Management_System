import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPaise } from "@/lib/utils";
import { ProposalAcceptButton } from "@/components/features/client/proposal-accept-button";

export const metadata = {
  title: "Formal Wedding Proposal · Vivona Client Portal",
};

interface ProposalLine {
  id: string;
  category: string;
  label: string;
  qty: number;
  unit: string;
  unit_price_paise: bigint | number;
  tax_pct: number;
  total_paise: bigint | number;
}

export default async function ClientProposalPage() {
  const session = await getSessionProfile();

  // Try to find a real proposal for the user in proposals table
  let proposal: any = null;
  let lines: ProposalLine[] = [];

  if (session) {
    const admin = createAdminClient();
    const { data: propData } = await admin
      .from("proposals")
      .select("*")
      .eq("client_id", session.profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (propData) {
      proposal = propData;
      const { data: lineData } = await admin
        .from("proposal_lines")
        .select("*")
        .eq("proposal_id", propData.id)
        .order("display_order", { ascending: true });
      if (lineData) lines = lineData as ProposalLine[];
    }
  }

  // Fallback demo proposal if not yet generated
  if (!proposal) {
    proposal = {
      id: "demo-proposal-001",
      version: 1,
      status: "sent",
      valid_until: "2026-12-31",
      subtotal_paise: 350000000,
      tax_paise: 63000000,
      total_paise: 413000000,
      payment_plan: [
        { kind: "booking", pct: 20, amount_paise: 82600000 },
        { kind: "advance", pct: 30, amount_paise: 123900000 },
        { kind: "final", pct: 50, amount_paise: 206500000 },
      ],
      notes: "Royal Palace 3-Day Wedding Production at Rambagh Grounds, Jaipur. Includes 18-vendor coordination, line-array audio engineering, and live check-in enforcement.",
    };

    lines = [
      {
        id: "l1",
        category: "venue",
        label: "Rambagh Palace Grounds Hire & Lawn Permitting",
        qty: 1,
        unit: "venue",
        unit_price_paise: 150000000,
        tax_pct: 18,
        total_paise: 177000000,
      },
      {
        id: "l2",
        category: "catering",
        label: "3-Day Royal Rajputana Banquet (400 covers × 3 meals)",
        qty: 400,
        unit: "guest covers",
        unit_price_paise: 1050000, // ₹10,500 for 3 days
        tax_pct: 18,
        total_paise: 49560000,
      },
      {
        id: "l3",
        category: "decor",
        label: "Mandap Architecture, Imported Florals & Palace Facade Illumination",
        qty: 1,
        unit: "setup",
        unit_price_paise: 180000000,
        tax_pct: 18,
        total_paise: 212400000,
      },
      {
        id: "l4",
        category: "entertainment",
        label: "Celebrity DJ, L-Acoustics Sound System & Manganiyar Troupe",
        qty: 1,
        unit: "package",
        unit_price_paise: 75000000,
        tax_pct: 18,
        total_paise: 88500000,
      },
    ];
  }

  const isAccepted = proposal.status === "accepted";

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
            Tailored Quotation
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Official Wedding Proposal (v{proposal.version})
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Itemized breakdown, tax computation, and staged payment roadmap.
          </p>
        </div>

        <div>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isAccepted
                ? "bg-sage-100 text-sage-700 border border-sage-300"
                : "bg-gold-100 text-gold-700 border border-gold-300"
            }`}
          >
            Status: {proposal.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 bg-ivory-200/60 border-b border-border font-semibold text-xs text-charcoal flex justify-between items-center">
          <span>Itemized Production Lines</span>
          <span>Valid until: {proposal.valid_until}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-100 border-b border-border text-charcoal font-semibold">
              <tr>
                <th className="py-3 px-4">Line Item / Service</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Rate</th>
                <th className="py-3 px-4 text-center">GST</th>
                <th className="py-3 px-4 text-right">Total (Paise)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-charcoal/80">
              {lines.map((line) => (
                <tr key={line.id} className="hover:bg-ivory-100/40">
                  <td className="py-3 px-4">
                    <p className="font-medium text-charcoal">{line.label}</p>
                    <span className="text-[10px] text-charcoal/50 uppercase">{line.category}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {line.qty} {line.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatPaise(line.unit_price_paise)}
                  </td>
                  <td className="py-3 px-4 text-center">{line.tax_pct}%</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-charcoal">
                    {formatPaise(line.total_paise)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-ivory-200/40 border-t border-border font-semibold text-xs">
              <tr>
                <td colSpan={4} className="py-2.5 px-4 text-right">Subtotal:</td>
                <td className="py-2.5 px-4 text-right font-mono">{formatPaise(proposal.subtotal_paise)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="py-2.5 px-4 text-right">Estimated GST (18%):</td>
                <td className="py-2.5 px-4 text-right font-mono">{formatPaise(proposal.tax_paise)}</td>
              </tr>
              <tr className="text-sm font-bold text-maroon border-t border-border">
                <td colSpan={4} className="py-3.5 px-4 text-right font-serif">Grand Total Recognized:</td>
                <td className="py-3.5 px-4 text-right font-mono">{formatPaise(proposal.total_paise)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Staged Payment Plan Box */}
      <div className="rounded-2xl border border-gold-400/30 bg-ivory-200/50 p-6 space-y-4">
        <h3 className="font-serif text-lg font-semibold text-charcoal">
          Scheduled Milestone Payments (100% Staged)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-border bg-card space-y-1">
            <span className="text-[10px] uppercase font-bold text-maroon">Booking Milestone (20%)</span>
            <p className="font-serif text-lg font-bold text-charcoal">
              {formatPaise((BigInt(proposal.total_paise) * 20n) / 100n)}
            </p>
            <p className="text-[11px] text-charcoal/60">Locks calendar and triggers instant 30-task plan.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card space-y-1">
            <span className="text-[10px] uppercase font-bold text-gold-600">Advance Milestone (30%)</span>
            <p className="font-serif text-lg font-bold text-charcoal">
              {formatPaise((BigInt(proposal.total_paise) * 30n) / 100n)}
            </p>
            <p className="text-[11px] text-charcoal/60">Due 30 days prior to event.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card space-y-1">
            <span className="text-[10px] uppercase font-bold text-sage-600">Final Settlement (50%)</span>
            <p className="font-serif text-lg font-bold text-charcoal">
              {formatPaise((BigInt(proposal.total_paise) * 50n) / 100n)}
            </p>
            <p className="text-[11px] text-charcoal/60">Settled post-event after reconciled plate audit.</p>
          </div>
        </div>
      </div>

      {/* Accept Proposal CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-6 rounded-2xl border border-border bg-card gap-4">
        <div>
          <p className="text-xs font-semibold text-charcoal">
            {isAccepted
              ? "Proposal Accepted. You may now execute the Service Agreement."
              : "Ready to proceed? Accepting locks this proposal for booking deposit."}
          </p>
          <p className="text-[11px] text-charcoal/60 mt-0.5">
            Acceptance moves your wedding to deposit staging.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isAccepted ? (
            <Link
              href="/client/agreement"
              className="w-full sm:w-auto rounded-xl bg-sage-600 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-sage-700 transition-colors shadow-sm text-center"
            >
              Proceed to Sign Agreement →
            </Link>
          ) : (
            <ProposalAcceptButton proposalId={proposal.id} />
          )}
        </div>
      </div>
    </div>
  );
}
