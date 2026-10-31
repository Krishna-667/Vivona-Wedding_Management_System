import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { AgreementSignaturePad } from "@/components/features/client/agreement-signature-pad";
import { GoldKnotIcon } from "@/components/ui/logo";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: "Service Agreement & E-Signature · Vivona Client Portal",
};

const DEFAULT_AGREEMENT_TEXT = `
### 1. PARTIES & ENGAGEMENT
This Wedding Operations & Architecture Agreement ("Agreement") is executed between **Vivona Luxury Weddings** ("Vivona") and the undersigned couple ("the Client"). Vivona agrees to act as exclusive wedding architecture and operational commander for the scheduled multi-day celebration.

### 2. SCOPE OF SERVICES
1. **Vendor Curation & Tendering:** Comprehensive vendor RFQ comparisons across catering, venue, decor, audio-visual engineering, and cinematography.
2. **On-Site Operational Command:** Dedicated Lead Planner and On-Site Coordinators managing the live event console, minute-by-minute timeline, and vendor arrival enforcement.
3. **Reconciled Financial Ledger:** Transparent accounting with every vendor bill, advance deduction, and approved extra charge tracked in integer paise.

### 3. PAYMENT PLAN & CASHFLOW MILESTONES
The total recognized contract value shall be remitted strictly in three staged milestones:
- **Milestone 1 (Booking Deposit):** 20% due upon execution of this Agreement to lock calendar dates and generate the 30+ task plan.
- **Milestone 2 (Advance):** 30% due thirty (30) days prior to the wedding date to secure production retainers and permits.
- **Milestone 3 (Final Settlement):** 50% reconciled and settled within seven (7) days following event conclusion.

### 4. THE AGREEMENT GATE
The Client explicitly acknowledges that detailed vendor contracts, pricing line-items, and venue floor plan blueprints remain proprietary and confidential until this Agreement is executed and the booking deposit is recorded.

### 5. JURISDICTION
This Agreement shall be governed by the laws of India, with exclusive jurisdiction in the competent commercial courts of India.
`;

