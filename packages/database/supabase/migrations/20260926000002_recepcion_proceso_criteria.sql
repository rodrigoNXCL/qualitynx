-- QualityNX — D-031: Criterios faltantes de Recepción y Proceso/Packing
-- 2026-09-26 | Basado en informe QCInspec (CONFIRMADO EN QCINSPEC).
-- No inventa límites, tolerancias ni obligatoriedad. is_required=false por defecto.
-- No copia criterios de una etapa a otra. Respeta configuración existente.

-- ============================================
-- 1. RECEPCIÓN DE FRIGORÍFICO — brechas identificadas
-- ============================================

-- Firmeza de fruto (BAXLO) — confirmado en QCInspec Granel
INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, source_ref, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  'Firmeza de fruto (BAXLO)',
  'numérica',
  'Unidades Shore',
  false,
  NULL,
  NULL,
  NULL,
  true,
  'Medición instrumental de firmeza. Sin límite definido.',
  'QCINSPEC_GRANEL_2026-09-26',
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND s.is_active
  AND lower(os.name) = lower('Recepción Frigorífico / Packing')
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower('Firmeza de fruto (BAXLO)')
  );

-- Peso 10 frutos — confirmado en QCInspec Granel
INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, source_ref, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  'Peso 10 frutos',
  'numérica',
  'gr',
  false,
  NULL,
  NULL,
  NULL,
  true,
  'Criterio observado en QCInspec (Granel). Sin límite definido.',
  'QCINSPEC_GRANEL_2026-09-26',
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND s.is_active
  AND lower(os.name) = lower('Recepción Frigorífico / Packing')
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower('Peso 10 frutos')
  );

-- Desgarro pedicelar — confirmado en QCInspec Granel
INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, source_ref, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  'Desgarro pedicelar',
  'porcentaje',
  '%',
  false,
  NULL,
  NULL,
  NULL,
  true,
  'Criterio observado en QCInspec (Granel). Sin límite definido.',
  'QCINSPEC_GRANEL_2026-09-26',
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND s.is_active
  AND lower(os.name) = lower('Recepción Frigorífico / Packing')
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower('Desgarro pedicelar')
  );

-- Fruta roja — confirmado en QCInspec Granel
INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, source_ref, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  'Fruta roja',
  'porcentaje',
  '%',
  false,
  NULL,
  NULL,
  NULL,
  true,
  'Criterio observado en QCInspec (Granel). Sin límite definido.',
  'QCINSPEC_GRANEL_2026-09-26',
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND s.is_active
  AND lower(os.name) = lower('Recepción Frigorífico / Packing')
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower('Fruta roja')
  );

-- ============================================
-- 2. PROCESO / PACKING INTERNO — brechas identificadas
-- ============================================

-- Firmeza de fruto (BAXLO) — confirmado en QCInspec Embalado
INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, source_ref, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  'Firmeza de fruto (BAXLO)',
  'numérica',
  'Unidades Shore',
  false,
  NULL,
  NULL,
  NULL,
  true,
  'Medición instrumental de firmeza. Sin límite definido.',
  'QCINSPEC_EMBALADO_2026-09-26',
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND s.is_active
  AND lower(os.name) = lower('Proceso / Packing')
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower('Firmeza de fruto (BAXLO)')
  );

-- Peso 10 frutos — confirmado en QCInspec Embalado
INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, source_ref, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  'Peso 10 frutos',
  'numérica',
  'gr',
  false,
  NULL,
  NULL,
  NULL,
  true,
  'Criterio observado en QCInspec (Embalado). Sin límite definido.',
  'QCINSPEC_EMBALADO_2026-09-26',
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND s.is_active
  AND lower(os.name) = lower('Proceso / Packing')
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower('Peso 10 frutos')
  );

-- Peso cajas — confirmado en QCInspec Embalado
INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, source_ref, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  'Peso cajas',
  'numérica',
  'Kg',
  false,
  NULL,
  NULL,
  NULL,
  true,
  'Criterio observado en QCInspec (Embalado). Sin límite definido.',
  'QCINSPEC_EMBALADO_2026-09-26',
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND s.is_active
  AND lower(os.name) = lower('Proceso / Packing')
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower('Peso cajas')
  );

-- Desgarro pedicelar — confirmado en QCInspec Embalado
INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, source_ref, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  'Desgarro pedicelar',
  'porcentaje',
  '%',
  false,
  NULL,
  NULL,
  NULL,
  true,
  'Criterio observado en QCInspec (Embalado). Sin límite definido.',
  'QCINSPEC_EMBALADO_2026-09-26',
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND s.is_active
  AND lower(os.name) = lower('Proceso / Packing')
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower('Desgarro pedicelar')
  );

