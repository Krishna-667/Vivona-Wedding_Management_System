-- ==============================================================================
-- VIVONA — Storage Buckets and Policies Migration (Phase 1)
-- Public: site-assets
-- Private: agreements, quotes, invoices, evidence
-- ==============================================================================

-- 1. INSERT BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('site-assets', 'site-assets', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('agreements', 'agreements', false, 10485760, ARRAY['application/pdf', 'image/png']),
  ('quotes', 'quotes', false, 10485760, ARRAY['application/pdf']),
  ('invoices', 'invoices', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('evidence', 'evidence', false, 20971520, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. STORAGE POLICIES

-- Public site-assets: Anyone can read, only admin can insert/update/delete
CREATE POLICY "site_assets_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'site-assets');

CREATE POLICY "site_assets_admin_write" ON storage.objects
FOR ALL USING (bucket_id = 'site-assets' AND public.is_admin());

-- Agreements (Private): Admin full access; Client can read signed agreements
CREATE POLICY "agreements_admin_all" ON storage.objects
FOR ALL USING (bucket_id = 'agreements' AND public.is_admin());

CREATE POLICY "agreements_client_read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'agreements' AND auth.uid() IS NOT NULL
);

-- Quotes (Private): Admin only
CREATE POLICY "quotes_admin_all" ON storage.objects
FOR ALL USING (bucket_id = 'quotes' AND public.is_admin());

-- Invoices (Private): Admin only
CREATE POLICY "invoices_admin_all" ON storage.objects
FOR ALL USING (bucket_id = 'invoices' AND public.is_admin());

-- Evidence (Private): Admin and authenticated employees
CREATE POLICY "evidence_admin_all" ON storage.objects
FOR ALL USING (bucket_id = 'evidence' AND public.is_admin());

CREATE POLICY "evidence_emp_read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'evidence' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'employee')
  )
);
