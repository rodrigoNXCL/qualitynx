'use client';

/**
 * QualityNX — D-034 · RECEPCIÓN OPERACIONAL
 *
 * Ingreso operacional de un lote a planta. Reutiliza la arquitectura existente:
 *  - `lots` como identidad (folio QualityNX asignado por trigger);
 *  - `lot_stage_events` para el punto real de ingreso (etapa Recepción);
 *  - trigger de APERTURA de D-032 para la disponibilidad, solo si hay cantidad y unidad;
 *  - motor de inspecciones existente para la continuidad a control.
 *
 * No crea tablas, no inventa unidades, no agrega un segundo mecanismo de stock
 * y no duplica catálogos.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getCurrentSession,
  getUserProfile,
  listMasterData,
  listPackagingTypes,
  listOperationalStages,
  createLot,
  createLotStageEvent,
  listLotAvailability,
} from '@qualitynx/database';
import type { MasterDataRecord, PackagingType, OperationalStage, UserRole, LotType } from '@qualitynx/shared';
import { LotType as LT, LOT_TYPES, LOT_TYPE_LABELS } from '@qualitynx/shared';
import { Banner, LoadingBlock, inputClass } from '@/components/ui';

const panel = 'rounded-xl border border-[#1a1a1a]/10 bg-white px-4 py-3.5';

/**
 * Etapa real de recepción. No se ofrece selector de etapa: la recepción ES el
 * ingreso a esta etapa (D-016). El resto del recorrido se registra después,
 * con su evidencia.
 */
const ETAPA_RECEPCION = 'Recepción Frigorífico / Packing';

type Paso = 1 | 2 | 3;

