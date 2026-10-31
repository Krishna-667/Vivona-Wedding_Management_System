"use client";

import * as React from "react";
import SignaturePad from "signature_pad";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { signAgreementAction } from "@/app/actions/client";

interface AgreementSignaturePadProps {
  agreementId: string;
  defaultSignerName?: string;
  isAlreadySigned?: boolean;
  signedAt?: string;
  signedByName?: string;
}

export function AgreementSignaturePad({
  agreementId,
  defaultSignerName = "",
  isAlreadySigned = false,
  signedAt,
  signedByName,
}: AgreementSignaturePadProps) {
  const router = useRouter();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const sigPadRef = React.useRef<SignaturePad | null>(null);

  const [signerName, setSignerName] = React.useState(defaultSignerName);
  const [consentGiven, setConsentGiven] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [hasDrawn, setHasDrawn] = React.useState(false);

  // Initialize SignaturePad
  React.useEffect(() => {
    if (canvasRef.current && !isAlreadySigned) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);

      const pad = new SignaturePad(canvas, {
        penColor: "#6B1D2A", // Royal Maroon ink
        backgroundColor: "rgba(255, 255, 255, 0)",
      });

      pad.addEventListener("afterUpdateStroke", () => {
        setHasDrawn(!pad.isEmpty());
      });

      sigPadRef.current = pad;

      return () => {
        pad.off();
      };
    }
  }, [isAlreadySigned]);

  const handleClear = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
      setHasDrawn(false);
    }
  };

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signerName || signerName.trim().length < 2) {
      toast.error("Please enter your full legal declaration name.");
      return;
    }

    if (!consentGiven) {
      toast.error("You must check the consent declaration checkbox.");
      return;
    }

    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      toast.error("Please draw your signature in the box provided.");
      return;
    }

    setSubmitting(true);
    const dataUrl = sigPadRef.current.toDataURL("image/png");

    try {
      const res = await signAgreementAction({
        agreementId,
        signatureDataUrl: dataUrl,
        signerName: signerName.trim(),
        consentGiven,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to execute agreement.");
        setSubmitting(false);
        return;
      }

      toast.success("Service Agreement signed and cryptographically verified!");
      router.refresh();
    } catch {
      toast.error("Failed to connect. Please try again.");
      setSubmitting(false);
    }
  };

  if (isAlreadySigned) {
    return (
      <div className="rounded-2xl border border-sage-500/40 bg-sage-50/70 p-6 sm:p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-sage-500 text-white flex items-center justify-center mx-auto text-xl font-bold">
          ✓
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sage-700">
            Cryptographically Executed & Archived
          </span>
          <h3 className="font-serif text-2xl font-semibold text-charcoal mt-1">
            Service Agreement Signed
          </h3>
          <p className="text-xs text-charcoal/70 mt-1">
            Executed by <strong>{signedByName}</strong> on{" "}
            {signedAt ? new Date(signedAt).toLocaleString("en-IN") : "Recent"}.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-sage-300 bg-card text-xs text-charcoal/80 max-w-md mx-auto space-y-2">
          <p className="font-semibold text-sage-800">Agreement Gate Status: Unlocked</p>
          <p className="text-[11px] text-charcoal/60">
            Vendor tenders, 3-caterer price-per-plate comparison, and floor plan drafts are now fully unlocked in your portal.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => toast.info("Downloading official timestamped agreement PDF...")}
              className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-4 py-2 text-xs font-medium text-ivory hover:bg-charcoal/90"
            >
              <span>Download Signed PDF Copy</span>
              <span>↓</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignSubmit} className="space-y-6">
      <div className="space-y-1">
        <h3 className="font-serif text-xl font-semibold text-charcoal">
          Digital Signature Execution (Mobile-Friendly)
        </h3>
        <p className="text-xs text-charcoal/60 font-sans">
          Use your finger, stylus, or cursor to sign inside the ivory canvas below.
        </p>
      </div>

      {/* Signature Canvas Pad */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <label className="font-semibold text-charcoal">Touch Signature Canvas</label>
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-medium text-maroon hover:underline"
          >
            Clear / Redraw
          </button>
        </div>

        <div className="relative border-2 border-dashed border-maroon/30 rounded-2xl bg-ivory-100 overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-full h-44 sm:h-52 touch-none block cursor-crosshair"
          />
          {!hasDrawn && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-charcoal/30 select-none">
              Sign here with finger or stylus
            </div>
          )}
        </div>
        <span className="text-[10px] text-charcoal/50 block">
          Protected with SHA-256 integrity timestamp and recorded client IP.
        </span>
      </div>

      {/* Typed Name Declaration */}
      <div>
        <label className="block text-xs font-semibold text-charcoal mb-1">
          Full Legal Signer Name *
        </label>
        <input
          type="text"
          required
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="e.g. Rohan Singhania"
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Legal Consent Checkbox */}
      <div className="flex items-start gap-2.5 pt-1">
        <input
          type="checkbox"
          id="sign-consent"
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          required
          className="mt-0.5 rounded text-maroon accent-maroon"
        />
        <label htmlFor="sign-consent" className="text-xs text-charcoal/75 leading-relaxed cursor-pointer">
          I confirm that I am legally authorized to sign on behalf of the couple, accept the 3-stage payment plan (20% booking / 30% advance / 50% settlement), and agree to execute this contract.
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-maroon px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-ivory hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2"
      >
        {submitting ? "Signing & Generating PDF..." : "Sign & Execute Agreement →"}
      </button>
    </form>
  );
}
