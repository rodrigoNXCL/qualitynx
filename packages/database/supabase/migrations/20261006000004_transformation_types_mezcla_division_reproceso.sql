-- ============================================================================
-- 08 — TRANSFORMATIONS · MEZCLA, DIVISIÓN Y REPROCESO
-- ----------------------------------------------------------------------------
-- Habilita las tres operaciones que exige docs/08_TRANSFORMATIONS.md §3 y que
-- hoy no se pueden ni registrar.
--
-- Diagnóstico (sobre el esquema real, no supuesto):
--   · lot_transformations.transformation_type tiene
--       CHECK (transformation_type IN ('PROCESO', 'REPALLETIZAJE'))
--     por lo que MEZCLA / DIVISION / REPROCESO son rechazados en el INSERT.
--   · lot_genealogy.relation_type tiene el mismo CHECK, y
--     confirm_lot_transformation escribe relation_type = t.transformation_type
--     (línea 623 de 20261005000001). Aunque se abriera el primer CHECK, la
--     genealogía fallaría al confirmar. Ambos se abren juntos.
--   · lot_transformation_inputs / outputs no tienen restricciones por tipo, y
--     confirm_lot_transformation es genérico N fuentes -> M salidas. El motor
--     ya soporta las tres operaciones; lo que faltaba era el vocabulario.
--
-- Lo que NO cambia:
--   · No se añade ni se modifica ninguna columna.
--   · No se tocan RLS, permisos, auditoría ni la guardia de transiciones.
--   · No se reemite confirm_lot_transformation ni annul_lot_transformation.
--   · No se modifica D-032, D-033 ni D-035.
--   · No se crean datos ni transformaciones.
--
-- Nota sobre el nombre del valor: se usa DIVISION sin tilde. Los valores ya
-- existentes son identificadores internos sin acentos (PROCESO, REPALLETIZAJE,
-- DESPACHO, SEGREACION, RETENCION), y las etiquetas visibles llevan tilde en la
-- interfaz. Mezclar un valor acentuado en un CHECK crearía dependencia de
-- collation sin ningún beneficio.
--
-- Las reglas por tipo se validan dentro de validate_lot_transformation, que
-- confirm_lot_transformation ya invoca: el servidor queda como autoridad y la
-- interfaz usa la misma especificación en packages/shared.
-- ============================================================================


-- ============================================
-- 1. Vocabulario de tipos de transformación
-- ============================================
ALTER TABLE lot_transformations
  DROP CONSTRAINT IF EXISTS lot_transformations_transformation_type_check;

ALTER TABLE lot_transformations
  ADD CONSTRAINT lot_transformations_transformation_type_check
  CHECK (transformation_type IN ('PROCESO', 'REPALLETIZAJE', 'MEZCLA', 'DIVISION', 'REPROCESO'));

COMMENT ON COLUMN lot_transformations.transformation_type IS
  'MEZCLA (N fuentes -> 1 derivado) | DIVISION (1 fuente -> 2+ derivados) | REPROCESO (1 fuente -> 1 derivado con motivo) | PROCESO | REPALLETIZAJE.';


-- ============================================
-- 2. Vocabulario de genealogía (espejo del anterior)
-- ============================================
ALTER TABLE lot_genealogy
  DROP CONSTRAINT IF EXISTS lot_genealogy_relation_type_check;

ALTER TABLE lot_genealogy
  ADD CONSTRAINT lot_genealogy_relation_type_check
  CHECK (relation_type IN ('PROCESO', 'REPALLETIZAJE', 'MEZCLA', 'DIVISION', 'REPROCESO'));

COMMENT ON COLUMN lot_genealogy.relation_type IS
  'Espejo de lot_transformations.transformation_type: cada operación deja la misma etiqueta en la genealogía que en la transformación que la originó.';


-- ============================================
-- 3. Reglas por tipo, dentro de la validación del servidor
--    Se reemite validate_lot_transformation íntegra: el cuerpo vigente más
--    el bloque de tipo. confirm_lot_transformation la invoca, de modo que la
--    confirmación hereda estas reglas sin reemitirse.
-- ============================================
CREATE OR REPLACE FUNCTION validate_lot_transformation(p_transformation_id UUID)
RETURNS TABLE (
  ok BOOLEAN,
  errors TEXT[],
  total_input NUMERIC,
  total_output NUMERIC,
  total_remanent NUMERIC,
  total_loss NUMERIC
) AS $$
DECLARE
  t lot_transformations%ROWTYPE;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_unit VARCHAR(32);
  v_input NUMERIC := 0;
  v_output NUMERIC := 0;
  v_remanent NUMERIC := 0;
  v_loss NUMERIC := 0;
  v_effective_out NUMERIC := 0;
  v_source_remnant NUMERIC := 0;
  v_sources INTEGER := 0;
  v_products INTEGER := 0;
  r RECORD;
  v_available NUMERIC;
