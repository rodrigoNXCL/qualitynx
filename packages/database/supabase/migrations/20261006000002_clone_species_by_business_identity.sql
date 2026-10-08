-- ============================================================================
-- D-035 · CORRECCIÓN DE ESPECIES POR IDENTIDAD DE NEGOCIO
-- ----------------------------------------------------------------------------
-- Corrige clone_inspection_catalog sin alterar 20261006000001.
--
-- Problema:
--   species es una tabla POR EMPRESA (company_id NOT NULL) y el trigger
--   preexistente inspection_point_context_check() exige que
--   species.company_id = inspection_points.company_id. La versión anterior
--   copiaba species_id literalmente desde la empresa origen, por lo que
--   clonar hacia otra empresa fallaba con:
--     "La especie del punto debe pertenecer a la misma empresa"
--
-- Comportamiento corregido:
--   · La especie se resuelve por IDENTIDAD DE NEGOCIO: species destino con
--     company_id = destino y lower(name) = lower(name de la especie origen).
--   · NO se crea ninguna especie automáticamente.
--   · NO se sustituye por otra especie.
--   · NO se exige is_active = true como condición adicional, porque el
--     trigger vigente no lo valida y added sería una regla inventada.
--   · Si falta alguna especie, NO se inserta ningún punto y el error indica
--     empresa destino y todas las especies requeridas.
--
-- Sin cambios en: qnx_clone_points, measurement_defs, sampling_plans,
-- decision_catalog, decision_effects, RLS, lock del catálogo maestro,
-- guard de no sobrescritura, operational_stages (tabla global) ni ninguna
-- otra tabla.
--
-- Solo emite la función. CREATE OR REPLACE conserva propietario y permisos
-- (SECURITY DEFINER + REVOKE/GRANT a service_role) ya aplicados.
-- ============================================================================

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
  v_points   BIGINT := 0;
  v_defs     BIGINT := 0;
  v_plans    BIGINT := 0;
  v_dcat     BIGINT := 0;
  v_deff     BIGINT := 0;
  v_faltan   TEXT;
  v_destino  VARCHAR(255);
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
    -- DROP + CREATE en lugar de "CREATE ... IF NOT EXISTS" + DELETE:
    -- en PL/pgSQL un DELETE sin WHERE se interpreta como borrado de una
    -- variable y aborta con "DELETE requires a WHERE clause".
    -----------------------------------------------------------------
    DROP TABLE IF EXISTS qnx_clone_points;
    CREATE TEMP TABLE qnx_clone_points (
      src UUID PRIMARY KEY,
      dst UUID NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO qnx_clone_points (src, dst)
    SELECT id, gen_random_uuid()
    FROM inspection_points
    WHERE company_id = p_source_company_id;

    -----------------------------------------------------------------
    -- 2.1.a Especies: resolución por identidad de negocio.
    -- species es por empresa y NO se crea ni se sustituye: se resuelve
    -- la especie equivalente que ya exista en el catálogo maestro destino.
    -- operational_stages es global, por eso no se mapea.
    -----------------------------------------------------------------
    DROP TABLE IF EXISTS qnx_clone_species;
    CREATE TEMP TABLE qnx_clone_species (
      src UUID PRIMARY KEY,
      dst UUID NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO qnx_clone_species (src, dst)
    SELECT s.id, t.id
    FROM species s
    JOIN species t
      ON t.company_id = p_target_company_id
     AND lower(t.name) = lower(s.name)
    WHERE s.company_id = p_source_company_id;

    -- Todas las especies requeridas por los puntos de la origen deben
    -- estar resueltas. Se listan todas, no solo la primera.
    SELECT string_agg(DISTINCT s.name, ', ' ORDER BY s.name)
    INTO v_faltan
    FROM inspection_points p
    JOIN species s ON s.id = p.species_id
    WHERE p.company_id = p_source_company_id
      AND NOT EXISTS (
        SELECT 1 FROM qnx_clone_species ms WHERE ms.src = p.species_id
      );

    IF v_faltan IS NOT NULL THEN
      SELECT c.name INTO v_destino FROM companies c WHERE c.id = p_target_company_id;
      RAISE EXCEPTION
        'clone_inspection_catalog: la empresa destino % (%) no tiene en su catálogo maestro la(s) especie(s) requerida(s): %. Deben existir previamente en la empresa destino; QualityNX no las crea automáticamente.',
        v_destino, p_target_company_id, v_faltan;
    END IF;

    INSERT INTO inspection_points (
      id, company_id, name, is_active, species_id, operational_stage_id
    )
    SELECT m.dst, p_target_company_id, p.name, p.is_active, ms.dst, p.operational_stage_id
    FROM inspection_points p
    JOIN qnx_clone_points  m  ON m.src  = p.id
    JOIN qnx_clone_species ms ON ms.src = p.species_id
    WHERE p.company_id = p_source_company_id;

    GET DIAGNOSTICS v_points = ROW_COUNT;

    -----------------------------------------------------------------
    -- 2.2 Criterios de medición (options, acceptable_options,
    --     response_schema y textos se copian sin transformación)
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
    -----------------------------------------------------------------
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
    DROP TABLE IF EXISTS qnx_clone_species;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'clone_inspection_catalog falló: %', SQLERRM;
  END;

  PERFORM set_config('qualitynx.catalog_clone', 'off', true);

  RETURN QUERY SELECT v_points, v_defs, v_plans, v_dcat, v_deff;
END;
$$;