import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

async function seed() {
  const connectionString =
    process.env.DATABASE_SERVICE_URL ||
    "postgres://vivona_service:ChangeMe_Service#2026@127.0.0.1:5432/vivona";

  console.log("Seeding local Vivona PostgreSQL database via vivona_service...");
  const sql = postgres(connectionString, { max: 1 });

  try {
    // 1. Seed Static Reference Data from supabase/seed.sql
    const seedSqlPath = path.resolve(process.cwd(), "supabase", "seed.sql");
    if (fs.existsSync(seedSqlPath)) {
      console.log("Applying static reference seed (packages, catalog, task templates)...");
      const seedContent = fs.readFileSync(seedSqlPath, "utf-8");
      await sql.unsafe(seedContent);
    }

    // 2. Seed Demo Accounts
    const demoPassword = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";
    const hashedPassword = await hash(demoPassword, ARGON2_OPTIONS);

    const demoUsers = [
      {
        id: "d1111111-1111-1111-1111-111111111111",
        email: "admin@vivona.demo",
        role: "admin",
        full_name: "Devraj Rathore",
        phone: "+91 98290 11001",
        hourly_rate_paise: 250000,
      },
      {
        id: "d2222222-2222-2222-2222-222222222222",
        email: "planner1@vivona.demo",
        role: "employee",
        full_name: "Ananya Sharma",
        phone: "+91 98290 22002",
        hourly_rate_paise: 120000,
      },
      {
        id: "d3333333-3333-3333-3333-333333333333",
        email: "planner2@vivona.demo",
        role: "employee",
        full_name: "Kabir Singh",
        phone: "+91 98290 33003",
        hourly_rate_paise: 100000,
      },
      {
        id: "d4444444-4444-4444-4444-444444444444",
        email: "planner3@vivona.demo",
        role: "employee",
        full_name: "Pooja Mehta",
        phone: "+91 98290 44004",
        hourly_rate_paise: 90000,
      },
      {
        id: "d5555555-5555-5555-5555-555555555555",
        email: "couple1@vivona.demo",
        role: "client",
        full_name: "Aditya & Meera Singhania",
        phone: "+91 98111 55005",
        hourly_rate_paise: 0,
      },
      {
        id: "d6666666-6666-6666-6666-666666666666",
        email: "couple2@vivona.demo",
        role: "client",
        full_name: "Vikram & Roshni Agarwal",
        phone: "+91 98111 66006",
        hourly_rate_paise: 0,
      },
      {
        id: "d7777777-7777-7777-7777-777777777777",
        email: "couple3@vivona.demo",
        role: "client",
        full_name: "Rohan & Simran Kapoor",
        phone: "+91 98111 77007",
        hourly_rate_paise: 0,
      },
    ];

    console.log("Seeding demo user accounts & argon2id credentials...");
    for (const u of demoUsers) {
      await sql`
        INSERT INTO public.profiles (
          id, email, role, full_name, phone, hourly_rate_paise, is_active
        ) VALUES (
          ${u.id}, ${u.email}, ${u.role}, ${u.full_name}, ${u.phone}, ${u.hourly_rate_paise}, true
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          is_active = true
      `;

      await sql`
        INSERT INTO private.auth_credentials (profile_id, password_hash)
        VALUES (${u.id}, ${hashedPassword})
        ON CONFLICT (profile_id) DO UPDATE SET
          password_hash = EXCLUDED.password_hash
      `;
    }

    // 3. Seed 18 Vendors across categories (including 3 caterers)
    console.log("Seeding verified vendor directory (18 vendors across 8 categories)...");
    const vendors = [
      // 3 Caterers
      { id: "e1111111-1111-1111-1111-111111111111", category: "catering", name: "Royal Rajputana Caterers", contact: "Maharaj Bhawani Singh", phone: "+91 98291 00001", email: "rajputana@vendors.vivona.demo", city: "Jaipur", rating: 4.9 },
      { id: "e1111111-1111-1111-1111-111111111112", category: "catering", name: "The Mewar Banquet & Gourmet Co.", contact: "Vikramaditya Mewar", phone: "+91 98291 00002", email: "mewar@vendors.vivona.demo", city: "Udaipur", rating: 4.8 },
      { id: "e1111111-1111-1111-1111-111111111113", category: "catering", name: "Heritage Rasoi & Live Sigdi", contact: "Chef Arvind Solanki", phone: "+91 98291 00003", email: "rasoi@vendors.vivona.demo", city: "Jaipur", rating: 4.7 },
      // Decor
      { id: "e2222222-2222-2222-2222-222222222221", category: "decor", name: "Mandap & Marigold Studio", contact: "Sunil Saini", phone: "+91 98291 00004", email: "mandap@vendors.vivona.demo", city: "Jaipur", rating: 4.9 },
      { id: "e2222222-2222-2222-2222-222222222222", category: "decor", name: "Udaipur Floral Symphony", contact: "Meenakshi Vyas", phone: "+91 98291 00005", email: "floral@vendors.vivona.demo", city: "Udaipur", rating: 4.8 },
      // Photography
      { id: "e3333333-3333-3333-3333-333333333331", category: "photography", name: "Palace Frames Cinematography", contact: "Karan Johar Sharma", phone: "+91 98291 00006", email: "frames@vendors.vivona.demo", city: "Jaipur", rating: 4.9 },
      { id: "e3333333-3333-3333-3333-333333333332", category: "photography", name: "Lakeside Royal Stories", contact: "Arjun Verma", phone: "+91 98291 00007", email: "lakeside@vendors.vivona.demo", city: "Udaipur", rating: 4.8 },
      // Entertainment
      { id: "e4444444-4444-4444-4444-444444444441", category: "entertainment", name: "Desert Dholis & Manganiyar Troupe", contact: "Ustad Gazi Khan", phone: "+91 98291 00008", email: "desert@vendors.vivona.demo", city: "Jaipur", rating: 4.9 },
      { id: "e4444444-4444-4444-4444-444444444442", category: "entertainment", name: "Symphony DJ & Light Rigging", contact: "DJ Nitin", phone: "+91 98291 00009", email: "dj@vendors.vivona.demo", city: "Udaipur", rating: 4.7 },
      // Makeup
      { id: "e5555555-5555-5555-5555-555555555551", category: "makeup", name: "Royal Bridal Artistry by Ritu", contact: "Ritu Chawla", phone: "+91 98291 00010", email: "makeup@vendors.vivona.demo", city: "Jaipur", rating: 4.9 },
      { id: "e5555555-5555-5555-5555-555555555552", category: "makeup", name: "Glamour Rajputana Hair & Drape", contact: "Priyanka Sen", phone: "+91 98291 00011", email: "glamour@vendors.vivona.demo", city: "Udaipur", rating: 4.8 },
      // Logistics
      { id: "e6666666-6666-6666-6666-666666666661", category: "logistics", name: "Heritage Chauffeur & Vintage Fleet", contact: "Suraj Rathore", phone: "+91 98291 00012", email: "fleet@vendors.vivona.demo", city: "Jaipur", rating: 4.8 },
      { id: "e6666666-6666-6666-6666-666666666662", category: "logistics", name: "Udaipur Royal Escorts & Coaches", contact: "Dharmendra Gehlot", phone: "+91 98291 00013", email: "coaches@vendors.vivona.demo", city: "Udaipur", rating: 4.7 },
      // Venue
      { id: "e7777777-7777-7777-7777-777777777771", category: "venue", name: "Rambagh Palace Lawns", contact: "Col. Sangram Singh", phone: "+91 98291 00014", email: "rambagh@vendors.vivona.demo", city: "Jaipur", rating: 5.0 },
      { id: "e7777777-7777-7777-7777-777777777772", category: "venue", name: "Fateh Garh Heritage Fort", contact: "Rana Himmat Singh", phone: "+91 98291 00015", email: "fatehgarh@vendors.vivona.demo", city: "Udaipur", rating: 4.9 },
      // Other
      { id: "e8888888-8888-8888-8888-888888888881", category: "other", name: "Royal Safa & Turban Bandhej Artisans", contact: "Kailash Chhipa", phone: "+91 98291 00016", email: "safa@vendors.vivona.demo", city: "Jaipur", rating: 4.9 },
      { id: "e8888888-8888-8888-8888-888888888882", category: "other", name: "Mithai Mahal Sweets & Hampers", contact: "Gordhan Das", phone: "+91 98291 00017", email: "mithai@vendors.vivona.demo", city: "Jaipur", rating: 4.8 },
      { id: "e8888888-8888-8888-8888-888888888883", category: "other", name: "Imperial Cold Fireworks & Special FX", contact: "Vijay Soni", phone: "+91 98291 00018", email: "pyro@vendors.vivona.demo", city: "Udaipur", rating: 4.7 },
    ];

    for (const v of vendors) {
      await sql`
        INSERT INTO public.vendors (
          id, category, name, contact_name, phone, email, city, rating, is_active
        ) VALUES (
          ${v.id}, ${v.category}, ${v.name}, ${v.contact}, ${v.phone}, ${v.email}, ${v.city}, ${v.rating}, true
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email
      `;
    }

    // 4. Seed Social Proof Entries
    console.log("Seeding verified social proof citations...");
    const socialProofs = [
      {
        platform: "instagram",
        handle: "@royalweddings.jaipur",
        author: "Priya & Siddharth (Rambagh Palace)",
        url: "https://instagram.com/p/DB1111",
        caption: "Vivona turned our Jaipur palace dream into perfection. 400 guests, zero stress, absolute royalty.",
        rating: 5,
        featured: true,
      },
      {
        platform: "google_review",
        handle: "Anand Singhania",
        author: "Anand Singhania (Father of Bride)",
        url: "https://g.page/r/vivona-jaipur/review",
        caption: "Their financial clarity and vendor coordination were impeccable. Not a single rupee unaccounted for.",
        rating: 5,
        featured: true,
      },
      {
        platform: "youtube",
        handle: "Royal Weddings India",
        author: "Aditya & Meera Wedding Film",
        url: "https://youtube.com/watch?v=vivona-demo",
        caption: "A 3-Day royal spectacle at Lake Pichola Udaipur orchestrating 18 vendors in sync.",
        rating: 5,
        featured: true,
      },
    ];

    for (const s of socialProofs) {
      await sql`
        INSERT INTO public.social_proof (
          platform, handle, author_name, post_url, caption, rating, featured
        ) VALUES (
          ${s.platform}, ${s.handle}, ${s.author}, ${s.url}, ${s.caption}, ${s.rating}, ${s.featured}
        )
      `;
    }

    // 5. Seed a Sample Confirmed Wedding with Instant Plan for Aditya & Meera
    console.log("Seeding verified sample wedding for client couple1@vivona.demo...");
    const clientId = "d5555555-5555-5555-5555-555555555555";
    const leadId = "d2222222-2222-2222-2222-222222222222"; // Ananya Sharma

    const [enquiry] = await sql`
      INSERT INTO public.enquiries (
        code, client_id, source, type, package_id, city, preferred_start_date, preferred_end_date,
        guest_count, theme, budget_max_paise, status, contact_name, contact_email, contact_phone
      ) VALUES (
        'ENQ-2026-001', ${clientId}, 'website', 'package', 'a1111111-1111-1111-1111-111111111111',
        'Jaipur', '2026-11-20', '2026-11-23', 450, 'Royal Rajputana Heritage', 450000000,
        'confirmed', 'Aditya & Meera Singhania', 'couple1@vivona.demo', '+91 98111 55005'
      )
      RETURNING id
    `;

    // Proposal
    const [proposal] = await sql`
      INSERT INTO public.proposals (
        enquiry_id, client_id, version, status, valid_until, subtotal_paise, tax_paise, total_paise
      ) VALUES (
        ${enquiry.id}, ${clientId}, 1, 'accepted', '2026-11-30', 380000000, 68400000, 448400000
      )
      RETURNING id
    `;

    // Agreement signed
    await sql`
      INSERT INTO public.agreements (
        enquiry_id, client_id, version, body_markdown, status, signed_at, signed_by_name
      ) VALUES (
        ${enquiry.id}, ${clientId}, 1,
        '# Wedding Services Agreement\n\nParties: Vivona and Aditya & Meera Singhania...\n\nAgreed Budget: INR 4,48,40,000.',
        'signed', NOW(), 'Aditya Singhania'
      )
    `;

    // Call confirm_wedding RPC to generate 30+ instant tasks, milestones, code, message thread
    await sql`SELECT set_config('app.user_id', 'd1111111-1111-1111-1111-111111111111', true)`;
    const [confirmRes] = await sql`
      SELECT public.confirm_wedding(${enquiry.id}, ${leadId}) as res
    `;

    console.log("Confirm wedding RPC result:", confirmRes.res);

    console.log("✓ Seed completed successfully!");
  } finally {
    await sql.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
