import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { decryptField, computeBlindIndex } from "@/lib/crypto/field-encryption";

function escapeCsvCell(val: unknown): string {
  if (val == null) return '""';
  let s = String(val);
  // Prevent CSV injection in spreadsheet software
  if (/^[=+@-]/i.test(s)) {
    s = "'" + s;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";
  const q = searchParams.get("q")?.trim() || "";

  const userId = session.profile.id;
  const bidx = q ? computeBlindIndex(q) : null;

  const rows = await withUser(userId, async (sql) => {
    let statusFilter = sql``;
    if (status === "stale") {
      statusFilter = sql`AND e.status = 'new' AND e.created_at < NOW() - INTERVAL '48 hours'`;
    } else if (status !== "all") {
      statusFilter = sql`AND e.status = ${status}`;
    }

    let searchFilter = sql``;
    if (q) {
      searchFilter = sql`AND (
        e.code ILIKE ${'%' + q + '%'}
        OR e.contact_name ILIKE ${'%' + q + '%'}
        OR e.city ILIKE ${'%' + q + '%'}
        ${bidx ? sql`OR e.contact_email_bidx = ${bidx} OR e.contact_phone_bidx = ${bidx}` : sql``}
      )`;
    }

    return sql`
      SELECT
        e.code,
        e.contact_name,
        e.contact_email,
        e.contact_phone,
        e.city,
        e.guest_count,
        e.budget_max_paise,
        e.status,
        e.notes,
        e.created_at
      FROM public.enquiries e
      WHERE 1=1
        ${statusFilter}
        ${searchFilter}
      ORDER BY e.created_at DESC
    `;
  });

  const headers = [
    "Enquiry Code",
    "Contact Name",
    "Contact Email",
    "Contact Phone",
    "City",
    "Guest Count",
    "Budget (INR)",
    "Status",
    "Created Date",
    "Confidential Notes",
  ];

  const csvLines: string[] = [headers.map(escapeCsvCell).join(",")];

  for (const r of rows) {
    const email = decryptField("enquiries", "contact_email", r.contact_email) || "";
    const phone = decryptField("enquiries", "contact_phone", r.contact_phone) || "";
    const notes = decryptField("enquiries", "notes", r.notes) || "";
    const budgetInr = (Number(BigInt(r.budget_max_paise)) / 100).toFixed(2);
    const createdAt = new Date(r.created_at).toISOString().split("T")[0];

    const line = [
      escapeCsvCell(r.code),
      escapeCsvCell(r.contact_name),
      escapeCsvCell(email),
      escapeCsvCell(phone),
      escapeCsvCell(r.city),
      escapeCsvCell(r.guest_count),
      escapeCsvCell(budgetInr),
      escapeCsvCell(r.status),
      escapeCsvCell(createdAt),
      escapeCsvCell(notes),
    ].join(",");

    csvLines.push(line);
  }

  const csvContent = "\uFEFF" + csvLines.join("\r\n"); // UTF-8 BOM for Excel compatibility
  const filename = `vivona-enquiries-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
