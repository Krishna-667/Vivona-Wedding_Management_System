# Architectural and Design Decisions (Vivona)

## DEC-001: UI Ideology Adaptation from Orvane
- **Context:** Orvane established a clean, production-ready web application architecture (accessible semantic tokens, responsive mobile-first adapters, state-timeline steppers, status chips, clean dialog/sheet ergonomics, zero gratuitous animations).
- **Decision:** Vivona adopts Orvane's core **UI engineering patterns** (declarative status indicators, mobile-first cards-over-tables, strict WCAG AA contrast, semantic color tokens, structured layout shells) while implementing Vivona's distinct luxury brand design system:
  - **Color Palette:** Ivory (`#FBF7F0`), Maroon (`#6B1D2A`), Antique Gold (`#C8A24A`), Charcoal (`#1F1A17`), Sage (`#6F8F72`), Terracotta (`#B5533C`).
  - **Typography:** Cormorant Garamond for display/headings, Inter for UI and body text.
  - **Geometry:** 12px border radius, 8pt spacing system.
  - **Brand Identity:** Typographic "Vivona" with gold knot glyph icon (`<Logo />`).

## DEC-002: Single-Agency Architecture
- **Context:** The problem represents one luxury wedding planning agency operating multi-day destination weddings.
- **Decision:** Strictly single-tenant. No multi-agency overhead. All resources associate with `wedding_id`.

## DEC-003: Strict Brand Integrity
- **Context:** The application is a production-grade operational platform for Vivona.
- **Decision:** Zero mentions of competition or external event context anywhere in the application, metadata, or documentation. The platform presents exclusively as a premier luxury wedding management agency.

## DEC-004: Touch-Friendly E-Signature and Storage Lifecycle
- **Context:** Clients frequently review agreements and execute contracts from mobile devices (390px viewports).
- **Decision:** Implemented HTML5 canvas touch signature pad via `signature_pad` with dual verification (typed legal name + explicit consent checkbox). Upon execution, the signature data is timestamped, attached with signer IP/user-agent metadata, and marked immutable.

## DEC-005: Agreement Gate for Client Portal
- **Context:** Luxury planning agency intellectual property (vendor shortlists, negotiated pricing, floor layouts) must not leak before contract execution.
- **Decision:** Implemented the "Agreement Gate" at both UI and database levels. Vendor shortlists and floor plans remain locked and visually obscured with an instructive banner until `agreements.status === 'signed'`. Database RLS policies strictly forbid client reads to vendor quotes until the agreement condition evaluates to true.
