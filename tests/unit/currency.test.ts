import { describe, it, expect } from "vitest";
import { formatPaise, parseRupeesToPaise } from "@/lib/utils";

describe("Vivona Integer Paise Currency Engine", () => {
  it("formats integer paise to INR currency string without decimals by default", () => {
    // ₹35,00,000 = 350000000 paise
    const result = formatPaise(350000000n);
    // en-IN currency formats as ₹35,00,000
    expect(result).toContain("35,00,000");
  });

  it("formats compact crores and lakhs correctly", () => {
    // 4.5 Crore = 4,50,00,000 Rupees = 4,50,00,00,000 paise (9 zeros)
    const crores = formatPaise(4500000000n, { showCompact: true });
    expect(crores).toBe("₹4.5 Cr");

    // 50 Lakh = 50,00,000 Rupees = 50,00,00,000 paise (8 zeros)
    const lakhs = formatPaise(500000000n, { showCompact: true });
    expect(lakhs).toBe("₹50 L");
  });

  it("converts rupees string to integer paise safely", () => {
    const paise = parseRupeesToPaise("35,00,000");
    expect(paise).toBe(350000000n);

    const singlePlate = parseRupeesToPaise("3500");
    expect(singlePlate).toBe(350000n);
  });
});
