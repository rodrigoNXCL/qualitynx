-- ============================================================================
-- 09 — OFFLINE · BITÁCORA TRANSACCIONAL DE OPERACIONES (sync_operations)
-- ----------------------------------------------------------------------------
-- Garantías
--   A. Atomicidad: efecto de negocio y registro se confirman en la MISMA
--      transacción (una sola llamada a sync_apply_operation).
--   B. Idempotencia concurrente: la identidad se RESERVA ANTES del efecto con un
--      INSERT que bloquea sobre el índice único. Dos peticiones simultáneas con
--      el mismo client_operation_id producen exactamente un efecto.
--   C. Reintento limpio: si el primero hace rollback, la reserva desaparece con
--      él y otro intento puede ejecutar correctamente.
--   D. Sin estado parcial: si el proceso muere, PostgreSQL revierte todo.
--   E. Reenvío posterior: devuelve exactamente el resultado original.
--
-- Por qué una función SECURITY DEFINER
--   lot_stock_movements es la única tabla del modelo cuya integridad depende de
--   que varias escrituras ocurran juntas, y no tiene política de escritura: solo
--   la escriben funciones SECURITY DEFINER. confirm_lot_transformation lo
--   resuelve en una única invocación. Offline necesita lo mismo, porque el
--   cliente no puede declarar una inspección y sus mediciones en transacciones
--   separadas. qnx_d032_can_write no es reutilizable aquí: depende de
--   auth.uid(), que es NULL cuando la invoca service_role.
--
-- Identidad
--   El cliente NUNCA envía company_id ni user_id. Envía p_actor_auth_id y la
--   función resuelve id de perfil, empresa y rol desde users.
--
-- No modifica ninguna tabla existente. No altera D-032 a D-035.
-- ============================================================================

-- ============================================
-- 1. TIPOS
-- ============================================
CREATE TYPE sync_operation_type AS ENUM (
  'INSPECTION_CREATE','INSPECTION_OBSERVATION','INSPECTION_SAMPLING',
  'SAMPLE_CREATE','MEASUREMENT_UPSERT','EVIDENCE_ATTACH',
  'DECISION_CREATE','INSPECTION_COMPLETE'
);

COMMENT ON TYPE sync_operation_type IS
  'Operaciones habilitadas offline por la auditoría de 09. Alta de lotes, transformaciones, anulaciones y disposiciones NO se sincronizan: permanecen online.';

CREATE TYPE sync_operation_status AS ENUM (
  'EN_PROCESO',   -- reserva transitoria: NUNCA se confirma en este estado
  'APLICADA',
  'ERROR',
  'CONFLICTO'
);

COMMENT ON TYPE sync_operation_status IS
  'EN_PROCESO es la reserva que serializa peticiones concurrentes. Solo existe dentro de la transacción que la escribe: toda ruta de COMMIT pasa antes por la actualización al estado terminal, por lo que ninguna fila confirmada queda EN_PROCESO.';


-- ============================================
-- 2. TABLA
-- ============================================
CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_operation_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  operation_type sync_operation_type NOT NULL,
  status sync_operation_status NOT NULL,
  entity_type VARCHAR(64),
  entity_id UUID,
  payload JSONB NOT NULL,
  result JSONB,
  error_code TEXT,
  error_detail TEXT,
  batch_seq INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sync_operations_client_operation_unique UNIQUE (client_operation_id),
  CONSTRAINT sync_operations_payload_is_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT sync_operations_batch_seq_non_negative CHECK (batch_seq >= 0)
);

COMMENT ON TABLE sync_operations IS
  'Bitácora transaccional de operaciones capturadas offline. La reserva se escribe antes del efecto y en la misma transacción: efecto y resultado se confirman juntos, y la identidad serializa reintentos concurrentes.';


