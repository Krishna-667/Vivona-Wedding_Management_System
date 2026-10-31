import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";
import { formatPaise } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Site Content CMS · Vivona Admin",
};

export default async function AdminContentPage() {
  const session = await getSessionProfile();
  const userId = session?.profile.id || "00000000-0000-0000-0000-000000000000";

  const { packageCount, socialProofCount } = await withUser(userId, async (sql) => {
    const [pkg] = await sql`SELECT count(*) FROM public.packages`;
    const [sp] = await sql`SELECT count(*) FROM public.social_proof`;
    return {
      packageCount: Number(pkg.count),
      socialProofCount: Number(sp.count),
    };
  });

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="border-b border-border/80 pb-6">
        <span className="text-xs uppercase tracking-wider text-gold-600 font-semibold">
          Dynamic Agency CMS
        </span>
        <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
          Website Content Management
        </h1>
        <p className="text-xs text-charcoal/70 mt-1">
          Manage public package tiers, starting prices in paise, inclusions, and verified social proof citations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Packages Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-sm hover:border-maroon transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xl">📦</span>
            <span className="text-xs font-mono font-bold bg-maroon/10 text-maroon px-2.5 py-1 rounded-full">
              {packageCount ?? 2} Active Packages
            </span>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold text-charcoal">
              Package Architecture & Inclusions
            </h2>
            <p className="text-xs text-charcoal/70 mt-1 leading-relaxed">
              Edit the Full-Service Royal Wedding and Day-Of Orchestration tiers, starting prices, description taglines, and bullet points.
            </p>
          </div>
          <div className="pt-4 border-t border-border/60">
            <Link
              href="/admin/content/packages"
              className="inline-flex items-center gap-2 rounded-xl bg-maroon px-5 py-2.5 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
            >
              <span>Manage Packages</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Social Proof Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-sm hover:border-gold-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xl">⭐</span>
            <span className="text-xs font-mono font-bold bg-gold-100 text-gold-700 px-2.5 py-1 rounded-full">
              {socialProofCount ?? 8} Curated Citations
            </span>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold text-charcoal">
              Social Proof & Press Citations
            </h2>
            <p className="text-xs text-charcoal/70 mt-1 leading-relaxed">
              Curate Instagram posts, Vogue/WeddingSutra press coverage, YouTube wedding documentary films, and verified Google reviews.
            </p>
          </div>
          <div className="pt-4 border-t border-border/60">
            <Link
              href="/admin/content/social-proof"
              className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-2.5 text-xs font-semibold text-ivory hover:bg-charcoal/90 transition-colors shadow-sm"
            >
              <span>Manage Citations</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
