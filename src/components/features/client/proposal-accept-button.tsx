"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { acceptProposalAction } from "@/app/actions/client";

export function ProposalAcceptButton({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await acceptProposalAction(proposalId);
      if (!res.ok) {
        toast.error(res.error || "Failed to accept proposal.");
        setLoading(false);
        return;
      }

      toast.success("Proposal formally accepted! Proceeding to Service Agreement...");
      router.push("/client/agreement");
      router.refresh();
    } catch {
      toast.error("Failed to connect. Please try again.");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleAccept}
      disabled={loading}
      className="w-full sm:w-auto rounded-xl bg-maroon px-8 py-3 text-xs font-semibold uppercase tracking-wider text-ivory hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-sm"
    >
      {loading ? "Confirming..." : "Accept Proposal & Staged Plan →"}
    </button>
  );
}
