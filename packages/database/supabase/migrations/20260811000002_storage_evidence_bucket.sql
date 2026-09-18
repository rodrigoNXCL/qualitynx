-- QualityNX FOUNDATION - Storage Configuration
-- Configuración de buckets de Supabase Storage para evidencias
-- 01_FOUNDATION.md - Sección 15: ALMACENAMIENTO DE EVIDENCIAS

-- ============================================
-- BUCKET: evidence
-- ============================================

-- Crear bucket para evidencias (fotos, documentos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  false, -- privado, acceso controlado por RLS
  52428800, -- 50MB límite por archivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/heic', 'image/heif']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- POLÍTICAS RLS PARA STORAGE
-- ============================================

-- Habilitar RLS en objetos del bucket evidence
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver evidencias de su empresa
CREATE POLICY "evidence_select_company" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'evidence'
    AND (
      -- Super Admin ve todo
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
        AND users.role = 'SUPER_ADMIN'
        AND users.is_active = true
      )
      OR
      -- Company Admin e Inspector ven de su empresa
      (storage.foldername(name))[1] = (
        SELECT company_id::text FROM users
        WHERE users.auth_id = auth.uid()
        AND users.is_active = true
      )
    )
  );

-- Política: Usuarios pueden subir evidencias a su carpeta de empresa
CREATE POLICY "evidence_insert_company" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'evidence'
    AND (
      -- Super Admin puede subir a cualquier carpeta
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
        AND users.role = 'SUPER_ADMIN'
        AND users.is_active = true
      )
      OR
      -- Company Admin e Inspector suben a su carpeta de empresa
      (storage.foldername(name))[1] = (
        SELECT company_id::text FROM users
        WHERE users.auth_id = auth.uid()
        AND users.is_active = true
      )
    )
  );

-- Política: Usuarios pueden actualizar sus propias evidencias
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

-- Política: Usuarios pueden eliminar sus propias evidencias
CREATE POLICY "evidence_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'evidence'
    AND owner = auth.uid()
  );

-- ============================================
-- ESTRUCTURA DE CARPETAS RECOMENDADA
-- ============================================
-- evidence/
--   {company_id}/
--     inspections/
--       {inspection_id}/
--         {evidence_files}
--     measurements/
--       {measurement_id}/
--         {evidence_files}
--     general/
--       {evidence_files}

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON POLICY "evidence_select_company" ON storage.objects IS 'Aislamiento multiempresa para evidencias (01_FOUNDATION.md Sección 15)';
COMMENT ON POLICY "evidence_insert_company" ON storage.objects IS 'Subida de evidencias restringida a empresa del usuario';
COMMENT ON POLICY "evidence_update_own" ON storage.objects IS 'Usuario solo puede modificar sus propias evidencias';
COMMENT ON POLICY "evidence_delete_own" ON storage.objects IS 'Usuario solo puede eliminar sus propias evidencias';