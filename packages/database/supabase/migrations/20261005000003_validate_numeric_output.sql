-- ============================================================================
-- QUALITYNX — D-032 fix: validate_lot_transformation devuelve 42804
-- ============================================================================
-- Defecto
--   validate_lot_transformation declara sus columnas de totales como NUMERIC,
--   pero las dos salidas tempranas (transformación inexistente y transformación
--   de otra empresa) devolvían literales `0`, que en PostgreSQL son integer.
--   Al materializar la fila, la base rechazaba la respuesta con:
--     ERROR 42804: Returned type integer does not match expected type numeric
--     in column 3.
--   En la práctica, el aislamiento por empresa nunca devolvía su mensaje:
--   reventaba con un error de tipo en lugar de una respuesta controlada.
--
-- Corrección
--   Solo el tipo de retorno. Se sustituyen los literales por las variables
--   NUMERIC ya inicializadas a 0. NO se toca la lógica de seguridad: la
--   comprobación de empresa y de rol queda idéntica.
--
-- Idempotente. Sin operaciones destructivas.
-- ============================================================================

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
  r RECORD;
  v_available NUMERIC;
BEGIN
  SELECT * INTO t FROM lot_transformations WHERE id = p_transformation_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ARRAY['La transformación no existe'],
      v_input, v_output, v_remanent, v_loss;
    RETURN;
  END IF;

  -- AISLAMIENTO: la validación nunca cruza empresas.
  IF NOT (is_super_admin() OR t.company_id = get_current_user_company_id()) THEN
    RETURN QUERY SELECT false,
      ARRAY['La transformación no pertenece a su empresa'],
      v_input, v_output, v_remanent, v_loss;
    RETURN;
  END IF;

  v_unit := t.unit;

  IF NOT EXISTS (SELECT 1 FROM lot_transformation_inputs WHERE transformation_id = t.id) THEN
    v_errors := array_append(v_errors, 'Debe registrar al menos un lote fuente.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM lot_transformation_outputs
    WHERE transformation_id = t.id AND output_kind IN ('RESULTADO', 'REMANENTE')
  ) THEN
    v_errors := array_append(v_errors, 'Debe registrar al menos un lote resultante o remanente.');
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
    v_errors,
    v_input,
    v_output,
    v_remanent,
    v_loss;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION validate_lot_transformation(UUID) IS
  'Valida sin escribir (D-032). Aisla por empresa, fija search_path y devuelve errores legibles. Las totales se devuelven como NUMERIC también en las salidas tempranas.';