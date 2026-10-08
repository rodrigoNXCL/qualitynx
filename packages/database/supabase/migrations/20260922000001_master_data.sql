-- QualityNX MASTER DATA — Etapa 02
-- Fuente: docs/02_MASTER_DATA.md
-- Entidades: productores, campos, cuarteles, especies, variedades, temporadas
-- Relaciones: EMPRESA → PRODUCTOR → CAMPO → CUARTEL
--             ESPECIE → VARIEDAD
--             EMPRESA → TEMPORADA
-- Reglas: RLS por empresa, estados ACTIVO/INACTIVO, sin eliminación física,
--         unicidad dentro del ámbito, auditoría automática.

-- ============================================
-- PRODUCTORES
-- ============================================

CREATE TABLE IF NOT EXISTS producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_producers_company_name
  ON producers (company_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_producers_company_id ON producers(company_id);
CREATE INDEX IF NOT EXISTS idx_producers_is_active ON producers(is_active);

DROP TRIGGER IF EXISTS update_producers_updated_at ON producers;
CREATE TRIGGER update_producers_updated_at
  BEFORE UPDATE ON producers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_producers ON producers;
CREATE TRIGGER audit_producers
  AFTER INSERT OR UPDATE OR DELETE ON producers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- CAMPOS
-- ============================================

CREATE TABLE IF NOT EXISTS fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  producer_id UUID NOT NULL REFERENCES producers(id),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fields_producer_name
  ON fields (producer_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_fields_company_id ON fields(company_id);
CREATE INDEX IF NOT EXISTS idx_fields_producer_id ON fields(producer_id);
CREATE INDEX IF NOT EXISTS idx_fields_is_active ON fields(is_active);

DROP TRIGGER IF EXISTS update_fields_updated_at ON fields;
CREATE TRIGGER update_fields_updated_at
  BEFORE UPDATE ON fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_fields ON fields;
CREATE TRIGGER audit_fields
  AFTER INSERT OR UPDATE OR DELETE ON fields
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- CUARTELES
-- ============================================

CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  field_id UUID NOT NULL REFERENCES fields(id),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_field_name
  ON blocks (field_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_blocks_company_id ON blocks(company_id);
CREATE INDEX IF NOT EXISTS idx_blocks_field_id ON blocks(field_id);
CREATE INDEX IF NOT EXISTS idx_blocks_is_active ON blocks(is_active);

DROP TRIGGER IF EXISTS update_blocks_updated_at ON blocks;
CREATE TRIGGER update_blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_blocks ON blocks;
CREATE TRIGGER audit_blocks
  AFTER INSERT OR UPDATE OR DELETE ON blocks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- ESPECIES
-- ============================================

CREATE TABLE IF NOT EXISTS species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_species_company_name
  ON species (company_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_species_company_id ON species(company_id);
CREATE INDEX IF NOT EXISTS idx_species_is_active ON species(is_active);

DROP TRIGGER IF EXISTS update_species_updated_at ON species;
CREATE TRIGGER update_species_updated_at
  BEFORE UPDATE ON species
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_species ON species;
CREATE TRIGGER audit_species
  AFTER INSERT OR UPDATE OR DELETE ON species
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- VARIEDADES
-- ============================================

CREATE TABLE IF NOT EXISTS varieties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  species_id UUID NOT NULL REFERENCES species(id),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_varieties_species_name
  ON varieties (species_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_varieties_company_id ON varieties(company_id);
CREATE INDEX IF NOT EXISTS idx_varieties_species_id ON varieties(species_id);
CREATE INDEX IF NOT EXISTS idx_varieties_is_active ON varieties(is_active);

DROP TRIGGER IF EXISTS update_varieties_updated_at ON varieties;
CREATE TRIGGER update_varieties_updated_at
  BEFORE UPDATE ON varieties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_varieties ON varieties;
CREATE TRIGGER audit_varieties
  AFTER INSERT OR UPDATE OR DELETE ON varieties
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- TEMPORADAS
-- ============================================

CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_company_name
  ON seasons (company_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_seasons_company_id ON seasons(company_id);
CREATE INDEX IF NOT EXISTS idx_seasons_is_active ON seasons(is_active);

DROP TRIGGER IF EXISTS update_seasons_updated_at ON seasons;
CREATE TRIGGER update_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_seasons ON seasons;
CREATE TRIGGER audit_seasons
  AFTER INSERT OR UPDATE OR DELETE ON seasons
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- RLS
-- ============================================

ALTER TABLE producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE species ENABLE ROW LEVEL SECURITY;
ALTER TABLE varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- ---------- PRODUCTORES ----------

DROP POLICY IF EXISTS "producers_select_company" ON producers;
CREATE POLICY "producers_select_company" ON producers
  FOR SELECT USING (
    is_super_admin()
    OR company_id = get_current_user_company_id()
  );

DROP POLICY IF EXISTS "producers_insert_admin" ON producers;
CREATE POLICY "producers_insert_admin" ON producers
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() = 'COMPANY_ADMIN'
      AND company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "producers_update_admin" ON producers;
CREATE POLICY "producers_update_admin" ON producers
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

-- ---------- CAMPOS ----------

DROP POLICY IF EXISTS "fields_select_company" ON fields;
CREATE POLICY "fields_select_company" ON fields
  FOR SELECT USING (
    is_super_admin()
    OR company_id = get_current_user_company_id()
  );

DROP POLICY IF EXISTS "fields_insert_admin" ON fields;
CREATE POLICY "fields_insert_admin" ON fields
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() = 'COMPANY_ADMIN'
      AND company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "fields_update_admin" ON fields;
CREATE POLICY "fields_update_admin" ON fields
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

-- ---------- CUARTELES ----------

DROP POLICY IF EXISTS "blocks_select_company" ON blocks;
CREATE POLICY "blocks_select_company" ON blocks
  FOR SELECT USING (
    is_super_admin()
    OR company_id = get_current_user_company_id()
  );

DROP POLICY IF EXISTS "blocks_insert_admin" ON blocks;
CREATE POLICY "blocks_insert_admin" ON blocks
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() = 'COMPANY_ADMIN'
      AND company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "blocks_update_admin" ON blocks;
CREATE POLICY "blocks_update_admin" ON blocks
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

-- ---------- ESPECIES ----------

DROP POLICY IF EXISTS "species_select_company" ON species;
CREATE POLICY "species_select_company" ON species
  FOR SELECT USING (
    is_super_admin()
    OR company_id = get_current_user_company_id()
  );

DROP POLICY IF EXISTS "species_insert_admin" ON species;
CREATE POLICY "species_insert_admin" ON species
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() = 'COMPANY_ADMIN'
      AND company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "species_update_admin" ON species;
CREATE POLICY "species_update_admin" ON species
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

-- ---------- VARIEDADES ----------

DROP POLICY IF EXISTS "varieties_select_company" ON varieties;
CREATE POLICY "varieties_select_company" ON varieties
  FOR SELECT USING (
    is_super_admin()
    OR company_id = get_current_user_company_id()
  );

DROP POLICY IF EXISTS "varieties_insert_admin" ON varieties;
CREATE POLICY "varieties_insert_admin" ON varieties
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() = 'COMPANY_ADMIN'
      AND company_id = get_current_user_company_id()
      AND EXISTS (
        SELECT 1 FROM species s
        WHERE s.id = species_id AND s.company_id = company_id
      )
    )
  );

DROP POLICY IF EXISTS "varieties_update_admin" ON varieties;
CREATE POLICY "varieties_update_admin" ON varieties
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

-- ---------- TEMPORADAS ----------

DROP POLICY IF EXISTS "seasons_select_company" ON seasons;
CREATE POLICY "seasons_select_company" ON seasons
  FOR SELECT USING (
    is_super_admin()
    OR company_id = get_current_user_company_id()
  );

DROP POLICY IF EXISTS "seasons_insert_admin" ON seasons;
CREATE POLICY "seasons_insert_admin" ON seasons
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() = 'COMPANY_ADMIN'
      AND company_id = get_current_user_company_id()
    )
  );

DROP POLICY IF EXISTS "seasons_update_admin" ON seasons;
CREATE POLICY "seasons_update_admin" ON seasons
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

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE producers IS 'Productores por empresa (02_MASTER_DATA.md Sección 5)';
COMMENT ON TABLE fields IS 'Campos por productor (02_MASTER_DATA.md Sección 6)';
COMMENT ON TABLE blocks IS 'Cuarteles por campo (02_MASTER_DATA.md Sección 7)';
COMMENT ON TABLE species IS 'Especies por empresa (02_MASTER_DATA.md Sección 8)';
COMMENT ON TABLE varieties IS 'Variedades por especie (02_MASTER_DATA.md Sección 9)';
COMMENT ON TABLE seasons IS 'Temporadas por empresa (02_MASTER_DATA.md Sección 10)';
