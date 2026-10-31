"use client";

import * as React from "react";
import { toast } from "sonner";
import { updatePackageAction } from "@/app/actions/content";
import type { Package } from "@/types/database";

export function PackageEditorCard({ pkg }: { pkg: Package }) {
  const [name, setName] = React.useState(pkg.name);
  const [tagline, setTagline] = React.useState(pkg.tagline || "");
  const [description, setDescription] = React.useState(pkg.description || "");
  const [priceRupees, setPriceRupees] = React.useState(
    Number(pkg.starting_price_paise) / 100
  );
  const [inclusionsText, setInclusionsText] = React.useState(
    (pkg.inclusions || []).join("\n")
  );
  const [isActive, setIsActive] = React.useState(pkg.is_active);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const inclusionsList = inclusionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await updatePackageAction(pkg.id, {
        name,
        tagline,
        description,
        starting_price_paise: BigInt(Math.round(priceRupees * 100)),
        inclusions: inclusionsList,
        is_active: isActive,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to update package.");
        setSaving(false);
        return;
      }

      toast.success(`${name} updated successfully! Public pages updated.`);
      setSaving(false);
    } catch {
      toast.error("Failed to connect. Please try again.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div>
          <span className="font-mono text-xs font-bold text-maroon uppercase">
            Slug: {pkg.slug}
          </span>
          <h3 className="font-serif text-xl font-semibold text-charcoal">{pkg.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-charcoal/80">Active on Site:</label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded accent-maroon"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-charcoal/80 mb-1">Package Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-charcoal/80 mb-1">
            Starting Price (₹ Rupees)
          </label>
          <input
            type="number"
            required
            step={50000}
            value={priceRupees}
            onChange={(e) => setPriceRupees(Number(e.target.value))}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-charcoal/80 mb-1">Tagline</label>
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-charcoal/80 mb-1">Full Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-charcoal/80 mb-1">
          Bullet Inclusions (One per line)
        </label>
        <textarea
          rows={4}
          value={inclusionsText}
          onChange={(e) => setInclusionsText(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono"
        />
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-maroon px-5 py-2.5 text-xs font-semibold text-ivory hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? "Saving Changes..." : "Save Package Updates"}
        </button>
      </div>
    </form>
  );
}
