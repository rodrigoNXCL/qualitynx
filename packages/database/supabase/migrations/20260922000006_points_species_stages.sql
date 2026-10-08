-- QualityNX D-015 + D-016 — Puntos de inspección por especie y etapa operacional
-- Cadena: EMPRESA → ESPECIE → ETAPA OPERACIONAL → PUNTO DE INSPECCIÓN → CRITERIOS
-- Recorrido lote: LOTE → INGRESO REAL → EVENTOS DE ETAPA → TRANSICIONES → INSPECCIONES
-- Demo 23/09: especie ARÁNDANO; 7 etapas; 7 puntos (1/etapa); 17 criterios SOLO en Inspección Huerto
-- Idempotente, sin estructuras paralelas, backfill explícito del punto existente.
-- NO crea eventos ficticios de etapas anteriores para lotes existentes.

-- ============================================
-- 0. AUDITORÍA SIN SESIÓN (SQL Editor / migraciones)
-- ============================================
-- audit_trigger_function usa auth.uid(); en SQL Editor no hay sesión → user_id NULL.
-- Permitir operaciones de sistema/migración en audit_logs (nullable).

ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN audit_logs.user_id IS
  'Usuario responsable; NULL en operaciones de sistema/migración sin sesión (SQL Editor).';

-- ============================================
-- 1. ENUMS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lot_stage_event_type') THEN
    CREATE TYPE lot_stage_event_type AS ENUM ('INGRESO', 'TRANSICION');
  END IF;
END $$;

-- ============================================
-- 2. operational_stages (global del producto)
-- ============================================

