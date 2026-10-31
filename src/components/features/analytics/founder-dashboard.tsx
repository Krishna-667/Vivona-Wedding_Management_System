"use client";

import * as React from "react";
import Link from "next/link";
import { formatPaise } from "@/lib/utils";

interface WeddingAnalyticsItem {
  id: string;
  code: string;
  title: string;
  venue: string;
  city: string;
  status: string;
  guest_count_planned: number;
  revenuePaise: number;
  vendorCostPaise: number;
  labourCostPaise: number;
  profitPaise: number;
  marginPct: number;
}

interface VendorScorecardItem {
  vendorId: string;
  name: string;
  category: string;
  punctualityPct: number;
  avgLateMinutes: number;
  incidentCount: number;
  reliabilityScore: number;
}

interface FounderDashboardProps {
  weddings: WeddingAnalyticsItem[];
  vendorScorecard: VendorScorecardItem[];
  totalSeasonRevenuePaise: number;
  totalSeasonVendorCostPaise: number;
  totalSeasonLabourCostPaise: number;
  totalSeasonProfitPaise: number;
  seasonMarginPct: number;
}

export function FounderDashboard({
  weddings,
  vendorScorecard,
  totalSeasonRevenuePaise,
  totalSeasonVendorCostPaise,
  totalSeasonLabourCostPaise,
  totalSeasonProfitPaise,
  seasonMarginPct,
}: FounderDashboardProps) {
  const [activeTab, setActiveTab] = React.useState<"weddings" | "vendors">("weddings");
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredWeddings = weddings.filter((w) =>
    w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.venue.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
            Executive Command & Intelligence
          </span>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Founder Season Analytics & Profit Review
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Real-time multi-wedding financial intelligence computed strictly from Postgres records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-charcoal hover:bg-ivory-200 transition-colors shadow-2xs"
          >
            🖨️ Export PDF Report
          </button>
        </div>
      </div>

      {/* 5 Macro KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">
            Season Recognized Revenue
          </span>
          <p className="font-mono text-2xl font-bold text-charcoal mt-1">
            {formatPaise(BigInt(totalSeasonRevenuePaise), { showCompact: true })}
          </p>
          <span className="text-[10px] text-charcoal/50">25 Confirmed Celebrations</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">
            Attributable Vendor Costs
          </span>
          <p className="font-mono text-2xl font-bold text-charcoal mt-1">
            {formatPaise(BigInt(totalSeasonVendorCostPaise), { showCompact: true })}
          </p>
          <span className="text-[10px] text-charcoal/50">18 Curated Vendor Partners</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold text-charcoal/60 uppercase">
            Internal Labour Cost
          </span>
          <p className="font-mono text-2xl font-bold text-charcoal mt-1">
            {formatPaise(BigInt(totalSeasonLabourCostPaise), { showCompact: true })}
          </p>
          <span className="text-[10px] text-charcoal/50">Timesheet logged hours</span>
        </div>

        <div className="rounded-2xl border border-sage-200 bg-sage-50/60 p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-sage-800 uppercase">
            Net Recognized Profit
          </span>
          <p className="font-mono text-2xl font-bold text-sage-800 mt-1">
            {formatPaise(BigInt(totalSeasonProfitPaise), { showCompact: true })}
          </p>
          <span className="text-[10px] text-sage-700">Formula: Revenue − Costs</span>
        </div>

        <div className="rounded-2xl border border-gold-300 bg-gold-50/60 p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-gold-900 uppercase">
            Season Gross Margin
          </span>
          <p className="font-mono text-3xl font-bold text-gold-900 mt-1">
            {seasonMarginPct}%
          </p>
          <span className="text-[10px] text-gold-700">Target Season Benchmark: 22%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3 text-xs">
        <button
          onClick={() => setActiveTab("weddings")}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === "weddings"
              ? "bg-maroon text-ivory font-semibold shadow-xs"
              : "text-charcoal/70 hover:bg-ivory-200"
          }`}
        >
          🏰 Season Weddings Portfolio ({weddings.length})
        </button>

        <button
          onClick={() => setActiveTab("vendors")}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === "vendors"
              ? "bg-maroon text-ivory font-semibold shadow-xs"
              : "text-charcoal/70 hover:bg-ivory-200"
          }`}
        >
          🚚 Vendor Performance Scorecard ({vendorScorecard.length})
        </button>
      </div>

      {/* 1. WEDDINGS TABLE */}
      {activeTab === "weddings" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <input
              type="text"
              placeholder="Search wedding code, couple, or palace venue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl border border-input bg-card px-3.5 py-2 text-xs max-w-sm"
            />
            <span className="text-xs text-charcoal/60">
              Showing {filteredWeddings.length} of {weddings.length} celebrations
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-ivory-100/50 text-charcoal/60 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Code / Couple</th>
                    <th className="py-3 px-4">Venue & City</th>
                    <th className="py-3 px-4">Guests</th>
                    <th className="py-3 px-4">Revenue</th>
                    <th className="py-3 px-4">Costs</th>
                    <th className="py-3 px-4">Net Profit</th>
                    <th className="py-3 px-4">Margin</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredWeddings.map((w) => (
                    <tr key={w.id} className="hover:bg-ivory-100/30">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-maroon block">
                          {w.code}
                        </span>
                        <span className="font-semibold text-charcoal">{w.title}</span>
                      </td>
                      <td className="py-3 px-4 text-charcoal/80">
                        <span>{w.venue}</span>
                        <span className="text-[10px] text-charcoal/50 block">{w.city}</span>
                      </td>
                      <td className="py-3 px-4 font-mono">{w.guest_count_planned}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-charcoal">
                        {formatPaise(BigInt(w.revenuePaise), { showCompact: true })}
                      </td>
                      <td className="py-3 px-4 font-mono text-charcoal/70">
                        {formatPaise(BigInt(w.vendorCostPaise + w.labourCostPaise), {
                          showCompact: true,
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sage-800">
                        {formatPaise(BigInt(w.profitPaise), { showCompact: true })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            w.marginPct >= 20
                              ? "bg-sage-100 text-sage-800"
                              : w.marginPct >= 10
                              ? "bg-gold-100 text-gold-800"
                              : "bg-terracotta/10 text-terracotta"
                          }`}
                        >
                          {w.marginPct}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-ivory-200 text-charcoal/70">
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/weddings/${w.id}/finance`}
                          className="text-xs font-semibold text-maroon hover:underline"
                        >
                          Ledger →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. VENDOR SCORECARD */}
      {activeTab === "vendors" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-ivory-100/50 text-charcoal/60 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Vendor Partner</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Punctuality %</th>
                    <th className="py-3 px-4">Avg Late Window</th>
                    <th className="py-3 px-4">Incidents</th>
                    <th className="py-3 px-4">Reliability Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {vendorScorecard.map((v) => (
                    <tr key={v.vendorId} className="hover:bg-ivory-100/30">
                      <td className="py-3 px-4 font-semibold text-charcoal">{v.name}</td>
                      <td className="py-3 px-4 uppercase font-mono text-[10px] text-gold-600">
                        {v.category}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sage-800">
                        {v.punctualityPct}%
                      </td>
                      <td className="py-3 px-4 font-mono text-charcoal/70">
                        +{v.avgLateMinutes} min
                      </td>
                      <td className="py-3 px-4 font-mono text-charcoal/70">
                        {v.incidentCount} logged
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gold-800">
                        ⭐ {v.reliabilityScore.toFixed(1)} / 5.0
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
