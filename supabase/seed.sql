-- ==============================================================================
-- VIVONA — Static Reference Seed (Packages, Catalog, Task Templates)
-- ==============================================================================

-- 1. PACKAGES
INSERT INTO public.packages (id, slug, name, type, tagline, description, starting_price_paise, inclusions, display_order, is_active)
VALUES
(
  'a1111111-1111-1111-1111-111111111111',
  'full-service',
  'Full-Service Royal Wedding',
  'full_service',
  'Complete 3-Day Wedding Architecture & White-Glove Production in Rajasthan',
  'End-to-end management spanning bespoke heritage theme design, palace venue curation, 18+ vendor RFQ negotiations, 400+ guest logistics, rehearsal orchestration, and minute-by-minute live day operations.',
  350000000, -- ₹35,00,000 in paise
  '[
    "Full wedding concept, mood boards and palace decor styling",
    "Comprehensive vendor curation, RFQ bidding and contract management",
    "Staged 3-day guest hospitality, luxury airport transfers and room drops",
    "Dedicated lead planner + 3 on-site coordinators throughout the season",
    "Minute-by-minute live digital console and vendor check-in tracking",
    "Post-wedding itemized settlement and audit reconciliation"
  ]'::jsonb,
  1,
  true
),
(
  'a2222222-2222-2222-2222-222222222222',
  'day-of',
  'Partial & Big-Day Orchestration',
  'day_of',
  'Precision On-Site Operations, Vendor Check-in & Live Flow Management',
  'Designed for couples who have booked key vendors but require a rigorous operations team to take over 4 weeks prior: vendor synchronization, arrival enforcement, incident mitigation, and seamless day-of execution.',
  120000000, -- ₹12,00,000 in paise
  '[
    "Handover and vendor synchronization 30 days prior to event",
    "Master minute-by-minute event schedule and procession cues",
    "Live on-site check-in board with automated late detection",
    "On-ground lead coordinator and rapid incident response team",
    "Guest reception coordination and family procession timing",
    "Post-event vendor clear-up and asset return supervision"
  ]'::jsonb,
  2,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  starting_price_paise = EXCLUDED.starting_price_paise,
  inclusions = EXCLUDED.inclusions;

-- 2. SERVICE CATALOG
INSERT INTO public.service_catalog (category, name, description, base_price_paise, unit_label, min_guests, max_guests)
VALUES
('venue', 'Heritage Palace & Haveli Curation', 'Securing prime heritage locations in Udaipur and Jaipur including lake palace lawns and banquet havelis.', 150000000, 'venue', 200, 1000),
('catering', 'Royal Rajputana & Global Gastronomy', '3-day multi-cuisine gourmet spread (Rajasthani Thali, Awadhi Dum, Pan-Asian, Continental) with live stations.', 350000, 'plate', 100, 1500),
('decor', 'Grand Mandap & Thematic Floral Architecture', 'Imported exotic florals, palace lighting, royal canopies, chandeliers, and custom stage carpentry.', 180000000, 'setup', 200, 1000),
('entertainment', 'Symphonic Sangeet & Folk Troupe', 'Curated celebrity DJ, live percussionists, Rajasthani Manganiyar folk singers, and sound/light engineering.', 75000000, 'package', NULL, NULL),
('photography', 'Cinematic Wedding Film & Royal Portraiture', 'Editorial team with drones, prime lenses, same-day teaser delivery, and archival leather albums.', 90000000, 'package', NULL, NULL),
('makeup', 'Bridal & Groom Couture Styling', 'Celebrity bridal hair and HD airbrush makeup for all ceremonies with personal draper.', 30000000, 'service', NULL, NULL),
('logistics', 'Luxury Chauffeur Fleet & Airport Hospitality', 'Fleet of luxury sedans and vintage royal procession cars with dedicated airport concierge desk.', 60000000, 'fleet', NULL, NULL)
ON CONFLICT DO NOTHING;

