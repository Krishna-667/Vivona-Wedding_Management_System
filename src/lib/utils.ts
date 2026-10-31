import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format integer paise into INR currency display
 * e.g. 500000000n paise -> ₹50,00,000 (50 Lakhs)
 */
export function formatPaise(
  paise: number | bigint,
  options?: { showPaise?: boolean; showCompact?: boolean }
): string {
  const rupees = Number(paise) / 100;
  if (options?.showCompact && Math.abs(rupees) >= 100000) {
    if (Math.abs(rupees) >= 10000000) {
      const crores = rupees / 10000000;
      const formatted = parseFloat(crores.toFixed(2));
      return `₹${formatted} Cr`;
    }
    const lakhs = rupees / 100000;
    const formatted = parseFloat(lakhs.toFixed(2));
    return `₹${formatted} L`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: options?.showPaise ? 2 : 0,
    minimumFractionDigits: options?.showPaise ? 2 : 0,
  }).format(rupees);
}

/**
 * Parse an INR rupee input string/number into integer paise
 */
export function parseRupeesToPaise(rupees: number | string): bigint {
  const clean = typeof rupees === "string" ? rupees.replace(/[^0-9.-]+/g, "") : rupees;
  const num = Number(clean);
  if (isNaN(num)) return 0n;
  return BigInt(Math.round(num * 100));
}
