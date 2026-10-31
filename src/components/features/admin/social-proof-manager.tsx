"use client";

import * as React from "react";
import { toast } from "sonner";
import { createSocialProofAction, deleteSocialProofAction } from "@/app/actions/content";
import type { SocialProof } from "@/types/database";

export function SocialProofManager({ initialItems }: { initialItems: SocialProof[] }) {
  const [items, setItems] = React.useState<SocialProof[]>(initialItems);
  const [loading, setLoading] = React.useState(false);

  // New item form state
  const [platform, setPlatform] = React.useState<string>("instagram");
  const [handle, setHandle] = React.useState<string>("@vogueweddings");
  const [authorName, setAuthorName] = React.useState<string>("Vogue India");
  const [postUrl, setPostUrl] = React.useState<string>("https://instagram.com/p/DB...");
  const [caption, setCaption] = React.useState<string>("");
  const [rating, setRating] = React.useState<number>(5);
  const [featured, setFeatured] = React.useState<boolean>(true);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      toast.error("Please enter a caption or review quote.");
      return;
    }

    setLoading(true);
    try {
      const res = await createSocialProofAction({
        platform,
        handle,
        author_name: authorName,
        post_url: postUrl,
        caption: caption.trim(),
        rating,
        featured,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to add social proof.");
        setLoading(false);
        return;
      }

      toast.success("Social citation created! Live on public site.");
      // Optimistic update
      setItems((prev) => [
        {
          id: res.data?.id || `sp-${Date.now()}`,
          platform: platform as any,
          handle,
          author_name: authorName,
          post_url: postUrl,
          thumbnail_url: null,
          caption: caption.trim(),
          rating,
          featured,
          display_order: 1,
        },
        ...prev,
      ]);
      setCaption("");
      setLoading(false);
    } catch {
      toast.error("Failed to connect. Please try again.");
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this social citation?")) return;

    try {
      const res = await deleteSocialProofAction(id);
      if (!res.ok) {
        toast.error(res.error || "Failed to delete citation.");
        return;
      }
      toast.success("Citation removed.");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast.error("Failed to delete.");
    }
  };

  return (
    <div className="space-y-10">
      {/* Quick Add Citation Form */}
      <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-sm">
        <h3 className="font-serif text-xl font-semibold text-charcoal">
          + Add New Verified Citation / Review
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-charcoal/80 mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="instagram">Instagram Post / Reel</option>
              <option value="google_review">Google Client Review</option>
              <option value="youtube">YouTube Wedding Film</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal/80 mb-1">Author / Publication</label>
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. Vogue India"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal/80 mb-1">Handle / Tag</label>
            <input
              type="text"
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="e.g. @vogueweddings"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-charcoal/80 mb-1">Post / Review URL</label>
          <input
            type="url"
            required
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="https://instagram.com/p/..."
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-charcoal/80 mb-1">Caption / Testimonial Quote</label>
          <textarea
            rows={2}
            required
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Enter the exact testimonial quote or verified press feature text..."
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded accent-maroon"
              />
              <span>Featured on Homepage</span>
            </label>
            <div className="flex items-center gap-1">
              <span>Rating:</span>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                <option value={5}>5 Stars (★★★★★)</option>
                <option value={4}>4 Stars (★★★★)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-maroon px-5 py-2.5 text-xs font-semibold text-ivory hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? "Publishing..." : "+ Publish Citation"}
          </button>
        </div>
      </form>

      {/* Existing Citations List */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl font-semibold text-charcoal">
          Published Citations ({items.length})
        </h3>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-ivory-300 text-charcoal">
                    {item.platform}
                  </span>
                  <span className="text-xs font-semibold text-charcoal">{item.author_name}</span>
                  <span className="text-xs text-charcoal/50 font-mono">{item.handle}</span>
                  {item.featured && (
                    <span className="text-[10px] bg-gold-100 text-gold-700 px-1.5 py-0.5 rounded font-medium">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-xs text-charcoal/70 line-clamp-2 italic font-serif">
                  &ldquo;{item.caption}&rdquo;
                </p>
                <a
                  href={item.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-maroon hover:underline inline-block font-mono"
                >
                  {item.post_url} ↗
                </a>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="text-xs text-terracotta hover:underline font-medium shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