-- 3. TASK TEMPLATES (30+ for Full-Service, 15 for Day-of)
-- Full-Service Templates
INSERT INTO public.task_templates (package_type, phase, title, description, offset_days, priority, default_owner_role, display_order)
VALUES
-- Pre-Wedding Phase (Full-Service)
('full_service', 'pre_wedding', 'Initial Couple Vision & Theme Blueprint', 'Define royal Rajasthan aesthetic, color palette and ceremony guidelines.', -90, 'high', 'lead_planner', 1),
('full_service', 'pre_wedding', 'Palace Venue Contract & Booking Deposit', 'Execute agreement with heritage property and secure ceremony dates.', -85, 'critical', 'lead_planner', 2),
('full_service', 'pre_wedding', 'Issue Catering RFQ to Shortlisted Caterers', 'Send structured menu requirement and per-plate tender to 3 caterers.', -80, 'high', 'lead_planner', 3),
('full_service', 'pre_wedding', 'Catering Tasting & Menu Selection', 'Conduct tasting session for couple and finalize per-plate menu selection.', -70, 'high', 'lead_planner', 4),
('full_service', 'pre_wedding', 'Decor & Floral Architectural 3D Renders', 'Finalize stage layout, mandap florals and palace lighting simulations.', -65, 'medium', 'lead_planner', 5),
('full_service', 'pre_wedding', 'Photographer & Cinematography Crew Briefing', 'Confirm shot list, drone permits, and lighting requirements.', -60, 'medium', 'coordinator', 6),
('full_service', 'pre_wedding', 'Sound, Light & Entertainment Contractor Lock', 'Finalize stage AV, generator backups, and artist tech riders.', -55, 'high', 'coordinator', 7),
('full_service', 'pre_wedding', 'Bridal Makeup & Trousseau Schedule', 'Lock artist call-times for Mehendi, Sangeet and Wedding ceremonies.', -50, 'medium', 'coordinator', 8),
('full_service', 'pre_wedding', 'Guest Room Inventory & Room Drops Setup', 'Map 400+ guest allocations across heritage suites and prepare welcome hampers.', -45, 'medium', 'assistant', 9),
('full_service', 'pre_wedding', 'Luxury Airport Transfer Logistics Matrix', 'Coordinate flight arrival lists with chauffeur fleet.', -40, 'medium', 'assistant', 10),
('full_service', 'pre_wedding', 'Ceremony Priest & Ritual Material Check', 'Review samagri list, havan setup, and priest movement timings.', -35, 'medium', 'coordinator', 11),
('full_service', 'pre_wedding', 'Draft Minute-by-Minute Master Timeline', 'Assemble run-of-show with bride and groom families.', -30, 'high', 'lead_planner', 12),
('full_service', 'pre_wedding', 'Collect Advance Payment Milestone (30%)', 'Confirm second staged milestone receipt and reconcile vendor balances.', -30, 'critical', 'lead_planner', 13),
('full_service', 'pre_wedding', 'Security, Valet & Fire Safety Permits', 'Obtain local authorities permits and inspect emergency fire exits.', -20, 'high', 'coordinator', 14),
('full_service', 'pre_wedding', 'Vendor Production Site Recce', 'On-ground walkthrough with decorators, caterers and sound engineers.', -14, 'high', 'lead_planner', 15),

-- Day 1: Mehendi
('full_service', 'mehendi', 'Inspect Mehendi Cabana & Floral Backdrop', 'Verify marigold installations, low seating cushions and shade sails.', -2, 'high', 'coordinator', 16),
('full_service', 'mehendi', 'Check-in Mehendi Artists & Henna Cones', 'Verify arrival of 12 henna artists and guest seating station.', -2, 'medium', 'assistant', 17),
('full_service', 'mehendi', 'Traditional Street Food & Chaat Station Check', 'Verify live station hygiene, temperature and server uniforms.', -2, 'high', 'coordinator', 18),
('full_service', 'mehendi', 'Folk Troupe Soundcheck & Welcome Dholis', 'Conduct mic check for Manganiyar singers and greet guests at portico.', -2, 'medium', 'assistant', 19),

-- Day 2: Sangeet
('full_service', 'sangeet', 'Sangeet Stage AV & Truss Rigging Inspection', 'Sign off on LED screen pixel-mapping, audio line arrays, and stage safety.', -1, 'critical', 'lead_planner', 20),
('full_service', 'sangeet', 'Family Dance Rehearsal Run-Through', 'Queue audio tracks with DJ and run through family choreography entries.', -1, 'high', 'coordinator', 21),
('full_service', 'sangeet', 'Bar Counter Inventory & Royal Mixology Check', 'Audit beverage glassware, ice dry-storage, and garnish quality.', -1, 'medium', 'coordinator', 22),
('full_service', 'sangeet', 'Late Night Buffet & Midnight Snack Setup', 'Coordinate midnight food replenishment with catering captain.', -1, 'medium', 'assistant', 23),

