import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment.");
  console.log("Provide it in .env.local or via SUPABASE_SERVICE_ROLE_KEY=<key> tsx scripts/seed.ts");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY || "dummy-key", {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const DEMO_USERS = [
  {
    email: "admin@vivona.demo",
    role: "admin",
    full_name: "Devraj Rathore",
    phone: "+91 98290 11001",
    hourly_rate_paise: 0n,
  },
  {
    email: "planner1@vivona.demo",
    role: "employee",
    full_name: "Ananya Sharma",
    phone: "+91 98290 22002",
    hourly_rate_paise: 150000n, // ₹1,500/hr
  },
  {
    email: "planner2@vivona.demo",
    role: "employee",
    full_name: "Vikramaditya Singh",
    phone: "+91 98290 33003",
    hourly_rate_paise: 120000n, // ₹1,200/hr
  },
  {
    email: "planner3@vivona.demo",
    role: "employee",
    full_name: "Meera Shekhawat",
    phone: "+91 98290 44004",
    hourly_rate_paise: 100000n, // ₹1,000/hr
  },
  {
    email: "couple1@vivona.demo",
    role: "client",
    full_name: "Rohan & Priyamvada",
    phone: "+91 98290 55005",
    hourly_rate_paise: 0n,
  },
  {
    email: "couple2@vivona.demo",
    role: "client",
    full_name: "Kabir & Alankrita",
    phone: "+91 98290 66006",
    hourly_rate_paise: 0n,
  },
  {
    email: "couple3@vivona.demo",
    role: "client",
    full_name: "Siddharth & Radhika",
    phone: "+91 98290 77007",
    hourly_rate_paise: 0n,
  },
];

export const DEMO_VENDORS = [
  // 3 Caterers
  {
    category: "catering",
    name: "Royal Rajputana Caterers",
    contact_name: "Maharaj Bhawani Singh",
    phone: "+91 98291 10001",
    email: "bhawani@rajputanacatering.demo",
    city: "Jaipur",
    address: "C-Scheme, Ashok Nagar, Jaipur",
    rating: 4.9,
    notes: "Authentic Mewari royal banquets, live chulha stations and pure saffron sweets.",
  },
  {
    category: "catering",
    name: "Mewar Feast Co",
    contact_name: "Chef Raghuveer Solanki",
    phone: "+91 98291 10002",
    email: "raghuveer@mewarfeast.demo",
    city: "Udaipur",
    address: "Haridas Ji Ki Magri, Udaipur",
    rating: 4.8,
    notes: "Lake palace banquets, fusion Rajasthani-Continental luxury catering.",
  },
  {
    category: "catering",
    name: "Udaivilas Gourmet Catering",
    contact_name: "Chef Arvind Chauhan",
    phone: "+91 98291 10003",
    email: "arvind@udaivilasgourmet.demo",
    city: "Udaipur",
    address: "Pichola Palace Road, Udaipur",
    rating: 5.0,
    notes: "Michelin-caliber culinary directors, Awadhi dum spreads and Japanese robata live bars.",
  },
  // Decorators
  {
    category: "decor",
    name: "Amber Palace Decor & Florals",
    contact_name: "Jitendra Mali",
    phone: "+91 98291 20001",
    email: "jitendra@amberdecor.demo",
    city: "Jaipur",
    address: "Tonk Road, Jaipur",
    rating: 4.9,
    notes: "Mandap architectures, marigold curtains, imported Dutch hydrangeas.",
  },
  {
    category: "decor",
    name: "Lake City Mandap Art",
    contact_name: "Naveen Lodha",
    phone: "+91 98291 20002",
    email: "naveen@lakecitymandap.demo",
    city: "Udaipur",
    address: "Saheli Marg, Udaipur",
    rating: 4.7,
    notes: "Floating lake mandaps and palace mirror pavilions.",
  },
  {
    category: "decor",
    name: "Heritage Canopy Crafters",
    contact_name: "Suresh Saini",
    phone: "+91 98291 20003",
    email: "suresh@heritagecanopy.demo",
    city: "Jaipur",
    address: "Amer Road, Jaipur",
    rating: 4.8,
    notes: "Royal shamiana tents, block-print canopies and brass lanterns.",
  },
  // Photography
  {
    category: "photography",
    name: "Rajasthan Cinematic Studio",
    contact_name: "Aditya Khurana",
    phone: "+91 98291 30001",
    email: "aditya@rajasthancinematic.demo",
    city: "Jaipur",
    address: "Civil Lines, Jaipur",
    rating: 4.9,
    notes: "Signature 8K cinema cameras, aerial FPV drones, and same-day sangeet edits.",
  },
  {
    category: "photography",
    name: "Udaipur Royal Frames",
    contact_name: "Pooja Chhabra",
    phone: "+91 98291 30002",
    email: "pooja@royalframes.demo",
    city: "Udaipur",
    address: "Sukhadia Circle, Udaipur",
    rating: 4.8,
    notes: "Fine art editorial portraiture and archival leather albums.",
  },
  {
    category: "photography",
    name: "Monsoon Heritage Films",
    contact_name: "Karan Johar Sharma",
    phone: "+91 98291 30003",
    email: "karan@monsoonheritage.demo",
    city: "Jaipur",
    address: "Malviya Nagar, Jaipur",
    rating: 4.9,
    notes: "Candid emotional storytelling and documentary wedding films.",
  },
  // Entertainment
  {
    category: "entertainment",
    name: "Manganiyar Symphonic Collective",
    contact_name: "Ustad Gazi Khan",
    phone: "+91 98291 40001",
    email: "gazi@manganiyarcollective.demo",
    city: "Jaipur",
    address: "Sindhi Camp Cultural Colony, Jaipur",
    rating: 5.0,
    notes: "20-piece Manganiyar folk orchestra with khartal, kamayacha and dholak.",
  },
  {
    category: "entertainment",
    name: "Pulse Wave DJ & Acoustic Engineering",
    contact_name: "DJ Varun Malhotra",
    phone: "+91 98291 40002",
    email: "varun@pulsewave.demo",
    city: "Jaipur",
    address: "Vaishali Nagar, Jaipur",
    rating: 4.8,
    notes: "L-Acoustics line arrays, intelligent moving heads and celebrity DJ sets.",
  },
  {
    category: "entertainment",
    name: "Desert Strings Sitar & Shehnai Ensemble",
    contact_name: "Pandit Ramkishan",
    phone: "+91 98291 40003",
    email: "ramkishan@desertstrings.demo",
    city: "Udaipur",
    address: "Fateh Sagar Walk, Udaipur",
    rating: 4.9,
    notes: "Morning pheras shehnai and serene sitar welcoming ragas.",
  },
  // Makeup & Styling
  {
    category: "makeup",
    name: "Rani Sahiba Bridal Couture Makeup",
    contact_name: "Kavita Sethi",
    phone: "+91 98291 50001",
    email: "kavita@ranisahibamakeup.demo",
    city: "Jaipur",
    address: "Raja Park, Jaipur",
    rating: 4.9,
    notes: "Airbrush HD bridal styling, vintage Rajasthani jewellery draping.",
  },
  {
    category: "makeup",
    name: "Lake Palace Glamour Lounge",
    contact_name: "Simran Bhatia",
    phone: "+91 98291 50002",
    email: "simran@lakepalaceglam.demo",
    city: "Udaipur",
    address: "Panchwati, Udaipur",
    rating: 4.8,
    notes: "Red-carpet hair styling, touch-up kits, and groom grooming suites.",
  },
  // Logistics & Welcome
  {
    category: "logistics",
    name: "Rajputana Luxury Chauffeur Fleet",
    contact_name: "Harishankar Meena",
    phone: "+91 98291 60001",
    email: "harish@rajputanaluxury.demo",
    city: "Jaipur",
    address: "Airport Road, Sanganer, Jaipur",
    rating: 4.9,
    notes: "Fleet of 30 Mercedes E-Class, Toyota Vellfires, and uniformed chauffeurs.",
  },
  {
    category: "logistics",
    name: "Mewar Royal Welcome & Vintage Carriages",
    contact_name: "Pratap Dhabhai",
    phone: "+91 98291 60002",
    email: "pratap@mewarwelcome.demo",
    city: "Udaipur",
    address: "City Palace Gate 2, Udaipur",
    rating: 4.8,
    notes: "Baraat vintage Rolls Royce, decorated white mares, and royal brass band.",
  },
  // Venues
  {
    category: "venue",
    name: "Rambagh Heritage Grounds",
    contact_name: "Rajeev Singhal",
    phone: "+91 98291 70001",
    email: "rajeev@rambaghgrounds.demo",
    city: "Jaipur",
    address: "Bhawani Singh Road, Jaipur",
    rating: 5.0,
    notes: "Palace lawns accommodating up to 1,200 guests with heritage facade lighting.",
  },
  {
    category: "venue",
    name: "Fateh Garh Palace Terraces",
    contact_name: "Col. Vikram Rathore",
    phone: "+91 98291 70002",
    email: "vikram@fatehgarhpalace.demo",
    city: "Udaipur",
    address: "Sisarma, Udaipur",
    rating: 4.9,
    notes: "Perched palace terraces with sunset panoramic views over Lake Pichola.",
  },
];

import { DEMO_SOCIAL_PROOF } from "../src/lib/constants/demo-data";
export { DEMO_SOCIAL_PROOF };

async function seed() {
  console.log("=== VIVONA SEED SCRIPT START ===");

  if (!SERVICE_ROLE_KEY) {
    console.log("Skipping Auth User creation because SUPABASE_SERVICE_ROLE_KEY is not set.");
    console.log("To seed auth users, run with valid Supabase service role key.");
    return;
  }

  // 1. Seed Auth Users & Profiles
  console.log(`Seeding ${DEMO_USERS.length} demo users...`);
  const { data: userListData } = await supabase.auth.admin.listUsers();
  const existingUsers = userListData?.users || [];

  for (const user of DEMO_USERS) {
    // Check if auth user already exists
    const existing = existingUsers.find((u) => u.email === user.email);
    let userId = existing?.id;

    if (!userId) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          phone: user.phone,
        },
      });

      if (createError) {
        console.error(`Failed to create auth user ${user.email}:`, createError.message);
        continue;
      }
      userId = newUser.user.id;
    }

    // Upsert into profiles
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      role: user.role,
      full_name: user.full_name,
      phone: user.phone,
      hourly_rate_paise: user.hourly_rate_paise,
      is_active: true,
    });

    if (profileError) {
      console.error(`Error updating profile for ${user.email}:`, profileError.message);
    } else {
      console.log(`✓ Seeded ${user.role}: ${user.email}`);
    }
  }

  // 2. Seed Vendors
  console.log(`Seeding ${DEMO_VENDORS.length} vendors...`);
  for (const vendor of DEMO_VENDORS) {
    const { data: existingVendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("name", vendor.name)
      .maybeSingle();

    if (existingVendor) {
      await supabase.from("vendors").update(vendor).eq("id", existingVendor.id);
    } else {
      const { error: vendorError } = await supabase.from("vendors").insert(vendor);
      if (vendorError) {
        console.error(`Error inserting vendor ${vendor.name}:`, vendorError.message);
      }
    }
  }
  console.log("✓ Seeded vendors successfully.");

  // 3. Seed Social Proof
  console.log(`Seeding ${DEMO_SOCIAL_PROOF.length} social proof entries...`);
  for (const item of DEMO_SOCIAL_PROOF) {
    const { data: existingSp } = await supabase
      .from("social_proof")
      .select("id")
      .eq("post_url", item.post_url)
      .maybeSingle();

    if (existingSp) {
      await supabase.from("social_proof").update(item).eq("id", existingSp.id);
    } else {
      const { error: spError } = await supabase.from("social_proof").insert(item);
      if (spError) {
        console.error(`Error inserting social proof ${item.handle}:`, spError.message);
      }
    }
  }
  console.log("✓ Seeded social proof entries successfully.");

  console.log("=== VIVONA SEED SCRIPT COMPLETE ===");
}

if (process.argv[1]?.includes("seed.ts")) {
  seed().catch((err) => {
    console.error("Seed execution failed:", err);
  });
}
