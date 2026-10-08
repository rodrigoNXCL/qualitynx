-- QualityNX MASTER DATA — Extensión de PRODUCTORES (Chile)
-- Fecha: 2026-09-22
-- Fuente: solicitud directa del usuario + D-011
-- Agrega ficha completa de productor chileno y referencia interna
-- "Productor de Salida" para informes de embarque.

ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS rut VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS comuna VARCHAR(100),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gps_point TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
  ADD COLUMN IF NOT EXISTS salida_producer_id UUID REFERENCES producers(id);

-- RUT identifica al productor dentro de la empresa (no se pierde identidad interna)
CREATE UNIQUE INDEX IF NOT EXISTS idx_producers_company_rut
  ON producers (company_id, rut)
  WHERE rut IS NOT NULL;

-- Un productor no puede ser su propio productor de salida
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_producers_salida_not_self'
  ) THEN
    ALTER TABLE producers
      ADD CONSTRAINT chk_producers_salida_not_self
      CHECK (salida_producer_id IS NULL OR salida_producer_id <> id);
  END IF;
END $$;

COMMENT ON COLUMN producers.rut IS 'RUT del productor (único dentro de la empresa)';
COMMENT ON COLUMN producers.gps_point IS 'Punto GPS en texto libre (ej: -33.45, -70.67)';
COMMENT ON COLUMN producers.salida_producer_id IS 'Productor de Salida asociado (uso interno; informes de embarque muestran solo info válida de productores)';
