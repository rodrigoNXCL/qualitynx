-- QualityNX — Etapa 05 QUALITY ENGINE
-- Fuente: docs/05_QUALITY_ENGINE.md
-- EXTENDE measurement_defs (criterio ya existe) + crea quality_evaluations (resultado).
-- NO crea criterios paralelos, NO copia los 17 de Huerto a otros puntos,
-- NO modifica etapa/estado/decisión del lote, NO recalcula históricos.

-- ============================================
-- ENUM resultado de evaluación
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_evaluation_result') THEN
    CREATE TYPE quality_evaluation_result AS ENUM (
      'CUMPLE',
      'DESVIACIÓN',
      'SIN CRITERIO CONFIGURADO',
      'UNIDAD INCOMPATIBLE',
      'CONFIGURACIÓN AMBIGUA',
      'CRITERIO INACTIVO'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_comparison_type') THEN
    CREATE TYPE quality_comparison_type AS ENUM (
      'minimo',
      'maximo',
      'rango',
      'condicion',
      'porcentual'
    );
  END IF;
END $$;

-- ============================================
-- EXTENSIÓN measurement_defs (configuración de evaluación sin código)
-- ============================================

ALTER TABLE measurement_defs
  ADD COLUMN IF NOT EXISTS evaluation_kind quality_comparison_type,
  ADD COLUMN IF NOT EXISTS acceptable_options TEXT[];

COMMENT ON COLUMN measurement_defs.evaluation_kind IS
  'Tipo de comparación del criterio. NULL = derivar de min/max (05 §6).';
COMMENT ON COLUMN measurement_defs.acceptable_options IS
  'Para condición cualitativa: opciones que CUMPLEN. NULL = sin criterio formal de aceptación.';
COMMENT ON COLUMN measurement_defs.min_value IS
  'Límite mínimo del CRITERIO (no del atributo). 05 §10 / CURRENT §18.';
COMMENT ON COLUMN measurement_defs.max_value IS
  'Límite máximo del CRITERIO (no del atributo). 05 §10 / CURRENT §18.';

-- ============================================
-- QUALITY_EVALUATIONS — evaluación objetiva (append-only)
-- Reconstruible: inspección + medición + criterio (snapshot) + resultado + fecha.
-- Un cambio posterior del criterio NO altera filas históricas.
-- ============================================

CREATE TABLE IF NOT EXISTS quality_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  measurement_id UUID NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  measurement_def_id UUID NOT NULL REFERENCES measurement_defs(id),
  result quality_evaluation_result NOT NULL,
  observed_value TEXT,
  comparison_type quality_comparison_type,
  limit_min NUMERIC,
  limit_max NUMERIC,
  unit VARCHAR(50),
  deviation NUMERIC,
  condition_failed TEXT,
  criterion_snapshot JSONB NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  evaluated_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_quality_evaluations_company
  ON quality_evaluations(company_id);
CREATE INDEX IF NOT EXISTS idx_quality_evaluations_inspection
  ON quality_evaluations(inspection_id, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_evaluations_measurement
  ON quality_evaluations(measurement_id, evaluated_at DESC);

COMMENT ON TABLE quality_evaluations IS
  'QUALITY ENGINE — evaluación objetiva medición vs criterio (05). NO decide ni cambia etapa/estado.';
COMMENT ON COLUMN quality_evaluations.criterion_snapshot IS
  'Criterio congelado al momento de evaluar (id, versión, límites, unidad, contexto). No se reescribe.';
COMMENT ON COLUMN quality_evaluations.result IS
  'CUMPLE | DESVIACIÓN | SIN CRITERIO CONFIGURADO | UNIDAD INCOMPATIBLE | CONFIGURACIÓN AMBIGUA | CRITERIO INACTIVO';

-- ============================================
-- RLS — misma pauta que measurements/inspections
-- ============================================

ALTER TABLE quality_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quality_evaluations_select_company" ON quality_evaluations;
CREATE POLICY "quality_evaluations_select_company" ON quality_evaluations
  FOR SELECT USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_id AND i.company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "quality_evaluations_insert_operator" ON quality_evaluations;
CREATE POLICY "quality_evaluations_insert_operator" ON quality_evaluations
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND EXISTS (
        SELECT 1 FROM inspections i
        WHERE i.id = inspection_id AND i.company_id = get_current_user_company_id()
      )
    )
  );

-- SELECT/INSERT de operadores; NO UPDATE/DELETE silencioso de histórico de evaluación
-- (append-only desde la app; audit_logs registra cambios administrativos).

DROP TRIGGER IF EXISTS audit_quality_evaluations ON quality_evaluations;
CREATE TRIGGER audit_quality_evaluations
  AFTER INSERT OR UPDATE OR DELETE ON quality_evaluations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- SIN triggers que alteren lots.status, etapa o inspections.decision
-- (05 §13–14: el motor solo evalúa e informa).
-- ============================================
