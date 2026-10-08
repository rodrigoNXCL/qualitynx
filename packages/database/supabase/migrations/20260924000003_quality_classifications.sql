-- QUALITYNX — clasificación comercial + semáforo QualityNX (append-only)
-- Fuente: instrucción definitiva CLASIFICACIÓN + SEMÁFORO + IA + INFORMES
-- NO es sistema paralelo: se deriva de quality_evaluations + resumen IA.
-- NO modifica mediciones, QE, decisiones ni decision_effects.
-- NO es clasificación SAG: semáforo es operacional QualityNX.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_semaphore') THEN
    CREATE TYPE quality_semaphore AS ENUM ('VERDE', 'AMARILLO', 'ROJO');
  END IF;
END $$;

-- ============================================
-- QUALITY_CLASSIFICATIONS — historial por inspección
-- Una fila por inspección (única); historia del lote = muchas filas.
-- Última clasificación vigente = max(classified_at) por lot_id.
-- ============================================

CREATE TABLE IF NOT EXISTS quality_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  lot_id UUID NOT NULL REFERENCES lots(id),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  commercial_class TEXT NOT NULL CHECK (btrim(commercial_class) <> ''),
  semaphore quality_semaphore NOT NULL,
  justification TEXT NOT NULL CHECK (btrim(justification) <> ''),
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  logic_version TEXT NOT NULL,
  ai_analysis_id UUID REFERENCES ai_inspection_analysis(id),
  -- Marca si la IA aportó al análisis (justificación enriquecida); no implica color manual.
  ai_used BOOLEAN NOT NULL DEFAULT false,
  classified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  classified_by UUID REFERENCES users(id),
  CONSTRAINT quality_classifications_one_per_inspection UNIQUE (inspection_id)
);

CREATE INDEX IF NOT EXISTS idx_quality_classifications_company
  ON quality_classifications(company_id);
CREATE INDEX IF NOT EXISTS idx_quality_classifications_lot_time
  ON quality_classifications(lot_id, classified_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_classifications_inspection
  ON quality_classifications(inspection_id);
CREATE INDEX IF NOT EXISTS idx_quality_classifications_semaphore
  ON quality_classifications(semaphore);
CREATE INDEX IF NOT EXISTS idx_quality_classifications_commercial
  ON quality_classifications(commercial_class);
CREATE INDEX IF NOT EXISTS idx_quality_classifications_classified_at
  ON quality_classifications(classified_at DESC);

COMMENT ON TABLE quality_classifications IS
  'Historial append-only de clasificación comercial + semáforo QualityNX por inspección. Derivada de QE (+ resumen IA en justificación). No reemplaza decisión humana ni decision_effects.';
COMMENT ON COLUMN quality_classifications.semaphore IS
  'VERDE | AMARILLO | ROJO — categorías operacionales QualityNX, NO normativas SAG.';
COMMENT ON COLUMN quality_classifications.commercial_class IS
  'Clasificación comercial según lógica/matriz aplicable (p.ej. CLASE I, CLASE II, FUERA DE ESPECIFICACIÓN). Configurable; no asumir universal SAG.';
COMMENT ON COLUMN quality_classifications.justification IS
  'Explicación trazable: QE + criterios + resumen IA cuando se usó. No guardar solo el color.';
COMMENT ON COLUMN quality_classifications.source_snapshot IS
  'Snapshot: conteos QE, resultados, referencia inspección/lógica. Reconstruible.';
COMMENT ON COLUMN quality_classifications.ai_used IS
  'true si el resumen de IA se incluyó en la justificación. La IA no elige el color por sí sola.';

-- ============================================
-- RLS — misma pauta que quality_evaluations / decisions
-- ============================================

ALTER TABLE quality_classifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quality_classifications_select_company" ON quality_classifications;
CREATE POLICY "quality_classifications_select_company" ON quality_classifications
  FOR SELECT USING (
    is_super_admin()
    OR company_id = get_current_user_company_id()
  );

DROP POLICY IF EXISTS "quality_classifications_insert_operator" ON quality_classifications;
CREATE POLICY "quality_classifications_insert_operator" ON quality_classifications
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR', 'SUPER_ADMIN')
      AND company_id = get_current_user_company_id()
    )
  );

-- Append-only desde la app: sin UPDATE/DELETE de cliente (histórico intacto).
DROP TRIGGER IF EXISTS audit_quality_classifications ON quality_classifications;
CREATE TRIGGER audit_quality_classifications
  AFTER INSERT OR UPDATE OR DELETE ON quality_classifications
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
