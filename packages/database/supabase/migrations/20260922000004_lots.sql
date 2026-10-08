-- QualityNX LOTS — Etapa 03
-- Fuente: docs/03_LOTS.md + CURRENT.md §8, §28, RB-001/RB-002
-- Identidad: PRODUCTOR + VARIEDAD + FECHA DE FRUTA + BLOQUE DE COSECHA
-- Estados: 10 de CURRENT §28 (D-012: transición libre + CERRADO terminal)
-- Reglas: RLS por empresa, sin DELETE, auditoría automática,
--         referencias maestras válidas y de la misma empresa,
--         dato maestro INACTIVO no usable en nuevo lote (02_MASTER_DATA §14).

-- ============================================
-- ENUM DE ESTADOS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lot_status') THEN
    CREATE TYPE lot_status AS ENUM (
      'CREADO',
      'EN PROCESO',
      'EN INSPECCIÓN',
      'RETENIDO',
      'APROBADO',
      'RECHAZADO',
      'SEGREGADO',
      'EN REPROCESO',
      'LIBERADO',
      'CERRADO'
    );
  END IF;
END $$;

-- ============================================
-- LOTES
-- ============================================

CREATE TABLE IF NOT EXISTS lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  producer_id UUID NOT NULL REFERENCES producers(id),
  variety_id UUID NOT NULL REFERENCES varieties(id),
  fruit_date DATE NOT NULL,
  harvest_block VARCHAR(255) NOT NULL,
  status lot_status NOT NULL DEFAULT 'CREADO',
  species_id UUID REFERENCES species(id),
  field_id UUID REFERENCES fields(id),
  block_id UUID REFERENCES blocks(id),
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Identidad mínima (RB-002): productor + variedad + fecha + bloque de cosecha
CREATE UNIQUE INDEX IF NOT EXISTS idx_lots_identity
  ON lots (company_id, producer_id, variety_id, fruit_date, lower(harvest_block));

CREATE INDEX IF NOT EXISTS idx_lots_company_id ON lots(company_id);
CREATE INDEX IF NOT EXISTS idx_lots_producer_id ON lots(producer_id);
CREATE INDEX IF NOT EXISTS idx_lots_variety_id ON lots(variety_id);
CREATE INDEX IF NOT EXISTS idx_lots_status ON lots(status);
CREATE INDEX IF NOT EXISTS idx_lots_fruit_date ON lots(fruit_date);

-- ============================================
-- TRIGGERS
-- ============================================

-- D-012: CERRADO es terminal — no se reabre.
CREATE OR REPLACE FUNCTION lot_status_terminal_check()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'CERRADO' AND NEW.status <> 'CERRADO' THEN
    RAISE EXCEPTION 'Un lote CERRADO no puede cambiar de estado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validación de referencias (03_LOTS PRUEBA 4):
-- productor y variedad deben existir, pertenecer a la misma empresa y estar ACTIVOS.
CREATE OR REPLACE FUNCTION lot_validate_references()
RETURNS TRIGGER AS $$
DECLARE
  v_producer_active BOOLEAN;
  v_producer_company UUID;
  v_variety_active BOOLEAN;
  v_variety_company UUID;
  v_species_id UUID;
BEGIN
  SELECT is_active, company_id INTO v_producer_active, v_producer_company
  FROM producers WHERE id = NEW.producer_id;
  IF v_producer_company IS NULL THEN
    RAISE EXCEPTION 'Productor inexistente';
  END IF;
  IF v_producer_company <> NEW.company_id THEN
    RAISE EXCEPTION 'Productor pertenece a otra empresa';
  END IF;
  IF NOT v_producer_active THEN
    RAISE EXCEPTION 'Productor inactivo';
  END IF;

  SELECT is_active, company_id, species_id INTO v_variety_active, v_variety_company, v_species_id
  FROM varieties WHERE id = NEW.variety_id;
  IF v_variety_company IS NULL THEN
    RAISE EXCEPTION 'Variedad inexistente';
  END IF;
  IF v_variety_company <> NEW.company_id THEN
    RAISE EXCEPTION 'Variedad pertenece a otra empresa';
  END IF;
  IF NOT v_variety_active THEN
    RAISE EXCEPTION 'Variedad inactiva';
  END IF;

  -- Especie derivada de la variedad cuando no viene explícita.
  IF NEW.species_id IS NULL THEN
    NEW.species_id := v_species_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_lots_updated_at ON lots;
CREATE TRIGGER update_lots_updated_at
  BEFORE UPDATE ON lots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_lots ON lots;
CREATE TRIGGER audit_lots
  AFTER INSERT OR UPDATE OR DELETE ON lots
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS lot_status_terminal ON lots;
CREATE TRIGGER lot_status_terminal
  BEFORE UPDATE OF status ON lots
  FOR EACH ROW
  EXECUTE FUNCTION lot_status_terminal_check();

DROP TRIGGER IF EXISTS lot_validate_refs ON lots;
CREATE TRIGGER lot_validate_refs
  BEFORE INSERT OR UPDATE ON lots
  FOR EACH ROW
  EXECUTE FUNCTION lot_validate_references();

-- ============================================
-- RLS
-- ============================================

ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lots_select_company" ON lots;
CREATE POLICY "lots_select_company" ON lots
  FOR SELECT USING (
    is_super_admin()
    OR company_id = get_current_user_company_id()
  );

DROP POLICY IF EXISTS "lots_insert_admin" ON lots;
CREATE POLICY "lots_insert_admin" ON lots
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() = 'COMPANY_ADMIN'
      AND company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "lots_update_admin" ON lots;
CREATE POLICY "lots_update_admin" ON lots
  FOR UPDATE USING (
    is_super_admin()
    OR (
      get_current_user_role() = 'COMPANY_ADMIN'
      AND company_id = get_current_user_company_id()
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() = 'COMPANY_ADMIN'
      AND company_id = get_current_user_company_id()
    )
  );

-- Sin política DELETE: no se permite eliminación física vía API.
-- Cerrar no elimina (03_LOTS regla 8).

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE lots IS 'Lotes trazables por empresa (03_LOTS.md; identidad RB-002)';
COMMENT ON COLUMN lots.harvest_block IS 'Bloque de cosecha — parte de la identidad del lote (texto)';
COMMENT ON COLUMN lots.status IS 'Estado operacional (CURRENT §28, D-012: CERRADO terminal)';
COMMENT ON COLUMN lots.species_id IS 'Especie derivada de la variedad (referencia asociada)';
COMMENT ON COLUMN lots.field_id IS 'Campo asociado cuando corresponda';
COMMENT ON COLUMN lots.block_id IS 'Cuartel asociado cuando corresponda';
COMMENT ON COLUMN lots.season_id IS 'Temporada asociada cuando corresponda';
