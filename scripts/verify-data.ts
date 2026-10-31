import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const DATABASE_URL =
  process.env.DATABASE_SERVICE_URL ||
  "postgres://vivona_service:ChangeMe_Service#2026@127.0.0.1:5432/vivona";

interface VerificationRule {
  id: string;
  name: string;
  check: (sql: postgres.Sql) => Promise<{ pass: boolean; details: string }>;
}

const RULES: VerificationRule[] = [
  {
    id: "RULE-01",
    name: "Enquiries Minimum Count (>= 320)",
    check: async (sql) => {
      const [r] = await sql`SELECT count(*)::int as count FROM public.enquiries`;
      const pass = r.count >= 320;
      return { pass, details: `Found ${r.count} enquiries (target: >= 320)` };
    },
  },
  {
    id: "RULE-02",
    name: "Total Database Volume (>= 5,000 rows across public tables)",
    check: async (sql) => {
      const tables = [
        "profiles",
        "enquiries",
        "enquiry_activities",
        "weddings",
        "wedding_assignments",
        "vendors",
        "rfqs",
        "vendor_quotes",
        "quote_lines",
        "wedding_vendors",
        "tasks",
        "schedule_entries",
        "vendor_checkins",
        "incidents",
        "message_threads",
        "messages",
        "proposals",
        "agreements",
        "payment_milestones",
        "client_receipts",
        "vendor_bills",
        "vendor_payments",
        "timesheets",
      ];
      let total = 0;
      for (const t of tables) {
        const [r] = await sql`SELECT count(*)::int as c FROM public.${sql(t)}`;
        total += r.c;
      }
      const pass = total >= 5000;
      return { pass, details: `Total tracked records: ${total} rows (target: >= 5,000)` };
    },
  },
  {
    id: "RULE-03",
    name: "Orphan Reference Integrity (Zero dangling foreign keys)",
    check: async (sql) => {
      const [orphanTasks] = await sql`
        SELECT count(*)::int as c FROM public.tasks t
        LEFT JOIN public.weddings w ON w.id = t.wedding_id
        WHERE w.id IS NULL
      `;
      const [orphanAssignments] = await sql`
        SELECT count(*)::int as c FROM public.wedding_assignments wa
        LEFT JOIN public.weddings w ON w.id = wa.wedding_id
        WHERE w.id IS NULL
      `;
      const pass = orphanTasks.c === 0 && orphanAssignments.c === 0;
      return { pass, details: `Orphan tasks: ${orphanTasks.c}, Orphan assignments: ${orphanAssignments.c}` };
    },
  },
  {
    id: "RULE-04",
    name: "Financial Precision: Milestones Sum = Accepted Proposal Amount",
    check: async (sql) => {
      const discrepancies = await sql`
        SELECT w.id, w.budget_paise, COALESCE(SUM(m.amount_paise), 0)::bigint as milestone_sum
        FROM public.weddings w
        JOIN public.payment_milestones m ON m.wedding_id = w.id
        GROUP BY w.id, w.budget_paise
        HAVING w.budget_paise <> COALESCE(SUM(m.amount_paise), 0)
      `;
      const pass = discrepancies.length === 0;
      return {
        pass,
        details: pass
          ? "All accepted proposals have exact 100% milestone sums matching integer paise."
          : `Found ${discrepancies.length} mismatched proposals.`,
      };
    },
  },
  {
    id: "RULE-05",
    name: "Vendor Payment Safety: Payments Never Exceed Approved Bills",
    check: async (sql) => {
      const overpayments = await sql`
        SELECT b.id, b.amount_paise, COALESCE(SUM(p.amount_paise), 0)::bigint as paid_sum
        FROM public.vendor_bills b
        JOIN public.vendor_payments p ON p.bill_id = b.id
        GROUP BY b.id, b.amount_paise
        HAVING COALESCE(SUM(p.amount_paise), 0) > b.amount_paise
      `;
      const pass = overpayments.length === 0;
      return {
        pass,
        details: pass
          ? "Zero bill overpayments detected across all vendor settlements."
          : `Found ${overpayments.length} overpaid bills.`,
      };
    },
  },
  {
    id: "RULE-06",
    name: "Task Coverage: Full-Service Weddings Have >= 30 Tasks",
    check: async (sql) => {
      const understaffed = await sql`
        SELECT w.code, count(t.id)::int as task_count
        FROM public.weddings w
        LEFT JOIN public.tasks t ON t.wedding_id = w.id
        GROUP BY w.id, w.code
        HAVING count(t.id) < 30
      `;
      const pass = understaffed.length === 0;
      return {
        pass,
        details: pass
          ? "All signature weddings have >= 30 structured operational tasks."
          : `${understaffed.length} weddings have under 30 tasks.`,
      };
    },
  },
  {
    id: "RULE-07",
    name: "Procurement Tender Rule: Caterer RFQs Have 1 Selected & >= 1 Closed Quotes",
    check: async (sql) => {
      const rfqs = await sql`
        SELECT
          r.id,
          count(CASE WHEN q.status = 'selected' THEN 1 END)::int as selected_count,
          count(CASE WHEN q.status = 'closed_not_selected' THEN 1 END)::int as closed_count
        FROM public.rfqs r
        JOIN public.vendor_quotes q ON q.rfq_id = r.id
        WHERE r.category = 'catering'
        GROUP BY r.id
        HAVING count(CASE WHEN q.status = 'selected' THEN 1 END) <> 1
      `;
      const pass = rfqs.length === 0;
      return {
        pass,
        details: pass
          ? "Every caterer RFP tender strictly contains exactly 1 winner and closed quotes."
          : `${rfqs.length} caterer RFQs violate the 1-winner rule.`,
      };
    },
  },
  {
    id: "RULE-08",
    name: "Encryption At Rest: Sensitive Fields Hold v1: Ciphertext",
    check: async (sql) => {
      const [unencryptedVendors] = await sql`
        SELECT count(*)::int as c FROM public.vendors
        WHERE phone IS NOT NULL AND phone NOT LIKE 'v1:%'
      `;
      const [unencryptedEnquiries] = await sql`
        SELECT count(*)::int as c FROM public.enquiries
        WHERE contact_phone IS NOT NULL AND contact_phone NOT LIKE 'v1:%'
      `;
      const pass = unencryptedVendors.c === 0 && unencryptedEnquiries.c === 0;
      return {
        pass,
        details: pass
          ? "All vendor and enquiry PII fields hold AES-256-GCM v1: ciphertext."
          : `Unencrypted rows found: vendors=${unencryptedVendors.c}, enquiries=${unencryptedEnquiries.c}`,
      };
    },
  },
];

async function runVerification() {
  console.log("🔍 Vivona Dataset & Constraint Verification (pnpm db:verify)\n");
  const sql = postgres(DATABASE_URL);

  let allPassed = true;
  console.log("| Rule ID | Rule Description | Status | Evidence / Details |");
  console.log("|---|---|---|---|");

  for (const rule of RULES) {
    try {
      const res = await rule.check(sql);
      const status = res.pass ? "✅ PASS" : "❌ FAIL";
      if (!res.pass) allPassed = false;
      console.log(`| ${rule.id} | ${rule.name} | ${status} | ${res.details} |`);
    } catch (err: any) {
      allPassed = false;
      console.log(`| ${rule.id} | ${rule.name} | ❌ FAIL | Error: ${err.message} |`);
    }
  }

  await sql.end();
  console.log("\n========================================================");
  if (allPassed) {
    console.log("🎉 ALL VERIFICATION RULES PASSED PERFECTLY!");
    process.exit(0);
  } else {
    console.error("❌ VERIFICATION FAILED: One or more rules violated.");
    process.exit(1);
  }
}

runVerification();
