-- ============================================================================
-- D-035 · SEPARACIÓN DE RESPONSABILIDADES: CREACIÓN DE EMPRESA Y
--          APROVISIONAMIENTO DE CATÁLOGO OPERACIONAL
-- ----------------------------------------------------------------------------
-- Corrige el defecto de create_company_with_catalog(), que es inutilizable.
--
-- Diagnóstico:
--   La función creaba la empresa y acto seguido clonaba el catálogo. Pero
--   species.company_id REFERENCES companies(id): la especie no puede existir
--   antes que la empresa, y clone_inspection_catalog exige que la especie ya
--   exista en la empresa destino. Ambas condiciones en una sola llamada son
--   incompatibles, por lo que la función fallaba siempre y revertía la empresa.
--
-- Inspección de consumidores (previo a este diseño):
--   · create_company_with_catalog → 0 consumidores fuera de 20261006000001.
--   · clone_inspection_catalog    → 0 consumidores fuera de migraciones.
--   · No existe UI ni API de creación de empresas. Las empresas reales se
--     crearon con paquetes/database/supabase/seed.sql y
--     packages/database/supabase/scripts/init_super_admin.sql, que hacen un
--     INSERT directo en companies.
--   Por tanto NO hay compatibilidad que preservar y sí conviene retirar el
--   nombre engañoso en lugar de mantenerlo.
--
-- Contrato definitivo (tres responsabilidades explícitas):
--   A. create_company(name, code, created_by)
--        Crea la empresa. No crea ningún dato maestro.
--   B. Configuración explícita de datos maestros de esa empresa
--        El operador crea las especies que la empresa vaya a operar.
--        QualityNX no las crea ni las deduce.
--   C. clone_inspection_catalog(origen, destino)
--        Aprovisiona el catálogo operacional. Resuelve species por identidad
--        de negocio (company_id + lower(name)) y falla si falta alguna.
--
-- Garantías que se mantienen intactas:
--   · No se crea species ni ningún otro maestro automáticamente.
--   · species sigue siendo por empresa; operational_stages sigue siendo global.
--   · decision_effects sigue vacío y sin tocar.
--   · RLS, auditoría, lock del catálogo maestro y guard de no sobrescritura
--     no se modifican.
--   · clone_inspection_catalog no se reemite: su cuerpo validado queda intacto.
--   · No se modifica ningún dato existente.
--   · No se toca D-032, D-033 ni D-034.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. A · Creación de empresa con el contrato correcto.
--    companies.code es UNIQUE: un código duplicado falla con el error nativo,
--    sin lógica adicional. created_by es NOT NULL y se recibe explícitamente.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_company(
  p_name VARCHAR(255),
  p_code VARCHAR(50),
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF p_created_by IS NULL THEN
    RAISE EXCEPTION 'create_company: el usuario creador es obligatorio (companies.created_by es NOT NULL)';
  END IF;

  INSERT INTO companies (name, code, created_by)
  VALUES (p_name, p_code, p_created_by)
  RETURNING id INTO v_company_id;

  RETURN v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION create_company(VARCHAR, VARCHAR, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_company(VARCHAR, VARCHAR, UUID) TO service_role;

COMMENT ON FUNCTION create_company(VARCHAR, VARCHAR, UUID) IS
  'A · Crea la empresa. No crea datos maestros. Flujo de aprovisionamiento en 3 pasos: (A) create_company -> (B) crear explícitamente las species de esa empresa -> (C) clone_inspection_catalog(origen, destino). No se puede fusionar A y C porque species.company_id referencia companies(id).';


-- ----------------------------------------------------------------------------
-- 2. Retiro del nombre engañoso.
--    No tiene consumidores, así que se elimina en lugar de mantener un
--    contrato que promete un catálogo que no puede aprovisionar.
--
--    Consecuencia conocida y aceptada: el texto de ayuda del trigger
--    lock_catalog_master, emitido desde 20261006000001 y ya aplicado, sigue
--    mencionando create_company_with_catalog. Ese archivo no se modifica por
--    instrucción explícita; el texto es una pista de error, no un contrato.
--
--    La firma usa VARCHAR sin longitud porque Postgres ignora el modificador
--    de longitud al comparar tipos de función: character varying y
--    character varying(255) son el mismo OID. Es la misma forma que ya
--    emplean los REVOKE/GRANT de 20261006000001.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS create_company_with_catalog(VARCHAR, VARCHAR, UUID, UUID);