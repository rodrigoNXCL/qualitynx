CREATE TEMP TABLE qnx_base_catalog (
  stage_name TEXT NOT NULL,
  name TEXT NOT NULL,
  value_type TEXT NOT NULL,
  unit TEXT,
  sort_order INTEGER NOT NULL,
  legacy_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  PRIMARY KEY (stage_name, name)
) ON COMMIT DROP;

INSERT INTO qnx_base_catalog (stage_name, name, value_type, unit, sort_order, legacy_names) VALUES
  ('Inspección Huerto', 'Identificación del lote', 'texto', NULL, 10, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Variedad', 'texto', NULL, 20, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Estado de madurez', 'lista', NULL, 30, ARRAY['Madurez']::TEXT[]),
  ('Inspección Huerto', 'Color', 'lista', NULL, 40, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Firmeza', 'numérica', NULL, 50, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Sólidos solubles (°Brix)', 'numérica', '°Bx', 60, ARRAY['Brix']::TEXT[]),
  ('Inspección Huerto', 'Calibre', 'numérica', 'mm', 70, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Condición general de fruta', 'lista', NULL, 80, ARRAY['Condición']::TEXT[]),
  ('Inspección Huerto', 'Pudrición', 'porcentaje', '%', 90, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Daño mecánico / machucón', 'porcentaje', '%', 100, ARRAY['Daño mecánico']::TEXT[]),
  ('Inspección Huerto', 'Deshidratación', 'porcentaje', '%', 110, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Fruta inmadura / verde', 'porcentaje', '%', 120, ARRAY['Fruta inmadura']::TEXT[]),
  ('Inspección Huerto', 'Fruta sobremadura', 'porcentaje', '%', 130, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Cicatrices / russet', 'texto', NULL, 140, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Daño fisiológico', 'texto', NULL, 150, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Materia extraña', 'lista', NULL, 160, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Presencia de plagas / daño de plagas', 'texto', NULL, 170, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Pedicelo / restos florales', 'texto', NULL, 180, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Bloom / pruina', 'texto', NULL, 190, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Heridas / partiduras', 'texto', NULL, 200, ARRAY[]::TEXT[]),
  ('Inspección Huerto', 'Observaciones técnicas', 'texto', NULL, 210, ARRAY[]::TEXT[]),

  ('Control de Cosecha', 'Identificación del lote', 'texto', NULL, 10, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Productor', 'texto', NULL, 20, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Variedad', 'texto', NULL, 30, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Estado de madurez', 'lista', NULL, 40, ARRAY['Madurez']::TEXT[]),
  ('Control de Cosecha', 'Color', 'lista', NULL, 50, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Firmeza', 'numérica', NULL, 60, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Sólidos solubles (°Brix)', 'numérica', '°Bx', 70, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Calibre', 'numérica', 'mm', 80, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Pudrición', 'porcentaje', '%', 90, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Daño mecánico / machucón', 'porcentaje', '%', 100, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Deshidratación', 'porcentaje', '%', 110, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Fruta inmadura / verde', 'porcentaje', '%', 120, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Fruta sobremadura', 'porcentaje', '%', 130, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Cicatrices / russet', 'texto', NULL, 140, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Bloom / pruina', 'texto', NULL, 150, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Pedicelo / restos florales', 'texto', NULL, 160, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Heridas / partiduras', 'texto', NULL, 170, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Materia extraña', 'lista', NULL, 180, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Presencia de plagas / daño de plagas', 'texto', NULL, 190, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Condición general de cosecha', 'lista', NULL, 200, ARRAY['Condición general']::TEXT[]),
  ('Control de Cosecha', 'Fruta cosechada húmeda', 'sí/no', NULL, 210, ARRAY[]::TEXT[]),
  ('Control de Cosecha', 'Temperatura de fruta', 'temperatura', '°C', 220, ARRAY['Temperatura']::TEXT[]),
  ('Control de Cosecha', 'Observaciones', 'texto', NULL, 230, ARRAY[]::TEXT[]),

  ('Recepción Frigorífico / Packing', 'Folio de lote', 'texto', NULL, 10, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Guía del productor', 'texto', NULL, 20, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Productor', 'texto', NULL, 30, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Variedad', 'texto', NULL, 40, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Fecha de cosecha', 'fecha', NULL, 50, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Fecha/hora de recepción', 'fecha-hora', NULL, 60, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Procedencia / bloque', 'texto', NULL, 70, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Temperatura de fruta', 'temperatura', '°C', 80, ARRAY['Temperatura de recepción']::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Condición general', 'lista', NULL, 90, ARRAY['Condición de fruta']::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Firmeza', 'numérica', NULL, 100, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Sólidos solubles (°Brix)', 'numérica', '°Bx', 110, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Calibre', 'numérica', 'mm', 120, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Pudrición', 'porcentaje', '%', 130, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Fruta blanda', 'sí/no', NULL, 140, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Deshidratación', 'porcentaje', '%', 150, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Daño mecánico / machucón', 'porcentaje', '%', 160, ARRAY['Daño mecánico']::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Heridas / partiduras', 'texto', NULL, 170, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Cicatrices / russet', 'texto', NULL, 180, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Fruta inmadura / verde', 'porcentaje', '%', 190, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Fruta sobremadura', 'porcentaje', '%', 200, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Pedicelo / restos florales', 'texto', NULL, 210, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Bloom / pruina', 'texto', NULL, 220, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Materia extraña', 'lista', NULL, 230, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Presencia de plagas / daño de plagas', 'texto', NULL, 240, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Integridad del embalaje', 'lista', NULL, 250, ARRAY['Condición del embalaje']::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Limpieza del embalaje', 'sí/no', NULL, 260, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Condición del envase', 'texto', NULL, 270, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Peso / cantidad recibida', 'texto', NULL, 280, ARRAY[]::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Correspondencia documental', 'lista', NULL, 290, ARRAY['Correspondencia con origen']::TEXT[]),
  ('Recepción Frigorífico / Packing', 'Observaciones', 'texto', NULL, 300, ARRAY[]::TEXT[]),

  ('Proceso / Packing', 'Identificación del lote', 'texto', NULL, 10, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Variedad', 'texto', NULL, 20, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Condición general', 'lista', NULL, 30, ARRAY['Condición del producto']::TEXT[]),
  ('Proceso / Packing', 'Calibre', 'numérica', 'mm', 40, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Color', 'lista', NULL, 50, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Firmeza', 'numérica', NULL, 60, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Sólidos solubles (°Brix)', 'numérica', '°Bx', 70, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Pudrición', 'porcentaje', '%', 80, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Fruta blanda', 'sí/no', NULL, 90, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Deshidratación', 'porcentaje', '%', 100, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Daño mecánico / machucón', 'porcentaje', '%', 110, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Heridas / partiduras', 'texto', NULL, 120, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Cicatrices / russet', 'texto', NULL, 130, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Fruta inmadura / verde', 'porcentaje', '%', 140, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Fruta sobremadura', 'porcentaje', '%', 150, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Pedicelo', 'texto', NULL, 160, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Restos florales', 'texto', NULL, 170, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Bloom / pruina', 'texto', NULL, 180, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Materia extraña', 'texto', NULL, 190, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Uniformidad', 'lista', NULL, 200, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Eficacia de selección', 'texto', NULL, 210, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Defectos posteriores al proceso', 'texto', NULL, 220, ARRAY['Defectos']::TEXT[]),
  ('Proceso / Packing', 'Tipo de envase', 'texto', NULL, 230, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Integridad del envase', 'lista', NULL, 240, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Limpieza del envase', 'sí/no', NULL, 250, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Peso neto', 'texto', NULL, 260, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Calibre declarado', 'texto', NULL, 270, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Rotulación', 'lista', NULL, 280, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Correspondencia lote/envase', 'texto', NULL, 290, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Trazabilidad de embalaje', 'texto', NULL, 300, ARRAY[]::TEXT[]),
  ('Proceso / Packing', 'Observaciones', 'texto', NULL, 310, ARRAY[]::TEXT[]),

  ('Pre-frío / Frío / Almacenamiento', 'Identificación del lote', 'texto', NULL, 10, ARRAY['Identificación']::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Ubicación', 'texto', NULL, 20, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Cámara / equipo', 'texto', NULL, 30, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Fecha/hora de ingreso', 'fecha-hora', NULL, 40, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Temperatura de producto', 'temperatura', '°C', 50, ARRAY['Temperatura']::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Temperatura de cámara', 'temperatura', '°C', 60, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Humedad relativa, cuando aplique', 'porcentaje', '%', 70, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Tiempo de permanencia', 'texto', NULL, 80, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Estado del proceso de enfriamiento', 'texto', NULL, 90, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Condición general', 'lista', NULL, 100, ARRAY['Condición del producto']::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Firmeza', 'numérica', NULL, 110, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Deshidratación', 'porcentaje', '%', 120, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Pudrición', 'porcentaje', '%', 130, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Daño mecánico', 'texto', NULL, 140, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Condensación / humedad superficial', 'lista', NULL, 150, ARRAY['Condensación / humedad']::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Alteraciones visibles', 'texto', NULL, 160, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Materia extraña', 'texto', NULL, 170, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Integridad del embalaje', 'lista', NULL, 180, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Condición del envase', 'texto', NULL, 190, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Ubicación / trazabilidad física', 'texto', NULL, 200, ARRAY[]::TEXT[]),
  ('Pre-frío / Frío / Almacenamiento', 'Observaciones', 'texto', NULL, 210, ARRAY[]::TEXT[]),

  ('Inspección Pre-Despacho', 'Folio de lote', 'texto', NULL, 10, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Productor', 'texto', NULL, 20, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Variedad', 'texto', NULL, 30, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Fecha de cosecha', 'fecha', NULL, 40, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Fecha de embalaje', 'fecha', NULL, 50, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Tipo de envase', 'texto', NULL, 60, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Mercado / destino', 'texto', NULL, 70, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Cliente', 'texto', NULL, 80, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Condición general', 'lista', NULL, 90, ARRAY['Condición visual']::TEXT[]),
  ('Inspección Pre-Despacho', 'Color', 'texto', NULL, 100, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Firmeza', 'numérica', NULL, 110, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Sólidos solubles (°Brix)', 'numérica', '°Bx', 120, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Calibre', 'numérica', 'mm', 130, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Pudrición', 'porcentaje', '%', 140, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Fruta blanda', 'sí/no', NULL, 150, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Deshidratación', 'porcentaje', '%', 160, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Daño mecánico / machucón', 'porcentaje', '%', 170, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Heridas / partiduras', 'texto', NULL, 180, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Cicatrices / russet', 'texto', NULL, 190, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Fruta inmadura', 'porcentaje', '%', 200, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Fruta sobremadura', 'porcentaje', '%', 210, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Pedicelo', 'texto', NULL, 220, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Restos florales', 'texto', NULL, 230, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Bloom / pruina', 'texto', NULL, 240, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Materia extraña', 'texto', NULL, 250, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Plagas / daño de plagas', 'texto', NULL, 260, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Integridad del envase', 'lista', NULL, 270, ARRAY['Integridad del embalaje']::TEXT[]),
  ('Inspección Pre-Despacho', 'Limpieza', 'sí/no', NULL, 280, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Peso neto', 'texto', NULL, 290, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Uniformidad', 'texto', NULL, 300, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Rotulación', 'lista', NULL, 310, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Correspondencia etiqueta-lote', 'texto', NULL, 320, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Correspondencia etiqueta-mercado', 'texto', NULL, 330, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Trazabilidad', 'texto', NULL, 340, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Temperatura del producto', 'temperatura', '°C', 350, ARRAY['Temperatura']::TEXT[]),
  ('Inspección Pre-Despacho', 'Condición de almacenamiento', 'texto', NULL, 360, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Documentación asociada', 'texto', NULL, 370, ARRAY[]::TEXT[]),
  ('Inspección Pre-Despacho', 'Observaciones', 'texto', NULL, 380, ARRAY[]::TEXT[]),

  ('Despacho / Embarque', 'Folio de lote', 'texto', NULL, 10, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Productor', 'texto', NULL, 20, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Variedad', 'texto', NULL, 30, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Cliente', 'texto', NULL, 40, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Mercado / destino', 'texto', NULL, 50, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Documento de despacho', 'texto', NULL, 60, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Identificación de pallets / unidades', 'texto', NULL, 70, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Identificación del vehículo / contenedor', 'texto', NULL, 80, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Condición de limpieza', 'sí/no', NULL, 90, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Integridad del vehículo / contenedor', 'sí/no', NULL, 100, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Temperatura configurada / requerida', 'texto', NULL, 110, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Temperatura de producto', 'temperatura', '°C', 120, ARRAY['Temperatura']::TEXT[]),
  ('Despacho / Embarque', 'Condiciones de carga', 'texto', NULL, 130, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Integridad del embalaje', 'lista', NULL, 140, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Sellos / identificación de seguridad, cuando aplique', 'texto', NULL, 150, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Correspondencia documental', 'texto', NULL, 160, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Rotulación', 'lista', NULL, 170, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Documentación de exportación', 'texto', NULL, 180, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Estado de liberación del lote', 'texto', NULL, 190, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Observaciones', 'texto', NULL, 200, ARRAY[]::TEXT[]),
  ('Despacho / Embarque', 'Evidencia de despacho, cuando corresponda', 'texto', NULL, 210, ARRAY[]::TEXT[])
;

CREATE TEMP TABLE qnx_legacy_rows (
  stage_name TEXT NOT NULL,
  legacy_name TEXT NOT NULL,
  PRIMARY KEY (stage_name, legacy_name)
) ON COMMIT DROP;

INSERT INTO qnx_legacy_rows (stage_name, legacy_name) VALUES
  ('Inspección Huerto', 'Acidez'),
  ('Inspección Huerto', 'Brix'),
  ('Inspección Huerto', 'Calibre'),
  ('Inspección Huerto', 'Color'),
  ('Inspección Huerto', 'Condición'),
  ('Inspección Huerto', 'Condición visual'),
  ('Inspección Huerto', 'Daño mecánico'),
  ('Inspección Huerto', 'Defectos'),
  ('Inspección Huerto', 'Deshidratación'),
  ('Inspección Huerto', 'Firmeza'),
  ('Inspección Huerto', 'Fruta inmadura'),
  ('Inspección Huerto', 'Fruta sobremadura'),
  ('Inspección Huerto', 'Madurez'),
  ('Inspección Huerto', 'Materia extraña'),
  ('Inspección Huerto', 'Peso'),
  ('Inspección Huerto', 'pH'),
  ('Inspección Huerto', 'Pudrición'),
  ('Control de Cosecha', 'Brix E2E'),
  ('Control de Cosecha', 'Identificación del lote'),
  ('Control de Cosecha', 'Madurez'),
  ('Control de Cosecha', 'Color'),
  ('Control de Cosecha', 'Condición general'),
  ('Control de Cosecha', 'Materia extraña'),
  ('Control de Cosecha', 'Temperatura'),
  ('Recepción Frigorífico / Packing', 'Identificación del lote'),
  ('Recepción Frigorífico / Packing', 'Condición del embalaje'),
  ('Recepción Frigorífico / Packing', 'Temperatura de recepción'),
  ('Recepción Frigorífico / Packing', 'Condición de fruta'),
  ('Recepción Frigorífico / Packing', 'Pudrición'),
  ('Recepción Frigorífico / Packing', 'Daño mecánico'),
  ('Recepción Frigorífico / Packing', 'Deshidratación'),
  ('Recepción Frigorífico / Packing', 'Materia extraña'),
  ('Recepción Frigorífico / Packing', 'Correspondencia con origen'),
  ('Recepción Frigorífico / Packing', 'Observaciones'),
  ('Proceso / Packing', 'Condición del producto'),
  ('Proceso / Packing', 'Defectos'),
  ('Proceso / Packing', 'Calibre'),
  ('Proceso / Packing', 'Color'),
  ('Proceso / Packing', 'Uniformidad'),
  ('Proceso / Packing', 'Integridad del envase'),
  ('Proceso / Packing', 'Rotulación'),
  ('Proceso / Packing', 'Pudrición'),
  ('Pre-frío / Frío / Almacenamiento', 'Temperatura'),
  ('Pre-frío / Frío / Almacenamiento', 'Condición del producto'),
  ('Pre-frío / Frío / Almacenamiento', 'Integridad del embalaje'),
  ('Pre-frío / Frío / Almacenamiento', 'Condensación / humedad'),
  ('Pre-frío / Frío / Almacenamiento', 'Identificación'),
  ('Pre-frío / Frío / Almacenamiento', 'Observaciones'),
  ('Inspección Pre-Despacho', 'Identificación'),
  ('Inspección Pre-Despacho', 'Presentación'),
  ('Inspección Pre-Despacho', 'Integridad del embalaje'),
  ('Inspección Pre-Despacho', 'Rotulación'),
  ('Inspección Pre-Despacho', 'Condición visual'),
  ('Inspección Pre-Despacho', 'Temperatura'),
  ('Inspección Pre-Despacho', 'Pudrición'),
  ('Inspección Pre-Despacho', 'Documentación asociada'),
  ('Despacho / Embarque', 'Identificación'),
  ('Despacho / Embarque', 'Condición general'),
  ('Despacho / Embarque', 'Integridad del embalaje'),
  ('Despacho / Embarque', 'Rotulación'),
  ('Despacho / Embarque', 'Temperatura'),
  ('Despacho / Embarque', 'Observaciones')
;

DO $$
DECLARE
  v_duplicate_contexts INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_duplicate_contexts
  FROM (
    SELECT ip.company_id, ip.species_id, ip.operational_stage_id
    FROM inspection_points ip
    JOIN species s ON s.id = ip.species_id
    WHERE lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano')
      AND s.is_active
    GROUP BY ip.company_id, ip.species_id, ip.operational_stage_id
    HAVING COUNT(*) <> 1
  ) duplicates;
  IF v_duplicate_contexts > 0 THEN
    RAISE EXCEPTION 'Hay contextos de punto duplicados para Arándano; no se aplica el catálogo para evitar copiar criterios';
  END IF;
END $$;

WITH alias_map AS (
  SELECT c.stage_name, c.name AS canonical_name, c.sort_order, lower(l.legacy_name) AS legacy_name
  FROM qnx_base_catalog c
  CROSS JOIN LATERAL unnest(c.legacy_names) AS l(legacy_name)
),
target_aliases AS (
  SELECT
    md.id AS measurement_def_id,
    md.inspection_point_id,
    am.canonical_name,
    am.sort_order
  FROM measurement_defs md
  JOIN alias_map am ON lower(md.name) = am.legacy_name
  JOIN inspection_points ip ON ip.id = md.inspection_point_id
  JOIN species s ON s.id = ip.species_id
  JOIN operational_stages os ON os.id = ip.operational_stage_id
  WHERE lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano')
    AND s.is_active
    AND lower(os.name) = lower(am.stage_name)
    AND NOT EXISTS (
      SELECT 1
      FROM measurement_defs canonical
      WHERE canonical.inspection_point_id = md.inspection_point_id
        AND lower(canonical.name) = lower(am.canonical_name)
        AND canonical.id <> md.id
    )
)
UPDATE measurement_defs md
SET name = ta.canonical_name,
    is_active = true,
    sort_order = ta.sort_order,
    source_ref = COALESCE(md.source_ref, 'CATALOGO_BASE_ARANDANO_FRESCO_2026-09-23')
FROM target_aliases ta
WHERE md.id = ta.measurement_def_id;

INSERT INTO measurement_defs (
  company_id, inspection_point_id, name, value_type, unit,
  is_required, min_value, max_value, options, is_active,
  description, info_text, method_text, evidence_required,
  evaluation_kind, sort_order, validation_status, criteria_version
)
SELECT
  ip.company_id,
  ip.id,
  c.name,
  c.value_type::measurement_value_type,
  c.unit,
  false,
  NULL::NUMERIC,
  NULL::NUMERIC,
  NULL::TEXT[],
  true,
  'Criterio base de inspección; regla de aceptación no definida.',
  NULL,
  NULL,
  false,
  NULL,
  c.sort_order,
  'PENDIENTE DE VALIDACIÓN',
  1
FROM inspection_points ip
JOIN species s ON s.id = ip.species_id
JOIN operational_stages os ON os.id = ip.operational_stage_id
JOIN qnx_base_catalog c ON lower(c.stage_name) = lower(os.name)
WHERE lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano')
  AND s.is_active
  AND NOT EXISTS (
    SELECT 1
    FROM measurement_defs md
    WHERE md.inspection_point_id = ip.id
      AND lower(md.name) = lower(c.name)
  );

WITH target_defs AS (
  SELECT
    md.id AS measurement_def_id,
    c.sort_order
  FROM measurement_defs md
  JOIN qnx_base_catalog c
    ON lower(md.name) = lower(c.name)
  JOIN inspection_points ip
    ON ip.id = md.inspection_point_id
  JOIN species s
    ON s.id = ip.species_id
  JOIN operational_stages os
    ON os.id = ip.operational_stage_id
  WHERE lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano')
    AND s.is_active
    AND lower(os.name) = lower(c.stage_name)
)
UPDATE measurement_defs md
SET is_active = true,
    sort_order = td.sort_order,
    description = COALESCE(md.description, 'Criterio base de inspección; regla de aceptación no definida.'),
    source_ref = COALESCE(md.source_ref, 'CATALOGO_BASE_ARANDANO_FRESCO_2026-09-23')
FROM target_defs td
WHERE md.id = td.measurement_def_id;

WITH legacy_targets AS (
  SELECT md.id AS measurement_def_id
  FROM measurement_defs md
  JOIN qnx_legacy_rows legacy
    ON lower(md.name) = lower(legacy.legacy_name)
  JOIN inspection_points ip
    ON ip.id = md.inspection_point_id
  JOIN species s
    ON s.id = ip.species_id
  JOIN operational_stages os
    ON os.id = ip.operational_stage_id
  WHERE lower(s.name) IN ('arándanos', 'arandanos', 'arándano', 'arandano')
    AND s.is_active
    AND lower(os.name) = lower(legacy.stage_name)
    AND NOT EXISTS (
      SELECT 1
      FROM qnx_base_catalog c
      WHERE lower(c.stage_name) = lower(os.name)
        AND lower(c.name) = lower(md.name)
    )
)
UPDATE measurement_defs md
SET is_active = false
FROM legacy_targets lt
WHERE md.id = lt.measurement_def_id;

DO $$
DECLARE
  v_measurements INTEGER := 0;
  v_quality_evaluations INTEGER := 0;
  v_inspection_evidence INTEGER := 0;
  v_audit_logs INTEGER := 0;
  v_unknown_fks INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO v_measurements
  FROM measurements
  WHERE measurement_def_id = 'b5b6bfc3-c2ce-4cad-986d-ba1b57341ed6';

  SELECT COUNT(*) INTO v_quality_evaluations
  FROM quality_evaluations
  WHERE measurement_def_id = 'b5b6bfc3-c2ce-4cad-986d-ba1b57341ed6';

  SELECT COUNT(*) INTO v_inspection_evidence
  FROM inspection_evidence
  WHERE measurement_def_id = 'b5b6bfc3-c2ce-4cad-986d-ba1b57341ed6';

  SELECT COUNT(*) INTO v_audit_logs
  FROM audit_logs
  WHERE entity_id = 'b5b6bfc3-c2ce-4cad-986d-ba1b57341ed6';

  SELECT COUNT(*) INTO v_unknown_fks
  FROM pg_constraint c
  JOIN pg_class child ON child.oid = c.conrelid
  WHERE c.contype = 'f'
    AND c.confrelid = 'measurement_defs'::regclass
    AND child.relname NOT IN ('measurements', 'quality_evaluations', 'inspection_evidence');

  IF v_measurements = 0
     AND v_quality_evaluations = 0
     AND v_inspection_evidence = 0
     AND v_audit_logs = 0
     AND v_unknown_fks = 0 THEN
    DELETE FROM measurement_defs
    WHERE id = 'b5b6bfc3-c2ce-4cad-986d-ba1b57341ed6'
      AND name = 'Brix E2E';
  ELSE
    UPDATE measurement_defs
    SET is_active = false,
        description = COALESCE(description, 'Registro histórico de fixture E2E; no forma parte del catálogo base.'),
        source_ref = COALESCE(source_ref, 'HISTORICO_E2E_NO_USAR')
    WHERE id = 'b5b6bfc3-c2ce-4cad-986d-ba1b57341ed6'
      AND name = 'Brix E2E';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM measurement_defs
    WHERE is_active
      AND (
        lower(name) LIKE '%e2e%'
        OR lower(name) LIKE '%test%'
        OR lower(name) LIKE '%testing%'
        OR lower(name) LIKE '%demo%'
      )
  ) THEN
    RAISE EXCEPTION 'Quedaron criterios activos de prueba en measurement_defs';
  END IF;
END $$;

