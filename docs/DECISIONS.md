# Architectural and Design Decisions (Vivona)

## DEC-001: UI Ideology Adaptation from Orvane
- **Context:** Orvane established a clean, production-ready web application architecture (accessible semantic tokens, responsive mobile-first adapters, state-timeline steppers, status chips, clean dialog/sheet ergonomics, zero gratuitous animations).
- **Decision:** Vivona adopts Orvane's core **UI engineering patterns** (declarative status indicators, mobile-first cards-over-tables, strict WCAG AA contrast, semantic color tokens, structured layout shells) while implementing Vivona's distinct luxury Rajasthani brand design system:
  - **Color Palette:** Ivory (`#FBF7F0`), Maroon (`#6B1D2A`), Antique Gold (`#C8A24A`), Charcoal (`#1F1A17`), Sage (`#6F8F72`), Terracotta (`#B5533C`).
  - **Typography:** Cormorant Garamond for display/headings, Inter for UI and body text.
  - **Geometry:** 12px border radius, 8pt spacing system.
  - **Brand Identity:** Typographic "Vivona" with gold knot glyph icon (`<Logo />`).

## DEC-002: Single-Agency Architecture
- **Context:** The problem represents one luxury wedding planning agency operating in Jaipur and Udaipur with ~25 weddings/season.
- **Decision:** Strictly single-tenant. No multi-agency overhead. All resources associate with `wedding_id`.
