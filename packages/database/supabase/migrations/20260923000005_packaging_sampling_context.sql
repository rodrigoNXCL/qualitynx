CREATE TABLE IF NOT EXISTS packaging_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  theoretical_weight_kg NUMERIC,
  source_ref VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_packaging_types_company_name
  ON packaging_types (company_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_packaging_types_company_active
  ON packaging_types (company_id, is_active);

DROP TRIGGER IF EXISTS update_packaging_types_updated_at ON packaging_types;
CREATE TRIGGER update_packaging_types_updated_at
  BEFORE UPDATE ON packaging_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_packaging_types ON packaging_types;
CREATE TRIGGER audit_packaging_types
  AFTER INSERT OR UPDATE OR DELETE ON packaging_types
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

INSERT INTO packaging_types (company_id, name, theoretical_weight_kg, source_ref)
SELECT c.id, v.name, v.theoretical_weight_kg, 'CATALOGO_BASE'
FROM companies c
CROSS JOIN (VALUES
  ('Bandeja arándano blanca', 3.5::NUMERIC),
  ('Bandeja Bulk', 4.0::NUMERIC),
  ('Clamshell 4.4 oz x 12', 1.50::NUMERIC),
  ('Clamshell 6.0 oz x 12', 2.04::NUMERIC),
  ('Formato configurable — peso por definir', NULL::NUMERIC)
) AS v(name, theoretical_weight_kg)
WHERE NOT EXISTS (
  SELECT 1
  FROM packaging_types pt
  WHERE pt.company_id = c.id
    AND lower(pt.name) = lower(v.name)
);

INSERT INTO packaging_types (company_id, name, theoretical_weight_kg, source_ref)
SELECT DISTINCT l.company_id, btrim(l.packaging_type), NULL::NUMERIC, 'LEGACY_LOT_VALUE'
FROM lots l
WHERE l.packaging_type IS NOT NULL
  AND btrim(l.packaging_type) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM packaging_types pt
    WHERE pt.company_id = l.company_id
      AND lower(pt.name) = lower(btrim(l.packaging_type))
  );

ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS packaging_type_id UUID REFERENCES packaging_types(id),
  ADD COLUMN IF NOT EXISTS theoretical_weight_kg NUMERIC;

UPDATE lots l
SET packaging_type_id = pt.id
FROM packaging_types pt
WHERE l.company_id = pt.company_id
  AND (
    (NULLIF(btrim(l.packaging_type), '') IS NOT NULL AND lower(pt.name) = lower(btrim(l.packaging_type)))
    OR     (NULLIF(btrim(l.packaging_type), '') IS NULL AND pt.name = 'Formato configurable — peso por definir')
  )
  AND l.packaging_type_id IS NULL;

UPDATE lots l
SET packaging_type = pt.name,
    theoretical_weight_kg = CASE
      WHEN l.quantity IS NULL OR pt.theoretical_weight_kg IS NULL THEN NULL
      ELSE round(l.quantity * pt.theoretical_weight_kg, 3)
    END
FROM packaging_types pt
WHERE l.packaging_type_id = pt.id
  AND l.company_id = pt.company_id;

CREATE OR REPLACE FUNCTION lot_packaging_context()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_weight NUMERIC;
  v_company UUID;
  v_active BOOLEAN;
BEGIN
  IF NEW.packaging_type_id IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar un embalaje existente';
  END IF;

  SELECT name, theoretical_weight_kg, company_id, is_active
  INTO v_name, v_weight, v_company, v_active
  FROM packaging_types
  WHERE id = NEW.packaging_type_id;

  IF v_company IS NULL OR v_company <> NEW.company_id THEN
    RAISE EXCEPTION 'El embalaje pertenece a otra empresa';
  END IF;
  IF NOT v_active THEN
    RAISE EXCEPTION 'El embalaje seleccionado está inactivo';
  END IF;

  NEW.packaging_type := v_name;
  IF NEW.quantity IS NULL OR v_weight IS NULL THEN
    NEW.theoretical_weight_kg := NULL;
  ELSE
    NEW.theoretical_weight_kg := round(NEW.quantity * v_weight, 3);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lot_packaging_context ON lots;
