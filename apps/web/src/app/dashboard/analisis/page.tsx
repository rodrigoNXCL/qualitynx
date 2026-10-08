'use client';

/**
 * QualityNX V2 — ANÁLISIS GERENCIAL
 *
 * Cuatro pestañas, cuatro preguntas de negocio:
 *   1. POR ETAPA      → ¿cómo se ve cada etapa operacional?
 *   2. POR PRODUCTOR  → ¿qué productores tienen más observaciones?
 *   3. POR VARIEDAD   → ¿qué variedades concentran más observaciones?
 *   4. PROBLEMAS      → ¿qué criterios se desvían más y con qué base?
 *   5. OBSERVADOS     → promedios descriptivos de Brix y temperatura.
 *
 * Reglas que esta pantalla no rompe:
 * - Una DESVIACIÓN es una desviación respecto del criterio **configurado**,
 *   no un incumplimiento normativo: el 100 % de los criterios está
 *   PENDIENTE DE VALIDACIÓN.
 * - No se.rankings, puntuaciones ni veredictos de "mejor/peor".
 * - Toda tasa muestra su denominador y los registros sin determinación.
 * - No se consolidan muestras (N>1) ni se convierten unidades.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getCurrentSession,
  getUserProfile,
  listProducerQualityAnalysis,
  listQualityCoverage,
  listRecurringDeviationAnalysis,
  listStageQualityAnalysis,
  listVarietyQualityAnalysis,
} from '@qualitynx/database';
import type { UserRole } from '@qualitynx/shared';
import type {
  StageQualityRow,
  ProducerQualityRow,
  RecurringDeviationRow,
  VarietyQualityRow,
} from '@qualitynx/database';
import { EmptyState, LoadingBlock } from '@/components/ui';
import IndicadoresObservados from '@/components/analysis/IndicadoresObservados';

type Tab = 'etapa' | 'productor' | 'variedad' | 'problemas' | 'observados';

const TABS: { id: Tab; label: string; question: string }[] = [
  { id: 'etapa', label: 'Por etapa', question: '¿Cómo se encuentra cada etapa operacional?' },
  { id: 'productor', label: 'Por productor', question: '¿Qué productores tienen más observaciones y con qué volumen de datos?' },
  { id: 'variedad', label: 'Por variedad', question: '¿Qué variedades concentran más observaciones y qué las acompaña?' },
  { id: 'problemas', label: 'Problemas recurrentes', question: '¿Qué criterios se desvían más respecto de su configuración?' },
  { id: 'observados', label: 'Valores observados', question: '¿Qué valores observados existen, sin interpretarlos como cumplimiento?' },
];

/**
 * Umbral técnico deelnivel de datos para mostrar tasas.
 * No es un criterio de calidad ni un umbral de negocio: solo evita
 * presentar porcentajes sobre muestras de un solo registro.
 */
const MIN_EVALUATIONS_FOR_RATE = 5;

const panel = 'rounded-xl border border-[#1a1a1a]/10 bg-white px-4 py-3.5';
const th = 'px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]';
const td = 'px-2.5 py-2 text-[12px] text-[#1a1a1a]';
const thN = 'px-2.5 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]';
const tdN = 'px-2.5 py-2 text-right text-[12px] text-[#1a1a1a]';

function Rate({ value, total }: { value: number; total: number }) {
  if (total < MIN_EVALUATIONS_FOR_RATE) {
    return <span className="text-[#9aa090]">datos insuficientes ({total})</span>;
  }
  return (
    <span>
      {((value / total) * 100).toFixed(1)} %{' '}
      <span className="text-[10px] text-[#9aa090]">({value}/{total})</span>
    </span>
  );
}

function Base({ determined, nonDetermination }: { determined: number; nonDetermination: number }) {
  return (
    <span>
      {determined} <span className="text-[10px] text-[#9aa090]">base</span>
      {nonDetermination > 0 ? (
        <span className="block text-[10px] text-[#8a6d1f]">
          {nonDetermination} sin determinación (excluidos de la tasa)
        </span>
      ) : null}
    </span>
  );
}