export default async function ClientAgreementPage() {
  const session = await getSessionProfile();

  let agreement: any = null;

  if (session) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("agreements")
      .select("*")
      .eq("client_id", session.profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      agreement = data;
    }
  }

  // Fallback demo agreement if not yet created in CRM
  if (!agreement) {
    agreement = {
      id: "demo-agreement-001",
      version: 1,
      status: "draft",
      body_markdown: DEFAULT_AGREEMENT_TEXT,
      signed_at: null,
      signed_by_name: null,
    };
  }

  const isSigned = agreement.status === "signed";

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-maroon font-semibold">
              Formal Service Contract
            </span>
            <span className="text-xs font-mono bg-ivory-300 px-2 py-0.5 rounded text-charcoal/70">
              v{agreement.version}.0
            </span>
          </div>
          <h1 className="font-serif text-3xl font-semibold text-charcoal mt-1">
            Service Agreement & E-Signature
          </h1>
          <p className="text-xs text-charcoal/70 mt-1">
            Review legal operational terms between Vivona and the Client, then sign on your phone.
          </p>
        </div>

        <div>
          <span
            className={`inline-block px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isSigned
                ? "bg-sage-100 text-sage-700 border border-sage-300"
                : "bg-gold-100 text-gold-700 border border-gold-300 animate-pulse"
            }`}
          >
            {isSigned ? "✓ Contract Signed & Sealed" : "Pending Signature"}
          </span>
        </div>
      </div>

      {/* Contract Reader Box */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-2">
            <GoldKnotIcon className="w-5 h-5 text-gold-500" />
            <span className="font-serif text-lg font-semibold text-charcoal">
              {BRAND.legalName} · Client Service Agreement
            </span>
          </div>
          <span className="text-xs text-charcoal/50 font-mono">
            Parties: Vivona & the Client
          </span>
        </div>

        {/* Legal Text */}
        <div className="prose prose-sm max-w-none text-xs text-charcoal/80 leading-relaxed space-y-4 max-h-80 overflow-y-auto p-4 rounded-xl bg-ivory-100 border border-border/60">
          <p className="font-semibold text-charcoal">
            1. PARTIES & ENGAGEMENT
          </p>
          <p>
            This Wedding Operations & Architecture Agreement is entered into between Vivona Luxury Weddings and the Client for exclusive production in Jaipur/Udaipur.
          </p>
          <p className="font-semibold text-charcoal">
            2. SCOPE OF OPERATIONAL SERVICES
          </p>
          <p>
            Vivona shall provide end-to-end management, 3-caterer structured tender evaluation, palace site recce, minute-by-minute run-of-show schedules, live vendor check-in tracking with automated late-arrival enforcement, and post-event audited settlements.
          </p>
          <p className="font-semibold text-charcoal">
            3. STAGED 3-TIER PAYMENT SCHEDULE
          </p>
          <p>
            The Client agrees to remit contract values in three verified milestones: 20% booking deposit upon signature, 30% advance 30 days prior to ceremony, and 50% final balance settled post-wedding following headcount reconciliation.
          </p>
          <p className="font-semibold text-charcoal">
            4. THE AGREEMENT GATE
          </p>
          <p>
            Per agency protocol, vendor contact lists, proprietary quote line-items, and palace layout floor plans are withheld until this Agreement is executed by the Client.
          </p>
        </div>

        {/* Touch E-Signature Pad Section */}
        <div className="pt-4 border-t border-border/80">
          <AgreementSignaturePad
            agreementId={agreement.id}
            defaultSignerName={session?.profile.full_name || ""}
            isAlreadySigned={isSigned}
            signedAt={agreement.signed_at}
            signedByName={agreement.signed_by_name}
          />
        </div>
      </div>

      {/* Agreement Gatekeeper Showcase: Vendor Shortlist */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-charcoal">
              Vendor Shortlist & Palace Floor Plans
            </h2>
            <p className="text-xs text-charcoal/60 mt-0.5">
              Curated caterer tenders, decor blueprints, and stage lighting riders.
            </p>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isSigned ? "bg-sage-100 text-sage-700" : "bg-maroon/10 text-maroon"
            }`}
          >
            {isSigned ? "✓ Gate Unlocked" : "🔒 Agreement Gate Active"}
          </span>
        </div>

        {isSigned ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-sage-300 bg-sage-50/50 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sage-700">3 Caterers Tender</span>
              <h3 className="font-serif text-base font-semibold text-charcoal">Catering Side-by-Side</h3>
              <p className="text-xs text-charcoal/70">
                Royal Rajputana (₹3,500/plate) vs Mewar Feast (₹3,800/plate) vs Udaivilas Gourmet.
              </p>
              <Link href="/client/proposal" className="text-xs font-semibold text-maroon hover:underline block pt-1">
                View Tasting Scores & Inclusions →
              </Link>
            </div>

            <div className="p-4 rounded-xl border border-sage-300 bg-sage-50/50 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sage-700">Heritage Decor</span>
              <h3 className="font-serif text-base font-semibold text-charcoal">Amber Palace Mandap</h3>
              <p className="text-xs text-charcoal/70">
                Imported hydrangeas, royal brass samagri, and 3D architectural elevations.
              </p>
              <span className="text-xs font-semibold text-sage-700 block pt-1">✓ Blueprint Verified</span>
            </div>

            <div className="p-4 rounded-xl border border-sage-300 bg-sage-50/50 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sage-700">Floor Plans</span>
              <h3 className="font-serif text-base font-semibold text-charcoal">Baraat Route & Seating</h3>
              <p className="text-xs text-charcoal/70">
                Rambagh 450-guest round-table setup with central Varmala revolving stage.
              </p>
              <span className="text-xs font-semibold text-sage-700 block pt-1">✓ PDF Map Download Ready</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-maroon/30 bg-maroon/5 p-8 text-center space-y-3">
            <div className="text-2xl">🔒</div>
            <h3 className="font-serif text-xl font-semibold text-maroon">
              Vendor Shortlist Locked
            </h3>
            <p className="text-xs text-charcoal/70 max-w-md mx-auto leading-relaxed">
              Per Vivona agency policy, caterer bids, negotiated price-per-plate tenders, and palace floor plans unlock automatically the moment your Service Agreement is signed.
            </p>
            <p className="text-[11px] text-maroon font-semibold">
              Please draw your signature above to release access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
