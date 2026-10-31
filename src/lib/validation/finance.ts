import { z } from "zod";

export const RecordClientReceiptSchema = z.object({
  weddingId: z.string().uuid(),
  milestoneId: z.string().uuid().nullable().optional(),
  amountRupees: z.coerce.number().min(1, "Amount must be at least ₹1."),
  paymentMethod: z.enum(["bank_transfer", "neft", "rtgs", "cheque", "upi", "cash"]).default("bank_transfer"),
  reference: z.string().min(3, "Payment transaction reference is required."),
  idempotencyKey: z.string().min(5, "Idempotency key is required."),
  notes: z.string().optional(),
});

export type RecordClientReceiptInput = z.infer<typeof RecordClientReceiptSchema>;

export const RecordVendorPaymentSchema = z.object({
  weddingId: z.string().uuid(),
  weddingVendorId: z.string().uuid(),
  billId: z.string().uuid().nullable().optional(),
  amountRupees: z.coerce.number().min(1, "Amount must be at least ₹1."),
  paymentMethod: z.enum(["bank_transfer", "neft", "rtgs", "cheque", "cash"]).default("bank_transfer"),
  reference: z.string().min(3, "Vendor payment transaction reference is required."),
  idempotencyKey: z.string().min(5, "Idempotency key is required."),
  notes: z.string().optional(),
});

export type RecordVendorPaymentInput = z.infer<typeof RecordVendorPaymentSchema>;

export const DecideExtraChargeSchema = z.object({
  extraChargeId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});