export default function AnalisisPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('etapa');

  const [stages, setStages] = useState<StageQualityRow[]>([]);
  const [producers, setProducers] = useState<ProducerQualityRow[]>([]);
  const [varieties, setVarieties] = useState<VarietyQualityRow[]>([]);
  const [problems, setProblems] = useState<RecurringDeviationRow[]>([]);
  const [coverage, setCoverage] = useState<import('@qualitynx/database').QualityCoverageRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { session } = await getCurrentSession();
      if (!session) return;
      const { data } = await getUserProfile(session.user.id);
      if (data) {
        setCompanyId((data as { company_id: string | null }).company_id);
        setRole((data as { role: UserRole }).role);
      }
    };
    void init();
  }, []);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [cov, st, pr, pb, vr] = await Promise.all([
      listQualityCoverage(companyId),
      listStageQualityAnalysis(companyId),
      listProducerQualityAnalysis(companyId),
      listRecurringDeviationAnalysis(companyId, 20),
      listVarietyQualityAnalysis(companyId),
    ]);
    setCoverage(cov.data ?? null);
    setStages(st.data ?? []);
    setProducers(pr.data ?? []);
    setVarieties(vr.data ?? []);
    setProblems(pb.data ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const active = useMemo(() => TABS.find((t) => t.id === tab)!, [tab]);

  const stageRows = useMemo(
    () => (stages ?? []).filter((s) => s.inspections > 0 || s.criteria > 0),
    [stages]
  );
  const problemRows = useMemo(
    () => (problems ?? []).filter((p) => p.evaluations_desviacion > 0),
    [problems]
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold text-[#1a1a1a]">Análisis</h1>
        <p className="mt-1 max-w-4xl text-[12px] leading-relaxed text-[#5c6b45]">
          Lectura de la operación a partir de datos persistidos. Una desviación es una
          diferencia respecto del criterio <strong>configurado</strong>, no un
          incumplimiento normativo: hoy el {coverage?.criteria_total ?? 0} criterios están
          PENDIENTE DE VALIDACIÓN y {coverage?.criteria_with_source ?? 0} tienen fuente
          informada. Sesión {role ?? '—'} · solo consulta.
        </p>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-[#1a1a1a]/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              tab === t.id
                ? 'bg-[#1a1a1a] text-white'
                : 'text-[#73786a] hover:bg-white hover:text-[#1a1a1a]'
            }`}
            data-testid={`tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-[13px] font-medium text-[#1a1a1a]">{active.question}</p>

      {tab === 'observados' ? (
        <IndicadoresObservados />
      ) : loading ? (
        <LoadingBlock />
      ) : (
        <>
          {tab === 'etapa' ? (
            <section className={panel}>
              {stageRows.length === 0 ? (
                <EmptyState
                  title="Sin inspecciones por etapa"
                  description="No hay inspecciones registradas en esta empresa todavía."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" data-testid="tabla-etapas">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]/10">
                        <th className={th}>Etapa</th>
                        <th className={thN}>Inspecciones</th>
                        <th className={thN}>Completadas</th>
                        <th className={thN}>Criterios</th>
                        <th className={thN}>Con límites</th>
                        <th className={thN}>Validados</th>
                        <th className={thN}>Desviaciones</th>
                        <th className={th}>Base de la tasa</th>
                        <th className={th}>Tasa de desviación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageRows.map((s) => (
                        <tr key={s.stage_id ?? 'sin-etapa'} className="border-b border-[#1a1a1a]/5">
                          <td className={`${td} font-medium`}>{s.stage_name}</td>
                          <td className={tdN}>{s.inspections}</td>
                          <td className={tdN}>{s.inspections_completed}</td>
                          <td className={tdN}>{s.criteria}</td>
                          <td className={tdN}>{s.criteria_with_limits}</td>
                          <td className={tdN}>{s.criteria_validated}</td>
                          <td className={tdN}>{s.evaluations_desviacion}</td>
                          <td className={td}>
                            <Base
                              determined={s.evaluations_determined}
                              nonDetermination={s.evaluations_non_determination}
                            />
                          </td>
                          <td className={td}>
                            <Rate value={s.evaluations_desviacion} total={s.evaluations_determined} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-2 text-[11px] text-[#5c6b45]">
                “Sin determinación” son evaluaciones que el Quality Engine no pudo resolver
                (sin criterio configurado, unidad incompatible, configuración ambigua o
                criterio inactivo). No se cuentan como cumplimiento ni como desviación.
              </p>
            </section>
          ) : null}

          {tab === 'productor' ? (
            <section className={panel}>
              <p className="mb-2 text-[11px] text-[#5c6b45]">
                No es un ranking de calidad. No hay puntuaciones ni veredictos: cada fila
                muestra su volumen de datos y cuántas etapas cubre, para que la comparación
                sea visible y la juzgue usted.
              </p>
              {producers.length === 0 ? (
                <EmptyState
                  title="Sin productores"
                  description="No hay productores registrados en esta empresa."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" data-testid="tabla-productores">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]/10">
                        <th className={th}>Productor</th>
                        <th className={thN}>Lotes</th>
                        <th className={thN}>Inspecciones</th>
                        <th className={thN}>Etapas cubiertas</th>
                        <th className={thN}>Mediciones</th>
                        <th className={thN}>Desviaciones</th>
                        <th className={th}>Base</th>
                        <th className={th}>Tasa de desviación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {producers.map((p) => (
                        <tr key={p.producer_id} className="border-b border-[#1a1a1a]/5">
                          <td className={`${td} font-medium`}>{p.producer_name}</td>
                          <td className={tdN}>{p.lots}</td>
                          <td className={tdN}>{p.inspections}</td>
                          <td className={tdN}>{p.stages_covered}</td>
                          <td className={tdN}>{p.measurements}</td>
                          <td className={tdN}>{p.evaluations_desviacion}</td>
                          <td className={td}>
                            <Base
                              determined={p.evaluations_determined}
                              nonDetermination={p.evaluations_non_determination}
                            />
                          </td>
                          <td className={td}>
                            <Rate value={p.evaluations_desviacion} total={p.evaluations_determined} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {tab === 'variedad' ? (
            <section className={panel}>
              <p className="mb-2 text-[11px] text-[#5c6b45]">
                Lectura por variedad con el mismo criterio que por productor: no es un
                ranking de calidad. Se muestra el volumen de observaciones, cuántas etapas
                cubre y el criterio con más desviaciones, para que la comparación sea visible.
              </p>
              {varieties.length === 0 ? (
                <EmptyState
                  title="Sin variedades"
                  description="No hay variedades registradas en esta empresa."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" data-testid="tabla-variedades">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]/10">
                        <th className={th}>Variedad</th>
                        <th className={th}>Especie</th>
                        <th className={thN}>Productores</th>
                        <th className={thN}>Lotes</th>
                        <th className={thN}>Etapas</th>
                        <th className={thN}>Mediciones</th>
                        <th className={thN}>Desviaciones</th>
                        <th className={th}>Base</th>
                        <th className={th}>Tasa de desviación</th>
                        <th className={th}>Problema más frecuente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varieties.map((v) => (
                        <tr key={v.variety_id} className="border-b border-[#1a1a1a]/5">
                          <td className={`${td} font-medium`}>{v.variety_name}</td>
                          <td className={td}>{v.species_name ?? '—'}</td>
                          <td className={tdN}>{v.producers}</td>
                          <td className={tdN}>{v.lots}</td>
                          <td className={tdN}>{v.stages_covered}</td>
                          <td className={tdN}>{v.measurements}</td>
                          <td className={tdN}>{v.evaluations_desviacion}</td>
                          <td className={td}>
                            <Base
                              determined={v.evaluations_determined}
                              nonDetermination={v.evaluations_non_determination}
                            />
                          </td>
                          <td className={td}>
                            <Rate value={v.evaluations_desviacion} total={v.evaluations_determined} />
                          </td>
                          <td className={td}>
                            {v.top_criterion ? (
                              <span>
                                {v.top_criterion}{' '}
                                <span className="text-[10px] text-[#9aa090]">
                                  ({v.top_criterion_deviations})
                                </span>
                              </span>
                            ) : (
                              <span className="text-[#9aa090]">sin desviaciones</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {tab === 'problemas' ? (
            <section className={panel}>
              <p className="mb-2 text-[11px] text-[#5c6b45]">
                Ocurrencia = una evaluación con resultado DESVIACIÓN sobre el criterio
                configurado. Denominador = evaluaciones determinadas (CUMPLE + DESVIACIÓN).
                Se listan solo criterios con al menos una desviación.
              </p>
              {problemRows.length === 0 ? (
                <EmptyState
                  title="Sin desviaciones registradas"
                  description="No hay evaluaciones con resultado DESVIACIÓN en esta empresa."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" data-testid="tabla-problemas">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]/10">
                        <th className={th}>Criterio</th>
                        <th className={th}>Etapa</th>
                        <th className={th}>Unidad</th>
                        <th className={th}>Validación</th>
                        <th className={thN}>Desviaciones</th>
                        <th className={thN}>Cumple</th>
                        <th className={th}>Base</th>
                        <th className={th}>Tasa</th>
                        <th className={thN}>Inspecciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problemRows.map((p) => (
                        <tr key={p.measurement_def_id} className="border-b border-[#1a1a1a]/5">
                          <td className={`${td} font-medium`}>{p.criterion_name}</td>
                          <td className={td}>{p.stage_name ?? '—'}</td>
                          <td className={td}>{p.unit ?? '—'}</td>
                          <td className={td}>
                            <span className="text-[#8a6d1f]">{p.validation_status ?? '—'}</span>
                          </td>
                          <td className={tdN}>{p.evaluations_desviacion}</td>
                          <td className={tdN}>{p.evaluations_cumple}</td>
                          <td className={td}>
                            <Base
                              determined={p.evaluations_determined}
                              nonDetermination={p.evaluations_non_determination}
                            />
                          </td>
                          <td className={td}>
                            <Rate value={p.evaluations_desviacion} total={p.evaluations_determined} />
                          </td>
                          <td className={tdN}>
                            <Link
                              className="underline"
                              href={`/dashboard/inspections?criterio=${p.measurement_def_id}`}
                            >
                              {p.inspections_touched}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}