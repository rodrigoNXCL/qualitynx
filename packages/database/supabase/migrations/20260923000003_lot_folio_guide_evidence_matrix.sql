-- QualityNX — Cierre Lote + Inspección (post REGLA CERO)
-- 2026-09-23 | Folio + guía + datos físicos + evidencia configurable + matriz criterios
-- NO modifica 20260923000001 (hardening traceability — acción de usuario)
-- NO inventa límites de aceptación.

-- ============================================
-- 1. LOTES: FOLIO (identidad operacional), GUÍA, DATOS FÍSICOS
-- ============================================

ALTER TABLE lots ADD COLUMN IF NOT EXISTS folio TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS producer_guide_number TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS packaging_type TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS quantity NUMERIC;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS weight NUMERIC;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS weight_unit TEXT;

COMMENT ON COLUMN lots.folio IS
  'Identidad operacional humana del lote (D-022 revisada). No es harvest_block.';
COMMENT ON COLUMN lots.harvest_block IS
  'Referencia productiva: bloque/cuartel de cosecha. No es la identidad primaria.';
COMMENT ON COLUMN lots.producer_guide_number IS
  'N° guía del productor. Opcional al crear; editable; trazable.';
COMMENT ON COLUMN lots.packaging_type IS 'Presentación/embalaje del lote (contexto de inspección).';
COMMENT ON COLUMN lots.quantity IS 'Cantidad del lote (unidad operacional del formulario).';
COMMENT ON COLUMN lots.weight IS 'Peso del lote.';
COMMENT ON COLUMN lots.weight_unit IS 'Unidad de peso (ej: kg, g, caja).';

-- Folio único por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_lots_folio_company
  ON lots (company_id, folio)
  WHERE folio IS NOT NULL;

-- Generación automática de folio si viene vacío: YYYY-NNNNNN por empresa
CREATE OR REPLACE FUNCTION lots_assign_folio()
RETURNS TRIGGER AS $$
DECLARE
  v_max INT;
  v_year TEXT;
