import { z } from "zod";
import type { EnquiryStatus } from "@/types/database";

/**
 * Valid enquiry state machine transitions
 * Strictly enforces sequential moves and terminal states
 */
export const ENQUIRY_TRANSITIONS: Record<EnquiryStatus, EnquiryStatus[]> = {
  new: ["contacted", "lost"],
  contacted: ["consultation_scheduled", "lost"],
  consultation_scheduled: ["agreement_sent", "lost"],
  agreement_sent: ["agreement_signed", "lost"],
  agreement_signed: ["proposal_sent", "lost"],
  proposal_sent: ["confirmed", "lost"],
  confirmed: [], // terminal
  lost: [],      // terminal
};

export function canTransitionEnquiry(
  from: EnquiryStatus,
  to: EnquiryStatus
): { valid: boolean; reason?: string } {
  if (from === to) return { valid: true };

  const allowed = ENQUIRY_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    return {
      valid: false,
      reason: `Illegal state transition from "${from}" to "${to}". Follow the standard luxury CRM sequence.`,
    };
  }

  return { valid: true };
}

export const ScheduleConsultationSchema = z.object({
  enquiryId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  time: z.string().min(1, "Please specify consultation time"),
  meetingType: z.enum(["video_call", "in_person_jaipur", "in_person_udaipur", "phone_call"]),
  notes: z.string().optional(),
});

export type ScheduleConsultationInput = z.infer<typeof ScheduleConsultationSchema>;

export const ProposalLineItemSchema = z.object({
  category: z.enum([
    "venue",
    "decor",
    "catering",
    "entertainment",
    "photography",
    "makeup",
    "logistics",
    "sound_light",
    "miscellaneous",
  ]),
  label: z.string().min(2, "Item label is required"),
  qty: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit required"),
  unitPricePaise: z.number().nonnegative("Unit price must be non-negative"),
  taxPct: z.number().min(0).max(100).default(18),
});

export type ProposalLineItemInput = z.infer<typeof ProposalLineItemSchema>;

export const PaymentPlanItemSchema = z.object({
  kind: z.enum(["booking", "advance", "final", "extra"]),
  pct: z.number().min(1).max(100),
  description: z.string().optional(),
});

export const ProposalBuilderSchema = z
  .object({
    enquiryId: z.string().uuid(),
    validDays: z.number().min(1).max(90).default(30),
    lines: z.array(ProposalLineItemSchema).min(1, "At least one item line is required"),
    paymentPlan: z.array(PaymentPlanItemSchema).min(1, "Payment plan required"),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      const sumPct = data.paymentPlan.reduce((acc, curr) => acc + curr.pct, 0);
      return Math.abs(sumPct - 100) < 0.01;
    },
    {
      message: "The staged payment plan percentages must strictly sum to 100%.",
      path: ["paymentPlan"],
    }
  );

export type ProposalBuilderInput = z.infer<typeof ProposalBuilderSchema>;

export const BookingDepositSchema = z.object({
  enquiryId: z.string().uuid(),
  amountPaise: z.number().positive("Deposit amount must be greater than 0"),
  reference: z.string().min(3, "Payment transaction reference is required"),
  paymentMethod: z.string().default("bank_transfer"),
  notes: z.string().optional(),
});

export type BookingDepositInput = z.infer<typeof BookingDepositSchema>;