CREATE TABLE IF NOT EXISTS operational_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL,
  purpose TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_stages_name
  ON operational_stages (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_stages_order
  ON operational_stages (display_order);
CREATE INDEX IF NOT EXISTS idx_operational_stages_is_active ON operational_stages(is_active);

DROP TRIGGER IF EXISTS update_operational_stages_updated_at ON operational_stages;
CREATE TRIGGER update_operational_stages_updated_at
  BEFORE UPDATE ON operational_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_operational_stages ON operational_stages;
CREATE TRIGGER audit_operational_stages
  AFTER INSERT OR UPDATE OR DELETE ON operational_stages
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Seed idempotente: 7 etapas (D-016)
-- (audit_logs.user_id ya es NULLABLE — ver sección 0)
INSERT INTO operational_stages (name, display_order, purpose, is_active)
SELECT * FROM (VALUES
  ('Inspección Huerto', 1,
   'Evaluar condición y calidad de la fruta antes o durante la cosecha, directamente en origen.', true),
  ('Control de Cosecha', 2,
   'Controlar la fruta durante/tras la cosecha y verificar que el proceso de cosecha y la fruta cosechada cumplan criterios.', true),
  ('Recepción Frigorífico / Packing', 3,
   'Evaluar el lote al ingresar al establecimiento y establecer su condición inicial de recepción.', true),
  ('Proceso / Packing', 4,
   'Controlar la fruta durante selección, clasificación, embalaje y acondicionamiento.', true),
  ('Pre-frío / Frío / Almacenamiento', 5,
   'Controlar la condición del lote durante conservación y almacenamiento; puede registrar eventos/controles sin inspección formal.', true),
  ('Inspección Pre-Despacho', 6,
   'Evaluar el producto terminado antes del despacho; debe poder generar resultado/decisión operacional.', true),
  ('Despacho / Embarque', 7,
   'Registrar y controlar la salida del lote; principalmente evento operacional con controles asociados.', true)
) AS v(name, display_order, purpose, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM operational_stages os WHERE lower(os.name) = lower(v.name)
);

-- RLS: catálogo global — SELECT a usuarios autenticados; escritura solo super admin / SQL
ALTER TABLE operational_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operational_stages_select_auth" ON operational_stages;
CREATE POLICY "operational_stages_select_auth" ON operational_stages
  FOR SELECT USING (auth.uid() IS NOT NULL OR is_super_admin());

DROP POLICY IF EXISTS "operational_stages_update_super" ON operational_stages;
CREATE POLICY "operational_stages_update_super" ON operational_stages
  FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Sin política INSERT/DELETE vía API (seed/estructura por SQL)

COMMENT ON TABLE operational_stages IS 'Etapas operacionales globales del flujo de lote (D-016). NO son pasos obligatorios.';
COMMENT ON COLUMN operational_stages.name IS 'Nombre de la etapa operacional (D-016)';
COMMENT ON COLUMN operational_stages.display_order IS 'Orden en el flujo disponible (1..7 demo)';
COMMENT ON COLUMN operational_stages.purpose IS 'Propósito de la etapa (D-016)';

-- ============================================
-- 3. inspection_points: + species_id + operational_stage_id
-- ============================================

ALTER TABLE inspection_points
  ADD COLUMN IF NOT EXISTS species_id UUID REFERENCES species(id);

ALTER TABLE inspection_points
  ADD COLUMN IF NOT EXISTS operational_stage_id UUID REFERENCES operational_stages(id);

-- 3.a Backfill species_id: especie de la empresa (prioriza arándano en demo)
UPDATE inspection_points ip
SET species_id = (
  SELECT s.id
  FROM species s
  WHERE s.company_id = ip.company_id
  ORDER BY (lower(s.name) IN ('arándanos','arandanos','arándano','arandano')) DESC,
           s.created_at
  LIMIT 1
)
WHERE ip.species_id IS NULL;

-- 3.b Backfill operational_stage_id: por ID conocido del punto actual, luego por nombre
UPDATE inspection_points
SET operational_stage_id = (
  SELECT id FROM operational_stages WHERE lower(name) = lower('Inspección Huerto')
)
WHERE id = '9323ece0-73bd-417a-a9bc-9db30fce1e65'
  AND operational_stage_id IS NULL;

UPDATE inspection_points ip
SET operational_stage_id = os.id
FROM operational_stages os
WHERE ip.operational_stage_id IS NULL
  AND (
       (os.name = 'Inspección Huerto' AND ip.name ILIKE '%huerto%')
    OR (os.name = 'Control de Cosecha' AND ip.name ILIKE '%cosecha%')
    OR (os.name = 'Recepción Frigorífico / Packing' AND ip.name ILIKE '%recepci%')
    OR (os.name = 'Proceso / Packing' AND ip.name ILIKE '%packing%' AND ip.name NOT ILIKE '%recepci%')
    OR (os.name = 'Pre-frío / Frío / Almacenamiento'
        AND (ip.name ILIKE '%frío%' OR ip.name ILIKE '%frio%' OR ip.name ILIKE '%almacen%' OR ip.name ILIKE '%pre-fr%'))
    OR (os.name = 'Inspección Pre-Despacho' AND ip.name ILIKE '%despacho%' AND (ip.name ILIKE '%pre%' OR ip.name ILIKE '%pre-desp%'))
    OR (os.name = 'Despacho / Embarque'
        AND (ip.name ILIKE '%embarque%' OR (ip.name ILIKE '%despacho%' AND ip.name NOT ILIKE '%pre%')))
  );

-- 3.c Fallar si queda NULL (sin asumir)
DO $$
DECLARE v_null int;
BEGIN
  SELECT COUNT(*) INTO v_null FROM inspection_points WHERE species_id IS NULL OR operational_stage_id IS NULL;
  IF v_null > 0 THEN
    RAISE EXCEPTION 'Hay % puntos sin species_id o operational_stage_id tras backfill', v_null;
  END IF;
END $$;

ALTER TABLE inspection_points ALTER COLUMN species_id SET NOT NULL;
ALTER TABLE inspection_points ALTER COLUMN operational_stage_id SET NOT NULL;

-- 3.d Índice único: empresa + especie + etapa + nombre
DROP INDEX IF EXISTS idx_inspection_points_company_name;
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_points_company_species_stage_name
  ON inspection_points (company_id, species_id, operational_stage_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_inspection_points_stage ON inspection_points(operational_stage_id);
CREATE INDEX IF NOT EXISTS idx_inspection_points_species ON inspection_points(species_id);

-- 3.e Trigger coherencia: especie y etapa válidas; especie misma empresa
CREATE OR REPLACE FUNCTION inspection_point_context_check()
RETURNS TRIGGER AS $$
DECLARE v_species_company UUID; v_stage_active BOOLEAN;
BEGIN
  SELECT company_id INTO v_species_company FROM species WHERE id = NEW.species_id;
  IF v_species_company IS NULL THEN
    RAISE EXCEPTION 'Especie inexistente';
  END IF;
  IF v_species_company <> NEW.company_id THEN
    RAISE EXCEPTION 'La especie del punto debe pertenecer a la misma empresa';
  END IF;

  SELECT is_active INTO v_stage_active FROM operational_stages WHERE id = NEW.operational_stage_id;
  IF v_stage_active IS NULL THEN
    RAISE EXCEPTION 'Etapa operacional inexistente';
  END IF;
  IF NOT v_stage_active THEN
    RAISE EXCEPTION 'Etapa operacional inactiva';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS inspection_point_context_check ON inspection_points;
CREATE TRIGGER inspection_point_context_check
  BEFORE INSERT OR UPDATE ON inspection_points
  FOR EACH ROW EXECUTE FUNCTION inspection_point_context_check();

-- 3.f Trigger inspección: especie del punto = especie del lote
CREATE OR REPLACE FUNCTION inspection_species_match()
RETURNS TRIGGER AS $$
DECLARE v_lot_species uuid; v_point_species uuid;
BEGIN
  SELECT species_id INTO v_lot_species FROM lots WHERE id = NEW.lot_id;
  SELECT species_id INTO v_point_species FROM inspection_points WHERE id = NEW.inspection_point_id;
  IF v_lot_species IS NOT NULL AND v_point_species IS NOT NULL AND v_lot_species <> v_point_species THEN
    RAISE EXCEPTION 'El punto de inspección no corresponde a la especie del lote';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS inspection_species_match ON inspections;
CREATE TRIGGER inspection_species_match
  BEFORE INSERT ON inspections
  FOR EACH ROW EXECUTE FUNCTION inspection_species_match();

COMMENT ON COLUMN inspection_points.species_id IS 'D-015: ESPECIE en cadena EMPRESA→ESPECIE→ETAPA→PUNTO→CRITERIOS';
COMMENT ON COLUMN inspection_points.operational_stage_id IS 'D-016: Etapa operacional a la que pertenece el punto de inspección';
COMMENT ON TABLE inspection_points IS 'Puntos de inspección por empresa, especie y etapa operacional (D-015 + D-016). Entidad única, sin paralela.';

-- ============================================
-- 4. Seed puntos demo: 7 etapas × especie ARÁNDANO (1 punto/etapa)
--    NO crea segundo punto si la etapa ya tiene uno (backfill Huerto).
-- ============================================

INSERT INTO inspection_points (company_id, species_id, operational_stage_id, name)
SELECT s.company_id, s.id, os.id, os.name
FROM species s
CROSS JOIN operational_stages os
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND s.is_active
  AND NOT EXISTS (
    SELECT 1 FROM inspection_points ip
    WHERE ip.company_id = s.company_id
      AND ip.species_id = s.id
      AND ip.operational_stage_id = os.id
  );

-- ============================================
-- 5. Seed CRITERIOS — SOLO punto "Inspección Huerto" / ARÁNDANO (DEMO)
--    11 primarios (obligatorios) + 4 complementarios + 2 configurables = 17
--    Otras etapas: SIN criterios (no copiar Huerto).
--    Límites Brix≥10 y Pudrición≤2%: valores DEMO (ejemplos 05 §18), NO estándar universal.
-- ============================================

INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active
)
SELECT
  ip.company_id,
  ip.id,
  d.name,
  d.value_type::measurement_value_type,
  d.unit,
  d.is_required,
  d.min_value,
  d.max_value,
  d.options,
  true
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
CROSS JOIN LATERAL (VALUES
  -- PRIMARIOS (11) — checklist huerto (clasificación validada usuario)
  ('Color',              'lista',      NULL,     true,  NULL, NULL,
   ARRAY['Morado maduro','Rojo','Verde']),
  ('Madurez',            'lista',      NULL,     true,  NULL, NULL,
   ARRAY['Inmaduro','Óptimo','Sobremaduro']),
  ('Firmeza',            'numérica',   NULL,     true,  NULL, NULL, NULL),
  ('Calibre',            'numérica',   'mm',     true,  NULL, NULL, NULL),
  ('Fruta inmadura',     'porcentaje', '%',      true,  0,    NULL, NULL),
  ('Fruta sobremadura',  'porcentaje', '%',      true,  0,    NULL, NULL),
  ('Pudrición',          'porcentaje', '%',      true,  0,    2,    NULL), -- max 2 = DEMO (05 §18)
  ('Deshidratación',     'porcentaje', '%',      true,  0,    NULL, NULL),
  ('Daño mecánico',      'porcentaje', '%',      true,  0,    NULL, NULL),
  ('Defectos',           'porcentaje', '%',      true,  0,    NULL, NULL),
  ('Materia extraña',    'lista',      NULL,     true,  NULL, NULL,
   ARRAY['No','Sí — vegetal','Sí — mineral','Sí — otro']),
  -- COMPLEMENTARIOS (4) — configurables, no obligatorios por defecto
  ('Brix',               'numérica',   '°Bx',    false, 10,   NULL, NULL), -- min 10 = DEMO (05 §18)
  ('pH',                 'numérica',   NULL,     false, NULL, NULL, NULL),
  ('Acidez',             'numérica',   NULL,     false, NULL, NULL, NULL), -- unidad PENDIENTE
  ('Peso',               'numérica',   NULL,     false, NULL, NULL, NULL), -- unidad/protocolo PENDIENTE
  -- CONFIGURABLES / SEGÚN PROTOCOLO (2)
  ('Condición',          'lista',      NULL,     false, NULL, NULL, NULL), -- rollup §19, opciones config.
  ('Condición visual',   'texto',      NULL,     false, NULL, NULL, NULL)
) AS d(name, value_type, unit, is_required, min_value, max_value, options)
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND lower(os.name) = lower('Inspección Huerto')
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower(d.name)
  );

