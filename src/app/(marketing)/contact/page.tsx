"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { GoldKnotIcon } from "@/components/ui/logo";
import { BRAND } from "@/lib/brand";

export default function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success("Thank you. Our executive concierge will contact you within 4 hours.");
    }, 600);
  };

  return (
    <div className="container py-12 md:py-20 space-y-16 max-w-5xl">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-50/60 px-4 py-1 text-xs font-semibold text-charcoal">
          <GoldKnotIcon className="w-3.5 h-3.5 text-gold-500" />
          <span>Executive Concierge</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-6xl font-semibold text-maroon">
          Connect With Vivona
        </h1>
        <p className="text-sm text-charcoal/70 leading-relaxed font-sans">
          Whether you are exploring palace dates, comparing caterer specifications, or seeking our on-site team for the upcoming season, we are here to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Contact Information & Concierge Offices */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-charcoal">
              Regional Concierge Desks
            </h2>
            <div className="space-y-4 text-xs text-charcoal/80">
              <div className="p-4 rounded-xl border border-border bg-card">
                <span className="font-bold text-maroon uppercase tracking-wider block">Jaipur Headquarters</span>
                <p className="mt-1 font-medium text-charcoal">C-Scheme, Ashok Nagar, Jaipur 302001</p>
                <p className="text-charcoal/60 mt-0.5">Focus: Rambagh Palace, Fairmont, Jai Mahal, Samode</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card">
                <span className="font-bold text-gold-600 uppercase tracking-wider block">Udaipur Operations Office</span>
                <p className="mt-1 font-medium text-charcoal">Haridas Ji Ki Magri, Lake Pichola, Udaipur 313001</p>
                <p className="text-charcoal/60 mt-0.5">Focus: City Palace Zenana, Jagmandir Island, Udaivilas, Fateh Garh</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs text-charcoal/80 pt-2 border-t border-border/80">
            <div>
              <span className="font-semibold text-charcoal block">Email Concierge:</span>
              <a href={`mailto:${BRAND.supportEmail}`} className="text-maroon hover:underline font-mono">
                {BRAND.supportEmail}
              </a>
            </div>
            <div>
              <span className="font-semibold text-charcoal block">Direct Phone & WhatsApp:</span>
              <a href="tel:+919829011001" className="text-charcoal hover:text-maroon font-mono">
                +91 98290 11001
              </a>
            </div>
            <div>
              <span className="font-semibold text-charcoal block">Operating Hours:</span>
              <span>Monday – Sunday: 9:00 AM – 9:00 PM IST (24/7 for active wedding weekends)</span>
            </div>
          </div>
        </div>

        {/* Quick Inquiry Form */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-sage-100 text-sage-600 flex items-center justify-center mx-auto text-xl">
                ✓
              </div>
              <h3 className="font-serif text-2xl font-semibold text-charcoal">Message Received</h3>
              <p className="text-xs text-charcoal/70 max-w-xs mx-auto">
                Thank you for your message. An executive planner will review your enquiry and respond promptly.
              </p>
              <Link
                href="/book"
                className="inline-block mt-4 rounded-xl bg-maroon px-6 py-2.5 text-xs font-semibold text-ivory"
              >
                Or Open Booking Wizard →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-serif text-xl font-semibold text-maroon mb-2">
                Send an Executive Message
              </h3>

              <div>
                <label className="block text-xs font-medium text-charcoal/80 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Radhika Kothari"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/80 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. radhika@domain.com"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/80 mb-1">Preferred City</label>
                <select className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="Jaipur">Jaipur (Palaces & Havelis)</option>
                  <option value="Udaipur">Udaipur (Lake Pichola & Terraces)</option>
                  <option value="Both">Considering Both Locations</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/80 mb-1">Message / Requirements</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Briefly describe your expected dates, approximate guest count, or any specific questions..."
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-maroon px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ivory hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? "Sending..." : "Submit Message to Vivona"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
