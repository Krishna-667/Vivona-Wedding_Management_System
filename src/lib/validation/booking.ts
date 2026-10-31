import { z } from "zod";

export const BookingStep1Schema = z.object({
  type: z.enum(["package", "custom"], {
    required_error: "Please select either a curated Package or a Custom Blueprint.",
  }),
  packageSlug: z.string().optional(),
});

export const BookingStep2Schema = z.object({
  city: z.enum(["Jaipur", "Udaipur"], {
    required_error: "Please select the wedding destination city (Jaipur or Udaipur).",
  }),
  preferredStartDate: z.string().min(1, "Please select the ceremony start date."),
  preferredEndDate: z.string().min(1, "Please select the ceremony end date."),
  guestCount: z.coerce
    .number()
    .int()
    .min(50, "Minimum guest capacity is 50.")
    .max(2500, "For celebrations over 2,500 guests, please contact our executive desk directly."),
  theme: z.string().min(2, "Please choose or specify an aesthetic theme."),
  budgetMaxRupees: z.coerce
    .number()
    .min(1000000, "Minimum budget for our Rajasthan production tier is ₹10 Lakhs."),
});

export const CustomServiceItemSchema = z.object({
  category: z.string(),
  name: z.string(),
  selected: z.boolean().default(true),
  notes: z.string().optional(),
  basePricePaise: z.number().default(0),
});

export const BookingStep3CustomSchema = z.object({
  customServices: z.array(CustomServiceItemSchema).min(1, "Please select at least one core service category."),
});

export const BookingStep4Schema = z.object({
  contactName: z.string().min(2, "Please enter your name or couple names."),
  contactEmail: z.string().email("Please enter a valid contact email."),
  contactPhone: z
    .string()
    .min(10, "Please enter a valid mobile number for WhatsApp coordination."),
  notes: z.string().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the privacy policy and data processing." }),
  }),
  turnstileToken: z.string().optional(),
});

export const FullBookingSubmissionSchema = z.object({
  type: z.enum(["package", "custom"]),
  packageSlug: z.string().optional(),
  city: z.enum(["Jaipur", "Udaipur"]),
  preferredStartDate: z.string(),
  preferredEndDate: z.string(),
  guestCount: z.number().int().min(50),
  theme: z.string(),
  budgetMaxPaise: z.number().int().nonnegative(),
  customServices: z.array(CustomServiceItemSchema).default([]),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10),
  notes: z.string().optional(),
  consent: z.boolean(),
  turnstileToken: z.string().optional(),
});

export type FullBookingSubmission = z.infer<typeof FullBookingSubmissionSchema>;
