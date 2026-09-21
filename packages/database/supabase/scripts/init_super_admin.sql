-- ============================================
-- INIT SUPER ADMIN + ACME COMPANY
-- Etapa 02 — MASTER DATA (Foundation completado)
-- Fuente de verdad: CURRENT.md, DECISIONS.md, 01_FOUNDATION.md
-- ============================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

ALTER TABLE users DISABLE TRIGGER audit_users;
ALTER TABLE companies DISABLE TRIGGER audit_companies;

INSERT INTO users (id, auth_id, email, full_name, company_id, role, is_active, created_at, updated_at, last_login_at)
VALUES (gen_random_uuid(), 'bba63d43-5976-494c-8bc5-c6f8e610fa75', 'devnx+quality@nxchile.com', 'Admin NX Quality', NULL, 'SUPER_ADMIN', true, now(), now(), NULL);

DO $$
DECLARE
  v_user_id UUID := (SELECT id FROM users WHERE auth_id = 'bba63d43-5976-494c-8bc5-c6f8e610fa75' LIMIT 1);
BEGIN
  INSERT INTO companies (id, name, code, is_active, created_at, updated_at, created_by)
  VALUES (gen_random_uuid(), 'ACME', 'ACME', true, now(), now(), v_user_id);

  UPDATE users SET company_id = (SELECT id FROM companies WHERE code = 'ACME' LIMIT 1) WHERE id = v_user_id;
END $$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE users ENABLE TRIGGER audit_users;
ALTER TABLE companies ENABLE TRIGGER audit_companies;
