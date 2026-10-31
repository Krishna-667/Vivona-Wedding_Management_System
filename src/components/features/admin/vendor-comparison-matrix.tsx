"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { formatPaise } from "@/lib/utils";
import { selectQuoteAction } from "@/app/actions/vendors";
import {
  buildComparisonMatrix,
  type ComparisonQuote,
} from "@/lib/procurement/comparison";

interface VendorComparisonMatrixProps {
  rfqId: string;
  weddingCode: string;
  weddingTitle: string;
  guestCount: number;
  quotes: ComparisonQuote[];
  rfqStatus: string;
}

export function VendorComparisonMatrix({
  rfqId,
  weddingCode,
  weddingTitle,
  guestCount,
  quotes,
  rfqStatus,
}: VendorComparisonMatrixProps) {
  const [loading, setLoading] = useState(false);
  const matrix = buildComparisonMatrix(quotes, guestCount, 3);
  const isClosed = rfqStatus === "closed" || quotes.some((q) => q.status === "accepted");

  const handleSelectWinner = async (quoteId: string, vendorName: string) => {
    if (!confirm(`Confirm selection of ${vendorName} as the winning vendor for this RFQ category? This will close competing quotes and link the vendor to the wedding.`)) {
      return;
    }

    setLoading(true);
    toast.info(`Executing select_quote RPC for ${vendorName}...`);

    const res = await selectQuoteAction(quoteId);
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error || "Failed to select winning vendor quote.");
    } else {
      toast.success(
        `${vendorName} selected! Agreed amount: ${formatPaise(BigInt(res.data?.agreedAmountPaise || 0))}. Competing bids closed.`
      );
    }
  };

  if (quotes.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center text-xs text-charcoal/60">
        No quotes submitted for this RFQ yet. Enter quotes from at least 2 vendors to enable side-by-side comparison.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-maroon/10 text-maroon px-2 py-0.5 rounded">
              {weddingCode}
            </span>
            <span className="text-xs uppercase font-semibold text-gold-600">
              {matrix.category.toUpperCase()} TENDER COMPARISON
            </span>
          </div>
          <h2 className="font-serif text-2xl font-semibold text-charcoal mt-1">
            {weddingTitle}
          </h2>
          <p className="text-xs text-charcoal/60 mt-0.5">
            Evaluating {matrix.quotes.length} vendors based on {guestCount} planned guests (3 royal meals / 3-day duration).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isClosed ? (
            <span className="rounded-xl bg-sage-100 text-sage-800 px-3.5 py-1.5 text-xs font-semibold">
              ✓ Category Winner Awarded & Closed
            </span>
          ) : (
            <span className="rounded-xl bg-gold-100 text-gold-800 px-3.5 py-1.5 text-xs font-semibold">
              ⚖️ Open for Evaluation & Award
            </span>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            {/* Vendor Headers */}
            <tr className="border-b border-border bg-ivory-100/60 divide-x divide-border">
              <th className="p-4 w-64 text-charcoal/70 font-semibold align-top">
                Metrics & Itemized Modules
              </th>
              {matrix.quotes.map((q) => (
                <th key={q.quoteId} className="p-4 min-w-[240px] align-top space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase bg-maroon/10 text-maroon font-bold px-2 py-0.5 rounded">
                      {q.city}
                    </span>
                    {q.isCheapest && (
                      <span className="text-[10px] font-bold bg-sage-600 text-ivory px-2 py-0.5 rounded-full">
                        ★ Lowest Bidder
                      </span>
                    )}
                    {q.status === "accepted" && (
                      <span className="text-[10px] font-bold bg-maroon text-ivory px-2 py-0.5 rounded-full">
                        ✓ Selected Winner
                      </span>
                    )}
                  </div>

                  <h4 className="font-serif text-lg font-bold text-charcoal">
                    {q.vendorName}
                  </h4>

                  <div className="pt-2">
                    <span className="text-[11px] text-charcoal/60 block">Price Per Plate</span>
                    <span className="font-mono text-xl font-bold text-gold-700">
                      {formatPaise(BigInt(q.pricePerPlatePaise))}
                    </span>
                    <span className="text-[10px] text-charcoal/50 block">/ plate (incl. banquets)</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {/* Grand Total Row */}
            <tr className="bg-gold-50/40 divide-x divide-border font-bold">
              <td className="p-4 text-charcoal">Grand Total (Paise)</td>
              {matrix.quotes.map((q) => (
                <td key={q.quoteId} className="p-4 font-mono text-base text-maroon">
                  {formatPaise(BigInt(q.totalPaise))}
                  {!q.isCheapest && (
                    <span className="block text-[11px] font-normal text-terracotta mt-0.5">
                      +{formatPaise(BigInt(q.deltaVsCheapestPaise))} vs lowest
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* Extra Hour Overtime Rate */}
            <tr className="divide-x divide-border">
              <td className="p-3 text-charcoal/80 font-medium">Extra Hour Overtime Rate</td>
              {matrix.quotes.map((q) => (
                <td key={q.quoteId} className="p-3 font-mono font-medium text-charcoal">
                  {formatPaise(BigInt(q.extraHourRatePaise))} / hr
                </td>
              ))}
            </tr>

            {/* Aligned Line Items */}
            {matrix.alignedItemLabels.map((label) => (
              <tr key={label} className="divide-x divide-border hover:bg-ivory-100/30">
                <td className="p-3 font-medium text-charcoal/90">{label}</td>
                {matrix.quotes.map((q) => {
                  const line = q.lineMap.get(label);
                  if (!line) {
                    return (
                      <td key={q.quoteId} className="p-3 text-charcoal/40 text-center">
                        — Not Quoted —
                      </td>
                    );
                  }

                  return (
                    <td key={q.quoteId} className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-charcoal">
                          {formatPaise(BigInt(line.totalPaise))}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            line.included && !line.isExtra
                              ? "bg-sage-100 text-sage-800"
                              : "bg-terracotta/10 text-terracotta"
                          }`}
                        >
                          {line.included && !line.isExtra ? "✓ Included" : "+ Billable Extra"}
                        </span>
                      </div>
                      <div className="text-[11px] text-charcoal/50 font-mono">
                        {line.qty} {line.unit} @ {formatPaise(BigInt(line.unitPricePaise))} ({line.taxPct}% tax)
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Action Row */}
            <tr className="divide-x divide-border bg-ivory-100/40">
              <td className="p-4 font-semibold text-charcoal">Award Decision</td>
              {matrix.quotes.map((q) => (
                <td key={q.quoteId} className="p-4 text-center">
                  {q.status === "accepted" ? (
                    <div className="rounded-xl bg-sage-600 text-ivory py-2 font-semibold shadow-xs">
                      ✓ Contract Awarded
                    </div>
                  ) : q.status === "closed_not_selected" ? (
                    <div className="rounded-xl border border-border bg-card py-2 text-charcoal/50 font-medium">
                      Closed (Not Selected)
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectWinner(q.quoteId, q.vendorName)}
                      disabled={loading || isClosed}
                      className="w-full rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {loading ? "Selecting..." : `Select ${q.vendorName}`}
                    </button>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
