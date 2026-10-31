import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const DATABASE_URL =
  process.env.DATABASE_SERVICE_URL ||
  "postgres://vivona_service:ChangeMe_Service#2026@127.0.0.1:5432/vivona";

const sql = postgres(DATABASE_URL);

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
  console.log("🌸 Seeding 25 Season Weddings for Vivona via local PostgreSQL...");

  const allProfiles = await sql`SELECT id, full_name, hourly_rate_paise, role FROM public.profiles`;
  const vendors = await sql`SELECT id, name, category, rating FROM public.vendors WHERE is_active = true`;
  const packages = await sql`SELECT id, slug, name, starting_price_paise FROM public.packages`;

  if (!allProfiles.length || !vendors.length) {
    console.error("Required seed accounts not found. Run `pnpm db:seed` first.");
    return;
  }

  const employeeNames = ["Ananya Sharma", "Vikramaditya Singh", "Meera Shekhawat"];
  const clientNames = ["Rohan & Priyamvada", "Kabir & Alankrita", "Siddharth & Radhika"];

  let employees = allProfiles.filter((p) => employeeNames.includes(p.full_name) || p.role === "employee");
  let clients = allProfiles.filter((p) => clientNames.includes(p.full_name) || p.role === "client");

  if (employees.length === 0) employees = allProfiles.filter((p) => p.role !== "client");
  if (clients.length === 0) clients = allProfiles.filter((p) => p.role === "client");

  const fullPkg = packages.find((p) => p.slug === "full-service") || packages[0];
  const dayPkg = packages.find((p) => p.slug === "day-of") || packages[1] || fullPkg;

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
    const isFullService = i % 4 !== 3;
    const chosenPkg = isFullService ? fullPkg : dayPkg;

    const eventDayOffset = 14 + i * 5;
    const startDate = new Date(Date.now() + eventDayOffset * 86400000).toISOString().split("T")[0];
    const endDate = new Date(Date.now() + (eventDayOffset + 2) * 86400000).toISOString().split("T")[0];

    const budgetPaise = isFullService
      ? BigInt(1200000000 + (i % 6) * 250000000)
      : BigInt(450000000 + (i % 4) * 150000000);

    const guestCount = 250 + (i % 5) * 75;

    let status = "planning";
    if (i === 0) status = "live";
    else if (i < 3) status = "planning";
    else if (i > 20) status = "completed";

    const [wedding] = await sql`
      INSERT INTO public.weddings (
        code, client_id, package_id, title, venue, city, start_date, end_date,
        guest_count_planned, status, budget_paise, notes
      ) VALUES (
        ${weddingCode}, ${client.id}, ${chosenPkg.id}, ${coupleName + " Royal Wedding"},
        ${venueObj.name}, ${venueObj.city}, ${startDate}, ${endDate},
        ${guestCount}, ${status}, ${budgetPaise.toString()}, ${"VIP multi-day destination wedding at " + venueObj.name}
      )
      ON CONFLICT (code) DO UPDATE SET
        status = EXCLUDED.status,
        budget_paise = EXCLUDED.budget_paise
      RETURNING id
    `;

    const weddingId = wedding.id;

    // Team assignments
    await sql`
      INSERT INTO public.wedding_assignments (wedding_id, employee_id, role_on_wedding)
      VALUES (${weddingId}, ${leadPlanner.id}, 'lead_planner')
      ON CONFLICT (wedding_id, employee_id) DO NOTHING
    `;
    await sql`
      INSERT INTO public.wedding_assignments (wedding_id, employee_id, role_on_wedding)
      VALUES (${weddingId}, ${assistant.id}, 'coordinator')
      ON CONFLICT (wedding_id, employee_id) DO NOTHING
    `;

    // Message thread
    let [thread] = await sql`
      SELECT id FROM public.message_threads WHERE wedding_id = ${weddingId}
    `;
    if (!thread) {
      [thread] = await sql`
        INSERT INTO public.message_threads (wedding_id, client_id)
        VALUES (${weddingId}, ${client.id})
        RETURNING id
      `;

      await sql`
        INSERT INTO public.messages (thread_id, sender_id, body)
        VALUES
          (${thread.id}, ${leadPlanner.id}, ${"Namaste! I am " + leadPlanner.full_name + ", your Lead Wedding Planner. Our team is active on your wedding console."}),
          (${thread.id}, ${client.id}, ${"Hello " + leadPlanner.full_name + ", thrilled to collaborate! Looking forward to reviewing the final plans."})
      `;
    }

    // Tasks
    const taskList = isFullService ? FULL_SERVICE_TASKS : FULL_SERVICE_TASKS.slice(10, 25);
    for (let idx = 0; idx < taskList.length; idx++) {
      const t = taskList[idx];
      let tStage = "to_plan";
      if (status === "live" || status === "completed") {
        tStage = idx < taskList.length - 4 ? "done" : idx < taskList.length - 2 ? "in_progress" : "to_plan";
      } else if (idx < 6) {
        tStage = "done";
      } else if (idx < 12) {
        tStage = "in_progress";
      }

      const dueDate = new Date(Date.now() + t.daysOffset * 86400000).toISOString().split("T")[0];
      const completedAt = tStage === "done" ? new Date().toISOString() : null;

      await sql`
        INSERT INTO public.tasks (
          wedding_id, owner_id, phase, title, stage, priority, due_date, completed_at
        ) VALUES (
          ${weddingId}, ${idx % 2 === 0 ? leadPlanner.id : assistant.id},
          ${t.phase}, ${t.title}, ${tStage}, ${t.priority}, ${dueDate}, ${completedAt}
        )
      `;
    }

    // Schedule entries
    for (let idx = 0; idx < SCHEDULE_ITEMS.length; idx++) {
      const s = SCHEDULE_ITEMS[idx];
      const sStatus = i === 0 && idx === 1 ? "in_progress" : idx === 0 ? "completed" : "upcoming";
      await sql`
        INSERT INTO public.schedule_entries (
          wedding_id, day_number, event_date, start_time, end_time, title, location, owner_id, status
        ) VALUES (
          ${weddingId}, 1, ${startDate}, ${s.start}, ${s.end}, ${s.title}, ${s.loc},
          ${idx % 2 === 0 ? leadPlanner.id : assistant.id}, ${sStatus}
        )
      `;
    }

    // Vendors & Checkins
    const caterer = cateringVendors[i % cateringVendors.length] || vendors[0];
    const decorator = decorVendors[i % decorVendors.length] || vendors[1];
    const sound = soundVendors[i % soundVendors.length] || vendors[3];

    const agreedCateringPaise = BigInt(guestCount * 320000);
    const agreedDecorPaise = BigInt(350000000);
    const agreedSoundPaise = BigInt(80000000);

    const [wvCaterer] = await sql`
      INSERT INTO public.wedding_vendors (
        wedding_id, vendor_id, category, agreed_amount_paise, service_date, expected_arrival_at
      ) VALUES (
        ${weddingId}, ${caterer.id}, 'catering', ${agreedCateringPaise.toString()}, ${startDate}, ${startDate + "T11:00:00Z"}
      ) RETURNING id
    `;

    const [wvDecor] = await sql`
      INSERT INTO public.wedding_vendors (
        wedding_id, vendor_id, category, agreed_amount_paise, service_date, expected_arrival_at
      ) VALUES (
        ${weddingId}, ${decorator.id}, 'decor', ${agreedDecorPaise.toString()}, ${startDate}, ${startDate + "T08:00:00Z"}
      ) RETURNING id
    `;

    const [wvSound] = await sql`
      INSERT INTO public.wedding_vendors (
        wedding_id, vendor_id, category, agreed_amount_paise, service_date, expected_arrival_at
      ) VALUES (
        ${weddingId}, ${sound.id}, 'entertainment', ${agreedSoundPaise.toString()}, ${startDate}, ${startDate + "T14:00:00Z"}
      ) RETURNING id
    `;

    await sql`
      INSERT INTO public.vendor_checkins (
        wedding_id, wedding_vendor_id, vendor_id, expected_at, arrived_at, grace_minutes, status
      ) VALUES (
        ${weddingId}, ${wvCaterer.id}, ${caterer.id}, ${startDate + "T11:00:00Z"}, ${startDate + "T10:45:00Z"}, 15, 'arrived'
      )
    `;

    await sql`
      INSERT INTO public.vendor_checkins (
        wedding_id, wedding_vendor_id, vendor_id, expected_at, arrived_at, grace_minutes, status, notes
      ) VALUES (
        ${weddingId}, ${wvDecor.id}, ${decorator.id}, ${startDate + "T08:00:00Z"}, ${startDate + "T08:25:00Z"}, 15, 'late', 'Delayed by road blockade near Amber Fort.'
      )
    `;

    await sql`
      INSERT INTO public.vendor_checkins (
        wedding_id, wedding_vendor_id, vendor_id, expected_at, grace_minutes, status
      ) VALUES (
        ${weddingId}, ${wvSound.id}, ${sound.id}, ${startDate + "T14:00:00Z"}, 15, 'pending'
      )
    `;

    // Incidents
    if (i % 3 === 0) {
      await sql`
        INSERT INTO public.incidents (
          wedding_id, title, severity, description, owner_id, status, resolution, resolved_at
        ) VALUES (
          ${weddingId}, 'Backup generator automatic transfer switch fault', 'high',
          'Primary power fluctuation triggered DG backup; automatic switch tripped. Technician dispatched.',
          ${leadPlanner.id}, 'resolved', 'Replaced 63A circuit breaker within 12 minutes. Power restored to stage and chillers.',
          NOW()
        )
      `;
    }

    // Milestones
    const totalPaiseNum = Number(budgetPaise);
    const bookingPaise = Math.round(totalPaiseNum * 0.2);
    const advancePaise = Math.round(totalPaiseNum * 0.3);
    const finalPaise = totalPaiseNum - bookingPaise - advancePaise;

    const [mBooking] = await sql`
      INSERT INTO public.payment_milestones (
        wedding_id, kind, title, due_date, percentage, amount_paise, paid_amount_paise, status
      ) VALUES (
        ${weddingId}, 'booking', 'Booking Commitment Deposit (20%)',
        ${new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]},
        20, ${bookingPaise}, ${bookingPaise}, 'paid'
      ) RETURNING id
    `;

    const [mAdvance] = await sql`
      INSERT INTO public.payment_milestones (
        wedding_id, kind, title, due_date, percentage, amount_paise, paid_amount_paise, status
      ) VALUES (
        ${weddingId}, 'advance', 'Advance Production Milestone (30%)',
        ${new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0]},
        30, ${advancePaise}, ${status === "completed" || status === "live" ? advancePaise : 0},
        ${status === "completed" || status === "live" ? "paid" : "pending"}
      ) RETURNING id
    `;

    await sql`
      INSERT INTO public.payment_milestones (
        wedding_id, kind, title, due_date, percentage, amount_paise, paid_amount_paise, status
      ) VALUES (
        ${weddingId}, 'final', 'Final Reconciled Settlement (50%)',
        ${endDate}, 50, ${finalPaise}, ${status === "completed" ? finalPaise : 0},
        ${status === "completed" ? "paid" : "pending"}
      )
    `;

    // Client receipts
    await sql`
      INSERT INTO public.client_receipts (
        wedding_id, milestone_id, amount_paise, payment_method, reference, idempotency_key
      ) VALUES (
        ${weddingId}, ${mBooking.id}, ${bookingPaise}, 'bank_transfer',
        ${"NEFT-VIV-" + weddingCode + "-01"}, ${"idemp-cr-" + weddingCode + "-01"}
      )
    `;

    if (status === "completed" || status === "live") {
      await sql`
        INSERT INTO public.client_receipts (
          wedding_id, milestone_id, amount_paise, payment_method, reference, idempotency_key
        ) VALUES (
          ${weddingId}, ${mAdvance.id}, ${advancePaise}, 'rtgs',
          ${"RTGS-VIV-" + weddingCode + "-02"}, ${"idemp-cr-" + weddingCode + "-02"}
        )
      `;
    }

    // Timesheets
    await sql`
      INSERT INTO public.timesheets (wedding_id, employee_id, date, hours, hourly_rate_paise, notes)
      VALUES
        (${weddingId}, ${leadPlanner.id}, ${startDate}, 14.5, ${Number(leadPlanner.hourly_rate_paise) || 150000}, 'On-site lead orchestration from Baraat assembly to dinner wrap.'),
        (${weddingId}, ${assistant.id}, ${startDate}, 12.0, ${Number(assistant.hourly_rate_paise) || 120000}, 'Vendor arrival enforcement, mandap sound check, and family coordination.')
    `;
  }

  await sql.end();
  console.log("✨ Successfully seeded 25 Season Weddings with full operational & financial records into local PostgreSQL!");
}

seedSeason()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal seed error:", err);
    process.exit(1);
  });