COMMENT ON TABLE measurement_defs IS
  'Criterios/mediciones por punto de inspección (D-015/D-016). Seed demo 17 solo Inspección Huerto+Arándano. Límites demo: Brix≥10, Pudrición≤2%. Validar técnica.';

-- ============================================
-- 6. lots: etapas de recorrido (entry + current)
-- ============================================

ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS entry_operational_stage_id UUID REFERENCES operational_stages(id);

ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS current_operational_stage_id UUID REFERENCES operational_stages(id);

-- SIN backfill de etapas para lotes existentes: no inventar ingreso ficticio (D-016 §7/§8)

COMMENT ON COLUMN lots.entry_operational_stage_id IS
  'D-016: etapa real de ingreso del lote al sistema; NULL si aún no se registra evento de etapa';
COMMENT ON COLUMN lots.current_operational_stage_id IS
  'D-016: etapa operacional actual; se sincroniza desde lot_stage_events';

-- ============================================
-- 7. lot_stage_events — trazabilidad de recorrido real
-- ============================================

CREATE TABLE IF NOT EXISTS lot_stage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  lot_id UUID NOT NULL REFERENCES lots(id),
  operational_stage_id UUID NOT NULL REFERENCES operational_stages(id),
  event_type lot_stage_event_type NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un solo INGRESO por lote (primera fila = ingreso real)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lot_stage_events_ingreso_unique
  ON lot_stage_events (lot_id)
  WHERE event_type = 'INGRESO';