BEGIN
  SELECT * INTO t FROM lot_transformations WHERE id = p_transformation_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ARRAY['La transformación no existe'], 0, 0, 0, 0;
    RETURN;
  END IF;

  -- AISLAMIENTO: la validación nunca cruza empresas.
  IF NOT (is_super_admin() OR t.company_id = get_current_user_company_id()) THEN
    RETURN QUERY SELECT false,
      ARRAY['La transformación no pertenece a su empresa'], 0, 0, 0, 0;
    RETURN;
  END IF;

  v_unit := t.unit;

  SELECT COUNT(*) INTO v_sources
  FROM lot_transformation_inputs WHERE transformation_id = t.id;

  SELECT COUNT(*) INTO v_products
  FROM lot_transformation_outputs
  WHERE transformation_id = t.id AND output_kind IN ('RESULTADO', 'REMANENTE');

  IF v_sources = 0 THEN
    v_errors := array_append(v_errors, 'Debe registrar al menos un lote fuente.');
  END IF;

  IF v_products = 0 THEN
    v_errors := array_append(v_errors, 'Debe registrar al menos un lote resultante o remanente.');
  END IF;

  -- REGLAS POR TIPO (08 §5, §6, §8)
  IF t.transformation_type = 'MEZCLA' THEN
    IF v_sources < 2 THEN
      v_errors := array_append(v_errors,
        'Una MEZCLA requiere dos o más lotes fuente. Registrados: ' || v_sources || '.');
    END IF;
  ELSIF t.transformation_type = 'DIVISION' THEN
    IF v_sources <> 1 THEN
      v_errors := array_append(v_errors,
        'Una DIVISIÓN parte de un único lote fuente. Registrados: ' || v_sources ||
        '. Para combinar varios lotes use MEZCLA.');
    END IF;
    IF v_products < 2 THEN
      v_errors := array_append(v_errors,
        'Una DIVISIÓN debe producir dos o más lotes derivados. Registrados: ' ||
        v_products || '.');
    END IF;
  ELSIF t.transformation_type = 'REPROCESO' THEN
    IF v_sources <> 1 THEN
      v_errors := array_append(v_errors,
        'Un REPROCESO se aplica a un único lote fuente. Registrados: ' || v_sources || '.');
    END IF;
    IF v_products <> 1 THEN
      v_errors := array_append(v_errors,
        'Un REPROCESO produce un único lote resultante con nueva identidad. Registrados: ' ||
        v_products || '.');
    END IF;
    IF t.notes IS NULL OR btrim(t.notes) = '' THEN
      v_errors := array_append(v_errors,
        'Un REPROCESO exige motivo: registre la razón por la que se reprocesa el lote.');
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM lot_transformation_outputs
    WHERE transformation_id = t.id AND output_kind IN ('MERMA', 'DESCARTE')
      AND (reason IS NULL OR btrim(reason) = '')
  ) THEN
    v_errors := array_append(v_errors, 'Merma y descarte exigen motivo.');
  END IF;

  -- Entradas: unidad, consumo y remanente
  FOR r IN
    SELECT i.source_lot_id, i.consumed_quantity, i.unit, i.available_quantity,
           i.remnant_handling
    FROM lot_transformation_inputs i
    WHERE i.transformation_id = t.id
  LOOP
    IF r.unit IS NULL OR btrim(r.unit) = '' THEN
      v_errors := array_append(v_errors,
        'El lote fuente ' || r.source_lot_id || ' no declara unidad de consumo.');
    ELSIF upper(btrim(r.unit)) <> upper(btrim(v_unit)) THEN
      v_errors := array_append(v_errors,
        'Unidad incompatible en el lote fuente ' || r.source_lot_id ||
        ': se consume en "' || r.unit || '" y la operación trabaja en "' || v_unit ||
        '". No hay conversión automática.');
    END IF;
    v_input := v_input + r.consumed_quantity;
    v_effective_out := v_effective_out + r.consumed_quantity
      + CASE WHEN r.remnant_handling = 'COMO_LOTE_NUEVO'
             THEN GREATEST(0, r.available_quantity - r.consumed_quantity)
             ELSE 0 END;
    IF r.remnant_handling = 'COMO_LOTE_NUEVO' THEN
      v_source_remnant := v_source_remnant
        + GREATEST(0, r.available_quantity - r.consumed_quantity);
    END IF;
  END LOOP;

  -- Salidas: unidad
  FOR r IN
    SELECT output_kind, result_lot_id, quantity, unit
    FROM lot_transformation_outputs
    WHERE transformation_id = t.id
  LOOP
    IF r.unit IS NULL OR btrim(r.unit) = '' THEN
      v_errors := array_append(v_errors, 'Una salida no declara unidad.');
    ELSIF upper(btrim(r.unit)) <> upper(btrim(v_unit)) THEN
      v_errors := array_append(v_errors,
        'Unidad incompatible en una salida: "' || r.unit || '" vs "' || v_unit || '".');
    END IF;
    v_output := v_output + r.quantity;
    IF r.output_kind = 'REMANENTE' THEN v_remanent := v_remanent + r.quantity; END IF;
    IF r.output_kind IN ('MERMA', 'DESCARTE') THEN v_loss := v_loss + r.quantity; END IF;
  END LOOP;

  -- Balance: lo que sale de las fuentes (consumido + remanente declarado)
  IF v_effective_out <> v_output THEN
    v_errors := array_append(v_errors,
      'El balance no cierra: las fuentes entregan ' || v_effective_out || ' ' || v_unit ||
      ' y se registran ' || v_output || ' ' || v_unit ||
      ' de salida. Diferencia: ' || (v_effective_out - v_output) || '.');
  END IF;

  IF v_source_remnant > 0 AND v_remanent < v_source_remnant THEN
    v_errors := array_append(v_errors,
      'Las fuentes dejan ' || v_source_remnant || ' ' || v_unit ||
      ' de remanente pero solo se declaran ' || v_remanent || ' ' || v_unit ||
      ' como salida de remanente. Registre el remanente como lote nuevo.');
  END IF;

  -- Disponibilidad real, leída del libro. En validación es una foto; la decisión
  -- final la toma confirm_lot_transformation con los lotes bloqueados.
  FOR r IN
    SELECT i.source_lot_id, i.consumed_quantity,
           COALESCE((SELECT SUM(quantity) FROM lot_stock_movements
                     WHERE lot_id = i.source_lot_id AND direction = 'IN'), 0)
         - COALESCE((SELECT SUM(quantity) FROM lot_stock_movements
                     WHERE lot_id = i.source_lot_id AND direction = 'OUT'), 0)
             AS disponible
    FROM lot_transformation_inputs i
    WHERE i.transformation_id = t.id
  LOOP
    IF r.consumed_quantity > r.disponible THEN
      v_errors := array_append(v_errors,
        'El lote fuente ' || r.source_lot_id || ' no tiene existencias suficientes: se intenta consumir ' ||
        r.consumed_quantity || ' y el libro registra ' || r.disponible || ' disponible.');
    END IF;
  END LOOP;

  FOR r IN
    SELECT i.source_lot_id, i.available_quantity, i.consumed_quantity, i.unit
    FROM lot_transformation_inputs i
    WHERE i.transformation_id = t.id
      AND i.remnant_handling = 'SIN_REMANENTE'
  LOOP
    IF (r.available_quantity - r.consumed_quantity) > 0 THEN
      v_errors := array_append(v_errors,
        'Del lote fuente ' || r.source_lot_id || ' quedan ' ||
        (r.available_quantity - r.consumed_quantity) || ' ' || r.unit ||
        ' y se declaró SIN_REMANENTE. Registre el remanente como lote nuevo.');
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    (COALESCE(array_length(v_errors, 1), 0) = 0),
    v_errors, v_input, v_output, v_remanent, v_loss;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ============================================
-- 4. Permisos
--     El modelo vigente es el de 20261005000002 §4: estas funciones se
--     invocan como 'authenticated' porque el actor es auth.uid(), y la
--     validación aísla por empresa y rol. Se mantienen EXACTAMENTE esos
--     permisos. (Copiar aquí el bloque de 20261005000001 revoca el acceso
--     que 000002_Type02rimegrantó y rompe la confirmación desde la interfaz.)
-- ============================================
GRANT EXECUTE ON FUNCTION validate_lot_transformation(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION validate_lot_transformation(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION validate_lot_transformation(UUID) TO service_role;

COMMENT ON FUNCTION validate_lot_transformation IS
  'Valida sin escribir (D-032, 08). Aisla por empresa, fija search_path y devuelve errores legibles. Incluye reglas por tipo: MEZCLA exige 2+ fuentes; DIVISIÓN exige 1 fuente y 2+ derivados; REPROCESO exige 1 fuente, 1 derivado y motivo. Solo service_role.';