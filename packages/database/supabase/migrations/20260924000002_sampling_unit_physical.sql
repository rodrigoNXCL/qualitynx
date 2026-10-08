-- QUALITYNX — unidad física de muestreo explícita
-- N = cantidad de UNIDADES DE MUESTREO (envases), no kg.
-- sampling_plans.sampling_unit pasa de 'Muestra' genérico a unidad operacional.
-- sampling_context registra unidad, peso por unidad y peso total referencial.

UPDATE sampling_plans
SET sampling_unit = 'envase',
    origin_context = 'Peso teórico del lote en kg · unidad física de muestreo: envase (packaging del lote)',
    method_text = 'N = CEIL(kg teóricos / 1000 × 10). N es cantidad de unidades de muestreo (envases), no kg.',
    instrument_text = 'No aplica: cálculo operacional',
    updated_at = now()
WHERE lower(name) = 'regla operacional base qualitynx'
  AND (
    sampling_unit IS NULL
    OR lower(btrim(sampling_unit)) IN ('muestra', 'muestreo', 'unidad')
    OR method_text IS DISTINCT FROM 'N = CEIL(kg teóricos / 1000 × 10). N es cantidad de unidades de muestreo (envases), no kg.'
  );

CREATE OR REPLACE FUNCTION inspection_sampling_context()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_suggested INTEGER;
  v_count INTEGER;
  v_reason TEXT;
  v_context JSONB;
  v_plan_unit TEXT;
  v_unit_weight NUMERIC;
  v_rule JSONB;
  v_packaging_weight NUMERIC;
  v_quantity INTEGER;
  v_lot_kg NUMERIC;
BEGIN
  IF NEW.suggested_sample_count IS NOT NULL AND NEW.suggested_sample_count < 0 THEN
    RAISE EXCEPTION 'La cantidad sugerida de muestras no puede ser negativa';
  END IF;
  IF NEW.sample_count IS NOT NULL AND NEW.sample_count < 0 THEN
    RAISE EXCEPTION 'La cantidad de muestras no puede ser negativa';
  END IF;
  IF NEW.sample_count IS NOT NULL AND NEW.sampling_plan_id IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar un plan de muestreo antes de definir N';
  END IF;

  IF NEW.sample_count IS NOT NULL
     AND NEW.suggested_sample_count IS NOT NULL
     AND NEW.sample_count <> NEW.suggested_sample_count
     AND btrim(COALESCE(NEW.sample_count_reason, '')) = '' THEN
    RAISE EXCEPTION 'Debe registrar el motivo al modificar la cantidad sugerida de muestras';
  END IF;

  v_plan_id := NEW.sampling_plan_id;
  v_suggested := NEW.suggested_sample_count;
  v_count := NEW.sample_count;
  v_reason := NEW.sample_count_reason;

  SELECT sp.sampling_unit, sp.rule
  INTO v_plan_unit, v_rule
  FROM sampling_plans sp
  WHERE sp.id = v_plan_id;

  SELECT
    l.quantity,
    l.theoretical_weight_kg,
    COALESCE(
      pt.theoretical_weight_kg,
      CASE
        WHEN l.quantity IS NOT NULL AND l.quantity > 0 AND l.theoretical_weight_kg IS NOT NULL
          THEN round(l.theoretical_weight_kg / l.quantity, 4)
        ELSE NULL
      END
    )
  INTO v_quantity, v_lot_kg, v_unit_weight
  FROM lots l
  LEFT JOIN packaging_types pt
    ON pt.id = l.packaging_type_id
    OR (
      l.packaging_type IS NOT NULL
      AND lower(pt.name) = lower(l.packaging_type)
      AND pt.company_id = l.company_id
    )
  WHERE l.id = NEW.lot_id
  LIMIT 1;

  SELECT jsonb_build_object(
    'lot_id', l.id,
    'folio', l.folio,
    'producer_guide_number', l.producer_guide_number,
    'producer_id', l.producer_id,
    'variety_id', l.variety_id,
    'season_id', l.season_id,
    'fruit_date', l.fruit_date,
    'harvest_block', l.harvest_block,
    'packaging_type_id', l.packaging_type_id,
    'packaging_type', l.packaging_type,
    'quantity', l.quantity,
    'theoretical_weight_kg', l.theoretical_weight_kg,
    'sampling_plan_id', v_plan_id,
    'sampling_unit', COALESCE(
      NULLIF(btrim(v_plan_unit), ''),
      CASE WHEN l.quantity IS NOT NULL THEN 'envase' ELSE 'unidad de muestreo' END
    ),
    'unit_weight_kg', v_unit_weight,
    'lot_quantity_units', v_quantity,
    'lot_theoretical_weight_kg', v_lot_kg,
    'suggested_sample_count', v_suggested,
    'sample_count', v_count,
    'sample_count_reason', v_reason,
    'suggested_sample_weight_kg',
      CASE
        WHEN v_suggested IS NOT NULL AND v_unit_weight IS NOT NULL
          THEN round(v_suggested * v_unit_weight, 3)
        ELSE NULL
      END,
    'sample_weight_kg',
      CASE
        WHEN v_count IS NOT NULL AND v_unit_weight IS NOT NULL
          THEN round(v_count * v_unit_weight, 3)
        ELSE NULL
      END,
    'rule_formula', v_rule->>'formula',
    'rule_basis', v_rule->>'basis',
    'rule_divisor', v_rule->>'divisor',
    'rule_operational_label', v_rule->>'operational_label',
    'n_is_sampling_units_not_kg', true
  )
  INTO v_context
  FROM lots l
  WHERE l.id = NEW.lot_id;

  NEW.sampling_context := v_context;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN sampling_plans.sampling_unit IS
  'Unidad física de muestreo operacional (ej. envase). N = cantidad de estas unidades, no kg.';
COMMENT ON COLUMN inspections.sampling_context IS
  'Snapshot: regla, N sugerido/real, unidad de muestreo, peso teórico por unidad y peso total referencial.';
