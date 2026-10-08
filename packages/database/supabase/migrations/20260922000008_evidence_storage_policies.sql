-- QualityNX FIX — políticas RLS bucket evidence (solo CREATE POLICY)
-- Contexto: SQL Editor NO es owner de storage.objects → NO usar ALTER TABLE.
-- RLS ya está habilitado por defecto en storage.objects (Supabase).
-- Si CREATE POLICY también da 42501 → crear las 4 policies desde
-- Dashboard → Storage → evidence → Policies (ver docs/SUPABASE_SETUP.md).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/heic', 'image/heif']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "evidence_select_company" ON storage.objects;
DROP POLICY IF EXISTS "evidence_insert_company" ON storage.objects;
DROP POLICY IF EXISTS "evidence_update_own" ON storage.objects;
DROP POLICY IF EXISTS "evidence_delete_own" ON storage.objects;

CREATE POLICY "evidence_select_company" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'evidence'
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
          AND users.role = 'SUPER_ADMIN'
          AND users.is_active = true
      )
      OR
      (storage.foldername(name))[1] = (
        SELECT company_id::text FROM users
        WHERE users.auth_id = auth.uid()
          AND users.is_active = true
      )
    )
  );

CREATE POLICY "evidence_insert_company" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'evidence'
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
          AND users.role = 'SUPER_ADMIN'
          AND users.is_active = true
      )
      OR
      (storage.foldername(name))[1] = (
        SELECT company_id::text FROM users
        WHERE users.auth_id = auth.uid()
          AND users.is_active = true
      )
    )
  );

CREATE POLICY "evidence_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'evidence'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'evidence'
    AND owner = auth.uid()
  );

CREATE POLICY "evidence_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'evidence'
    AND owner = auth.uid()
  );
