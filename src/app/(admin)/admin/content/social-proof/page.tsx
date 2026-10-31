import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { SocialProofManager } from "@/components/features/admin/social-proof-manager";
import type { SocialProof } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Social Proof CMS · Vivona Admin",
};

export default async function AdminSocialProofCMSPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("social_proof")
    .select("*")
    .order("display_order", { ascending: true });

  const items = (data || []) as SocialProof[];

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
            Verified Social Proof & Citations
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Curate verified press features and real client quotes that link out to original citations.
          </p>
        </div>
      </div>

      <SocialProofManager initialItems={items} />
    </div>
  );
}