CREATE INDEX IF NOT EXISTS idx_lot_stage_events_company ON lot_stage_events(company_id);
CREATE INDEX IF NOT EXISTS idx_lot_stage_events_lot ON lot_stage_events(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_stage_events_stage ON lot_stage_events(operational_stage_id);
CREATE INDEX IF NOT EXISTS idx_lot_stage_events_type ON lot_stage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lot_stage_events_occurred ON lot_stage_events(occurred_at DESC);

DROP TRIGGER IF EXISTS audit_lot_stage_events ON lot_stage_events;
CREATE TRIGGER audit_lot_stage_events
  AFTER INSERT OR UPDATE OR DELETE ON lot_stage_events
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Validación + sincronización de etapa del lote
CREATE OR REPLACE FUNCTION lot_stage_event_apply()
RETURNS TRIGGER AS $$
DECLARE
  v_lot_company UUID;
  v_lot_status lot_status;
  v_stage_active BOOLEAN;
  v_ingreso INT;
BEGIN
  SELECT company_id, status INTO v_lot_company, v_lot_status
  FROM lots WHERE id = NEW.lot_id;
  IF v_lot_company IS NULL THEN
    RAISE EXCEPTION 'Lote inexistente';
  END IF;
  IF v_lot_company <> NEW.company_id THEN
    RAISE EXCEPTION 'El evento de etapa debe corresponder a la empresa del lote';
  END IF;
  IF v_lot_status = 'CERRADO' THEN
    RAISE EXCEPTION 'Un lote CERRADO no admite eventos de etapa';
  END IF;

  SELECT is_active INTO v_stage_active FROM operational_stages WHERE id = NEW.operational_stage_id;
  IF v_stage_active IS NULL OR NOT v_stage_active THEN
    RAISE EXCEPTION 'Etapa operacional inexistente o inactiva';
  END IF;

  IF NEW.event_type = 'INGRESO' THEN
    SELECT COUNT(*) INTO v_ingreso FROM lot_stage_events
    WHERE lot_id = NEW.lot_id AND event_type = 'INGRESO';
    -- índice único también protege; este check da mensaje claro
    IF v_ingreso > 0 THEN
      RAISE EXCEPTION 'El lote ya tiene evento de INGRESO; use TRANSICION';
    END IF;
  END IF;

  -- Sincronizar etapa actual del lote
  UPDATE lots
  SET current_operational_stage_id = NEW.operational_stage_id,
      entry_operational_stage_id = CASE
        WHEN entry_operational_stage_id IS NULL THEN NEW.operational_stage_id
        ELSE entry_operational_stage_id
      END
  WHERE id = NEW.lot_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lot_stage_event_apply ON lot_stage_events;
CREATE TRIGGER lot_stage_event_apply
  BEFORE INSERT ON lot_stage_events
  FOR EACH ROW EXECUTE FUNCTION lot_stage_event_apply();

-- RLS
ALTER TABLE lot_stage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot_stage_events_select_company" ON lot_stage_events;
CREATE POLICY "lot_stage_events_select_company" ON lot_stage_events
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "lot_stage_events_insert_operator" ON lot_stage_events;
CREATE POLICY "lot_stage_events_insert_operator" ON lot_stage_events
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (
      get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR')
      AND company_id = get_current_user_company_id()
    )
  );

