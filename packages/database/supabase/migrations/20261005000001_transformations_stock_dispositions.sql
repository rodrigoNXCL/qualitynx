-- QUALITYNX — D-032: TRANSFORMACIONES DE PLANTA, EXISTENCIAS Y DISPOSICIONES
-- 2026-10-05 (revisión 2 — corrige hallazgos de la revisión pre-migración)
--
-- Responde a la brecha: la genealogía (D-029/D-031) registra de dónde viene un
-- lote, pero NO controla una operación de planta con varias salidas, remanentes,
-- merma ni disponibilidad real.
--
-- REGLAS DEL MODELO (reglas operacionales del sistema, NO reglas normativas):
--   · Una transformación tiene N fuentes y N salidas, incluidas remanentes.
--   · Todo producto que sigue existiendo después es un lote nuevo con folio
--     propio. El remanente NO es un saldo informal.
--   · No hay conversión automática de unidades. Una transformación trabaja en
--     una sola unidad.
--   · Merma y descarte son salidas explícitas con motivo. No son remanente.
--   · No se consume más de lo disponible, con bloqueo de filas de origen.
--   · Una transformación confirmada es append-only. Corregirla exige anularla
--     con motivo y compensación; nunca se borra historia.
--
-- DISPONIBILIDAD: la fuente de verdad ÚNICA es `lot_stock_movements`.
-- `lots.quantity` es contenido declarado y NO participa en el saldo. Todo lote
-- con cantidad y unidad tiene exactamente un movimiento APERTURA, generado por
-- trigger en la creación del lote o por el backfill de esta migración.
--
-- NO modifica datos históricos. NO altera lot_genealogy. NO habilita etapas por
-- inferencia.

-- ============================================
-- 1. UNIDAD DECLARADA DEL LOTE
-- ============================================

ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(32);

COMMENT ON COLUMN lots.quantity_unit IS
  'Unidad declarada de `quantity`. NULL = no declarada: el lote se muestra pero NO tiene saldo. El saldo se calcula SOLO desde lot_stock_movements. No se convierte entre unidades.';

-- ============================================
-- 2. TRANSFORMACIONES
-- ============================================

CREATE TABLE IF NOT EXISTS lot_transformations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  transformation_type TEXT NOT NULL
    CHECK (transformation_type IN ('PROCESO', 'REPALLETIZAJE')),

  status TEXT NOT NULL DEFAULT 'BORRADOR'
    CHECK (status IN ('BORRADOR', 'CONFIRMADA', 'ANULADA')),

  unit VARCHAR(32) NOT NULL,
  notes TEXT,

  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES users(id),
  annulled_at TIMESTAMPTZ,
  annulled_by UUID REFERENCES users(id),
  annul_reason TEXT,
  annul_compensated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT lot_transformations_confirmed_fields CHECK (
    (status = 'CONFIRMADA'
      AND confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL
      AND annulled_at IS NULL AND annulled_by IS NULL AND annul_reason IS NULL)
    OR (status = 'BORRADOR'
      AND confirmed_at IS NULL AND confirmed_by IS NULL
      AND annulled_at IS NULL AND annulled_by IS NULL AND annul_reason IS NULL)
    OR (status = 'ANULADA'
      AND annulled_at IS NOT NULL AND annulled_by IS NOT NULL
      AND annul_reason IS NOT NULL AND btrim(annul_reason) <> '')
  )
);

COMMENT ON TABLE lot_transformations IS
  'Operación de planta con N fuentes y N salidas (D-032). Append-only: las transiciones las controla lot_transformations_transition_guard.';

CREATE INDEX IF NOT EXISTS idx_lot_transformations_company
  ON lot_transformations (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lot_transformations_status
  ON lot_transformations (company_id, status);

-- ============================================
-- 3. LIBRO DE MOVIMIENTOS (fuente de verdad del saldo; se crea tras lot_transformations por su FK)
-- ============================================

CREATE TABLE IF NOT EXISTS lot_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  lot_id UUID NOT NULL REFERENCES lots(id),

  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'APERTURA', 'INGRESO', 'CONSUMO', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'
  )),
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,

  transformation_id UUID REFERENCES lot_transformations(id),
  source_lot_id UUID REFERENCES lots(id),
  -- Anulación que compensa este movimiento. NULL en movimientos originales.
  reverses_transformation_id UUID REFERENCES lot_transformations(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT lot_stock_movements_type_direction CHECK (
    (movement_type IN ('APERTURA', 'INGRESO', 'AJUSTE_POSITIVO') AND direction = 'IN')
    OR (movement_type IN ('CONSUMO', 'AJUSTE_NEGATIVO') AND direction = 'OUT')
  ),
  -- El consumo siempre pertenece a una transformación con lote fuente identificado.
  CONSTRAINT lot_stock_movements_consumo_completo CHECK (
    movement_type <> 'CONSUMO'
    OR (transformation_id IS NOT NULL AND source_lot_id IS NOT NULL)
  ),
  -- Un ajuste siempre declara qué anulación compensa.
  CONSTRAINT lot_stock_movements_ajuste_completo CHECK (
    movement_type NOT IN ('AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO')
    OR reverses_transformation_id IS NOT NULL
  ),
  -- Una anulación no se compensa dos veces.
  CONSTRAINT lot_stock_movements_unica_compensacion UNIQUE (reverses_transformation_id, lot_id, movement_type)
);

COMMENT ON TABLE lot_stock_movements IS
  'Libro append-only de movimientos. FUENTE ÚNICA del saldo por lote. APERTURA = contenido declarado. CONSUMO = transformación que lo consumió. AJUSTE_* = compensación de una anulación. El saldo nunca se deduce de lot_status ni de lots.quantity.';

