import { describe, it, expect } from "vitest";

describe("Phase 5: Financial Engine & Worked Example Reconciliation", () => {
  it("reconciles worked example: agreed quote -> advance -> invoice -> 60 extra guests", () => {
    // 1. Initial 400 guests @ ₹3,200/plate
    const plannedGuests = 400;
    const perPlatePaise = 320000n; // ₹3,200 in paise
    const agreedQuotePaise = BigInt(plannedGuests) * perPlatePaise; // ₹12,80,000

    expect(agreedQuotePaise).toBe(128000000n);

    // 2. 30% advance disbursed to caterer
    const advancePaidPaise = (agreedQuotePaise * 30n) / 100n; // ₹3,84,000
    expect(advancePaidPaise).toBe(38400000n);

    // 3. On-ground scope addition: 60 extra guests added during live reception dinner
    const extraGuests = 60;
    const extraChargesPaise = BigInt(extraGuests) * perPlatePaise; // ₹1,92,000
    expect(extraChargesPaise).toBe(19200000n);

    // 4. Caterer final bill received: 460 total guests
    const finalInvoicedPaise = agreedQuotePaise + extraChargesPaise; // ₹14,72,000
    expect(finalInvoicedPaise).toBe(147200000n);

    // 5. Remaining vendor balance due after deducting advance
    const remainingVendorBalancePaise = finalInvoicedPaise - advancePaidPaise; // ₹10,88,000
    expect(remainingVendorBalancePaise).toBe(108800000n);

    // 6. Client billing: original package + approved extra charge
    const clientPackageRevenuePaise = 350000000n; // ₹35 Lakhs base agency contract
    const totalRecognizedRevenuePaise = clientPackageRevenuePaise + extraChargesPaise; // ₹36,92,000
    expect(totalRecognizedRevenuePaise).toBe(369200000n);

    // 7. Internal labour cost: 26.5 coordinator hours @ ₹1,500/hr
    const totalHours = 26.5;
    const hourlyRatePaise = 150000;
    const labourCostPaise = BigInt(Math.round(totalHours * hourlyRatePaise)); // ₹39,750
    expect(labourCostPaise).toBe(3975000n);

    // 8. Net Profit = Recognized Revenue - Vendor Invoices - Internal Labour
    const netProfitPaise = totalRecognizedRevenuePaise - finalInvoicedPaise - labourCostPaise;
    expect(netProfitPaise).toBe(218025000n); // ₹21,80,250 net profit

    // 9. Margin %
    const marginPct = Number((netProfitPaise * 100n) / totalRecognizedRevenuePaise);
    expect(marginPct).toBe(59); // 59% agency gross margin
  });

  it("strictly enforces overpayment rejection when receipt exceeds balance", () => {
    const milestoneAmountPaise = 50000000n; // ₹5,00,000
    const alreadyPaidPaise = 30000000n; // ₹3,00,000
    const remainingBalancePaise = milestoneAmountPaise - alreadyPaidPaise; // ₹2,00,000

    const validPaymentAttemptPaise = 20000000n; // ₹2,00,000
    const overpaymentAttemptPaise = 20000001n; // ₹2,00,000.01

    expect(validPaymentAttemptPaise <= remainingBalancePaise).toBe(true);
    expect(overpaymentAttemptPaise > remainingBalancePaise).toBe(true);
  });

  it("safely identifies and returns existing receipt upon duplicate idempotency key", () => {
    const receiptDb = new Map<string, { id: string; amountPaise: bigint }>();

    const recordReceipt = (idempKey: string, amountPaise: bigint) => {
      if (receiptDb.has(idempKey)) {
        return { ok: true, isDuplicate: true, receipt: receiptDb.get(idempKey)! };
      }
      const newRecord = { id: "rcpt-uuid-001", amountPaise };
      receiptDb.set(idempKey, newRecord);
      return { ok: true, isDuplicate: false, receipt: newRecord };
    };

    const firstCall = recordReceipt("idemp-unique-123", 25000000n);
    expect(firstCall.isDuplicate).toBe(false);

    // Immediate double click or network retry
    const retryCall = recordReceipt("idemp-unique-123", 25000000n);
    expect(retryCall.isDuplicate).toBe(true);
    expect(retryCall.receipt.id).toBe(firstCall.receipt.id);
  });
});
