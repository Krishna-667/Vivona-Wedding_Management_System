import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const VENUES = [
  { name: "Rambagh Palace Grounds", city: "Jaipur" },
  { name: "Jai Mahal Palace Sunken Gardens", city: "Jaipur" },
  { name: "City Palace Zenana Mahal", city: "Udaipur" },
  { name: "Jagmandir Island Palace", city: "Udaipur" },
  { name: "The Oberoi Udaivilas Terraces", city: "Udaipur" },
  { name: "Fairmont Palace Ballroom", city: "Jaipur" },
  { name: "Samode Palace Heritage Courtyard", city: "Jaipur" },
  { name: "Leela Palace Udaipur Waterfront", city: "Udaipur" },
];

const COUPLES = [
  "Rohan & Priyamvada",
  "Kabir & Alankrita",
  "Siddharth & Radhika",
  "Aditya & Sanjana",
  "Devansh & Tanya",
  "Aarav & Meera",
  "Raghav & Ishani",
  "Vivaan & Ananya",
  "Karan & Natasha",
  "Arjun & Dia",
  "Dhruv & Rhea",
  "Nikhil & Tara",
  "Yuvraj & Simran",
  "Rishi & Pooja",
  "Samar & Shivani",
  "Harsh & Kriti",
  "Varun & Sonakshi",
  "Gautam & Mallika",
  "Kunal & Aditi",
  "Shaurya & Mahira",
  "Reyansh & Avni",
  "Veer & Kiara",
  "Madhav & Trisha",
  "Ayush & Nitya",
  "Pranav & Sanya",
];

const FULL_SERVICE_TASKS = [
  { title: "Heritage concept mood boards & palette approval", phase: "pre_wedding", priority: "critical", daysOffset: -90 },
  { title: "Execute venue licensing, sound permits & heritage clearances", phase: "pre_wedding", priority: "critical", daysOffset: -85 },
  { title: "Dispatch 3-caterer RFP tender with per-plate dietary specifications", phase: "pre_wedding", priority: "high", daysOffset: -80 },
  { title: "Conduct tasting session & lock live counter menu with chosen caterer", phase: "pre_wedding", priority: "high", daysOffset: -70 },
  { title: "Structural truss and mandap engineering blueprint sign-off", phase: "pre_wedding", priority: "high", daysOffset: -65 },
  { title: "Guest accommodation room blocks & VIP suite assignment", phase: "pre_wedding", priority: "medium", daysOffset: -60 },
  { title: "Airport luxury fleet logistics & transfer schedule manifest", phase: "pre_wedding", priority: "medium", daysOffset: -50 },
  { title: "Sound and lighting acoustic mapping with DJ & live orchestra", phase: "pre_wedding", priority: "medium", daysOffset: -45 },
  { title: "Deliver customized welcome hampers & wedding itineraries to suites", phase: "pre_wedding", priority: "medium", daysOffset: -30 },
  { title: "Rehearsal dinner run-through with couple & immediate family", phase: "pre_wedding", priority: "high", daysOffset: -10 },
  { title: "Mehendi lounge canopy rigging and floral swing installation", phase: "mehendi", priority: "high", daysOffset: -2 },
  { title: "Mehendi artists team check-in and briefing (12 artists)", phase: "mehendi", priority: "medium", daysOffset: -2 },
  { title: "Live Chaat & street food counters readiness and hygiene audit", phase: "mehendi", priority: "high", daysOffset: -2 },
  { title: "Folk dancers & acoustic musicians stage management", phase: "mehendi", priority: "medium", daysOffset: -2 },
  { title: "Sangeet LED screen calibration and audiovisual soundcheck", phase: "sangeet", priority: "critical", daysOffset: -1 },
  { title: "Family dance choreography cue sheet alignment with DJ console", phase: "sangeet", priority: "high", daysOffset: -1 },
  { title: "Bar inventory audit, mixologist station lock & luxury glassware set", phase: "sangeet", priority: "high", daysOffset: -1 },
  { title: "Late-night midnight snack buffet deployment & replenishment", phase: "sangeet", priority: "medium", daysOffset: -1 },
  { title: "Mandap fresh floral installation and Vedic sacred fire setup", phase: "wedding_day", priority: "critical", daysOffset: 0 },
  { title: "Bridal suite makeup, hair and safa tying team coordination", phase: "wedding_day", priority: "high", daysOffset: 0 },
  { title: "Royal Baraat vintage car arrival, dhol ensemble & royal retinue", phase: "wedding_day", priority: "critical", daysOffset: 0 },
  { title: "Milni ceremony welcome garlands & rosewater attar station", phase: "wedding_day", priority: "high", daysOffset: 0 },
  { title: "Jaimala hydraulic stage elevation test & cold pyrotechnics cues", phase: "wedding_day", priority: "critical", daysOffset: 0 },
  { title: "Live video feed transmission & drone aerial filming coordination", phase: "wedding_day", priority: "medium", daysOffset: 0 },
  { title: "Royal Pheras ceremony seating, priest protocol & havan oversight", phase: "wedding_day", priority: "critical", daysOffset: 0 },
  { title: "Grand Royal Banquet service execution & VIP escort management", phase: "reception", priority: "critical", daysOffset: 0 },
  { title: "Cake cutting ceremony & live jazz/sufi band audio engineering", phase: "reception", priority: "high", daysOffset: 0 },
  { title: "Family photo portraits coordination on main palace steps", phase: "reception", priority: "medium", daysOffset: 0 },
  { title: "Bidai ceremony floral petal distribution & getaway escort", phase: "reception", priority: "critical", daysOffset: 0 },
  { title: "Post-event vendor clear-up, rental asset handover & security audit", phase: "post_wedding", priority: "high", daysOffset: 1 },
  { title: "Attributable vendor bills reconciliation & final ledger audit", phase: "post_wedding", priority: "critical", daysOffset: 3 },
  { title: "Client feedback debrief & raw cinematography asset delivery", phase: "post_wedding", priority: "medium", daysOffset: 7 },
];

