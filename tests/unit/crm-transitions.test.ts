import { describe, it, expect } from "vitest";
import { canTransitionEnquiry } from "@/lib/validation/crm";
import type { EnquiryStatus } from "@/types/database";

describe("Phase 3: CRM Pipeline State Transitions", () => {
  it("allows valid sequential transitions across standard lifecycle", () => {
    // new -> contacted
    expect(canTransitionEnquiry("new", "contacted").valid).toBe(true);

    // contacted -> consultation_scheduled
    expect(canTransitionEnquiry("contacted", "consultation_scheduled").valid).toBe(true);

    // consultation_scheduled -> agreement_sent
    expect(canTransitionEnquiry("consultation_scheduled", "agreement_sent").valid).toBe(true);

    // agreement_sent -> agreement_signed
    expect(canTransitionEnquiry("agreement_sent", "agreement_signed").valid).toBe(true);

    // agreement_signed -> proposal_sent
    expect(canTransitionEnquiry("agreement_signed", "proposal_sent").valid).toBe(true);

    // proposal_sent -> confirmed
    expect(canTransitionEnquiry("proposal_sent", "confirmed").valid).toBe(true);
  });

  it("allows dropping out to 'lost' from any active status", () => {
    const activeStatuses: EnquiryStatus[] = [
      "new",
      "contacted",
      "consultation_scheduled",
      "agreement_sent",
      "agreement_signed",
      "proposal_sent",
    ];

    for (const status of activeStatuses) {
      const check = canTransitionEnquiry(status, "lost");
      expect(check.valid).toBe(true);
    }
  });

  it("strictly rejects illegal forward skipping", () => {
    // Cannot skip directly from new to confirmed
    const skipCheck = canTransitionEnquiry("new", "confirmed");
    expect(skipCheck.valid).toBe(false);
    expect(skipCheck.reason).toContain("Illegal state transition");

    // Cannot skip from new directly to proposal_sent
    expect(canTransitionEnquiry("new", "proposal_sent").valid).toBe(false);

    // Cannot jump from contacted directly to agreement_signed without sending agreement
    expect(canTransitionEnquiry("contacted", "agreement_signed").valid).toBe(false);
  });

  it("strictly rejects illegal backwards moves from terminal states", () => {
    // Cannot reopen confirmed wedding enquiry back to new or contacted
    expect(canTransitionEnquiry("confirmed", "new").valid).toBe(false);
    expect(canTransitionEnquiry("confirmed", "contacted").valid).toBe(false);

    // Cannot transition lost back to agreement_signed directly
    expect(canTransitionEnquiry("lost", "agreement_signed").valid).toBe(false);
  });
});