CREATE INDEX IF NOT EXISTS idx_lot_stock_movements_lot
  ON lot_stock_movements (lot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lot_stock_movements_company
  ON lot_stock_movements (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lot_stock_movements_transformation
  ON lot_stock_movements (transformation_id) WHERE transformation_id IS NOT NULL;

-- Idempotencia de APERTURA sin depender de columnas nullable:
-- un índice único PARCIAL sobre (lot_id) no admite duplicados y no usa
-- source_lot_id, que es NULL en las aperturas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lot_stock_movements_apertura_unica
  ON lot_stock_movements (lot_id)
  WHERE movement_type = 'APERTURA';

-- Un lote fuente no se puede consumir dos veces dentro de la misma operación.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lot_stock_movements_consumo_unico
  ON lot_stock_movements (transformation_id, source_lot_id)
  WHERE movement_type = 'CONSUMO';

-- ============================================
-- 4. ENTRADAS
-- ============================================

CREATE TABLE IF NOT EXISTS lot_transformation_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformation_id UUID NOT NULL REFERENCES lot_transformations(id) ON DELETE CASCADE,
  source_lot_id UUID NOT NULL REFERENCES lots(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  available_quantity NUMERIC NOT NULL CHECK (available_quantity >= 0),
  consumed_quantity NUMERIC NOT NULL CHECK (consumed_quantity > 0),
  unit VARCHAR(32) NOT NULL,
  remnant_handling TEXT NOT NULL DEFAULT 'COMO_LOTE_NUEVO'
    CHECK (remnant_handling IN ('COMO_LOTE_NUEVO', 'SIN_REMANENTE')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT lot_transformation_inputs_unique_source UNIQUE (transformation_id, source_lot_id),
  CONSTRAINT lot_transformation_inputs_consumed_lte_available CHECK (consumed_quantity <= available_quantity)
);

COMMENT ON TABLE lot_transformation_inputs IS
  'Lote fuente consumido por una transformación, con la cantidad disponible antes y la cantidad consumida.';

CREATE INDEX IF NOT EXISTS idx_lot_transformation_inputs_transformation
  ON lot_transformation_inputs (transformation_id);
CREATE INDEX IF NOT EXISTS idx_lot_transformation_inputs_lot
  ON lot_transformation_inputs (source_lot_id, created_at DESC);

-- ============================================
-- 5. SALIDAS
-- ============================================

CREATE TABLE IF NOT EXISTS lot_transformation_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformation_id UUID NOT NULL REFERENCES lot_transformations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),

  result_lot_id UUID REFERENCES lots(id),
  output_kind TEXT NOT NULL
    CHECK (output_kind IN ('RESULTADO', 'REMANENTE', 'MERMA', 'DESCARTE')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit VARCHAR(32) NOT NULL,
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT lot_transformation_outputs_lot_required CHECK (
    (output_kind IN ('RESULTADO', 'REMANENTE') AND result_lot_id IS NOT NULL)
    OR (output_kind IN ('MERMA', 'DESCARTE') AND result_lot_id IS NULL)
  ),
  CONSTRAINT lot_transformation_outputs_reason_required CHECK (
    (output_kind IN ('MERMA', 'DESCARTE') AND reason IS NOT NULL AND btrim(reason) <> '')
    OR (output_kind IN ('RESULTADO', 'REMANENTE'))
  ),
  CONSTRAINT lot_transformation_outputs_unique_lot UNIQUE (result_lot_id)
);

COMMENT ON TABLE lot_transformation_outputs IS
  'Salida de una transformación: RESULTADO, REMANENTE, MERMA o DESCARTE. Producto y remanente son lotes nuevos; merma y descarte exigen motivo y no producen lote.';

CREATE INDEX IF NOT EXISTS idx_lot_transformation_outputs_transformation
  ON lot_transformation_outputs (transformation_id);
CREATE INDEX IF NOT EXISTS idx_lot_transformation_outputs_lot
  ON lot_transformation_outputs (result_lot_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lot_transformation_outputs_unique_remanent
  ON lot_transformation_outputs (transformation_id)
  WHERE output_kind = 'REMANENTE';

-- ============================================
-- 6. DISPOSICIÓN FINAL (base mínima, sin inventar logística)
-- ============================================

CREATE TABLE IF NOT EXISTS lot_dispositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  lot_id UUID NOT NULL REFERENCES lots(id),

  disposition_type TEXT NOT NULL
    CHECK (disposition_type IN ('DESPACHO', 'RECHAZO', 'SEGREGACION', 'RETENCION', 'DEVOLUCION')),
  quantity NUMERIC CHECK (quantity IS NULL OR quantity > 0),
  unit VARCHAR(32),
  -- NULL = no registrado. NO significa que no hubo despacho.
  destination_reference TEXT,
  disposition_result TEXT,
  reason TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  inspection_id UUID REFERENCES inspections(id),
  decision_id UUID REFERENCES decisions(id),
  registered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT lot_dispositions_reason_required CHECK (reason IS NOT NULL AND btrim(reason) <> ''),
  CONSTRAINT lot_dispositions_control_requires_support CHECK (
    disposition_type NOT IN ('RECHAZO', 'SEGREGACION')
    OR inspection_id IS NOT NULL OR decision_id IS NOT NULL
  )
);

COMMENT ON TABLE lot_dispositions IS
  'Disposición final de un lote (D-032). Base mínima: no modela planta, pallet, contenedor ni naviera porque esas dimensiones siguen sin definirse (L-01).';

CREATE INDEX IF NOT EXISTS idx_lot_dispositions_lot
  ON lot_dispositions (lot_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lot_dispositions_company
  ON lot_dispositions (company_id, occurred_at DESC);

-- ============================================
-- 7. DISPONIBILIDAD: derivada SOLO del libro
-- ============================================

CREATE OR REPLACE VIEW lot_availability WITH (security_invoker = true) AS
WITH saldo AS (
  SELECT lot_id,
         COALESCE(SUM(quantity) FILTER (WHERE direction = 'IN'), 0)  AS total_in,
         COALESCE(SUM(quantity) FILTER (WHERE direction = 'OUT'), 0) AS total_out,
         COUNT(*) FILTER (WHERE movement_type = 'APERTURA')            AS aperturas,
         COUNT(*) FILTER (WHERE direction = 'OUT')                    AS out_movements,
         MIN(unit) FILTER (WHERE movement_type = 'APERTURA')          AS unit,
         MAX(created_at)                                             AS last_movement_at
  FROM lot_stock_movements
  GROUP BY lot_id
)
SELECT
  l.id                                   AS lot_id,
  l.company_id,
  l.folio,
  l.harvest_block,
  l.lot_type,
  l.status                               AS lot_status,
  l.quantity                             AS declared_quantity,
  l.quantity_unit                        AS declared_unit,
  COALESCE(s.total_in, 0)                AS total_in,
  COALESCE(s.total_out, 0)               AS total_out,
  COALESCE(s.total_in, 0) - COALESCE(s.total_out, 0) AS available_quantity,
  s.unit                                 AS unit,
  s.last_movement_at,
  CASE
    WHEN s.lot_id IS NULL THEN 'CANTIDAD_NO_DECLARADA'
    WHEN s.aperturas = 0 THEN 'SIN_APERTURA'
    WHEN s.total_out = 0 THEN 'DISPONIBLE'
    WHEN (COALESCE(s.total_in, 0) - COALESCE(s.total_out, 0)) > 0 THEN 'PARCIALMENTE_UTILIZADO'
    ELSE 'AGOTADO'
  END                                    AS availability_status
FROM lots l
LEFT JOIN saldo s ON s.lot_id = l.id;

COMMENT ON VIEW lot_availability IS
  'Disponibilidad real por lote (D-032). security_invoker: respeta el RLS de las tablas. El saldo se calcula EXCLUSIVAMENTE desde lot_stock_movements; lots.quantity no participa. SIN_APERTURA = hay movimientos pero ninguna apertura (estado inconsistente a revisar). CANTIDAD_NO_DECLARADA = el lote no tiene movimientos porque no declaró cantidad ni unidad.';

-- ============================================
-- 8. APERTURA AUTOMÁTICA AL CREAR UN LOTE
-- ============================================
-- Cierra el camino "crear un lote sin saldo inicial registrado": cualquier lote
-- nuevo con cantidad y unidad recibe su APERTURA en el mismo INSERT.

CREATE OR REPLACE FUNCTION lot_register_apertura()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity_unit IS NULL OR btrim(NEW.quantity_unit) = '' THEN
    RETURN NEW;
  END IF;
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad del lote debe ser mayor que cero para registrar su apertura.';
  END IF;
  INSERT INTO lot_stock_movements
    (company_id, lot_id, movement_type, direction, quantity, unit, reason, created_by)
  VALUES
    (NEW.company_id, NEW.id, 'APERTURA', 'IN', NEW.quantity, btrim(NEW.quantity_unit),
     'Apertura por contenido declarado al crear el lote', auth.uid())
  ON CONFLICT (lot_id) WHERE movement_type = 'APERTURA' DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION lot_register_apertura IS
  'Registra la APERTURA de un lote nuevo. Único camino de saldo inicial, para lotes históricos (backfill) y nuevos (trigger). Un lote no puede recibir dos aperturas.';

DROP TRIGGER IF EXISTS trg_lot_apertura ON lots;
CREATE TRIGGER trg_lot_apertura
  AFTER INSERT ON lots
  FOR EACH ROW EXECUTE FUNCTION lot_register_apertura();

-- ============================================
-- 9. PERMISOS: helpers de empresa y rol
-- ============================================

CREATE OR REPLACE FUNCTION qnx_d032_actor_company()
RETURNS UUID AS $$
  SELECT get_current_user_company_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION qnx_d032_can_write(company UUID)
RETURNS BOOLEAN AS $$
  SELECT is_super_admin()
      OR (get_current_user_company_id() = company
          AND get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR', 'SUPER_ADMIN'));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================
-- 10. VALIDACIÓN (sin escribir nada)
-- ============================================

CREATE OR REPLACE FUNCTION validate_lot_transformation(p_transformation_id UUID)
RETURNS TABLE (
  ok BOOLEAN,
  errors TEXT[],
  total_input NUMERIC,
  total_output NUMERIC,
  total_remanent NUMERIC,
  total_loss NUMERIC
) AS $$
DECLARE
  t lot_transformations%ROWTYPE;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_unit VARCHAR(32);
  v_input NUMERIC := 0;
  v_output NUMERIC := 0;
  v_remanent NUMERIC := 0;
  v_loss NUMERIC := 0;
  v_effective_out NUMERIC := 0;
  v_source_remnant NUMERIC := 0;
  r RECORD;
  v_available NUMERIC;
BEGIN
  SELECT * INTO t FROM lot_transformations WHERE id = p_transformation_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ARRAY['La transformación no existe'], 0, 0, 0, 0;
    RETURN;
  END IF;

  -- AISLAMIENTO: la validación nunca cruza empresas.
  IF NOT (is_super_admin() OR t.company_id = get_current_user_company_id()) THEN
    RETURN QUERY SELECT false,
      ARRAY['La transformación no pertenece a su empresa'], 0, 0, 0, 0;
    RETURN;
  END IF;

  v_unit := t.unit;

  IF NOT EXISTS (SELECT 1 FROM lot_transformation_inputs WHERE transformation_id = t.id) THEN
    v_errors := array_append(v_errors, 'Debe registrar al menos un lote fuente.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM lot_transformation_outputs
    WHERE transformation_id = t.id AND output_kind IN ('RESULTADO', 'REMANENTE')
  ) THEN
    v_errors := array_append(v_errors, 'Debe registrar al menos un lote resultante o remanente.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM lot_transformation_outputs
    WHERE transformation_id = t.id AND output_kind IN ('MERMA', 'DESCARTE')
      AND (reason IS NULL OR btrim(reason) = '')
  ) THEN
    v_errors := array_append(v_errors, 'Merma y descarte exigen motivo.');
  END IF;

  -- Entradas: unidad, consumo y remanente
  FOR r IN
    SELECT i.source_lot_id, i.consumed_quantity, i.unit, i.available_quantity,
           i.remnant_handling
    FROM lot_transformation_inputs i
    WHERE i.transformation_id = t.id
  LOOP
    IF r.unit IS NULL OR btrim(r.unit) = '' THEN
      v_errors := array_append(v_errors,
        'El lote fuente ' || r.source_lot_id || ' no declara unidad de consumo.');
    ELSIF upper(btrim(r.unit)) <> upper(btrim(v_unit)) THEN
      v_errors := array_append(v_errors,
        'Unidad incompatible en el lote fuente ' || r.source_lot_id ||
        ': se consume en "' || r.unit || '" y la operación trabaja en "' || v_unit ||
        '". No hay conversión automática.');
    END IF;
    v_input := v_input + r.consumed_quantity;
    v_effective_out := v_effective_out + r.consumed_quantity
      + CASE WHEN r.remnant_handling = 'COMO_LOTE_NUEVO'
             THEN GREATEST(0, r.available_quantity - r.consumed_quantity)
             ELSE 0 END;
    IF r.remnant_handling = 'COMO_LOTE_NUEVO' THEN
      v_source_remnant := v_source_remnant
        + GREATEST(0, r.available_quantity - r.consumed_quantity);
    END IF;
  END LOOP;

  -- Salidas: unidad
  FOR r IN
    SELECT output_kind, result_lot_id, quantity, unit
    FROM lot_transformation_outputs
    WHERE transformation_id = t.id
  LOOP
    IF r.unit IS NULL OR btrim(r.unit) = '' THEN
      v_errors := array_append(v_errors, 'Una salida no declara unidad.');
    ELSIF upper(btrim(r.unit)) <> upper(btrim(v_unit)) THEN
      v_errors := array_append(v_errors,
        'Unidad incompatible en una salida: "' || r.unit || '" vs "' || v_unit || '".');
    END IF;
    v_output := v_output + r.quantity;
    IF r.output_kind = 'REMANENTE' THEN v_remanent := v_remanent + r.quantity; END IF;
    IF r.output_kind IN ('MERMA', 'DESCARTE') THEN v_loss := v_loss + r.quantity; END IF;
  END LOOP;

  -- Balance: lo que sale de las fuentes (consumido + remanente declarado)
  IF v_effective_out <> v_output THEN
    v_errors := array_append(v_errors,
      'El balance no cierra: las fuentes entregan ' || v_effective_out || ' ' || v_unit ||
      ' y se registran ' || v_output || ' ' || v_unit ||
      ' de salida. Diferencia: ' || (v_effective_out - v_output) || '.');
  END IF;

  IF v_source_remnant > 0 AND v_remanent < v_source_remnant THEN
    v_errors := array_append(v_errors,
      'Las fuentes dejan ' || v_source_remnant || ' ' || v_unit ||
      ' de remanente pero solo se declaran ' || v_remanent || ' ' || v_unit ||
      ' como salida de remanente. Registre el remanente como lote nuevo.');
  END IF;

  -- Disponibilidad real, leída del libro. En validación es una foto; la decisión
  -- final la toma confirm_lot_transformation con los lotes bloqueados.
  FOR r IN
    SELECT i.source_lot_id, i.consumed_quantity,
           COALESCE((SELECT SUM(quantity) FROM lot_stock_movements
                     WHERE lot_id = i.source_lot_id AND direction = 'IN'), 0)
         - COALESCE((SELECT SUM(quantity) FROM lot_stock_movements
                     WHERE lot_id = i.source_lot_id AND direction = 'OUT'), 0)
             AS disponible
    FROM lot_transformation_inputs i
    WHERE i.transformation_id = t.id
  LOOP
    IF r.consumed_quantity > r.disponible THEN
      v_errors := array_append(v_errors,
        'El lote fuente ' || r.source_lot_id || ' no tiene existencias suficientes: se intenta consumir ' ||
        r.consumed_quantity || ' y el libro registra ' || r.disponible || ' disponible.');
    END IF;
  END LOOP;

  FOR r IN
    SELECT i.source_lot_id, i.available_quantity, i.consumed_quantity, i.unit
    FROM lot_transformation_inputs i
    WHERE i.transformation_id = t.id
      AND i.remnant_handling = 'SIN_REMANENTE'
  LOOP
    IF (r.available_quantity - r.consumed_quantity) > 0 THEN
      v_errors := array_append(v_errors,
        'Del lote fuente ' || r.source_lot_id || ' quedan ' ||
        (r.available_quantity - r.consumed_quantity) || ' ' || r.unit ||
        ' y se declaró SIN_REMANENTE. Registre el remanente como lote nuevo.');
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    (COALESCE(array_length(v_errors, 1), 0) = 0),
    v_errors, v_input, v_output, v_remanent, v_loss;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION validate_lot_transformation IS
  'Valida sin escribir (D-032). Aisla por empresa, fija search_path y devuelve errores legibles.';

-- ============================================
-- 11. CONFIRMACIÓN ATÓMICA, AISLADA Y CON BLOQUEO DE ORIGEN
-- ============================================

CREATE OR REPLACE FUNCTION confirm_lot_transformation(p_transformation_id UUID)
RETURNS JSONB AS $$
DECLARE
  t lot_transformations%ROWTYPE;
  v_check RECORD;
  v_actor UUID;
  v_actor_company UUID;
  r RECORD;
  v_locked_lot UUID;
  v_generated INTEGER := 0;
BEGIN
  v_actor := auth.uid();
  v_actor_company := get_current_user_company_id();

  -- 1) Aislamiento y permiso, ANTES de leer nada de negocio.
  SELECT * INTO t FROM lot_transformations WHERE id = p_transformation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'D032_NOT_FOUND: la transformación no existe.';
  END IF;
  IF NOT (is_super_admin() OR t.company_id = v_actor_company) THEN
    RAISE EXCEPTION 'D032_FORBIDDEN: la transformación pertenece a otra empresa.';
  END IF;
  IF NOT qnx_d032_can_write(t.company_id) THEN
    RAISE EXCEPTION 'D032_FORBIDDEN: su rol no puede confirmar transformaciones.';
  END IF;
  IF t.status <> 'BORRADOR' THEN
    RAISE EXCEPTION 'D032_NOT_DRAFT: la transformación está en estado % y no se modifica.', t.status;
  END IF;

  -- 2) Bloqueo de los lotes fuente en ORDEN ESTABLE (por UUID) para evitar
  --    deadlocks entre operaciones concurrentes que compartan fuentes.
  FOR r IN
    SELECT i.source_lot_id
    FROM lot_transformation_inputs i
    WHERE i.transformation_id = t.id
    ORDER BY i.source_lot_id
  LOOP
    v_locked_lot := r.source_lot_id;
    PERFORM 1 FROM lots WHERE id = v_locked_lot FOR UPDATE;
  END LOOP;

  -- 3) Validación completa con los lotes ya bloqueados: ninguna otra
  --    confirmación puede escribir movimientos sobre ellos mientras dure esto.
  SELECT * INTO v_check FROM validate_lot_transformation(p_transformation_id);
  IF NOT v_check.ok THEN
    RAISE EXCEPTION 'D032_INVALID: %', array_to_string(v_check.errors, ' | ');
  END IF;

  -- 4) Genealogía: SOLO se crea. Nunca se reescribe una relación existente.
  FOR r IN
    SELECT i.source_lot_id, o.result_lot_id, i.consumed_quantity, i.unit
    FROM lot_transformation_inputs i
    JOIN lot_transformation_outputs o ON o.transformation_id = i.transformation_id
    WHERE i.transformation_id = t.id
      AND o.output_kind IN ('RESULTADO', 'REMANENTE')
      AND o.result_lot_id IS NOT NULL
  LOOP
    IF EXISTS (
      SELECT 1 FROM lot_genealogy g
      WHERE g.source_lot_id = r.source_lot_id
        AND g.derived_lot_id = r.result_lot_id
    ) THEN
      RAISE EXCEPTION
        'D032_GENEALOGY_CONFLICT: ya existe una relación de genealogía entre el lote fuente % y el resultante %. No se reescribe historia: ajuste la operación o anúlela.',
        r.source_lot_id, r.result_lot_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM lot_genealogy g
      WHERE g.source_lot_id = r.source_lot_id
        AND g.relation_type <> t.transformation_type
    ) THEN
      RAISE EXCEPTION
        'D032_GENEALOGY_INCOMPATIBLE: el lote fuente % ya tiene genealogía de tipo distinto al de esta operación.',
        r.source_lot_id;
    END IF;
  END LOOP;

  -- 5) Consumos. La APERTURA de los lotes resultantes ya existe: la crea el
  --    trigger al crearse el lote, y es única por lote.
  FOR r IN
    SELECT i.source_lot_id, i.consumed_quantity, i.unit
    FROM lot_transformation_inputs i
    WHERE i.transformation_id = t.id
  LOOP
    INSERT INTO lot_stock_movements
      (company_id, lot_id, movement_type, direction, quantity, unit, reason,
       transformation_id, source_lot_id, created_by)
    VALUES
      (t.company_id, r.source_lot_id, 'CONSUMO', 'OUT', r.consumed_quantity, r.unit,
       'Consumido por ' || t.transformation_type || ' ' || t.id,
       t.id, r.source_lot_id, v_actor);
    v_generated := v_generated + 1;
  END LOOP;

  -- 6) Genealogía, una sola vez y solo si no existe.
  FOR r IN
    SELECT i.source_lot_id, o.result_lot_id, i.consumed_quantity, i.unit
    FROM lot_transformation_inputs i
    JOIN lot_transformation_outputs o ON o.transformation_id = i.transformation_id
    WHERE i.transformation_id = t.id
      AND o.output_kind IN ('RESULTADO', 'REMANENTE')
      AND o.result_lot_id IS NOT NULL
  LOOP
    INSERT INTO lot_genealogy
      (company_id, source_lot_id, derived_lot_id, relation_type, quantity, unit)
    VALUES
      (t.company_id, r.source_lot_id, r.result_lot_id, t.transformation_type,
       r.consumed_quantity, r.unit);
    v_generated := v_generated + 1;
  END LOOP;

  -- 7) Confirmar
  UPDATE lot_transformations
  SET status = 'CONFIRMADA', confirmed_at = now(), confirmed_by = v_actor
  WHERE id = t.id;

  RETURN jsonb_build_object(
    'ok', true,
    'transformation_id', t.id,
    'total_input', v_check.total_input,
    'total_output', v_check.total_output,
    'total_remanent', v_check.total_remanent,
    'total_loss', v_check.total_loss,
    'unit', t.unit,
    'escritos', v_generated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION confirm_lot_transformation IS
  'Confirma de forma atómica, aislada por empresa y sin sobreconsumo: valida empresa y rol, bloquea los lotes fuente en orden estable, revalida, y escribe consumos y genealogía sin reescribir historia. Cualquier error revierte todo.';

-- ============================================
-- 12. ANULACIÓN CON COMPENSACIÓN (append-only)
-- ============================================
-- No borra movimientos. Devuelve el consumo a la fuente y descuenta la apertura
-- del resultado, salvo que ese resultado ya esté comprometido.

CREATE OR REPLACE FUNCTION annul_lot_transformation(
  p_transformation_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  t lot_transformations%ROWTYPE;
  v_actor UUID;
  v_actor_company UUID;
  v_comp INTEGER := 0;
  v_locked_lot UUID;
  v_saldo NUMERIC;
  v_apertura NUMERIC;
  r RECORD;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'D032_REASON: la anulación exige motivo.';
  END IF;

  v_actor := auth.uid();
  v_actor_company := get_current_user_company_id();

  SELECT * INTO t FROM lot_transformations WHERE id = p_transformation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'D032_NOT_FOUND: la transformación no existe.';
  END IF;
  IF NOT (is_super_admin() OR t.company_id = v_actor_company) THEN
    RAISE EXCEPTION 'D032_FORBIDDEN: la transformación pertenece a otra empresa.';
  END IF;
  IF NOT qnx_d032_can_write(t.company_id) THEN
    RAISE EXCEPTION 'D032_FORBIDDEN: su rol no puede anular transformaciones.';
  END IF;
  IF t.status = 'ANULADA' THEN
    RAISE EXCEPTION 'D032_ALREADY_ANNULLED: la transformación ya está anulada.';
  END IF;
  IF t.status = 'BORRADOR' THEN
    -- Un borrador no movementsó nada: se anula sin compensación.
    UPDATE lot_transformations
    SET status = 'ANULADA', annulled_at = now(), annulled_by = v_actor,
        annul_reason = p_reason, annul_compensated_at = now()
    WHERE id = t.id;
    RETURN jsonb_build_object('ok', true, 'compensated', 0, 'status', 'ANULADA');
  END IF;

  -- Bloqueo en orden estable: primero las fuentes, luego los resultados,
  -- todos en un único orden global por UUID para evitar deadlocks.
  FOR r IN
    SELECT lot_id FROM (
      SELECT i.source_lot_id AS lot_id
      FROM lot_transformation_inputs i WHERE i.transformation_id = t.id
      UNION
      SELECT o.result_lot_id AS lot_id
      FROM lot_transformation_outputs o
      WHERE o.transformation_id = t.id
        AND o.output_kind IN ('RESULTADO', 'REMANENTE')
        AND o.result_lot_id IS NOT NULL
    ) x ORDER BY lot_id
  LOOP
    v_locked_lot := r.lot_id;
    PERFORM 1 FROM lots WHERE id = v_locked_lot FOR UPDATE;
  END LOOP;

  -- 1) Los resultados no pueden estar comprometidos en otra transformación.
  FOR r IN
    SELECT o.result_lot_id
    FROM lot_transformation_outputs o
    WHERE o.transformation_id = t.id
      AND o.output_kind IN ('RESULTADO', 'REMANENTE')
      AND o.result_lot_id IS NOT NULL
  LOOP
    IF EXISTS (
      SELECT 1 FROM lot_transformation_inputs i
      JOIN lot_transformations t2 ON t2.id = i.transformation_id
      WHERE i.source_lot_id = r.result_lot_id AND t2.status = 'CONFIRMADA'
    ) THEN
      RAISE EXCEPTION
        'D032_CHAINED_OUTPUT: el lote resultante % ya fue consumido por otra transformación confirmada. No hay reversión en cascada: gestione la cadena manualmente.',
        r.result_lot_id;
    END IF;
    -- 2) Saldo del resultado: no puede quedar negativo.
    SELECT COALESCE(SUM(quantity) FILTER (WHERE direction = 'IN'), 0)
         - COALESCE(SUM(quantity) FILTER (WHERE direction = 'OUT'), 0)
      INTO v_saldo
    FROM lot_stock_movements WHERE lot_id = r.result_lot_id;
    SELECT COALESCE(SUM(quantity), 0) INTO v_apertura
    FROM lot_stock_movements
    WHERE lot_id = r.result_lot_id AND movement_type = 'APERTURA';
    IF v_saldo < v_apertura THEN
      RAISE EXCEPTION
        'D032_OUTPUT_COMMITTED: el lote resultante % tiene saldo % menor que su apertura %: ya fue usado parcialmente. No se puede anular.',
        r.result_lot_id, v_saldo, v_apertura;
    END IF;
  END LOOP;

  -- 3) Devolver el consumo a cada fuente.
  FOR r IN
    SELECT m.lot_id, m.quantity, m.unit
    FROM lot_stock_movements m
    WHERE m.transformation_id = t.id AND m.movement_type = 'CONSUMO'
    ORDER BY m.lot_id
  LOOP
    INSERT INTO lot_stock_movements
      (company_id, lot_id, movement_type, direction, quantity, unit, reason,
       transformation_id, source_lot_id, reverses_transformation_id, created_by)
    VALUES
      (t.company_id, r.lot_id, 'AJUSTE_POSITIVO', 'IN', r.quantity, r.unit,
       'Compensación por anulación de ' || t.id, t.id, r.lot_id, t.id, v_actor);
    v_comp := v_comp + 1;
  END LOOP;

  -- 4) Descontar la apertura de cada resultado.
  FOR r IN
    SELECT o.result_lot_id, o.quantity, o.unit
    FROM lot_transformation_outputs o
    WHERE o.transformation_id = t.id
      AND o.output_kind IN ('RESULTADO', 'REMANENTE')
      AND o.result_lot_id IS NOT NULL
    ORDER BY o.result_lot_id
  LOOP
    INSERT INTO lot_stock_movements
      (company_id, lot_id, movement_type, direction, quantity, unit, reason,
       transformation_id, reverses_transformation_id, created_by)
    VALUES
      (t.company_id, r.result_lot_id, 'AJUSTE_NEGATIVO', 'OUT', r.quantity, r.unit,
       'Reversión de apertura por anulación de ' || t.id, t.id, t.id, v_actor);
    v_comp := v_comp + 1;
  END LOOP;

  -- 5) Marcar anulada. Los movimientos originales, las entradas, las salidas y
  --    la genealogía permanecen: nada se borra.
  UPDATE lot_transformations
  SET status = 'ANULADA', annulled_at = now(), annulled_by = v_actor,
      annul_reason = p_reason, annul_compensated_at = now()
  WHERE id = t.id;

  RETURN jsonb_build_object(
    'ok', true, 'compensated', v_comp, 'status', 'ANULADA',
    'nota', 'Los movimientos y la genealogía originales se conservan; la compensación los compensa, no los borra.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION annul_lot_transformation IS
  'Anula una transformación con compensación (D-032). No borra historia: devuelve consumos a las fuentes y revierte la apertura de los resultados. Rechaza si un resultado ya está comprometido en otra cadena. Idempotente por estado: una anulación repetida falla con D032_ALREADY_ANNULLED.';

-- ============================================
-- 13. GUARDIA DE TRANSICIONES DE ESTADO
-- ============================================

CREATE OR REPLACE FUNCTION lot_transformations_transition_guard()
RETURNS TRIGGER AS $$
DECLARE
  v_msg TEXT;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  v_msg := CASE
    WHEN OLD.status = 'BORRADOR' AND NEW.status IN ('CONFIRMADA', 'ANULADA') THEN NULL
    WHEN OLD.status = 'CONFIRMADA' AND NEW.status = 'ANULADA' THEN NULL
    ELSE 'Transición no permitida: ' || OLD.status || ' -> ' || NEW.status
  END;
  IF v_msg IS NOT NULL THEN
    RAISE EXCEPTION 'D032_BAD_TRANSITION: %', v_msg;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_lot_transformations_transition ON lot_transformations;
CREATE TRIGGER trg_lot_transformations_transition
  BEFORE UPDATE ON lot_transformations
  FOR EACH ROW EXECUTE FUNCTION lot_transformations_transition_guard();

-- ============================================
-- 14. UNIDADES OBLIGATORIAS EN ENTRADAS Y SALIDAS
-- ============================================

CREATE OR REPLACE FUNCTION lot_transform_check_unit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit IS NULL OR btrim(NEW.unit) = '' THEN
    RAISE EXCEPTION 'D032_UNIT: debe declarar la unidad.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_lot_transformation_inputs_unit ON lot_transformation_inputs;
CREATE TRIGGER trg_lot_transformation_inputs_unit
  BEFORE INSERT OR UPDATE ON lot_transformation_inputs
  FOR EACH ROW EXECUTE FUNCTION lot_transform_check_unit();

DROP TRIGGER IF EXISTS trg_lot_transformation_outputs_unit ON lot_transformation_outputs;
CREATE TRIGGER trg_lot_transformation_outputs_unit
  BEFORE INSERT OR UPDATE ON lot_transformation_outputs
  FOR EACH ROW EXECUTE FUNCTION lot_transform_check_unit();

-- ============================================
-- 15. RLS
-- ============================================

ALTER TABLE lot_transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_transformation_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_transformation_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_dispositions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot_transformations_select_company" ON lot_transformations;
CREATE POLICY "lot_transformations_select_company" ON lot_transformations
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "lot_transformations_insert_operator" ON lot_transformations;
CREATE POLICY "lot_transformations_insert_operator" ON lot_transformations
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR', 'SUPER_ADMIN')
        AND company_id = get_current_user_company_id())
  );