BEGIN
  IF NEW.folio IS NOT NULL AND btrim(NEW.folio) <> '' THEN
    RETURN NEW;
  END IF;
  v_year := to_char(COALESCE(NEW.fruit_date, CURRENT_DATE), 'YYYY');
  SELECT COALESCE(MAX(NULLIF(substring(folio from '(\d+)$'), '')::INT), 0)
  INTO v_max
  FROM lots
  WHERE company_id = NEW.company_id
    AND folio LIKE v_year || '-%';
  NEW.folio := v_year || '-' || lpad((v_max + 1)::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lots_assign_folio ON lots;
CREATE TRIGGER lots_assign_folio
  BEFORE INSERT ON lots
  FOR EACH ROW
  EXECUTE FUNCTION lots_assign_folio();

-- Backfill folios existentes (orden por created_at)
DO $$
DECLARE
  r RECORD;
  v_year TEXT;
  v_n INT;
BEGIN
  FOR r IN
    SELECT id, company_id, fruit_date, created_at, folio
    FROM lots
    WHERE folio IS NULL OR btrim(folio) = ''
    ORDER BY company_id, created_at
  LOOP
    v_year := to_char(COALESCE(r.fruit_date, r.created_at::date, CURRENT_DATE), 'YYYY');
    SELECT COALESCE(MAX(NULLIF(substring(folio from '(\d+)$'), '')::INT), 0) + 1
    INTO v_n
    FROM lots
    WHERE company_id = r.company_id
      AND folio LIKE v_year || '-%';
    UPDATE lots
    SET folio = v_year || '-' || lpad(v_n::TEXT, 6, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- ============================================
-- 2. EVIDENCIA: quitar obligatoriedad GLOBAL ≥1 foto
--    La obligación deriva de measurement_defs.evidence_required
-- ============================================

CREATE OR REPLACE FUNCTION inspection_complete_check()
RETURNS TRIGGER AS $$
DECLARE
  v_pending INT;
  v_evidence_req INT;
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

    -- Evidencia solo si algún criterio activo del punto la exige
    SELECT COUNT(*) INTO v_evidence_req
    FROM measurement_defs d
    WHERE d.inspection_point_id = NEW.inspection_point_id
      AND d.is_active
      AND d.evidence_required;

    IF v_evidence_req > 0 THEN
      SELECT COUNT(*) INTO v_evidence
      FROM inspection_evidence e WHERE e.inspection_id = NEW.id;
      IF v_evidence = 0 THEN
        RAISE EXCEPTION 'Falta evidencia fotográfica obligatoria (exigida por criterios del punto)';
      END IF;
    END IF;

    NEW.completed_at := now();
  END IF;

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

-- ============================================
-- 3. MATRIZ BASE DE CRITERIOS ESTRUCTURALES
--    Capa A: estructura del control. SIN límites inventados.
--    validation_status = 'PENDIENTE DE VALIDACIÓN' cuando no hay regla.
--    NO copiar criterios de Huerto. NO crear puntos nuevos.
-- ============================================

INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, info_text, method_text, evidence_required,
  evaluation_kind, sort_order, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  d.name,
  d.value_type::measurement_value_type,
  d.unit,
  d.is_required,
  NULL::NUMERIC,          -- NO inventar límites
  NULL::NUMERIC,
  d.options,
  true,
  d.description,
  d.info_text,
  NULL::TEXT,             -- método: no definido en capa estructural
  COALESCE(d.evidence_required, false),
  d.evaluation_kind::quality_comparison_type,
  d.sort_order,
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN operational_stages os ON os.id = ip.operational_stage_id
CROSS JOIN LATERAL (VALUES
  -- ========== CONTROL DE COSECHA ==========
  -- Objetivo: control de fruta durante/tras cosecha
  ('Control de Cosecha',
   'Identificación del lote', 'texto', NULL, true,
   ARRAY[]::TEXT[], 'Identificación', 'Registrar lote/productor/origen en el control de cosecha.',
   'Vista del lote y etiqueta física.', false, NULL, 10),
  ('Control de Cosecha',
   'Madurez', 'lista', NULL, true,
   ARRAY['Inmaduro','Óptimo','Sobremaduro'], 'Condición del producto',
   'Condición de madurez al momento del control de cosecha.',
   'Evaluación visual según protocolo del punto.', false, NULL, 20),
  ('Control de Cosecha',
   'Color', 'lista', NULL, true,
   ARRAY['Morado maduro','Rojo','Verde'], 'Condición del producto',
   'Color característico de la fruta en cosecha.',
   'Evaluación visual.', false, NULL, 30),
  ('Control de Cosecha',
   'Condición general', 'lista', NULL, true,
   ARRAY['Apta','Observación','No apta'], 'Condición del producto',
   'Estado general de la fruta cosechada.',
   'Inspección visual representativa.', false, NULL, 40),
  ('Control de Cosecha',
   'Materia extraña', 'lista', NULL, true,
   ARRAY['No','Sí — vegetal','Sí — mineral','Sí — otro'], 'Defectos',
   'Presencia de materias extrañas.',
   'Inspección visual.', false, NULL, 50),
  ('Control de Cosecha',
   'Temperatura', 'numérica', '°C', false,
   ARRAY[]::TEXT[], 'Condición del producto',
   'Temperatura de la fruta al control de cosecha cuando aplique.',
   'Termómetro según protocolo. Límite: PENDIENTE DE VALIDACIÓN.',
   false, NULL, 60),

  -- ========== RECEPCIÓN FRIGORÍFICO / PACKING ==========
  -- Objetivo: condición al ingreso y correspondencia con origen
  ('Recepción Frigorífico / Packing',
   'Identificación del lote', 'texto', NULL, true,
   ARRAY[]::TEXT[], 'Identificación',
   'Verificar identificación del lote recibido vs información de origen.',
   'Cotejar folio/guía/bloque con documentación de recepción.', false, NULL, 10),
  ('Recepción Frigorífico / Packing',
   'Condición del embalaje', 'lista', NULL, true,
   ARRAY['Íntegro','Observación','Dañado'], 'Presentación / embalaje',
   'Estado del embalaje al ingreso.',
   'Inspección visual del embalaje.', false, NULL, 20),
  ('Recepción Frigorífico / Packing',
   'Temperatura de recepción', 'numérica', '°C', true,
   ARRAY[]::TEXT[], 'Condición del producto',
   'Temperatura del producto al recibir. Límite: PENDIENTE DE VALIDACIÓN (no inventar).',
   'Toma de temperatura según protocolo del producto/cliente.',
   false, NULL, 30),
  ('Recepción Frigorífico / Packing',
   'Condición de fruta', 'lista', NULL, true,
   ARRAY['Apta','Observación','No apta'], 'Condición del producto',
   'Condición general de la fruta al ingreso.',
   'Inspección visual representativa.', false, NULL, 40),
  ('Recepción Frigorífico / Packing',
   'Pudrición', 'porcentaje', '%', true,
   ARRAY[]::TEXT[], 'Defectos',
   'Porcentaje de pudrición observado. Sin límite hasta validación.',
   'Conteo/estimación sobre muestra. Límite: PENDIENTE DE VALIDACIÓN.',
   false, NULL, 50),
  ('Recepción Frigorífico / Packing',
   'Daño mecánico', 'porcentaje', '%', true,
   ARRAY[]::TEXT[], 'Defectos',
   'Porcentaje de daño mecánico. Sin límite hasta validación.',
   'Evaluación sobre muestra. Límite: PENDIENTE DE VALIDACIÓN.',
   false, NULL, 60),
  ('Recepción Frigorífico / Packing',
   'Deshidratación', 'porcentaje', '%', false,
   ARRAY[]::TEXT[], 'Defectos',
   'Señales de deshidratación al ingreso.',
   'Evaluación visual/peso cuando aplique. Límite: PENDIENTE.',
   false, NULL, 70),
  ('Recepción Frigorífico / Packing',
   'Materia extraña', 'lista', NULL, true,
   ARRAY['No','Sí — vegetal','Sí — mineral','Sí — otro'], 'Defectos',
   'Presencia de materias extrañas en el lote recibido.',
   'Inspección visual.', false, NULL, 80),
  ('Recepción Frigorífico / Packing',
   'Correspondencia con origen', 'lista', NULL, false,
   ARRAY['Coincide','Diferencia documentada','Sin antecedente'], 'Trazabilidad',
   'Comparación vs inspección anterior/historia del lote.',
   'Revisar historial del lote y documentación.', false, NULL, 90),
  ('Recepción Frigorífico / Packing',
   'Observaciones', 'texto', NULL, false,
   ARRAY[]::TEXT[], 'Trazabilidad',
   'Observaciones de recepción.',
   'Registro libre de contexto técnico.', false, NULL, 100),

  -- ========== PROCESO / PACKING ==========
  -- Objetivo: condición durante/después del proceso y presentación
  ('Proceso / Packing',
   'Condición del producto', 'lista', NULL, true,
   ARRAY['Apta','Observación','No apta'], 'Condición del producto',
   'Condición de la fruta durante el proceso.',
   'Inspección en línea o fin de proceso.', false, NULL, 10),
  ('Proceso / Packing',
   'Defectos', 'porcentaje', '%', true,
   ARRAY[]::TEXT[], 'Defectos',
   'Defectos observados en proceso/selección. Sin límite hasta validación.',
   'Muestreo en proceso. Límite: PENDIENTE DE VALIDACIÓN.',
   false, NULL, 20),
  ('Proceso / Packing',
   'Calibre', 'numérica', 'mm', false,
   ARRAY[]::TEXT[], 'Presentación / embalaje',
   'Calibre/tamaño cuando corresponda al proceso.',
   'Medición con calibrador. Límite: PENDIENTE DE VALIDACIÓN.',
   false, NULL, 30),
  ('Proceso / Packing',
   'Color', 'lista', NULL, false,
   ARRAY['Morado maduro','Rojo','Verde'], 'Condición del producto',
   'Uniformidad de color en proceso.',
   'Inspección visual.', false, NULL, 40),
  ('Proceso / Packing',
   'Uniformidad', 'lista', NULL, false,
   ARRAY['Alta','Media','Baja'], 'Proceso',
   'Uniformidad de selección/clasificación.',
   'Inspección de lote de proceso.', false, NULL, 50),
  ('Proceso / Packing',
   'Integridad del envase', 'lista', NULL, true,
   ARRAY['Íntegra','Observación','Dañada'], 'Presentación / embalaje',
   'Integridad del envase/embalaje durante packing.',
   'Inspección visual del envase.', false, NULL, 60),
  ('Proceso / Packing',
   'Rotulación', 'lista', NULL, false,
   ARRAY['Correcta','Incorrecta','Falta'], 'Presentación / embalaje',
   'Rotulación e identificación del envase.',
   'Cotejar rótulo vs lote/cliente. Requisitos: configurables por cliente.',
   false, NULL, 70),
  ('Proceso / Packing',
   'Pudrición', 'porcentaje', '%', false,
   ARRAY[]::TEXT[], 'Defectos',
   'Pudrición detectada en proceso. Sin límite hasta validación.',
   'Límite: PENDIENTE DE VALIDACIÓN.', false, NULL, 80),

  -- ========== PRE-FRÍO / FRÍO / ALMACENAMIENTO ==========
  -- Objetivo: conservación durante permanencia en frío
  ('Pre-frío / Frío / Almacenamiento',
   'Temperatura', 'numérica', '°C', true,
   ARRAY[]::TEXT[], 'Proceso',
   'Temperatura durante enfriamiento/almacenamiento. NO inventar rangos.',
   'Registro according a protocolo de producto. Rango: PENDIENTE DE CONFIGURACIÓN.',
   false, NULL, 10),
  ('Pre-frío / Frío / Almacenamiento',
   'Condición del producto', 'lista', NULL, true,
   ARRAY['Apta','Observación','No apta'], 'Condición del producto',
   'Condición del producto en frío/almacén.',
   'Inspección periódica.', false, NULL, 20),
  ('Pre-frío / Frío / Almacenamiento',
   'Integridad del embalaje', 'lista', NULL, true,
   ARRAY['Íntegro','Observación','Dañado'], 'Presentación / embalaje',
   'Estado del embalaje en almacenamiento.',
   'Inspección visual en ubicación.', false, NULL, 30),
  ('Pre-frío / Frío / Almacenamiento',
   'Condensación / humedad', 'lista', NULL, false,
   ARRAY['Normal','Exceso','Insuficiente'], 'Proceso',
   'Condensación o humedad cuando corresponda.',
   'Observación en cámara/almacén. Sin umbral inventado.',
   false, NULL, 40),
  ('Pre-frío / Frío / Almacenamiento',
   'Identificación', 'texto', NULL, true,
   ARRAY[]::TEXT[], 'Trazabilidad',
   'Identificación y ubicación del lote.',
   'Verificar etiqueta/ubicación.', false, NULL, 50),
  ('Pre-frío / Frío / Almacenamiento',
   'Observaciones', 'texto', NULL, false,
   ARRAY[]::TEXT[], 'Trazabilidad',
   'Observaciones de conservación.',
   'Registro libre.', false, NULL, 60),

  -- ========== INSPECCIÓN PRE-DESPACHO ==========
  -- Objetivo: producto terminado antes del despacho
  ('Inspección Pre-Despacho',
   'Identificación', 'texto', NULL, true,
   ARRAY[]::TEXT[], 'Identificación',
   'Identificación del lote listo para despacho.',
   'Cotejar folio/guía/rotulación.', false, NULL, 10),
  ('Inspección Pre-Despacho',
   'Presentación', 'lista', NULL, true,
   ARRAY['Conforme','Observación','No conforme'], 'Presentación / embalaje',
   'Presentación final del producto.',
   'Inspección visual del producto terminado.', false, NULL, 20),
  ('Inspección Pre-Despacho',
   'Integridad del embalaje', 'lista', NULL, true,
   ARRAY['Íntegro','Observación','Dañado'], 'Presentación / embalaje',
   'Integridad del embalaje de salida.',
   'Inspección visual.', false, NULL, 30),
  ('Inspección Pre-Despacho',
   'Rotulación', 'lista', NULL, true,
   ARRAY['Correcta','Incorrecta','Falta'], 'Presentación / embalaje',
   'Rotulación de salida (lote, fecha, cliente cuando aplique).',
   'Cotejar vs especificación de cliente/destino. Requisitos configurables.',
   false, NULL, 40),
  ('Inspección Pre-Despacho',
   'Condición visual', 'lista', NULL, true,
   ARRAY['Apta','Observación','No apta'], 'Condición del producto',
   'Condición visual final.',
   'Inspección representativa.', false, NULL, 50),
  ('Inspección Pre-Despacho',
   'Temperatura', 'numérica', '°C', false,
   ARRAY[]::TEXT[], 'Condición del producto',
   'Temperatura de salida cuando aplique.',
   'Límite/rango: PENDIENTE DE CONFIGURACIÓN.', false, NULL, 60),
  ('Inspección Pre-Despacho',
   'Pudrición', 'porcentaje', '%', false,
   ARRAY[]::TEXT[], 'Defectos',
   'Pudrición en producto de salida. Sin límite hasta validación.',
   'Límite: PENDIENTE DE VALIDACIÓN.', false, NULL, 70),
  ('Inspección Pre-Despacho',
   'Documentación asociada', 'lista', NULL, false,
   ARRAY['Completa','Incompleta','No aplica'], 'Trazabilidad',
   'Documentación de despacho/exportación cuando aplique.',
   'Revisar guías/certificados según requisito de destino.',
   false, NULL, 80),

  -- ========== DESPACHO / EMBARQUE ==========
  ('Despacho / Embarque',
   'Identificación', 'texto', NULL, true,
   ARRAY[]::TEXT[], 'Identificación',
   'Identificación del lote al abandonar la operación.',
   'Cotejar folio/etiqueta/documento de salida.', false, NULL, 10),
  ('Despacho / Embarque',
   'Condición general', 'lista', NULL, true,
   ARRAY['Apta','Observación','No apta'], 'Condición del producto',
   'Condición final al despacho.',
   'Inspección visual en muelle/salida.', false, NULL, 20),
  ('Despacho / Embarque',
   'Integridad del embalaje', 'lista', NULL, true,
   ARRAY['Íntegro','Observación','Dañado'], 'Presentación / embalaje',
   'Integridad al cargar/salir.',
   'Inspección visual.', false, NULL, 30),
  ('Despacho / Embarque',
   'Rotulación', 'lista', NULL, false,
   ARRAY['Correcta','Incorrecta','Falta'], 'Presentación / embalaje',
   'Rotulación de embarque.',
   'Cotejar vs documento de despacho.', false, NULL, 40),
  ('Despacho / Embarque',
   'Temperatura', 'numérica', '°C', false,
   ARRAY[]::TEXT[], 'Condición del producto',
   'Temperatura al embarque cuando aplique.',
   'Rango: PENDIENTE DE CONFIGURACIÓN.', false, NULL, 50),
  ('Despacho / Embarque',
   'Observaciones', 'texto', NULL, false,
   ARRAY[]::TEXT[], 'Trazabilidad',
   'Observaciones de despacho.',
   'Registro libre.', false, NULL, 60)
) AS d(
  stage_name, name, value_type, unit, is_required, options,
  category, description, info_text, evidence_required, evaluation_kind, sort_order
)
WHERE lower(os.name) = lower(d.stage_name)
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower(d.name)
  );

-- Huerto existente: documentar carácter DEMO de límites (no alterar valores)
UPDATE measurement_defs md
SET description = COALESCE(md.description, '')
    || CASE WHEN md.description IS NULL OR md.description = '' THEN '' ELSE ' ' END
    || 'Límite DEMO existente (no es norma universal); mantener hasta validación técnica.'
FROM inspection_points ip
JOIN operational_stages os ON os.id = ip.operational_stage_id
WHERE md.inspection_point_id = ip.id
  AND lower(os.name) = lower('Inspección Huerto')
  AND (md.min_value IS NOT NULL OR md.max_value IS NOT NULL)
  AND COALESCE(md.description, '') NOT LIKE '%Límite DEMO existente%';

-- Comentario de matriz
COMMENT ON TABLE measurement_defs IS
  'Criterios por punto (D-016). Capa estructural por etapa; límites solo si existen/validados. DEMO Huerto: Brix≥10, Pudrición≤2%. validation_status indica validación de regla.';

-- Verificación estructural: cada punto de arándano debe tener >=1 criterio
DO $$
DECLARE
  v_empty INT;
BEGIN
  SELECT COUNT(*) INTO v_empty
  FROM inspection_points ip
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND s.is_active
    AND NOT EXISTS (
      SELECT 1 FROM measurement_defs md
      WHERE md.inspection_point_id = ip.id AND md.is_active
    );
  IF v_empty > 0 THEN
    RAISE WARNING 'Quedan % puntos de arándano sin criterios activos', v_empty;
  END IF;
END $$;