-- ============================================
-- 3. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sync_operations_company_created
  ON sync_operations (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_operations_status
  ON sync_operations (company_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_operations_entity
  ON sync_operations (entity_type, entity_id) WHERE entity_id IS NOT NULL;


-- ============================================
-- 4. updated_at
-- ============================================
DROP TRIGGER IF EXISTS trg_sync_operations_updated_at ON sync_operations;
CREATE TRIGGER trg_sync_operations_updated_at
  BEFORE UPDATE ON sync_operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 5. RLS Y PERMISOS DE TABLA
--    El cliente lee las suyas. No hay política de escritura: con RLS activo y
--    sin INSERT/UPDATE/DELETE policy, el rol authenticated no tiene camino para
--    falsear status, result ni error_code.
-- ============================================
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync_operations_select_company" ON sync_operations;
CREATE POLICY "sync_operations_select_company" ON sync_operations
  FOR SELECT USING (
    is_super_admin() OR company_id = get_current_user_company_id()
  );

REVOKE ALL ON sync_operations FROM anon;
REVOKE ALL ON sync_operations FROM authenticated;
GRANT SELECT ON sync_operations TO authenticated;
GRANT ALL ON sync_operations TO service_role;


-- ============================================
-- 6. IDENTIDAD DEL ACTOR
-- ============================================
CREATE OR REPLACE FUNCTION sync_actor(p_actor_auth_id UUID)
RETURNS TABLE (user_id UUID, company_id UUID, role user_role)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.company_id, u.role FROM users u
  WHERE u.auth_id = p_actor_auth_id
    AND u.is_active = true AND u.company_id IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION sync_actor(UUID) IS
  'Resuelve id de perfil, empresa y rol desde users usando el auth_id. Nunca acepta company_id ni user_id del cliente.';


-- ============================================
-- 7. FUNCIÓN TRANSACCIONAL CON RESERVA PREVIA
--
--    Flujo:
--      1) resolver actor                    (falla duro si no existe)
--      2) RESERVAR la identidad con INSERT ... ON CONFLICT DO NOTHING
--         · 1 fila insertada  -> soy el dueño, sigo
--         · 0 filas           -> otra petición tiene la reserva; BLOQUEO hasta
--                                  que confirme o revierta, y devuelvo su
--                                  resultado. No aplico ningún efecto.
--      3) aplicar el efecto de negocio
--      4) registrar el estado terminal
--      5) COMMIT (único)
--
--    El bloqueo del paso 2 es el comportamiento nativo de PostgreSQL ante un
--    conflicto de índice único en una transacción concurrente. No usa pg_advisory
--    niapplication-level locks: es el mismo mecanismo que ya protege la
--    unicidad en todo el modelo.
-- ============================================
CREATE OR REPLACE FUNCTION sync_apply_operation(
  p_actor_auth_id UUID,
  p_client_operation_id UUID,
  p_operation_type sync_operation_type,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_payload JSONB,
  p_batch_seq INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_role user_role;
  v_status sync_operation_status;
  v_result JSONB;
  v_error_code TEXT;
  v_error_detail TEXT;
  v_entity_id UUID := p_entity_id;
  -- ROW_COUNT es INTEGER. Declararla BOOLEAN hace fallar la resolución con
  -- "operator does not exist: boolean = integer".
  v_claimed INTEGER;
  v_inspection UUID;
  v_point UUID;
  v_row RECORD;
  v_prev RECORD;
BEGIN
  IF p_actor_auth_id IS NULL OR p_client_operation_id IS NULL THEN
    RAISE EXCEPTION 'SYNC_ARGS: actor y client_operation_id son obligatorios';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'SYNC_ARGS: payload debe ser un objeto JSON';
  END IF;

  -- 7.1 Identidad desde la base, nunca desde el cliente.
  SELECT s.user_id, s.company_id, s.role INTO v_user_id, v_company_id, v_role
  FROM sync_actor(p_actor_auth_id) s;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'SYNC_ACTOR: sesión no reconocida, inactiva o sin empresa';
  END IF;
  IF v_role NOT IN ('COMPANY_ADMIN','INSPECTOR','SUPER_ADMIN') THEN
    RAISE EXCEPTION 'SYNC_ROLE: su rol no puede registrar operaciones';
  END IF;

  -- 7.2 RESERVA DE LA IDENTIDAD, antes de cualquier efecto.
  --     Si otra transacción tiene la fila sin confirmar, este INSERT ESPERA.
  --     Si esa transacción confirma, seguimos por el camino de reenvío.
  --     Si revierte, la reserva desaparece y este INSERT tiene éxito.
  INSERT INTO sync_operations (
    client_operation_id, company_id, user_id, operation_type, status,
    entity_type, entity_id, payload, result, batch_seq
  ) VALUES (
    p_client_operation_id, v_company_id, v_user_id, p_operation_type, 'EN_PROCESO',
    p_entity_type, p_entity_id, p_payload, NULL, p_batch_seq
  )
  ON CONFLICT (client_operation_id) DO NOTHING;

  GET DIAGNOSTICS v_claimed = ROW_COUNT;

  -- 7.3 No somos dueños: devolvemos el resultado ya calculado, sin efecto.
  IF v_claimed = 0 THEN
    SELECT s.status, s.result, s.entity_id, s.operation_type INTO v_prev
    FROM sync_operations s
    WHERE s.client_operation_id = p_client_operation_id;

    IF NOT FOUND THEN
      -- La otra transacción revirtió entre el INSERT y esta lectura. La
      -- operación sigue sin aplicar: se devuelve como ERROR reintentable.
      RETURN jsonb_build_object(
        'client_operation_id', p_client_operation_id,
        'outcome', 'APPLIED',
        'status', 'ERROR',
        'entity_id', NULL,
        'result', jsonb_build_object(
          'ok', false,
          'error_code', 'SYNC_RACE',
          'error_detail', 'La operación concurrente se revirtió; reintentar.',
          'retryable', true
        )
      );
    END IF;

    RETURN jsonb_build_object(
      'client_operation_id', p_client_operation_id,
      'outcome', 'REPLAY',
      'status', v_prev.status,
      'operation_type', v_prev.operation_type,
      'entity_id', v_prev.entity_id,
      'result', v_prev.result
    );
  END IF;

  -- 7.4 Efecto de negocio. Somos los dueños de la operación.
  BEGIN
    CASE p_operation_type

      WHEN 'INSPECTION_CREATE' THEN
        IF NOT EXISTS (SELECT 1 FROM lots l
                       WHERE l.id = (p_payload->>'lot_id')::uuid
                         AND l.company_id = v_company_id) THEN
          RAISE EXCEPTION 'SYNC_SCOPE: el lote no pertenece a su empresa';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM inspection_points ip
                       WHERE ip.id = (p_payload->>'inspection_point_id')::uuid
                         AND ip.company_id = v_company_id) THEN
          RAISE EXCEPTION 'SYNC_SCOPE: el punto de inspección no pertenece a su empresa';
        END IF;
        -- inspection_species_match (BEFORE INSERT) e idx_inspections_open_unique
        -- siguen aplicando sin cambios.
        INSERT INTO inspections (
          id, company_id, lot_id, inspection_point_id, inspector_id, status
        ) VALUES (
          p_entity_id, v_company_id,
          (p_payload->>'lot_id')::uuid,
          (p_payload->>'inspection_point_id')::uuid,
          v_user_id, 'EN CURSO'
        )
        ON CONFLICT (id) DO NOTHING;

      WHEN 'INSPECTION_OBSERVATION' THEN
        v_inspection := COALESCE(p_entity_id, (p_payload->>'inspection_id')::uuid);
        UPDATE inspections
        SET observations = p_payload->>'observations'
        WHERE id = v_inspection AND company_id = v_company_id AND status = 'EN CURSO';
        IF NOT FOUND THEN
          RAISE EXCEPTION 'SYNC_STATE: la inspección no existe, no es de su empresa o ya está cerrada';
        END IF;
        v_entity_id := v_inspection;

      WHEN 'INSPECTION_SAMPLING' THEN
        v_inspection := COALESCE(p_entity_id, (p_payload->>'inspection_id')::uuid);
        IF NOT EXISTS (SELECT 1 FROM sampling_plans sp
                       WHERE sp.id = (p_payload->>'sampling_plan_id')::uuid
                         AND sp.company_id = v_company_id) THEN
          RAISE EXCEPTION 'SYNC_SCOPE: el plan de muestreo no pertenece a su empresa';
        END IF;
        -- capture_sampling_rule_context (BEFORE UPDATE) valida plan y N sugerido.
        UPDATE inspections
        SET sampling_plan_id = (p_payload->>'sampling_plan_id')::uuid,
            suggested_sample_count = (p_payload->>'suggested_sample_count')::integer,
            sample_count = (p_payload->>'sample_count')::integer,
            sample_count_reason = p_payload->>'sample_count_reason'
        WHERE id = v_inspection AND company_id = v_company_id AND status = 'EN CURSO';
        IF NOT FOUND THEN
          RAISE EXCEPTION 'SYNC_STATE: la inspección no existe, no es de su empresa o ya está cerrada';
        END IF;
        v_entity_id := v_inspection;

      WHEN 'SAMPLE_CREATE' THEN
        v_inspection := (p_payload->>'inspection_id')::uuid;
        IF NOT EXISTS (SELECT 1 FROM inspections i
                       WHERE i.id = v_inspection
                         AND i.company_id = v_company_id AND i.status = 'EN CURSO') THEN
          RAISE EXCEPTION 'SYNC_STATE: la inspección no existe, no es de su empresa o ya está cerrada';
        END IF;
        -- `AS e(value)` fija explícitamente el nombre de columna al parámetro
        -- OUT de jsonb_array_elements. Un alias de tabla (`AS s`) no renombra
        -- la columna en este contexto, por lo que `v_row.s` no resolvía.
        FOR v_row IN
          SELECT e.value->>'id'                                 AS sample_id,
                 e.value->>'label'                              AS label,
                 NULLIF(e.value->>'fruit_quantity','')::integer AS fruit_quantity,
                 e.value->>'notes'                              AS notes
          FROM jsonb_array_elements(p_payload->'samples') AS e(value)
        LOOP
          INSERT INTO samples (id, inspection_id, label, fruit_quantity, notes)
          VALUES (
            v_row.sample_id::uuid, v_inspection,
            v_row.label,
            v_row.fruit_quantity,
            v_row.notes
          )
          ON CONFLICT (id) DO NOTHING;
        END LOOP;

      WHEN 'MEASUREMENT_UPSERT' THEN
        v_inspection := (p_payload->>'inspection_id')::uuid;
        SELECT i.inspection_point_id INTO v_point FROM inspections i
        WHERE i.id = v_inspection AND i.company_id = v_company_id AND i.status = 'EN CURSO';
        IF v_point IS NULL THEN
          RAISE EXCEPTION 'SYNC_STATE: la inspección no existe, no es de su empresa o ya está cerrada';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM measurement_defs d
                       WHERE d.id = (p_payload->>'measurement_def_id')::uuid
                         AND d.company_id = v_company_id
                         AND d.inspection_point_id = v_point
                         AND d.is_active) THEN
          RAISE EXCEPTION 'SYNC_SCOPE: el criterio no pertenece al punto de esta empresa';
        END IF;
        -- Conflicto por updated_at: sin columna de versión, como se decidió.
        IF p_payload ? 'expected_updated_at' AND EXISTS (
          SELECT 1 FROM measurements m
          WHERE m.inspection_id = v_inspection
            AND m.measurement_def_id = (p_payload->>'measurement_def_id')::uuid
            AND (CASE WHEN p_payload->>'sample_id' IS NULL THEN m.sample_id IS NULL
                      ELSE m.sample_id = (p_payload->>'sample_id')::uuid END)
            AND m.updated_at > (p_payload->>'expected_updated_at')::timestamptz
        ) THEN
          RAISE EXCEPTION 'SYNC_CONFLICT: la medición cambió en el servidor mientras el dispositivo estaba sin conexión';
        END IF;
        IF p_payload->>'sample_id' IS NULL THEN
          INSERT INTO measurements (id, inspection_id, measurement_def_id,
                                    sample_id, value, observation)
          VALUES (
            COALESCE(NULLIF(p_payload->>'id','')::uuid, gen_random_uuid()),
            v_inspection, (p_payload->>'measurement_def_id')::uuid, NULL,
            p_payload->>'value', p_payload->>'observation'
          )
          ON CONFLICT (inspection_id, measurement_def_id) WHERE sample_id IS NULL
          DO UPDATE SET value=EXCLUDED.value, observation=EXCLUDED.observation,
                        updated_at=now();
        ELSE
          INSERT INTO measurements (id, inspection_id, measurement_def_id,
                                    sample_id, value, observation)
          VALUES (
            COALESCE(NULLIF(p_payload->>'id','')::uuid, gen_random_uuid()),
            v_inspection, (p_payload->>'measurement_def_id')::uuid,
            (p_payload->>'sample_id')::uuid,
            p_payload->>'value', p_payload->>'observation'
          )
          ON CONFLICT (inspection_id, measurement_def_id, sample_id) WHERE sample_id IS NOT NULL
          DO UPDATE SET value=EXCLUDED.value, observation=EXCLUDED.observation,
                        updated_at=now();
        END IF;

      WHEN 'EVIDENCE_ATTACH' THEN
        -- El blob se sube ANTES de esta llamada: nunca hay fila apuntando a un
        -- archivo inexistente. Un blob huérfano se auto-repara en el reintento.
        v_inspection := (p_payload->>'inspection_id')::uuid;
        IF NOT EXISTS (SELECT 1 FROM inspections i
                       WHERE i.id = v_inspection AND i.company_id = v_company_id) THEN
          RAISE EXCEPTION 'SYNC_SCOPE: la inspección no existe o no es de su empresa';
        END IF;
        INSERT INTO inspection_evidence (
          id, inspection_id, storage_path, measurement_def_id, sample_id
        ) VALUES (
          COALESCE(NULLIF(p_payload->>'id','')::uuid, gen_random_uuid()),
          v_inspection, p_payload->>'storage_path',
          NULLIF(p_payload->>'measurement_def_id','')::uuid,
          NULLIF(p_payload->>'sample_id','')::uuid
        )
        ON CONFLICT (id) DO NOTHING;

      WHEN 'DECISION_CREATE' THEN
        IF NOT EXISTS (SELECT 1 FROM lots l
                       WHERE l.id = (p_payload->>'lot_id')::uuid
                         AND l.company_id = v_company_id) THEN
          RAISE EXCEPTION 'SYNC_SCOPE: el lote no pertenece a su empresa';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM decision_catalog dc
                       WHERE dc.id = (p_payload->>'decision_catalog_id')::uuid
                         AND dc.company_id = v_company_id
                         AND dc.code = p_payload->>'decision_code'
                         AND dc.is_active) THEN
          RAISE EXCEPTION 'SYNC_CATALOG: la decisión no está en el catálogo vigente de su empresa';
        END IF;
        IF EXISTS (SELECT 1 FROM lots l
                   WHERE l.id = (p_payload->>'lot_id')::uuid AND l.status = 'CERRADO') THEN
          RAISE EXCEPTION 'SYNC_STATE: no se pueden registrar decisiones sobre un lote CERRADO';
        END IF;
        INSERT INTO decisions (
          id, company_id, lot_id, inspection_id, decision_catalog_id,
          decision_code, decision_label, fundamento, status, decided_by
        )
        SELECT p_entity_id, v_company_id, (p_payload->>'lot_id')::uuid,
               NULLIF(p_payload->>'inspection_id','')::uuid,
               dc.id, dc.code, dc.label, p_payload->>'fundamento',
               'REGISTRADA', v_user_id
        FROM decision_catalog dc
        WHERE dc.id = (p_payload->>'decision_catalog_id')::uuid
        ON CONFLICT (id) DO NOTHING;

      WHEN 'INSPECTION_COMPLETE' THEN
        v_inspection := COALESCE(p_entity_id, (p_payload->>'inspection_id')::uuid);
        IF NOT EXISTS (SELECT 1 FROM inspections i
                       WHERE i.id = v_inspection
                         AND i.company_id = v_company_id AND i.status = 'EN CURSO') THEN
          RAISE EXCEPTION 'SYNC_STATE: la inspección no existe, no es de su empresa o ya está cerrada';
        END IF;
        IF COALESCE(btrim(p_payload->>'result'), '') = '' THEN
          RAISE EXCEPTION 'SYNC_REQUIRED: el resultado técnico es obligatorio';
        END IF;
        IF COALESCE(btrim(p_payload->>'decision'), '') = '' THEN
          RAISE EXCEPTION 'SYNC_REQUIRED: la decisión del inspector es obligatoria';
        END IF;
        -- inspection_complete_check (BEFORE UPDATE) valida obligatorias y evidencia.
        UPDATE inspections
        SET result = p_payload->>'result',
            decision = p_payload->>'decision',
            status = 'COMPLETADA'
        WHERE id = v_inspection AND company_id = v_company_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'SYNC_STATE: no se pudo completar la inspección';
        END IF;
        v_entity_id := v_inspection;

      ELSE
        RAISE EXCEPTION 'SYNC_TYPE: tipo de operación no soportado: %', p_operation_type;
    END CASE;

    v_status := 'APLICADA';
    v_result := jsonb_build_object('ok', true, 'entity_id', v_entity_id);

  EXCEPTION WHEN OTHERS THEN
    -- El sub-bloque se revierte por completo: no queda inspección, muestra ni
    -- medición parcial. La reserva sobrevive porque pertenece a la transacción
    -- externa, y se convierte en un fallo durable y visible.
    v_error_code := SQLSTATE;
    v_error_detail := SQLERRM;
    v_status := CASE WHEN SQLSTATE IN ('23505','P0001')
                     THEN 'CONFLICTO'::sync_operation_status
                     ELSE 'ERROR'::sync_operation_status END;
    v_result := jsonb_build_object(
      'ok', false, 'error_code', v_error_code, 'error_detail', v_error_detail,
      'retryable', (v_status = 'ERROR')
    );
  END;

  -- 7.5 Estado terminal. Toda ruta de COMMIT pasa por aquí: ninguna fila
  --     confirmada puede quedar en EN_PROCESO.
  UPDATE sync_operations
  SET status = v_status,
      entity_id = v_entity_id,
      result = v_result,
      error_code = v_error_code,
      error_detail = v_error_detail,
      updated_at = now()
  WHERE client_operation_id = p_client_operation_id;

  RETURN jsonb_build_object(
    'client_operation_id', p_client_operation_id,
    'outcome', 'APPLIED',
    'status', v_status,
    'entity_id', v_entity_id,
    'result', v_result
  );
