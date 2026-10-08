-- ============================================================================
-- QUALITYNX — D-032 follow-up: regla de unidad en el alta de lotes
-- ============================================================================
-- Contexto
--   La migración 20261005000001 agregó lots.quantity_unit y el trigger
--   lot_register_apertura(), pero:
--     - el trigger NO rechazaba quantity informada sin unidad (RETURN temprano);
--     - sólo cubría INSERT, no UPDATE;
--     - los 357 lotes históricos quedaron con quantity > 0 y unidad NULL.
--
-- Reglas que este archivo fija
--   1. quantity informada exige quantity_unit, en INSERT y en UPDATE.
--      NOT VALID: no revalida los 357 lotes históricos.
--   2. La cantidad de un lote que ya tiene APERTURA no se modifica por UPDATE;
--      los cambios posteriores van por movimientos/transformaciones.
--   3. qnx_d032_can_write deja de abrirse en silencio cuando no hay actor.
--   4. Las funciones de transformación se pueden invocar como 'authenticated',
--      para que auth.uid() resuelva el actor real y las guardas sean efectivas.
--
-- Idempotente. Sin operaciones destructivas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. CHECK: cantidad informada exige unidad declarada (NOT VALID)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lots_cantidad_exige_unidad'
      AND conrelid = 'public.lots'::regclass
  ) THEN
    ALTER TABLE lots
      ADD CONSTRAINT lots_cantidad_exige_unidad
      CHECK (
        quantity IS NULL
        OR (quantity_unit IS NOT NULL AND btrim(quantity_unit) <> '')
      ) NOT VALID;
  END IF;
END;
$$;

COMMENT ON CONSTRAINT lots_cantidad_exige_unidad ON lots IS
  'D-032: si se informa cantidad, la unidad es obligatoria. NOT VALID: los lotes históricos sin unidad no se revalidan.';

-- ---------------------------------------------------------------------------
-- 1b. Identidad: auth.uid() NO es users.id
--     Las columnas *__by referencian users(id), pero auth.uid() devuelve el
--     id de auth.users. Sin traducir, cualquier alta o confirmación launched
--     desde la UI moría con FK 23503.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION get_current_user_id() IS
  'Devuelve users.id del usuario autenticado (traduce auth.uid() al id de la tabla users).';

-- Traduce created_by en el libro de movimientos para cualquiervia de escritura
-- (trigger de apertura, confirmacion y anulacion).
CREATE OR REPLACE FUNCTION lot_stock_movements_actor_normalizado()
RETURNS TRIGGER AS $$
DECLARE v_uid UUID := auth.uid(); v_actor UUID;
BEGIN
  IF v_uid IS NOT NULL AND NEW.created_by = v_uid THEN
    SELECT id INTO v_actor FROM users WHERE auth_id = v_uid AND is_active = true;
    IF v_actor IS NOT NULL THEN
      NEW.created_by := v_actor;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_lot_stock_movements_actor ON lot_stock_movements;
CREATE TRIGGER trg_lot_stock_movements_actor
  BEFORE INSERT ON lot_stock_movements
  FOR EACH ROW EXECUTE FUNCTION lot_stock_movements_actor_normalizado();

-- ---------------------------------------------------------------------------
-- 2. La cantidad de un lote con APERTURA no se edita por UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lot_quantity_con_apertura_bloqueado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity IS DISTINCT FROM OLD.quantity
     AND EXISTS (
       SELECT 1 FROM lot_stock_movements m
       WHERE m.lot_id = OLD.id AND m.movement_type = 'APERTURA'
     ) THEN
    RAISE EXCEPTION
      'D032_QUANTITY_LOCKED: el lote % ya tiene apertura registrada; su cantidad solo cambia por movimientos o transformaciones.',
      OLD.folio;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION lot_quantity_con_apertura_bloqueado() IS
  'D-032: impide editar directamente la cantidad de un lote que ya tiene APERTURA.';

DROP TRIGGER IF EXISTS trg_lot_quantity_bloqueado ON lots;
CREATE TRIGGER trg_lot_quantity_bloqueado
  BEFORE UPDATE OF quantity ON lots
  FOR EACH ROW EXECUTE FUNCTION lot_quantity_con_apertura_bloqueado();

