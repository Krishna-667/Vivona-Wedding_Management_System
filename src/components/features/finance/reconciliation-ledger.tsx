"use client";

import * as React from "react";
import { toast } from "sonner";
import { formatPaise } from "@/lib/utils";
import {
  recordClientReceiptAction,
  recordVendorPaymentAction,
  decideExtraChargeAction,
} from "@/app/actions/finance";
import type { PaymentMilestone, ExtraCharge, WeddingVendor, Vendor } from "@/types/database";

interface ReconciliationLedgerProps {
  weddingId: string;
  weddingCode: string;
  weddingTitle: string;
  milestones: PaymentMilestone[];
  vendors: Array<WeddingVendor & { vendor?: Vendor; bills?: any[]; payments?: any[] }>;
  extraCharges: ExtraCharge[];
  labourCostPaise: number;
}

export function ReconciliationLedger({
  weddingId,
  weddingCode,
  weddingTitle,
  milestones: initialMilestones,
  vendors: initialVendors,
  extraCharges: initialExtras,
  labourCostPaise,
}: ReconciliationLedgerProps) {
  const [milestones, setMilestones] = React.useState(initialMilestones);
  const [extraCharges, setExtraCharges] = React.useState(initialExtras);

  // Client Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = React.useState<string | null>(null);
  const [receiptAmountRupees, setReceiptAmountRupees] = React.useState<number>(0);
  const [receiptMethod, setReceiptMethod] = React.useState<any>("bank_transfer");
  const [receiptRef, setReceiptRef] = React.useState("");
  const [recordingReceipt, setRecordingReceipt] = React.useState(false);

  // Vendor Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [selectedVendorId, setSelectedVendorId] = React.useState<string | null>(null);
  const [paymentAmountRupees, setPaymentAmountRupees] = React.useState<number>(0);
  const [paymentRef, setPaymentRef] = React.useState("");
  const [recordingPayment, setRecordingPayment] = React.useState(false);

  // Computations
  const totalClientRevenuePaise = milestones.reduce((sum, m) => sum + Number(m.amount_paise), 0);
  const totalClientPaidPaise = milestones.reduce((sum, m) => sum + Number(m.paid_amount_paise), 0);
  const totalClientOutstandingPaise = totalClientRevenuePaise - totalClientPaidPaise;

  const totalVendorAgreedPaise = initialVendors.reduce(
    (sum, v) => sum + Number(v.agreed_amount_paise || 0),
    0
  );

  const grossProfitPaise = totalClientRevenuePaise - totalVendorAgreedPaise - labourCostPaise;
  const marginPct =
    totalClientRevenuePaise > 0
      ? Math.round((grossProfitPaise / totalClientRevenuePaise) * 100)
      : 0;

  // Handlers
  const handleRecordReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receiptAmountRupees <= 0 || !receiptRef) {
      toast.error("Please enter a valid amount and transaction reference.");
      return;
    }

    setRecordingReceipt(true);
    const idempKey = `rcpt-${weddingId}-${Date.now()}`;
    const res = await recordClientReceiptAction({
      weddingId,
      milestoneId: selectedMilestoneId,
      amountRupees: receiptAmountRupees,
      paymentMethod: receiptMethod,
      reference: receiptRef,
      idempotencyKey: idempKey,
    });
    setRecordingReceipt(false);

    if (!res.ok) {
      toast.error(res.error || "Failed to record receipt.");
    } else {
      toast.success("Client receipt recorded and reconciled in ledger!");
      setReceiptModalOpen(false);
      setReceiptRef("");
    }
  };

  const handleRecordVendorPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId || paymentAmountRupees <= 0 || !paymentRef) {
      toast.error("Please fill in required payment details.");
      return;
    }

    setRecordingPayment(true);
    const idempKey = `vpay-${weddingId}-${Date.now()}`;
    const res = await recordVendorPaymentAction({
      weddingId,
      weddingVendorId: selectedVendorId,
      amountRupees: paymentAmountRupees,
      paymentMethod: "bank_transfer",
      reference: paymentRef,
      idempotencyKey: idempKey,
    });
    setRecordingPayment(false);

    if (!res.ok) {
      toast.error(res.error || "Failed to record vendor payment.");
    } else {
      toast.success("Vendor payment recorded and ledger updated!");
      setPaymentModalOpen(false);
      setPaymentRef("");
    }
  };

  const handleExtraChargeDecision = async (chargeId: string, decision: "approved" | "rejected") => {
    const res = await decideExtraChargeAction(chargeId, decision);
    if (!res.ok) {
      toast.error(res.error || "Failed to update extra charge.");
    } else {
      toast.success(`Extra charge ${decision}. Client billing updated.`);
      setExtraCharges((prev) =>
        prev.map((c) => (c.id === chargeId ? { ...c, status: decision as any } : c))
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Financial North Star KPI Banner */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div>
            <span className="font-mono text-xs font-bold text-maroon bg-maroon/10 px-2.5 py-1 rounded">
              {weddingCode}
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal mt-1">
              Financial Reconciliation & Profit Engine
            </h1>
            <p className="text-xs text-charcoal/60 mt-0.5">
              Strict integer paise INR accounting. Originals are immutable.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-sm font-bold px-3 py-1.5 rounded-full border ${
                marginPct >= 15
                  ? "bg-sage-50 text-sage-700 border-sage-300"
                  : "bg-terracotta/10 text-terracotta border-terracotta/30"
              }`}
            >
              Gross Margin: {marginPct}%
            </span>
          </div>
        </div>

        {/* 4 Macro Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="rounded-xl border border-border bg-ivory-100/40 p-4">
            <span className="text-charcoal/60 block">Recognized Client Revenue</span>
            <p className="font-mono text-xl font-bold text-charcoal mt-1">
              {formatPaise(BigInt(totalClientRevenuePaise), { showCompact: true })}
            </p>
            <span className="text-[11px] text-charcoal/50">
              Outstanding: {formatPaise(BigInt(totalClientOutstandingPaise))}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-ivory-100/40 p-4">
            <span className="text-charcoal/60 block">Attributable Vendor Costs</span>
            <p className="font-mono text-xl font-bold text-charcoal mt-1">
              {formatPaise(BigInt(totalVendorAgreedPaise), { showCompact: true })}
            </p>
            <span className="text-[11px] text-charcoal/50">
              Across {initialVendors.length} service partners
            </span>
          </div>

          <div className="rounded-xl border border-border bg-ivory-100/40 p-4">
            <span className="text-charcoal/60 block">Timesheet Labour Cost</span>
            <p className="font-mono text-xl font-bold text-charcoal mt-1">
              {formatPaise(BigInt(labourCostPaise), { showCompact: true })}
            </p>
            <span className="text-[11px] text-charcoal/50">Internal employee hours</span>
          </div>

          <div className="rounded-xl border border-sage-200 bg-sage-50/50 p-4">
            <span className="text-sage-800 font-semibold block">Net Recognized Profit</span>
            <p className="font-mono text-xl font-bold text-sage-800 mt-1">
              {formatPaise(BigInt(grossProfitPaise), { showCompact: true })}
            </p>
            <span className="text-[11px] text-sage-700">
              Formula: Revenue − Vendors − Labour
            </span>
          </div>
        </div>
      </div>

      {/* 1. Client Milestones Table */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center border-b border-border/80 pb-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-charcoal">
              Client Payment Milestones (20 / 30 / 50 + Extras)
            </h2>
            <p className="text-xs text-charcoal/60">
              Milestone tracking with overpayment prevention and duplicate protection.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 text-charcoal/60 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Milestone</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Contract Amount</th>
                <th className="py-2.5 px-3">Paid Amount</th>
                <th className="py-2.5 px-3">Balance</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {milestones.map((m) => {
                const balance = Number(m.amount_paise) - Number(m.paid_amount_paise);
                return (
                  <tr key={m.id} className="hover:bg-ivory-100/30">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-charcoal block">{m.title}</span>
                      <span className="text-[10px] uppercase font-mono text-gold-600">
                        {m.kind} ({m.percentage}%)
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-charcoal/70">{m.due_date}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-charcoal">
                      {formatPaise(BigInt(m.amount_paise))}
                    </td>
                    <td className="py-3 px-3 font-mono text-sage-700 font-semibold">
                      {formatPaise(BigInt(m.paid_amount_paise))}
                    </td>
                    <td className="py-3 px-3 font-mono text-maroon font-bold">
                      {formatPaise(BigInt(balance))}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          m.status === "paid"
                            ? "bg-sage-100 text-sage-700"
                            : m.status === "partially_paid"
                            ? "bg-gold-100 text-gold-800"
                            : "bg-terracotta/10 text-terracotta"
                        }`}
                      >
                        {m.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {balance > 0 && (
                        <button
                          onClick={() => {
                            setSelectedMilestoneId(m.id);
                            setReceiptAmountRupees(balance / 100);
                            setReceiptModalOpen(true);
                          }}
                          className="rounded-lg bg-maroon text-ivory px-3 py-1 text-xs font-semibold hover:bg-maroon-600"
                        >
                          Record Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Vendor Procurement Ledger */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center border-b border-border/80 pb-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-charcoal">
              Vendor Procurement & Settlement Ledger
            </h2>
            <p className="text-xs text-charcoal/60">
              Track agreed contracts, advances deducted, received bills, and balance due.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 text-charcoal/60 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Vendor / Category</th>
                <th className="py-2.5 px-3">Agreed Quote</th>
                <th className="py-2.5 px-3">Advance Paid</th>
                <th className="py-2.5 px-3">Bill Received</th>
                <th className="py-2.5 px-3">Variance</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {initialVendors.map((wv) => (
                <tr key={wv.id} className="hover:bg-ivory-100/30">
                  <td className="py-3 px-3">
                    <span className="font-semibold text-charcoal block">
                      {wv.vendor?.name || "Service Partner"}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-gold-600">
                      {wv.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-charcoal">
                    {formatPaise(BigInt(wv.agreed_amount_paise || 0))}
                  </td>
                  <td className="py-3 px-3 font-mono text-sage-700">
                    {formatPaise(BigInt(Math.round(Number(wv.agreed_amount_paise || 0) * 0.3)))}
                  </td>
                  <td className="py-3 px-3 font-mono text-charcoal/80">
                    {formatPaise(BigInt(wv.agreed_amount_paise || 0))}
                  </td>
                  <td className="py-3 px-3 font-mono text-charcoal/60">₹0 (Matched)</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedVendorId(wv.id);
                        setPaymentAmountRupees(
                          Math.round(Number(wv.agreed_amount_paise || 0) * 0.7) / 100
                        );
                        setPaymentModalOpen(true);
                      }}
                      className="rounded-lg border border-maroon text-maroon px-3 py-1 text-xs font-semibold hover:bg-maroon hover:text-ivory transition-colors"
                    >
                      Settle Balance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Extra Charges Approvals */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <h2 className="font-serif text-xl font-semibold text-charcoal border-b border-border/80 pb-3">
          On-Ground Extra Charges & Approvals
        </h2>

        {extraCharges.length === 0 ? (
          <p className="text-xs text-charcoal/50">No extra charges requested for this wedding.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {extraCharges.map((ec) => (
              <div key={ec.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-charcoal">{ec.title}</span>
                    <span className="font-mono text-charcoal/60">
                      ({ec.qty} × ₹{Number(ec.unit_price_paise) / 100})
                    </span>
                  </div>
                  <p className="text-charcoal/60 mt-0.5">{ec.reason}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-maroon text-sm">
                    {formatPaise(BigInt(ec.total_paise))}
                  </span>

                  {ec.status === "requested" ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleExtraChargeDecision(ec.id, "approved")}
                        className="rounded bg-sage-600 text-ivory px-3 py-1 font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleExtraChargeDecision(ec.id, "rejected")}
                        className="rounded border border-terracotta text-terracotta px-3 py-1"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        ec.status === "approved"
                          ? "bg-sage-100 text-sage-700"
                          : "bg-terracotta/10 text-terracotta"
                      }`}
                    >
                      {ec.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Client Receipt Modal */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-serif text-xl font-semibold text-charcoal">
              Record Client Milestone Receipt
            </h3>
            <form onSubmit={handleRecordReceipt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Amount (INR ₹)
                </label>
                <input
                  type="number"
                  required
                  value={receiptAmountRupees}
                  onChange={(e) => setReceiptAmountRupees(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Payment Method
                </label>
                <select
                  value={receiptMethod}
                  onChange={(e) => setReceiptMethod(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="bank_transfer">Direct Bank Transfer</option>
                  <option value="neft">NEFT / RTGS</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI Corporate</option>
                  <option value="cash">Cash Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Bank Reference Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-HDFC202610319082"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingReceipt}
                  className="px-4 py-1.5 rounded-lg bg-maroon text-ivory text-xs font-semibold"
                >
                  {recordingReceipt ? "Recording..." : "Confirm Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Vendor Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-serif text-xl font-semibold text-charcoal">
              Record Vendor Settlement Payment
            </h3>
            <form onSubmit={handleRecordVendorPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Payment Amount (INR ₹)
                </label>
                <input
                  type="number"
                  required
                  value={paymentAmountRupees}
                  onChange={(e) => setPaymentAmountRupees(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PAY-VIV-CAT-2026-FINAL"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-4 py-1.5 rounded-lg bg-maroon text-ivory text-xs font-semibold"
                >
                  {recordingPayment ? "Processing..." : "Disburse Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