DROP POLICY IF EXISTS "lot_transformations_update_admin" ON lot_transformations;
CREATE POLICY "lot_transformations_update_admin" ON lot_transformations
  FOR UPDATE USING (
    is_super_admin()
    OR (get_current_user_role() IN ('COMPANY_ADMIN', 'SUPER_ADMIN')
        AND company_id = get_current_user_company_id())
  );

DROP POLICY IF EXISTS "lot_transformation_inputs_select_company" ON lot_transformation_inputs;
CREATE POLICY "lot_transformation_inputs_select_company" ON lot_transformation_inputs
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "lot_transformation_inputs_insert_operator" ON lot_transformation_inputs;
CREATE POLICY "lot_transformation_inputs_insert_operator" ON lot_transformation_inputs
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR', 'SUPER_ADMIN')
        AND company_id = get_current_user_company_id())
  );

DROP POLICY IF EXISTS "lot_transformation_outputs_select_company" ON lot_transformation_outputs;
CREATE POLICY "lot_transformation_outputs_select_company" ON lot_transformation_outputs
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "lot_transformation_outputs_insert_operator" ON lot_transformation_outputs;
CREATE POLICY "lot_transformation_outputs_insert_operator" ON lot_transformation_outputs
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR', 'SUPER_ADMIN')
        AND company_id = get_current_user_company_id())
  );

