-- RLS users: SELECT para usuarios de la misma empresa (informe de inspección).
-- Permite que un INSPECTOR de la empresa lea nombre/correo del inspector responsable
-- de una inspección de su misma empresa. No abre acceso entre empresas.
-- Idempotente. Ejecutar en SQL Editor de Supabase si aún no está aplicada.

DROP POLICY IF EXISTS "company_member_select_company_users" ON users;

CREATE POLICY "company_member_select_company_users" ON users
  FOR SELECT
  USING (
    company_id IS NOT NULL
    AND company_id = get_current_user_company_id()
  );
