CREATE TEMP TABLE qnx_initial_packaging (
  name TEXT PRIMARY KEY,
  theoretical_weight_kg NUMERIC
) ON COMMIT DROP;

INSERT INTO qnx_initial_packaging (name, theoretical_weight_kg) VALUES
  ('Bandeja arándano blanca', 3.5::NUMERIC),
  ('Bandeja Bulk', 4.0::NUMERIC),
  ('Clamshell 4.4 oz x 12', 1.50::NUMERIC),
  ('Clamshell 6.0 oz x 12', 2.04::NUMERIC),
  ('Formato configurable — peso por definir', NULL::NUMERIC);

CREATE OR REPLACE FUNCTION lot_packaging_context()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_weight NUMERIC;
  v_company UUID;
  v_active BOOLEAN;
BEGIN
  IF NEW.packaging_type_id IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar un embalaje existente';
  END IF;

  SELECT name, theoretical_weight_kg, company_id, is_active
  INTO v_name, v_weight, v_company, v_active
  FROM packaging_types
  WHERE id = NEW.packaging_type_id;

  IF v_company IS NULL OR v_company <> NEW.company_id THEN
    RAISE EXCEPTION 'El embalaje pertenece a otra empresa';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT v_active THEN
      RAISE EXCEPTION 'El embalaje seleccionado está inactivo';
    END IF;
  ELSIF NEW.packaging_type_id IS DISTINCT FROM OLD.packaging_type_id THEN
    IF NOT v_active THEN
      RAISE EXCEPTION 'El embalaje seleccionado está inactivo';
    END IF;
  END IF;

  NEW.packaging_type := v_name;
  IF NEW.quantity IS NULL OR v_weight IS NULL THEN
    NEW.theoretical_weight_kg := NULL;
  ELSE
    NEW.theoretical_weight_kg := round(NEW.quantity * v_weight, 3);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE packaging_types pt
SET is_active = false
WHERE pt.is_active
  AND NOT EXISTS (
    SELECT 1
    FROM qnx_initial_packaging p
    WHERE lower(btrim(pt.name)) = lower(btrim(p.name))
  );

UPDATE packaging_types pt
SET is_active = true,
    theoretical_weight_kg = p.theoretical_weight_kg
FROM qnx_initial_packaging p
WHERE lower(btrim(pt.name)) = lower(btrim(p.name));

DO $$
DECLARE
  v_extra INTEGER;
  v_bad_weight INTEGER;
  v_bad_company_count INTEGER;
BEGIN
  SELECT count(*) INTO v_extra
  FROM packaging_types pt
  WHERE pt.is_active
    AND NOT EXISTS (
      SELECT 1
      FROM qnx_initial_packaging p
      WHERE lower(btrim(pt.name)) = lower(btrim(p.name))
    );
  IF v_extra > 0 THEN
    RAISE EXCEPTION 'Quedan % embalajes activos fuera del catálogo inicial', v_extra;
  END IF;

  SELECT count(*) INTO v_bad_weight
  FROM qnx_initial_packaging p
  JOIN packaging_types pt
    ON lower(btrim(pt.name)) = lower(btrim(p.name))
  WHERE pt.theoretical_weight_kg IS DISTINCT FROM p.theoretical_weight_kg;
  IF v_bad_weight > 0 THEN
    RAISE EXCEPTION 'Hay pesos de embalaje que no coinciden con el catálogo inicial';
  END IF;

  SELECT count(*) INTO v_bad_company_count
  FROM (
    SELECT company_id
    FROM packaging_types
    GROUP BY company_id
    HAVING count(*) FILTER (WHERE is_active) <> 5
  ) q;
  IF v_bad_company_count > 0 THEN
    RAISE EXCEPTION 'Hay empresas sin exactamente 5 embalajes activos';
  END IF;
END $$;

