-- ============================================================
-- FIX RLS: users + companies
-- Problema: policies originales hacen subquery directa a users
-- (recursión infinita 42P17) y la versión intermedia dependía
-- de claims de user_metadata que no existen en los JWT reales.
-- Solución: usar funciones SECURITY DEFINER ya definidas en
-- 20260811000001_foundation_initial_schema.sql
-- (get_current_user_role / get_current_user_company_id).
-- Ejecutado en Supabase SQL Editor: 2026-09-22
-- ============================================================

-- ============================================
-- USERS
-- ============================================

DROP POLICY IF EXISTS "super_admin_all_users" ON users;
DROP POLICY IF EXISTS "company_admin_company_users" ON users;
DROP POLICY IF EXISTS "company_admin_manage_company_users" ON users;
DROP POLICY IF EXISTS "company_admin_update_company_users" ON users;
DROP POLICY IF EXISTS "inspector_own_user" ON users;
DROP POLICY IF EXISTS "user_update_own_profile" ON users;

CREATE POLICY "super_admin_all_users" ON users
  FOR ALL
  USING (get_current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "company_admin_company_users" ON users
  FOR SELECT
  USING (
    get_current_user_role() = 'COMPANY_ADMIN'
    AND company_id = get_current_user_company_id()
  );

CREATE POLICY "company_admin_manage_company_users" ON users
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'COMPANY_ADMIN'
    AND company_id = get_current_user_company_id()
    AND role IN ('COMPANY_ADMIN', 'INSPECTOR')
  );

CREATE POLICY "company_admin_update_company_users" ON users
  FOR UPDATE
  USING (
    get_current_user_role() = 'COMPANY_ADMIN'
    AND company_id = get_current_user_company_id()
  )
  WITH CHECK (
    get_current_user_role() = 'COMPANY_ADMIN'
    AND company_id = get_current_user_company_id()
    AND role IN ('COMPANY_ADMIN', 'INSPECTOR')
  );

CREATE POLICY "inspector_own_user" ON users
  FOR SELECT
  USING (auth_id = auth.uid());

CREATE POLICY "user_update_own_profile" ON users
  FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- ============================================
-- COMPANIES
-- ============================================

DROP POLICY IF EXISTS "super_admin_all_companies" ON companies;
DROP POLICY IF EXISTS "company_admin_own_company" ON companies;
DROP POLICY IF EXISTS "inspector_own_company" ON companies;

CREATE POLICY "super_admin_all_companies" ON companies
  FOR ALL
  USING (get_current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "company_admin_own_company" ON companies
  FOR SELECT
  USING (
    get_current_user_role() = 'COMPANY_ADMIN'
    AND id = get_current_user_company_id()
  );

CREATE POLICY "inspector_own_company" ON companies
  FOR SELECT
  USING (
    get_current_user_role() = 'INSPECTOR'
    AND id = get_current_user_company_id()
  );
