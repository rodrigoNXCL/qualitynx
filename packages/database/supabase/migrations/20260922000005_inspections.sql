-- QualityNX INSPECTIONS — Etapa 04
-- Fuente: docs/04_INSPECTIONS.md
-- Entidades: inspection_points, measurement_defs, inspections, samples,
--            measurements, inspection_evidence
-- Estados inspección: EN CURSO / COMPLETADA (04 §7)
-- Reglas: inspección siempre pertenece a un lote; inspector y fecha/hora
--         identificados; mediciones según configuración del punto;
--         obligatorias completas + evidencia fotográfica para COMPLETADA;
--         resultado y decisión diferenciados; sin DELETE; auditoría.

-- ============================================
-- ENUMS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_status') THEN
    CREATE TYPE inspection_status AS ENUM ('EN CURSO', 'COMPLETADA');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'measurement_value_type') THEN
    CREATE TYPE measurement_value_type AS ENUM (
      'numérica', 'porcentaje', 'entero', 'texto', 'lista', 'sí/no', 'cálculo derivado'
    );
  END IF;
END $$;

-- ============================================
-- PUNTOS DE EVALUACIÓN (configuración)
-- ============================================

CREATE TABLE IF NOT EXISTS inspection_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_points_company_name
  ON inspection_points (company_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_inspection_points_company_id ON inspection_points(company_id);

DROP TRIGGER IF EXISTS update_inspection_points_updated_at ON inspection_points;
CREATE TRIGGER update_inspection_points_updated_at
  BEFORE UPDATE ON inspection_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_inspection_points ON inspection_points;
CREATE TRIGGER audit_inspection_points
  AFTER INSERT OR UPDATE OR DELETE ON inspection_points
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- BIBLIOTECA DE MEDICIONES (configuración por punto)
-- ============================================

CREATE TABLE IF NOT EXISTS measurement_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  inspection_point_id UUID NOT NULL REFERENCES inspection_points(id),
  name VARCHAR(255) NOT NULL,
  value_type measurement_value_type NOT NULL DEFAULT 'numérica',
  unit VARCHAR(50),
  is_required BOOLEAN NOT NULL DEFAULT false,
  min_value NUMERIC,
  max_value NUMERIC,
  options TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_measurement_defs_point_name
  ON measurement_defs (inspection_point_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_measurement_defs_company_id ON measurement_defs(company_id);
CREATE INDEX IF NOT EXISTS idx_measurement_defs_point ON measurement_defs(inspection_point_id);

DROP TRIGGER IF EXISTS update_measurement_defs_updated_at ON measurement_defs;
CREATE TRIGGER update_measurement_defs_updated_at
  BEFORE UPDATE ON measurement_defs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_measurement_defs ON measurement_defs;
CREATE TRIGGER audit_measurement_defs
  AFTER INSERT OR UPDATE OR DELETE ON measurement_defs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- INSPECCIONES
-- ============================================

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  lot_id UUID NOT NULL REFERENCES lots(id),
  inspection_point_id UUID NOT NULL REFERENCES inspection_points(id),
  inspector_id UUID NOT NULL REFERENCES users(id),
  status inspection_status NOT NULL DEFAULT 'EN CURSO',
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  observations TEXT,
  result TEXT,
  decision TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspections_company_id ON inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_lot_id ON inspections(lot_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON inspections(inspector_id);

-- Una inspección EN CURSO abierta por lote+punto a la vez (evita duplicado por operación repetida)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspections_open_unique
  ON inspections (lot_id, inspection_point_id)
  WHERE status = 'EN CURSO';

DROP TRIGGER IF EXISTS update_inspections_updated_at ON inspections;
CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_inspections ON inspections;
CREATE TRIGGER audit_inspections
  AFTER INSERT OR UPDATE OR DELETE ON inspections
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- MUESTRAS
-- ============================================

CREATE TABLE IF NOT EXISTS samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  label VARCHAR(255),
  fruit_quantity INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_samples_inspection ON samples(inspection_id);

DROP TRIGGER IF EXISTS update_samples_updated_at ON samples;
CREATE TRIGGER update_samples_updated_at
  BEFORE UPDATE ON samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_samples ON samples;
CREATE TRIGGER audit_samples
  AFTER INSERT OR UPDATE OR DELETE ON samples
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- MEDICIONES (valores capturados)
-- ============================================

CREATE TABLE IF NOT EXISTS measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  measurement_def_id UUID NOT NULL REFERENCES measurement_defs(id),
  sample_id UUID REFERENCES samples(id) ON DELETE SET NULL,
  value TEXT,
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_measurements_inspection_def
  ON measurements (inspection_id, measurement_def_id);
CREATE INDEX IF NOT EXISTS idx_measurements_inspection ON measurements(inspection_id);

DROP TRIGGER IF EXISTS update_measurements_updated_at ON measurements;
CREATE TRIGGER update_measurements_updated_at
  BEFORE UPDATE ON measurements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_measurements ON measurements;
CREATE TRIGGER audit_measurements
  AFTER INSERT OR UPDATE OR DELETE ON measurements
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- EVIDENCIA (referencia a storage bucket evidence)
-- ============================================

CREATE TABLE IF NOT EXISTS inspection_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_evidence_inspection ON inspection_evidence(inspection_id);

-- ============================================
-- VALIDACIÓN DE CIERRE (04 §8)
-- COMPLETADA exige: mediciones obligatorias con valor + >=1 evidencia.
-- ============================================

CREATE OR REPLACE FUNCTION inspection_complete_check()
RETURNS TRIGGER AS $$
DECLARE
  v_pending INT;
  v_evidence INT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'COMPLETADA' AND OLD.status <> 'COMPLETADA' THEN
    SELECT COUNT(*) INTO v_pending
    FROM measurement_defs d
    WHERE d.inspection_point_id = NEW.inspection_point_id
      AND d.is_required
      AND d.is_active
      AND NOT EXISTS (
        SELECT 1 FROM measurements m
        WHERE m.inspection_id = NEW.id
          AND m.measurement_def_id = d.id
          AND m.value IS NOT NULL AND btrim(m.value) <> ''
      );
    IF v_pending > 0 THEN
      RAISE EXCEPTION 'Faltan % mediciones obligatorias para completar la inspección', v_pending;
    END IF;

    SELECT COUNT(*) INTO v_evidence
    FROM inspection_evidence e WHERE e.inspection_id = NEW.id;
    IF v_evidence = 0 THEN
      RAISE EXCEPTION 'La inspección requiere evidencia fotográfica para completarse';
    END IF;

    NEW.completed_at := now();
  END IF;

  -- Una inspección COMPLETADA no se reabre silenciosamente
  IF TG_OP = 'UPDATE' AND OLD.status = 'COMPLETADA' AND NEW.status <> 'COMPLETADA' THEN
    RAISE EXCEPTION 'Una inspección COMPLETADA no puede volver a EN CURSO';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS inspection_complete_check ON inspections;
CREATE TRIGGER inspection_complete_check
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION inspection_complete_check();

-- Lote CERRADO no admite nuevas inspecciones
CREATE OR REPLACE FUNCTION inspection_lot_open_check()
RETURNS TRIGGER AS $$
DECLARE
  v_status lot_status;
BEGIN
  SELECT status INTO v_status FROM lots WHERE id = NEW.lot_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Lote inexistente';
  END IF;
  IF v_status = 'CERRADO' THEN
    RAISE EXCEPTION 'No se pueden crear inspecciones sobre un lote CERRADO';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS inspection_lot_open ON inspections;
CREATE TRIGGER inspection_lot_open
  BEFORE INSERT ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION inspection_lot_open_check();

-- ============================================
-- RLS
-- ============================================

ALTER TABLE inspection_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_evidence ENABLE ROW LEVEL SECURITY;

-- ---------- PUNTOS DE EVALUACIÓN ----------
DROP POLICY IF EXISTS "inspection_points_select_company" ON inspection_points;
CREATE POLICY "inspection_points_select_company" ON inspection_points
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "inspection_points_insert_admin" ON inspection_points;
CREATE POLICY "inspection_points_insert_admin" ON inspection_points
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

DROP POLICY IF EXISTS "inspection_points_update_admin" ON inspection_points;
CREATE POLICY "inspection_points_update_admin" ON inspection_points
  FOR UPDATE USING (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  )
  WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

-- ---------- BIBLIOTECA DE MEDICIONES ----------
DROP POLICY IF EXISTS "measurement_defs_select_company" ON measurement_defs;
CREATE POLICY "measurement_defs_select_company" ON measurement_defs
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "measurement_defs_insert_admin" ON measurement_defs;
CREATE POLICY "measurement_defs_insert_admin" ON measurement_defs
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

DROP POLICY IF EXISTS "measurement_defs_update_admin" ON measurement_defs;
CREATE POLICY "measurement_defs_update_admin" ON measurement_defs
  FOR UPDATE USING (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  )
  WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

-- ---------- INSPECCIONES ----------
-- SELECT: usuarios de la empresa. INSERT/UPDATE: COMPANY_ADMIN, SUPER_ADMIN o INSPECTOR
-- (el inspector es la persona que hace el control — pendiente formal de permisos en BUILD_STATUS).

DROP POLICY IF EXISTS "inspections_select_company" ON inspections;
CREATE POLICY "inspections_select_company" ON inspections
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "inspections_insert_operator" ON inspections;
CREATE POLICY "inspections_insert_operator" ON inspections
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "inspections_update_operator" ON inspections;
CREATE POLICY "inspections_update_operator" ON inspections
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

-- ---------- MUESTRAS ----------
DROP POLICY IF EXISTS "samples_select_company" ON samples;
CREATE POLICY "samples_select_company" ON samples
  FOR SELECT USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_id AND i.company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "samples_insert_operator" ON samples;
CREATE POLICY "samples_insert_operator" ON samples
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

DROP POLICY IF EXISTS "samples_update_operator" ON samples;
CREATE POLICY "samples_update_operator" ON samples
  FOR UPDATE USING (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND EXISTS (
        SELECT 1 FROM inspections i
        WHERE i.id = inspection_id AND i.company_id = get_current_user_company_id()
      )
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND EXISTS (
        SELECT 1 FROM inspections i
        WHERE i.id = inspection_id AND i.company_id = get_current_user_company_id()
      )
    )
  );

DROP POLICY IF EXISTS "samples_delete_operator" ON samples;
CREATE POLICY "samples_delete_operator" ON samples
  FOR DELETE USING (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND EXISTS (
        SELECT 1 FROM inspections i
        WHERE i.id = inspection_id
          AND i.company_id = get_current_user_company_id()
          AND i.status = 'EN CURSO'
      )
    )
  );

-- ---------- MEDICIONES ----------
DROP POLICY IF EXISTS "measurements_select_company" ON measurements;
CREATE POLICY "measurements_select_company" ON measurements
  FOR SELECT USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_id AND i.company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "measurements_insert_operator" ON measurements;
CREATE POLICY "measurements_insert_operator" ON measurements
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND EXISTS (
        SELECT 1 FROM inspections i
        WHERE i.id = inspection_id
          AND i.company_id = get_current_user_company_id()
          AND i.status = 'EN CURSO'
      )
    )
  );

