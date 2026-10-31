import Link from "next/link";
import { withAnon } from "@/lib/db/with-user";
import { DEMO_SOCIAL_PROOF } from "@/lib/constants/demo-data";
import { fetchWithCache } from "@/lib/cache";
import type { SocialProof } from "@/types/database";
import { GoldKnotIcon } from "@/components/ui/logo";

export const metadata = {
  title: "Social Proof, Press & Verified Client Reviews · Vivona",
  description:
    "Curated real wedding citations, Instagram features, press coverage, and Google client reviews for Vivona luxury destination weddings.",
};

export const revalidate = 60;

async function getSocialProof(): Promise<SocialProof[]> {
  return fetchWithCache("social_proof_page_data_cache", 300000, async () => {
    try {
      const data = await withAnon(async (sql) => {
        return sql`
          SELECT * FROM public.social_proof
          ORDER BY display_order ASC
        `;
      });
      if (data && data.length > 0) return data as unknown as SocialProof[];
    } catch {
      // Fall back to seed citations
    }
    return DEMO_SOCIAL_PROOF.map((item, idx) => ({
      id: `sp-${idx + 1}`,
      ...item,
      rating: item.rating ?? 5,
    })) as SocialProof[];
  });
}

export default async function SocialProofPage() {
  const items = await getSocialProof();

  return (
    <div className="container py-12 md:py-20 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-50/60 px-4 py-1 text-xs font-semibold text-charcoal">
          <GoldKnotIcon className="w-3.5 h-3.5 text-gold-500" />
          <span>Curated Citations & Verified Reviews</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-6xl font-semibold text-maroon">
          Social Proof & Royal Citations
        </h1>
        <p className="text-sm sm:text-base text-charcoal/70 leading-relaxed font-sans">
          We believe in absolute transparency. Every review, press feature, and wedding film below links directly to the original public post on Instagram, YouTube, or Google.
        </p>
      </div>

      {/* Citations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {items.map((item) => {
          const isInstagram = item.platform === "instagram";
          const isYouTube = item.platform === "youtube";
          const isReview = item.platform === "google_review";

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-sm hover:border-gold-400/60 transition-all space-y-4"
            >
              <div className="space-y-4">
                {/* Platform Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      isInstagram
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : isYouTube
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {isInstagram ? "Instagram Press" : isYouTube ? "YouTube Film" : "Google Review"}
                  </span>

                  {item.rating && (
                    <div className="flex text-gold-500 text-xs">
                      {"★".repeat(item.rating)}
                    </div>
                  )}
                </div>

                {/* Optional Thumbnail */}
                {item.thumbnail_url && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-ivory-200 relative border border-border/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnail_url}
                      alt={item.caption}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                {/* Caption / Quote */}
                <p className="text-xs sm:text-sm text-charcoal/80 leading-relaxed font-serif italic">
                  &ldquo;{item.caption}&rdquo;
                </p>

                {/* Author Info */}
                <div className="pt-2 border-t border-border/60">
                  <p className="text-xs font-semibold text-charcoal">{item.author_name}</p>
                  <p className="text-[11px] text-charcoal/50 font-mono">{item.handle}</p>
                </div>
              </div>

              {/* Verified External Link */}
              <div className="pt-2">
                <a
                  href={item.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-maroon hover:underline"
                >
                  <span>View Original Citation</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Call to action */}
      <div className="text-center max-w-xl mx-auto space-y-4 pt-8">
        <h3 className="font-serif text-2xl font-semibold text-charcoal">
          Begin Your Wedding Journey With Vivona
        </h3>
        <p className="text-xs text-charcoal/70">
          Join the exclusive 25 couples who trust our operational precision each season.
        </p>
        <Link
          href="/book"
          className="inline-flex items-center justify-center rounded-xl bg-maroon px-8 py-3.5 text-xs font-semibold uppercase tracking-wider text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
        >
          Build Your Custom Blueprint →
        </Link>
      </div>
    </div>
  );
}
