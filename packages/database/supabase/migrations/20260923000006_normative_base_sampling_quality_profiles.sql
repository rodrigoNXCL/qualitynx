ALTER TABLE measurement_defs
  ADD COLUMN IF NOT EXISTS observation_instructions TEXT,
  ADD COLUMN IF NOT EXISTS scale_description TEXT,
  ADD COLUMN IF NOT EXISTS instrument_text TEXT,
  ADD COLUMN IF NOT EXISTS response_schema JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS technical_status TEXT NOT NULL DEFAULT 'CONFIGURABLE POR PROTOCOLO/CLIENTE';

UPDATE measurement_defs
SET response_schema = '{}'::JSONB
WHERE response_schema IS NULL;

UPDATE measurement_defs
SET technical_status = 'CONFIGURABLE POR PROTOCOLO/CLIENTE'
WHERE technical_status IS NULL;

ALTER TABLE measurement_defs
  ALTER COLUMN response_schema SET DEFAULT '{}'::JSONB,
  ALTER COLUMN technical_status SET DEFAULT 'CONFIGURABLE POR PROTOCOLO/CLIENTE',
  ALTER COLUMN technical_status SET NOT NULL;

UPDATE measurement_defs
SET
  description = CASE
    WHEN lower(name) = 'firmeza' THEN 'Grado de firmeza de la fruta bajo el método y protocolo configurados.'
    WHEN lower(name) = 'bloom / pruina' THEN 'Presencia, cobertura y condición de la pruina del fruto.'
    ELSE description
  END,
  observation_instructions = CASE
    WHEN lower(name) = 'firmeza' THEN 'Observar y registrar la respuesta de firmeza únicamente con el método, unidad e instrumento definidos para el protocolo.'
    WHEN lower(name) = 'bloom / pruina' THEN 'Observar la presencia, cobertura y condición de la pruina; registrar la respuesta estructurada que defina el protocolo.'
    ELSE observation_instructions
  END
WHERE lower(name) IN ('firmeza', 'bloom / pruina')
  AND EXISTS (
    SELECT 1
    FROM inspection_points ip
    JOIN species s ON s.id = ip.species_id
    WHERE ip.id = measurement_defs.inspection_point_id
      AND lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano')
  );

CREATE TABLE IF NOT EXISTS normative_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  source_name TEXT NOT NULL,
  document_name TEXT,
  version TEXT,
  valid_from DATE,
  valid_to DATE,
  country TEXT,
  market TEXT,
  protocol_name TEXT,
  reference_type TEXT NOT NULL DEFAULT 'REFERENCIA_TECNICA',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_normative_references_company
  ON normative_references (company_id, is_active);

CREATE TABLE IF NOT EXISTS measurement_def_normative_refs (
  measurement_def_id UUID NOT NULL REFERENCES measurement_defs(id) ON DELETE CASCADE,
  normative_reference_id UUID NOT NULL REFERENCES normative_references(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'REFERENCIA_TECNICA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (measurement_def_id, normative_reference_id)
);

CREATE INDEX IF NOT EXISTS idx_measurement_def_normative_refs_reference
  ON measurement_def_normative_refs (normative_reference_id);

INSERT INTO normative_references (
  company_id, source_name, document_name, version, valid_from, valid_to,
  country, market, protocol_name, reference_type, notes
)
SELECT
  NULL::UUID,
  'SAG Chile',
  'Procedimientos y protocolos vigentes',
  NULL::TEXT,
  NULL::DATE,
  NULL::DATE,
  'Chile',
  NULL::TEXT,
  NULL::TEXT,
  'FUENTE_NORMATIVA',
  'Los requisitos específicos SAG dependen del mercado y destino; deben verificarse en la fuente oficial.'
WHERE NOT EXISTS (
  SELECT 1
  FROM normative_references
  WHERE company_id IS NULL
    AND source_name = 'SAG Chile'
    AND document_name = 'Procedimientos y protocolos vigentes'
);

INSERT INTO normative_references (
  company_id, source_name, document_name, version, valid_from, valid_to,
  country, market, protocol_name, reference_type, notes
)
SELECT
  NULL::UUID,
  'UNECE FFV-57',
  'FFV-57',
  NULL::TEXT,
  NULL::DATE,
  NULL::DATE,
  NULL::TEXT,
  NULL::TEXT,
  NULL::TEXT,
  'REFERENCIA_TECNICA_INTERNACIONAL',
  'Referencia técnica internacional para berries; no es una norma SAG ni una regla QualityNX automática.'
WHERE NOT EXISTS (
  SELECT 1
  FROM normative_references
  WHERE company_id IS NULL
    AND source_name = 'UNECE FFV-57'
    AND document_name = 'FFV-57'
);

INSERT INTO sampling_plans (
  company_id,
  inspection_point_id,
  name,
  rule,
  sampling_unit,
  origin_context,
  method_text,
  instrument_text,
  is_active,
  version
)
SELECT
  ip.company_id,
  ip.id,
  'Regla operacional base QualityNX',
  '{"basis":"theoretical_weight_kg","divisor":100,"rounding":"ceil","min_samples":1,"operational_label":"10 muestras por 1.000 kg","formula":"CEIL(kg / 1000 × 10)"}'::JSONB,
  NULL::TEXT,
  NULL::TEXT,
  NULL::TEXT,
  NULL::TEXT,
  true,
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
WHERE ip.is_active
  AND lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano')
  AND NOT EXISTS (
    SELECT 1
    FROM sampling_plans sp
    WHERE sp.company_id = ip.company_id
      AND sp.inspection_point_id = ip.id
      AND lower(sp.name) = lower('Regla operacional base QualityNX')
  );

ALTER TABLE normative_references ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "normative_references_select_company" ON normative_references;
CREATE POLICY "normative_references_select_company" ON normative_references
  FOR SELECT USING (
    company_id IS NULL
    OR is_super_admin()
    OR company_id = get_current_user_company_id()
  );
DROP POLICY IF EXISTS "normative_references_insert_admin" ON normative_references;
CREATE POLICY "normative_references_insert_admin" ON normative_references
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );
DROP POLICY IF EXISTS "normative_references_update_admin" ON normative_references;
CREATE POLICY "normative_references_update_admin" ON normative_references
  FOR UPDATE USING (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  ) WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );
