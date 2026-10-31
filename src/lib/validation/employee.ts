import { z } from "zod";

export const UpdateTaskStageSchema = z.object({
  taskId: z.string().uuid(),
  stage: z.enum(["to_plan", "in_progress", "blocked", "done"]),
  notes: z.string().optional(),
});

export const LogIncidentSchema = z.object({
  weddingId: z.string().uuid(),
  title: z.string().min(3, "Incident title must be at least 3 characters."),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(5, "Please provide description details."),
  ownerId: z.string().uuid().optional(),
});

export const ResolveIncidentSchema = z.object({
  incidentId: z.string().uuid(),
  resolution: z.string().min(5, "Please describe the resolution."),
});

export const VendorCheckinSchema = z.object({
  checkinId: z.string().uuid(),
  status: z.enum(["arrived", "late", "no_show"]),
  notes: z.string().optional(),
});

export const ShiftScheduleSchema = z.object({
  weddingId: z.string().uuid(),
  fromEntryId: z.string().uuid(),
  shiftMinutes: z.coerce.number().int().min(5).max(180),
});

export const SendMessageSchema = z.object({
  weddingId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  body: z.string().min(1, "Message cannot be empty.").max(2000),
});

export const LogTimesheetSchema = z.object({
  weddingId: z.string().uuid(),
  date: z.string().min(1, "Please select date."),
  hours: z.coerce.number().min(0.5, "Minimum 0.5 hours.").max(24, "Maximum 24 hours per entry."),
  notes: z.string().optional(),
});

export const RequestExtraChargeSchema = z.object({
  weddingId: z.string().uuid(),
  kind: z.string().default("client_request"),
  title: z.string().min(3, "Title must be at least 3 characters."),
  qty: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  unitPriceRupees: z.coerce.number().min(1, "Price must be positive."),
  reason: z.string().min(5, "Please explain why extra charges were incurred."),
});
