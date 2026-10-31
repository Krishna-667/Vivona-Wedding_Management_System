"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPaise } from "@/lib/utils";
import {
  updateEnquiryStatusAction,
  scheduleConsultationAction,
  sendAgreementAction,
  createOrUpdateProposalAction,
  recordBookingDepositAction,
  confirmWeddingAction,
} from "@/app/actions/crm";
import type { Enquiry, EnquiryActivity, Proposal, Agreement } from "@/types/database";

interface EnquiryManagerProps {
  enquiry: Enquiry;
  activities: EnquiryActivity[];
  proposal: (Proposal & { proposal_lines?: Array<{ label: string; qty: number; unit: string; unit_price_paise: number; tax_pct: number; total_paise: number }> }) | null;
  agreement: Agreement | null;
  teamMembers: Array<{ id: string; full_name: string; role: string }>;
}

export function EnquiryManager({
  enquiry,
  activities,
  proposal,
  agreement,
  teamMembers,
}: EnquiryManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Modals
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Consultation Form State
  const [consultDate, setConsultDate] = useState("2026-11-05");
  const [consultTime, setConsultTime] = useState("16:00");
  const [consultType, setConsultType] = useState<"video_call" | "in_person_jaipur" | "in_person_udaipur" | "phone_call">("video_call");
  const [consultNotes, setConsultNotes] = useState("Preliminary concept and venue availability review.");

  // Proposal Builder State (default 20 / 30 / 50)
  const [proposalLines, setProposalLines] = useState<
    Array<{ category: any; label: string; qty: number; unit: string; unitPricePaise: number; taxPct: number }>
  >([
    { category: "venue", label: "Palace Venue & Banquet Lawns", qty: 1, unit: "venue", unitPricePaise: 150000000, taxPct: 18 },
    { category: "catering", label: "3-Day Royal Multi-Cuisine Banquets", qty: enquiry.guest_count, unit: "plate", unitPricePaise: 350000, taxPct: 5 },
    { category: "decor", label: "Heritage Mandap Architecture & Royal Florals", qty: 1, unit: "setup", unitPricePaise: 180000000, taxPct: 18 },
    { category: "entertainment", label: "Celebrity DJ, AV Line Arrays & Folk Troupe", qty: 1, unit: "crew", unitPricePaise: 75000000, taxPct: 18 },
    { category: "photography", label: "8K Cinema Crew, Drones & Teasers", qty: 1, unit: "crew", unitPricePaise: 90000000, taxPct: 18 },
  ]);

  const [bookingPct, setBookingPct] = useState(20);
  const [advancePct, setAdvancePct] = useState(30);
  const [finalPct, setFinalPct] = useState(50);

  // Deposit Form State
  const [depositAmountRupees, setDepositAmountRupees] = useState(700000); // ₹7,00,000 default
  const [depositRef, setDepositRef] = useState(`TXN-${Date.now().toString().slice(-6)}`);
  const [depositMethod, setDepositMethod] = useState("bank_transfer");

  // Confirm Wedding State
  const [selectedLeadId, setSelectedLeadId] = useState(teamMembers[0]?.id || "");

  // Computed Proposal Total
  const proposalTotalPaise = proposalLines.reduce((acc, line) => {
    const sub = line.qty * line.unitPricePaise;
    const tax = Math.round((sub * line.taxPct) / 100);
    return acc + sub + tax;
  }, 0);

  // 1. Mark Contacted
  const handleMarkContacted = async () => {
    setLoading(true);
    const res = await updateEnquiryStatusAction(enquiry.id, "contacted", "Introductory call completed by planner.");
    setLoading(false);
    if (!res.ok) toast.error(res.error);
    else toast.success("Enquiry marked as Contacted.");
  };

  // 2. Schedule Consultation
  const handleScheduleConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await scheduleConsultationAction({
      enquiryId: enquiry.id,
      date: consultDate,
      time: consultTime,
      meetingType: consultType,
      notes: consultNotes,
    });
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
    } else {
      toast.success("Consultation scheduled and client notified.");
      setConsultModalOpen(false);
    }
  };

  // 3. Send Agreement
  const handleSendAgreement = async () => {
    setLoading(true);
    const res = await sendAgreementAction(enquiry.id);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
    } else {
      toast.success("Service Agreement dispatched to Client Portal for e-signature.");
    }
  };

  // 4. Save and Dispatch Proposal
  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingPct + advancePct + finalPct !== 100) {
      toast.error("Payment plan percentages must strictly sum to 100%.");
      return;
    }

    setLoading(true);
    const res = await createOrUpdateProposalAction({
      enquiryId: enquiry.id,
      validDays: 30,
      lines: proposalLines,
      paymentPlan: [
        { kind: "booking", pct: bookingPct },
        { kind: "advance", pct: advancePct },
        { kind: "final", pct: finalPct },
      ],
      notes: "Commercial quote prefilled from luxury vendor standard rates.",
    });
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error);
    } else {
      toast.success("Proposal created and dispatched to client portal!");
      setProposalModalOpen(false);
    }
  };

  // 5. Record Booking Deposit
  const handleRecordDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const amountPaise = depositAmountRupees * 100;
    const res = await recordBookingDepositAction({
      enquiryId: enquiry.id,
      amountPaise,
      reference: depositRef,
      paymentMethod: depositMethod,
    });
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error);
    } else {
      toast.success("Deposit recorded! Wedding is now unlocked for confirmation.");
      setDepositModalOpen(false);
    }
  };

  // 6. Confirm Wedding (Calls confirm_wedding RPC)
  const handleConfirmWedding = async () => {
    setLoading(true);
    toast.info("Executing confirm_wedding RPC: Generating code, 30+ tasks, and milestones...");
    const res = await confirmWeddingAction(enquiry.id, selectedLeadId);
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error);
    } else {
      toast.success(
        `Wedding ${res.data?.weddingCode} Confirmed! Auto-generated ${res.data?.taskCount} operational tasks.`
      );
      setConfirmModalOpen(false);
      router.push(`/admin/weddings/${res.data?.weddingId}`);
    }
  };

  const isConfirmed = enquiry.status === "confirmed";

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
            Stage Progression
          </span>
          <h2 className="font-serif text-2xl font-semibold text-charcoal">
            CRM Actions for {enquiry.contact_name}
          </h2>
          <p className="text-xs text-charcoal/60 mt-0.5">
            Current Status: <span className="font-semibold text-maroon uppercase">{enquiry.status.replace(/_/g, " ")}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {enquiry.status === "new" && (
            <button
              onClick={handleMarkContacted}
              disabled={loading}
              className="rounded-xl bg-gold-600 px-4 py-2 text-xs font-semibold text-ivory hover:bg-gold-700 transition-colors shadow-xs"
            >
              ✓ Mark Contacted
            </button>
          )}

          {(enquiry.status === "new" || enquiry.status === "contacted") && (
            <button
              onClick={() => setConsultModalOpen(true)}
              disabled={loading}
              className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-charcoal hover:border-maroon transition-colors"
            >
              📅 Schedule Consultation
            </button>
          )}

          {(enquiry.status === "consultation_scheduled" || enquiry.status === "contacted") && (
            <button
              onClick={handleSendAgreement}
              disabled={loading}
              className="rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-xs"
            >
              📝 Send Agreement
            </button>
          )}

          <button
            onClick={() => setProposalModalOpen(true)}
            disabled={loading}
            className="rounded-xl border border-gold-400 bg-gold-50/60 px-4 py-2 text-xs font-semibold text-charcoal hover:bg-gold-100 transition-colors"
          >
            📋 {proposal ? "Edit Proposal" : "Build Proposal"}
          </button>

          {!isConfirmed && (
            <button
              onClick={() => setDepositModalOpen(true)}
              disabled={loading}
              className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-charcoal hover:border-gold-500 transition-colors"
            >
              💳 Record Deposit
            </button>
          )}

          {!isConfirmed && (
            <button
              onClick={() => setConfirmModalOpen(true)}
              disabled={loading}
              className="rounded-xl bg-sage-600 px-5 py-2 text-xs font-semibold text-ivory hover:bg-sage-700 transition-colors shadow-sm"
            >
              ✨ Confirm Wedding & Generate Plan
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Details, Status Timeline, Proposal & Agreement Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Requirements & Commercial Proposal (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agreement Status Card */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-charcoal">
                Legal Agreement & E-Sign Status
              </h3>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  agreement?.status === "signed"
                    ? "bg-sage-100 text-sage-800"
                    : "bg-gold-50 text-gold-700"
                }`}
              >
                {agreement?.status === "signed" ? "✓ Signed & Legally Locked" : "Pending E-Signature"}
              </span>
            </div>

            {agreement ? (
              <div className="rounded-xl bg-ivory-100/60 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-charcoal/60">Version:</span>
                  <span className="font-semibold text-charcoal">v{agreement.version}</span>
                </div>
                {agreement.signed_at && (
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">Signed At:</span>
                    <span className="font-semibold text-charcoal">
                      {new Date(agreement.signed_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {agreement.signed_by_name && (
                  <div className="flex justify-between">
                    <span className="text-charcoal/60">Signed By:</span>
                    <span className="font-semibold text-charcoal">{agreement.signed_by_name}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-charcoal/60">
                No agreement has been sent to the client yet. Click &quot;Send Agreement&quot; above to issue the standard luxury contract.
              </p>
            )}
          </div>

          {/* Proposal Summary Card */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-charcoal">
                  Itemized Proposal & Staged Milestones
                </h3>
                <p className="text-xs text-charcoal/60 mt-0.5">
                  {proposal ? `Version ${proposal.version} · Staged 20/30/50 Architecture` : "No proposal generated yet"}
                </p>
              </div>
              {proposal && (
                <div className="font-mono text-xl font-bold text-maroon">
                  {formatPaise(BigInt(proposal.total_paise))}
                </div>
              )}
            </div>

            {proposal && proposal.proposal_lines && proposal.proposal_lines.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-charcoal/60">
                    <tr>
                      <th className="py-2">Service Module</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Unit Price</th>
                      <th className="py-2 text-right">Tax</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {proposal.proposal_lines.map((l: { label: string; qty: number; unit: string; unit_price_paise: number; tax_pct: number; total_paise: number }, i: number) => (
                      <tr key={i} className="hover:bg-ivory-100/40">
                        <td className="py-2.5 font-medium text-charcoal">{l.label}</td>
                        <td className="py-2.5 text-right font-mono">{l.qty} {l.unit}</td>
                        <td className="py-2.5 text-right font-mono">{formatPaise(BigInt(l.unit_price_paise))}</td>
                        <td className="py-2.5 text-right font-mono">{l.tax_pct}%</td>
                        <td className="py-2.5 text-right font-mono font-semibold text-charcoal">
                          {formatPaise(BigInt(l.total_paise))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-charcoal/50 text-xs">
                Click &quot;Build Proposal&quot; to compile service lines, venue fees, and caterer spreads.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <h3 className="font-serif text-lg font-semibold text-charcoal border-b border-border/60 pb-3">
            Activity Timeline
          </h3>

          {activities.length === 0 ? (
            <p className="text-xs text-charcoal/50 py-6 text-center">No recorded activity yet.</p>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {activities.map((act) => (
                <div key={act.id} className="relative pl-5 border-l-2 border-gold-400/40 text-xs space-y-1">
                  <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-maroon" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-charcoal">{act.activity_type.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-charcoal/50">
                      {new Date(act.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-charcoal/70 leading-relaxed">{act.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Schedule Consultation */}
      {consultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4">
          <div className="rounded-2xl border border-border bg-card p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-serif text-xl font-semibold text-charcoal">Schedule Client Consultation</h3>
            <form onSubmit={handleScheduleConsultation} className="space-y-3 text-xs">
              <div>
                <label className="block text-charcoal/70 mb-1">Date</label>
                <input
                  type="date"
                  value={consultDate}
                  onChange={(e) => setConsultDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-charcoal/70 mb-1">Time</label>
                <input
                  type="time"
                  value={consultTime}
                  onChange={(e) => setConsultTime(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-charcoal/70 mb-1">Format</label>
                <select
                  value={consultType}
                  onChange={(e) => setConsultType(e.target.value as any)}
                  className="w-full rounded-xl border border-input bg-background p-2"
                >
                  <option value="video_call">High-Definition Video Call (Google Meet)</option>
                  <option value="in_person_jaipur">In-Person at Vivona C-Scheme Jaipur</option>
                  <option value="in_person_udaipur">In-Person at Lake Palace Road Udaipur</option>
                  <option value="phone_call">Direct Phone Consultation</option>
                </select>
              </div>
              <div>
                <label className="block text-charcoal/70 mb-1">Notes / Agenda</label>
                <textarea
                  rows={3}
                  value={consultNotes}
                  onChange={(e) => setConsultNotes(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConsultModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 hover:bg-ivory-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-maroon px-4 py-2 text-ivory font-semibold hover:bg-maroon-600"
                >
                  Confirm Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Proposal Builder */}
      {proposalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 overflow-y-auto">
          <div className="rounded-2xl border border-border bg-card p-6 max-w-3xl w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h3 className="font-serif text-2xl font-semibold text-charcoal">Compile Commercial Proposal</h3>
                <p className="text-xs text-charcoal/60 mt-0.5">
                  Itemized pricing, GST calculation, and 100% staged milestone architecture.
                </p>
              </div>
              <div className="font-mono text-lg font-bold text-maroon">
                {formatPaise(BigInt(proposalTotalPaise))}
              </div>
            </div>

            <form onSubmit={handleSaveProposal} className="space-y-5 text-xs">
              {/* Lines Table */}
              <div className="space-y-3">
                <h4 className="font-semibold text-charcoal">Service Modules & Estimates</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {proposalLines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-ivory-100/50 p-2.5 rounded-xl border border-border/60">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={line.label}
                          onChange={(e) => {
                            const next = [...proposalLines];
                            next[idx].label = e.target.value;
                            setProposalLines(next);
                          }}
                          className="w-full rounded-lg border border-input bg-background p-1.5 font-medium"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={line.qty}
                          onChange={(e) => {
                            const next = [...proposalLines];
                            next[idx].qty = Number(e.target.value);
                            setProposalLines(next);
                          }}
                          className="w-full rounded-lg border border-input bg-background p-1.5 text-right font-mono"
                          required
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={line.unitPricePaise / 100}
                          onChange={(e) => {
                            const next = [...proposalLines];
                            next[idx].unitPricePaise = Number(e.target.value) * 100;
                            setProposalLines(next);
                          }}
                          className="w-full rounded-lg border border-input bg-background p-1.5 text-right font-mono"
                          placeholder="₹ Price"
                          required
                        />
                      </div>
                      <div className="col-span-2 text-right font-mono font-bold text-charcoal">
                        ₹{((line.qty * line.unitPricePaise) / 100).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Plan (Must sum to 100%) */}
              <div className="p-4 rounded-xl border border-gold-400/40 bg-gold-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-charcoal">Staged Milestone Percentages</h4>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      bookingPct + advancePct + finalPct === 100 ? "bg-sage-600 text-ivory" : "bg-terracotta text-ivory"
                    }`}
                  >
                    Sum: {bookingPct + advancePct + finalPct}% / 100%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-charcoal/70 mb-1">Booking Deposit (%)</label>
                    <input
                      type="number"
                      value={bookingPct}
                      onChange={(e) => setBookingPct(Number(e.target.value))}
                      className="w-full rounded-lg border border-input bg-background p-2 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-charcoal/70 mb-1">Advance Milestone (%)</label>
                    <input
                      type="number"
                      value={advancePct}
                      onChange={(e) => setAdvancePct(Number(e.target.value))}
                      className="w-full rounded-lg border border-input bg-background p-2 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-charcoal/70 mb-1">Final Settlement (%)</label>
                    <input
                      type="number"
                      value={finalPct}
                      onChange={(e) => setFinalPct(Number(e.target.value))}
                      className="w-full rounded-lg border border-input bg-background p-2 font-mono text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setProposalModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 hover:bg-ivory-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-maroon px-5 py-2 text-ivory font-semibold hover:bg-maroon-600"
                >
                  Issue Proposal to Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Record Booking Deposit */}
      {depositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4">
          <div className="rounded-2xl border border-border bg-card p-6 max-w-md w-full space-y-4 shadow-xl text-xs">
            <h3 className="font-serif text-xl font-semibold text-charcoal">Record Booking Commitment Deposit</h3>
            <p className="text-charcoal/60">
              Entering the client deposit locks planning capacity and satisfies the gateway condition to confirm the wedding.
            </p>

            <form onSubmit={handleRecordDeposit} className="space-y-3">
              <div>
                <label className="block text-charcoal/70 mb-1">Deposit Amount (₹ INR)</label>
                <input
                  type="number"
                  value={depositAmountRupees}
                  onChange={(e) => setDepositAmountRupees(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background p-2 font-mono text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-charcoal/70 mb-1">Bank Reference / UTR Number</label>
                <input
                  type="text"
                  value={depositRef}
                  onChange={(e) => setDepositRef(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-charcoal/70 mb-1">Payment Method</label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2"
                >
                  <option value="bank_transfer">NEFT / RTGS Bank Transfer</option>
                  <option value="cheque">Client Cheque</option>
                  <option value="upi">Direct Corporate UPI</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 hover:bg-ivory-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gold-600 px-4 py-2 text-ivory font-semibold hover:bg-gold-700"
                >
                  Save Deposit Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Confirm Wedding */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4">
          <div className="rounded-2xl border border-border bg-card p-6 max-w-lg w-full space-y-4 shadow-xl text-xs">
            <h3 className="font-serif text-2xl font-semibold text-charcoal">Confirm Royal Wedding</h3>
            <p className="text-charcoal/70 leading-relaxed">
              This initiates the transactional PostgreSQL <code>confirm_wedding</code> engine:
            </p>

            <ul className="list-disc pl-5 space-y-1 text-charcoal/80">
              <li>Generates sequential wedding code <strong>VIV-2026-XXX</strong>.</li>
              <li>Auto-generates <strong>30+ operational tasks</strong> with due dates offset from the wedding date.</li>
              <li>Creates the <strong>3 staged payment milestones</strong> (Booking, Advance, Final).</li>
              <li>Assigns the designated Lead Planner and establishes the live client concierge thread.</li>
            </ul>

            <div className="pt-2">
              <label className="block text-charcoal/70 mb-1 font-semibold">Assign Lead Planner</label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-2.5 font-medium"
              >
                {teamMembers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2 hover:bg-ivory-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWedding}
                disabled={loading}
                className="rounded-xl bg-sage-600 px-5 py-2 text-ivory font-semibold hover:bg-sage-700 shadow-sm"
              >
                Execute Wedding Confirmation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