DROP POLICY IF EXISTS "measurements_update_operator" ON measurements;
CREATE POLICY "measurements_update_operator" ON measurements
  FOR UPDATE USING (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND EXISTS (
        SELECT 1 FROM inspections i
        WHERE i.id = inspection_id
          AND i.company_id = get_current_user_company_id()
          AND i.status = 'EN CURSO'
      )
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND EXISTS (
        SELECT 1 FROM inspections i
        WHERE i.id = inspection_id
          AND i.company_id = get_current_user_company_id()
          AND i.status = 'EN CURSO'
      )
    )
  );

DROP POLICY IF EXISTS "measurements_delete_operator" ON measurements;
CREATE POLICY "measurements_delete_operator" ON measurements
  FOR DELETE USING (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND EXISTS (
        SELECT 1 FROM inspections i
        WHERE i.id = inspection_id
          AND i.company_id = get_current_user_company_id()
          AND i.status = 'EN CURSO'
      )
    )
  );

-- ---------- EVIDENCIA ----------
DROP POLICY IF EXISTS "inspection_evidence_select_company" ON inspection_evidence;
CREATE POLICY "inspection_evidence_select_company" ON inspection_evidence
  FOR SELECT USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_id AND i.company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "inspection_evidence_insert_operator" ON inspection_evidence;
