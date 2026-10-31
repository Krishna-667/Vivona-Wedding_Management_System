-- ==============================================================================
-- Migration: 005_indexes.sql
-- Targeted High-Performance Indexes for Sub-25ms Query Times
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_enquiries_status_created ON public.enquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_client_created ON public.enquiries(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_wedding_stage ON public.tasks(wedding_id, stage);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_stage ON public.tasks(owner_id, stage);
CREATE INDEX IF NOT EXISTS idx_vendor_checkins_lookup ON public.vendor_checkins(wedding_vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON public.messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_due ON public.payment_milestones(wedding_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_wedding_assignments_pair ON public.wedding_assignments(employee_id, wedding_id);
CREATE INDEX IF NOT EXISTS idx_weddings_client_status ON public.weddings(client_id, status);
CREATE INDEX IF NOT EXISTS idx_files_lookup ON public.files(bucket, owner_id);
