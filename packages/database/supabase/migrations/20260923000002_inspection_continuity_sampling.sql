-- QualityNX — CORRECCIÓN FLUJO DE INSPECCIÓN
-- Continuidad entre etapas + muestreo por muestra + recomendación de seguimiento
-- NO destructivo: solo ADD COLUMN, índices y triggers de validación.
-- NO toca: decision_effects (D-024), arquitectura traceability, QE conceptual, RLS base.

-- ============================================
-- 1. CONTINUIDAD — inspección anterior explícita
-- ============================================

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS previous_inspection_id UUID REFERENCES inspections(id);

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS recommendation TEXT;

CREATE INDEX IF NOT EXISTS idx_inspections_previous
  ON inspections (previous_inspection_id)
  WHERE previous_inspection_id IS NOT NULL;

COMMENT ON COLUMN inspections.previous_inspection_id IS
  'Continuidad operacional: inspección anterior de la cual esta es continuación. NO crea lote nuevo. La anterior permanece inmutable.';
COMMENT ON COLUMN inspections.recommendation IS
  'Recomendación de seguimiento del inspector (ej. revisar en 3 días). NO convierte en decision_effect ni cambia lot_status.';

-- Validación: anterior misma empresa; no auto-referencia; no encadenar sobre EN CURSO ajena
CREATE OR REPLACE FUNCTION inspection_continuity_check()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_company UUID;
  v_prev_status inspection_status;
BEGIN
  IF NEW.previous_inspection_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.previous_inspection_id = NEW.id THEN
    RAISE EXCEPTION 'Una inspección no puede ser continuación de sí misma';
  END IF;
  SELECT company_id, status INTO v_prev_company, v_prev_status
  FROM inspections WHERE id = NEW.previous_inspection_id;
  IF v_prev_company IS NULL THEN
    RAISE EXCEPTION 'La inspección anterior no existe';
  END IF;
  IF v_prev_company <> NEW.company_id THEN
    RAISE EXCEPTION 'La inspección anterior pertenece a otra empresa';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS inspection_continuity_check ON inspections;
CREATE TRIGGER inspection_continuity_check
  BEFORE INSERT OR UPDATE OF previous_inspection_id
  ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION inspection_continuity_check();

-- ============================================
-- 2. MUESTRAS — número, unidad, origen (no sublotes)
-- ============================================

ALTER TABLE samples
  ADD COLUMN IF NOT EXISTS sample_number INTEGER;

ALTER TABLE samples
  ADD COLUMN IF NOT EXISTS sampling_unit VARCHAR(100);

ALTER TABLE samples
  ADD COLUMN IF NOT EXISTS origin_context TEXT;

COMMENT ON COLUMN samples.sample_number IS 'Nº de muestra dentro de la inspección (M01, M02…). No es sublote.';
COMMENT ON COLUMN samples.sampling_unit IS 'Unidad de muestreo definida por el método aplicable (no universal).';
COMMENT ON COLUMN samples.origin_context IS 'Origen/contexto de extracción de la muestra (ej. fila/canja/zona).';

-- ============================================
-- 3. MEDICIONES — 1 valor por criterio por muestra
--    consolidado = sample_id IS NULL
--    por muestra = sample_id NOT NULL
-- ============================================

DROP INDEX IF EXISTS idx_measurements_inspection_def;

CREATE UNIQUE INDEX IF NOT EXISTS idx_measurements_consolidated_unique
  ON measurements (inspection_id, measurement_def_id)
  WHERE sample_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_measurements_sample_unique
  ON measurements (inspection_id, measurement_def_id, sample_id)
  WHERE sample_id IS NOT NULL;

COMMENT ON INDEX idx_measurements_consolidated_unique IS
  'Resultado consolidado (o medición sin muestreo) único por criterio en la inspección';
COMMENT ON INDEX idx_measurements_sample_unique IS
  'Resultado por muestra: un valor por criterio en cada muestra; no destruye individuales';

-- ============================================
-- 4. EVIDENCIA — opcionalmente ligada a muestra
-- ============================================

ALTER TABLE inspection_evidence
  ADD COLUMN IF NOT EXISTS sample_id UUID REFERENCES samples(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inspection_evidence_sample
  ON inspection_evidence (sample_id)
  WHERE sample_id IS NOT NULL;

COMMENT ON COLUMN inspection_evidence.sample_id IS
  'Muestra a la que corresponde la evidencia cuando aplica; NULL = evidencia de la inspección.';

-- ============================================
-- 5. Verificación
-- ============================================

DO $$
DECLARE
  v_prev int; v_rec int; v_snum int;
BEGIN
  SELECT COUNT(*) INTO v_prev FROM information_schema.columns
  WHERE table_name = 'inspections' AND column_name = 'previous_inspection_id';
  SELECT COUNT(*) INTO v_rec FROM information_schema.columns
  WHERE table_name = 'inspections' AND column_name = 'recommendation';
  SELECT COUNT(*) INTO v_snum FROM information_schema.columns
  WHERE table_name = 'samples' AND column_name = 'sample_number';
  IF v_prev = 0 OR v_rec = 0 OR v_snum = 0 THEN
    RAISE EXCEPTION 'Faltan columnas de continuidad/muestreo tras migración';
  END IF;
  RAISE NOTICE '000002 OK: continuidad + muestreo + evidencia por muestra';
END $$;