DROP POLICY IF EXISTS "lot_stock_movements_select_company" ON lot_stock_movements;
CREATE POLICY "lot_stock_movements_select_company" ON lot_stock_movements
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

-- El libro NO tiene política de escritura: solo lo escriben las funciones
-- SECURITY DEFINER ya validadas (apertura, confirmación y compensación).
-- Así nadie puede fabricar consumos desde el cliente.

DROP POLICY IF EXISTS "lot_dispositions_select_company" ON lot_dispositions;
CREATE POLICY "lot_dispositions_select_company" ON lot_dispositions
  FOR SELECT USING (is_super_admin() OR company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "lot_dispositions_insert_operator" ON lot_dispositions;
CREATE POLICY "lot_dispositions_insert_operator" ON lot_dispositions
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR', 'SUPER_ADMIN')
        AND company_id = get_current_user_company_id())
  );

-- ============================================
-- 16. GRANTS
-- ============================================
-- El libro de movimientos es de solo lectura para el cliente. Las tablas de
-- transformación y disposición se leen y escriben dentro de la propia empresa.

REVOKE ALL ON lot_stock_movements FROM anon;
REVOKE ALL ON lot_stock_movements FROM authenticated;
GRANT SELECT ON lot_stock_movements TO authenticated;

REVOKE ALL ON lot_availability FROM anon;
GRANT SELECT ON lot_availability TO authenticated;

