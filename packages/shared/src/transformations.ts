/**
 * QualityNX — D-032: REGLAS DE TRANSFORMACIÓN (lógica pura, sin base de datos)
 *
 * Estas reglas son la MISMA especificación que aplica la función SQL
 * `validate_lot_transformation`. Existen en dos lugares a propósito:
 * la base de datos es la autoridad (nadie puede saltarse la validación
 * saltándose la interfaz) y estas funciones permiten validar en pantalla
 * y probar las reglas sin conexión.
 *
 * Son reglas OPERACIONALES del sistema (conservar entradas, salidas,
 * remanentes y mermas). No son reglas normativas de calidad y no inventan
 * tolerancias, umbrales ni conversiones.
 */

export const TransformationType = {
  PROCESO: 'PROCESO',
  REPALLETIZAJE: 'REPALLETIZAJE',
  MEZCLA: 'MEZCLA',
  DIVISION: 'DIVISION',
  REPROCESO: 'REPROCESO',
} as const;
export type TransformationType =
  (typeof TransformationType)[keyof typeof TransformationType];

/**
 * Etiquetas visibles de cada tipo. El valor interno es el identificador que
 * viaja a la base de datos; la tilde vive solo acá y en la interfaz.
 */
export const TRANSFORMATION_TYPE_LABELS: Record<TransformationType, string> = {
  PROCESO: 'Proceso',
  REPALLETIZAJE: 'Repalletizaje',
  MEZCLA: 'Mezcla',
  DIVISION: 'División',
  REPROCESO: 'Reproceso',
};

/**
 * Regla estructural por tipo, según 08 §5, §6 y §8.
 * `min_sources` / `max_sources`: número de lotes fuente admitidos.
 * `min_product_outputs` / `max_product_outputs`: salidas de producto
 * (RESULTADO + REMANENTE) admitidas. null = sin tope.
 * `requires_motive`: la operación exige motivo escrito.
 *
 * PROCESO y REPALLETIZAJE no fijan topes: son la operación genérica y
 * historically se usamos con N fuentes y M salidas.
 */
export interface TransformationTypeRule {
  min_sources: number;
  max_sources: number | null;
  min_product_outputs: number;
  max_product_outputs: number | null;
  requires_motive: boolean;
}

export const TRANSFORMATION_TYPE_RULES: Record<TransformationType, TransformationTypeRule> = {
  PROCESO: { min_sources: 1, max_sources: null, min_product_outputs: 1, max_product_outputs: null, requires_motive: false },
  REPALLETIZAJE: { min_sources: 1, max_sources: null, min_product_outputs: 1, max_product_outputs: null, requires_motive: false },
  // N fuentes → 1 derivado. No se mezclan dos lotes en uno sin registrar ambas.
  MEZCLA: { min_sources: 2, max_sources: null, min_product_outputs: 1, max_product_outputs: 1, requires_motive: false },
  // 1 fuente → 2+ derivados, cada uno con su propia historia.
  DIVISION: { min_sources: 1, max_sources: 1, min_product_outputs: 2, max_product_outputs: null, requires_motive: false },
  // 1 fuente → 1 derivado con nueva identidad. La condición anterior no se borra.
  REPROCESO: { min_sources: 1, max_sources: 1, min_product_outputs: 1, max_product_outputs: 1, requires_motive: true },
};

export const TransformationStatus = {
  BORRADOR: 'BORRADOR',
  CONFIRMADA: 'CONFIRMADA',
  ANULADA: 'ANULADA',
} as const;
export type TransformationStatus =
  (typeof TransformationStatus)[keyof typeof TransformationStatus];

export const OutputKind = {
  RESULTADO: 'RESULTADO',
  REMANENTE: 'REMANENTE',
  MERMA: 'MERMA',
  DESCARTE: 'DESCARTE',
} as const;
export type OutputKind = (typeof OutputKind)[keyof typeof OutputKind];

/** Salidas que producen un lote real. */
export const PRODUCT_OUTPUTS: OutputKind[] = [
  OutputKind.RESULTADO,
  OutputKind.REMANENTE,
];
/** Salidas que no producen lote pero exigen motivo. */
export const LOSS_OUTPUTS: OutputKind[] = [OutputKind.MERMA, OutputKind.DESCARTE];

export const RemnantHandling = {
  COMO_LOTE_NUEVO: 'COMO_LOTE_NUEVO',
  SIN_REMANENTE: 'SIN_REMANENTE',
} as const;
export type RemnantHandling =
  (typeof RemnantHandling)[keyof typeof RemnantHandling];

