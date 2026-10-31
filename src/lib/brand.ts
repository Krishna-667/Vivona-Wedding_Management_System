/**
 * Brand Constants for Vivona
 * Single source of truth for agency brand identity per AGENTS.md 0.1b.
 */

export const BRAND = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Vivona",
  legalName: "Vivona Luxury Weddings",
  tagline: "The Digital Backbone of Luxury Weddings",
  description:
    "End-to-end operational platform for premier luxury multi-day destination weddings.",
  cities: ["Jaipur", "Udaipur", "Goa", "Destination"] as const,
  weddingCodePrefix: "VIV",
  currency: {
    symbol: "₹",
    code: "INR",
  },
  demoDomain: "vivona.demo",
  supportEmail: "concierge@vivona.demo",
} as const;

export const APP_NAME = BRAND.name;
