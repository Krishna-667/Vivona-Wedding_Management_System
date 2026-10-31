export type UserRole = "admin" | "employee" | "client";
export type PackageType = "full_service" | "day_of";
export type EnquiryStatus =
  | "new"
  | "contacted"
  | "consultation_scheduled"
  | "agreement_sent"
  | "agreement_signed"
  | "proposal_sent"
  | "confirmed"
  | "lost";
export type EnquiryType = "package" | "custom";
export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected" | "superseded";
export type AgreementStatus = "draft" | "sent" | "signed" | "cancelled";
export type WeddingStatus = "planning" | "live" | "completed" | "settled" | "archived";
export type VendorCategory =
  | "catering"
  | "decor"
  | "photography"
  | "entertainment"
  | "makeup"
  | "logistics"
  | "venue"
  | "other";
export type RFQStatus = "open" | "quotes_received" | "awarded" | "closed_not_selected" | "cancelled";
export type QuoteStatus = "submitted" | "under_review" | "selected" | "closed_not_selected" | "rejected";
export type TaskPhase =
  | "pre_wedding"
  | "mehendi"
  | "sangeet"
  | "wedding_day"
  | "reception"
  | "post_wedding";
export type TaskStage = "to_plan" | "in_progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type CheckinStatus = "pending" | "arrived" | "late" | "no_show";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "in_progress" | "resolved";
export type MilestoneKind = "booking" | "advance" | "final" | "extra";
export type MilestoneStatus = "pending" | "partially_paid" | "paid" | "overdue";
export type PaymentDirection = "inbound" | "outbound";
export type ExtraChargeStatus = "requested" | "approved" | "rejected" | "billed";
export type VendorBillStatus = "received" | "verified" | "paid" | "disputed";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  hourly_rate_paise: bigint | number;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeddingAssignment {
  id: string;
  wedding_id: string;
  employee_id: string;
  assigned_by: string | null;
  role_on_wedding: "lead_planner" | "coordinator" | "assistant";
  assigned_at: string;
  employee?: Profile;
}

export interface Package {
  id: string;
  slug: string;
  name: string;
  type: PackageType;
  tagline: string | null;
  description: string | null;
  inclusions: string[];
  starting_price_paise: bigint | number;
  is_active: boolean;
  display_order: number;
}

export interface ServiceCatalogItem {
  id: string;
  category: VendorCategory;
  name: string;
  description: string | null;
  base_price_paise: bigint | number;
  unit_label: string;
  min_guests: number | null;
  max_guests: number | null;
  is_active: boolean;
}

export interface SocialProof {
  id: string;
  platform: "instagram" | "youtube" | "google_review";
  handle: string;
  author_name: string;
  post_url: string;
  thumbnail_url: string | null;
  caption: string;
  rating: number | null;
  featured: boolean;
  display_order: number;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Enquiry {
  id: string;
  code: string;
  client_id: string | null;
  source: string;
  type: EnquiryType;
  package_id: string | null;
  city: "Jaipur" | "Udaipur";
  preferred_start_date: string | null;
  preferred_end_date: string | null;
  guest_count: number;
  theme: string | null;
  budget_max_paise: bigint | number;
  custom_services: Array<{ category: string; service_id?: string; notes?: string }>;
  status: EnquiryStatus;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  package?: Package;
}

export interface Wedding {
  id: string;
  code: string;
  client_id: string;
  enquiry_id: string | null;
  package_id: string | null;
  title: string;
  venue: string;
  city: "Jaipur" | "Udaipur";
  start_date: string;
  end_date: string;
  guest_count_planned: number;
  status: WeddingStatus;
  budget_paise: bigint | number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: Profile;
  assignments?: WeddingAssignment[];
}

export interface Vendor {
  id: string;
  category: VendorCategory;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  city: string;
  address: string | null;
  rating: number;
  notes: string | null;
  is_active: boolean;
}

export interface WeddingVendor {
  id: string;
  wedding_id: string;
  vendor_id: string;
  quote_id: string | null;
  category: VendorCategory;
  agreed_amount_paise: bigint | number;
  service_date: string | null;
  expected_arrival_at: string | null;
  notes: string | null;
  vendor?: Vendor;
}

export interface Task {
  id: string;
  wedding_id: string;
  owner_id: string;
  phase: TaskPhase;
  title: string;
  description: string | null;
  stage: TaskStage;
  priority: TaskPriority;
  due_date: string;
  notes: string | null;
  completed_at: string | null;
  owner?: Profile;
}

export interface ScheduleEntry {
  id: string;
  wedding_id: string;
  day_number: number;
  event_date: string;
  start_time: string;
  end_time: string;
  title: string;
  location: string;
  owner_id: string | null;
  status: "upcoming" | "in_progress" | "completed" | "delayed";
  notes: string | null;
  owner?: Profile;
}

export interface VendorCheckin {
  id: string;
  wedding_id: string;
  wedding_vendor_id: string;
  vendor_id: string;
  expected_at: string;
  arrived_at: string | null;
  grace_minutes: number;
  status: CheckinStatus;
  notes: string | null;
  vendor?: Vendor;
}

export interface Incident {
  id: string;
  wedding_id: string;
  severity: IncidentSeverity;
  title: string;
  description: string;
  owner_id: string | null;
  status: IncidentStatus;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  owner?: Profile;
}

export interface PaymentMilestone {
  id: string;
  wedding_id: string;
  kind: MilestoneKind;
  title: string;
  due_date: string;
  percentage: number;
  amount_paise: bigint | number;
  paid_amount_paise: bigint | number;
  status: MilestoneStatus;
}

export interface ClientReceipt {
  id: string;
  wedding_id: string;
  milestone_id: string | null;
  amount_paise: bigint | number;
  payment_method: string;
  reference: string;
  idempotency_key: string;
  received_at: string;
  notes: string | null;
}

export interface ExtraCharge {
  id: string;
  wedding_id: string;
  requested_by: string;
  kind: string;
  title: string;
  qty: number;
  unit_price_paise: bigint | number;
  total_paise: bigint | number;
  reason: string;
  evidence_path: string | null;
  status: ExtraChargeStatus;
  approved_by: string | null;
  approved_at: string | null;
}

export interface EnquiryActivity {
  id: string;
  enquiry_id: string;
  actor_id: string | null;
  activity_type: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ProposalLine {
  id: string;
  proposal_id: string;
  category: VendorCategory;
  label: string;
  qty: number;
  unit: string;
  unit_price_paise: bigint | number;
  tax_pct: number;
  total_paise: bigint | number;
  display_order: number;
}

export interface Proposal {
  id: string;
  enquiry_id: string;
  version: number;
  status: ProposalStatus;
  valid_until: string;
  subtotal_paise: bigint | number;
  tax_paise: bigint | number;
  total_paise: bigint | number;
  payment_plan: Array<{ kind: MilestoneKind; pct: number }>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  proposal_lines?: ProposalLine[];
}

export interface Agreement {
  id: string;
  wedding_id: string | null;
  enquiry_id: string | null;
  client_id: string;
  version: number;
  body_markdown: string;
  status: AgreementStatus;
  signed_at: string | null;
  signed_by_name: string | null;
  signature_path: string | null;
  signed_pdf_path: string | null;
  signer_meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
