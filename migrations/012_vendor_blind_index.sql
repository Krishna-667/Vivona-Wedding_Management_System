-- 012_vendor_blind_index.sql
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS phone_bidx TEXT,
  ADD COLUMN IF NOT EXISTS email_bidx TEXT;

CREATE INDEX IF NOT EXISTS idx_vendors_phone_bidx ON public.vendors(phone_bidx);
CREATE INDEX IF NOT EXISTS idx_vendors_email_bidx ON public.vendors(email_bidx);