const SCHEDULE_ITEMS = [
  { start: "15:00", end: "16:30", title: "Royal Baraat Assembly & Vintage Car Procession", loc: "Palace Forecourt" },
  { start: "16:30", end: "17:15", title: "Milni Welcoming & Rosewater Attar Ceremony", loc: "Grand Gateway" },
  { start: "17:30", end: "18:15", title: "Jaimala Celebration & Cold Pyro Pyrotechnics", loc: "Central Mandap Stage" },
  { start: "18:30", end: "20:00", title: "Vedic Pheras & Sacred Fire Ceremony", loc: "Lakeside Pavilion" },
  { start: "20:30", end: "23:30", title: "Royal Dinner Banquet & Live Sufi Performance", loc: "Grand Ballroom Lawn" },
];

async function seedSeason() {
  console.log("🌸 Seeding 25 Season Weddings for Vivona...");

  // 1. Fetch reference data
  const [{ data: allProfiles }, { data: vendors }, { data: packages }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, hourly_rate_paise, role"),
    supabase.from("vendors").select("id, name, category, rating").eq("is_active", true),
    supabase.from("packages").select("id, slug, name, starting_price_paise"),
  ]);

  if (!allProfiles?.length || !vendors?.length) {
    console.error("Required seed accounts not found. Run `pnpm db:seed` first.");
    return;
  }

  const employeeNames = ["Ananya Sharma", "Vikramaditya Singh", "Meera Shekhawat"];
  const clientNames = ["Rohan & Priyamvada", "Kabir & Alankrita", "Siddharth & Radhika"];

  let employees = allProfiles.filter((p) => employeeNames.includes(p.full_name) || p.role === "employee");
  let clients = allProfiles.filter((p) => clientNames.includes(p.full_name) || p.role === "client");

  // Fallbacks if specific names not matched
  if (employees.length === 0) employees = allProfiles.slice(1, 4);
  if (clients.length === 0) clients = allProfiles.slice(4);

  const fullPkg = packages?.find((p) => p.slug === "full-service") || packages?.[0];
  const dayPkg = packages?.find((p) => p.slug === "day-of") || packages?.[1] || fullPkg;

  const cateringVendors = vendors.filter((v) => v.category === "catering");
  const decorVendors = vendors.filter((v) => v.category === "decor");
  const photoVendors = vendors.filter((v) => v.category === "photography");
  const soundVendors = vendors.filter((v) => v.category === "entertainment");

  for (let i = 0; i < 25; i++) {
    const codeNum = (i + 1).toString().padStart(3, "0");
    const weddingCode = `VIV-2026-${codeNum}`;
    const coupleName = COUPLES[i];
    const venueObj = VENUES[i % VENUES.length];
    const client = clients[i % clients.length];
    const leadPlanner = employees[i % employees.length];
    const assistant = employees[(i + 1) % employees.length];
    const isFullService = i % 4 !== 3; // 75% full service, 25% day-of
    const chosenPkg = isFullService ? fullPkg : dayPkg;

    // Dates spread across the season (Nov 2026 to Mar 2027)
    const eventDayOffset = 14 + i * 5;
    const startDate = new Date(Date.now() + eventDayOffset * 86400000).toISOString().split("T")[0];
    const endDate = new Date(Date.now() + (eventDayOffset + 2) * 86400000).toISOString().split("T")[0];

    // Budgets between ₹45 Lakhs and ₹2.5 Crores
    const budgetPaise = isFullService
      ? BigInt(1200000000 + (i % 6) * 250000000) // ₹1.2 Cr to ₹2.45 Cr
      : BigInt(450000000 + (i % 4) * 150000000);  // ₹45 Lakhs to ₹90 Lakhs

    const guestCount = 250 + (i % 5) * 75;

    // Status: some live, some planning, some completed
    let status: "planning" | "live" | "completed" | "settled" = "planning";
    if (i === 0) status = "live";
    else if (i < 3) status = "planning";
    else if (i > 20) status = "completed";

    // Insert or update wedding
    const { data: wedding, error: wedErr } = await supabase
      .from("weddings")
      .upsert(
        {
          code: weddingCode,
          client_id: client.id,
          package_id: chosenPkg?.id,
          title: `${coupleName} Royal Wedding`,
          venue: venueObj.name,
          city: venueObj.city,
          start_date: startDate,
          end_date: endDate,
          guest_count_planned: guestCount,
          status,
          budget_paise: Number(budgetPaise),
          notes: `VIP multi-day destination wedding at ${venueObj.name}.`,
        },
        { onConflict: "code" }
      )
      .select("id")
      .single();

    if (wedErr || !wedding) {
      console.error(`Error inserting wedding ${weddingCode}:`, wedErr);
      continue;
    }

    const weddingId = wedding.id;

    // 2. Assign Team
    await supabase.from("wedding_assignments").upsert(
      [
        {
          wedding_id: weddingId,
          employee_id: leadPlanner.id,
          role_on_wedding: "lead_planner",
        },
        {
          wedding_id: weddingId,
          employee_id: assistant.id,
          role_on_wedding: "coordinator",
        },
      ],
      { onConflict: "wedding_id,employee_id" }
    );

    // 3. Message Thread & Initial Chat
    const { data: thread } = await supabase
      .from("message_threads")
      .upsert({ wedding_id: weddingId, client_id: client.id }, { onConflict: "wedding_id" })
      .select("id")
      .single();

    if (thread) {
      await supabase.from("messages").insert([
        {
          thread_id: thread.id,
          sender_id: leadPlanner.id,
          body: `Namaste ${coupleName.split(" ")[0]}! I am ${leadPlanner.full_name}, your assigned Lead Wedding Planner. Our operations team is active on your wedding console.`,
        },
        {
          thread_id: thread.id,
          sender_id: client.id,
          body: `Hello ${leadPlanner.full_name}, thrilled to collaborate! Looking forward to reviewing the final caterer and decor line items.`,
        },
      ]);
    }

    // 4. Seed Tasks (32 tasks for Full-Service, 15 for Day-Of)
    const taskList = isFullService ? FULL_SERVICE_TASKS : FULL_SERVICE_TASKS.slice(10, 25);
    const taskRows = taskList.map((t, idx) => {
      let stage: "to_plan" | "in_progress" | "blocked" | "done" = "to_plan";
      if (status === "live" || status === "completed") {
        stage = idx < taskList.length - 4 ? "done" : idx < taskList.length - 2 ? "in_progress" : "to_plan";
      } else if (idx < 6) {
        stage = "done";
      } else if (idx < 12) {
        stage = "in_progress";
      }

      return {
        wedding_id: weddingId,
        owner_id: idx % 2 === 0 ? leadPlanner.id : assistant.id,
        phase: t.phase,
        title: t.title,
        stage,
        priority: t.priority,
        due_date: new Date(Date.now() + t.daysOffset * 86400000).toISOString().split("T")[0],
        completed_at: stage === "done" ? new Date().toISOString() : null,
      };
    });

    await supabase.from("tasks").insert(taskRows);

    // 5. Seed Schedule Entries
    const scheduleRows = SCHEDULE_ITEMS.map((s, idx) => ({
      wedding_id: weddingId,
      day_number: 1,
      event_date: startDate,
      start_time: s.start,
      end_time: s.end,
      title: s.title,
      location: s.loc,
      owner_id: idx % 2 === 0 ? leadPlanner.id : assistant.id,
      status: i === 0 && idx === 1 ? ("in_progress" as const) : idx === 0 ? ("completed" as const) : ("upcoming" as const),
    }));
    await supabase.from("schedule_entries").insert(scheduleRows);

    // 6. Link Wedding Vendors & Checkins
    const caterer = cateringVendors[i % cateringVendors.length] || vendors[0];
    const decorator = decorVendors[i % decorVendors.length] || vendors[1];
    const photographer = photoVendors[i % photoVendors.length] || vendors[2];
    const sound = soundVendors[i % soundVendors.length] || vendors[3];

    const agreedCateringPaise = BigInt(guestCount * 320000); // ₹3,200/plate
    const agreedDecorPaise = BigInt(350000000); // ₹35 Lakhs
    const agreedPhotoPaise = BigInt(120000000); // ₹12 Lakhs
    const agreedSoundPaise = BigInt(80000000);  // ₹8 Lakhs

    const { data: wvCaterer } = await supabase
      .from("wedding_vendors")
      .insert({
        wedding_id: weddingId,
        vendor_id: caterer.id,
        category: "catering",
        agreed_amount_paise: Number(agreedCateringPaise),
        service_date: startDate,
        expected_arrival_at: `${startDate}T11:00:00Z`,
      })
      .select("id")
      .single();

    const { data: wvDecor } = await supabase
      .from("wedding_vendors")
      .insert({
        wedding_id: weddingId,
        vendor_id: decorator.id,
        category: "decor",
        agreed_amount_paise: Number(agreedDecorPaise),
        service_date: startDate,
        expected_arrival_at: `${startDate}T08:00:00Z`,
      })
      .select("id")
      .single();

    const { data: wvSound } = await supabase
      .from("wedding_vendors")
      .insert({
        wedding_id: weddingId,
        vendor_id: sound.id,
        category: "entertainment",
        agreed_amount_paise: Number(agreedSoundPaise),
        service_date: startDate,
        expected_arrival_at: `${startDate}T14:00:00Z`,
      })
      .select("id")
      .single();

    // Checkins
    if (wvCaterer) {
      await supabase.from("vendor_checkins").insert({
        wedding_id: weddingId,
        wedding_vendor_id: wvCaterer.id,
        vendor_id: caterer.id,
        expected_at: `${startDate}T11:00:00Z`,
        arrived_at: `${startDate}T10:45:00Z`,
        grace_minutes: 15,
        status: "arrived",
      });
    }

    if (wvDecor) {
      await supabase.from("vendor_checkins").insert({
        wedding_id: weddingId,
        wedding_vendor_id: wvDecor.id,
        vendor_id: decorator.id,
        expected_at: `${startDate}T08:00:00Z`,
        arrived_at: `${startDate}T08:25:00Z`,
        grace_minutes: 15,
        status: "late",
        notes: "Delayed by morning road blockade near Amber Fort.",
      });
    }

    if (wvSound) {
      await supabase.from("vendor_checkins").insert({
        wedding_id: weddingId,
        wedding_vendor_id: wvSound.id,
        vendor_id: sound.id,
        expected_at: `${startDate}T14:00:00Z`,
        grace_minutes: 15,
        status: "pending",
      });
    }

    // 7. Incidents
    if (i % 3 === 0) {
      await supabase.from("incidents").insert({
        wedding_id: weddingId,
        title: "Backup generator automatic transfer switch fault",
        severity: "high",
        description: "Primary power fluctuation triggered DG backup; automatic switch tripped. Technician dispatched.",
        owner_id: leadPlanner.id,
        status: "resolved",
        resolution: "Replaced 63A circuit breaker within 12 minutes. Power restored to stage and chillers.",
        resolved_at: new Date().toISOString(),
      });
    }

    // 8. Financial Milestones (20 / 30 / 50)
    const totalPaise = Number(budgetPaise);
    const bookingPaise = Math.round(totalPaise * 0.2);
    const advancePaise = Math.round(totalPaise * 0.3);
    const finalPaise = totalPaise - bookingPaise - advancePaise;

    const { data: mBooking } = await supabase
      .from("payment_milestones")
      .insert({
        wedding_id: weddingId,
        kind: "booking",
        title: "Booking Commitment Deposit (20%)",
        due_date: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
        percentage: 20,
        amount_paise: bookingPaise,
        paid_amount_paise: bookingPaise,
        status: "paid",
      })
      .select("id")
      .single();

    const { data: mAdvance } = await supabase
      .from("payment_milestones")
      .insert({
        wedding_id: weddingId,
        kind: "advance",
        title: "Advance Production Milestone (30%)",
        due_date: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0],
        percentage: 30,
        amount_paise: advancePaise,
        paid_amount_paise: status === "completed" || status === "live" ? advancePaise : 0,
        status: status === "completed" || status === "live" ? "paid" : "pending",
      })
      .select("id")
      .single();

    await supabase.from("payment_milestones").insert({
      wedding_id: weddingId,
      kind: "final",
      title: "Final Reconciled Settlement (50%)",
      due_date: endDate,
      percentage: 50,
      amount_paise: finalPaise,
      paid_amount_paise: status === "completed" ? finalPaise : 0,
      status: status === "completed" ? "paid" : "pending",
    });

    // 9. Client Receipts
    if (mBooking) {
      await supabase.from("client_receipts").insert({
        wedding_id: weddingId,
        milestone_id: mBooking.id,
        amount_paise: bookingPaise,
        payment_method: "bank_transfer",
        reference: `NEFT-VIV-${weddingCode}-01`,
        idempotency_key: `idemp-cr-${weddingCode}-01`,
      });
    }

    if (mAdvance && (status === "completed" || status === "live")) {
      await supabase.from("client_receipts").insert({
        wedding_id: weddingId,
        milestone_id: mAdvance.id,
        amount_paise: advancePaise,
        payment_method: "rtgs",
        reference: `RTGS-VIV-${weddingCode}-02`,
        idempotency_key: `idemp-cr-${weddingCode}-02`,
      });
    }

    // 10. Vendor Bills & Payments
    if (wvCaterer) {
      const billAmount = Number(agreedCateringPaise) + (i % 2 === 0 ? 19200000 : 0); // extra 60 plates on even weddings
      const { data: bill } = await supabase
        .from("vendor_bills")
        .insert({
          wedding_id: weddingId,
          wedding_vendor_id: wvCaterer.id,
          bill_number: `BILL-CAT-${codeNum}`,
          amount_paise: billAmount,
          status: "received",
          bill_date: startDate,
          variance_reason: i % 2 === 0 ? "60 extra plates for extended family reception" : null,
        })
        .select("id")
        .single();

      // Advance payment to caterer (30%)
      const advancePaid = Math.round(Number(agreedCateringPaise) * 0.3);
      await supabase.from("vendor_payments").insert({
        wedding_id: weddingId,
        wedding_vendor_id: wvCaterer.id,
        bill_id: bill?.id || null,
        amount_paise: advancePaid,
        payment_method: "bank_transfer",
        reference: `PAY-CAT-${weddingCode}-ADV`,
        idempotency_key: `idemp-vp-${weddingCode}-cat`,
      });
    }

    // 11. Extra Charges (e.g. 60 extra plates)
    if (i % 2 === 0) {
      await supabase.from("extra_charges").insert({
        wedding_id: weddingId,
        requested_by: leadPlanner.id,
        kind: "catering_headcount",
        title: "60 Extra Guest Dinner Plates",
        qty: 60,
        unit_price_paise: 320000,
        total_paise: 19200000,
        reason: "Client added 60 additional VIP guests for the reception dinner at ₹3,200/plate.",
        status: "approved",
        approved_by: employees[0].id,
        approved_at: new Date().toISOString(),
      });
    }

    // 12. Employee Timesheets
    await supabase.from("timesheets").insert([
      {
        wedding_id: weddingId,
        employee_id: leadPlanner.id,
        date: startDate,
        hours: 14.5,
        hourly_rate_paise: Number(leadPlanner.hourly_rate_paise) || 150000,
        notes: "On-site lead orchestration from Baraat assembly to dinner wrap.",
      },
      {
        wedding_id: weddingId,
        employee_id: assistant.id,
        date: startDate,
        hours: 12.0,
        hourly_rate_paise: Number(assistant.hourly_rate_paise) || 120000,
        notes: "Vendor arrival enforcement, mandap sound check, and family coordination.",
      },
    ]);
  }

  console.log("✨ Successfully seeded 25 Season Weddings with full operational & financial records!");
}

seedSeason()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal seed error:", err);
    process.exit(1);
  });
