"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { GoldKnotIcon } from "@/components/ui/logo";
import { formatPaise } from "@/lib/utils";
import { createEnquiryAction } from "@/app/actions/booking";
import { Turnstile } from "@/components/ui/turnstile";
import type { FullBookingSubmission } from "@/lib/validation/booking";

interface BookingWizardProps {
  initialPackageSlug?: string;
}

export function BookingWizard({ initialPackageSlug }: BookingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step indicator state (1 to 4)
  const [step, setStep] = React.useState<number>(1);
  const [loading, setLoading] = React.useState(false);

  // Form State
  const [planType, setPlanType] = React.useState<"package" | "custom">(
    initialPackageSlug ? "package" : "package"
  );
  const [packageSlug, setPackageSlug] = React.useState<string>(
    initialPackageSlug || searchParams.get("package") || "full-service"
  );

  // Step 2 State
  const [city, setCity] = React.useState<"Jaipur" | "Udaipur">("Jaipur");
  const [startDate, setStartDate] = React.useState<string>("2026-11-14");
  const [endDate, setEndDate] = React.useState<string>("2026-11-16");
  const [guestCount, setGuestCount] = React.useState<number>(400);
  const [theme, setTheme] = React.useState<string>("Royal Rajputana Heritage & Palace Saffron");
  const [budgetRupees, setBudgetRupees] = React.useState<number>(45000000); // ₹4.5 Crore default

  // Step 3 Custom Services State
  const [selectedServices, setSelectedServices] = React.useState<
    Array<{ category: string; name: string; selected: boolean; basePricePaise: number; notes?: string }>
  >([
    { category: "venue", name: "Palace Venue & Banquet Lawns", selected: true, basePricePaise: 150000000 },
    { category: "catering", name: "3-Day Royal Multi-Cuisine Banquets", selected: true, basePricePaise: 350000 },
    { category: "decor", name: "Mandap Architecture & Floral Styling", selected: true, basePricePaise: 180000000 },
    { category: "entertainment", name: "Celebrity DJ, AV Line Arrays & Folk Troupe", selected: true, basePricePaise: 75000000 },
    { category: "photography", name: "8K Cinema Crew, Drones & Teasers", selected: true, basePricePaise: 90000000 },
    { category: "makeup", name: "Bridal Airbrush HD Styling & Draper", selected: true, basePricePaise: 30000000 },
    { category: "logistics", name: "Luxury Chauffeur Fleet & Airport Hospitality", selected: true, basePricePaise: 60000000 },
  ]);

  // Step 4 Contact Details
  const [contactName, setContactName] = React.useState<string>("");
  const [contactEmail, setContactEmail] = React.useState<string>("");
  const [contactPhone, setContactPhone] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [consent, setConsent] = React.useState<boolean>(true);
  const [turnstileToken, setTurnstileToken] = React.useState<string>("");

  // Live estimated indicative cost calculation
  const indicativeCostPaise = React.useMemo(() => {
    if (planType === "package") {
      return packageSlug === "full-service" ? 350000000 : 120000000;
    }
    // Custom calculation: base services + (caterer per plate * guests * 3 days)
    let total = 0;
    selectedServices.forEach((s) => {
      if (s.selected) {
        if (s.category === "catering") {
          total += s.basePricePaise * guestCount * 3; // 3 meals/days
        } else {
          total += s.basePricePaise;
        }
      }
    });
    return total;
  }, [planType, packageSlug, selectedServices, guestCount]);

  const toggleCustomService = (index: number) => {
    setSelectedServices((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleNextStep = () => {
    if (step === 2) {
      if (!startDate || !endDate) {
        toast.error("Please specify your desired celebration dates.");
        return;
      }
      if (guestCount < 50) {
        toast.error("Minimum guest count is 50.");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactName || !contactEmail || !contactPhone) {
      toast.error("Please fill in your contact information.");
      return;
    }
    if (!consent) {
      toast.error("Please confirm your consent to proceed.");
      return;
    }

    setLoading(true);

    const payload: FullBookingSubmission = {
      type: planType,
      packageSlug: planType === "package" ? packageSlug : undefined,
      city,
      preferredStartDate: startDate,
      preferredEndDate: endDate,
      guestCount,
      theme,
      budgetMaxPaise: BigInt(budgetRupees) * 100n > 0 ? Number(BigInt(budgetRupees) * 100n) : indicativeCostPaise,
      customServices: planType === "custom" ? selectedServices.filter((s) => s.selected) : [],
      contactName,
      contactEmail,
      contactPhone,
      notes,
      consent,
      turnstileToken: turnstileToken || (process.env.NODE_ENV !== "production" ? "dev-bypass-token" : ""),
    };

    try {
      const res = await createEnquiryAction(payload);
      if (!res.ok) {
        toast.error(res.error || "Failed to submit enquiry.");
        setLoading(false);
        return;
      }

      toast.success("Wedding blueprint received! Forwarding to confirmation...");
      router.push(
        `/book/confirmation?code=${res.data?.code}&email=${encodeURIComponent(contactEmail)}&city=${city}`
      );
    } catch {
      toast.error("Connection error. Please try submitting again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Stepper Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-charcoal/70">
          <span>Step {step} of 4: {step === 1 ? "Experience Type" : step === 2 ? "Dates & Scale" : step === 3 ? "Services Blueprint" : "Contact & Review"}</span>
          <span>{Math.round((step / 4) * 100)}% Complete</span>
        </div>
        <div className="w-full h-2 rounded-full bg-ivory-300 overflow-hidden">
          <div
            className="h-full bg-maroon rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-sm space-y-8">
        {/* STEP 1: Experience Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-charcoal">
                Choose Your Wedding Service Model
              </h2>
              <p className="text-xs text-charcoal/70 mt-1 font-sans">
                Select between our structured turnkey packages or tailor a bespoke multi-service blueprint.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setPlanType("package");
                  setPackageSlug("full-service");
                }}
                className={`p-6 rounded-xl border text-left transition-all ${
                  planType === "package" && packageSlug === "full-service"
                    ? "border-maroon bg-maroon/5 ring-2 ring-maroon"
                    : "border-border hover:border-maroon/40"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-maroon">Full Production</span>
                  <span className="font-serif text-base font-bold text-charcoal">From ₹35 L</span>
                </div>
                <h3 className="font-serif text-xl font-semibold text-charcoal mt-2">
                  Full-Service Royal Wedding
                </h3>
                <p className="text-xs text-charcoal/70 mt-1 leading-relaxed">
                  End-to-end 3-day palace curation, vendor tenders, airport transfers, and live day execution.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlanType("package");
                  setPackageSlug("day-of");
                }}
                className={`p-6 rounded-xl border text-left transition-all ${
                  planType === "package" && packageSlug === "day-of"
                    ? "border-maroon bg-maroon/5 ring-2 ring-maroon"
                    : "border-border hover:border-maroon/40"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-sage-600">Operations Only</span>
                  <span className="font-serif text-base font-bold text-charcoal">From ₹12 L</span>
                </div>
                <h3 className="font-serif text-xl font-semibold text-charcoal mt-2">
                  Partial & Day-Of Orchestration
                </h3>
                <p className="text-xs text-charcoal/70 mt-1 leading-relaxed">
                  Takeover 4 weeks prior. Minute-by-minute timeline, live check-ins, and on-ground enforcement.
                </p>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setPlanType("custom")}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                  planType === "custom"
                    ? "border-gold-500 bg-gold-50 ring-2 ring-gold-400"
                    : "border-border hover:border-gold-400"
                }`}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gold-600 block">
                    Bespoke Builder
                  </span>
                  <span className="font-serif text-lg font-semibold text-charcoal">
                    Custom Wedding Blueprint
                  </span>
                  <p className="text-xs text-charcoal/70 mt-0.5">
                    Select specific modules: palace venue, 3-caterer comparison, AV rigging, or decor.
                  </p>
                </div>
                <span className="text-xs font-semibold text-gold-700 bg-gold-100 px-3 py-1 rounded-full">
                  Customizable
                </span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: City, Dates, Scale & Budget */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-charcoal">
                Ceremony Dates & Scale in Rajasthan
              </h2>
              <p className="text-xs text-charcoal/70 mt-1 font-sans">
                Tell us where and when you wish to host your three-day celebrations.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">
                  Destination City
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCity("Jaipur")}
                    className={`py-3 px-4 rounded-xl border text-xs font-medium transition-all ${
                      city === "Jaipur"
                        ? "border-maroon bg-maroon text-ivory font-semibold shadow-sm"
                        : "border-border text-charcoal hover:bg-ivory-200"
                    }`}
                  >
                    Jaipur (Palaces & Havelis)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCity("Udaipur")}
                    className={`py-3 px-4 rounded-xl border text-xs font-medium transition-all ${
                      city === "Udaipur"
                        ? "border-maroon bg-maroon text-ivory font-semibold shadow-sm"
                        : "border-border text-charcoal hover:bg-ivory-200"
                    }`}
                  >
                    Udaipur (Lake Pichola & Terraces)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal/80 mb-1">
                    Ceremony Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal/80 mb-1">
                    Ceremony End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal/80 mb-1">
                    Estimated Guest Count ({guestCount} Guests)
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={1500}
                    step={25}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full accent-maroon"
                  />
                  <div className="flex justify-between text-[10px] text-charcoal/50 mt-1">
                    <span>Intimate (50)</span>
                    <span className="font-semibold text-charcoal">{guestCount} Guests</span>
                    <span>Grand Royal (1,500+)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-charcoal/80 mb-1">
                    Target Total Wedding Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={budgetRupees}
                    step={1000000}
                    onChange={(e) => setBudgetRupees(Number(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-[10px] text-charcoal/50 block mt-1">
                    {formatPaise(BigInt(budgetRupees) * 100n, { showCompact: true })} Approximate Range
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/80 mb-1">
                  Aesthetic Theme & Vision
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Royal Rajputana Heritage & Palace Saffron">
                    Royal Rajputana Heritage & Palace Saffron
                  </option>
                  <option value="Lake Pichola Sunset Romance & White Florals">
                    Lake Pichola Sunset Romance & White Florals
                  </option>
                  <option value="Mewari Regal Grandeur & Vintage Brass">
                    Mewari Regal Grandeur & Vintage Brass
                  </option>
                  <option value="Contemporary Minimalist Luxury with Folk Elements">
                    Contemporary Minimalist Luxury with Folk Elements
                  </option>
                  <option value="Royal Mughal Courtyard & Velvet Canopies">
                    Royal Mughal Courtyard & Velvet Canopies
                  </option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Package Confirmation or Custom Services Builder */}
        {step === 3 && (
          <div className="space-y-6">
            {planType === "package" ? (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-maroon uppercase tracking-wider">
                    Package Confirmation
                  </span>
                  <h2 className="font-serif text-2xl font-semibold text-charcoal mt-1">
                    {packageSlug === "full-service" ? "Full-Service Royal Wedding" : "Partial & Day-Of Orchestration"}
                  </h2>
                  <p className="text-xs text-charcoal/70 mt-1">
                    Tailored for {guestCount} guests in {city} across your selected ceremony dates.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-ivory-200/50 space-y-2 text-xs text-charcoal/80">
                  <div className="flex justify-between font-semibold">
                    <span>Base Agency Orchestration Fee:</span>
                    <span className="text-maroon font-serif text-sm">
                      {formatPaise(indicativeCostPaise, { showCompact: true })}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal/60">
                    Includes dedicated Lead Planner, on-site coordinators, full contract generation, and the 30+ task plan.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-gold-600 uppercase tracking-wider">
                    Custom Service Architecture
                  </span>
                  <h2 className="font-serif text-2xl font-semibold text-charcoal mt-1">
                    Select Your Preferred Modules
                  </h2>
                  <p className="text-xs text-charcoal/70 mt-1">
                    Toggle service modules below. Indicative pricing updates dynamically.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {selectedServices.map((svc, idx) => (
                    <div
                      key={svc.category}
                      onClick={() => toggleCustomService(idx)}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        svc.selected
                          ? "border-maroon/40 bg-maroon/5 text-charcoal"
                          : "border-border bg-background text-charcoal/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                            svc.selected ? "bg-maroon text-ivory" : "border border-border"
                          }`}
                        >
                          {svc.selected && "✓"}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{svc.name}</p>
                          <span className="text-[10px] text-charcoal/60 capitalize">
                            Category: {svc.category}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-mono font-medium">
                        {svc.category === "catering"
                          ? `₹${(svc.basePricePaise / 100) * guestCount * 3 / 100000} L (3 meals)`
                          : formatPaise(svc.basePricePaise, { showCompact: true })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl border border-gold-400/40 bg-gold-50/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal">
                    Estimated Production Range:
                  </span>
                  <span className="font-serif text-lg font-bold text-maroon">
                    {formatPaise(indicativeCostPaise, { showCompact: true })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Contact, Consent & Submission */}
        {step === 4 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-charcoal">
                Contact Details & Final Review
              </h2>
              <p className="text-xs text-charcoal/70 mt-1 font-sans">
                Enter your details to receive your formal tracking code and access the couple portal.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-ivory-200/60 space-y-2 text-xs">
              <span className="font-bold text-maroon uppercase tracking-wider block">
                Booking Summary Review
              </span>
              <div className="grid grid-cols-2 gap-2 text-charcoal/80">
                <div>
                  <span className="text-charcoal/50 block">Plan Tier:</span>
                  <span className="font-medium capitalize">{planType} ({packageSlug})</span>
                </div>
                <div>
                  <span className="text-charcoal/50 block">Destination:</span>
                  <span className="font-medium">{city}</span>
                </div>
                <div>
                  <span className="text-charcoal/50 block">Ceremony Dates:</span>
                  <span className="font-medium">{startDate} to {endDate}</span>
                </div>
                <div>
                  <span className="text-charcoal/50 block">Guest Scale:</span>
                  <span className="font-medium">{guestCount} Guests</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-charcoal/80 mb-1">
                  Full Couple Names / Contact Person *
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Priyamvada & Rohan"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal/80 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. couple@domain.com"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal/80 mb-1">
                    Mobile Number (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98290 00000"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal/80 mb-1">
                  Additional Notes or Venue Preferences (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specific haveli preferences, dietary notes (pure Jain counter), or family traditions..."
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Turnstile Spam Guard */}
              <div className="p-3 rounded-xl border border-border bg-ivory-100 flex flex-col items-center justify-center">
                <Turnstile
                  onSuccess={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => setTurnstileToken("")}
                />
              </div>

              {/* Consent checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="consent-check"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                  className="mt-0.5 rounded text-maroon accent-maroon"
                />
                <label htmlFor="consent-check" className="text-xs text-charcoal/70 leading-relaxed cursor-pointer">
                  I consent to Vivona processing my wedding details to prepare our proposal and acknowledge that submission creates an enquiry record in the CRM.
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-maroon px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-ivory hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Transmitting Blueprint..." : "Submit Royal Wedding Blueprint →"}
            </button>
          </form>
        )}

        {/* Step Navigation Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-border/80">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2 text-xs font-semibold text-charcoal hover:text-maroon transition-colors"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}

          {step < 4 && (
            <button
              type="button"
              onClick={handleNextStep}
              className="rounded-xl bg-maroon px-6 py-2.5 text-xs font-semibold text-ivory hover:bg-maroon-600 transition-colors shadow-sm"
            >
              Continue to Step {step + 1} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