CREATE TRIGGER lot_packaging_context
  BEFORE INSERT OR UPDATE OF packaging_type_id, packaging_type, quantity ON lots
  FOR EACH ROW EXECUTE FUNCTION lot_packaging_context();

CREATE OR REPLACE FUNCTION refresh_lot_packaging_weights()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lots
  SET quantity = quantity
  WHERE packaging_type_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS refresh_lot_packaging_weights ON packaging_types;
CREATE TRIGGER refresh_lot_packaging_weights
  AFTER UPDATE OF name, theoretical_weight_kg ON packaging_types
  FOR EACH ROW
  WHEN (
    OLD.name IS DISTINCT FROM NEW.name
    OR OLD.theoretical_weight_kg IS DISTINCT FROM NEW.theoretical_weight_kg
  )
  EXECUTE FUNCTION refresh_lot_packaging_weights();

CREATE TABLE IF NOT EXISTS sampling_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  inspection_point_id UUID NOT NULL REFERENCES inspection_points(id),
  name VARCHAR(255) NOT NULL,
  rule JSONB NOT NULL DEFAULT '{}'::JSONB,
  sampling_unit TEXT,
  origin_context TEXT,
  method_text TEXT,
  instrument_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sampling_plans_company_point_name
  ON sampling_plans (company_id, inspection_point_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_sampling_plans_point_active
  ON sampling_plans (inspection_point_id, is_active);

CREATE OR REPLACE FUNCTION sampling_plan_rule_check()
RETURNS TRIGGER AS $$
DECLARE
  v_basis TEXT;
  v_point_company UUID;
  v_divisor NUMERIC;
  v_min INTEGER;
  v_max INTEGER;
  v_samples INTEGER;
BEGIN
  SELECT company_id INTO v_point_company
  FROM inspection_points
  WHERE id = NEW.inspection_point_id;
  IF v_point_company IS NULL OR v_point_company <> NEW.company_id THEN
    RAISE EXCEPTION 'El punto de inspección no pertenece a la empresa del plan';
  END IF;

  IF jsonb_typeof(NEW.rule) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'La regla del plan de muestreo debe ser un objeto JSON';
  END IF;

  v_basis := lower(COALESCE(NEW.rule->>'basis', ''));
  IF v_basis NOT IN ('fixed', 'quantity', 'theoretical_weight_kg') THEN
    RAISE EXCEPTION 'Base de plan de muestreo no soportada';
  END IF;

  IF v_basis = 'fixed' THEN
    v_samples := (NEW.rule->>'samples')::INTEGER;
    IF v_samples IS NULL OR v_samples < 1 THEN
      RAISE EXCEPTION 'Un plan fijo requiere samples >= 1';
    END IF;
  ELSE
    v_divisor := (NEW.rule->>'divisor')::NUMERIC;
    IF v_divisor IS NULL OR v_divisor <= 0 THEN
      RAISE EXCEPTION 'El divisor del plan debe ser mayor que cero';
    END IF;
  END IF;

  v_min := (NEW.rule->>'min_samples')::INTEGER;
  v_max := (NEW.rule->>'max_samples')::INTEGER;
  IF v_min IS NOT NULL AND v_min < 0 THEN
    RAISE EXCEPTION 'min_samples no puede ser negativo';
  END IF;
  IF v_max IS NOT NULL AND v_max < 1 THEN
    RAISE EXCEPTION 'max_samples debe ser mayor que cero';
  END IF;
  IF v_min IS NOT NULL AND v_max IS NOT NULL AND v_min > v_max THEN
    RAISE EXCEPTION 'min_samples no puede superar max_samples';
  END IF;
  IF lower(COALESCE(NEW.rule->>'rounding', '')) NOT IN ('ceil', 'floor', 'round') THEN
    RAISE EXCEPTION 'rounding debe ser ceil, floor o round';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sampling_plan_rule_check ON sampling_plans;
CREATE TRIGGER sampling_plan_rule_check
  BEFORE INSERT OR UPDATE OF rule ON sampling_plans
  FOR EACH ROW EXECUTE FUNCTION sampling_plan_rule_check();

DROP TRIGGER IF EXISTS update_sampling_plans_updated_at ON sampling_plans;
CREATE TRIGGER update_sampling_plans_updated_at
  BEFORE UPDATE ON sampling_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_sampling_plans ON sampling_plans;
CREATE TRIGGER audit_sampling_plans
  AFTER INSERT OR UPDATE OR DELETE ON sampling_plans
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS sampling_plan_id UUID REFERENCES sampling_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suggested_sample_count INTEGER,
  ADD COLUMN IF NOT EXISTS sample_count INTEGER,
  ADD COLUMN IF NOT EXISTS sample_count_reason TEXT,
  ADD COLUMN IF NOT EXISTS sampling_context JSONB;

ALTER TABLE samples
  ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES lots(id),
  ADD COLUMN IF NOT EXISTS generated_from_plan_id UUID REFERENCES sampling_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

UPDATE samples s
SET lot_id = i.lot_id
FROM inspections i
WHERE s.inspection_id = i.id
  AND s.lot_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_samples_lot_id ON samples(lot_id);
CREATE INDEX IF NOT EXISTS idx_samples_generated_plan ON samples(generated_from_plan_id);
CREATE INDEX IF NOT EXISTS idx_samples_inspection_active ON samples(inspection_id, is_active);

CREATE OR REPLACE FUNCTION calculate_sampling_plan_count(p_plan_id UUID, p_lot_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_company UUID;
  v_basis TEXT;
  v_rounding TEXT;
  v_value NUMERIC;
  v_divisor NUMERIC;
  v_count INTEGER;
  v_min INTEGER;
  v_max INTEGER;
  v_lot_company UUID;
BEGIN
  SELECT company_id, rule->>'basis', rule->>'rounding', rule->>'divisor',
         (rule->>'samples')::INTEGER, (rule->>'min_samples')::INTEGER,
         (rule->>'max_samples')::INTEGER
  INTO v_plan_company, v_basis, v_rounding, v_divisor, v_count, v_min, v_max
  FROM sampling_plans
  WHERE id = p_plan_id AND is_active = true;

  IF v_plan_company IS NULL THEN
    RETURN NULL;
  END IF;
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT is_super_admin()
     AND v_plan_company <> get_current_user_company_id() THEN
    RETURN NULL;
  END IF;

  SELECT company_id INTO v_lot_company FROM lots WHERE id = p_lot_id;
  IF v_lot_company IS NULL OR v_lot_company <> v_plan_company THEN
    RETURN NULL;
  END IF;

  IF v_basis = 'fixed' THEN
    v_count := COALESCE(v_count, 0);
  ELSE
    IF v_basis = 'quantity' THEN
      SELECT quantity INTO v_value FROM lots WHERE id = p_lot_id;
    ELSE
      SELECT theoretical_weight_kg INTO v_value FROM lots WHERE id = p_lot_id;
    END IF;
    IF v_value IS NULL THEN
      RETURN NULL;
    END IF;
    IF v_rounding = 'floor' THEN
      v_count := floor(v_value / v_divisor)::INTEGER;
    ELSIF v_rounding = 'round' THEN
      v_count := round(v_value / v_divisor)::INTEGER;
    ELSE
      v_count := ceil(v_value / v_divisor)::INTEGER;
    END IF;
  END IF;

  IF v_min IS NOT NULL AND v_count < v_min THEN
    v_count := v_min;
  END IF;
  IF v_max IS NOT NULL AND v_count > v_max THEN
    v_count := v_max;
  END IF;
  RETURN GREATEST(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION populate_inherited_inspection_context()
RETURNS TRIGGER AS $$
BEGIN
  WITH inherited AS (
    SELECT
      md.id AS measurement_def_id,
      NEW.id AS inspection_id,
      CASE lower(md.name)
        WHEN 'identificación del lote' THEN COALESCE(l.folio, l.harvest_block)
        WHEN 'identificación' THEN COALESCE(l.folio, l.harvest_block)
        WHEN 'folio de lote' THEN l.folio
        WHEN 'folio' THEN l.folio
        WHEN 'guía del productor' THEN l.producer_guide_number
        WHEN 'productor' THEN p.name
        WHEN 'variedad' THEN v.name
        WHEN 'fecha de cosecha' THEN l.fruit_date::TEXT
        WHEN 'fecha/hora de recepción' THEN NEW.inspected_at::TEXT
        WHEN 'fecha/hora de ingreso' THEN NEW.inspected_at::TEXT
        WHEN 'procedencia / bloque' THEN l.harvest_block
        WHEN 'temporada' THEN s.name
        WHEN 'tipo de envase' THEN l.packaging_type
        WHEN 'embalaje' THEN l.packaging_type
        WHEN 'cantidad' THEN l.quantity::TEXT
        WHEN 'cantidad de envases' THEN l.quantity::TEXT
        WHEN 'peso' THEN l.theoretical_weight_kg::TEXT
        WHEN 'peso / cantidad recibida' THEN
          CASE
            WHEN l.quantity IS NOT NULL AND l.theoretical_weight_kg IS NOT NULL
              THEN l.quantity::TEXT || ' envases / ' || l.theoretical_weight_kg::TEXT || ' kg'
            WHEN l.quantity IS NOT NULL THEN l.quantity::TEXT || ' envases'
            ELSE l.theoretical_weight_kg::TEXT
          END
        WHEN 'peso neto' THEN l.theoretical_weight_kg::TEXT
        WHEN 'kg teóricos' THEN l.theoretical_weight_kg::TEXT
        WHEN 'kilos' THEN l.theoretical_weight_kg::TEXT
        WHEN 'kg' THEN l.theoretical_weight_kg::TEXT
        WHEN 'kilos teóricos' THEN l.theoretical_weight_kg::TEXT
        ELSE NULL
      END AS value
    FROM measurement_defs md
    JOIN inspections i ON i.id = NEW.id
    JOIN lots l ON l.id = i.lot_id
    LEFT JOIN producers p ON p.id = l.producer_id
    LEFT JOIN varieties v ON v.id = l.variety_id
    LEFT JOIN seasons s ON s.id = l.season_id
    WHERE md.inspection_point_id = NEW.inspection_point_id
      AND md.is_active
      AND NOT EXISTS (
        SELECT 1
        FROM measurements existing
        WHERE existing.inspection_id = NEW.id
          AND existing.measurement_def_id = md.id
          AND existing.sample_id IS NULL
      )
  )
  INSERT INTO measurements (inspection_id, measurement_def_id, value)
  SELECT inspection_id, measurement_def_id, value
  FROM inherited
  WHERE value IS NOT NULL AND btrim(value) <> '';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS populate_inherited_inspection_context ON inspections;
CREATE TRIGGER populate_inherited_inspection_context
  AFTER INSERT ON inspections
  FOR EACH ROW EXECUTE FUNCTION populate_inherited_inspection_context();

CREATE OR REPLACE FUNCTION inspection_sampling_context()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_suggested INTEGER;
  v_count INTEGER;
  v_reason TEXT;
  v_context JSONB;
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
    'suggested_sample_count', v_suggested,
    'sample_count', v_count,
    'sample_count_reason', v_reason
  )
  INTO v_context
  FROM lots l
  WHERE l.id = NEW.lot_id;

  NEW.sampling_context := v_context;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS inspection_sampling_context ON inspections;
CREATE TRIGGER inspection_sampling_context
  BEFORE INSERT OR UPDATE OF sampling_plan_id, suggested_sample_count, sample_count, sample_count_reason
  ON inspections
  FOR EACH ROW EXECUTE FUNCTION inspection_sampling_context();

CREATE OR REPLACE FUNCTION sync_inspection_samples()
RETURNS TRIGGER AS $$
DECLARE
  i INTEGER;
  v_unit TEXT;
  v_origin TEXT;
  v_method TEXT;
  v_instrument TEXT;
BEGIN
  IF NEW.sample_count IS NULL OR NEW.sample_count < 1 THEN
    RETURN NEW;
  END IF;

  SELECT sampling_unit, origin_context, method_text, instrument_text
  INTO v_unit, v_origin, v_method, v_instrument
  FROM sampling_plans
  WHERE id = NEW.sampling_plan_id;

  UPDATE samples
  SET is_active = false
  WHERE inspection_id = NEW.id
    AND generated_from_plan_id IS NOT NULL
    AND (
      generated_from_plan_id <> NEW.sampling_plan_id
      OR sample_number > NEW.sample_count
    );

  UPDATE samples
  SET is_active = true
  WHERE inspection_id = NEW.id
    AND generated_from_plan_id = NEW.sampling_plan_id
    AND sample_number <= NEW.sample_count;

  FOR i IN 1..NEW.sample_count LOOP
    IF NOT EXISTS (
      SELECT 1 FROM samples
      WHERE inspection_id = NEW.id AND sample_number = i
    ) THEN
      INSERT INTO samples (
        inspection_id, lot_id, sample_number, label,
        sampling_unit, origin_context, method_text, instrument_text,
        generated_from_plan_id, is_generated
      ) VALUES (
        NEW.id, NEW.lot_id, i, 'Muestra ' || i,
        v_unit, v_origin, v_method, v_instrument,
        NEW.sampling_plan_id, true
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_inspection_samples ON inspections;
CREATE TRIGGER sync_inspection_samples
  AFTER INSERT OR UPDATE OF sample_count, sampling_plan_id ON inspections
  FOR EACH ROW EXECUTE FUNCTION sync_inspection_samples();

ALTER TABLE packaging_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS packaging_types_select_company ON packaging_types;
CREATE POLICY packaging_types_select_company ON packaging_types
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());
DROP POLICY IF EXISTS packaging_types_insert_admin ON packaging_types;
CREATE POLICY packaging_types_insert_admin ON packaging_types
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );
DROP POLICY IF EXISTS packaging_types_update_admin ON packaging_types;
CREATE POLICY packaging_types_update_admin ON packaging_types
  FOR UPDATE USING (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  )
  WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

ALTER TABLE sampling_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sampling_plans_select_company ON sampling_plans;
CREATE POLICY sampling_plans_select_company ON sampling_plans
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());
DROP POLICY IF EXISTS sampling_plans_insert_admin ON sampling_plans;
CREATE POLICY sampling_plans_insert_admin ON sampling_plans
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );
DROP POLICY IF EXISTS sampling_plans_update_admin ON sampling_plans;
CREATE POLICY sampling_plans_update_admin ON sampling_plans
  FOR UPDATE USING (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  )
  WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

REVOKE ALL ON FUNCTION calculate_sampling_plan_count(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION calculate_sampling_plan_count(UUID, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION lock_new_inspection_points()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'La creación de nuevos puntos de inspección está bloqueada en esta etapa';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lock_new_inspection_points ON inspection_points;
CREATE TRIGGER lock_new_inspection_points
  BEFORE INSERT ON inspection_points
  FOR EACH ROW EXECUTE FUNCTION lock_new_inspection_points();

DO $$
DECLARE
  v_company_count INTEGER;
  v_lot_missing INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_company_count FROM companies;
  IF v_company_count > 0 THEN
    SELECT COUNT(*) INTO v_lot_missing
    FROM lots
    WHERE packaging_type_id IS NULL;
    IF v_lot_missing > 0 THEN
      RAISE EXCEPTION 'Quedan % lotes sin embalaje asignado', v_lot_missing;
    END IF;
  END IF;
  RAISE NOTICE '000005 OK: embalajes, peso teórico y planes de muestreo configurables';
END $$;