-- Day 3: Wedding Day & Reception
('full_service', 'wedding_day', 'Mandap Construction & Sacred Fire Setup', 'Verify 4-pillar floral mandap, samagri trays, and airflow for smoke.', 0, 'critical', 'lead_planner', 24),
('full_service', 'wedding_day', 'Baraat Procession, Vintage Car & Band Alignment', 'Coordinate vintage car arrival, brass band, safa tying crew and dholis.', 0, 'critical', 'lead_planner', 25),
('full_service', 'wedding_day', 'Varmala Stage & Cold Pyro Coordination', 'Coordinate bride reveal walk, music cues, and electronic cold pyro safely.', 0, 'high', 'coordinator', 26),
('full_service', 'wedding_day', 'Royal Banquet Line Inspection', 'Verify silver service banquet, 400+ guest covers, and food replenishment.', 0, 'high', 'coordinator', 27),
('full_service', 'wedding_day', 'Pheras Seating & Family Support', 'Ensure parents, priest and immediate relatives are comfortably situated.', 0, 'high', 'assistant', 28),
('full_service', 'reception', 'Vidaai Car Floral Decoration & Luggage Dispatch', 'Decorate departure car and dispatch couple luggage to presidential suite.', 0, 'high', 'assistant', 29),

-- Post-Wedding
('full_service', 'post_wedding', 'Collect Final Client Milestone & Settle Vendors', 'Reconcile receipts, bill variances, approved extras, and vendor balance dues.', 3, 'critical', 'lead_planner', 30),
('full_service', 'post_wedding', 'Palace Venue Deposit Return & Damage Inspection', 'Joint walkthrough with venue general manager to recover security deposit.', 5, 'medium', 'lead_planner', 31),
('full_service', 'post_wedding', 'Deliver Raw Photo Teasers & Thank You Notes', 'Coordinate client social media assets with cinematography team.', 7, 'medium', 'assistant', 32);

-- Day-of Templates (15 tasks)
INSERT INTO public.task_templates (package_type, phase, title, description, offset_days, priority, default_owner_role, display_order)
VALUES
('day_of', 'pre_wedding', 'Collect Existing Vendor Contracts & Contact List', 'Import all couple-contracted vendors into Vivona contact ledger.', -28, 'critical', 'lead_planner', 1),
('day_of', 'pre_wedding', 'Build Master Production Schedule', 'Consolidate 18 vendor call-times and delivery schedules into single run-of-show.', -21, 'high', 'lead_planner', 2),
('day_of', 'pre_wedding', 'Conduct Venue Walkthrough & Loading Dock Review', 'Check generator hookups, freight elevator rules, and venue curfew policies.', -14, 'high', 'coordinator', 3),
('day_of', 'pre_wedding', 'Vendor Final Confirmation Calls', 'Confirm arrival time, crew headcounts, and vehicle numbers with all vendors.', -7, 'high', 'coordinator', 4),
('day_of', 'pre_wedding', 'Emergency Contingency Kit Assembly', 'Pack bridal sewing kits, medical supplies, wireless radios, and backup mic batteries.', -2, 'medium', 'assistant', 5),
('day_of', 'wedding_day', 'Morning Venue Opening & Loading Supervision', 'Check in early setup crews for florists, AV engineers, and caterers.', 0, 'high', 'coordinator', 6),
('day_of', 'wedding_day', 'Live Vendor Check-In Tracking', 'Record server timestamps on arrival board and monitor grace period alerts.', 0, 'critical', 'coordinator', 7),
('day_of', 'wedding_day', 'Bridal Suite Check-in & Makeup Timing Watch', 'Ensure bridal styling stays strictly on schedule for reveal photography.', 0, 'high', 'assistant', 8),
('day_of', 'wedding_day', 'Baraat Assembly & Safa Tying Station', 'Manage guest turban tying station and line up procession.', 0, 'high', 'coordinator', 9),
('day_of', 'wedding_day', 'Varmala Music & Flower Petal Cueing', 'Distribute rose petals to guests and trigger varmala background score.', 0, 'high', 'assistant', 10),
('day_of', 'wedding_day', 'Mandap Pheras Timekeeper', 'Liaise gently with priest to ensure auspicious muhurat timeline is respected.', 0, 'high', 'lead_planner', 11),
('day_of', 'wedding_day', 'Buffet Opening & Dinner Headcount Verification', 'Coordinate with banquet captain on guest count pacing and plate counts.', 0, 'high', 'coordinator', 12),
('day_of', 'wedding_day', 'Vidaai Coordination & Transport', 'Organize family procession, vidaai vehicle, and luggage transfer.', 0, 'high', 'assistant', 13),
('day_of', 'post_wedding', 'Oversee Venue Teardown & Clear-up', 'Ensure all rental decor and AV gear are safely de-rigged without venue damage.', 1, 'high', 'coordinator', 14),
('day_of', 'post_wedding', 'Vendor Timesheet & Day-of Log Handoff', 'Compile signed delivery slips, incident notes, and timesheets for admin.', 2, 'medium', 'lead_planner', 15);