CREATE POLICY "inspection_evidence_insert_operator" ON inspection_evidence
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND EXISTS (
        SELECT 1 FROM inspections i
        WHERE i.id = inspection_id
          AND i.company_id = get_current_user_company_id()
          AND i.status = 'EN CURSO'
      )
    )
  );

DROP POLICY IF EXISTS "inspection_evidence_delete_operator" ON inspection_evidence;
CREATE POLICY "inspection_evidence_delete_operator" ON inspection_evidence
  FOR DELETE USING (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND EXISTS (
        SELECT 1 FROM inspections i
        WHERE i.id = inspection_id
          AND i.company_id = get_current_user_company_id()
          AND i.status = 'EN CURSO'
      )
    )
  );

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE inspection_points IS 'Puntos de evaluación configurables por empresa (04 §2)';
COMMENT ON TABLE measurement_defs IS 'Biblioteca de mediciones por punto de evaluación (04 §11)';
COMMENT ON TABLE inspections IS 'Inspecciones sobre lotes (04 §3); EN CURSO / COMPLETADA';
COMMENT ON TABLE samples IS 'Muestras de una inspección (04 §10)';
COMMENT ON TABLE measurements IS 'Valores capturados según measurement_defs (04 §11)';
COMMENT ON TABLE inspection_evidence IS 'Evidencias fotográficas en storage bucket evidence (04 §9)';
COMMENT ON COLUMN inspections.result IS 'Resultado técnico observado — NO es la decisión (04 §13)';
COMMENT ON COLUMN inspections.decision IS 'Acción efectivamente tomada — separada del resultado (04 §13); motor de decisión completo en 06';
