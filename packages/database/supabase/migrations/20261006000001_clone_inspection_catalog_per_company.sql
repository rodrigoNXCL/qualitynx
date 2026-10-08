-- ============================================================================
-- D-035 · BLOQUEO 1 — CATÁLOGO DE INSPECCIÓN POR EMPRESA
-- ----------------------------------------------------------------------------
-- Objetivo: que toda empresa nueva disponga de su propio catálogo operacional
-- (puntos, criterios y planes de muestreo) y pueda inspeccionar sus lotes.
--
-- Reglas:
--   · No se modifica el catálogo maestro existente.
--   · No se modifican datos de ACME ni de ninguna empresa ya provisionada.
--   · No se amplían criterios ni tolerancias: la clonación copia exactamente
--     lo que la empresa origen ya tiene configurado.
--   · No se crean configuraciones nuevas de negocio.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Protección del catálogo de PUNTOS DE INSPECCIÓN
--    · INSERT   → solo dentro de clone_inspection_catalog (bandera de sesión).
--    · UPDATE   → bloqueado (el catálogo maestro no se redefine).
--    · DELETE   → bloqueado.
--
--    measurement_defs y sampling_plans NO se bloquean: la pantalla activa
--    /dashboard/inspection-points ya crea y edita criterios y planes dentro de
--    su propia empresa (RLS la limita a su COMPANY_ADMIN). Bloquearlos rompería
--    esa funcionalidad existente.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lock_catalog_master()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('qualitynx.catalog_clone', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION
        'El catálogo de inspección por empresa no se crea de forma manual. Usa clone_inspection_catalog(o crea la empresa con create_company_with_catalog).';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'El catálogo maestro de puntos de inspección no admite DELETE (%). El catálogo por empresa se deriva con clone_inspection_catalog.',
      OLD.name;
  END IF;

  RAISE EXCEPTION
    'El catálogo maestro de puntos de inspección no admite UPDATE (%). El catálogo por empresa se deriva con clone_inspection_catalog.',
    NEW.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Se eliminan AMBOS nombres: el original y el de esta migración, para que
-- reejecutar el archivo no falle con "trigger already exists".
DROP TRIGGER IF EXISTS lock_new_inspection_points ON inspection_points;
DROP TRIGGER IF EXISTS lock_inspection_points_master ON inspection_points;
CREATE TRIGGER lock_inspection_points_master
  BEFORE INSERT OR UPDATE OR DELETE ON inspection_points
  FOR EACH ROW EXECUTE FUNCTION lock_catalog_master();


-- ----------------------------------------------------------------------------
-- 2. Clonación del catálogo de inspección de una empresa a otra.
--
--    Clona, copiando el contenido configurado de la origen sin modificarlo:
--      · inspection_points   (incluye species_id y operational_stage_id)
--      · measurement_defs    (incluye options, acceptable_options, response_schema)
--      · sampling_plans      (rule, sampling_unit, origin_context, textos)
--      · decision_catalog    (necesario: /api/decisions valida el código de
--                             decisión contra el catálogo de la MISMA empresa)
--      · decision_effects    (solo si la origen tiene filas; hoy tiene 0 por
--                             D-024, sin transiciones automáticas)
--
--    Los registros clonados reciben id nuevo, company_id de destino y sus
--    referencias internas se reconstruyen mediante el mapa origen→destino.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION clone_inspection_catalog(
  p_source_company_id UUID,
  p_target_company_id UUID
)
RETURNS TABLE (
  puntos_clonados BIGINT,
  criterios_clonados BIGINT,
  planes_clonados BIGINT,
  catalogo_decisiones_clonado BIGINT,
  efectos_decisiones_clonados BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_points  BIGINT := 0;
  v_defs    BIGINT := 0;
  v_plans   BIGINT := 0;
  v_dcat    BIGINT := 0;
  v_deff    BIGINT := 0;
BEGIN
  IF p_source_company_id IS NULL OR p_target_company_id IS NULL THEN
    RAISE EXCEPTION 'clone_inspection_catalog: source y target son obligatorios';
  END IF;

  IF p_source_company_id = p_target_company_id THEN
    RAISE EXCEPTION 'clone_inspection_catalog: la empresa origen y destino son la misma';
  END IF;

  PERFORM 1 FROM companies WHERE id = p_source_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'clone_inspection_catalog: la empresa origen % no existe', p_source_company_id;
  END IF;

  PERFORM 1 FROM companies WHERE id = p_target_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'clone_inspection_catalog: la empresa destino % no existe', p_target_company_id;
  END IF;

  -- Nunca se sobrescribe un catálogo ya provisionado.
  IF EXISTS (SELECT 1 FROM inspection_points WHERE company_id = p_target_company_id) THEN
    RAISE EXCEPTION
      'clone_inspection_catalog: la empresa destino ya tiene puntos de inspección. No se sobrescribe el catálogo existente.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM inspection_points WHERE company_id = p_source_company_id) THEN
    RAISE EXCEPTION
      'clone_inspection_catalog: la empresa origen % no tiene catálogo de inspección', p_source_company_id;
  END IF;

  -- Bandera de sesión: habilita el INSERT de puntos dentro del catálogo destino.
  PERFORM set_config('qualitynx.catalog_clone', 'on', true);

  BEGIN
    -----------------------------------------------------------------
    -- 2.1 Puntos de inspección
    -----------------------------------------------------------------
    -- DROP + CREATE en lugar de "CREATE ... IF NOT EXISTS" + DELETE:
    -- en PL/pgSQL un DELETE sin WHERE se interpreta como borrado de una
    -- variable y aborta con "DELETE requires a WHERE clause".
    DROP TABLE IF EXISTS qnx_clone_points;
    CREATE TEMP TABLE qnx_clone_points (
      src UUID PRIMARY KEY,
      dst UUID NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO qnx_clone_points (src, dst)
    SELECT id, gen_random_uuid()
    FROM inspection_points
    WHERE company_id = p_source_company_id;

    INSERT INTO inspection_points (
      id, company_id, name, is_active, species_id, operational_stage_id
    )
    SELECT m.dst, p_target_company_id, p.name, p.is_active, p.species_id, p.operational_stage_id
    FROM inspection_points p
    JOIN qnx_clone_points m ON m.src = p.id
    WHERE p.company_id = p_source_company_id;

    GET DIAGNOSTICS v_points = ROW_COUNT;

    -----------------------------------------------------------------
    -- 2.2 Criterios de medición (options, acceptable_options,
    --     response_schema y textos se copían sin transformación)
    -----------------------------------------------------------------
    INSERT INTO measurement_defs (
      company_id, inspection_point_id, name, value_type, unit, is_required,
      min_value, max_value, options, is_active, description, info_text,
      recommendation_text, method_text, source_kind, source_ref,
      validation_status, evidence_required, observation_required, sort_order,
      criteria_version, alert_only_out_of_range, evaluation_kind,
      acceptable_options, observation_instructions, scale_description,
      instrument_text, response_schema, technical_status
    )
    SELECT
      p_target_company_id, m.dst, d.name, d.value_type, d.unit, d.is_required,
      d.min_value, d.max_value, d.options, d.is_active, d.description, d.info_text,
      d.recommendation_text, d.method_text, d.source_kind, d.source_ref,
      d.validation_status, d.evidence_required, d.observation_required, d.sort_order,
      d.criteria_version, d.alert_only_out_of_range, d.evaluation_kind,
      d.acceptable_options, d.observation_instructions, d.scale_description,
      d.instrument_text, d.response_schema, d.technical_status
    FROM measurement_defs d
    JOIN qnx_clone_points m ON m.src = d.inspection_point_id
    WHERE d.company_id = p_source_company_id;

    GET DIAGNOSTICS v_defs = ROW_COUNT;

    -----------------------------------------------------------------
    -- 2.3 Planes de muestreo
    --     created_by queda NULL: una referencia a un usuario de otra
    --     empresa no debe cruzar el aislamiento.
    -----------------------------------------------------------------
    INSERT INTO sampling_plans (
      company_id, inspection_point_id, name, rule, sampling_unit, origin_context,
      method_text, instrument_text, is_active, version
    )
    SELECT
      p_target_company_id, m.dst, sp.name, sp.rule, sp.sampling_unit, sp.origin_context,
      sp.method_text, sp.instrument_text, sp.is_active, sp.version
    FROM sampling_plans sp
    JOIN qnx_clone_points m ON m.src = sp.inspection_point_id
    WHERE sp.company_id = p_source_company_id;

    GET DIAGNOSTICS v_plans = ROW_COUNT;

    -----------------------------------------------------------------
    -- 2.4 Catálogo de decisiones
    --     /api/decisions resuelve el código contra decision_catalog de la
    --     MISMA empresa; sin estas filas la decisión formal no valida.
    -----------------------------------------------------------------
    INSERT INTO decision_catalog (
      company_id, code, label, requires_fundamento, is_active, sort_order
    )
    SELECT p_target_company_id, dc.code, dc.label, dc.requires_fundamento, dc.is_active, dc.sort_order
    FROM decision_catalog dc
    WHERE dc.company_id = p_source_company_id;

    GET DIAGNOSTICS v_dcat = ROW_COUNT;

    -----------------------------------------------------------------
    -- 2.5 Efectos de decisión
    --     Solo se clonan si la origen tiene filas. Hoy decision_effects
    --     está vacío en todo el sistema (D-024: sin transiciones
    --     automáticas), por lo que esta sección es un no-op.
    -- ----------------------------------------------------------------------------
    INSERT INTO decision_effects (
      company_id, decision_code, inspection_point_id, target_lot_status,
      target_operational_stage_id, is_active
    )
    SELECT
      p_target_company_id, de.decision_code, m.dst, de.target_lot_status,
      de.target_operational_stage_id, de.is_active
    FROM decision_effects de
    LEFT JOIN qnx_clone_points m ON m.src = de.inspection_point_id
    WHERE de.company_id = p_source_company_id
      AND (de.inspection_point_id IS NULL OR m.dst IS NOT NULL);

    GET DIAGNOSTICS v_deff = ROW_COUNT;

    DROP TABLE IF EXISTS qnx_clone_points;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'clone_inspection_catalog falló: %', SQLERRM;
  END;

  PERFORM set_config('qualitynx.catalog_clone', 'off', true);

  RETURN QUERY SELECT v_points, v_defs, v_plans, v_dcat, v_deff;
END;
$$;

REVOKE ALL ON FUNCTION clone_inspection_catalog(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clone_inspection_catalog(UUID, UUID) TO service_role;


-- ----------------------------------------------------------------------------
-- 3. Flujo de creación de empresa con catálogo.
--    companies.created_by es NOT NULL, por lo que se recibe explícitamente.
--    companies.code es UNIQUE: se respeta sin inventar prefijos.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_company_with_catalog(
  p_name VARCHAR(255),
  p_code VARCHAR(50),
  p_created_by UUID,
  p_source_company_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF p_source_company_id IS NULL THEN
    RAISE EXCEPTION 'create_company_with_catalog: la empresa origen del catálogo es obligatoria';
  END IF;

  INSERT INTO companies (name, code, created_by)
  VALUES (p_name, p_code, p_created_by)
  RETURNING id INTO v_company_id;

  PERFORM clone_inspection_catalog(p_source_company_id, v_company_id);

  RETURN v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION create_company_with_catalog(VARCHAR, VARCHAR, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_company_with_catalog(VARCHAR, VARCHAR, UUID, UUID) TO service_role;


-- ----------------------------------------------------------------------------
-- 4. D-035 · BLOQUEO 2 — INSPECCIONES ABIERTAS
--    Reafirma la restricción ya definida en 20260922000005_inspections.sql:
--    una sola inspección EN CURSO por (lote, punto de inspección).
--    Es idempotente y sirve de red de seguridad si algún entorno divergió.
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_inspections_open_unique;
CREATE UNIQUE INDEX idx_inspections_open_unique
  ON inspections (lot_id, inspection_point_id)
  WHERE status = 'EN CURSO';

COMMENT ON INDEX public.idx_inspections_open_unique IS
  'D-035 BLOQUEO 2: una inspección EN CURSO por lote + punto de inspección. Distintos puntos del mismo lote pueden estar abiertos a la vez.';