export const AvailabilityStatus = {
  DISPONIBLE: 'DISPONIBLE',
  PARCIALMENTE_UTILIZADO: 'PARCIALMENTE_UTILIZADO',
  AGOTADO: 'AGOTADO',
  CANTIDAD_NO_DECLARADA: 'CANTIDAD_NO_DECLARADA',
  /** Hay movimientos pero ninguna apertura: estado inconsistente a revisar. */
  SIN_APERTURA: 'SIN_APERTURA',
} as const;
export type AvailabilityStatus =
  (typeof AvailabilityStatus)[keyof typeof AvailabilityStatus];

/** Lote disponible para consumir. */
export interface AvailableSource {
  lot_id: string;
  folio: string | null;
  harvest_block: string | null;
  producer_name: string | null;
  variety_name: string | null;
  fruit_date: string | null;
  stage_name: string | null;
  /** Cantidad disponible real (apertura + entradas - consumos). */
  available_quantity: number;
  unit: string | null;
  availability_status: AvailabilityStatus;
}

export interface TransformationInputDraft {
  source_lot_id: string;
  available_quantity: number;
  consumed_quantity: number;
  unit: string;
  remnant_handling: RemnantHandling;
}

export interface TransformationOutputDraft {
  result_lot_id: string | null;
  output_kind: OutputKind;
  quantity: number;
  unit: string;
  reason?: string | null;
  /** Datos del lote a crear (solo para RESULTADO / REMANENTE). */
  new_lot?: {
    producer_id: string;
    variety_id: string;
    species_id: string | null;
    fruit_date: string;
    harvest_block: string;
    packaging_type_id: string;
    quantity: number;
    season_id?: string | null;
    field_id?: string | null;
    block_id?: string | null;
    producer_guide_number?: string | null;
    folio_interno?: string | null;
  } | null;
}

export interface TransformationValidation {
  ok: boolean;
  errors: string[];
  total_input: number;
  total_output: number;
  total_product_output: number;
  total_remanent: number;
  total_loss: number;
  /**
   * Ecuación de balance. Lo que SALE de las fuentes es su cantidad
   * disponible, no solo lo consumido, porque el remanente también sale
   * del lote fuente: se convierte en un lote nuevo.
   *   Σ disponibles = Σ salidas
   *   Σ consumidas = Σ (RESULTADO + MERMA + DESCARTE)
   *   Σ remanentes  = Σ (disponible − consumida) de fuentes declaradas
   *                   como COMO_LOTE_NUEVO
   * `difference` es la diferencia entre disponibles y salidas: debe ser 0.
   */
  /** Suma de lo que sale de las fuentes (consumido + remanente declarado). */
  total_available: number;
  difference: number;
}

const normUnit = (u: string | null | undefined) => (u ?? '').trim().toUpperCase();

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Valida una transformación completa. Misma especificación que la función
 * SQL: fuentes, salidas, unidades, balance, disponibilidad y remanentes.
 */
