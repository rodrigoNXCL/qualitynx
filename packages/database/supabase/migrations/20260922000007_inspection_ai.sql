-- QualityNX — Mejora integral módulo Inspecciones + IA (D-020 / D-021)
-- Orden: schema → types → AI service → UI
-- NO inventa mapa decisión→etapa/estado (sigue PENDIENTE DE DECISIÓN).
-- Reutiliza measurement_defs, inspections, samples, measurements, inspection_evidence.

-- ============================================
-- 1. measurement_defs — metadatos de criterio dinámico
-- ============================================

ALTER TABLE measurement_defs
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS info_text TEXT,
  ADD COLUMN IF NOT EXISTS recommendation_text TEXT,
  ADD COLUMN IF NOT EXISTS method_text TEXT,
  ADD COLUMN IF NOT EXISTS source_kind VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_ref VARCHAR(255),
  ADD COLUMN IF NOT EXISTS validation_status VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE DE VALIDACIÓN',
  ADD COLUMN IF NOT EXISTS evidence_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS observation_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS criteria_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS alert_only_out_of_range BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN measurement_defs.info_text IS 'Ayuda ⓘ: qué evalúa el criterio. NULL = Información técnica pendiente de configuración.';
COMMENT ON COLUMN measurement_defs.recommendation_text IS 'Ayuda 💡: cómo medir/interpretar según protocolo configurado. NO hardcodear en UI.';
COMMENT ON COLUMN measurement_defs.method_text IS 'Método de medición / protocolo de captura cuando exista.';
COMMENT ON COLUMN measurement_defs.source_kind IS 'NORMA OFICIAL | REQUISITO FITOSANITARIO | ESPECIFICACIÓN COMERCIAL | PROTOCOLO INTERNO | RECOMENDACIÓN OPERACIONAL | OTRO';
COMMENT ON COLUMN measurement_defs.criteria_version IS 'Versión del criterio; inspecciones históricas conservan snapshot en input_snapshot IA / measurements.';
COMMENT ON COLUMN measurement_defs.alert_only_out_of_range IS 'Límite fuera de rango genera ALERTA, no rechazo automático.';

-- Nuevos tipos de campo (§9) — sin romper enum existente
DO $$
BEGIN
  ALTER TYPE measurement_value_type ADD VALUE IF NOT EXISTS 'temperatura';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TYPE measurement_value_type ADD VALUE IF NOT EXISTS 'fecha';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TYPE measurement_value_type ADD VALUE IF NOT EXISTS 'fecha-hora';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TYPE measurement_value_type ADD VALUE IF NOT EXISTS 'multiselección';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TYPE measurement_value_type ADD VALUE IF NOT EXISTS 'foto';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TYPE measurement_value_type ADD VALUE IF NOT EXISTS 'archivo';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Orden por criterio
CREATE INDEX IF NOT EXISTS idx_measurement_defs_sort
  ON measurement_defs (inspection_point_id, sort_order, name);

-- ============================================
-- 2. Evidencia opcionalmente ligada a criterio
-- ============================================

ALTER TABLE inspection_evidence
  ADD COLUMN IF NOT EXISTS measurement_def_id UUID REFERENCES measurement_defs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inspection_evidence_def
  ON inspection_evidence (measurement_def_id)
  WHERE measurement_def_id IS NOT NULL;

-- ============================================
-- 2b. samples — método / instrumento (04 §10)
-- ============================================

ALTER TABLE samples
  ADD COLUMN IF NOT EXISTS method_text TEXT,
  ADD COLUMN IF NOT EXISTS instrument_text TEXT;

COMMENT ON COLUMN samples.method_text IS 'Método utilizado cuando aplique (04 §10).';
COMMENT ON COLUMN samples.instrument_text IS 'Instrumento utilizado cuando corresponda (CURRENT §evaluación).';

-- ============================================
-- 3. AI_INSPECTION_ANALYSIS — análisis IA por inspección
-- ============================================

