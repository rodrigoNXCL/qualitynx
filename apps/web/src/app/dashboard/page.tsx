'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getCurrentSession,
  getUserProfile,
  listLots,
  listInspections,
  listLotStageEvents,
  listNormativeReferences,
  listQualityCoverage,
  listStageQualityAnalysis,
  listRecurringDeviationAnalysis,
  listProducerQualityAnalysis,
} from '@qualitynx/database';
import {
  UserRole,
  LotStatus,
  InspectionStatus,
  type Lot,
  type Inspection,
  type LotStageEvent,
  type NormativeReference,
} from '@qualitynx/shared';
import type {
  QualityCoverageRow,
  StageQualityRow,
  ProducerQualityRow,
  RecurringDeviationRow,
} from '@qualitynx/database';
import { EmptyState, LoadingBlock, StatusChip } from '@/components/ui';

interface UserProfile {
  full_name: string;
  role: UserRole;
  companies: { name: string; code: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Admin de Empresa',
  INSPECTOR: 'Inspector',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function eventTitle(ev: LotStageEvent): string {
  if (ev.event_type === 'INGRESO') return 'Lote recibido';
  return 'Cambio de etapa';
}

export default function DashboardHomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [lots, setLots] = useState<Lot[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [events, setEvents] = useState<LotStageEvent[]>([]);
  const [normativeReferences, setNormativeReferences] = useState<NormativeReference[]>([]);
  const [coverage, setCoverage] = useState<QualityCoverageRow | null>(null);
  const [stageRows, setStageRows] = useState<StageQualityRow[]>([]);
  const [problemRows, setProblemRows] = useState<RecurringDeviationRow[]>([]);
  const [producerRows, setProducerRows] = useState<ProducerQualityRow[]>([]);
  const [showNormative, setShowNormative] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Perfil y datos operativos en paralelo: ninguno depende del otro.
      void (async () => {
        const { session } = await getCurrentSession();
        if (session) {
          const { data } = await getUserProfile(session.user.id);
          setProfile((data as UserProfile) ?? null);
        }
      })();
      const [lotsRes, inspRes, evRes] = await Promise.all([
        listLots(),
        listInspections(),
        listLotStageEvents(undefined, { latest: 6 }),
      ]);
      setLots((lotsRes.data as Lot[]) ?? []);
      setInspections((inspRes.data as Inspection[]) ?? []);
      setEvents(
        ((evRes.data as LotStageEvent[]) ?? [])
          .slice()
          .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
          .slice(0, 6)
      );
      setReady(true);
      // Carga de análisis: alimenta el resumen gerencial. Solo lectura.
      void (async () => {
        const { session } = await getCurrentSession();
        if (!session) return;
        const { data } = await getUserProfile(session.user.id);
        const companyId = (data as { company_id: string | null } | null)?.company_id;
        if (!companyId) return;
        const [cov, st, pb, pr] = await Promise.all([
          listQualityCoverage(companyId),
          listStageQualityAnalysis(companyId),
          listRecurringDeviationAnalysis(companyId, 5),
          listProducerQualityAnalysis(companyId),
        ]);
        setCoverage(cov.data);
        setStageRows(st.data ?? []);
        setProblemRows((pb.data ?? []).filter((x) => x.evaluations_desviacion > 0));
        setProducerRows((pr.data ?? []).filter((x) => x.evaluations_determined > 0));
      })();
      // Carga secundaria: solo alimenta una sección opcional del pie.
      void listNormativeReferences()
        .then((res) =>
          setNormativeReferences((res.data as NormativeReference[]) ?? [])
        )
        .catch(() => {});
    };
    load();
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const roleLabel = profile ? (ROLE_LABELS[profile.role] ?? profile.role) : null;

  const activeLots = lots.filter((l) => l.status !== LotStatus.CERRADO);
  const recentInspections = inspections
    .slice()
    .sort((a, b) => b.inspected_at.localeCompare(a.inspected_at))
    .slice(0, 4);
  const lotsNeedingAttention = activeLots.filter(
    (l) =>
      l.status === LotStatus.RETENIDO ||
      l.status === LotStatus.RECHAZADO ||
      l.status === LotStatus.SEGREGADO ||
      l.status === LotStatus.EN_INSPECCION
  );


  if (!ready) {
    return <LoadingBlock label="Cargando el centro de operación…" />;
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* A · Encabezado */}
      <header className="qx-opheader">
        <div className="min-w-0 flex-1">
          <p className="qx-eyebrow">QualityNX</p>
          <h1 className="qx-h1">
            {profile ? `${greeting()}, ${firstName}.` : `${greeting()}.`}
          </h1>
          <p className="qx-sub">
            {profile
              ? `${profile.companies?.name ?? 'Plataforma'} · ${roleLabel} — situación operativa de hoy.`
              : 'Cargando contexto…'}
          </p>
          <p className="qx-meta mt-1">
            {new Date().toLocaleDateString('es-CL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/inspections" className="qx-btn-brand-solid">
            Nueva inspección
          </Link>
          <Link href="/dashboard/lots" className="qx-btn-ghost">
            Ver lotes
          </Link>
        </div>
      </header>

      {/* B · Lectura gerencial */}
      <section aria-labelledby="gerencial-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="qx-eyebrow">Lectura de la operación</p>
            <h2 id="gerencial-title" className="text-[18px] font-semibold tracking-[-0.02em] text-[#1a1a1a]">
              Qué está pasando y qué falta
            </h2>
          </div>
          <Link href="/dashboard/analisis" className="qx-btn-brand">
            Abrir análisis <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="qx-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#aaa]">
              Cobertura de datos
            </p>
            <p className="mt-2 text-[1.5rem] font-semibold tabular-nums text-[#1a1a1a]">
              {coverage
                ? coverage.criteria_validated + '/' + coverage.criteria_total
                : '—'}
            </p>
            <p className="mt-1 text-[12px] text-[#555]">
              criterios validados
            </p>
            <p className="mt-2 text-[11px] text-[#8a6d1f]">
              {coverage
                ? coverage.criteria_pending + ' pendientes · ' +
                  coverage.criteria_with_source + ' con fuente · ' +
                  coverage.criteria_with_limits + ' con límites'
                : 'Cargando cobertura…'}
            </p>
          </div>
          <div className="qx-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#aaa]">
              Etapas con inspecciones
            </p>
            <p className="mt-2 text-[1.5rem] font-semibold tabular-nums text-[#1a1a1a]">
              {stageRows.filter((r) => r.inspections > 0).length}
              <span className="text-[14px] font-normal text-[#8a8f80]"> / {stageRows.length}</span>
            </p>
            <p className="mt-1 text-[12px] text-[#555]">etapas con datos</p>
            <p className="mt-2 text-[11px] text-[#777]">
              {coverage ? coverage.inspections_completed + ' de ' + coverage.inspections + ' inspecciones completadas' : ''}
            </p>
          </div>
          <div className="qx-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#aaa]">
              Lotes con etapa vigente
            </p>
            <p className="mt-2 text-[1.5rem] font-semibold tabular-nums text-[#1a1a1a]">
              {coverage ? coverage.lots_with_current_stage : '—'}
              <span className="text-[14px] font-normal text-[#8a8f80]"> / {coverage ? coverage.lots : '—'}</span>
            </p>
            <p className="mt-1 text-[12px] text-[#555]">lotes con etapa registrada</p>
            <p className="mt-2 text-[11px] text-[#777]">
              Sin etapa no hay análisis por etapa ni comparación posible.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="qx-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#aaa]">
              Criterios con más desviaciones
            </p>
            {problemRows.length === 0 ? (
              <p className="mt-2 text-[12px] text-[#8a8f80]">
                Sin desviaciones registradas, o la cobertura aún es insuficiente.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {problemRows.map((r) => (
                  <li key={r.measurement_def_id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[12px] text-[#1a1a1a]">
                      {r.criterion_name}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-[#555]">
                      {r.evaluations_desviacion}
                      <span className="text-[10px] text-[#9aa090]"> / {r.evaluations_determined} base</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] leading-snug text-[#8a6d1f]">
              Desviación = resultado del Quality Engine frente al criterio configurado.
              No implica incumplimiento: los criterios están PENDIENTE DE VALIDACIÓN.
            </p>
          </div>

          <div className="qx-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#aaa]">
              Productores con más datos de calidad
            </p>
            {producerRows.length === 0 ? (
              <p className="mt-2 text-[12px] text-[#8a8f80]">Sin inspecciones por productor.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {producerRows.slice(0, 5).map((r) => (
                  <li key={r.producer_id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[12px] text-[#1a1a1a]">
                      {r.producer_name}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-[#555]">
                      {r.evaluations_determined}
                      <span className="text-[10px] text-[#9aa090]"> base · {r.stages_covered} et.</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] leading-snug text-[#8a6d1f]">
              Ordenado por volumen de datos, no por desempeño. QualityNX no publica
              rankings de calidad: la comparación la usted.
            </p>
          </div>
        </div>
      </section>

      {/* Acceso secundario a la base normativa: no domina el resumen */}
      <section className="qx-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa868]">
            Referencias
          </p>
          <p className="mt-0.5 text-[13px] text-[#555]">
            Base normativa y técnica ({normativeReferences.length} referencias). Es catálogo
            de referencia, no fuente de reglas automáticas, y no se aplica como criterio.
          </p>
        </div>
        <button
          type="button"
          className="qx-btn-ghost"
          onClick={() => setShowNormative(true)}
          data-testid="open-normative"
        >
          Ver base normativa
        </button>
      </section>

      {showNormative ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#1a1a1a]/40 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Base normativa y técnica"
          onClick={() => setShowNormative(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-[#1a1a1a]/10 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="normative-modal"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa868]">
                  Referencia
                </p>
                <h2 className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-[#1a1a1a]">
                  Base normativa y técnica
                </h2>
              </div>
              <button
                type="button"
                className="qx-btn-ghost !py-1.5 !text-[12px]"
                onClick={() => setShowNormative(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#1a1a1a]/[0.06] bg-[#fafaf7] p-3">
                <p className="text-[11px] uppercase tracking-[0.1em] text-[#888]">País</p>
                <p className="mt-1 text-[15px] font-semibold">Chile</p>
              </div>
              <div className="rounded-xl border border-[#1a1a1a]/[0.06] bg-[#fafaf7] p-3">
                <p className="text-[11px] uppercase tracking-[0.1em] text-[#888]">Producto base</p>
                <p className="mt-1 text-[15px] font-semibold">Arándano fresco</p>
              </div>
              <div className="rounded-xl border border-[#1a1a1a]/[0.06] bg-[#fafaf7] p-3">
                <p className="text-[11px] uppercase tracking-[0.1em] text-[#888]">Referencias</p>
                <p className="mt-1 text-[15px] font-semibold">{normativeReferences.length}</p>
              </div>
            </div>

            {normativeReferences.length > 0 ? (
              <div className="mt-3 space-y-2">
                {normativeReferences.map((reference) => (
                  <div
                    key={reference.id}
                    className="rounded-lg border border-[#1a1a1a]/[0.06] bg-[#fafaf7] px-3 py-2 text-[11px] text-[#666]"
                  >
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span><strong className="text-[#444]">Fuente:</strong> {reference.source_name}</span>
                      <span><strong className="text-[#444]">Documento:</strong> {reference.document_name || 'por definir'}</span>
                      <span><strong className="text-[#444]">Versión:</strong> {reference.version || 'por definir'}</span>
                      <span><strong className="text-[#444]">Vigencia:</strong> {reference.valid_from || 'por definir'}</span>
                    </div>
                    {reference.notes ? (
                      <p className="mt-1 leading-relaxed">{reference.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-[#888]">
                No hay referencias normativas registradas en esta empresa.
              </p>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-[#777]">
              Cada requisito queda asociado a fuente, documento, versión, vigencia y mercado.
              No se presentan tolerancias, unidades ni reglas no verificadas. Las
              referencias no habilitan cumplimiento: ningún criterio está validado.
            </p>
          </div>
        </div>
      ) : null}

      {/* C · Atención requerida */}
      {lotsNeedingAttention.length > 0 && (
        <section aria-labelledby="attention-title" className="rounded-2xl border border-amber-300/70 bg-amber-50/70 p-4 sm:p-5">
          <p id="attention-title" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
            Atención
          </p>
          <ul className="mt-3 space-y-3">
            {lotsNeedingAttention.slice(0, 3).map((lot) => (
              <li key={lot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8fa868]">LOTE</p>
                  <p className="truncate text-[15px] font-semibold text-[#1a1a1a]">{lot.harvest_block}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <StatusChip label={lot.status} />
                  </div>
                </div>
                <Link href={`/dashboard/lots`} className="qx-btn-brand">
                  Revisar
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* D · Actividad reciente */}
      <section aria-labelledby="activity-title">
        <div className="qx-section-title">
          <h2 id="activity-title">Actividad reciente</h2>
          <Link href="/dashboard/lots" className="text-[12px] font-medium text-[#4A5D23] hover:underline">
            Ver lotes →
          </Link>
        </div>
        <div className="qx-card mt-3 overflow-hidden">
          {events.length === 0 && recentInspections.length === 0 ? (
            <EmptyState
              title="Aún no hay actividad registrada."
              description="Cuando registres un lote o abras una inspección, los eventos aparecerán aquí con fecha, lote y responsable."
              action={
                <Link href="/dashboard/lots" className="qx-btn-brand-solid">
                  Ir a lotes
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-[#1a1a1a]/[0.04]">
              {recentInspections.map((insp) => (
                <li key={`i-${insp.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#1a1a1a]">
                      Inspección {insp.status === InspectionStatus.COMPLETADA ? 'completada' : 'en curso'}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#888]">
                      Lote · {lots.find((l) => l.id === insp.lot_id)?.harvest_block ?? '—'} ·{' '}
                      {new Date(insp.inspected_at).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <StatusChip label={insp.status} />
                </li>
              ))}
              {events.slice(0, 5).map((ev) => (
                <li key={ev.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#1a1a1a]">{eventTitle(ev)}</p>
                    <p className="mt-0.5 text-[12px] text-[#888]">
                      Lote · {lots.find((l) => l.id === ev.lot_id)?.harvest_block ?? ev.lot_id.slice(0, 8)} ·{' '}
                      {new Date(ev.occurred_at).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4A5D23]">
                    {ev.event_type === 'INGRESO' ? 'Recepción' : 'Etapa'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* E · Acciones rápidas + accesos */}
      <section aria-labelledby="quick-title">
        <div className="qx-section-title">
          <h2 id="quick-title">Acciones rápidas</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/inspections" className="qx-card p-4 transition-all hover:-translate-y-0.5 hover:border-[#4A5D23]/30">
            <p className="text-[14px] font-semibold text-[#1a1a1a]">Nueva inspección</p>
            <p className="mt-1 text-[12px] text-[#888]">Abrir trabajo de terreno sobre un lote.</p>
          </Link>
          <Link href="/dashboard/lots" className="qx-card p-4 transition-all hover:-translate-y-0.5 hover:border-[#4A5D23]/30">
            <p className="text-[14px] font-semibold text-[#1a1a1a]">Gestionar lotes</p>
            <p className="mt-1 text-[12px] text-[#888]">Crear, revisar historia o registrar decisión.</p>
          </Link>
          <Link href="/dashboard/master-data" className="qx-card p-4 transition-all hover:-translate-y-0.5 hover:border-[#4A5D23]/30">
            <p className="text-[14px] font-semibold text-[#1a1a1a]">Datos maestros</p>
            <p className="mt-1 text-[12px] text-[#888]">Productores, especies, variedades y más.</p>
          </Link>
          <Link href="/" className="qx-card p-4 transition-all hover:-translate-y-0.5 hover:border-[#4A5D23]/30">
            <p className="text-[14px] font-semibold text-[#1a1a1a]">Sitio público</p>
            <p className="mt-1 text-[12px] text-[#888]">Volver a la landing de QualityNX.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
