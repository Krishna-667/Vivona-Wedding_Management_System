import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";
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
  const admin = createAdminClient();

  const [weddingRes, scheduleRes, checkinsRes, incidentsRes] = await Promise.all([
    admin.from("weddings").select("id, code, title, venue, city, start_date").eq("id", params.id).single(),
    admin.from("schedule_entries").select("*").eq("wedding_id", params.id).order("start_time", { ascending: true }),
    admin.from("vendor_checkins").select("*, vendors(*)").eq("wedding_id", params.id),
    admin.from("incidents").select("*").eq("wedding_id", params.id).order("created_at", { ascending: false }),
  ]);

  if (weddingRes.error || !weddingRes.data) {
    notFound();
  }

  const checkins = (checkinsRes.data || []).map((c: any) => ({
    ...c,
    vendor: c.vendors as Vendor,
  })) as Array<VendorCheckin & { vendor?: Vendor }>;

  return (
    <LiveEventConsole
      wedding={weddingRes.data}
      initialSchedule={(scheduleRes.data || []) as ScheduleEntry[]}
      initialCheckins={checkins}
      initialIncidents={(incidentsRes.data || []) as Incident[]}
      userRole={session?.profile.role === "admin" ? "admin" : "employee"}
      userId={session?.user.id || ""}
    />
  );
}
