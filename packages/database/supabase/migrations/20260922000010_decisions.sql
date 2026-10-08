-- QualityNX DECISIONS — Etapa 06
-- Fuente: docs/06_DECISIONS.md + CURRENT.md §21, §51 + DECISIONS D-016…D-018b
-- Entidades: decision_catalog (tipos configurables), decisions (append-only),
--            decision_effects (mapa configurable PUNTO+DECISIÓN→ESTADO/ETAPA)
-- Reglas: decisión humana registrada por usuario autorizado; QUALITY ENGINE no decide;
--         sin DELETE físico; anulación = estado ANULADA; snapshot de contexto;
--         lote CERRADO no admite nuevas decisiones; duplicado del mismo tipo bloqueado;
--         el mapa de efectos se deja VACÍO (PENDIENTE DE DECISIÓN — no inventar reglas).

-- ============================================
-- ENUMS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'decision_status') THEN
    CREATE TYPE decision_status AS ENUM ('REGISTRADA', 'ANULADA');
  END IF;
END $$;

-- ============================================
-- CATÁLOGO DE TIPOS DE DECISIÓN (configurable)
-- Lista base = CURRENT §21 (misma que INSPECTION_DECISION_OPTIONS).
-- requires_fundamento: configurable por tipo; sin regla fija sembrada (06 §4.12).
-- ============================================

CREATE TABLE IF NOT EXISTS decision_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  code VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  requires_fundamento BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_decision_catalog_company_code
  ON decision_catalog (company_id, lower(code));
CREATE INDEX IF NOT EXISTS idx_decision_catalog_company_id ON decision_catalog(company_id);

DROP TRIGGER IF EXISTS update_decision_catalog_updated_at ON decision_catalog;
CREATE TRIGGER update_decision_catalog_updated_at
  BEFORE UPDATE ON decision_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_decision_catalog ON decision_catalog;
CREATE TRIGGER audit_decision_catalog
  AFTER INSERT OR UPDATE OR DELETE ON decision_catalog
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Seed: tipos de CURRENT §21 para cada empresa existente (idempotente).
INSERT INTO decision_catalog (company_id, code, label, sort_order)
SELECT c.id, v.code, v.label, v.ord
FROM companies c
CROSS JOIN (VALUES
  ('APROBAR', 'Aprobar', 1),
  ('RECHAZAR', 'Rechazar', 2),
  ('RETENER', 'Retener', 3),
  ('SEGREGAR', 'Segregar', 4),
  ('REPROCESAR', 'Reprocesar', 5),
  ('LIBERAR', 'Liberar', 6),
  ('SOLICITAR NUEVA INSPECCIÓN', 'Solicitar nueva inspección', 7),
  ('CAMBIAR DESTINO', 'Cambiar destino', 8),
  ('CONTINUAR', 'Continuar proceso', 9),
  ('DETENER', 'Detener proceso', 10)
) AS v(code, label, ord)
WHERE c.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM decision_catalog dc
    WHERE dc.company_id = c.id AND lower(dc.code) = lower(v.code)
  );

-- ============================================
-- DECISIONES (append-only, 06 §3, §10, §11)
-- ============================================

CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  lot_id UUID NOT NULL REFERENCES lots(id),
  inspection_id UUID REFERENCES inspections(id),
  decision_catalog_id UUID NOT NULL REFERENCES decision_catalog(id),
  decision_code VARCHAR(100) NOT NULL,
  decision_label VARCHAR(255) NOT NULL,
  fundamento TEXT,
  context_snapshot JSONB,
  status decision_status NOT NULL DEFAULT 'REGISTRADA',
  decided_by UUID NOT NULL REFERENCES users(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  annulled_by UUID REFERENCES users(id),
  annulled_at TIMESTAMPTZ,
  annul_reason TEXT,
  supersedes_decision_id UUID REFERENCES decisions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT decisions_annul_fields CHECK (
    (status = 'ANULADA' AND annulled_by IS NOT NULL AND annulled_at IS NOT NULL AND annul_reason IS NOT NULL AND btrim(annul_reason) <> '')
    OR (status = 'REGISTRADA' AND annulled_by IS NULL AND annulled_at IS NULL AND annul_reason IS NULL)
  ),
  CONSTRAINT decisions_no_self_supersede CHECK (supersedes_decision_id IS NULL OR supersedes_decision_id <> id)
);

