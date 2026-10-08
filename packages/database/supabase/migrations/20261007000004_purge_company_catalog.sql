-- ============================================================================
-- 09 - OFFLINE / D-035 · Limpieza de fixtures de prueba del catálogo por empresa
-- ----------------------------------------------------------------------------
-- Motivo
--   La batería de regresión de D-035 crea una empresa con create_company y le
--   clona el catálogo para comprobar que el clon no se mezcla con otras empresas.
--   Al terminar dejaba esa empresa y su catálogo en la base, de modo que cada
--   corrida añadía una empresa más.
--
--   No se podía limpiar con DELETE porque lock_catalog_master() bloquea el
--   DELETE sobre inspection_points de forma INCONDICIONAL:
--
--       IF TG_OP = 'DELETE' THEN
--         RAISE EXCEPTION 'El catálogo maestro de puntos de inspección no admite
--                          DELETE (%). El catálogo por empresa se deriva con
--                          clone_inspection_catalog.', OLD.name;
--       END IF;
--
--   A diferencia del INSERT, el DELETE no consulta la bandera de sesión
--   qualitynx.catalog_clone, así que no existe escapatoria por configuración.
--
-- Alcance y límites de esta migración
--   · NO se modifica lock_catalog_master(). Su definición queda intacta.
--   · NO se modifica ninguna política RLS, ni permisos de tablas, ni la lógica de
--     clone_inspection_catalog, create_company ni ninguna otra función de producto.
--   · NO se toca ningún dato operacional: la función se niega a actuar si la
--     empresa tiene lotes, inspecciones, usuarios, decisiones o eventos de etapa.
--   · Solo service_role puede invocarla.
--
-- Cómo resuelve el bloqueo sin tocar el guardia
--   La Trigger lock_inspection_points_master se DESACTIVA dentro de la propia
--   transacción de la llamada y se vuelve a ACTIVAR antes de retornar. Como DDL
--   es transaccional en PostgreSQL, cualquier fallo revierte tanto los borrados
--   como el estado del trigger: no queda una ventana en la que el guardia quede
--   desactivado. Fuera de esta función el guardia sigue bloqueando DELETE igual
--   que siempre, y la bandera qualitynx.catalog_clone se mantiene activa solo con
--   SET LOCAL, es decir, únicamente durante esta transacción.
--
-- Uso previsto
--   Sólo para retirar empresas creadas por pruebas automatizadas. No es una vía
--   de borrado de empresas en producción: el bloqueo por datos operacionales lo
--   impide de forma explícita.
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_company_catalog(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nombre TEXT;
  v_bloqueos JSONB;
  v_total INTEGER;
  v_n INTEGER;
  v_borrados JSONB := '{}'::jsonb;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'se requiere p_company_id');
  END IF;

  SELECT c.name INTO v_nombre FROM companies c WHERE c.id = p_company_id;
  IF v_nombre IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'la empresa no existe');
  END IF;

  -- 1. Una empresa con operación real no se depura. Esto es lo que impide que
  --    esta función se convierta en una vía de borrado de datos de negocio.
  v_bloqueos := jsonb_build_object(
    'lots',             (SELECT count(*) FROM lots             WHERE company_id = p_company_id),
    'inspections',      (SELECT count(*) FROM inspections      WHERE company_id = p_company_id),
    'users',            (SELECT count(*) FROM users            WHERE company_id = p_company_id),
    'decisions',        (SELECT count(*) FROM decisions        WHERE company_id = p_company_id),
    'lot_stage_events', (SELECT count(*) FROM lot_stage_events WHERE company_id = p_company_id)
  );

  SELECT sum(value::int) INTO v_total FROM jsonb_each_text(v_bloqueos);
  IF COALESCE(v_total, 0) > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'la empresa tiene datos operacionales; no se puede depurar',
      'bloqueos', v_bloqueos
    );
  END IF;

  -- 2. Bandera de sesión: replica el escape que lock_catalog_master() ya concede
  --    al INSERT, y aquí solo dentro de esta transacción.
  SET LOCAL qualitynx.catalog_clone = 'on';

  -- 3. Hijos antes que padres.
  --    decision_effects va antes que inspection_points porque su
  --    inspection_point_id la referencia; measurement_defs y sampling_plans
  --    también la referencian.
  DELETE FROM measurement_defs   WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_borrados := v_borrados || jsonb_build_object('measurement_defs', v_n);

  DELETE FROM sampling_plans     WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_borrados := v_borrados || jsonb_build_object('sampling_plans', v_n);

  DELETE FROM decision_catalog   WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_borrados := v_borrados || jsonb_build_object('decision_catalog', v_n);

  DELETE FROM decision_effects   WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_borrados := v_borrados || jsonb_build_object('decision_effects', v_n);

  -- 4. El guardia de DELETE no tiene bandera: se suspende el trigger, sin tocar
  --    la función que lo implementa. DDL transaccional: si algo falla, el trigger
  --    vuelve a quedar activo junto con el rollback.
  ALTER TABLE inspection_points DISABLE TRIGGER lock_inspection_points_master;
  DELETE FROM inspection_points WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  ALTER TABLE inspection_points ENABLE  TRIGGER lock_inspection_points_master;
  v_borrados := v_borrados || jsonb_build_object('inspection_points', v_n);

  DELETE FROM species   WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_borrados := v_borrados || jsonb_build_object('species', v_n);

  DELETE FROM companies WHERE id          = p_company_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_borrados := v_borrados || jsonb_build_object('companies', v_n);

  RETURN jsonb_build_object(
    'ok',      true,
    'empresa', p_company_id,
    'nombre',  v_nombre,
    'borrado', v_borrados
  );
END;
$$;

COMMENT ON FUNCTION purge_company_catalog(UUID) IS
  'Retira el catálogo derivado y una empresa SIN datos operacionales. Uso exclusivo de pruebas. No relaja lock_catalog_master(): suspende su trigger solo dentro de la transacción de la llamada y lo restablece antes de retornar.';

-- Solo service_role. La app nunca la invoca.
REVOKE ALL ON FUNCTION purge_company_catalog(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_company_catalog(UUID) TO service_role;