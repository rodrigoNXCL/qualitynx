'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCompanyById,
  getCurrentSession,
  listDecisionsByLot,
  listInspectionPoints,
  listInspectionsByLot,
  listLots,
  listLotGenealogy,
  listMasterData,
  listOperationalStages,
  listQualityClassificationsByLot,
  listQualityEvaluationsByInspection,
} from '@qualitynx/database';
import {
  LotType,
  LOT_TYPE_LABELS,
  type Company,
  type DecisionRecord,
  type Inspection,
  type InspectionPoint,
  type Lot,
  type LotGenealogy,
  type OperationalStage,
  type Producer,
  type QualityClassification,
  type QualityEvaluation,
} from '@qualitynx/shared';

type LoadState = 'loading' | 'ready' | 'error';
type CompanyView = Partial<Company> & Record<string, unknown>;

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CL');
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-CL');
};

const readText = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return '—';
};

const readCompanyText = (company: CompanyView | null, keys: string[]) => {
  if (!company) return '—';
  for (const key of keys) {
    const value = readText(company[key]);
    if (value !== '—') return value;
  }
  return '—';
};

const SEMAPHORE_STYLES: Record<string, string> = {
  VERDE: 'bg-[#dce8c8] text-[#2f4016] border-[#4A5D23]/35',
  AMARILLO: 'bg-[#fef3c7] text-[#92400e] border-amber-300/70',
  ROJO: 'bg-[#fee2e2] text-[#991b1b] border-red-300/70',
};

