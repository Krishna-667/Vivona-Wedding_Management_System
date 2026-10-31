import { describe, it, expect } from "vitest";
import { ProposalBuilderSchema } from "@/lib/validation/crm";

describe("Phase 3: Proposal Builder & Payment Plan Validation", () => {
  const dummyEnquiryId = "11111111-2222-3333-4444-555555555555";

  it("successfully validates standard 20 / 30 / 50 staged payment plan", () => {
    const validProposal = {
      enquiryId: dummyEnquiryId,
      validDays: 30,
      lines: [
        {
          category: "venue" as const,
          label: "Palace Courtyard & Banquets",
          qty: 1,
          unit: "venue",
          unitPricePaise: 250000000,
          taxPct: 18,
        },
        {
          category: "catering" as const,
          label: "Royal Multi-Cuisine Dinner (400 guests)",
          qty: 400,
          unit: "plate",
          unitPricePaise: 350000,
          taxPct: 5,
        },
      ],
      paymentPlan: [
        { kind: "booking" as const, pct: 20 },
        { kind: "advance" as const, pct: 30 },
        { kind: "final" as const, pct: 50 },
      ],
      notes: "Custom decor lighting included.",
    };

    const result = ProposalBuilderSchema.safeParse(validProposal);
    expect(result.success).toBe(true);
  });

  it("strictly rejects payment plan when sum does not equal 100%", () => {
    const invalidSumProposal = {
      enquiryId: dummyEnquiryId,
      validDays: 30,
      lines: [
        {
          category: "decor" as const,
          label: "Mandap Arch",
          qty: 1,
          unit: "unit",
          unitPricePaise: 100000000,
          taxPct: 18,
        },
      ],
      paymentPlan: [
        { kind: "booking" as const, pct: 20 },
        { kind: "advance" as const, pct: 30 },
        { kind: "final" as const, pct: 40 }, // sums to 90%, NOT 100%
      ],
    };

    const result = ProposalBuilderSchema.safeParse(invalidSumProposal);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMsg = result.error.errors[0]?.message;
      expect(errorMsg).toContain("percentages must strictly sum to 100%");
    }
  });

  it("rejects proposal without any line items", () => {
    const emptyLines = {
      enquiryId: dummyEnquiryId,
      validDays: 30,
      lines: [],
      paymentPlan: [
        { kind: "booking" as const, pct: 20 },
        { kind: "advance" as const, pct: 30 },
        { kind: "final" as const, pct: 50 },
      ],
    };

    const result = ProposalBuilderSchema.safeParse(emptyLines);
    expect(result.success).toBe(false);
  });
});
