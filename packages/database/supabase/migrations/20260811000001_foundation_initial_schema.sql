-- QualityNX FOUNDATION - Initial Schema
-- Migración inicial para la etapa 01 - FOUNDATION
-- Basado en 01_FOUNDATION.md y CURRENT.md

-- ============================================
-- EXTENSIONES
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'INSPECTOR'
);

CREATE TYPE audit_action AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'ACCESS_DENIED',
  'ROLE_CHANGE',
  'COMPANY_ASSIGNMENT'
);

-- ============================================
-- TABLA: COMPANIES (Empresas)
-- 01_FOUNDATION.md - Sección 6: MULTIEMPRESA
-- ============================================

-- FUNCIÓN AUXILIAR: update_updated_at_column
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Índices
CREATE INDEX idx_companies_code ON companies(code);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- Trigger para updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: USERS (Usuarios)
-- 01_FOUNDATION.md - Sección 10: IDENTIDAD DE USUARIO
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL UNIQUE, -- Referencia a auth.users de Supabase
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'INSPECTOR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Trigger para updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: AUDIT_LOGS (Auditoría Base)
-- 01_FOUNDATION.md - Sección 13: AUDITORÍA BASE
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action audit_action NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas de auditoría
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- 01_FOUNDATION.md - Sección 9: SEGURIDAD DE DATOS
-- ============================================

-- Habilitar RLS en todas las tablas operacionales
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS: COMPANIES
-- ============================================

-- Super Admin puede ver todas las empresas
CREATE POLICY "super_admin_all_companies" ON companies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
      AND users.is_active = true
    )
  );

-- Company Admin ve solo su empresa
CREATE POLICY "company_admin_own_company" ON companies
  FOR SELECT
  USING (
    id = (
      SELECT company_id FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'COMPANY_ADMIN'
      AND users.is_active = true
    )
  );

-- Inspector ve solo su empresa
CREATE POLICY "inspector_own_company" ON companies
  FOR SELECT
  USING (
    id = (
      SELECT company_id FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'INSPECTOR'
      AND users.is_active = true
    )
  );

-- ============================================
-- POLÍTICAS RLS: USERS
-- ============================================

-- Super Admin ve todos los usuarios
CREATE POLICY "super_admin_all_users" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND u.role = 'SUPER_ADMIN'
      AND u.is_active = true
    )
  );

-- Company Admin ve usuarios de su empresa
CREATE POLICY "company_admin_company_users" ON users
  FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users u
      WHERE u.auth_id = auth.uid()
      AND u.role = 'COMPANY_ADMIN'
      AND u.is_active = true
    )
  );

-- Company Admin puede crear/actualizar usuarios de su empresa
CREATE POLICY "company_admin_manage_company_users" ON users
  FOR INSERT
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users u
      WHERE u.auth_id = auth.uid()
      AND u.role = 'COMPANY_ADMIN'
      AND u.is_active = true
    )
    AND role IN ('COMPANY_ADMIN', 'INSPECTOR')
  );

CREATE POLICY "company_admin_update_company_users" ON users
  FOR UPDATE
  USING (
    company_id = (
      SELECT company_id FROM users u
      WHERE u.auth_id = auth.uid()
      AND u.role = 'COMPANY_ADMIN'
      AND u.is_active = true
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id FROM users u
      WHERE u.auth_id = auth.uid()
      AND u.role = 'COMPANY_ADMIN'
      AND u.is_active = true
    )
    AND role IN ('COMPANY_ADMIN', 'INSPECTOR')
  );

-- Inspector ve solo su propio registro
CREATE POLICY "inspector_own_user" ON users
  FOR SELECT
  USING (
    auth_id = auth.uid()
  );

-- Usuario puede actualizar su propio perfil (nombre, etc.)
CREATE POLICY "user_update_own_profile" ON users
  FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS: AUDIT_LOGS
-- ============================================

-- Super Admin ve todos los logs
CREATE POLICY "super_admin_all_audit_logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
      AND users.is_active = true
    )
  );

-- Company Admin ve logs de su empresa
CREATE POLICY "company_admin_company_audit_logs" ON audit_logs
  FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'COMPANY_ADMIN'
      AND users.is_active = true
    )
  );

-- Inspector ve logs de su empresa
CREATE POLICY "inspector_company_audit_logs" ON audit_logs
  FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'INSPECTOR'
      AND users.is_active = true
    )
  );

-- Sistema puede insertar logs (para triggers)
CREATE POLICY "system_insert_audit_logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FUNCIÓN PARA OBTENER COMPANY_ID DEL USUARIO ACTUAL
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM users
  WHERE auth_id = auth.uid()
  AND is_active = true;
  
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN PARA OBTENER ROL DEL USUARIO ACTUAL
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM users
  WHERE auth_id = auth.uid()
  AND is_active = true;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN PARA VERIFICAR SI ES SUPER ADMIN
-- ============================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() = 'SUPER_ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS DE AUDITORÍA AUTOMÁTICA
-- ============================================

-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_action audit_action;
  v_previous JSONB;
  v_new JSONB;
BEGIN
  -- Obtener usuario actual
  SELECT id, company_id INTO v_user_id, v_company_id
  FROM users
  WHERE auth_id = auth.uid();
  
  -- Determinar acción
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_previous := NULL;
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_previous := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_previous := to_jsonb(OLD);
    v_new := NULL;
  END IF;
  
  -- Insertar log de auditoría
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    user_id,
    company_id,
    previous_value,
    new_value,
    reason
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_user_id,
    v_company_id,
    v_previous,
    v_new,
    NULL
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de auditoría a tablas principales
CREATE TRIGGER audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE companies IS 'Empresas clientes - aislamiento multiempresa (01_FOUNDATION.md Sección 6)';
COMMENT ON TABLE users IS 'Usuarios del sistema con rol y empresa (01_FOUNDATION.md Sección 10)';
COMMENT ON TABLE audit_logs IS 'Auditoría base de modificaciones relevantes (01_FOUNDATION.md Sección 13)';
COMMENT ON COLUMN users.auth_id IS 'Referencia a auth.users de Supabase Auth';
COMMENT ON COLUMN users.company_id IS 'NULL para SUPER_ADMIN, obligatorio para otros roles';
COMMENT ON COLUMN audit_logs.previous_value IS 'Valor anterior en JSONB para UPDATE/DELETE';
COMMENT ON COLUMN audit_logs.new_value IS 'Valor nuevo en JSONB para INSERT/UPDATE';