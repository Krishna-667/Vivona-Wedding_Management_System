import postgres from "postgres";
import { faker } from "@faker-js/faker";
import { hash } from "@node-rs/argon2";
import * as dotenv from "dotenv";
import {
  encryptField,
  computeBlindIndex,
} from "../src/lib/crypto/field-encryption";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Seed deterministically per spec
faker.seed(2026);

const DATABASE_URL =
  process.env.DATABASE_SERVICE_URL ||
  "postgres://vivona_service:ChangeMe_Service#2026@127.0.0.1:5432/vivona";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";

const CITIES = ["Jaipur", "Udaipur", "Jodhpur", "Pushkar", "Jaisalmer"];
const THEMES = [
  "Royal Rajputana Heritage",
  "Mewar Lake Palace Romance",
  "Desert Oasis Chic",
  "Vintage Shekhawati Grandeur",
  "Contemporary Mughal Twilight",
  "Hawa Mahal Sunset Gold",
];

const VENDOR_CATEGORIES = [
  "catering",
  "decor",
  "venue",
  "photography",
  "entertainment",
  "makeup",
  "logistics",
  "other",
] as const;

async function seedDemoData() {
  console.log("🌱 Starting Deterministic 300+ Records Demo Seed (Target: >=5,000 rows)...");
  const startTime = Date.now();

  const sql = postgres(DATABASE_URL);

  const isReset = process.argv.includes("--reset");
  if (isReset) {
    if (
      process.env.APP_ENV === "production" ||
      (!DATABASE_URL.includes("127.0.0.1") && !DATABASE_URL.includes("localhost"))
    ) {
      throw new Error("Destructive reset refused on non-local or production environment!");
    }
    console.log("🧹 Performing clean reset of demo tables (--reset)...");
    await sql`
      TRUNCATE TABLE
        public.timesheets,
        public.vendor_payments,
        public.vendor_bills,
        public.client_receipts,
        public.payment_milestones,
        public.proposals,
        public.messages,
        public.message_threads,
        public.incidents,
        public.vendor_checkins,
        public.schedule_entries,
        public.tasks,
        public.wedding_vendors,
        public.quote_lines,
        public.vendor_quotes,
        public.rfqs,
        public.wedding_assignments,
        public.weddings,
        public.enquiry_activities,
        public.enquiries,
        public.vendors
      CASCADE
    `;
    console.log("✓ Demo tables truncated cleanly.");
  }

  const passwordHash = await hash(DEMO_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  // 1. Core Team Profiles (1 Admin, 6 Employees)
  console.log("👤 Provisioning Admin & 6 Employee Planners...");
  const employeesData = [
    { email: "admin@vivona.demo", name: "Devraj Rathore", role: "admin", phone: "+91 98290 11001", rate: 250000 },
    { email: "planner1@vivona.demo", name: "Ananya Sharma", role: "employee", phone: "+91 98290 22002", rate: 150000 },
    { email: "planner2@vivona.demo", name: "Vikramaditya Singh", role: "employee", phone: "+91 98290 33003", rate: 160000 },
    { email: "planner3@vivona.demo", name: "Meera Shekhawat", role: "employee", phone: "+91 98290 44004", rate: 140000 },
    { email: "planner4@vivona.demo", name: "Aditya Verma", role: "employee", phone: "+91 98290 55005", rate: 135000 },
    { email: "planner5@vivona.demo", name: "Radhika Nair", role: "employee", phone: "+91 98290 66006", rate: 145000 },
    { email: "planner6@vivona.demo", name: "Kabir Sen", role: "employee", phone: "+91 98290 77007", rate: 130000 },
  ];

  const employeeProfiles: Array<{ id: string; name: string; role: string; rate: number }> = [];

  for (const emp of employeesData) {
    const encPhone = encryptField("profiles", "phone", emp.phone);
    const phoneBidx = computeBlindIndex(emp.phone);

    const [p] = await sql`
      INSERT INTO public.profiles (email, full_name, role, phone, phone_bidx, is_active, hourly_rate_paise)
      VALUES (${emp.email}, ${emp.name}, ${emp.role}, ${encPhone}, ${phoneBidx}, true, ${emp.rate})
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        phone_bidx = EXCLUDED.phone_bidx,
        hourly_rate_paise = EXCLUDED.hourly_rate_paise
      RETURNING id, full_name, role, hourly_rate_paise
    `;

    await sql`
      INSERT INTO private.auth_credentials (profile_id, password_hash)
      VALUES (${p.id}, ${passwordHash})
      ON CONFLICT (profile_id) DO UPDATE SET password_hash = ${passwordHash}
    `;

    employeeProfiles.push({ id: p.id, name: p.full_name, role: p.role, rate: emp.rate });
  }

  // 2. Provision 45 Client Profiles
  console.log("💍 Provisioning 45 Client Couple Accounts...");
  const clientProfiles: string[] = [];
  for (let i = 1; i <= 45; i++) {
    const email = `couple${i}@vivona.demo`;
    const name = `Couple ${i}: ${faker.person.firstName()} & ${faker.person.firstName()} ${faker.person.lastName()}`;
    const phone = `+91 98${String(i).padStart(2, "0")}0 ${String(1000 + i)}`;
    const encPhone = encryptField("profiles", "phone", phone);
    const phoneBidx = computeBlindIndex(phone);

    const [c] = await sql`
      INSERT INTO public.profiles (email, full_name, role, phone, phone_bidx, is_active)
      VALUES (${email}, ${name}, 'client', ${encPhone}, ${phoneBidx}, true)
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        phone_bidx = EXCLUDED.phone_bidx
      RETURNING id
    `;

    await sql`
      INSERT INTO private.auth_credentials (profile_id, password_hash)
      VALUES (${c.id}, ${passwordHash})
      ON CONFLICT (profile_id) DO UPDATE SET password_hash = ${passwordHash}
    `;

    clientProfiles.push(c.id);
  }

  // 3. Provision 120+ Vendors (with at least 18 Caterers)
  console.log("🥘 Provisioning 120+ Vendors (including >= 18 Luxury Caterers)...");
  const vendorIds: Array<{ id: string; category: string; name: string }> = [];

  for (let i = 1; i <= 125; i++) {
    const category = i <= 20 ? "catering" : VENDOR_CATEGORIES[(i - 20) % VENDOR_CATEGORIES.length];
    const city = CITIES[i % CITIES.length];
    const name =
      category === "catering"
        ? `${faker.company.name()} Royal Catering & Banquet`
        : `${faker.company.name()} ${category.toUpperCase()}`;
    const contactName = faker.person.fullName();
    const phone = `+91 97${String(i).padStart(3, "0")} 5500`;
    const email = `vendor${i}@${category}.vivona.demo`;

    const encPhone = encryptField("vendors", "phone", phone);
    const encEmail = encryptField("vendors", "email", email);
    const phoneBidx = computeBlindIndex(phone);
    const emailBidx = computeBlindIndex(email);

    const [v] = await sql`
      INSERT INTO public.vendors (
        category, name, contact_name, phone, email, phone_bidx, email_bidx, city, rating, is_active
      ) VALUES (
        ${category}, ${name}, ${contactName}, ${encPhone}, ${encEmail}, ${phoneBidx}, ${emailBidx}, ${city}, 4.9, true
      ) RETURNING id, category, name
    `;
    vendorIds.push({ id: v.id, category: v.category, name: v.name });
  }

  // 4. Seed 320+ Enquiries with Authentic Status Mix & Encrypted PII
  console.log("📬 Provisioning 320+ Enquiries with Real CRM Pipeline Mix...");
  const STATUS_DISTRIBUTION: Array<{ status: string; count: number }> = [
    { status: "new", count: 38 }, // ~12%
    { status: "contacted", count: 48 }, // ~15%
    { status: "consultation_scheduled", count: 38 }, // ~12%
    { status: "agreement_sent", count: 26 }, // ~8%
    { status: "agreement_signed", count: 20 }, // ~6%
    { status: "proposal_sent", count: 26 }, // ~8%
    { status: "confirmed", count: 26 }, // ~8%
    { status: "lost", count: 98 }, // ~31%
  ];

  const enquiryIds: Array<{ id: string; status: string; code: string }> = [];
  let enqIndex = 1;

  for (const group of STATUS_DISTRIBUTION) {
    for (let j = 0; j < group.count; j++) {
      const code = `ENQ-2026-${String(enqIndex).padStart(4, "0")}`;
      const city = CITIES[enqIndex % CITIES.length];
      const guests = faker.number.int({ min: 180, max: 750 });
      // ₹40 Lakh to ₹8 Crore in integer paise
      const budgetPaise = BigInt(faker.number.int({ min: 40, max: 800 })) * BigInt(10000000);
      const isCustom = enqIndex % 3 === 0;

      const rawPhone = `+91 99${String(enqIndex).padStart(4, "0")} 1234`;
      const rawEmail = `client.enq${enqIndex}@example.com`;
      const rawNotes = `Confidential client brief for ${guests} guests in ${city}. Focus on Rajputana floral entrance and vintage lighting.`;

      const encPhone = encryptField("enquiries", "contact_phone", rawPhone);
      const encEmail = encryptField("enquiries", "contact_email", rawEmail);
      const encNotes = encryptField("enquiries", "notes", rawNotes);
      const phoneBidx = computeBlindIndex(rawPhone);
      const emailBidx = computeBlindIndex(rawEmail);

      // Stale logic: at least 20 enquiries stale (> 48h)
      const daysAgo = enqIndex <= 20 ? faker.number.int({ min: 3, max: 45 }) : faker.number.int({ min: 0, max: 2 });
      const createdAt = new Date(Date.now() - daysAgo * 86400000);

      const [enq] = await sql`
        INSERT INTO public.enquiries (
          code, source, type, city, guest_count, theme, budget_max_paise, status,
          contact_name, contact_email, contact_phone, contact_email_bidx, contact_phone_bidx,
          notes, created_at, updated_at
        ) VALUES (
          ${code}, 'website', ${isCustom ? "custom" : "package"}, ${city === "Jaipur" || city === "Udaipur" ? city : "Jaipur"},
          ${guests}, ${THEMES[enqIndex % THEMES.length]}, ${budgetPaise}, ${group.status},
          ${faker.person.fullName()}, ${encEmail}, ${encPhone}, ${emailBidx}, ${phoneBidx},
          ${encNotes}, ${createdAt}, ${createdAt}
        )
        ON CONFLICT (code) DO UPDATE SET
          status = EXCLUDED.status,
          contact_email = EXCLUDED.contact_email,
          contact_phone = EXCLUDED.contact_phone,
          contact_email_bidx = EXCLUDED.contact_email_bidx,
          contact_phone_bidx = EXCLUDED.contact_phone_bidx,
          updated_at = EXCLUDED.updated_at
        RETURNING id, status, code
      `;

      enquiryIds.push({ id: enq.id, status: enq.status, code: enq.code });
      enqIndex++;
    }
  }

  // 5. Seed 950+ Enquiry Activities
  console.log("📞 Provisioning 950+ Enquiry CRM Activities & Interaction Logs...");
  let activityCount = 0;
  for (const enq of enquiryIds) {
    const numActs = enq.status === "new" ? 1 : enq.status === "lost" ? 3 : 4;
    for (let a = 0; a < numActs; a++) {
      const actType = a === 0 ? "call" : a === 1 ? "consultation" : a === 2 ? "proposal_review" : "note";
      await sql`
        INSERT INTO public.enquiry_activities (
          enquiry_id, activity_type, description, created_at
        ) VALUES (
          ${enq.id}, ${actType},
          ${`Activity #${a + 1}: Discussed royal venue acoustics and multi-course royal dinner menu for ${enq.code}.`},
          NOW() - (${(numActs - a) * 2} || ' days')::interval
        )
      `;
      activityCount++;
    }
  }

  // 6. Seed 25 Season Weddings
  console.log("👑 Provisioning 25 Signature Season Weddings with RFQs, Quotes, Tasks & Live Ops...");
  const WEDDING_CONFIGS = [
    { code: "VIV-2026-001", couple: "Rohan & Priyamvada", city: "Jaipur", status: "settled", daysOffset: -45, guests: 450, budget: 1800000000 },
    { code: "VIV-2026-002", couple: "Kabir & Alankrita", city: "Udaipur", status: "settled", daysOffset: -30, guests: 400, budget: 2200000000 },
    { code: "VIV-2026-003", couple: "Siddharth & Radhika", city: "Jaipur", status: "settled", daysOffset: -20, guests: 500, budget: 3500000000 },
    { code: "VIV-2026-004", couple: "Aditya & Sanjana", city: "Udaipur", status: "settled", daysOffset: -14, guests: 380, budget: 1900000000 },
    { code: "VIV-2026-005", couple: "Devansh & Tanya", city: "Jaipur", status: "settled", daysOffset: -7, guests: 420, budget: 2400000000 },
    { code: "VIV-2026-006", couple: "Aarav & Meera", city: "Udaipur", status: "settled", daysOffset: -3, guests: 350, budget: 2800000000 },
    // Upcoming Imminent (within 2 weeks)
    { code: "VIV-2026-007", couple: "Raghav & Ishani", city: "Jaipur", status: "live", daysOffset: 1, guests: 480, budget: 3200000000 },
    { code: "VIV-2026-008", couple: "Vivaan & Ananya", city: "Udaipur", status: "live", daysOffset: 5, guests: 400, budget: 2100000000 },
    { code: "VIV-2026-009", couple: "Karan & Natasha", city: "Jaipur", status: "live", daysOffset: 9, guests: 550, budget: 4100000000 },
    { code: "VIV-2026-010", couple: "Arjun & Dia", city: "Udaipur", status: "live", daysOffset: 12, guests: 360, budget: 2600000000 },
    // Planning / Active (15 weddings)
    { code: "VIV-2026-011", couple: "Dhruv & Rhea", city: "Jaipur", status: "planning", daysOffset: 25, guests: 420, budget: 2300000000 },
    { code: "VIV-2026-012", couple: "Nikhil & Tara", city: "Udaipur", status: "planning", daysOffset: 35, guests: 450, budget: 3400000000 },
    { code: "VIV-2026-013", couple: "Yuvraj & Simran", city: "Jaipur", status: "planning", daysOffset: 45, guests: 600, budget: 4800000000 },
    { code: "VIV-2026-014", couple: "Rishi & Pooja", city: "Udaipur", status: "planning", daysOffset: 55, guests: 380, budget: 1950000000 },
    { code: "VIV-2026-015", couple: "Samar & Shivani", city: "Jaipur", status: "planning", daysOffset: 65, guests: 440, budget: 2700000000 },
    { code: "VIV-2026-016", couple: "Harsh & Kriti", city: "Udaipur", status: "planning", daysOffset: 75, guests: 520, budget: 3600000000 },
    { code: "VIV-2026-017", couple: "Varun & Sonakshi", city: "Jaipur", status: "planning", daysOffset: 85, guests: 400, budget: 2250000000 },
    { code: "VIV-2026-018", couple: "Gautam & Mallika", city: "Udaipur", status: "planning", daysOffset: 95, guests: 460, budget: 3100000000 },
    { code: "VIV-2026-019", couple: "Kunal & Aditi", city: "Jaipur", status: "planning", daysOffset: 105, guests: 480, budget: 2900000000 },
    { code: "VIV-2026-020", couple: "Shaurya & Mahira", city: "Udaipur", status: "planning", daysOffset: 115, guests: 390, budget: 2150000000 },
    { code: "VIV-2026-021", couple: "Reyansh & Avni", city: "Jaipur", status: "planning", daysOffset: 125, guests: 540, budget: 4200000000 },
    { code: "VIV-2026-022", couple: "Veer & Kiara", city: "Udaipur", status: "planning", daysOffset: 135, guests: 430, budget: 2800000000 },
    { code: "VIV-2026-023", couple: "Madhav & Trisha", city: "Jaipur", status: "planning", daysOffset: 145, guests: 470, budget: 3300000000 },
    { code: "VIV-2026-024", couple: "Ayush & Nitya", city: "Udaipur", status: "planning", daysOffset: 155, guests: 370, budget: 2050000000 },
    { code: "VIV-2026-025", couple: "Pranav & Sanya", city: "Jaipur", status: "planning", daysOffset: 165, guests: 510, budget: 3750000000 },
  ];

  const caterers = vendorIds.filter((v) => v.category === "catering");

  for (let wIdx = 0; wIdx < WEDDING_CONFIGS.length; wIdx++) {
    const w = WEDDING_CONFIGS[wIdx];
    const clientId = clientProfiles[wIdx % clientProfiles.length];
    const leadPlanner = employeeProfiles[1 + (wIdx % (employeeProfiles.length - 1))];
    const assistantPlanner = employeeProfiles[1 + ((wIdx + 1) % (employeeProfiles.length - 1))];

    const startDate = new Date(Date.now() + w.daysOffset * 86400000).toISOString().split("T")[0];
    const endDate = new Date(Date.now() + (w.daysOffset + 3) * 86400000).toISOString().split("T")[0];

    const [wedding] = await sql`
      INSERT INTO public.weddings (
        code, client_id, enquiry_id, title, city, venue, start_date, end_date, guest_count_planned,
        budget_paise, status, notes
      ) VALUES (
        ${w.code}, ${clientId}, ${enquiryIds[wIdx].id}, ${w.couple + " Luxury Wedding"}, ${w.city},
        ${w.city === "Jaipur" ? "Rambagh Palace" : "The Oberoi Udaivilas"},
        ${startDate}, ${endDate}, ${w.guests}, ${w.budget}, ${w.status},
        ${"Master orchestration plan for " + w.couple}
      )
      ON CONFLICT (code) DO UPDATE SET
        budget_paise = EXCLUDED.budget_paise,
        status = EXCLUDED.status
      RETURNING id
    `;

    const weddingId = wedding.id;

    // Wedding Assignments
    await sql`
      INSERT INTO public.wedding_assignments (wedding_id, employee_id, role_on_wedding)
      VALUES
        (${weddingId}, ${leadPlanner.id}, 'lead_planner'),
        (${weddingId}, ${assistantPlanner.id}, 'coordinator')
      ON CONFLICT DO NOTHING
    `;

    // 7. RFQs & Caterer 3-Quote Tender (1 selected, 2 closed)
    const [rfq] = await sql`
      INSERT INTO public.rfqs (wedding_id, category, status, deadline, requirements)
      VALUES (${weddingId}, 'catering', 'awarded', ${startDate}, ${sql.json({ notes: 'Royal Multi-Course Catering Tender · ' + w.code })})
      RETURNING id
    `;

    const winningCaterer = caterers[wIdx % caterers.length];
    const secondCaterer = caterers[(wIdx + 1) % caterers.length];
    const thirdCaterer = caterers[(wIdx + 2) % caterers.length];

    // Winning Quote
    const winAmount = Math.round(w.budget * 0.28);
    const [winningQuote] = await sql`
      INSERT INTO public.vendor_quotes (rfq_id, vendor_id, status, subtotal_paise, tax_paise, total_paise)
      VALUES (${rfq.id}, ${winningCaterer.id}, 'selected', ${Math.round(winAmount * 0.82)}, ${Math.round(winAmount * 0.18)}, ${winAmount})
      RETURNING id
    `;

    // 2 Closed Quotes
    await sql`
      INSERT INTO public.vendor_quotes (rfq_id, vendor_id, status, subtotal_paise, tax_paise, total_paise)
      VALUES
        (${rfq.id}, ${secondCaterer.id}, 'closed_not_selected', ${Math.round(winAmount * 0.88)}, ${Math.round(winAmount * 0.20)}, ${Math.round(winAmount * 1.08)}),
        (${rfq.id}, ${thirdCaterer.id}, 'closed_not_selected', ${Math.round(winAmount * 0.94)}, ${Math.round(winAmount * 0.21)}, ${Math.round(winAmount * 1.15)})
    `;

    // Quote Lines for winner
    await sql`
      INSERT INTO public.quote_lines (quote_id, label, qty, unit, unit_price_paise, tax_pct, total_paise)
      VALUES
        (${winningQuote.id}, 'Royal Rajputana Welcome Live Counters & Thali', ${w.guests}, 'plate', 450000, 18.0, ${w.guests * 450000}),
        (${winningQuote.id}, 'Mewar Sangeet Multi-Cuisine Gala Dinner Buffet', ${w.guests}, 'plate', 550000, 18.0, ${w.guests * 550000}),
        (${winningQuote.id}, 'Vedic Wedding Sacred Pheras High Tea & Mithai', ${w.guests}, 'plate', 250000, 18.0, ${w.guests * 250000})
    `;

    // Wedding Vendors (18 assigned vendors per wedding)
    const insertedWeddingVendors: Array<{ id: string; vendorId: string }> = [];
    for (let v = 0; v < 18; v++) {
      const selectedVen = vendorIds[v % vendorIds.length];
      const agreedPaise = Math.round((w.budget * 0.04) + (v * 10000000));
      const [wv] = await sql`
        INSERT INTO public.wedding_vendors (wedding_id, vendor_id, category, agreed_amount_paise)
        VALUES (${weddingId}, ${selectedVen.id}, ${selectedVen.category}, ${agreedPaise})
        ON CONFLICT (wedding_id, category, vendor_id) DO UPDATE SET agreed_amount_paise = EXCLUDED.agreed_amount_paise
        RETURNING id
      `;
      insertedWeddingVendors.push({ id: wv.id, vendorId: selectedVen.id });
    }

    // 8. Tasks (32 tasks per wedding, >= 30 required)
    const TASK_STAGES = ["pre_wedding", "mehendi", "sangeet", "wedding_day", "post_wedding"] as const;
    for (let t = 1; t <= 32; t++) {
      const stage = TASK_STAGES[t % TASK_STAGES.length];
      const taskStage = w.status === "settled" ? "done" : t <= 10 ? "done" : "in_progress";
      await sql`
        INSERT INTO public.tasks (wedding_id, title, phase, priority, stage, owner_id, due_date)
        VALUES (
          ${weddingId},
          ${`Task #${t}: Operational check on ${stage} vendor logistics & staging (${w.code})`},
          ${stage},
          ${t % 5 === 0 ? "critical" : t % 2 === 0 ? "high" : "medium"},
          ${taskStage},
          ${leadPlanner.id},
          ${startDate}
        )
      `;
    }

    // 9. Schedule Entries (36 per wedding)
    for (let s = 1; s <= 36; s++) {
      const dayNum = 1 + (s % 3);
      await sql`
        INSERT INTO public.schedule_entries (
          wedding_id, day_number, event_date, start_time, end_time, title, location, owner_id, status
        ) VALUES (
          ${weddingId},
          ${dayNum},
          ${startDate},
          '10:00:00',
          '12:00:00',
          ${`Event #${s}: Ceremony Cue & Staging Protocol (${w.code})`},
          ${w.city === "Jaipur" ? "Zenana Courtyard" : "Waterfront Terraces"},
          ${leadPlanner.id},
          ${w.status === "settled" ? "completed" : "upcoming"}
        )
      `;
    }

    // 10. Vendor Check-ins (18 per wedding, with ~12% late)
    for (let c = 0; c < insertedWeddingVendors.length; c++) {
      const isLate = c % 8 === 0;
      const wv = insertedWeddingVendors[c];
      await sql`
        INSERT INTO public.vendor_checkins (
          wedding_id, wedding_vendor_id, vendor_id, expected_at, arrived_at, grace_minutes, status, notes
        ) VALUES (
          ${weddingId}, ${wv.id}, ${wv.vendorId},
          ${startDate}::date + '10:00:00'::time,
          ${startDate}::date + '10:00:00'::time + (${isLate ? '25 minutes' : '0 minutes'})::interval,
          10,
          ${isLate ? 'late' : 'arrived'},
          ${isLate ? 'Brief delay due to VIP motorcade escort protocol' : 'On-time arrival and briefing'}
        )
      `;
    }

    // 11. Incidents (3 per wedding)
    for (let inc = 1; inc <= 3; inc++) {
      await sql`
        INSERT INTO public.incidents (wedding_id, title, severity, description, owner_id, status, resolution, resolved_at)
        VALUES (
          ${weddingId},
          ${`Incident #${inc}: Generator transfer switch or audio delay (${w.code})`},
          ${inc === 1 ? 'high' : 'medium'},
          ${'Logistics or vendor delay noted and resolved by lead planner on site.'},
          ${leadPlanner.id},
          'resolved',
          'Automatic transfer switch reset and circuit breaker tested.',
          NOW()
        )
      `;
    }

    // 12. Messages & Message Thread (25 messages per wedding)
    const [thread] = await sql`
      INSERT INTO public.message_threads (wedding_id, client_id)
      VALUES (${weddingId}, ${clientId})
      RETURNING id
    `;

    for (let m = 1; m <= 25; m++) {
      const isClientSender = m % 2 === 0;
      const senderId = isClientSender ? clientId : leadPlanner.id;
      const msgPlain = isClientSender
        ? `Hi Ananya, could you please confirm the flower shipment arrival for the Jaimala stage? (#${m})`
        : `Confirmed! 500 kg fresh Udaipur white lotuses have arrived at the cold storage depot. (#${m})`;
      const encBody = encryptField("messages", "body", msgPlain);

      await sql`
        INSERT INTO public.messages (thread_id, sender_id, body, created_at)
        VALUES (${thread.id}, ${senderId}, ${encBody}, NOW() - (${26 - m} || ' hours')::interval)
      `;
    }

    // 13. Financial: Proposal, Proposal Lines, Agreements, Milestones, Receipts, Bills, Payments, Timesheets
    const [prop] = await sql`
      INSERT INTO public.proposals (
        enquiry_id, client_id, status, valid_until, subtotal_paise, tax_paise, total_paise
      ) VALUES (
        ${enquiryIds[wIdx].id}, ${clientId}, 'accepted', ${endDate},
        ${Math.round(w.budget * 0.82)}, ${Math.round(w.budget * 0.18)}, ${w.budget}
      ) RETURNING id
    `;

    // Proposal Lines
    const lineCatering = Math.round(w.budget * 0.40);
    const lineDecor = Math.round(w.budget * 0.35);
    const lineEntertainment = w.budget - lineCatering - lineDecor;
    await sql`
      INSERT INTO public.proposal_lines (
        proposal_id, category, label, qty, unit, unit_price_paise, tax_pct, total_paise
      ) VALUES
        (${prop.id}, 'catering', 'Royal Multi-Cuisine Banqueting & Hospitality', 1, 'service', ${lineCatering}, 18.0, ${lineCatering}),
        (${prop.id}, 'decor', 'Palace Courtyard & Mandap Architecture Production', 1, 'service', ${lineDecor}, 18.0, ${lineDecor}),
        (${prop.id}, 'entertainment', 'Sangeet Symphony, Live Orchestra & Folk Retinue', 1, 'service', ${lineEntertainment}, 18.0, ${lineEntertainment})
    `;

    // Agreement
    await sql`
      INSERT INTO public.agreements (
        wedding_id, enquiry_id, client_id, version, body_markdown, status,
        signed_at, signed_by_name, signature_path
      ) VALUES (
        ${weddingId}, ${enquiryIds[wIdx].id}, ${clientId}, 1,
        'Master Luxury Wedding Planning & Production Agreement between Vivona and the Client.',
        ${w.status === "settled" ? 'signed' : 'sent'},
        ${w.status === "settled" ? startDate : null},
        ${w.status === "settled" ? w.couple : null},
        ${w.status === "settled" ? 'agreements/' + weddingId + '/signature.png' : null}
      )
    `;

    const m20 = Math.round(w.budget * 0.20);
    const m30 = Math.round(w.budget * 0.30);
    const m50 = w.budget - m20 - m30; // Exact integer paise sum!

    const [milestone1] = await sql`
      INSERT INTO public.payment_milestones (wedding_id, kind, title, percentage, amount_paise, paid_amount_paise, due_date, status)
      VALUES (${weddingId}, 'booking', 'Booking Commitment Advance', 20, ${m20}, ${m20}, ${startDate}, 'paid')
      RETURNING id
    `;

    const [milestone2] = await sql`
      INSERT INTO public.payment_milestones (wedding_id, kind, title, percentage, amount_paise, paid_amount_paise, due_date, status)
      VALUES (${weddingId}, 'advance', 'Production & Vendor Retainer', 30, ${m30}, ${w.status === "settled" ? m30 : 0}, ${startDate}, ${w.status === "settled" ? "paid" : "pending"})
      RETURNING id
    `;

    await sql`
      INSERT INTO public.payment_milestones (wedding_id, kind, title, percentage, amount_paise, paid_amount_paise, due_date, status)
      VALUES (${weddingId}, 'final', 'Final Settlement & Post-Wedding Audit', 50, ${m50}, ${w.status === "settled" ? m50 : 0}, ${endDate}, ${w.status === "settled" ? "paid" : "pending"})
    `;

    // Client Receipts (with idempotency key)
    const recRef1 = encryptField("client_receipts", "reference", `UTR-NEFT-${w.code}-01`);
    await sql`
      INSERT INTO public.client_receipts (wedding_id, milestone_id, amount_paise, payment_method, reference, idempotency_key)
      VALUES (${weddingId}, ${milestone1.id}, ${m20}, 'bank_transfer', ${recRef1}, ${'idemp-cr-' + w.code + '-01'})
    `;

    if (w.status === "settled") {
      const recRef2 = encryptField("client_receipts", "reference", `UTR-RTGS-${w.code}-02`);
      await sql`
        INSERT INTO public.client_receipts (wedding_id, milestone_id, amount_paise, payment_method, reference, idempotency_key)
        VALUES (${weddingId}, ${milestone2.id}, ${m30}, 'rtgs', ${recRef2}, ${'idemp-cr-' + w.code + '-02'})
      `;
    }

    // Vendor Bills & Payments (16 bills per wedding, never overpaid)
    for (let b = 0; b < 16; b++) {
      const wv = insertedWeddingVendors[b % insertedWeddingVendors.length];
      const billPaise = Math.round(w.budget * 0.035);
      const isPaid = w.status === "settled" || b <= 8;

      const [bill] = await sql`
        INSERT INTO public.vendor_bills (
          wedding_id, wedding_vendor_id, bill_number, amount_paise, bill_date, due_date, status
        ) VALUES (
          ${weddingId}, ${wv.id}, ${'BILL-' + w.code + '-' + String(b + 1).padStart(2, '0')},
          ${billPaise}, ${startDate}, ${startDate}, ${isPaid ? 'paid' : 'verified'}
        ) RETURNING id
      `;

      if (isPaid) {
        const payRef = encryptField("vendor_payments", "reference", `RTGS-PAY-${w.code}-${b + 1}`);
        await sql`
          INSERT INTO public.vendor_payments (
            wedding_id, wedding_vendor_id, bill_id, amount_paise, payment_method, reference, idempotency_key
          ) VALUES (
            ${weddingId}, ${wv.id}, ${bill.id}, ${billPaise}, 'bank_transfer', ${payRef},
            ${'idemp-vp-' + w.code + '-' + (b + 1)}
          )
        `;
      }
    }

    // Extra Charges (2 per wedding = 50 total >= 45 required)
    await sql`
      INSERT INTO public.extra_charges (
        wedding_id, requested_by, kind, title, qty, unit_price_paise, total_paise, reason, status
      ) VALUES
        (${weddingId}, ${leadPlanner.id}, 'generators', 'Additional 125kVA Soundproof Generator', 1, 4500000, 4500000, 'Required for live acoustic symphony stage extension', 'approved'),
        (${weddingId}, ${assistantPlanner.id}, 'extra_guests', 'VIP Terrace Late Covers (+25 Guests)', 25, 450000, 11250000, 'Additional high-profile guest entourage covers requested by family', 'requested')
    `;

    // Timesheets (36 entries per wedding)
    for (let ts = 1; ts <= 36; ts++) {
      const staff = employeeProfiles[1 + (ts % (employeeProfiles.length - 1))];
      await sql`
        INSERT INTO public.timesheets (wedding_id, employee_id, date, hours, hourly_rate_paise, notes)
        VALUES (
          ${weddingId}, ${staff.id}, ${startDate}, 8.0, ${staff.rate},
          ${'Orchestration, vendor compliance and live cueing for ' + w.code}
        )
      `;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Deterministic Seed Completed in ${durationSec}s!`);
  await sql.end();
}

seedDemoData().catch((err) => {
  console.error("Fatal seed demo error:", err);
  process.exit(1);
});