END;
$$;

COMMENT ON FUNCTION sync_apply_operation(UUID, UUID, sync_operation_type, TEXT, UUID, JSONB, INTEGER) IS
  'Aplica UNA operación offline de forma atómica e idempotente ante concurrencia. La identidad se reserva con INSERT ... ON CONFLICT DO NOTHING, que bloquea hasta que la transacción concurrente confirme o revierta; solo después aplica el efecto. Efecto y bitácora se confirman juntos. No invoca el motor de calidad ni la IA: el análisis corre después, online.';


-- ============================================
-- 8. PERMISOS DE LAS FUNCIONES
-- ============================================
REVOKE ALL ON FUNCTION sync_actor(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION sync_actor(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION sync_actor(UUID) TO service_role;

REVOKE ALL ON FUNCTION sync_apply_operation(UUID, UUID, sync_operation_type, TEXT, UUID, JSONB, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION sync_apply_operation(UUID, UUID, sync_operation_type, TEXT, UUID, JSONB, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION sync_apply_operation(UUID, UUID, sync_operation_type, TEXT, UUID, JSONB, INTEGER) TO service_role;

REVOKE ALL ON TYPE sync_operation_type FROM PUBLIC;
REVOKE ALL ON TYPE sync_operation_status FROM PUBLIC;