export default function RecepcionPage() {
  const router = useRouter();
  // `lot_stage_events.user_id` referencia users(id), NO auth.uid().
  // Por eso guardamos el id del perfil y no el de la sesión de Supabase Auth.
  const [profileUserId, setProfileUserId] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const [producers, setProducers] = useState<MasterDataRecord[]>([]);
  const [species, setSpecies] = useState<MasterDataRecord[]>([]);
  const [varieties, setVarieties] = useState<(MasterDataRecord & { species_id: string })[]>([]);
  const [seasons, setSeasons] = useState<MasterDataRecord[]>([]);
  const [packaging, setPackaging] = useState<PackagingType[]>([]);
  const [stages, setStages] = useState<OperationalStage[]>([]);

  const [paso, setPaso] = useState<Paso>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recibido, setRecibido] = useState<{ folio: string; id: string; availability: string } | null>(null);

  // --- paso 1: tipo de lote
  const [lotType, setLotType] = useState<LotType>(LT.ORIGEN);
  // --- paso 2: origen
  const [producerId, setProducerId] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [fruitDate, setFruitDate] = useState('');
  const [harvestBlock, setHarvestBlock] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [guideNumber, setGuideNumber] = useState('');
  const [packagingTypeId, setPackagingTypeId] = useState('');
  // --- paso 3: contenido declarado
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('');
  const [kgDeclarados, setKgDeclarados] = useState('');

  const nameOf = useCallback(
    (list: MasterDataRecord[], id: string) => list.find((r) => r.id === id)?.name ?? '—',
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { session } = await getCurrentSession();
    if (!session) {
      setLoading(false);
      return;
    }
    const { data: profile_ } = await getUserProfile(session.user.id);
    setProfileUserId(String((profile_ as { id?: string } | null)?.id ?? ""));
    if (profile_) {
      setCompanyId((profile_ as { company_id: string | null }).company_id);
      setRole((profile_ as { role: UserRole }).role);
    }
    const [p, s, v, se, pk, st] = await Promise.all([
      listMasterData('producers'),
      listMasterData('species'),
      listMasterData('varieties'),
      listMasterData('seasons'),
      listPackagingTypes(),
      listOperationalStages(),
    ]);
    setProducers(p.data as MasterDataRecord[]);
    setSpecies(s.data as MasterDataRecord[]);
    setVarieties(v.data as (MasterDataRecord & { species_id: string })[]);
    setSeasons(se.data as MasterDataRecord[]);
    setPackaging(pk.data as PackagingType[]);
    setStages(st.data as OperationalStage[]);
    const activa = (se.data as MasterDataRecord[]).find((x) => (x as { is_active?: boolean }).is_active);
    if (activa) setSeasonId(activa.id);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const etapaRecepcion = useMemo(
    () => stages.find((s) => s.name === ETAPA_RECEPCION) ?? null,
    [stages]
  );
  const variedadesDeEspecie = useMemo(
    () => (speciesId ? varieties.filter((v) => v.species_id === speciesId) : varieties),
    [varieties, speciesId]
  );

  /** Valida el paso 2 (origen). Devuelve el mensaje de error o null. */
  const validarOrigen = useCallback((): string | null => {
    if (!producerId) return 'Selecciona el productor del lote.';
    if (!varietyId) return 'Selecciona la variedad.';
    if (!fruitDate) return 'Informa la fecha de fruta.';
    if (!harvestBlock.trim()) return 'Informa el bloque de cosecha u origen operacional.';
    if (!packagingTypeId) return 'Selecciona el embalaje.';
    return null;
  }, [producerId, varietyId, fruitDate, harvestBlock, packagingTypeId]);

  /** Valida el paso 3 (contenido declarado) según las reglas de D-032. */
  const validarContenido = useCallback((): string | null => {
    const q = quantity.trim();
    if (q === '') return null; // sin cantidad el lote existe, sin existencia
    if (Number(q) <= 0) return 'La cantidad debe ser mayor que cero.';
    if (!quantityUnit.trim()) return 'Si informas cantidad, la unidad es obligatoria.';
    if (kgDeclarados.trim() && Number(kgDeclarados) < 0) return 'Los kg declarados no pueden ser negativos.';
    return null;
  }, [quantity, quantityUnit, kgDeclarados]);

  const puedeConfirmar =
    !!producerId && !!varietyId && !!fruitDate && !!harvestBlock.trim() && !!packagingTypeId;

  /** Recibe el lote: crea el lote, registra el ingreso en la etapa de recepción y
   *  deja el resultado listo para continuar a inspección. */
  const recibir = async () => {
    const e1 = validarOrigen();
    if (e1) {
      setError(e1);
      setPaso(2);
      return;
    }
    const e2 = validarContenido();
    if (e2) {
      setError(e2);
      setPaso(3);
      return;
    }
    if (!companyId) {
      setError('El usuario no tiene empresa asignada.');
      return;
    }
    if (!etapaRecepcion) {
      setError(`No se encontró la etapa operacional "${ETAPA_RECEPCION}" en el catálogo vigente.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const q = quantity.trim();
      const { data: lot, error: lotErr } = await createLot({
        company_id: companyId,
        producer_id: producerId,
        species_id: speciesId || null,
        variety_id: varietyId,
        fruit_date: fruitDate,
        harvest_block: harvestBlock.trim(),
        season_id: seasonId || null,
        producer_guide_number: guideNumber.trim() || null,
        packaging_type_id: packagingTypeId,
        quantity: q === '' ? null : Number(q),
        quantity_unit: q === '' ? null : quantityUnit.trim(),
        kg_declarados: kgDeclarados.trim() ? Number(kgDeclarados) : null,
        lot_type: lotType,
        status: 'CREADO',
      });
      if (lotErr) {
        setError(
          /duplicate|unique|already exists/i.test(String((lotErr as { message?: string }).message ?? ''))
            ? 'Ya existe un lote de este productor, variedad, fecha y bloque de cosecha.'
            : 'No pudimos registrar el lote. Revisa los datos e intenta de nuevo.'
        );
        return;
      }
      const nuevo = lot as { id?: string; folio?: string };
      if (!nuevo?.id) {
        setError('El lote se creó pero no pudimos identificarlo.');
        return;
      }

      // Punto real de ingreso: la etapa de recepción (D-016). No es selector libre.
      const ev = await createLotStageEvent({
        lot_id: nuevo.id,
        operational_stage_id: etapaRecepcion.id,
        event_type: 'INGRESO',
        user_id: profileUserId,
        company_id: companyId,
        notes: 'Ingreso por recepción operacional',
      });
      if (ev.error) {
        setError(
          `El lote ${nuevo.folio ?? ''} se creó, pero no pudimos registrar su ingreso en la etapa de recepción. Revísalo desde la trazabilidad.`
        );
        return;
      }

      // Disponibilidad real: la del ledger, nunca calculada desde lots.quantity.
      const av = await listLotAvailability({ companyId });
      const fila = av.data?.find((r) => r.lot_id === nuevo.id);
      const disponibilidad =
        fila?.available_quantity == null
          ? 'Sin saldo registrado'
          : `${fila.available_quantity} ${fila.unit ?? ''}`;
      setRecibido({ folio: nuevo.folio ?? '', id: nuevo.id, availability: disponibilidad });
    } finally {
      setBusy(false);
    }
  };

  const reiniciar = () => {
    setRecibido(null);
    setPaso(1);
    setError(null);
    setQuantity('');
    setQuantityUnit('');
    setHarvestBlock('');
    setGuideNumber('');
    setKgDeclarados('');
  };

  if (loading) return <LoadingBlock />;

  // ---- resultado: el lote recibido
  if (recibido) {
    return (
      <div className="space-y-4">
        <h1 className="text-[22px] font-semibold text-[#1a1a1a]">Recepción registrada</h1>
        <section className={panel}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888]">
            Lote recibido
          </p>
          <p className="mt-1 text-[26px] font-semibold text-[#1a1a1a]">{recibido.folio}</p>
          <p className="text-[12px] text-[#5c6b45]">
            Ingresó en la etapa {ETAPA_RECEPCION} y su disponibilidad es{' '}
            <strong>{recibido.availability}</strong>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/dashboard/inspections?lot=${recibido.id}`}
              className="qx-btn-brand-solid !py-2"
              data-testid="ir-a-inspeccion"
            >
              Iniciar inspección de recepción
            </Link>
            <Link href={`/dashboard/trazabilidad/${recibido.id}`} className="qx-btn-ghost !py-2">
              Ver trazabilidad
            </Link>
            <Link href="/dashboard/lots" className="qx-btn-ghost !py-2">
              Ir a Lotes
            </Link>
            <button type="button" onClick={reiniciar} className="qx-btn-ghost !py-2">
              Recibir otro lote
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#9aa090]">
            La inspección usa el motor y los criterios ya configurados en QualityNX. La recepción
            no crea criterios ni tolerancias.
          </p>
        </section>
      </div>
    );
  }

  // ---- flujo de recepción
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888]">
          Recepción operacional · {role ?? ''}
        </p>
        <h1 className="text-[22px] font-semibold text-[#1a1a1a]">Recepción de lote</h1>
        <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-[#5c6b45]">
          Ingreso de un lote a planta. El folio QualityNX se asigna al crear el lote y es su
          identidad; guía, productor y bloque son contexto, no identidad.
        </p>
      </div>

      {error ? <Banner type="error">{error}</Banner> : null}

      {/* Paso 1 · tipo de lote */}
      <section className={panel}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888]">
          1 · Tipo de lote
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de lote">
          {LOT_TYPES.map((t) => {
            const desc =
              t === LT.ORIGEN
                ? 'Lote que ingresa como fruta de un productor.'
                : t === LT.PROCESO
                  ? 'Lote que ingresa ya transformado desde un proceso.'
                  : 'Lote que ingresa por repalletizado.';
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={lotType === t}
                onClick={() => setLotType(t)}
                data-testid={`recepcion-tipo-${t}`}
                className={`rounded-xl border px-3 py-2.5 text-left ${
                  lotType === t
                    ? 'border-[#1a1a1a] bg-[#f4f6ee]'
                    : 'border-[#1a1a1a]/12 bg-white hover:bg-[#fafbf7]'
                }`}
              >
                <span className="block text-[13px] font-semibold text-[#1a1a1a]">
                  {LOT_TYPE_LABELS[t]}
                </span>
                <span className="mt-0.5 block text-[11px] text-[#5c6b45]">{desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Paso 2 · origen */}
      <section className={panel}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888]">2 · Origen</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              Productor *
            </label>
            <select
              value={producerId}
              onChange={(e) => setProducerId(e.target.value)}
              className={inputClass}
              data-testid="recepcion-productor"
            >
              <option value="">Seleccionar…</option>
              {producers
                .filter((p) => (p as { is_active?: boolean }).is_active !== false)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              Especie
            </label>
            <select
              value={speciesId}
              onChange={(e) => {
                setSpeciesId(e.target.value);
                setVarietyId('');
              }}
              className={inputClass}
              data-testid="recepcion-especie"
            >
              <option value="">Todas las especies</option>
              {species.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              Variedad *
            </label>
            <select
              value={varietyId}
              onChange={(e) => setVarietyId(e.target.value)}
              className={inputClass}
              data-testid="recepcion-variedad"
            >
              <option value="">Seleccionar…</option>
              {variedadesDeEspecie.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.species_id ? ` · ${nameOf(species, v.species_id)}` : ''}
                </option>
              ))}
            </select>
            {varietyId ? (
              <p className="mt-1 text-[11px] text-[#5c6b45]">
                Especie del lote:{' '}
                {(() => {
                  const v = varieties.find((x) => x.id === varietyId);
                  return v?.species_id ? nameOf(species, v.species_id) : 'la de la variedad';
                })()}
              </p>
            ) : null}
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              Fecha de fruta / recepción *
            </label>
            <input
              type="date"
              value={fruitDate}
              onChange={(e) => setFruitDate(e.target.value)}
              className={inputClass}
              data-testid="recepcion-fecha"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              Bloque de cosecha / huerto *
            </label>
            <input
              type="text"
              value={harvestBlock}
              onChange={(e) => setHarvestBlock(e.target.value)}
              maxLength={255}
              className={inputClass}
              placeholder="Ej: Lote 2250 · Bodega 3"
              data-testid="recepcion-bloque"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              Temporada
            </label>
            <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className={inputClass}>
              <option value="">Sin temporada</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              N° guía / documento
            </label>
            <input
              type="text"
              value={guideNumber}
              onChange={(e) => setGuideNumber(e.target.value)}
              maxLength={100}
              className={inputClass}
              placeholder="Referencia del documento de origen"
              data-testid="recepcion-guia"
            />
            <p className="mt-1 text-[11px] text-[#9aa090]">
              Es referencia externa, no identidad del lote.
            </p>
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              Embalaje *
            </label>
            <select
              value={packagingTypeId}
              onChange={(e) => setPackagingTypeId(e.target.value)}
              className={inputClass}
              data-testid="recepcion-embalaje"
            >
              <option value="">Seleccionar…</option>
              {packaging
                .filter((p) => p.is_active !== false)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.theoretical_weight_kg != null ? ` · ${p.theoretical_weight_kg} kg` : ' · peso por definir'}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </section>

      {/* Paso 3 · contenido declarado */}
      <section className={panel}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888]">
          3 · Contenido declarado
        </p>
        <p className="mt-0.5 text-[11px] text-[#5c6b45]">
          Si informas cantidad, la unidad es obligatoria y el lote queda con disponibilidad en
          existencias. Si no informas cantidad, el lote se conserva como registro operacional sin
          existencia. Nunca se infiere la unidad.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              Cantidad
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
              placeholder="Ej: 320"
              data-testid="recepcion-cantidad"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              Unidad de cantidad {quantity.trim() ? '*' : ''}
            </label>
            <input
              type="text"
              value={quantityUnit}
              onChange={(e) => setQuantityUnit(e.target.value)}
              className={inputClass}
              placeholder="Ej: cajas"
              list="recepcion-unidades"
              data-testid="recepcion-unidad"
            />
            <datalist id="recepcion-unidades">
              <option value="cajas" />
              <option value="bandejas" />
              <option value="envases" />
              <option value="pallet" />
            </datalist>
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
              Kg declarados (según guía)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={kgDeclarados}
              onChange={(e) => setKgDeclarados(e.target.value)}
              className={inputClass}
              placeholder="Ej: 12500"
              data-testid="recepcion-kg"
            />
          </div>
        </div>
        {kgDeclarados.trim() && quantity.trim() ? (
          <p className="mt-1 text-[11px] text-[#5c6b45]">
            Los kg declarados son el dato de la guía. No se convierten a unidades de cantidad.
          </p>
        ) : null}
      </section>

      {/* Paso 4 · confirmación */}
      <section className={panel}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888]">4 · Confirmar</p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-3">
          <span>
            Tipo: <strong>{LOT_TYPE_LABELS[lotType]}</strong>
          </span>
          <span>
            Productor: <strong>{producerId ? nameOf(producers, producerId) : '—'}</strong>
          </span>
          <span>
            Variedad: <strong>{varietyId ? nameOf(varieties, varietyId) : '—'}</strong>
          </span>
          <span>
            Bloque: <strong>{harvestBlock.trim() || '—'}</strong>
          </span>
          <span>
            Guía: <strong>{guideNumber.trim() || 'sin guía'}</strong>
          </span>
          <span>
            Etapa de ingreso: <strong>{ETAPA_RECEPCION}</strong>
          </span>
          <span>
            Contenido:{' '}
            <strong>
              {quantity.trim() ? `${quantity} ${quantityUnit.trim() || '—'}` : 'sin cantidad declarada'}
            </strong>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="qx-btn-brand-solid !py-2"
            disabled={busy || !puedeConfirmar || !etapaRecepcion}
            onClick={recibir}
            data-testid="recepcion-confirmar"
          >
            {busy ? 'Registrando…' : 'Recibir lote'}
          </button>
          <Link href="/dashboard/lots" className="qx-btn-ghost !py-2">
            Cancelar
          </Link>
        </div>
        {!etapaRecepcion ? (
          <p className="mt-2 text-[11px] text-[#8a3a3a]">
            El catálogo vigente no tiene la etapa &quot;{ETAPA_RECEPCION}&quot;. La recepción no puede
            registrarse sin ella.
          </p>
        ) : null}
        {paso !== 1 ? null : null}
      </section>
    </div>
  );
}