CREATE INDEX IF NOT EXISTS idx_decisions_company_id ON decisions(company_id);
CREATE INDEX IF NOT EXISTS idx_decisions_lot_id ON decisions(lot_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_decided_by ON decisions(decided_by);
CREATE INDEX IF NOT EXISTS idx_decisions_inspection ON decisions(inspection_id);
CREATE INDEX IF NOT EXISTS idx_decisions_decided_at ON decisions(decided_at DESC);

-- Mismo tipo de decisión REGISTRADA por lote (control de duplicado, 06 §15)
CREATE UNIQUE INDEX IF NOT EXISTS idx_decisions_active_unique_type
  ON decisions (lot_id, lower(decision_code))
  WHERE status = 'REGISTRADA';

DROP TRIGGER IF EXISTS update_decisions_updated_at ON decisions;
CREATE TRIGGER update_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_decisions ON decisions;
CREATE TRIGGER audit_decisions
  AFTER INSERT OR UPDATE OR DELETE ON decisions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Append-only: solo se permite UPDATE de REGISTRADA → ANULADA con campos de anulación.
-- Nunca se modifican tipo, fundamento, contexto, lote, responsable original.
CREATE OR REPLACE FUNCTION decision_update_check()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Una decisión no puede eliminarse físicamente; use la anulación';
  END IF;

  IF OLD.status = 'ANULADA' THEN
    RAISE EXCEPTION 'Una decisión ANULADA no puede modificarse';
  END IF;

  IF NEW.status = 'REGISTRADA' THEN
    -- cualquier UPDATE que no sea pasar a ANULADA está prohibido si cambia contenido
    IF NEW.lot_id <> OLD.lot_id
       OR NEW.company_id <> OLD.company_id
       OR NEW.decision_catalog_id <> OLD.decision_catalog_id
       OR NEW.decision_code <> OLD.decision_code
       OR NEW.decision_label <> OLD.decision_label
       OR NEW.decided_by <> OLD.decided_by
       OR NEW.decided_at <> OLD.decided_at
       OR NEW.inspection_id IS DISTINCT FROM OLD.inspection_id
       OR NEW.fundamento IS DISTINCT FROM OLD.fundamento
       OR NEW.context_snapshot::text IS DISTINCT FROM OLD.context_snapshot::text
       OR NEW.supersedes_decision_id IS DISTINCT FROM OLD.supersedes_decision_id THEN
      RAISE EXCEPTION 'Una decisión REGISTRADA no puede modificar su contenido; anúlela y registre una nueva';
    END IF;
    RETURN NEW;
  END IF;

  -- TRANSICIÓN permitida: REGISTRADA → ANULADA
  IF NEW.status = 'ANULADA' AND OLD.status = 'REGISTRADA' THEN
    IF NEW.annulled_by IS NULL OR NEW.annulled_at IS NULL OR NEW.annul_reason IS NULL
       OR btrim(NEW.annul_reason) = '' THEN
      RAISE EXCEPTION 'La anulación requiere responsable, fecha/hora y motivo';
    END IF;
    IF NEW.annulled_by <> OLD.decided_by AND NEW.annulled_by IS NULL THEN
      RAISE EXCEPTION 'Anulación inválida';
    END IF;
    -- conservar contenido original
    NEW.lot_id := OLD.lot_id;
    NEW.company_id := OLD.company_id;
    NEW.decision_catalog_id := OLD.decision_catalog_id;
    NEW.decision_code := OLD.decision_code;
    NEW.decision_label := OLD.decision_label;
    NEW.fundamento := OLD.fundamento;
    NEW.context_snapshot := OLD.context_snapshot;
    NEW.decided_by := OLD.decided_by;
    NEW.decided_at := OLD.decided_at;
    NEW.inspection_id := OLD.inspection_id;
    NEW.supersedes_decision_id := OLD.supersedes_decision_id;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Transición de estado de decisión no permitida';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS decision_immutable ON decisions;
CREATE TRIGGER decision_immutable
  BEFORE UPDATE OR DELETE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION decision_update_check();

-- Lote CERRADO no admite nuevas decisiones (06 §9 + D-012 terminal)
CREATE OR REPLACE FUNCTION decision_lot_open_check()
RETURNS TRIGGER AS $$
DECLARE
  v_status lot_status;
  v_company UUID;
BEGIN
  SELECT status, company_id INTO v_status, v_company FROM lots WHERE id = NEW.lot_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Lote inexistente';
  END IF;
  IF v_company <> NEW.company_id THEN
    RAISE EXCEPTION 'La decisión y el lote deben pertenecer a la misma empresa';
  END IF;
  IF v_status = 'CERRADO' THEN
    RAISE EXCEPTION 'No se pueden registrar decisiones sobre un lote CERRADO';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS decision_lot_open ON decisions;
CREATE TRIGGER decision_lot_open
  BEFORE INSERT ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION decision_lot_open_check();

-- Catálogo debe pertenecer a la empresa y estar activo
CREATE OR REPLACE FUNCTION decision_catalog_check()
RETURNS TRIGGER AS $$
DECLARE
  v_company UUID;
  v_active BOOLEAN;
BEGIN
  SELECT company_id, is_active INTO v_company, v_active
  FROM decision_catalog WHERE id = NEW.decision_catalog_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Tipo de decisión inexistente';
  END IF;
  IF v_company <> NEW.company_id THEN
    RAISE EXCEPTION 'Tipo de decisión pertenece a otra empresa';
  END IF;
  IF NOT v_active THEN
    RAISE EXCEPTION 'Tipo de decisión inactivo';
  END IF;
  -- snapshot del catálogo al momento de decidir
  SELECT code, label INTO NEW.decision_code, NEW.decision_label
  FROM decision_catalog WHERE id = NEW.decision_catalog_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS decision_catalog_fk ON decisions;
CREATE TRIGGER decision_catalog_fk
  BEFORE INSERT ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION decision_catalog_check();

-- Inspección asociada (si viene) debe pertenecer al lote
CREATE OR REPLACE FUNCTION decision_inspection_check()
RETURNS TRIGGER AS $$
DECLARE
  v_lot UUID;
BEGIN
  IF NEW.inspection_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT lot_id INTO v_lot FROM inspections WHERE id = NEW.inspection_id;
  IF v_lot IS NULL THEN
    RAISE EXCEPTION 'Inspección inexistente';
  END IF;
  IF v_lot <> NEW.lot_id THEN
    RAISE EXCEPTION 'La inspección no pertenece al lote de la decisión';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS decision_inspection_fk ON decisions;
CREATE TRIGGER decision_inspection_fk
  BEFORE INSERT ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION decision_inspection_check();

-- ============================================
-- MAPA CONFIGURABLE PUNTO + DECISIÓN → ESTADO/ETAPA
-- PENDIENTE DE DECISIÓN: tabla creada VACÍA (sin reglas sembradas).
-- Cuando exista una fila activa, aplicar el efecto al lote al registrar la decisión.
-- ============================================

CREATE TABLE IF NOT EXISTS decision_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  decision_code VARCHAR(100) NOT NULL,
  inspection_point_id UUID REFERENCES inspection_points(id),
  target_lot_status lot_status,
  target_operational_stage_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (target_lot_status IS NOT NULL OR target_operational_stage_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_decision_effects_company ON decision_effects(company_id, lower(decision_code));
CREATE UNIQUE INDEX IF NOT EXISTS idx_decision_effects_scope
  ON decision_effects (company_id, lower(decision_code), inspection_point_id)
  WHERE is_active AND inspection_point_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_decision_effects_updated_at ON decision_effects;
CREATE TRIGGER update_decision_effects_updated_at
  BEFORE UPDATE ON decision_effects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_decision_effects ON decision_effects;
CREATE TRIGGER audit_decision_effects
  AFTER INSERT OR UPDATE OR DELETE ON decision_effects
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- RLS
-- ============================================

ALTER TABLE decision_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_effects ENABLE ROW LEVEL SECURITY;

-- ---------- CATÁLOGO ----------
DROP POLICY IF EXISTS "decision_catalog_select_company" ON decision_catalog;
CREATE POLICY "decision_catalog_select_company" ON decision_catalog
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "decision_catalog_insert_admin" ON decision_catalog;
CREATE POLICY "decision_catalog_insert_admin" ON decision_catalog
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

DROP POLICY IF EXISTS "decision_catalog_update_admin" ON decision_catalog;
CREATE POLICY "decision_catalog_update_admin" ON decision_catalog
  FOR UPDATE USING (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  )
  WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

-- ---------- DECISIONES ----------
-- SELECT: empresa. INSERT/UPDATE(anulación): COMPANY_ADMIN, INSPECTOR o SUPER_ADMIN.
-- Sin política DELETE (anulación, no borrado físico).

DROP POLICY IF EXISTS "decisions_select_company" ON decisions;
CREATE POLICY "decisions_select_company" ON decisions
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "decisions_insert_operator" ON decisions;
CREATE POLICY "decisions_insert_operator" ON decisions
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "decisions_update_operator" ON decisions;
CREATE POLICY "decisions_update_operator" ON decisions
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

-- ---------- EFECTOS (config por admin) ----------
DROP POLICY IF EXISTS "decision_effects_select_company" ON decision_effects;
CREATE POLICY "decision_effects_select_company" ON decision_effects
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "decision_effects_admin" ON decision_effects;
CREATE POLICY "decision_effects_admin" ON decision_effects
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

DROP POLICY IF EXISTS "decision_effects_update_admin" ON decision_effects;
CREATE POLICY "decision_effects_update_admin" ON decision_effects
  FOR UPDATE USING (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  )
  WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

DROP POLICY IF EXISTS "decision_effects_delete_admin" ON decision_effects;
CREATE POLICY "decision_effects_delete_admin" ON decision_effects
  FOR DELETE USING (
    is_super_admin()
    OR (get_current_user_role() = 'COMPANY_ADMIN' AND company_id = get_current_user_company_id())
  );

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE decision_catalog IS 'Tipos de decisión operacional configurables por empresa (06 §5; lista base CURRENT §21)';
COMMENT ON COLUMN decision_catalog.requires_fundamento IS 'Exige fundamento al registrar esta decisión (06 §4.12); configurable, sin regla fija sembrada';
COMMENT ON TABLE decisions IS 'Decisiones operacionales append-only: REGISTRADA/ANULADA; snapshot de contexto (06 §3, §10, §11)';
COMMENT ON COLUMN decisions.context_snapshot IS 'Información disponible al momento de decidir (06 §3, §8)';
COMMENT ON COLUMN decisions.status IS 'REGISTRADA vigente o ANULADA como antecedente histórico (06 §11); nunca delete físico';
COMMENT ON COLUMN decisions.supersedes_decision_id IS 'Decisión anterior relacionada al corregir/sustituir (06 §10)';
COMMENT ON TABLE decision_effects IS 'Mapa configurable PUNTO+DECISIÓN→ESTADO/ETAPA; VACÍA por diseño — PENDIENTE DE DECISIÓN (D-018.5): no inventar reglas';
