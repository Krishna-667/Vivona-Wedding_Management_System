import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PackageEditorCard } from "@/components/features/admin/package-editor-card";
import type { Package } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Packages CMS · Vivona Admin",
};

export default async function AdminPackagesCMSPage() {
  const admin = createAdminClient();
  const { data: packages } = await admin
    .from("packages")
    .select("*")
    .order("display_order", { ascending: true });

  const pkgList = (packages || []) as Package[];

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between border-b border-border/80 pb-6">
        <div>
          <Link
            href="/admin/content"
            className="text-xs text-charcoal/60 hover:text-maroon transition-colors block mb-1"
          >
            ← Back to CMS Overview
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-charcoal">
            Package Offerings & Pricing
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Modifications update the public site and booking wizard in real time.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {pkgList.map((pkg) => (
          <PackageEditorCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </div>
  );
}