-- Sin UPDATE/DELETE: el recorrido es histórico append-only (RB-012 / RB-013)

COMMENT ON TABLE lot_stage_events IS
  'Recorrido real del lote por etapas operacionales (D-016). Primera fila INGRESO = punto real de entrada; sin eventos ficticios.';
COMMENT ON COLUMN lot_stage_events.event_type IS 'INGRESO = primera etapa real; TRANSICION = cambio posterior de etapa';
COMMENT ON COLUMN lot_stage_events.notes IS 'Observación cuando corresponda';

-- ============================================
-- 8. Verificación final idempotente
-- ============================================

DO $$
DECLARE
  v_stages int; v_points int; v_crit_huerto int; v_other_crit int;
BEGIN
  SELECT COUNT(*) INTO v_stages FROM operational_stages;
  IF v_stages <> 7 THEN
    RAISE EXCEPTION 'Se esperaban 7 operational_stages, hay %', v_stages;
  END IF;

  SELECT COUNT(*) INTO v_points
  FROM inspection_points ip
  JOIN species s ON s.id = ip.species_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano');
  IF v_points < 7 THEN
    RAISE EXCEPTION 'Se esperaban >=7 puntos para arándano, hay %', v_points;
  END IF;

  SELECT COUNT(*) INTO v_crit_huerto
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) = lower('Inspección Huerto')
    AND md.is_active;
  IF v_crit_huerto < 17 THEN
    RAISE EXCEPTION 'Se esperaban >=17 criterios en Inspección Huerto, hay %', v_crit_huerto;
  END IF;

  -- Otras etapas no deben tener criterios copiados de Huerto
  SELECT COUNT(*) INTO v_other_crit
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) <> lower('Inspección Huerto')
    AND md.is_active;
  IF v_other_crit > 0 THEN
    RAISE EXCEPTION 'No deben existir criterios en etapas distintas de Huerto (hay %)', v_other_crit;
  END IF;

  RAISE NOTICE '000006 OK: stages=%, points_arandano=%, criterios_huerto=%, otras_etapas_crit=%',
    v_stages, v_points, v_crit_huerto, v_other_crit;
END $$;