CREATE TEMP TABLE qnx_normative_sources (
  reference_code TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  document_name TEXT NOT NULL,
  version TEXT NOT NULL,
  valid_from DATE,
  valid_to DATE,
  country TEXT,
  market TEXT,
  protocol_name TEXT,
  reference_type TEXT NOT NULL,
  notes TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO qnx_normative_sources (
  reference_code, source_name, document_name, version, valid_from, valid_to,
  country, market, protocol_name, reference_type, notes
) VALUES
  (
    'SAG-R7550-2021',
    'SAG Chile',
    'Resolución 7550 Exenta — Sistema de Control Oficial de Inocuidad',
    'Única',
    '2021-12-03'::DATE,
    NULL::DATE,
    'Chile',
    'Cadenas de exportación hortofrutícola',
    NULL::TEXT,
    'FUENTE_NORMATIVA_SAG',
    '[SAG-R7550-2021] Promulgada 23-11-2021; publicada 03-12-2021. Registra participantes y trazabilidad de la cadena; no define por sí sola cada atributo ni tolerancia.'
  ),
  (
    'SAG-SMR-PAR-2026',
    'SAG Chile',
    'Sistema de Mitigación de Riesgo para arándanos frescos producidos en Chile y con destino Paraguay',
    'Mayo 2026',
    '2026-09-01'::DATE,
    NULL::DATE,
    'Chile',
    'Paraguay',
    'SMR Arándano',
    'PROTOCOLO_FITOSANITARIO_NORMATIVO_SAG',
    '[SAG-SMR-PAR-2026] Vigencia publicada 01-09-2026. Lobesia botrana, CSG/CSP, trazabilidad, inspección y muestreo fitosanitario; no es norma de calidad de firmeza, Brix, color o calibre.'
  ),
  (
    'SAG-SA-USA-2026',
    'SAG Chile',
    'Listado de Predios de Arándanos que pueden optar al Systems Approach para USA',
    'Temporada 2026-27',
    '2026-08-28'::DATE,
    NULL::DATE,
    'Chile',
    'Estados Unidos',
    'Systems Approach Arándano',
    'REGISTRO_OFICIAL_SAG',
    '[SAG-SA-USA-2026] Registro actualizado 28-08-2026. Define elegibilidad de predios; no es norma de calidad comercial ni sustituye el protocolo técnico.'
  ),
  (
    'SAG-PNLB-2026',
    'SAG Chile',
    'Resolución 6816/2026 y Estrategia PNLb 2026-2027',
    'Temporada 2026/2027',
    '2026-07-21'::DATE,
    NULL::DATE,
    'Chile',
    'Programa Nacional Lobesia botrana',
    'PNLb 2026/2027',
    'REQUISITO_PROGRAMA_FITOSANITARIO_SAG',
    '[SAG-PNLB-2026] Resolución 21-07-2026; estrategia publicada 07-08-2026. Vigilancia, trampas, prospección y trazabilidad; no define tolerancias de calidad comercial.'
  ),
  (
    'UNECE-FFV57-2023',
    'UNECE',
    'FFV-57 Berry fruits',
    'Edición 2023',
    '2024-03-15'::DATE,
    NULL::DATE,
    NULL::TEXT,
    'Referencia internacional; no Chile automáticamente',
    'Berries',
    'REFERENCIA_TECNICA_INTERNACIONAL',
    '[UNECE-FFV57-2023] Emisión 15-03-2024. Requisitos mínimos, clases, defectos y tamaño opcional; no reemplaza requisitos SAG ni regla QualityNX.'
  ),
  (
    'CODEX-CXS349-2022',
    'Codex Alimentarius FAO/WHO',
    'CXS 349-2022 Standard for Berry Fruits',
    'Adoptado 2022',
    NULL::DATE,
    NULL::DATE,
    NULL::TEXT,
    'Referencia internacional; aplicación según mercado/importador',
    'Berries',
    'REFERENCIA_TECNICA_INTERNACIONAL',
    '[CODEX-CXS349-2022] Referencia internacional para berries; no autoriza copiar tolerancias a Chile.'
  ),
  (
    'USDA-AMS-BLUE-2002',
    'USDA Agricultural Marketing Service',
    'Blueberries — Shipping Point and Market Inspection Instructions',
    'Octubre 2002',
    NULL::DATE,
    NULL::DATE,
    'Estados Unidos',
    'Estados Unidos; referencia técnica, no SAG',
    'Inspección de arándanos',
    'REFERENCIA_TECNICA_INSPECCION',
    '[USDA-AMS-BLUE-2002] Documento octubre 2002. Muestreo, firmeza, color, limpieza, defectos y tamaño; sus tolerancias son de grado USDA y no son regla QualityNX.'
  ),
  (
    'SAG-EXP-GENERAL',
    'SAG Chile',
    'Exportaciones — página institucional',
    'NO DEFINIDA',
    NULL::DATE,
    NULL::DATE,
    'Chile',
    'Todos los destinos',
    'Exportación',
    'REFERENCIA_INSTITUCIONAL_SAG',
    '[SAG-EXP-GENERAL] Página institucional consultada 23-09-2026. Los requisitos fitosanitarios dependen del país de destino; no sustituye el protocolo de mercado.'
  );

UPDATE normative_references
SET is_active = false
WHERE company_id IS NULL
  AND (
    (source_name = 'SAG Chile' AND document_name = 'Procedimientos y protocolos vigentes')
    OR (source_name = 'UNECE FFV-57' AND document_name = 'FFV-57')
  );

UPDATE normative_references nr
SET source_name = s.source_name,
    document_name = s.document_name,
    version = s.version,
    valid_from = s.valid_from,
    valid_to = s.valid_to,
    country = s.country,
    market = s.market,
    protocol_name = s.protocol_name,
    reference_type = s.reference_type,
    notes = s.notes,
    is_active = true
FROM qnx_normative_sources s
WHERE nr.company_id IS NULL
  AND nr.source_name = s.source_name
  AND nr.document_name IS NOT DISTINCT FROM s.document_name
  AND nr.version IS NOT DISTINCT FROM s.version
  AND nr.market IS NOT DISTINCT FROM s.market
  AND nr.protocol_name IS NOT DISTINCT FROM s.protocol_name;

INSERT INTO normative_references (
  company_id, source_name, document_name, version, valid_from, valid_to,
  country, market, protocol_name, reference_type, notes, is_active
)
SELECT
  NULL::UUID, s.source_name, s.document_name, s.version, s.valid_from, s.valid_to,
  s.country, s.market, s.protocol_name, s.reference_type, s.notes, true
FROM qnx_normative_sources s
WHERE NOT EXISTS (
  SELECT 1
  FROM normative_references nr
  WHERE nr.company_id IS NULL
    AND nr.source_name = s.source_name
    AND nr.document_name IS NOT DISTINCT FROM s.document_name
    AND nr.version IS NOT DISTINCT FROM s.version
    AND nr.market IS NOT DISTINCT FROM s.market
    AND nr.protocol_name IS NOT DISTINCT FROM s.protocol_name
);

CREATE TEMP TABLE qnx_matrix_criteria (
  stage_name TEXT NOT NULL,
  criterion_name TEXT NOT NULL,
  PRIMARY KEY (stage_name, criterion_name)
) ON COMMIT DROP;

INSERT INTO qnx_matrix_criteria (stage_name, criterion_name) VALUES
('Inspección Huerto', 'Identificación del lote'),('Inspección Huerto', 'Variedad'),('Inspección Huerto', 'Estado de madurez'),('Inspección Huerto', 'Color'),('Inspección Huerto', 'Firmeza'),('Inspección Huerto', 'Sólidos solubles (°Brix)'),('Inspección Huerto', 'Calibre'),('Inspección Huerto', 'Condición general de fruta'),('Inspección Huerto', 'Pudrición'),('Inspección Huerto', 'Daño mecánico / machucón'),('Inspección Huerto', 'Deshidratación'),('Inspección Huerto', 'Fruta inmadura / verde'),('Inspección Huerto', 'Fruta sobremadura'),('Inspección Huerto', 'Cicatrices / russet'),('Inspección Huerto', 'Daño fisiológico'),('Inspección Huerto', 'Materia extraña'),('Inspección Huerto', 'Presencia de plagas / daño de plagas'),('Inspección Huerto', 'Pedicelo / restos florales'),('Inspección Huerto', 'Bloom / pruina'),('Inspección Huerto', 'Heridas / partiduras'),('Inspección Huerto', 'Observaciones técnicas'),('Control de Cosecha', 'Identificación del lote'),('Control de Cosecha', 'Productor'),('Control de Cosecha', 'Variedad'),('Control de Cosecha', 'Estado de madurez'),('Control de Cosecha', 'Color'),('Control de Cosecha', 'Firmeza'),('Control de Cosecha', 'Sólidos solubles (°Brix)'),('Control de Cosecha', 'Calibre'),('Control de Cosecha', 'Pudrición'),('Control de Cosecha', 'Daño mecánico / machucón'),('Control de Cosecha', 'Deshidratación'),('Control de Cosecha', 'Fruta inmadura / verde'),('Control de Cosecha', 'Fruta sobremadura'),('Control de Cosecha', 'Cicatrices / russet'),('Control de Cosecha', 'Bloom / pruina'),('Control de Cosecha', 'Pedicelo / restos florales'),('Control de Cosecha', 'Heridas / partiduras'),('Control de Cosecha', 'Materia extraña'),('Control de Cosecha', 'Presencia de plagas / daño de plagas'),('Control de Cosecha', 'Condición general de cosecha'),('Control de Cosecha', 'Fruta cosechada húmeda'),('Control de Cosecha', 'Temperatura de fruta'),('Control de Cosecha', 'Observaciones'),('Recepción Frigorífico / Packing', 'Folio de lote'),('Recepción Frigorífico / Packing', 'Guía del productor'),('Recepción Frigorífico / Packing', 'Productor'),('Recepción Frigorífico / Packing', 'Variedad'),('Recepción Frigorífico / Packing', 'Fecha de cosecha'),('Recepción Frigorífico / Packing', 'Fecha/hora de recepción'),('Recepción Frigorífico / Packing', 'Procedencia / bloque'),('Recepción Frigorífico / Packing', 'Temperatura de fruta'),('Recepción Frigorífico / Packing', 'Condición general'),('Recepción Frigorífico / Packing', 'Firmeza'),('Recepción Frigorífico / Packing', 'Sólidos solubles (°Brix)'),('Recepción Frigorífico / Packing', 'Calibre'),('Recepción Frigorífico / Packing', 'Pudrición'),('Recepción Frigorífico / Packing', 'Fruta blanda'),('Recepción Frigorífico / Packing', 'Deshidratación'),('Recepción Frigorífico / Packing', 'Daño mecánico / machucón'),('Recepción Frigorífico / Packing', 'Heridas / partiduras'),('Recepción Frigorífico / Packing', 'Cicatrices / russet'),('Recepción Frigorífico / Packing', 'Fruta inmadura / verde'),('Recepción Frigorífico / Packing', 'Fruta sobremadura'),('Recepción Frigorífico / Packing', 'Pedicelo / restos florales'),('Recepción Frigorífico / Packing', 'Bloom / pruina'),('Recepción Frigorífico / Packing', 'Materia extraña'),('Recepción Frigorífico / Packing', 'Presencia de plagas / daño de plagas'),('Recepción Frigorífico / Packing', 'Integridad del embalaje'),('Recepción Frigorífico / Packing', 'Limpieza del embalaje'),('Recepción Frigorífico / Packing', 'Condición del envase'),('Recepción Frigorífico / Packing', 'Peso / cantidad recibida'),('Recepción Frigorífico / Packing', 'Correspondencia documental'),('Recepción Frigorífico / Packing', 'Observaciones'),('Proceso / Packing', 'Identificación del lote'),('Proceso / Packing', 'Variedad'),('Proceso / Packing', 'Condición general'),('Proceso / Packing', 'Calibre'),('Proceso / Packing', 'Color'),('Proceso / Packing', 'Firmeza'),('Proceso / Packing', 'Sólidos solubles (°Brix)'),('Proceso / Packing', 'Pudrición'),('Proceso / Packing', 'Fruta blanda'),('Proceso / Packing', 'Deshidratación'),('Proceso / Packing', 'Daño mecánico / machucón'),('Proceso / Packing', 'Heridas / partiduras'),('Proceso / Packing', 'Cicatrices / russet'),('Proceso / Packing', 'Fruta inmadura / verde'),('Proceso / Packing', 'Fruta sobremadura'),('Proceso / Packing', 'Pedicelo'),('Proceso / Packing', 'Restos florales'),('Proceso / Packing', 'Bloom / pruina'),('Proceso / Packing', 'Materia extraña'),('Proceso / Packing', 'Uniformidad'),('Proceso / Packing', 'Eficacia de selección'),('Proceso / Packing', 'Defectos posteriores al proceso'),('Proceso / Packing', 'Tipo de envase'),('Proceso / Packing', 'Integridad del envase'),('Proceso / Packing', 'Limpieza del envase'),('Proceso / Packing', 'Peso neto'),('Proceso / Packing', 'Calibre declarado'),('Proceso / Packing', 'Rotulación'),('Proceso / Packing', 'Correspondencia lote/envase'),('Proceso / Packing', 'Trazabilidad de embalaje'),('Proceso / Packing', 'Observaciones'),('Pre-frío / Frío / Almacenamiento', 'Identificación del lote'),('Pre-frío / Frío / Almacenamiento', 'Ubicación'),('Pre-frío / Frío / Almacenamiento', 'Cámara / equipo'),('Pre-frío / Frío / Almacenamiento', 'Fecha/hora de ingreso'),('Pre-frío / Frío / Almacenamiento', 'Temperatura de producto'),('Pre-frío / Frío / Almacenamiento', 'Temperatura de cámara'),('Pre-frío / Frío / Almacenamiento', 'Humedad relativa, cuando aplique'),('Pre-frío / Frío / Almacenamiento', 'Tiempo de permanencia'),('Pre-frío / Frío / Almacenamiento', 'Estado del proceso de enfriamiento'),('Pre-frío / Frío / Almacenamiento', 'Condición general'),('Pre-frío / Frío / Almacenamiento', 'Firmeza'),('Pre-frío / Frío / Almacenamiento', 'Deshidratación'),('Pre-frío / Frío / Almacenamiento', 'Pudrición'),('Pre-frío / Frío / Almacenamiento', 'Daño mecánico'),('Pre-frío / Frío / Almacenamiento', 'Condensación / humedad superficial'),('Pre-frío / Frío / Almacenamiento', 'Alteraciones visibles'),('Pre-frío / Frío / Almacenamiento', 'Materia extraña'),('Pre-frío / Frío / Almacenamiento', 'Integridad del embalaje'),('Pre-frío / Frío / Almacenamiento', 'Condición del envase'),('Pre-frío / Frío / Almacenamiento', 'Ubicación / trazabilidad física'),('Pre-frío / Frío / Almacenamiento', 'Observaciones'),('Inspección Pre-Despacho', 'Folio de lote'),('Inspección Pre-Despacho', 'Productor'),('Inspección Pre-Despacho', 'Variedad'),('Inspección Pre-Despacho', 'Fecha de cosecha'),('Inspección Pre-Despacho', 'Fecha de embalaje'),('Inspección Pre-Despacho', 'Tipo de envase'),('Inspección Pre-Despacho', 'Mercado / destino'),('Inspección Pre-Despacho', 'Cliente'),('Inspección Pre-Despacho', 'Condición general'),('Inspección Pre-Despacho', 'Color'),('Inspección Pre-Despacho', 'Firmeza'),('Inspección Pre-Despacho', 'Sólidos solubles (°Brix)'),('Inspección Pre-Despacho', 'Calibre'),('Inspección Pre-Despacho', 'Pudrición'),('Inspección Pre-Despacho', 'Fruta blanda'),('Inspección Pre-Despacho', 'Deshidratación'),('Inspección Pre-Despacho', 'Daño mecánico / machucón'),('Inspección Pre-Despacho', 'Heridas / partiduras'),('Inspección Pre-Despacho', 'Cicatrices / russet'),('Inspección Pre-Despacho', 'Fruta inmadura'),('Inspección Pre-Despacho', 'Fruta sobremadura'),('Inspección Pre-Despacho', 'Pedicelo'),('Inspección Pre-Despacho', 'Restos florales'),('Inspección Pre-Despacho', 'Bloom / pruina'),('Inspección Pre-Despacho', 'Materia extraña'),('Inspección Pre-Despacho', 'Plagas / daño de plagas'),('Inspección Pre-Despacho', 'Integridad del envase'),('Inspección Pre-Despacho', 'Limpieza'),('Inspección Pre-Despacho', 'Peso neto'),('Inspección Pre-Despacho', 'Uniformidad'),('Inspección Pre-Despacho', 'Rotulación'),('Inspección Pre-Despacho', 'Correspondencia etiqueta-lote'),('Inspección Pre-Despacho', 'Correspondencia etiqueta-mercado'),('Inspección Pre-Despacho', 'Trazabilidad'),('Inspección Pre-Despacho', 'Temperatura del producto'),('Inspección Pre-Despacho', 'Condición de almacenamiento'),('Inspección Pre-Despacho', 'Documentación asociada'),('Inspección Pre-Despacho', 'Observaciones'),('Despacho / Embarque', 'Folio de lote'),('Despacho / Embarque', 'Productor'),('Despacho / Embarque', 'Variedad'),('Despacho / Embarque', 'Cliente'),('Despacho / Embarque', 'Mercado / destino'),('Despacho / Embarque', 'Documento de despacho'),('Despacho / Embarque', 'Identificación de pallets / unidades'),('Despacho / Embarque', 'Identificación del vehículo / contenedor'),('Despacho / Embarque', 'Condición de limpieza'),('Despacho / Embarque', 'Integridad del vehículo / contenedor'),('Despacho / Embarque', 'Temperatura configurada / requerida'),('Despacho / Embarque', 'Temperatura de producto'),('Despacho / Embarque', 'Condiciones de carga'),('Despacho / Embarque', 'Integridad del embalaje'),('Despacho / Embarque', 'Sellos / identificación de seguridad, cuando aplique'),('Despacho / Embarque', 'Correspondencia documental'),('Despacho / Embarque', 'Rotulación'),('Despacho / Embarque', 'Documentación de exportación'),('Despacho / Embarque', 'Estado de liberación del lote'),('Despacho / Embarque', 'Observaciones'),('Despacho / Embarque', 'Evidencia de despacho, cuando corresponda');

CREATE TEMP TABLE qnx_matrix_source_links (
  stage_name TEXT NOT NULL,
  criterion_name TEXT NOT NULL,
  reference_code TEXT NOT NULL,
  relationship TEXT NOT NULL,
  PRIMARY KEY (stage_name, criterion_name, reference_code)
) ON COMMIT DROP;

INSERT INTO qnx_matrix_source_links (
  stage_name, criterion_name, reference_code, relationship
) VALUES
('Inspección Huerto', 'Identificación del lote', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Huerto', 'Identificación del lote', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Huerto', 'Variedad', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Huerto', 'Variedad', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Huerto', 'Estado de madurez', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Estado de madurez', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Color', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Color', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Color', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Firmeza', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Firmeza', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Firmeza', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Sólidos solubles (°Brix)', 'USDA-AMS-BLUE-2002', 'REFERENCIA_NO_METODO_BRIX'),('Inspección Huerto', 'Calibre', 'UNECE-FFV57-2023', 'REFERENCIA_NO_FIJA_CALIBRE'),('Inspección Huerto', 'Calibre', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Calibre', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Condición general de fruta', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Condición general de fruta', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Pudrición', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Pudrición', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Pudrición', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Huerto', 'Daño mecánico / machucón', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Daño mecánico / machucón', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Daño mecánico / machucón', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Huerto', 'Deshidratación', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Deshidratación', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Deshidratación', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Huerto', 'Fruta inmadura / verde', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Fruta inmadura / verde', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Fruta inmadura / verde', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Huerto', 'Fruta sobremadura', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Fruta sobremadura', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Fruta sobremadura', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Huerto', 'Cicatrices / russet', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Cicatrices / russet', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Cicatrices / russet', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Huerto', 'Daño fisiológico', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Daño fisiológico', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Daño fisiológico', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Huerto', 'Materia extraña', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Materia extraña', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Materia extraña', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Huerto', 'Presencia de plagas / daño de plagas', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Huerto', 'Presencia de plagas / daño de plagas', 'SAG-SMR-PAR-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Inspección Huerto', 'Presencia de plagas / daño de plagas', 'SAG-SA-USA-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Inspección Huerto', 'Presencia de plagas / daño de plagas', 'SAG-PNLB-2026', 'FUENTE_NORMATIVA_SAG'),('Inspección Huerto', 'Pedicelo / restos florales', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Pedicelo / restos florales', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Pedicelo / restos florales', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Huerto', 'Bloom / pruina', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Bloom / pruina', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Heridas / partiduras', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Heridas / partiduras', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Huerto', 'Heridas / partiduras', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Control de Cosecha', 'Identificación del lote', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Control de Cosecha', 'Identificación del lote', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Control de Cosecha', 'Productor', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Control de Cosecha', 'Productor', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Control de Cosecha', 'Variedad', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Control de Cosecha', 'Variedad', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Control de Cosecha', 'Estado de madurez', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Estado de madurez', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Color', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Color', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Color', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Firmeza', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Firmeza', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Firmeza', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Sólidos solubles (°Brix)', 'USDA-AMS-BLUE-2002', 'REFERENCIA_NO_METODO_BRIX'),('Control de Cosecha', 'Calibre', 'UNECE-FFV57-2023', 'REFERENCIA_NO_FIJA_CALIBRE'),('Control de Cosecha', 'Calibre', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Calibre', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Pudrición', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Pudrición', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Pudrición', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Control de Cosecha', 'Daño mecánico / machucón', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Daño mecánico / machucón', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Daño mecánico / machucón', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Control de Cosecha', 'Deshidratación', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Deshidratación', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Deshidratación', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Control de Cosecha', 'Fruta inmadura / verde', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Fruta inmadura / verde', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Fruta inmadura / verde', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Control de Cosecha', 'Fruta sobremadura', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Fruta sobremadura', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Fruta sobremadura', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Control de Cosecha', 'Cicatrices / russet', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Cicatrices / russet', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Cicatrices / russet', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Control de Cosecha', 'Bloom / pruina', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Bloom / pruina', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Pedicelo / restos florales', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Pedicelo / restos florales', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Pedicelo / restos florales', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Control de Cosecha', 'Heridas / partiduras', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Heridas / partiduras', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Heridas / partiduras', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Control de Cosecha', 'Materia extraña', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Materia extraña', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Materia extraña', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Control de Cosecha', 'Presencia de plagas / daño de plagas', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Control de Cosecha', 'Presencia de plagas / daño de plagas', 'SAG-SMR-PAR-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Control de Cosecha', 'Presencia de plagas / daño de plagas', 'SAG-SA-USA-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Control de Cosecha', 'Presencia de plagas / daño de plagas', 'SAG-PNLB-2026', 'FUENTE_NORMATIVA_SAG'),('Control de Cosecha', 'Condición general de cosecha', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Condición general de cosecha', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Fruta cosechada húmeda', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Fruta cosechada húmeda', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Control de Cosecha', 'Temperatura de fruta', 'SAG-PNLB-2026', 'REFERENCIA_CONDICIONAL_FITOSANITARIA'),('Control de Cosecha', 'Temperatura de fruta', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Recepción Frigorífico / Packing', 'Folio de lote', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Recepción Frigorífico / Packing', 'Folio de lote', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Recepción Frigorífico / Packing', 'Guía del productor', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Recepción Frigorífico / Packing', 'Guía del productor', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Recepción Frigorífico / Packing', 'Productor', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Recepción Frigorífico / Packing', 'Productor', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Recepción Frigorífico / Packing', 'Variedad', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Recepción Frigorífico / Packing', 'Variedad', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Recepción Frigorífico / Packing', 'Fecha de cosecha', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Recepción Frigorífico / Packing', 'Fecha de cosecha', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Recepción Frigorífico / Packing', 'Fecha/hora de recepción', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Recepción Frigorífico / Packing', 'Fecha/hora de recepción', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Recepción Frigorífico / Packing', 'Procedencia / bloque', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Recepción Frigorífico / Packing', 'Procedencia / bloque', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Recepción Frigorífico / Packing', 'Temperatura de fruta', 'SAG-PNLB-2026', 'REFERENCIA_CONDICIONAL_FITOSANITARIA'),('Recepción Frigorífico / Packing', 'Temperatura de fruta', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Recepción Frigorífico / Packing', 'Condición general', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Condición general', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Firmeza', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Firmeza', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Firmeza', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Sólidos solubles (°Brix)', 'USDA-AMS-BLUE-2002', 'REFERENCIA_NO_METODO_BRIX'),('Recepción Frigorífico / Packing', 'Calibre', 'UNECE-FFV57-2023', 'REFERENCIA_NO_FIJA_CALIBRE'),('Recepción Frigorífico / Packing', 'Calibre', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Calibre', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Pudrición', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Pudrición', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Pudrición', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Recepción Frigorífico / Packing', 'Fruta blanda', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Fruta blanda', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Deshidratación', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Deshidratación', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Deshidratación', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Recepción Frigorífico / Packing', 'Daño mecánico / machucón', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Daño mecánico / machucón', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Daño mecánico / machucón', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Recepción Frigorífico / Packing', 'Heridas / partiduras', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Heridas / partiduras', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Heridas / partiduras', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Recepción Frigorífico / Packing', 'Cicatrices / russet', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Cicatrices / russet', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Cicatrices / russet', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Recepción Frigorífico / Packing', 'Fruta inmadura / verde', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Fruta inmadura / verde', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Fruta inmadura / verde', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Recepción Frigorífico / Packing', 'Fruta sobremadura', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Fruta sobremadura', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Fruta sobremadura', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Recepción Frigorífico / Packing', 'Pedicelo / restos florales', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Pedicelo / restos florales', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Pedicelo / restos florales', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Recepción Frigorífico / Packing', 'Bloom / pruina', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Bloom / pruina', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Materia extraña', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Materia extraña', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Materia extraña', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Recepción Frigorífico / Packing', 'Presencia de plagas / daño de plagas', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Recepción Frigorífico / Packing', 'Presencia de plagas / daño de plagas', 'SAG-SMR-PAR-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Recepción Frigorífico / Packing', 'Presencia de plagas / daño de plagas', 'SAG-SA-USA-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Recepción Frigorífico / Packing', 'Presencia de plagas / daño de plagas', 'SAG-PNLB-2026', 'FUENTE_NORMATIVA_SAG'),('Recepción Frigorífico / Packing', 'Integridad del embalaje', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Recepción Frigorífico / Packing', 'Integridad del embalaje', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Integridad del embalaje', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Limpieza del embalaje', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Recepción Frigorífico / Packing', 'Limpieza del embalaje', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Limpieza del embalaje', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Condición del envase', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Recepción Frigorífico / Packing', 'Condición del envase', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Condición del envase', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Peso / cantidad recibida', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Recepción Frigorífico / Packing', 'Peso / cantidad recibida', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Peso / cantidad recibida', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Recepción Frigorífico / Packing', 'Correspondencia documental', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Recepción Frigorífico / Packing', 'Correspondencia documental', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Proceso / Packing', 'Identificación del lote', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Proceso / Packing', 'Identificación del lote', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Proceso / Packing', 'Variedad', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Proceso / Packing', 'Variedad', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Proceso / Packing', 'Condición general', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Condición general', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Calibre', 'UNECE-FFV57-2023', 'REFERENCIA_NO_FIJA_CALIBRE'),('Proceso / Packing', 'Calibre', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Calibre', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Color', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Color', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Color', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Firmeza', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Firmeza', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Firmeza', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Sólidos solubles (°Brix)', 'USDA-AMS-BLUE-2002', 'REFERENCIA_NO_METODO_BRIX'),('Proceso / Packing', 'Pudrición', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Pudrición', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Pudrición', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Proceso / Packing', 'Fruta blanda', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Fruta blanda', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Deshidratación', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Deshidratación', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Deshidratación', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Proceso / Packing', 'Daño mecánico / machucón', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Daño mecánico / machucón', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Daño mecánico / machucón', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Proceso / Packing', 'Heridas / partiduras', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Heridas / partiduras', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Heridas / partiduras', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Proceso / Packing', 'Cicatrices / russet', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Cicatrices / russet', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Cicatrices / russet', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Proceso / Packing', 'Fruta inmadura / verde', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Fruta inmadura / verde', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Fruta inmadura / verde', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Proceso / Packing', 'Fruta sobremadura', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Fruta sobremadura', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Fruta sobremadura', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Proceso / Packing', 'Pedicelo', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Pedicelo', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Pedicelo', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Proceso / Packing', 'Restos florales', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Restos florales', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Restos florales', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Proceso / Packing', 'Bloom / pruina', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Bloom / pruina', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Materia extraña', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Materia extraña', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Materia extraña', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Proceso / Packing', 'Uniformidad', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Uniformidad', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Defectos posteriores al proceso', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Defectos posteriores al proceso', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Defectos posteriores al proceso', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Proceso / Packing', 'Tipo de envase', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Proceso / Packing', 'Tipo de envase', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Tipo de envase', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Integridad del envase', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Proceso / Packing', 'Integridad del envase', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Integridad del envase', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Limpieza del envase', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Proceso / Packing', 'Limpieza del envase', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Limpieza del envase', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Peso neto', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Proceso / Packing', 'Peso neto', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Peso neto', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Rotulación', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Proceso / Packing', 'Rotulación', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Rotulación', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Proceso / Packing', 'Correspondencia lote/envase', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Proceso / Packing', 'Correspondencia lote/envase', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Proceso / Packing', 'Trazabilidad de embalaje', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Proceso / Packing', 'Trazabilidad de embalaje', 'SAG-SMR-PAR-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Proceso / Packing', 'Trazabilidad de embalaje', 'SAG-SA-USA-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Proceso / Packing', 'Trazabilidad de embalaje', 'SAG-PNLB-2026', 'FUENTE_NORMATIVA_SAG'),('Pre-frío / Frío / Almacenamiento', 'Identificación del lote', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Pre-frío / Frío / Almacenamiento', 'Identificación del lote', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Pre-frío / Frío / Almacenamiento', 'Ubicación', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Pre-frío / Frío / Almacenamiento', 'Ubicación', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Pre-frío / Frío / Almacenamiento', 'Fecha/hora de ingreso', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Pre-frío / Frío / Almacenamiento', 'Fecha/hora de ingreso', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Pre-frío / Frío / Almacenamiento', 'Temperatura de producto', 'SAG-PNLB-2026', 'REFERENCIA_CONDICIONAL_FITOSANITARIA'),('Pre-frío / Frío / Almacenamiento', 'Temperatura de producto', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Pre-frío / Frío / Almacenamiento', 'Temperatura de cámara', 'SAG-PNLB-2026', 'REFERENCIA_CONDICIONAL_FITOSANITARIA'),('Pre-frío / Frío / Almacenamiento', 'Temperatura de cámara', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Pre-frío / Frío / Almacenamiento', 'Humedad relativa, cuando aplique', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Humedad relativa, cuando aplique', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Humedad relativa, cuando aplique', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Pre-frío / Frío / Almacenamiento', 'Condición general', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Condición general', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Firmeza', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Firmeza', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Firmeza', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Deshidratación', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Deshidratación', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Deshidratación', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Pre-frío / Frío / Almacenamiento', 'Pudrición', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Pudrición', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Pudrición', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Pre-frío / Frío / Almacenamiento', 'Daño mecánico', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Daño mecánico', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Daño mecánico', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Pre-frío / Frío / Almacenamiento', 'Condensación / humedad superficial', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Condensación / humedad superficial', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Materia extraña', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Materia extraña', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Materia extraña', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Pre-frío / Frío / Almacenamiento', 'Integridad del embalaje', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Pre-frío / Frío / Almacenamiento', 'Integridad del embalaje', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Integridad del embalaje', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Condición del envase', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Pre-frío / Frío / Almacenamiento', 'Condición del envase', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Condición del envase', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Pre-frío / Frío / Almacenamiento', 'Ubicación / trazabilidad física', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Pre-frío / Frío / Almacenamiento', 'Ubicación / trazabilidad física', 'SAG-SMR-PAR-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Pre-frío / Frío / Almacenamiento', 'Ubicación / trazabilidad física', 'SAG-SA-USA-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Pre-frío / Frío / Almacenamiento', 'Ubicación / trazabilidad física', 'SAG-PNLB-2026', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Folio de lote', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Folio de lote', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Pre-Despacho', 'Productor', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Productor', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Pre-Despacho', 'Variedad', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Variedad', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Pre-Despacho', 'Fecha de cosecha', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Fecha de cosecha', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Pre-Despacho', 'Fecha de embalaje', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Fecha de embalaje', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Pre-Despacho', 'Tipo de envase', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Inspección Pre-Despacho', 'Tipo de envase', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Tipo de envase', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Mercado / destino', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Mercado / destino', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Pre-Despacho', 'Cliente', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Cliente', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Pre-Despacho', 'Condición general', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Condición general', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Color', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Color', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Color', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Firmeza', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Firmeza', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Firmeza', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Sólidos solubles (°Brix)', 'USDA-AMS-BLUE-2002', 'REFERENCIA_NO_METODO_BRIX'),('Inspección Pre-Despacho', 'Calibre', 'UNECE-FFV57-2023', 'REFERENCIA_NO_FIJA_CALIBRE'),('Inspección Pre-Despacho', 'Calibre', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Calibre', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Pudrición', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Pudrición', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Pudrición', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Pre-Despacho', 'Fruta blanda', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Fruta blanda', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Deshidratación', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Deshidratación', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Deshidratación', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Pre-Despacho', 'Daño mecánico / machucón', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Daño mecánico / machucón', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Daño mecánico / machucón', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Pre-Despacho', 'Heridas / partiduras', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Heridas / partiduras', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Heridas / partiduras', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Pre-Despacho', 'Cicatrices / russet', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Cicatrices / russet', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Cicatrices / russet', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Pre-Despacho', 'Fruta inmadura', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Fruta inmadura', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Fruta inmadura', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Pre-Despacho', 'Fruta sobremadura', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Fruta sobremadura', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Fruta sobremadura', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Pre-Despacho', 'Pedicelo', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Pedicelo', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Pedicelo', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Pre-Despacho', 'Restos florales', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Restos florales', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Restos florales', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Pre-Despacho', 'Bloom / pruina', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Bloom / pruina', 'USDA-AMS-BLUE-2002', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Materia extraña', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Materia extraña', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Materia extraña', 'USDA-AMS-BLUE-2002', 'REFERENCIA_CONDICIONAL_ATRIBUTO'),('Inspección Pre-Despacho', 'Plagas / daño de plagas', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Plagas / daño de plagas', 'SAG-SMR-PAR-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Inspección Pre-Despacho', 'Plagas / daño de plagas', 'SAG-SA-USA-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Inspección Pre-Despacho', 'Plagas / daño de plagas', 'SAG-PNLB-2026', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Integridad del envase', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Inspección Pre-Despacho', 'Integridad del envase', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Integridad del envase', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Limpieza', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Inspección Pre-Despacho', 'Limpieza', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Limpieza', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Peso neto', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Inspección Pre-Despacho', 'Peso neto', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Peso neto', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Rotulación', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Inspección Pre-Despacho', 'Rotulación', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Rotulación', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Inspección Pre-Despacho', 'Correspondencia etiqueta-lote', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Correspondencia etiqueta-lote', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Pre-Despacho', 'Correspondencia etiqueta-mercado', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Correspondencia etiqueta-mercado', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Pre-Despacho', 'Trazabilidad', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Trazabilidad', 'SAG-SMR-PAR-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Inspección Pre-Despacho', 'Trazabilidad', 'SAG-SA-USA-2026', 'FUENTE_O_REGISTRO_SAG_MERCADO_ESPECIFICO'),('Inspección Pre-Despacho', 'Trazabilidad', 'SAG-PNLB-2026', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Temperatura del producto', 'SAG-PNLB-2026', 'REFERENCIA_CONDICIONAL_FITOSANITARIA'),('Inspección Pre-Despacho', 'Temperatura del producto', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Inspección Pre-Despacho', 'Documentación asociada', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Inspección Pre-Despacho', 'Documentación asociada', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Folio de lote', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Folio de lote', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Productor', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Productor', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Variedad', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Variedad', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Cliente', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Cliente', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Mercado / destino', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Mercado / destino', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Documento de despacho', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Documento de despacho', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Identificación de pallets / unidades', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Identificación de pallets / unidades', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Identificación del vehículo / contenedor', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Identificación del vehículo / contenedor', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Condición de limpieza', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Despacho / Embarque', 'Condición de limpieza', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Despacho / Embarque', 'Condición de limpieza', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Despacho / Embarque', 'Integridad del vehículo / contenedor', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Despacho / Embarque', 'Integridad del vehículo / contenedor', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Despacho / Embarque', 'Integridad del vehículo / contenedor', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Despacho / Embarque', 'Temperatura configurada / requerida', 'SAG-PNLB-2026', 'REFERENCIA_CONDICIONAL_FITOSANITARIA'),('Despacho / Embarque', 'Temperatura configurada / requerida', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Temperatura de producto', 'SAG-PNLB-2026', 'REFERENCIA_CONDICIONAL_FITOSANITARIA'),('Despacho / Embarque', 'Temperatura de producto', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Integridad del embalaje', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Despacho / Embarque', 'Integridad del embalaje', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Despacho / Embarque', 'Integridad del embalaje', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Despacho / Embarque', 'Sellos / identificación de seguridad, cuando aplique', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Sellos / identificación de seguridad, cuando aplique', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Correspondencia documental', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Correspondencia documental', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Rotulación', 'SAG-R7550-2021', 'REFERENCIA_CONDICIONAL_SAG'),('Despacho / Embarque', 'Rotulación', 'UNECE-FFV57-2023', 'REFERENCIA_TECNICA'),('Despacho / Embarque', 'Rotulación', 'CODEX-CXS349-2022', 'REFERENCIA_TECNICA'),('Despacho / Embarque', 'Documentación de exportación', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Documentación de exportación', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG'),('Despacho / Embarque', 'Estado de liberación del lote', 'SAG-R7550-2021', 'FUENTE_NORMATIVA_SAG'),('Despacho / Embarque', 'Estado de liberación del lote', 'SAG-EXP-GENERAL', 'REFERENCIA_INSTITUCIONAL_SAG');

DO $$
DECLARE
  v_matrix_criteria INTEGER;
  v_matrix_criteria_with_sources INTEGER;
  v_matrix_links INTEGER;
  v_active_criteria INTEGER;
BEGIN
  SELECT count(*) INTO v_matrix_criteria FROM qnx_matrix_criteria;
  SELECT count(*) INTO v_matrix_criteria_with_sources
  FROM (SELECT DISTINCT stage_name, criterion_name FROM qnx_matrix_source_links) q;
  SELECT count(*) INTO v_matrix_links FROM qnx_matrix_source_links;
  SELECT count(*) INTO v_active_criteria
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN species s ON s.id = ip.species_id
  WHERE md.is_active
    AND ip.is_active
    AND s.is_active
    AND lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano');
  IF v_matrix_criteria <> 185
     OR v_matrix_criteria_with_sources <> 168
     OR v_matrix_links <> 434
     OR v_active_criteria <> 185 THEN
    RAISE EXCEPTION 'Auditoría de matriz fallida: criterios=% criterios_con_fuente=% links=% activos=%', v_matrix_criteria, v_matrix_criteria_with_sources, v_matrix_links, v_active_criteria;
  END IF;
END $$;

CREATE TEMP TABLE qnx_expected_associations AS
SELECT DISTINCT
  md.id AS measurement_def_id,
  nr.id AS normative_reference_id,
  ml.relationship AS relationship
FROM qnx_matrix_source_links ml
JOIN measurement_defs md
  ON lower(md.name) = lower(ml.criterion_name)
JOIN inspection_points ip
  ON ip.id = md.inspection_point_id
JOIN species s
  ON s.id = ip.species_id
JOIN operational_stages os
  ON os.id = ip.operational_stage_id
JOIN qnx_normative_sources src
  ON src.reference_code = ml.reference_code
JOIN normative_references nr
  ON nr.company_id IS NULL
 AND nr.source_name = src.source_name
 AND nr.document_name IS NOT DISTINCT FROM src.document_name
 AND nr.version IS NOT DISTINCT FROM src.version
 AND nr.market IS NOT DISTINCT FROM src.market
 AND nr.protocol_name IS NOT DISTINCT FROM src.protocol_name
 AND nr.is_active
WHERE md.is_active
  AND ip.is_active
  AND s.is_active
  AND os.is_active
  AND lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano')
  AND lower(os.name) = lower(ml.stage_name);

INSERT INTO measurement_def_normative_refs (
  measurement_def_id, normative_reference_id, relationship
)
SELECT measurement_def_id, normative_reference_id, relationship
FROM qnx_expected_associations
ON CONFLICT (measurement_def_id, normative_reference_id) DO NOTHING;

DO $$
DECLARE
  v_missing INTEGER;
  v_associations INTEGER;
BEGIN
  SELECT count(*) INTO v_missing
  FROM qnx_expected_associations e
  LEFT JOIN measurement_def_normative_refs r
    ON r.measurement_def_id = e.measurement_def_id
   AND r.normative_reference_id = e.normative_reference_id
  WHERE r.measurement_def_id IS NULL;
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'Faltan % asociaciones normativas de la matriz', v_missing;
  END IF;
  SELECT count(*) INTO v_associations FROM qnx_expected_associations;
  RAISE NOTICE 'Asociaciones normativas verificadas: %', v_associations;
END $$;

CREATE TEMP TABLE qnx_qualitynx_sampling_rule AS
SELECT jsonb_build_object(
  'basis', 'theoretical_weight_kg',
  'divisor', 100,
  'weight_kg', 1000,
  'samples_per_weight_kg', 10,
  'rounding', 'ceil',
  'min_samples', 1,
  'operational_label', 'REGLA OPERACIONAL BASE QUALITYNX',
  'classification', 'NO NORMA SAG UNIVERSAL',
  'formula', 'N = CEIL(kg / 1000 × 10)',
  'source', 'CURRENT.md §13.1'
)::JSONB AS rule;

UPDATE sampling_plans sp
SET name = 'REGLA OPERACIONAL BASE QUALITYNX',
    rule = r.rule,
    sampling_unit = 'Muestra',
    origin_context = 'Peso teórico del lote en kg',
    method_text = 'N = CEIL(kg teóricos / 1000 × 10)',
    instrument_text = 'No aplica: cálculo operacional',
    is_active = true,
    version = sp.version + CASE
      WHEN sp.rule IS DISTINCT FROM r.rule
        OR lower(sp.name) <> lower('REGLA OPERACIONAL BASE QUALITYNX')
        OR sp.sampling_unit IS DISTINCT FROM 'Muestra'
        OR sp.origin_context IS DISTINCT FROM 'Peso teórico del lote en kg'
        OR sp.method_text IS DISTINCT FROM 'N = CEIL(kg teóricos / 1000 × 10)'
        OR sp.instrument_text IS DISTINCT FROM 'No aplica: cálculo operacional'
      THEN 1 ELSE 0
    END
FROM qnx_qualitynx_sampling_rule r
WHERE lower(sp.name) = lower('Regla operacional base QualityNX')
  AND EXISTS (
    SELECT 1
    FROM inspection_points ip
    JOIN species s ON s.id = ip.species_id
    WHERE ip.id = sp.inspection_point_id
      AND ip.is_active
      AND s.is_active
      AND lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano')
  );

INSERT INTO sampling_plans (
  company_id, inspection_point_id, name, rule, sampling_unit, origin_context,
  method_text, instrument_text, is_active, version, created_by
)
SELECT
  ip.company_id,
  ip.id,
  'REGLA OPERACIONAL BASE QUALITYNX',
  r.rule,
  'Muestra',
  'Peso teórico del lote en kg',
  'N = CEIL(kg teóricos / 1000 × 10)',
  'No aplica: cálculo operacional',
  true,
  1,
  NULL::UUID
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
CROSS JOIN qnx_qualitynx_sampling_rule r
WHERE ip.is_active
  AND s.is_active
  AND lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano')
  AND NOT EXISTS (
    SELECT 1
    FROM sampling_plans sp
    WHERE sp.inspection_point_id = ip.id
      AND lower(sp.name) = lower('REGLA OPERACIONAL BASE QUALITYNX')
  );

DO $$
DECLARE
  v_points INTEGER;
  v_base_plans INTEGER;
  v_invalid_rules INTEGER;
BEGIN
  SELECT count(*) INTO v_points
  FROM inspection_points ip
  JOIN species s ON s.id = ip.species_id
  WHERE ip.is_active
    AND s.is_active
    AND lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano');
  SELECT count(*) INTO v_base_plans
  FROM sampling_plans sp
  JOIN inspection_points ip ON ip.id = sp.inspection_point_id
  JOIN species s ON s.id = ip.species_id
  WHERE sp.is_active
    AND ip.is_active
    AND s.is_active
    AND lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano')
    AND lower(sp.name) = lower('REGLA OPERACIONAL BASE QUALITYNX');
  SELECT count(*) INTO v_invalid_rules
  FROM sampling_plans sp
  WHERE sp.is_active
    AND lower(sp.name) = lower('REGLA OPERACIONAL BASE QUALITYNX')
    AND (
      sp.rule->>'basis' IS DISTINCT FROM 'theoretical_weight_kg'
      OR (sp.rule->>'divisor')::NUMERIC IS DISTINCT FROM 100::NUMERIC
      OR sp.rule->>'rounding' IS DISTINCT FROM 'ceil'
      OR sp.rule->>'operational_label' IS DISTINCT FROM 'REGLA OPERACIONAL BASE QUALITYNX'
      OR sp.rule->>'classification' IS DISTINCT FROM 'NO NORMA SAG UNIVERSAL'
    );
  IF v_points <> 7 OR v_base_plans <> v_points OR v_invalid_rules > 0 THEN
    RAISE EXCEPTION 'Auditoría de muestreo fallida: puntos=% planes_base=% reglas_invalidas=%', v_points, v_base_plans, v_invalid_rules;
  END IF;
  RAISE NOTICE 'Planes base QualityNX verificados: %', v_base_plans;
END $$;

DO $$
DECLARE
  v_active_packaging INTEGER;
  v_active_criteria INTEGER;
  v_active_normative_sources INTEGER;
  v_active_base_plans INTEGER;
BEGIN
  SELECT count(*) INTO v_active_packaging
  FROM packaging_types
  WHERE is_active;
  SELECT count(*) INTO v_active_criteria
  FROM measurement_defs md
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN species s ON s.id = ip.species_id
  WHERE md.is_active
    AND ip.is_active
    AND s.is_active
    AND lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano');
  SELECT count(*) INTO v_active_normative_sources
  FROM normative_references nr
  JOIN qnx_normative_sources s
    ON nr.company_id IS NULL
   AND nr.source_name = s.source_name
   AND nr.document_name IS NOT DISTINCT FROM s.document_name
   AND nr.version IS NOT DISTINCT FROM s.version
   AND nr.market IS NOT DISTINCT FROM s.market
   AND nr.protocol_name IS NOT DISTINCT FROM s.protocol_name
  WHERE nr.is_active;
  SELECT count(*) INTO v_active_base_plans
  FROM sampling_plans
  WHERE is_active
    AND lower(name) = lower('REGLA OPERACIONAL BASE QUALITYNX');
  RAISE NOTICE 'Auditoría final: embalajes=%; criterios=%; fuentes=%; planes_base=%', v_active_packaging, v_active_criteria, v_active_normative_sources, v_active_base_plans;
END $$;