-- ---------------------------------------------------------------------------
-- 3. Guardas fail-closed: sin actor no hay permiso (antes devolvía NULL)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION qnx_d032_can_write(company UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    auth.uid() IS NOT NULL
    AND (
      is_super_admin()
      OR (
        get_current_user_company_id() = company
        AND get_current_user_role() IN ('COMPANY_ADMIN', 'INSPECTOR', 'SUPER_ADMIN')
      )
    ),
    false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION qnx_d032_can_write(UUID) IS
  'D-032: permiso de escritura por empresa y rol. Fail-closed: sin actor devuelve false.';

-- ---------------------------------------------------------------------------
-- 3b. Actor obligatorio con mensaje claro
--     Con service_role, auth.uid() es NULL y el CHECK 23514 saltaba sin
--     explicar la causa. Este trigger dice exactamente qué falta.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lot_transformations_actor_obligatorio()
RETURNS TRIGGER AS $$
DECLARE v_uid UUID := auth.uid(); v_actor UUID;
BEGIN
  -- Traduce auth.uid() a users.id en los campos que referencian users(id).
  IF v_uid IS NOT NULL THEN
    SELECT id INTO v_actor FROM users WHERE auth_id = v_uid AND is_active = true;
  END IF;
  IF NEW.created_by   = v_uid THEN NEW.created_by   := v_actor; END IF;
  IF NEW.confirmed_by = v_uid THEN NEW.confirmed_by := v_actor; END IF;
  IF NEW.annulled_by  = v_uid THEN NEW.annulled_by  := v_actor; END IF;

  IF NEW.status = 'CONFIRMADA' AND NEW.confirmed_by IS NULL THEN
    RAISE EXCEPTION
      'D032_NO_ACTOR: no se identificó al usuario autenticado en la tabla users. '
      'La transformación debe confirmarse por la aplicación como usuario autenticado.';
  END IF;
  IF NEW.status = 'ANULADA' AND NEW.annulled_by IS NULL THEN
    RAISE EXCEPTION
      'D032_NO_ACTOR: no se identificó al usuario autenticado en la tabla users. '
      'La anulación exige un usuario autenticado.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_lot_transformations_actor ON lot_transformations;
CREATE TRIGGER trg_lot_transformations_actor
  BEFORE UPDATE ON lot_transformations
  FOR EACH ROW EXECUTE FUNCTION lot_transformations_actor_obligatorio();

-- ---------------------------------------------------------------------------
-- 4. Las funciones se invocan como 'authenticated' (el actor es auth.uid())
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION validate_lot_transformation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_lot_transformation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION annul_lot_transformation(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION validate_lot_transformation(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION confirm_lot_transformation(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION annul_lot_transformation(UUID, TEXT) FROM anon;

-- ---------------------------------------------------------------------------
-- 5. Trigger de apertura con el actor correcto
--     El de 20261005000001 escribía created_by = auth.uid(), que no existe en
--     users(id): cualquier alta de lote con cantidad fallaba con FK 23503.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lot_register_apertura()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity_unit IS NULL OR btrim(NEW.quantity_unit) = '' THEN
    RETURN NEW;
  END IF;
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION
      'D032_QUANTITY_INVALID: la cantidad del lote debe ser mayor que cero para registrar su apertura.';
  END IF;
  INSERT INTO lot_stock_movements
    (company_id, lot_id, movement_type, direction, quantity, unit, reason, created_by)
  VALUES
    (NEW.company_id, NEW.id, 'APERTURA', 'IN', NEW.quantity, btrim(NEW.quantity_unit),
     'Apertura por contenido declarado al crear el lote', get_current_user_id())
  ON CONFLICT (lot_id) WHERE movement_type = 'APERTURA' DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION lot_register_apertura() IS
  'D-032: registra la APERTURA del lote cuando se declara cantidad y unidad. El actor es users.id.';

DROP TRIGGER IF EXISTS trg_lot_apertura ON lots;
CREATE TRIGGER trg_lot_apertura
  AFTER INSERT ON lots
  FOR EACH ROW EXECUTE FUNCTION lot_register_apertura();