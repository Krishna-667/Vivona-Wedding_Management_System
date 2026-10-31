/**
 * Brand Constants for Vivona
 * Single source of truth for agency brand identity per AGENTS.md 0.1b.
 */

export const BRAND = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Vivona",
  legalName: "Vivona Luxury Weddings",
  tagline: "The Digital Backbone of Luxury Weddings in Rajasthan",
  description:
    "End-to-end operational platform for luxury three-day weddings across Jaipur and Udaipur.",
  cities: ["Jaipur", "Udaipur"] as const,
  weddingCodePrefix: "VIV",
  currency: {
    symbol: "₹",
    code: "INR",
  },
  demoDomain: "vivona.demo",
  supportEmail: "concierge@vivona.demo",
} as const;

export const APP_NAME = BRAND.name;
