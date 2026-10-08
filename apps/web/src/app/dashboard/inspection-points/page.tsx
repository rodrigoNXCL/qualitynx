'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createSamplingPlan,
  getCurrentSession,
  getUserProfile,
  listInspectionPoints,
  listMasterData,
  listMeasurementDefs,
  listNormativeReferences,
  listOperationalStages,
  listSamplingPlans,
  listCriterionNormativeReferences,
  replaceCriterionNormativeReferences,
  setSamplingPlanActive,
  updateMeasurementDef,
  updateSamplingPlan,
} from '@qualitynx/database';
import {
  UserRole,
  type InspectionPoint,
  type MeasurementDef,
  type OperationalStage,
  type SamplingPlan,
  type SamplingRuleBasis,
  type SamplingRounding,
  type NormativeReference,
} from '@qualitynx/shared';
import { StatusChip } from '@/components/ui';

type Message = { type: 'ok' | 'error'; text: string } | null;
const inputClass = 'qx-input';

export default function InspectionPointsPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [points, setPoints] = useState<InspectionPoint[]>([]);
  const [stages, setStages] = useState<OperationalStage[]>([]);
  const [speciesList, setSpeciesList] = useState<{ id: string; name: string }[]>([]);
  const [selectedPointId, setSelectedPointId] = useState('');
  const [defs, setDefs] = useState<MeasurementDef[]>([]);
  const [plans, setPlans] = useState<SamplingPlan[]>([]);
  const [defsLoading, setDefsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [normativeReferences, setNormativeReferences] = useState<NormativeReference[]>([]);
  const [profileDefId, setProfileDefId] = useState<string | null>(null);
  const [profileMeasure, setProfileMeasure] = useState('');
  const [profileObservation, setProfileObservation] = useState('');
  const [profileMethod, setProfileMethod] = useState('');
  const [profileInstrument, setProfileInstrument] = useState('');
  const [profileUnit, setProfileUnit] = useState('');
  const [profileScale, setProfileScale] = useState('');
  const [profileOptions, setProfileOptions] = useState('');
  const [profileSchemaMin, setProfileSchemaMin] = useState('');
  const [profileSchemaMax, setProfileSchemaMax] = useState('');
  const [profileStatus, setProfileStatus] = useState('CONFIGURABLE POR PROTOCOLO/CLIENTE');
  const [profileReferenceIds, setProfileReferenceIds] = useState<string[]>([]);

  const [planId, setPlanId] = useState('');
  const [planName, setPlanName] = useState('');
  const [planBasis, setPlanBasis] = useState<SamplingRuleBasis>('quantity');
  const [planDivisor, setPlanDivisor] = useState('');
  const [planSamples, setPlanSamples] = useState('');
  const [planMin, setPlanMin] = useState('');
  const [planMax, setPlanMax] = useState('');
  const [planRounding, setPlanRounding] = useState<SamplingRounding>('ceil');
  const [planUnit, setPlanUnit] = useState('');
  const [planOrigin, setPlanOrigin] = useState('');
  const [planMethod, setPlanMethod] = useState('');
  const [planInstrument, setPlanInstrument] = useState('');

  const canManage =
    role === UserRole.COMPANY_ADMIN || role === UserRole.SUPER_ADMIN;
  const selectedPoint = points.find((p) => p.id === selectedPointId) ?? null;

  const loadAll = useCallback(async () => {
    const [pointsRes, stagesRes, speciesRes, referencesRes] = await Promise.all([
      listInspectionPoints(),
      listOperationalStages(),
      listMasterData('species'),
      listNormativeReferences(),
    ]);
    setPoints((pointsRes.data as InspectionPoint[]) ?? []);
    setStages((stagesRes.data as OperationalStage[]) ?? []);
    setSpeciesList(
      ((speciesRes.data as { id: string; name: string; is_active: boolean }[]) ?? []).filter(
        (s) => s.is_active
      )
    );
    setNormativeReferences((referencesRes.data as NormativeReference[]) ?? []);
  }, []);

  const loadDefs = useCallback(async () => {
    if (!selectedPointId) {
      setDefs([]);
      return;
    }
    setDefsLoading(true);
    try {
      const { data } = await listMeasurementDefs(selectedPointId, { includeInactive: true });
      setDefs(
        ((data as MeasurementDef[]) ?? []).sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
        )
      );
    } finally {
      setDefsLoading(false);
    }
  }, [selectedPointId]);

  const loadPlans = useCallback(async () => {
    if (!selectedPointId) {
      setPlans([]);
      return;
    }
    const { data } = await listSamplingPlans(selectedPointId);
    setPlans((data as SamplingPlan[]) ?? []);
  }, [selectedPointId]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDefs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDefs]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPlans();
      setPlanId('');
      setPlanName('');
      setPlanBasis('quantity');
      setPlanDivisor('');
      setPlanSamples('');
      setPlanMin('');
      setPlanMax('');
      setPlanRounding('ceil');
      setPlanUnit('');
      setPlanOrigin('');
      setPlanMethod('');
      setPlanInstrument('');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPlans]);

  const speciesName = (id: string) => speciesList.find((s) => s.id === id)?.name ?? '—';
  const stageName = (id: string | null) =>
    id ? stages.find((s) => s.id === id)?.name ?? '—' : 'Sin etapa';

  const resetPlan = useCallback(() => {
    setPlanId('');
    setPlanName('');
    setPlanBasis('quantity');
    setPlanDivisor('');
    setPlanSamples('');
    setPlanMin('');
    setPlanMax('');
    setPlanRounding('ceil');
    setPlanUnit('');
    setPlanOrigin('');
    setPlanMethod('');
    setPlanInstrument('');
  }, []);

  const editPlan = (plan: SamplingPlan) => {
    setPlanId(plan.id);
    setPlanName(plan.name);
    setPlanBasis(plan.rule.basis);
    setPlanDivisor(plan.rule.divisor != null ? String(plan.rule.divisor) : '');
    setPlanSamples(plan.rule.samples != null ? String(plan.rule.samples) : '');
    setPlanMin(plan.rule.min_samples != null ? String(plan.rule.min_samples) : '');
    setPlanMax(plan.rule.max_samples != null ? String(plan.rule.max_samples) : '');
    setPlanRounding(plan.rule.rounding ?? 'ceil');
    setPlanUnit(plan.sampling_unit ?? '');
    setPlanOrigin(plan.origin_context ?? '');
    setPlanMethod(plan.method_text ?? '');
    setPlanInstrument(plan.instrument_text ?? '');
  };

  const handleToggleDef = async (def: MeasurementDef, field: 'is_active' | 'is_required' | 'evidence_required') => {
    if (!canManage) return;
    setBusy(true);
    setMessage(null);
    const { error } = await updateMeasurementDef(def.id, { [field]: !def[field] });
    if (error) {
      setMessage({ type: 'error', text: 'No pudimos actualizar la configuración del criterio.' });
    } else {
      setMessage({ type: 'ok', text: `Criterio ${def.name} actualizado.` });
      await loadDefs();
    }
    setBusy(false);
  };

  const openProfile = async (def: MeasurementDef) => {
    setProfileDefId(def.id);
    setProfileMeasure(def.description ?? '');
    setProfileObservation(def.observation_instructions ?? '');
    setProfileMethod(def.method_text ?? '');
    setProfileInstrument(def.instrument_text ?? '');
    setProfileUnit(def.unit ?? '');
    setProfileScale(def.scale_description ?? '');
    setProfileOptions((def.options ?? []).join(', '));
    setProfileStatus(def.technical_status || 'CONFIGURABLE POR PROTOCOLO/CLIENTE');
    const schema = (def.response_schema ?? {}) as { min_value?: unknown; max_value?: unknown };
    setProfileSchemaMin(typeof schema.min_value === 'number' ? String(schema.min_value) : '');
    setProfileSchemaMax(typeof schema.max_value === 'number' ? String(schema.max_value) : '');
    const { data } = await listCriterionNormativeReferences(def.id);
    const refs = (data as { normative_reference_id?: string }[]) ?? [];
    setProfileReferenceIds(refs.map((r) => r.normative_reference_id).filter((id): id is string => Boolean(id)));
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !profileDefId) return;
    const currentDef = defs.find((def) => def.id === profileDefId);
    if (profileStatus === 'CONFIGURADO') {
      if (!profileMeasure.trim() || !profileObservation.trim() || !profileMethod.trim() || !profileInstrument.trim() || !profileUnit.trim() || profileReferenceIds.length === 0) {
        setMessage({ type: 'error', text: 'Para marcar CONFIGURADO completa la definición técnica y asocia una fuente.' });
        return;
      }
      if (
        currentDef &&
        ['lista', 'multiselección', 'sí/no'].includes(currentDef.value_type) &&
        !profileOptions.trim()
      ) {
        setMessage({ type: 'error', text: 'Define los valores válidos del criterio antes de marcarlo CONFIGURADO.' });
        return;
      }
    }
    const options = profileOptions
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const schema: Record<string, unknown> = {
      ...(profileUnit.trim() ? { unit: profileUnit.trim() } : {}),
      ...(options.length > 0 ? { allowed_values: options } : {}),
      ...(profileSchemaMin.trim() ? { min_value: Number(profileSchemaMin) } : {}),
      ...(profileSchemaMax.trim() ? { max_value: Number(profileSchemaMax) } : {}),
    };
    setBusy(true);
    try {
      const { error } = await updateMeasurementDef(profileDefId, {
        description: profileMeasure.trim() || null,
        observation_instructions: profileObservation.trim() || null,
        method_text: profileMethod.trim() || null,
        instrument_text: profileInstrument.trim() || null,
        unit: profileUnit.trim() || null,
        scale_description: profileScale.trim() || null,
        options,
        response_schema: schema,
        technical_status: profileStatus,
      });
      if (error) {
        setMessage({ type: 'error', text: 'No pudimos guardar la definición técnica.' });
        return;
      }
      const referenceResult = await replaceCriterionNormativeReferences(
        profileDefId,
        profileReferenceIds
      );
      if (referenceResult.error) {
        setMessage({ type: 'error', text: 'Guardamos la definición técnica, pero no la asociación normativa.' });
        return;
      }
      setMessage({ type: 'ok', text: 'Definición técnica y referencias actualizadas.' });
      setProfileDefId(null);
      await loadDefs();
    } finally {
      setBusy(false);
    }
  };

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !companyId || !selectedPointId || !planName.trim()) {
      setMessage({ type: 'error', text: 'Selecciona punto y completa el nombre del plan.' });
      return;
    }
    if (planBasis !== 'fixed' && (!planDivisor.trim() || Number(planDivisor) <= 0)) {
      setMessage({ type: 'error', text: 'El divisor debe ser mayor que cero.' });
      return;
    }
    if (planBasis === 'fixed' && (!planSamples.trim() || Number(planSamples) < 1)) {
      setMessage({ type: 'error', text: 'El plan fijo requiere una cantidad positiva.' });
      return;
    }
    const rule = {
      basis: planBasis,
      rounding: planRounding,
      ...(planBasis === 'fixed'
        ? { samples: Number(planSamples) }
        : { divisor: Number(planDivisor) }),
      ...(planMin.trim() ? { min_samples: Number(planMin) } : {}),
      ...(planMax.trim() ? { max_samples: Number(planMax) } : {}),
    };
    const payload = {
      company_id: companyId,
      inspection_point_id: selectedPointId,
      name: planName.trim(),
      rule,
      sampling_unit: planUnit.trim() || null,
      origin_context: planOrigin.trim() || null,
      method_text: planMethod.trim() || null,
      instrument_text: planInstrument.trim() || null,
      is_active: true,
    };
    setBusy(true);
    try {
      const result = planId ? await updateSamplingPlan(planId, payload) : await createSamplingPlan(payload);
      if (result.error) {
        setMessage({ type: 'error', text: 'No pudimos guardar el plan de muestreo.' });
        return;
      }
      setMessage({ type: 'ok', text: 'Plan de muestreo guardado.' });
      resetPlan();
      await loadPlans();
    } finally {
      setBusy(false);
    }
  };

  const togglePlan = async (plan: SamplingPlan) => {
    if (!canManage) return;
    setBusy(true);
    const { error } = await setSamplingPlanActive(plan.id, !plan.is_active);
    if (error) setMessage({ type: 'error', text: 'No pudimos cambiar el estado del plan.' });
    else await loadPlans();
    setBusy(false);
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      <header className="qx-opheader">
        <div className="min-w-0 flex-1">
          <p className="qx-eyebrow">Configuración</p>
          <h1 className="qx-h1">Puntos y criterios</h1>
          <p className="qx-sub max-w-3xl">
            Los 7 puntos base están definidos por el sistema. Cada empresa configura sus criterios y
            planes de muestreo; no se crean puntos nuevos en esta etapa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="qx-metric"><strong>{points.length}</strong><span>Puntos</span></div>
          <div className="qx-metric"><strong>{defs.filter((d) => d.is_active).length}</strong><span>Activos</span></div>
        </div>
      </header>

      {message && (
        <div role="status" className={`qx-banner ${message.type === 'ok' ? 'qx-banner-ok' : 'qx-banner-error'}`}>
          {message.text}
        </div>
      )}

      <section className="qx-card p-4 sm:p-6">
        <div className="qx-section-title"><h2>Puntos base</h2><span className="qx-count">{points.length} puntos</span></div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {points.map((point) => (
            <button
              type="button"
              key={point.id}
              onClick={() => setSelectedPointId(point.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${selectedPointId === point.id ? 'border-[#4A5D23] bg-[#eef1e6]' : 'border-[#1a1a1a]/10 bg-white'}`}
            >
              <div className="flex items-center justify-between gap-2"><span className="font-semibold text-[#1a1a1a]">{point.name}</span><StatusChip label={point.is_active ? 'ACTIVO' : 'INACTIVO'} /></div>
              <p className="mt-1 text-[12px] text-[#5c6355]">{speciesName(point.species_id)} · {stageName(point.operational_stage_id)}</p>
            </button>
          ))}
        </div>
        {!canManage && <p className="mt-4 text-[12px] text-[#5c6355]">Tu rol puede consultar; la configuración requiere Admin de Empresa.</p>}
      </section>

      {selectedPoint && (
        <>
          <section className="qx-card p-4 sm:p-6">
            <div className="qx-section-title"><div><h2>Criterios · {selectedPoint.name}</h2><p className="mt-1 text-[12px] text-[#5c6355]">Activa, desactiva o cambia obligatoriedad/evidencia sin modificar el catálogo base.</p></div><span className="qx-count">{defs.length} criterios</span></div>
            {defsLoading ? <p className="mt-4 text-[13px] text-[#5c6355]">Cargando criterios…</p> : (
              <ul className="mt-4 divide-y divide-[#1a1a1a]/[0.07]">
                {defs.map((def) => (
                  <li key={def.id} className={`py-3 ${def.is_active ? '' : 'opacity-60'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0"><p className="font-medium text-[#1a1a1a]">{def.name}</p><p className="text-[11px] text-[#5c6355]">{def.value_type}{def.unit ? ` · ${def.unit}` : ''} · {def.technical_status || 'CONFIGURABLE POR PROTOCOLO/CLIENTE'}</p></div>
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#1a1a1a]/10 px-3 text-[12px]"><input type="checkbox" checked={def.is_active} disabled={!canManage || busy} onChange={() => void handleToggleDef(def, 'is_active')} /> Activo</label>
                        <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#1a1a1a]/10 px-3 text-[12px]"><input type="checkbox" checked={def.is_required} disabled={!canManage || busy || !def.is_active} onChange={() => void handleToggleDef(def, 'is_required')} /> Obligatorio</label>
                        <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#1a1a1a]/10 px-3 text-[12px]"><input type="checkbox" checked={def.evidence_required} disabled={!canManage || busy || !def.is_active} onChange={() => void handleToggleDef(def, 'evidence_required')} /> Evidencia</label>
                        <button type="button" onClick={() => void openProfile(def)} disabled={!canManage || busy} className="qx-btn-ghost">Definición técnica</button>
                      </div>
                    </div>
                    {profileDefId === def.id && (
                      <form onSubmit={saveProfile} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[#4A5D23]/20 bg-[#f7f9f2] p-3.5 sm:grid-cols-2">
                        <div className="sm:col-span-2"><label className="block text-[11px] font-semibold uppercase text-[#5c6355]">Qué mide</label><input value={profileMeasure} onChange={(e) => setProfileMeasure(e.target.value)} className={inputClass} placeholder="Definición técnica pendiente de configurar" /></div>
                        <div><label className="block text-[11px] font-semibold uppercase text-[#5c6355]">Qué observar</label><textarea value={profileObservation} onChange={(e) => setProfileObservation(e.target.value)} className={inputClass} rows={2} placeholder="CONFIGURABLE POR PROTOCOLO/CLIENTE" /></div>
                        <div><label className="block text-[11px] font-semibold uppercase text-[#5c6355]">Cómo medir/registrar</label><textarea value={profileMethod} onChange={(e) => setProfileMethod(e.target.value)} className={inputClass} rows={2} placeholder="CONFIGURABLE POR PROTOCOLO/CLIENTE" /></div>
                        <div><label className="block text-[11px] font-semibold uppercase text-[#5c6355]">Instrumento</label><input value={profileInstrument} onChange={(e) => setProfileInstrument(e.target.value)} className={inputClass} placeholder="CONFIGURABLE POR PROTOCOLO/CLIENTE" /></div>
                        <div><label className="block text-[11px] font-semibold uppercase text-[#5c6355]">Unidad</label><input value={profileUnit} onChange={(e) => setProfileUnit(e.target.value)} className={inputClass} placeholder="No definir sin fuente" /></div>
                        <div><label className="block text-[11px] font-semibold uppercase text-[#5c6355]">Escala</label><input value={profileScale} onChange={(e) => setProfileScale(e.target.value)} className={inputClass} placeholder="CONFIGURABLE POR PROTOCOLO/CLIENTE" /></div>
                        <div><label className="block text-[11px] font-semibold uppercase text-[#5c6355]">Valores válidos</label><input value={profileOptions} onChange={(e) => setProfileOptions(e.target.value)} className={inputClass} placeholder="Separados por coma" /></div>
                        <div><label className="block text-[11px] font-semibold uppercase text-[#5c6355]">Mínimo del método</label><input type="number" step="any" value={profileSchemaMin} onChange={(e) => setProfileSchemaMin(e.target.value)} className={inputClass} placeholder="Solo si la fuente lo define" /></div>
                        <div><label className="block text-[11px] font-semibold uppercase text-[#5c6355]">Máximo del método</label><input type="number" step="any" value={profileSchemaMax} onChange={(e) => setProfileSchemaMax(e.target.value)} className={inputClass} placeholder="Solo si la fuente lo define" /></div>
                        <div><label className="block text-[11px] font-semibold uppercase text-[#5c6355]">Estado técnico</label><select value={profileStatus} onChange={(e) => setProfileStatus(e.target.value)} className={inputClass}><option value="CONFIGURABLE POR PROTOCOLO/CLIENTE">CONFIGURABLE POR PROTOCOLO/CLIENTE</option><option value="CONFIGURADO">CONFIGURADO</option></select></div>
                        <div className="sm:col-span-2"><p className="text-[11px] font-semibold uppercase text-[#5c6355]">Fuente normativa/técnica</p><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{normativeReferences.map((reference) => <label key={reference.id} className="flex items-start gap-2 rounded-lg border border-[#1a1a1a]/10 bg-white p-2.5 text-[11px] text-[#555]"><input type="checkbox" checked={profileReferenceIds.includes(reference.id)} onChange={(e) => setProfileReferenceIds((current) => e.target.checked ? [...current, reference.id] : current.filter((id) => id !== reference.id))} /><span>{reference.source_name} · {reference.document_name || 'documento por definir'} · {reference.country || 'mercado por definir'}</span></label>)}</div></div>
                        <div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={busy} className="qx-btn-primary">Guardar definición</button><button type="button" onClick={() => setProfileDefId(null)} className="qx-btn-ghost">Cancelar</button></div>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="qx-card p-4 sm:p-6">
             <div className="qx-section-title"><div><h2>Plan de muestreo</h2><p className="mt-1 text-[12px] text-[#5c6355]">Regla operacional base: 10 muestras por 1.000 kg (N = CEIL(kg / 1000 × 10)). Es una regla QualityNX, no una norma SAG universal.</p></div><span className="qx-count">{plans.length} planes</span></div>
            {canManage && (
              <form onSubmit={savePlan} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2"><label className="block text-[12px] font-semibold uppercase text-[#5c6355]">Nombre</label><input value={planName} onChange={(e) => setPlanName(e.target.value)} className={inputClass} required /></div>
                <div><label className="block text-[12px] font-semibold uppercase text-[#5c6355]">Base</label><select value={planBasis} onChange={(e) => setPlanBasis(e.target.value as SamplingRuleBasis)} className={inputClass}><option value="quantity">Cantidad de envases</option><option value="theoretical_weight_kg">Kg teóricos</option><option value="fixed">Cantidad fija</option></select></div>
                <div><label className="block text-[12px] font-semibold uppercase text-[#5c6355]">Redondeo</label><select value={planRounding} onChange={(e) => setPlanRounding(e.target.value as SamplingRounding)} className={inputClass}><option value="ceil">Techo</option><option value="floor">Piso</option><option value="round">Redondeo</option></select></div>
                {planBasis === 'fixed' ? <div><label className="block text-[12px] font-semibold uppercase text-[#5c6355]">N fijo</label><input type="number" min="1" value={planSamples} onChange={(e) => setPlanSamples(e.target.value)} className={inputClass} /></div> : <div><label className="block text-[12px] font-semibold uppercase text-[#5c6355]">Divisor</label><input type="number" min="0.001" step="any" value={planDivisor} onChange={(e) => setPlanDivisor(e.target.value)} className={inputClass} /></div>}
                <div><label className="block text-[12px] font-semibold uppercase text-[#5c6355]">Mínimo</label><input type="number" min="0" value={planMin} onChange={(e) => setPlanMin(e.target.value)} className={inputClass} /></div>
                <div><label className="block text-[12px] font-semibold uppercase text-[#5c6355]">Máximo</label><input type="number" min="1" value={planMax} onChange={(e) => setPlanMax(e.target.value)} className={inputClass} /></div>
                <div><label className="block text-[12px] font-semibold uppercase text-[#5c6355]">Unidad de muestreo (física)</label><input value={planUnit} onChange={(e) => setPlanUnit(e.target.value)} className={inputClass} placeholder="envase" /><p className="mt-1 text-[11px] text-[#73786a]">N = cantidad de estas unidades, no kg. Ej: envase.</p></div>
                <div><label className="block text-[12px] font-semibold uppercase text-[#5c6355]">Origen</label><input value={planOrigin} onChange={(e) => setPlanOrigin(e.target.value)} className={inputClass} placeholder="Configurable" /></div>
                <div><label className="block text-[12px] font-semibold uppercase text-[#5c6355]">Método</label><input value={planMethod} onChange={(e) => setPlanMethod(e.target.value)} className={inputClass} placeholder="Configurable" /></div>
                <div><label className="block text-[12px] font-semibold uppercase text-[#5c6355]">Instrumento</label><input value={planInstrument} onChange={(e) => setPlanInstrument(e.target.value)} className={inputClass} placeholder="Configurable" /></div>
                <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4"><button type="submit" disabled={busy} className="qx-btn-primary">{planId ? 'Guardar plan' : 'Crear plan'}</button>{planId && <button type="button" onClick={resetPlan} className="qx-btn-ghost">Cancelar</button>}</div>
              </form>
            )}
            <ul className="mt-4 divide-y divide-[#1a1a1a]/[0.07]">
              {plans.map((plan) => <li key={plan.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-[#1a1a1a]">{plan.name}</p><p className="text-[11px] text-[#5c6355]">{plan.rule.basis} · {plan.is_active ? 'activo' : 'inactivo'}</p></div>{canManage && <div className="flex gap-2"><button type="button" onClick={() => editPlan(plan)} className="qx-btn-ghost">Editar</button><button type="button" onClick={() => void togglePlan(plan)} disabled={busy} className="qx-btn-ghost">{plan.is_active ? 'Desactivar' : 'Activar'}</button></div>}</li>)}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
