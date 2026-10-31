import type { VendorCategory } from "@/types/database";

export interface ComparisonQuoteLine {
  id?: string;
  label: string;
  qty: number;
  unit: string;
  unitPricePaise: number;
  taxPct: number;
  totalPaise: number;
  included: boolean;
  isExtra: boolean;
}

export interface ComparisonQuote {
  quoteId: string;
  vendorId: string;
  vendorName: string;
  vendorCategory: VendorCategory;
  city: string;
  status: string;
  extraHourRatePaise: number;
  validUntil?: string | null;
  documentPath?: string | null;
  lines: ComparisonQuoteLine[];
}

export interface EvaluatedQuote {
  quoteId: string;
  vendorId: string;
  vendorName: string;
  city: string;
  status: string;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  extraHourRatePaise: number;
  pricePerPlatePaise: number;
  deltaVsCheapestPaise: number;
  isCheapest: boolean;
  lineMap: Map<string, ComparisonQuoteLine>;
}

export interface ComparisonMatrix {
  category: VendorCategory;
  guestCount: number;
  mealCount: number;
  cheapestQuoteId: string;
  lowestTotalPaise: number;
  alignedItemLabels: string[];
  quotes: EvaluatedQuote[];
}

/**
 * Calculates per-plate price in paise:
 * (Total food cost) / (guestCount * mealCount)
 */
export function calculatePerPlatePaise(
  foodTotalPaise: number,
  guestCount: number,
  mealCount: number = 3
): number {
  if (guestCount <= 0 || mealCount <= 0) return 0;
  return Math.round(foodTotalPaise / (guestCount * mealCount));
}

/**
 * Builds side-by-side comparison matrix for quotes in an RFQ
 */
export function buildComparisonMatrix(
  quotes: ComparisonQuote[],
  guestCount: number = 400,
  mealCount: number = 3
): ComparisonMatrix {
  if (quotes.length === 0) {
    return {
      category: "catering",
      guestCount,
      mealCount,
      cheapestQuoteId: "",
      lowestTotalPaise: 0,
      alignedItemLabels: [],
      quotes: [],
    };
  }

  // 1. Collect all distinct line item labels across quotes for aligned row comparison
  const labelSet = new Set<string>();
  quotes.forEach((q) => {
    q.lines.forEach((l) => labelSet.add(l.label));
  });
  const alignedItemLabels = Array.from(labelSet);

  // 2. Evaluate each quote
  let lowestTotal = Infinity;
  let cheapestId = "";

  const evaluatedList: EvaluatedQuote[] = quotes.map((q) => {
    let subtotal = 0;
    let tax = 0;
    const lineMap = new Map<string, ComparisonQuoteLine>();

    q.lines.forEach((l) => {
      lineMap.set(l.label, l);
      if (l.included && !l.isExtra) {
        subtotal += l.totalPaise;
        tax += Math.round((l.totalPaise * (l.taxPct || 0)) / 100);
      }
    });

    const total = subtotal + tax;
    if (total < lowestTotal) {
      lowestTotal = total;
      cheapestId = q.quoteId;
    }

    const perPlate = calculatePerPlatePaise(total, guestCount, mealCount);

    return {
      quoteId: q.quoteId,
      vendorId: q.vendorId,
      vendorName: q.vendorName,
      city: q.city,
      status: q.status,
      subtotalPaise: subtotal,
      taxPaise: tax,
      totalPaise: total,
      extraHourRatePaise: q.extraHourRatePaise,
      pricePerPlatePaise: perPlate,
      deltaVsCheapestPaise: 0,
      isCheapest: false,
      lineMap,
    };
  });

  // 3. Mark cheapest and calculate delta vs lowest
  evaluatedList.forEach((eq) => {
    eq.deltaVsCheapestPaise = eq.totalPaise - lowestTotal;
    eq.isCheapest = eq.quoteId === cheapestId;
  });

  return {
    category: quotes[0].vendorCategory,
    guestCount,
    mealCount,
    cheapestQuoteId: cheapestId,
    lowestTotalPaise: lowestTotal === Infinity ? 0 : lowestTotal,
    alignedItemLabels,
    quotes: evaluatedList,
  };
}