-- Fruta roja — confirmado en QCInspec Embalado
INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, source_ref, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  'Fruta roja',
  'porcentaje',
  '%',
  false,
  NULL,
  NULL,
  NULL,
  true,
  'Criterio observado en QCInspec (Embalado). Sin límite definido.',
  'QCINSPEC_EMBALADO_2026-09-26',
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND s.is_active
  AND lower(os.name) = lower('Proceso / Packing')
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower('Fruta roja')
  );

-- Sobrepeso — confirmado en QCInspec Embalado
INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, source_ref, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  'Sobrepeso',
  'porcentaje',
  '%',
  false,
  NULL,
  NULL,
  NULL,
  true,
  'Registrar el porcentaje informado. Sin límite definido.',
  'QCINSPEC_EMBALADO_2026-09-26',
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
  AND s.is_active
  AND lower(os.name) = lower('Proceso / Packing')
  AND NOT EXISTS (
    SELECT 1 FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower('Sobrepeso')
  );

-- ============================================
-- 3. Verificación final
-- ============================================

DO $$
DECLARE
  v_recepcion_baxlo int;
  v_recepcion_peso10 int;
  v_recepcion_desgarro int;
  v_recepcion_roja int;
  v_proceso_baxlo int;
  v_proceso_peso10 int;
  v_proceso_peso_cajas int;
  v_proceso_desgarro int;
  v_proceso_roja int;
  v_proceso_sobre_peso int;
BEGIN
  SELECT COUNT(*) INTO v_recepcion_baxlo
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) = lower('Recepción Frigorífico / Packing')
    AND lower(md.name) = lower('Firmeza de fruto (BAXLO)')
    AND md.is_active;

  SELECT COUNT(*) INTO v_recepcion_peso10
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) = lower('Recepción Frigorífico / Packing')
    AND lower(md.name) = lower('Peso 10 frutos')
    AND md.is_active;

  SELECT COUNT(*) INTO v_recepcion_desgarro
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) = lower('Recepción Frigorífico / Packing')
    AND lower(md.name) = lower('Desgarro pedicelar')
    AND md.is_active;

  SELECT COUNT(*) INTO v_recepcion_roja
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) = lower('Recepción Frigorífico / Packing')
    AND lower(md.name) = lower('Fruta roja')
    AND md.is_active;

  SELECT COUNT(*) INTO v_proceso_baxlo
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) = lower('Proceso / Packing')
    AND lower(md.name) = lower('Firmeza de fruto (BAXLO)')
    AND md.is_active;

  SELECT COUNT(*) INTO v_proceso_peso10
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) = lower('Proceso / Packing')
    AND lower(md.name) = lower('Peso 10 frutos')
    AND md.is_active;

  SELECT COUNT(*) INTO v_proceso_peso_cajas
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) = lower('Proceso / Packing')
    AND lower(md.name) = lower('Peso cajas')
    AND md.is_active;

  SELECT COUNT(*) INTO v_proceso_desgarro
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) = lower('Proceso / Packing')
    AND lower(md.name) = lower('Desgarro pedicelar')
    AND md.is_active;

  SELECT COUNT(*) INTO v_proceso_roja
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) = lower('Proceso / Packing')
    AND lower(md.name) = lower('Fruta roja')
    AND md.is_active;

  SELECT COUNT(*) INTO v_proceso_sobre_peso
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  JOIN species s ON s.id = ip.species_id
  WHERE lower(s.name) IN ('arándanos','arandanos','arándano','arandano')
    AND lower(os.name) = lower('Proceso / Packing')
    AND lower(md.name) = lower('Sobrepeso')
    AND md.is_active;

  IF v_recepcion_baxlo <> 1 OR v_recepcion_peso10 <> 1 OR v_recepcion_desgarro <> 1 OR v_recepcion_roja <> 1 THEN
    RAISE EXCEPTION 'Recepción: criterios incompletos (baxlo=%, peso10=%, desgarro=%, roja=%)',
      v_recepcion_baxlo, v_recepcion_peso10, v_recepcion_desgarro, v_recepcion_roja;
  END IF;

  IF v_proceso_baxlo <> 1 OR v_proceso_peso10 <> 1 OR v_proceso_peso_cajas <> 1 OR v_proceso_desgarro <> 1 OR v_proceso_roja <> 1 OR v_proceso_sobre_peso <> 1 THEN
    RAISE EXCEPTION 'Proceso: criterios incompletos (baxlo=%, peso10=%, peso_cajas=%, desgarro=%, roja=%, sobre_peso=%)',
      v_proceso_baxlo, v_proceso_peso10, v_proceso_peso_cajas, v_proceso_desgarro, v_proceso_roja, v_proceso_sobre_peso;
  END IF;

  RAISE NOTICE '000002 OK: recepción=4, proceso=6 criterios agregados';
END $$;