export default function LotReportPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [state, setState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [lot, setLot] = useState<Lot | null>(null);
  const [company, setCompany] = useState<CompanyView | null>(null);
  const [producer, setProducer] = useState<Producer | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [classifications, setClassifications] = useState<QualityClassification[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [qeByInspection, setQeByInspection] = useState<Map<string, QualityEvaluation[]>>(new Map());
  const [points, setPoints] = useState<InspectionPoint[]>([]);
  const [stages, setStages] = useState<OperationalStage[]>([]);
  const [allLots, setAllLots] = useState<Lot[]>([]);
  const [genealogySources, setGenealogySources] = useState<LotGenealogy[]>([]);
  const [genealogyTargets, setGenealogyTargets] = useState<LotGenealogy[]>([]);
  const [reportDate] = useState(() => new Date().toLocaleString('es-CL'));
  const [aiSection, setAiSection] = useState<
    | { status: 'idle' | 'loading' | 'ready' | 'error'; text?: string; error?: string }
    >({ status: 'idle' });

  const loadAiHistorical = useCallback(async () => {
    if (!id) return;
    setAiSection({ status: 'loading' });
    try {
      const { session } = await getCurrentSession();
      if (!session?.access_token) {
        setAiSection({ status: 'error', error: 'Sesión expirada. Vuelve a iniciar sesión.' });
        return;
      }
      const res = await fetch('/api/ai/analyze-lot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ lot_id: id }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        analysis?: {
          summary?: string;
          trends?: string;
          risks?: string;
          notes?: string[];
        };
        error?: string;
      };
      if (!res.ok || !json.analysis) {
        setAiSection({ status: 'error', error: json.error ?? 'No fue posible analizar el historial.' });
        return;
      }
      const parts = [
        json.analysis.summary?.trim(),
        json.analysis.trends?.trim(),
        json.analysis.risks?.trim(),
        ...(json.analysis.notes ?? []).map((n) => n.trim()).filter(Boolean),
      ].filter(Boolean);
      setAiSection({ status: 'ready', text: parts.join('\n\n') });
    } catch {
      setAiSection({ status: 'error', error: 'No pudimos generar el análisis histórico.' });
    }
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setState('loading');
    setErrorMsg('');
    try {
      const [
        lotsRes,
        producersRes,
        stagesRes,
        pointsRes,
        inspRes,
        classRes,
        decisionsRes,
      ] = await Promise.all([
        listLots(),
        listMasterData('producers'),
        listOperationalStages(),
        listInspectionPoints(),
        listInspectionsByLot(id),
        listQualityClassificationsByLot(id),
        listDecisionsByLot(id),
      ]);

      const foundLot = ((lotsRes.data as Lot[]) ?? []).find((item) => item.id === id) ?? null;
      if (!foundLot) {
        setErrorMsg('No pudimos cargar el lote.');
        setState('error');
        return;
      }

      const companyRes = await getCompanyById(foundLot.company_id);
      const foundProducer =
        ((producersRes.data as Producer[]) ?? []).find((item) => item.id === foundLot.producer_id) ??
        null;
      const allInspections = ((inspRes.data as Inspection[]) ?? []).slice().sort(
        (a, b) => a.inspected_at.localeCompare(b.inspected_at)
      );
      const allPoints = (pointsRes.data as InspectionPoint[]) ?? [];
      const allStages = (stagesRes.data as OperationalStage[]) ?? [];

      const qeMap = new Map<string, QualityEvaluation[]>();
      await Promise.all(
        allInspections.map(async (insp) => {
          try {
            const { data } = await listQualityEvaluationsByInspection(insp.id);
            if (data) qeMap.set(insp.id, data as QualityEvaluation[]);
          } catch {
            // best-effort
          }
        })
      );

      setLot(foundLot);
      setCompany((companyRes.data as CompanyView | null) ?? null);
      setProducer(foundProducer);
      setInspections(allInspections);
      setClassifications(((classRes.data as QualityClassification[]) ?? []).slice());
      setDecisions(((decisionsRes.data as DecisionRecord[]) ?? []).filter((d) => d.lot_id === id));
      setQeByInspection(qeMap);
      setPoints(allPoints);
      setStages(allStages);
      setAllLots((lotsRes.data as Lot[]) ?? []);

      // Genealogía bajo demanda: orígenes y destinos del lote actual.
      const [sourcesRes, targetsRes] = await Promise.all([
        listLotGenealogy({ derived_lot_id: id }),
        listLotGenealogy({ source_lot_id: id }),
      ]);
      setGenealogySources((sourcesRes.data as LotGenealogy[]) ?? []);
      setGenealogyTargets((targetsRes.data as LotGenealogy[]) ?? []);

      setState('ready');
    } catch {
      setErrorMsg('No pudimos cargar el informe de lote.');
      setState('error');
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handlePrint = () => window.print();

  if (state === 'loading') {
    return (
      <div className="space-y-4">
        <p className="text-[13px] text-[#888]">Cargando informe de lote…</p>
      </div>
    );
  }

  if (state === 'error' || !lot) {
    return (
      <div className="space-y-4">
        <p className="qx-banner qx-banner-error">{errorMsg || 'Error al cargar el informe.'}</p>
        <Link href="/dashboard/reports" className="qx-btn-ghost">
          Volver a informes
        </Link>
      </div>
    );
  }

  const latestClass = classifications[0] ?? null;
  const pointName = (pid: string) => points.find((p) => p.id === pid)?.name ?? '—';
  const stageName = (sid: string | null) =>
    sid ? (stages.find((s) => s.id === sid)?.name ?? '—') : '—';
  const completed = inspections.filter((i) => i.status === 'COMPLETADA');

  return (
    <div className="report-document" data-testid="lot-report" id="lot-report">
      <div className="report-screen-controls report-screen-only">
        <Link href="/dashboard/reports" className="qx-btn-ghost">
          Volver a informes
        </Link>
        <div className="report-actions">
          <button type="button" onClick={handlePrint} className="qx-btn-brand-solid">
            GENERAR PDF
          </button>
          <button type="button" onClick={handlePrint} className="qx-btn-ghost">
            IMPRIMIR
          </button>
        </div>
      </div>

      <header className="report-company-header">
        <div className="report-brand-lockup">
          <div className="report-company-mark">QX</div>
          <div>
            <p className="report-company-name">{readCompanyText(company, ['name'])}</p>
            <p className="report-company-subtitle">Informe histórico de lote</p>
          </div>
        </div>
        <div className="report-company-details">
          <span>RUT: {readCompanyText(company, ['rut'])}</span>
          <span>Dirección: {readCompanyText(company, ['address'])}</span>
          <span>Email: {readCompanyText(company, ['email'])}</span>
        </div>
      </header>

      <main className="report-content">
        <section className="report-title-section report-section">
          <p className="report-kicker">INFORME HISTÓRICO DE LOTE</p>
          <h1 className="report-title">{lot.folio || lot.harvest_block}</h1>
          <p className="report-subtitle">
            {producer?.name ?? 'Productor —'} · bloque {lot.harvest_block}
          </p>
          <div className="report-title-meta">
            <span>Estado: {lot.status}</span>
            <span>Etapa actual: {stageName(lot.current_operational_stage_id)}</span>
            <span>Emisión: {reportDate}</span>
          </div>
        </section>

        <section className="report-panel report-section">
          <h2>1. Identificación del lote</h2>
          <dl className="report-fields report-fields-four">
            <div><dt>Folio / lote</dt><dd>{lot.folio || '—'}</dd></div>
            <div><dt>Folio interno / planta</dt><dd>{lot.folio_interno ?? '—'}</dd></div>
            <div><dt>Tipo de lote</dt><dd>{LOT_TYPE_LABELS[lot.lot_type ?? LotType.ORIGEN]}</dd></div>
            <div><dt>Bloque de cosecha</dt><dd>{lot.harvest_block}</dd></div>
            <div><dt>Productor</dt><dd>{producer?.name ?? '—'}</dd></div>
            <div><dt>Guía productor</dt><dd>{lot.producer_guide_number ?? '—'}</dd></div>
            <div><dt>Fecha de fruta</dt><dd>{formatDate(lot.fruit_date)}</dd></div>
            <div><dt>Estado</dt><dd>{lot.status}</dd></div>
            <div><dt>Etapa de entrada</dt><dd>{stageName(lot.entry_operational_stage_id)}</dd></div>
            <div><dt>Etapa actual</dt><dd>{stageName(lot.current_operational_stage_id)}</dd></div>
            <div><dt>Embalaje</dt><dd>{lot.packaging_type ?? '—'}</dd></div>
            <div><dt>Cantidad</dt><dd>{lot.quantity != null ? `${lot.quantity} envases` : '—'}</dd></div>
            <div><dt>Kg declarados (guía)</dt><dd>{lot.kg_declarados != null ? `${lot.kg_declarados} kg` : '—'}</dd></div>
            <div><dt>Peso teórico</dt><dd>{lot.theoretical_weight_kg != null ? `${lot.theoretical_weight_kg} kg` : '—'}</dd></div>
            <div><dt>ID lote</dt><dd className="report-id">{lot.id}</dd></div>
          </dl>
          {(lot.lot_type ?? LotType.ORIGEN) !== LotType.ORIGEN && (
            <p className="report-section-note">
              Lote derivado ({LOT_TYPE_LABELS[lot.lot_type ?? LotType.ORIGEN]}): conserva la
              relación de genealogía con sus lotes fuente en la historia.
            </p>
          )}
        </section>

        {(genealogySources.length > 0 || genealogyTargets.length > 0) && (
          <section className="report-panel report-section">
            <h2>1b. Genealogía</h2>
            {genealogySources.length > 0 && (
              <>
                <h3 className="report-subsection-title">Orígenes (lotes que aportaron a este lote)</h3>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Folio origen</th>
                        <th>Tipo</th>
                        <th>Cantidad aportada</th>
                        <th>Relación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {genealogySources.map((g) => {
                        const sourceLot = allLots.find((l) => l.id === g.source_lot_id);
                        return (
                          <tr key={g.id}>
                            <td>{sourceLot?.folio || g.source_lot_id}</td>
                            <td>{LOT_TYPE_LABELS[sourceLot?.lot_type ?? LotType.ORIGEN]}</td>
                            <td>
                              {g.quantity != null
                                ? `${g.quantity} ${g.unit || 'unid.'}`
                                : 'No registrada'}
                            </td>
                            <td>{LOT_TYPE_LABELS[lot.lot_type ?? LotType.ORIGEN]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {genealogyTargets.length > 0 && (
              <>
                <h3 className="report-subsection-title">Destinos (lotes derivados desde este lote)</h3>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Folio destino</th>
                        <th>Tipo</th>
                        <th>Cantidad transferida</th>
                        <th>Relación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {genealogyTargets.map((g) => {
                        const targetLot = allLots.find((l) => l.id === g.derived_lot_id);
                        return (
                          <tr key={g.id}>
                            <td>{targetLot?.folio || g.derived_lot_id}</td>
                            <td>{LOT_TYPE_LABELS[targetLot?.lot_type ?? LotType.ORIGEN]}</td>
                            <td>
                              {g.quantity != null
                                ? `${g.quantity} ${g.unit || 'unid.'}`
                                : 'No registrada'}
                            </td>
                            <td>{LOT_TYPE_LABELS[targetLot?.lot_type ?? LotType.ORIGEN]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        <section className="report-panel report-section">
          <div className="report-section-heading">
            <h2>2. Última clasificación comercial y semáforo</h2>
            <span className="report-section-note">Vigente al momento de emitir · no reemplaza decisión formal</span>
          </div>
          {latestClass ? (
            <>
              <dl className="report-fields">
                <div><dt>Clase comercial</dt><dd>{latestClass.commercial_class}</dd></div>
                <div><dt>Semáforo QualityNX</dt><dd>{latestClass.semaphore}</dd></div>
                <div><dt>Fecha clasificación</dt><dd>{formatDateTime(latestClass.classified_at)}</dd></div>
                <div><dt>Versión de lógica</dt><dd className="report-id">{latestClass.logic_version}</dd></div>
              </dl>
              <p className="report-empty" style={{ whiteSpace: 'pre-wrap' }}>{latestClass.justification}</p>
              <p
                className="qx-chip mt-2"
                style={{
                  display: 'inline-block',
                  background:
                    latestClass.semaphore === 'VERDE'
                      ? '#dce8c8'
                      : latestClass.semaphore === 'ROJO'
                        ? '#fee2e2'
                        : '#fef3c7',
                }}
              >
                {latestClass.semaphore}
              </p>
            </>
          ) : (
            <p className="report-empty">Sin clasificación registrada para este lote.</p>
          )}
        </section>

        <section className="report-panel report-section">
          <h2>3. Historia de inspecciones ({inspections.length})</h2>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Punto</th>
                  <th>Estado</th>
                  <th>Resultado técnico</th>
                  <th>Decisión</th>
                  <th>QE (CUMPLE / DESV)</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((insp) => {
                  const qe = qeByInspection.get(insp.id) ?? [];
                  const cumple = qe.filter((e) => e.result === 'CUMPLE').length;
                  const desv = qe.filter((e) => e.result === 'DESVIACIÓN').length;
                  return (
                    <tr key={insp.id}>
                      <td>{formatDateTime(insp.inspected_at)}</td>
                      <td>{pointName(insp.inspection_point_id)}</td>
                      <td>{insp.status}</td>
                      <td>{insp.result ?? '—'}</td>
                      <td>{insp.decision ?? '—'}</td>
                      <td>{qe.length ? `${cumple} / ${desv}` : '—'}</td>
                    </tr>
                  );
                })}
                {inspections.length === 0 && (
                  <tr><td colSpan={6}>Sin inspecciones registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="report-section-note">
            Inspecciones completadas: {completed.length} · total: {inspections.length}
          </p>
        </section>

        <section className="report-panel report-section">
          <h2>4. Clasificaciones históricas ({classifications.length})</h2>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Inspección</th>
                  <th>Clase</th>
                  <th>Semáforo</th>
                  <th>Justificación (resumen)</th>
                </tr>
              </thead>
              <tbody>
                {classifications.map((c) => (
                  <tr key={c.id}>
                    <td>{formatDateTime(c.classified_at)}</td>
                    <td className="report-id">{c.inspection_id.slice(0, 8)}</td>
                    <td>{c.commercial_class}</td>
                    <td>
                      <span className={`qx-chip ${SEMAPHORE_STYLES[c.semaphore] ?? SEMAPHORE_STYLES.AMARILLO}`}>
                        {c.semaphore}
                      </span>
                    </td>
                    <td style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{c.justification}</td>
                  </tr>
                ))}
                {classifications.length === 0 && (
                  <tr><td colSpan={5}>Sin clasificaciones registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="report-section-note">
            Semáforo operacional QualityNX (no SAG). Append-only: el histórico no se sobrescribe.
          </p>
        </section>

        <section className="report-panel report-section">
          <h2>5. Decisiones formales ({decisions.length})</h2>
          {decisions.length === 0 ? (
            <p className="report-empty">Sin decisiones formales registradas.</p>
          ) : (
            <div className="report-decisions">
              {decisions.map((decision) => (
                <div className="report-decision" key={decision.id}>
                  <div>
                    <strong>{decision.decision_label}</strong> <span>{decision.status}</span>
                  </div>
                  <p>Fecha: {formatDateTime(decision.decided_at)}</p>
                  {decision.fundamento && <p>Fundamento: {decision.fundamento}</p>}
                </div>
              ))}
            </div>
          )}
          <p className="report-section-note">
            La decisión humana es independiente de clasificación/semáforo y no se altera aquí.
          </p>
        </section>

        <section className="report-panel report-section">
          <h2>6. Identificación del informe</h2>
          <dl className="report-fields">
            <div><dt>ID lote</dt><dd className="report-id">{lot.id}</dd></div>
            <div><dt>Emisión</dt><dd>{reportDate}</dd></div>
            <div>
              <dt>Inspecciones vinculadas</dt>
              <dd>
                {inspections.map((i) => (
                  <span key={i.id}>
                    <Link href={`/dashboard/inspections/${i.id}/report`}>{i.id.slice(0, 8)}</Link>{' '}
                  </span>
                ))}
                {inspections.length === 0 ? '—' : null}
              </dd>
            </div>
          </dl>
        </section>

        <section className="report-panel report-section" data-testid="lot-ai-historical">
          <div className="report-section-heading">
            <h2>ANÁLISIS HISTÓRICO — QUALITYNX IA</h2>
            <span className="report-section-note">Informativo · basado solo en datos del historial</span>
          </div>
          {aiSection.status === 'idle' && (
            <div>
              <p className="report-empty">
                Genera un análisis breve de la evolución del lote a partir de sus inspecciones,
                QE, clasificaciones y decisiones reales. No modifica la historia ni reemplaza la
                decisión formal.
              </p>
              <button
                type="button"
                className="qx-btn-brand-solid mt-3"
                onClick={() => void loadAiHistorical()}
              >
                Generar análisis histórico IA
              </button>
            </div>
          )}
          {aiSection.status === 'loading' && (
            <p className="report-empty">Generando análisis histórico con QualityNX IA…</p>
          )}
          {aiSection.status === 'error' && (
            <div>
              <p className="report-empty">{aiSection.error}</p>
              <button
                type="button"
                className="qx-btn-ghost mt-3"
                onClick={() => void loadAiHistorical()}
              >
                Reintentar
              </button>
            </div>
          )}
          {aiSection.status === 'ready' && aiSection.text && (
            <div>
              <p className="report-empty" style={{ whiteSpace: 'pre-wrap' }}>
                {aiSection.text}
              </p>
              <p className="report-section-note">
                Análisis generado por QualityNX IA. Solo resume datos existentes; no inventa
                criterios ni sustituye la decisión humana.
              </p>
              <button
                type="button"
                className="qx-btn-ghost mt-3"
                onClick={() => void loadAiHistorical()}
              >
                Regenerar
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