CREATE TABLE IF NOT EXISTS ai_inspection_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  model VARCHAR(255) NOT NULL,
  model_version VARCHAR(100),
  prompt_version VARCHAR(50) NOT NULL DEFAULT 'v1',
  input_snapshot JSONB NOT NULL,
  recommendation TEXT NOT NULL,
  reasoning_summary TEXT,
  confidence INTEGER CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
  alerts JSONB,
  supporting_factors JSONB,
  data_quality_warnings JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_company ON ai_inspection_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_inspection ON ai_inspection_analysis(inspection_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_created ON ai_inspection_analysis(created_at DESC);

COMMENT ON TABLE ai_inspection_analysis IS 'Análisis IA asistente (D-013/D-021). NO sustituye decisión del inspector.';
COMMENT ON COLUMN ai_inspection_analysis.input_snapshot IS 'Snapshot reconstruible del contexto enviado a la IA en ese momento.';

-- ============================================
-- 4. AI_LEARNING_RECORDS — histórico de aprendizaje controlado
-- ============================================

CREATE TABLE IF NOT EXISTS ai_learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  ai_analysis_id UUID NOT NULL REFERENCES ai_inspection_analysis(id) ON DELETE CASCADE,
  recommendation_ai TEXT NOT NULL,
  decision_inspector TEXT,
  decision_inspector_user_id UUID REFERENCES users(id),
  decision_inspector_at TIMESTAMPTZ,
  agreement BOOLEAN,
  outcome_posterior TEXT,
  outcome_posterior_at TIMESTAMPTZ,
  feedback_type VARCHAR(100),
  feedback_notes TEXT,
  validated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_learning_analysis
  ON ai_learning_records (ai_analysis_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_company ON ai_learning_records(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_inspection ON ai_learning_records(inspection_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_validated ON ai_learning_records(validated) WHERE validated;

DROP TRIGGER IF EXISTS update_ai_learning_records_updated_at ON ai_learning_records;
CREATE TRIGGER update_ai_learning_records_updated_at
  BEFORE UPDATE ON ai_learning_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ai_learning_records IS 'Aprendizaje histórico estructurado (capturar/comparar/validar). NO ML autónomo. NO modifica reglas.';
COMMENT ON COLUMN ai_learning_records.agreement IS 'true=coincide; false=discrepancia; NULL=decisión aún no registrada. Discrepancia ≠ quién estuvo correcto.';
COMMENT ON COLUMN ai_learning_records.outcome_posterior IS 'Resultado real posterior del lote cuando se conozca (feedback).';
COMMENT ON COLUMN ai_learning_records.validated IS 'Conocimiento validado explícitamente; solo entonces apto como contexto de mejora.';

-- ============================================
-- 5. RLS — misma pauta que inspections
-- ============================================

ALTER TABLE ai_inspection_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_analysis_select_company" ON ai_inspection_analysis;
CREATE POLICY "ai_analysis_select_company" ON ai_inspection_analysis
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "ai_analysis_insert_operator" ON ai_inspection_analysis;
CREATE POLICY "ai_analysis_insert_operator" ON ai_inspection_analysis
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND company_id = get_current_user_company_id()
      AND EXISTS (
        SELECT 1 FROM inspections i
        WHERE i.id = inspection_id AND i.company_id = company_id
      )
    )
  );

DROP POLICY IF EXISTS "ai_analysis_update_operator" ON ai_inspection_analysis;
CREATE POLICY "ai_analysis_update_operator" ON ai_inspection_analysis
  FOR UPDATE USING (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND company_id = get_current_user_company_id()
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "ai_learning_select_company" ON ai_learning_records;
CREATE POLICY "ai_learning_select_company" ON ai_learning_records
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "ai_learning_insert_operator" ON ai_learning_records;
CREATE POLICY "ai_learning_insert_operator" ON ai_learning_records
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "ai_learning_update_operator" ON ai_learning_records;
CREATE POLICY "ai_learning_update_operator" ON ai_learning_records
  FOR UPDATE USING (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND company_id = get_current_user_company_id()
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND company_id = get_current_user_company_id()
    )
  );

DROP TRIGGER IF EXISTS audit_ai_inspection_analysis ON ai_inspection_analysis;
CREATE TRIGGER audit_ai_inspection_analysis
  AFTER INSERT OR UPDATE OR DELETE ON ai_inspection_analysis
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_ai_learning_records ON ai_learning_records;
CREATE TRIGGER audit_ai_learning_records
  AFTER INSERT OR UPDATE OR DELETE ON ai_learning_records
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
