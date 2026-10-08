-- QualityNX TRACEABILITY — Etapa 07
-- Fuente: docs/07_TRACEABILITY.md §13, §17
-- NO crea traceability_events (capa semántica sobre audit_logs + tablas de dominio).
-- Endurece inmutabilidad del historial: bloquea UPDATE/DELETE en capas de historia.
-- RLS ya impide UPDATE/DELETE a clientes API; estos triggers cubren también
-- service role / acceso directo para no permitir reescribir el pasado.

-- ============================================
-- AUDIT_LOGS — append-only
-- ============================================

CREATE OR REPLACE FUNCTION audit_logs_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs es inmutable; el historial no puede modificarse ni eliminarse';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();

COMMENT ON FUNCTION audit_logs_block_mutation() IS
  '07 TRACEABILITY: audit_logs es solo lectura (append-only).';

-- ============================================
-- LOT_STAGE_EVENTS — recorrido histórico append-only
-- (RLS ya sin UPDATE/DELETE; trigger refuerza service role)
-- ============================================

CREATE OR REPLACE FUNCTION lot_stage_events_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'lot_stage_events es inmutable; el recorrido del lote no se reescribe';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lot_stage_events_immutable ON lot_stage_events;
CREATE TRIGGER lot_stage_events_immutable
  BEFORE UPDATE OR DELETE ON lot_stage_events
  FOR EACH ROW EXECUTE FUNCTION lot_stage_events_block_mutation();

-- ============================================
-- QUALITY_EVALUATIONS — append-only (05 / D-023)
-- ============================================

CREATE OR REPLACE FUNCTION quality_evaluations_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'quality_evaluations es append-only; no se modifica ni elimina historial de evaluación';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS quality_evaluations_immutable ON quality_evaluations;
CREATE TRIGGER quality_evaluations_immutable
  BEFORE UPDATE OR DELETE ON quality_evaluations
  FOR EACH ROW EXECUTE FUNCTION quality_evaluations_block_mutation();

-- ============================================
-- VERIFICACIÓN IDEMPOTENTE
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_logs_immutable'
  ) THEN
    RAISE EXCEPTION 'Fallo al crear trigger audit_logs_immutable';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'lot_stage_events_immutable'
  ) THEN
    RAISE EXCEPTION 'Fallo al crear trigger lot_stage_events_immutable';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'quality_evaluations_immutable'
  ) THEN
    RAISE EXCEPTION 'Fallo al crear trigger quality_evaluations_immutable';
  END IF;
END $$;
