import { describe, it, expect } from "vitest";
import {
  calculatePerPlatePaise,
  buildComparisonMatrix,
  type ComparisonQuote,
} from "@/lib/procurement/comparison";

describe("Phase 3: 3-Caterer Side-by-Side Comparison Fixture", () => {
  const GUEST_COUNT = 450;
  const MEAL_COUNT = 3; // Mehendi Lunch, Sangeet Dinner, Wedding Royal Banquet

  const catererQuotesFixture: ComparisonQuote[] = [
    {
      quoteId: "quote-caterer-1",
      vendorId: "vendor-1",
      vendorName: "Royal Rajputana Caterers",
      vendorCategory: "catering",
      city: "Jaipur",
      status: "submitted",
      extraHourRatePaise: 2500000, // ₹25,000/hr
      lines: [
        {
          label: "Multi-Cuisine Royal Banquet Spread",
          qty: 450,
          unit: "plate",
          unitPricePaise: 320000, // ₹3,200/plate
          taxPct: 5,
          totalPaise: 450 * 320000 * 3, // 3 meals = 43,20,00,000 paise (₹43.2 Lakh)
          included: true,
          isExtra: false,
        },
        {
          label: "Live Jalebi & Rabri Station",
          qty: 1,
          unit: "service",
          unitPricePaise: 15000000, // ₹1.5 Lakh
          taxPct: 18,
          totalPaise: 15000000,
          included: true,
          isExtra: false,
        },
      ],
    },
    {
      quoteId: "quote-caterer-2",
      vendorId: "vendor-2",
      vendorName: "Mewar Feast Co",
      vendorCategory: "catering",
      city: "Udaipur",
      status: "submitted",
      extraHourRatePaise: 2000000, // ₹20,000/hr
      lines: [
        {
          label: "Multi-Cuisine Royal Banquet Spread",
          qty: 450,
          unit: "plate",
          unitPricePaise: 290000, // ₹2,900/plate
          taxPct: 5,
          totalPaise: 450 * 290000 * 3, // 39,15,00,000 paise (₹39.15 Lakh)
          included: true,
          isExtra: false,
        },
        {
          label: "Live Jalebi & Rabri Station",
          qty: 1,
          unit: "service",
          unitPricePaise: 12000000, // ₹1.2 Lakh
          taxPct: 18,
          totalPaise: 12000000,
          included: true,
          isExtra: false,
        },
      ],
    },
    {
      quoteId: "quote-caterer-3",
      vendorId: "vendor-3",
      vendorName: "Udaivilas Gourmet Catering",
      vendorCategory: "catering",
      city: "Udaipur",
      status: "submitted",
      extraHourRatePaise: 3500000, // ₹35,000/hr
      lines: [
        {
          label: "Multi-Cuisine Royal Banquet Spread",
          qty: 450,
          unit: "plate",
          unitPricePaise: 380000, // ₹3,800/plate
          taxPct: 5,
          totalPaise: 450 * 380000 * 3, // 51,30,00,000 paise (₹51.3 Lakh)
          included: true,
          isExtra: false,
        },
        {
          label: "Live Jalebi & Rabri Station",
          qty: 1,
          unit: "service",
          unitPricePaise: 20000000, // ₹2.0 Lakh
          taxPct: 18,
          totalPaise: 20000000,
          included: true,
          isExtra: false,
        },
      ],
    },
  ];

  it("calculates per-plate pricing correctly in integer paise", () => {
    // 450 guests * 3 meals = 1350 plates total
    const totalCostPaise = 425250000; // ₹42,52,500
    const perPlatePaise = calculatePerPlatePaise(totalCostPaise, GUEST_COUNT, MEAL_COUNT);

    // 425250000 / 1350 = 315000 paise (₹3,150)
    expect(perPlatePaise).toBe(315000);
  });

  it("identifies the cheapest caterer and accurately computes deltas vs lowest", () => {
    const matrix = buildComparisonMatrix(catererQuotesFixture, GUEST_COUNT, MEAL_COUNT);

    expect(matrix.quotes.length).toBe(3);
    // Mewar Feast Co (quote-caterer-2) is the lowest bidder
    expect(matrix.cheapestQuoteId).toBe("quote-caterer-2");

    const mewar = matrix.quotes.find((q) => q.quoteId === "quote-caterer-2")!;
    expect(mewar.isCheapest).toBe(true);
    expect(mewar.deltaVsCheapestPaise).toBe(0);

    const rajputana = matrix.quotes.find((q) => q.quoteId === "quote-caterer-1")!;
    expect(rajputana.isCheapest).toBe(false);
    expect(rajputana.deltaVsCheapestPaise).toBeGreaterThan(0);
    expect(rajputana.deltaVsCheapestPaise).toBe(rajputana.totalPaise - mewar.totalPaise);

    const udaivilas = matrix.quotes.find((q) => q.quoteId === "quote-caterer-3")!;
    expect(udaivilas.isCheapest).toBe(false);
    expect(udaivilas.deltaVsCheapestPaise).toBe(udaivilas.totalPaise - mewar.totalPaise);
    expect(udaivilas.deltaVsCheapestPaise).toBeGreaterThan(rajputana.deltaVsCheapestPaise);
  });

  it("aligns distinct line item labels across all 3 caterer columns", () => {
    const matrix = buildComparisonMatrix(catererQuotesFixture, GUEST_COUNT, MEAL_COUNT);

    expect(matrix.alignedItemLabels).toContain("Multi-Cuisine Royal Banquet Spread");
    expect(matrix.alignedItemLabels).toContain("Live Jalebi & Rabri Station");
  });
});
