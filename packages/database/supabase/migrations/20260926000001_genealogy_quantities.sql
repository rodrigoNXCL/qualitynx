-- QualityNX — D-031: Cantidades aportadas en genealogía de palletizado/repalletizado
-- 2026-09-26 | Brecha verificada: lot_genealogy no registraba cantidades por origen.
-- Reutiliza lot_genealogy y lot_type existentes. No crea estructuras paralelas.
-- No inventa reglas de mezcla ni compatibilidad comercial.

ALTER TABLE lot_genealogy
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lot_genealogy_quantity_check'
  ) THEN
    ALTER TABLE lot_genealogy ADD CONSTRAINT lot_genealogy_quantity_check
      CHECK (quantity IS NULL OR quantity >= 0);
  END IF;
END $$;

COMMENT ON COLUMN lot_genealogy.quantity IS
  'Cantidad aportada por el lote origen al lote derivado (pallet/resultado). NULL si no está disponible.';
COMMENT ON COLUMN lot_genealogy.unit IS
  'Unidad de la cantidad aportada (kg, envases, cajas, pallets). NULL si no está disponible.';

CREATE INDEX IF NOT EXISTS idx_lot_genealogy_derived_qty
  ON lot_genealogy (derived_lot_id)
  WHERE quantity IS NOT NULL;
