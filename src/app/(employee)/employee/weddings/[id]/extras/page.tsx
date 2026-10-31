import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { formatPaise } from "@/lib/utils";
import { ExtrasForm } from "./extras-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Request Extra Charges · Vivona Operations",
};

export default async function EmployeeWeddingExtrasPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const data = await withUser(session.profile.id, async (sql) => {
    const [wedding] = await sql`
      SELECT id, code, title FROM public.weddings WHERE id = ${params.id}
    `;
    if (!wedding) return null;

    const extraCharges = await sql`
      SELECT * FROM public.extra_charges
      WHERE wedding_id = ${params.id}
      ORDER BY created_at DESC
    `;

    return { wedding, extraCharges };
  });

  if (!data) notFound();

  const wedding = data.wedding;
  const extraCharges = data.extraCharges || [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-border/80 pb-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-maroon bg-maroon/10 px-2.5 py-1 rounded">
            {wedding.code}
          </span>
          <span className="text-xs font-semibold uppercase text-gold-600">
            On-Ground Extras Request
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
          {wedding.title} Extra Charges
        </h1>
        <p className="text-xs text-charcoal/70 mt-1">
          Request on-ground scope additions (e.g. 60 extra guest plates, extra DJ overtime, rain canopies). Approvals automatically bill to client and update vendor costs.
        </p>
      </div>

      {/* Form */}
      <ExtrasForm weddingId={wedding.id} />

      {/* List */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <h2 className="font-serif text-xl font-semibold text-charcoal border-b border-border/80 pb-3">
          Submitted Extras Requests
        </h2>

        {extraCharges.length === 0 ? (
          <p className="text-xs text-charcoal/50">No extra charges requested for this wedding.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {extraCharges.map((ec) => (
              <div key={ec.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-charcoal text-sm">{ec.title}</span>
                    <span className="font-mono text-charcoal/60">
                      ({ec.qty} × ₹{Number(ec.unit_price_paise) / 100})
                    </span>
                  </div>
                  <p className="text-charcoal/60 mt-0.5">{ec.reason}</p>
                </div>

                <div className="text-right space-y-1">
                  <span className="font-mono font-bold text-maroon text-base block">
                    {formatPaise(BigInt(ec.total_paise))}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      ec.status === "approved"
                        ? "bg-sage-100 text-sage-700"
                        : ec.status === "rejected"
                        ? "bg-terracotta/10 text-terracotta"
                        : "bg-gold-100 text-gold-800"
                    }`}
                  >
                    {ec.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