REVOKE ALL ON lot_transformations FROM anon;
REVOKE ALL ON lot_transformation_inputs FROM anon;
REVOKE ALL ON lot_transformation_outputs FROM anon;
REVOKE ALL ON lot_dispositions FROM anon;

GRANT SELECT, INSERT, UPDATE ON lot_transformations TO authenticated;
GRANT SELECT, INSERT ON lot_transformation_inputs TO authenticated;
GRANT SELECT, INSERT ON lot_transformation_outputs TO authenticated;
GRANT SELECT, INSERT ON lot_dispositions TO authenticated;

-- Las funciones no se ejecutan desde el navegador: las invocan los servicios
-- autorizados, nunca el cliente. Se revoca a PUBLIC y a los roles de cliente.
REVOKE ALL ON FUNCTION validate_lot_transformation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION confirm_lot_transformation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION annul_lot_transformation(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION lot_register_apertura() FROM PUBLIC;
REVOKE ALL ON FUNCTION qnx_d032_actor_company() FROM PUBLIC;
REVOKE ALL ON FUNCTION qnx_d032_can_write(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_lot_transformation(UUID) FROM anon, authenticated;
REVOKE ALL ON FUNCTION confirm_lot_transformation(UUID) FROM anon, authenticated;
REVOKE ALL ON FUNCTION annul_lot_transformation(UUID, TEXT) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION validate_lot_transformation(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION confirm_lot_transformation(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION annul_lot_transformation(UUID, TEXT) TO service_role;

-- ============================================
-- 17. AUDITORÍA
-- ============================================

DROP TRIGGER IF EXISTS audit_lot_transformations ON lot_transformations;
CREATE TRIGGER audit_lot_transformations
  AFTER INSERT OR UPDATE OR DELETE ON lot_transformations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_lot_transformation_inputs ON lot_transformation_inputs;
CREATE TRIGGER audit_lot_transformation_inputs
  AFTER INSERT OR UPDATE OR DELETE ON lot_transformation_inputs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_lot_transformation_outputs ON lot_transformation_outputs;
CREATE TRIGGER audit_lot_transformation_outputs
  AFTER INSERT OR UPDATE OR DELETE ON lot_transformation_outputs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_lot_stock_movements ON lot_stock_movements;
CREATE TRIGGER audit_lot_stock_movements
  AFTER INSERT OR UPDATE OR DELETE ON lot_stock_movements
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_lot_dispositions ON lot_dispositions;
CREATE TRIGGER audit_lot_dispositions
  AFTER INSERT OR UPDATE OR DELETE ON lot_dispositions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- 18. BACKFILL DE APERTURAS (idempotente)
-- ============================================
-- Un solo camino de saldo inicial: el mismo índice único parcial que usa el
-- trigger impide una segunda apertura, aunque source_lot_id sea NULL.

INSERT INTO lot_stock_movements
  (company_id, lot_id, movement_type, direction, quantity, unit, reason)
SELECT l.company_id, l.id, 'APERTURA', 'IN', l.quantity, btrim(l.quantity_unit),
       'Apertura por contenido declarado (backfill D-032)'
FROM lots l
WHERE l.quantity IS NOT NULL
  AND l.quantity > 0
  AND l.quantity_unit IS NOT NULL
  AND btrim(l.quantity_unit) <> ''
ON CONFLICT (lot_id) WHERE movement_type = 'APERTURA' DO NOTHING;