DROP POLICY IF EXISTS "normative_references_delete_admin" ON normative_references;
CREATE POLICY "normative_references_delete_admin" ON normative_references
  FOR DELETE USING (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

ALTER TABLE measurement_def_normative_refs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "measurement_def_normative_refs_select_company" ON measurement_def_normative_refs;
CREATE POLICY "measurement_def_normative_refs_select_company" ON measurement_def_normative_refs
  FOR SELECT USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM measurement_defs md
      WHERE md.id = measurement_def_id
        AND md.company_id = get_current_user_company_id()
    )
  );
DROP POLICY IF EXISTS "measurement_def_normative_refs_insert_admin" ON measurement_def_normative_refs;
CREATE POLICY "measurement_def_normative_refs_insert_admin" ON measurement_def_normative_refs
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() = 'COMPANY_ADMIN'
      AND EXISTS (
        SELECT 1
        FROM measurement_defs md
        WHERE md.id = measurement_def_id
          AND md.company_id = get_current_user_company_id()
      )
    )
  );
DROP POLICY IF EXISTS "measurement_def_normative_refs_delete_admin" ON measurement_def_normative_refs;
CREATE POLICY "measurement_def_normative_refs_delete_admin" ON measurement_def_normative_refs
  FOR DELETE USING (
    is_super_admin()
    OR (
      get_current_user_role() = 'COMPANY_ADMIN'
      AND EXISTS (
        SELECT 1
        FROM measurement_defs md
        WHERE md.id = measurement_def_id
          AND md.company_id = get_current_user_company_id()
      )
    )
  );

CREATE OR REPLACE FUNCTION validate_measurement_def_response_contract()
RETURNS TRIGGER AS $$
DECLARE
  v_schema_unit TEXT;
  v_allowed_values JSONB;
BEGIN
  IF jsonb_typeof(NEW.response_schema) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'response_schema debe ser un objeto JSON';
  END IF;
  v_schema_unit := NEW.response_schema->>'unit';
  IF v_schema_unit IS NOT NULL AND NEW.unit IS DISTINCT FROM v_schema_unit THEN
    RAISE EXCEPTION 'Unidad incompatible con el método configurado';
  END IF;
  v_allowed_values := NEW.response_schema->'allowed_values';
  IF v_allowed_values IS NOT NULL AND jsonb_typeof(v_allowed_values) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'allowed_values debe ser un arreglo JSON';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_measurement_def_response_contract ON measurement_defs;
CREATE TRIGGER validate_measurement_def_response_contract
  BEFORE INSERT OR UPDATE OF unit, options, response_schema ON measurement_defs
  FOR EACH ROW EXECUTE FUNCTION validate_measurement_def_response_contract();

CREATE OR REPLACE FUNCTION capture_sampling_rule_context()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_name TEXT;
  v_plan_rule JSONB;
BEGIN
  IF NEW.sampling_plan_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT name, rule
  INTO v_plan_name, v_plan_rule
  FROM sampling_plans
  WHERE id = NEW.sampling_plan_id;
  NEW.sampling_context := COALESCE(NEW.sampling_context, '{}'::JSONB) || jsonb_build_object(
    'sampling_rule_name', v_plan_name,
    'sampling_rule', v_plan_rule,
    'sampling_inspector_id', NEW.inspector_id,
    'sampling_recorded_at', now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS zz_capture_sampling_rule_context ON inspections;
CREATE TRIGGER zz_capture_sampling_rule_context
  BEFORE INSERT OR UPDATE OF sampling_plan_id, suggested_sample_count, sample_count, sample_count_reason
  ON inspections
  FOR EACH ROW EXECUTE FUNCTION capture_sampling_rule_context();
