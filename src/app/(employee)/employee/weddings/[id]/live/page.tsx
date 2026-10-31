import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { LiveEventConsole } from "@/components/features/live/live-event-console";
import type { ScheduleEntry, VendorCheckin, Incident, Vendor } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Event Day Console · Vivona",
};

export default async function EmployeeWeddingLivePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const data = await withUser(session.profile.id, async (sql) => {
    const [wedding] = await sql`
      SELECT id, code, title, venue, city, start_date
      FROM public.weddings WHERE id = ${params.id}
    `;
    if (!wedding) return null;

    const schedule = await sql`
      SELECT * FROM public.schedule_entries
      WHERE wedding_id = ${params.id}
      ORDER BY start_time ASC
    `;

    const checkins = await sql`
      SELECT 
        vc.*,
        row_to_json(v.*) as vendor
      FROM public.vendor_checkins vc
      LEFT JOIN public.vendors v ON v.id = vc.vendor_id
      WHERE vc.wedding_id = ${params.id}
    `;

    const incidents = await sql`
      SELECT * FROM public.incidents
      WHERE wedding_id = ${params.id}
      ORDER BY created_at DESC
    `;

    return { wedding, schedule, checkins, incidents };
  });

  if (!data || !data.wedding) {
    notFound();
  }

  return (
    <LiveEventConsole
      wedding={data.wedding as any}
      initialSchedule={(data.schedule || []) as unknown as ScheduleEntry[]}
      initialCheckins={(data.checkins || []) as any}
      initialIncidents={(data.incidents || []) as unknown as Incident[]}
      userRole={session.profile.role === "admin" ? "admin" : "employee"}
      userId={session.profile.id}
    />
  );
}