export function validateTransformation(params: {
  unit: string;
  inputs: TransformationInputDraft[];
  outputs: TransformationOutputDraft[];
  /** Disponibilidad real por lote, para validar que no se exceda. */
  availability?: Map<string, number>;
  /**
   * Tipo de operación. Si se omite, no se aplican las reglas estructurales
   * propias de MEZCLA / DIVISIÓN / REPROCESO: la validación queda en la
   * genérica. La base de datos siempre valida el tipo real.
   */
  transformationType?: TransformationType;
  /** Motivo de la operación. Obligatorio para REPROCESO. */
  motive?: string | null;
}): TransformationValidation {
  const { unit, inputs, outputs } = params;
  const availability = params.availability ?? new Map<string, number>();
  const errors: string[] = [];

  if (!unit || normUnit(unit) === '') {
    errors.push('La operación debe declarar una unidad de trabajo.');
  }

  // 1) Fuentes
  if (inputs.length === 0) {
    errors.push('Debe registrar al menos un lote fuente.');
  }

  // 2) Salidas de producto
  if (!outputs.some((o) => PRODUCT_OUTPUTS.includes(o.output_kind))) {
    errors.push('Debe registrar al menos un lote resultante o remanente.');
  }

  // 2.b) Reglas estructurales por tipo (espejo de validate_lot_transformation).
  // Se aplican solo si el tipo viene informado: la base de datos siempre lo
  // valida, esto permite validar en pantalla y sin conexión.
  const type = params.transformationType;
  if (type) {
    const rule = TRANSFORMATION_TYPE_RULES[type];
    const label = TRANSFORMATION_TYPE_LABELS[type];
    const sources = inputs.length;
    const products = outputs.filter((o) => PRODUCT_OUTPUTS.includes(o.output_kind)).length;

    if (sources < rule.min_sources) {
      errors.push(
        `${label} requiere al menos ${rule.min_sources} ${
          rule.min_sources === 1 ? 'lote fuente' : 'lotes fuente'
        }. Registrados: ${sources}.`
      );
    }
    if (rule.max_sources !== null && sources > rule.max_sources) {
      errors.push(
        `${label} admite ${rule.max_sources === 1 ? 'un único lote fuente' : `${rule.max_sources} lotes fuente`}. ` +
          `Registrados: ${sources}. Para combinar varios lotes use Mezcla.`
      );
    }
    if (products < rule.min_product_outputs) {
      errors.push(
        `${label} debe producir al menos ${rule.min_product_outputs} ${
          rule.min_product_outputs === 1 ? 'lote derivado' : 'lotes derivados'
        }. Registrados: ${products}.`
      );
    }
    if (rule.max_product_outputs !== null && products > rule.max_product_outputs) {
      errors.push(
        `${label} produce ${rule.max_product_outputs === 1 ? 'un único lote derivado' : `${rule.max_product_outputs} lotes derivados`}. ` +
          `Registrados: ${products}.`
      );
    }
    if (rule.requires_motive && !normUnit(params.motive)) {
      errors.push(`${label} exige motivo: registre la razón de la operación.`);
    }
  }

  // 3) Producto siempre con lote real
  for (const o of outputs) {
    if (PRODUCT_OUTPUTS.includes(o.output_kind) && !o.result_lot_id && !o.new_lot) {
      errors.push(
        'Toda salida de producto o remanente debe ser un lote nuevo con folio propio.'
      );
    }
    if (LOSS_OUTPUTS.includes(o.output_kind) && o.result_lot_id) {
      errors.push('Merma y descarte no producen lote: quite el lote del resultado.');
    }
  }

  // 4) Merma y descarte exigen motivo
  for (const o of outputs) {
    if (LOSS_OUTPUTS.includes(o.output_kind) && !o.reason?.trim()) {
      errors.push('Merma y descarte exigen un motivo explícito.');
    }
  }

  // 5) Merma y descarte NO son remanente
  if (outputs.filter((o) => o.output_kind === OutputKind.REMANENTE).length > 1) {
    errors.push('Solo puede existir un remanente por transformación.');
  }

  // 6) Unidades: sin conversión automática
  for (const i of inputs) {
    if (!i.unit || normUnit(i.unit) === '') {
      errors.push(`El lote fuente ${i.source_lot_id} no declara unidad de consumo.`);
    } else if (normUnit(i.unit) !== normUnit(unit)) {
      errors.push(
        `Unidad incompatible en el lote fuente ${i.source_lot_id}: se consume en "${i.unit}" y la operación trabaja en "${unit}". No hay conversión automática.`
      );
    }
    if (i.consumed_quantity <= 0) {
      errors.push(`La cantidad consumida del lote fuente ${i.source_lot_id} debe ser mayor que cero.`);
    }
    if (i.consumed_quantity > i.available_quantity) {
      errors.push(
        `El lote fuente ${i.source_lot_id} no tiene existencias suficientes: se intentan consumir ${i.consumed_quantity} y hay ${i.available_quantity} disponibles.`
      );
    }
    // Disponibilidad real si se conoce
    const real = availability.get(i.source_lot_id);
    if (real !== undefined && i.consumed_quantity > real + 1e-9) {
      errors.push(
        `El lote fuente ${i.source_lot_id} tiene ${real} disponibles en el libro de movimientos: no se pueden consumir ${i.consumed_quantity}.`
      );
    }
  }

  // Mismo lote fuente no puede declararse dos veces en la misma operación
  const seenSources = new Set<string>();
  for (const i of inputs) {
    if (seenSources.has(i.source_lot_id)) {
      errors.push(
        'El lote fuente ' + i.source_lot_id + ' está declarado dos veces en la misma operación. Repartir el consumo en una sola fila.'
      );
    }
    seenSources.add(i.source_lot_id);
  }

  let totalInput = 0;
  let totalEffectiveOut = 0;
  let sourceRemnant = 0;
  for (const i of inputs) {
    const leftover = Math.max(0, i.available_quantity - i.consumed_quantity);
    totalInput += i.consumed_quantity;
    // Lo que sale físicamente del lote fuente: lo consumido más el remanente
    // cuando el usuario declara que el remanente se representa como lote nuevo.
    totalEffectiveOut +=
      i.consumed_quantity +
      (i.remnant_handling === RemnantHandling.COMO_LOTE_NUEVO ? leftover : 0);
    if (i.remnant_handling === RemnantHandling.COMO_LOTE_NUEVO) {
      sourceRemnant += leftover;
    }
  }

  let totalOutput = 0;
  let totalRemanent = 0;
  let totalLoss = 0;
  for (const o of outputs) {
    if (!o.unit || normUnit(o.unit) === '') {
      errors.push('Una salida no declara unidad.');
    } else if (normUnit(o.unit) !== normUnit(unit)) {
      errors.push(
        `Unidad incompatible en una salida: "${o.unit}" frente a "${unit}".`
      );
    }
    if (o.quantity <= 0) {
      errors.push('La cantidad de salida debe ser mayor que cero.');
    }
    totalOutput += o.quantity;
    if (o.output_kind === OutputKind.REMANENTE) totalRemanent += o.quantity;
    if (LOSS_OUTPUTS.includes(o.output_kind)) totalLoss += o.quantity;
  }

  // 7) Balance: nada puede desaparecer. De cada fuente sale lo consumido más
  //    su remanente cuando se declara COMO_LOTE_NUEVO.
  const difference = round6(totalEffectiveOut - totalOutput);
  if (Math.abs(difference) > 1e-6) {
    errors.push(
      'El balance no cierra: las fuentes entregan ' + round6(totalEffectiveOut) + ' ' + unit +
        ' y se registran ' + round6(totalOutput) + ' ' + unit + ' de salida. Diferencia: ' + difference + '.'
    );
  }

  // 7b) Si las fuentes dejan remanente, tiene que existir una salida que lo recoja
  if (sourceRemnant > 1e-6 && round6(totalRemanent) < round6(sourceRemnant) - 1e-6) {
    errors.push(
      'Las fuentes dejan ' + round6(sourceRemnant) + ' ' + unit +
        ' de remanente pero solo se declaran ' + round6(totalRemanent) + ' ' + unit +
        ' como salida de remanente. Registre el remanente como lote nuevo.'
    );
  }

  // 8) Remanente del fuente: si queda cantidad, debe declararse
  for (const i of inputs) {
    if (i.remnant_handling !== RemnantHandling.SIN_REMANENTE) continue;
    const restante = round6(i.available_quantity - i.consumed_quantity);
    if (restante > 1e-6) {
      errors.push(
        `Del lote fuente ${i.source_lot_id} quedan ${restante} ${i.unit} y se declaró SIN_REMANENTE. Registre el remanente como lote nuevo o indique que no queda cantidad.`
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    total_input: round6(totalInput),
    total_output: round6(totalOutput),
    total_product_output: round6(totalOutput - totalLoss),
    total_remanent: round6(totalRemanent),
    total_loss: round6(totalLoss),
    total_available: round6(totalEffectiveOut),
    difference,
  };
}

/**
 * Sugiere la distribución del remanente **sin decidirla**. Devuelve el
 * remanente de cada fuente si el usuario.lines consume todo lo disponible.
 * Es una ayuda de cálculo, no una distribución aplicada.
 */
export function suggestRemnant(
  inputs: TransformationInputDraft[]
): { lot_id: string; remnant: number; unit: string }[] {
  return inputs.map((i) => ({
    lot_id: i.source_lot_id,
    remnant: round6(i.available_quantity - i.consumed_quantity),
    unit: i.unit,
  }));
}

/**
 * Estado de disponibilidad.
 *
 * REGLA ÚNICA (idéntica a la vista `lot_availability` y a la función SQL):
 * el saldo se calcula EXCLUSIVAMENTE con los movimientos del libro.
 * `lots.quantity` es contenido declarado y NO participa: sumarlo duplicaría
 * el saldo, porque el propio movimiento APERTURA ya lo representa.
 *
 *   saldo = Σ movimientos IN − Σ movimientos OUT
 */
export function availabilityFromRow(row: {
  total_in: number | null;
  total_out: number | null;
  openings: number | null;
  unit: string | null;
}): { status: AvailabilityStatus; available: number | null } {
  if ((row.openings ?? 0) === 0 && (row.total_in ?? 0) === 0 && (row.total_out ?? 0) === 0) {
    return { status: AvailabilityStatus.CANTIDAD_NO_DECLARADA, available: null };
  }
  if ((row.openings ?? 0) === 0) {
    return { status: AvailabilityStatus.SIN_APERTURA, available: null };
  }
  const available = round6((row.total_in ?? 0) - (row.total_out ?? 0));
  const status =
    available > 1e-9
      ? (row.total_out ?? 0) > 0
        ? AvailabilityStatus.PARCIALMENTE_UTILIZADO
        : AvailabilityStatus.DISPONIBLE
      : AvailabilityStatus.AGOTADO;
  return { status, available };
}