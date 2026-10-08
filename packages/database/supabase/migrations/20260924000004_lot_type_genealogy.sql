-- QUALITYNX — D-029: TIPO DE LOTE + FOLIO INTERNO + KG DECLARADOS + GENEALOGÍA
-- 2026-09-24 | Identidad ampliada de lote (origen / proceso / repalletizaje)
-- NO modifica 20260924000003 (clasificación/semáforo) ni 20260923000003 (folio/guía).
-- NO crea catálogo de productores/guías ni sistema logístico.
-- Guía multilote: N lotes comparten producer_guide_number (ya soportado) — sin transformación.
-- Proceso / repalletizaje: lote nuevo con NUEVO folio QualityNX + relación de genealogía.

-- ============================================
-- 1. LOTES: TIPO, FOLIO INTERNO, KG DECLARADOS (separados del cálculo del sistema)
-- ============================================

ALTER TABLE lots ADD COLUMN IF NOT EXISTS lot_type TEXT NOT NULL DEFAULT 'ORIGEN';
ALTER TABLE lots ADD COLUMN IF NOT EXISTS folio_interno TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS kg_declarados NUMERIC;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lots_lot_type_check'
  ) THEN
    ALTER TABLE lots ADD CONSTRAINT lots_lot_type_check
      CHECK (lot_type IN ('ORIGEN', 'PROCESO', 'REPALLETIZAJE'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lots_kg_declarados_check'
  ) THEN
    ALTER TABLE lots ADD CONSTRAINT lots_kg_declarados_check
      CHECK (kg_declarados IS NULL OR kg_declarados >= 0);
  END IF;
END $$;

COMMENT ON COLUMN lots.lot_type IS
  'Tipo de lote operacional: ORIGEN (origen/puro), PROCESO (lote nuevo de proceso), REPALLETIZAJE (lote derivado de repalletizaje). No altera el folio QualityNX de lotes existentes.';
COMMENT ON COLUMN lots.folio_interno IS
  'Folio interno/planta del productor (ej: PL-45872). Identificador separado del folio QualityNX (YYYY-NNNNNN); ambos se almacenan, muestran y buscan.';
COMMENT ON COLUMN lots.kg_declarados IS
  'Kg declarados según guía/productor (dato documental del lote). NO se sobrescribe con kg calculados por el sistema (theoretical_weight_kg).';

CREATE INDEX IF NOT EXISTS idx_lots_lot_type ON lots (company_id, lot_type);
CREATE INDEX IF NOT EXISTS idx_lots_folio_interno ON lots (company_id, folio_interno)
  WHERE folio_interno IS NOT NULL;

-- ============================================
-- 2. LOT_GENEALOGY — relación lote derivado ↔ lotes fuente
--    PROCESO / REPALLETIZAJE: conserva la historia de la fuente (append-only).
--    NO representa la guía multilote (misma guía, N lotes independientes, sin transformación).
-- ============================================

CREATE TABLE IF NOT EXISTS lot_genealogy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  source_lot_id UUID NOT NULL REFERENCES lots(id),
  derived_lot_id UUID NOT NULL REFERENCES lots(id),
  relation_type TEXT NOT NULL CHECK (relation_type IN ('PROCESO', 'REPALLETIZAJE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  CONSTRAINT lot_genealogy_no_self CHECK (source_lot_id <> derived_lot_id),
  CONSTRAINT lot_genealogy_unique_pair UNIQUE (source_lot_id, derived_lot_id)
);

COMMENT ON TABLE lot_genealogy IS
  'Genealogía de lotes derivados por PROCESO/REPALLETIZAJE: lote nuevo (folio propio) + lotes fuente. Append-only desde la app; la historia de origen no se elimina. No es guía multilote.';

CREATE INDEX IF NOT EXISTS idx_lot_genealogy_company
  ON lot_genealogy (company_id);
CREATE INDEX IF NOT EXISTS idx_lot_genealogy_derived
  ON lot_genealogy (derived_lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_genealogy_source
  ON lot_genealogy (source_lot_id);

-- ============================================
-- 3. RLS — misma pauta que quality_classifications
-- ============================================

ALTER TABLE lot_genealogy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot_genealogy_select_company" ON lot_genealogy;
CREATE POLICY "lot_genealogy_select_company" ON lot_genealogy
  FOR SELECT USING (
    is_super_admin()
    OR company_id = get_current_user_company_id()
  );

DROP POLICY IF EXISTS "lot_genealogy_insert_operator" ON lot_genealogy;
CREATE POLICY "lot_genealogy_insert_operator" ON lot_genealogy
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR', 'SUPER_ADMIN')
      AND company_id = get_current_user_company_id()
    )
  );

DROP TRIGGER IF EXISTS audit_lot_genealogy ON lot_genealogy;
CREATE TRIGGER audit_lot_genealogy
  AFTER INSERT OR UPDATE OR DELETE ON lot_genealogy
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
