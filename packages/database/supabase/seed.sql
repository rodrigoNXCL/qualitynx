-- QualityNX FOUNDATION - Seed Data
-- Datos iniciales para desarrollo y testing
-- 01_FOUNDATION.md - Sección 7: SUPER ADMIN, Sección 8: ROLES BASE

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Los usuarios de Supabase Auth se crean vía API o Dashboard.
-- Este seed solo crea los perfiles en la tabla 'users' después de que
-- los usuarios auth existan.
-- 
-- Para desarrollo local:
-- 1. Ejecutar: supabase db reset
-- 2. Crear usuarios en Supabase Auth (Dashboard o CLI)
-- 3. Ejecutar este seed con los auth_id correspondientes

-- ============================================
-- EMPRESA DE PRUEBA
-- ============================================

INSERT INTO companies (id, name, code, is_active, created_by)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Empresa Demo',
  'DEMO',
  true,
  '00000000-0000-0000-0000-000000000000' -- placeholder, se actualiza después
) ON CONFLICT (code) DO NOTHING;

-- ============================================
-- USUARIOS DE PRUEBA
-- ============================================
-- REEMPLAZAR LOS auth_id CON LOS REALES DE SUPABASE AUTH

-- Super Admin (auth_id debe coincidir con usuario creado en Supabase Auth)
-- INSERT INTO users (auth_id, email, full_name, company_id, role, is_active)
-- VALUES (
--   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- REEMPLAZAR con auth_id real
--   'superadmin@qualitynx.local',
--   'Super Admin',
--   NULL,
--   'SUPER_ADMIN',
--   true
-- ) ON CONFLICT (auth_id) DO NOTHING;

-- Company Admin para Empresa Demo
-- INSERT INTO users (auth_id, email, full_name, company_id, role, is_active)
-- VALUES (
--   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- REEMPLAZAR con auth_id real
--   'admin@demo.local',
--   'Admin Demo',
--   '11111111-1111-1111-1111-111111111111',
--   'COMPANY_ADMIN',
--   true
-- ) ON CONFLICT (auth_id) DO NOTHING;

-- Inspector para Empresa Demo
-- INSERT INTO users (auth_id, email, full_name, company_id, role, is_active)
-- VALUES (
--   'cccccccc-cccc-cccc-cccc-cccccccccccc', -- REEMPLAZAR con auth_id real
--   'inspector@demo.local',
--   'Inspector Demo',
--   '11111111-1111-1111-1111-111111111111',
--   'INSPECTOR',
--   true
-- ) ON CONFLICT (auth_id) DO NOTHING;

-- ============================================
-- ACTUALIZAR created_by DE LA EMPRESA
-- ============================================
-- UPDATE companies 
-- SET created_by = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
-- WHERE code = 'DEMO';

-- ============================================
-- INSTRUCCIONES PARA DESARROLLO LOCAL
-- ============================================
-- 1. Iniciar Supabase local: supabase start
-- 2. Abrir Studio: supabase studio
-- 3. En Authentication > Users, crear usuarios:
--    - superadmin@qualitynx.local / password123
--    - admin@demo.local / password123
--    - inspector@demo.local / password123
-- 4. Copiar los UUID de auth.users a este archivo
-- 5. Ejecutar: psql -f seed.sql (o desde Studio)
-- 6. Probar login en web/mobile