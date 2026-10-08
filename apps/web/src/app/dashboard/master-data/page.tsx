'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createMasterData,
  getCurrentSession,
  getUserProfile,
  listMasterData,
  setMasterDataActive,
  updateMasterData,
} from '@qualitynx/database';
import { UserRole } from '@qualitynx/shared';

type EntityKey =
  | 'producers'
  | 'fields'
  | 'blocks'
  | 'species'
  | 'varieties'
  | 'seasons'
  | 'packaging_types';

type Row = {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  producer_id?: string;
  field_id?: string;
  species_id?: string;
  start_date?: string | null;
  end_date?: string | null;
  rut?: string | null;
  address?: string | null;
  comuna?: string | null;
  city?: string | null;
  gps_point?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_person?: string | null;
  salida_producer_id?: string | null;
  theoretical_weight_kg?: number | null;
  source_ref?: string | null;
};

type ProducerForm = {
  rut: string;
  address: string;
  comuna: string;
  city: string;
  gps_point: string;
  phone: string;
  email: string;
  contact_person: string;
  salida_producer_id: string;
};

const EMPTY_PRODUCER_FORM: ProducerForm = {
  rut: '',
  address: '',
  comuna: '',
  city: '',
  gps_point: '',
  phone: '',
  email: '',
  contact_person: '',
  salida_producer_id: '',
};

type Option = { id: string; name: string };

const ENTITIES: { key: EntityKey; label: string; parent?: EntityKey; parentField?: string }[] = [
  { key: 'producers', label: 'Productores' },
  { key: 'fields', label: 'Campos', parent: 'producers', parentField: 'producer_id' },
  { key: 'blocks', label: 'Cuarteles', parent: 'fields', parentField: 'field_id' },
  { key: 'species', label: 'Especies' },
  { key: 'varieties', label: 'Variedades', parent: 'species', parentField: 'species_id' },
  { key: 'seasons', label: 'Temporadas' },
  { key: 'packaging_types', label: 'Embalajes' },
];

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '23505' || /duplicate|unique/i.test(error.message ?? '');
}

export default function MasterDataPage() {
  const [active, setActive] = useState<EntityKey>('producers');
  const [rows, setRows] = useState<Row[]>([]);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [producerForm, setProducerForm] = useState<ProducerForm>(EMPTY_PRODUCER_FORM);
  const [packagingWeight, setPackagingWeight] = useState('');
  const [producers, setProducers] = useState<Row[]>([]);

  const isProducer = active === 'producers';
  const isPackaging = active === 'packaging_types';

  const meta = useMemo(() => ENTITIES.find((e) => e.key === active)!, [active]);
  const canManage =
    role === UserRole.COMPANY_ADMIN || role === UserRole.SUPER_ADMIN;

  const parentOptions = meta.parent ? (options[meta.parent] ?? []) : [];

  const salidaOptions = useMemo(
    () => producers.filter((p) => p.id !== editingId),
    [producers, editingId]
  );

  const load = useCallback(async (entity: EntityKey) => {
    setLoading(true);
    setMessage(null);
    const { data, error } = await listMasterData(entity);
    if (error) {
      setMessage({
        type: 'error',
        text: 'No pudimos cargar los datos maestros. Revisa tu conexión e intenta de nuevo.',
      });
      setRows([]);
    } else {
      setRows(data as Row[]);
    }
    setLoading(false);
  }, []);

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
    init();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(active);
    setEditingId(null);
    setName('');
    setParentId('');
    setStartDate('');
    setEndDate('');
    setProducerForm(EMPTY_PRODUCER_FORM);
    setPackagingWeight('');
  }, [active, load]);

  useEffect(() => {
    const loadParents = async () => {
      if (!meta.parent) return;
      const { data } = await listMasterData(meta.parent);
      setOptions((prev) => ({ ...prev, [meta.parent!]: data as Option[] }));
    };
    loadParents();
  }, [meta.parent]);

  useEffect(() => {
    if (!isProducer) return;
    const loadProducers = async () => {
      const { data } = await listMasterData('producers');
      setProducers(data as Row[]);
    };
    loadProducers();
  }, [isProducer]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setParentId('');
    setStartDate('');
    setEndDate('');
    setProducerForm(EMPTY_PRODUCER_FORM);
    setPackagingWeight('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setMessage(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'El nombre es obligatorio.' });
      return;
    }

    const payload: Record<string, unknown> = { name: trimmed };
    if (meta.parentField) {
      if (!parentId) {
        setMessage({ type: 'error', text: 'Debe seleccionar el elemento padre.' });
        return;
      }
      payload[meta.parentField] = parentId;
    }
    if (active === 'seasons') {
      payload.start_date = startDate || null;
      payload.end_date = endDate || null;
    }
    if (isPackaging) {
      payload.theoretical_weight_kg = packagingWeight.trim() ? Number(packagingWeight) : null;
    }
    if (isProducer) {
      payload.rut = producerForm.rut.trim() || null;
      payload.address = producerForm.address.trim() || null;
      payload.comuna = producerForm.comuna.trim() || null;
      payload.city = producerForm.city.trim() || null;
      payload.gps_point = producerForm.gps_point.trim() || null;
      payload.phone = producerForm.phone.trim() || null;
      payload.email = producerForm.email.trim() || null;
      payload.contact_person = producerForm.contact_person.trim() || null;
      payload.salida_producer_id = producerForm.salida_producer_id || null;
    }

    setBusy(true);
    try {
      if (editingId) {
        const { error } = await updateMasterData(active, editingId, payload);
        if (error) {
          if (isUniqueViolation(error)) {
            setMessage({ type: 'error', text: 'Ya existe un registro con ese nombre en este ámbito.' });
          } else {
            setMessage({
              type: 'error',
              text: 'No pudimos actualizar el registro. Revisa los datos e intenta de nuevo.',
            });
          }
          return;
        }
        setMessage({ type: 'ok', text: 'Registro actualizado.' });
      } else {
        if (!companyId) {
          setMessage({ type: 'error', text: 'El usuario no tiene empresa asignada.' });
          return;
        }
        const { error } = await createMasterData(active, {
          ...payload,
          company_id: companyId,
        });
        if (error) {
          if (isUniqueViolation(error)) {
            setMessage({ type: 'error', text: 'Ya existe un registro con ese nombre en este ámbito.' });
          } else {
            setMessage({
              type: 'error',
              text: 'No pudimos crear el registro. Revisa los datos e intenta de nuevo.',
            });
          }
          return;
        }
        setMessage({ type: 'ok', text: 'Registro creado.' });
      }
      resetForm();
      await load(active);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row: Row) => {
    if (!canManage) return;
    setBusy(true);
    const { error } = await setMasterDataActive(active, row.id, !row.is_active);
    setBusy(false);
    if (error) {
      setMessage({
        type: 'error',
        text: 'No pudimos cambiar el estado del registro.',
      });
      return;
    }
    setMessage({
      type: 'ok',
      text: row.is_active ? 'Registro desactivado.' : 'Registro activado.',
    });
    await load(active);
  };

  const startEdit = (row: Row) => {
    setEditingId(row.id);
    setName(row.name);
    setParentId(
      (meta.parentField
        ? String((row as Record<string, unknown>)[meta.parentField] ?? '')
        : '') || ''
    );
    setStartDate(row.start_date ?? '');
    setEndDate(row.end_date ?? '');
    setPackagingWeight(row.theoretical_weight_kg != null ? String(row.theoretical_weight_kg) : '');
    setProducerForm({
      rut: row.rut ?? '',
      address: row.address ?? '',
      comuna: row.comuna ?? '',
      city: row.city ?? '',
      gps_point: row.gps_point ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      contact_person: row.contact_person ?? '',
      salida_producer_id: row.salida_producer_id ?? '',
    });
    setMessage(null);
  };

  const parentName = (row: Row) => {
    if (!meta.parent || !meta.parentField) return null;
    const id = String((row as Record<string, unknown>)[meta.parentField] ?? '');
    const found = (options[meta.parent] ?? []).find((o) => o.id === id);
    return found?.name ?? '—';
  };

  const inputClass = 'qx-input';

  const setProducerField = (key: keyof ProducerForm, value: string) => {
    setProducerForm((prev) => ({ ...prev, [key]: value }));
  };

  const parentLabel = meta.parent
    ? ENTITIES.find((e) => e.key === meta.parent)?.label
    : null;

  return (
    <div className="space-y-6 sm:space-y-7">
      <header className="qx-opheader">
        <div className="min-w-0 flex-1">
          <p className="qx-eyebrow">Configuración</p>
          <h1 className="qx-h1">Datos maestros</h1>
          <p className="qx-sub max-w-2xl">
            {isProducer
              ? 'Productores, campos, cuarteles, especies, variedades, temporadas y embalajes. Se usan al crear lotes e inspecciones.'
              : 'Referencias reutilizables para lotes e inspecciones. Aislamiento por empresa.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="qx-metric">
            <strong>{rows.length}</strong>
            <span>Registros</span>
          </div>
        </div>
      </header>

      <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-[#1a1a1a]/[0.06] bg-black/[0.04] p-1.5">
        {ENTITIES.map((entity) => (
          <button
            key={entity.key}
            type="button"
            onClick={() => setActive(entity.key)}
            className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-all duration-200 ${
              active === entity.key
                ? 'bg-white text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.10)]'
                : 'text-[#888] hover:text-[#1a1a1a]'
            }`}
          >
            {entity.label}
          </button>
        ))}
      </div>

      {message && (
        <div
          role="status"
          className={`qx-banner ${message.type === 'ok' ? 'qx-banner-ok' : 'qx-banner-error'}`}
        >
          {message.text}
        </div>
      )}

      {canManage && (
        <form
          onSubmit={handleSubmit}
          className="qx-card p-4 sm:p-6"
        >
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
            {editingId ? `Editar ${meta.label.toLowerCase().slice(0, -1)}` : `Nuevo — ${meta.label}`}
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {meta.parent && parentLabel && (
              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                  {parentLabel}
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  required
                  className={inputClass}
                >
                  <option value="">Seleccionar…</option>
                  {parentOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={meta.parent ? '' : 'sm:col-span-2'}>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                {isProducer ? 'Nombre o razón social' : 'Nombre'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={255}
                className={inputClass}
                placeholder={isProducer ? 'Nombre o razón social' : 'Nombre o identificación'}
              />
            </div>

            {isPackaging && (
              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                  Peso teórico (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={packagingWeight}
                  onChange={(e) => setPackagingWeight(e.target.value)}
                  className={inputClass}
                  placeholder="Dejar vacío si no está definido"
                />
              </div>
            )}

            {isProducer && (
              <>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                    RUT
                  </label>
                  <input
                    type="text"
                    value={producerForm.rut}
                    onChange={(e) => setProducerField('rut', e.target.value)}
                    maxLength={20}
                    className={inputClass}
                    placeholder="12.345.678-9"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={producerForm.phone}
                    onChange={(e) => setProducerField('phone', e.target.value)}
                    maxLength={30}
                    className={inputClass}
                    placeholder="+56 9 …"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={producerForm.address}
                    onChange={(e) => setProducerField('address', e.target.value)}
                    maxLength={255}
                    className={inputClass}
                    placeholder="Calle, número"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                    Comuna o provincia
                  </label>
                  <input
                    type="text"
                    value={producerForm.comuna}
                    onChange={(e) => setProducerField('comuna', e.target.value)}
                    maxLength={100}
                    className={inputClass}
                    placeholder="Comuna o provincia"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={producerForm.city}
                    onChange={(e) => setProducerField('city', e.target.value)}
                    maxLength={100}
                    className={inputClass}
                    placeholder="Ciudad"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                    Punto GPS
                  </label>
                  <input
                    type="text"
                    value={producerForm.gps_point}
                    onChange={(e) => setProducerField('gps_point', e.target.value)}
                    className={inputClass}
                    placeholder="-33.45, -70.67"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                    Correo
                  </label>
                  <input
                    type="email"
                    value={producerForm.email}
                    onChange={(e) => setProducerField('email', e.target.value)}
                    maxLength={255}
                    className={inputClass}
                    placeholder="contacto@productor.cl"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                    Persona de contacto
                  </label>
                  <input
                    type="text"
                    value={producerForm.contact_person}
                    onChange={(e) => setProducerField('contact_person', e.target.value)}
                    maxLength={255}
                    className={inputClass}
                    placeholder="Nombre del contacto"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                    Productor de salida
                    <span className="ml-2 font-normal normal-case tracking-normal text-[#bbb]">
                      Uso interno
                    </span>
                  </label>
                  <select
                    value={producerForm.salida_producer_id}
                    onChange={(e) => setProducerField('salida_producer_id', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Sin asociar</option>
                    {salidaOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {active === 'seasons' && (
              <>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                    Inicio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#888]">
                    Término
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-full bg-[#4A5D23] px-6 py-3 text-[13px] font-semibold text-white transition-all hover:bg-[#3a4d1b] hover:shadow-lg disabled:opacity-50"
            >
              {busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="min-h-11 rounded-full border border-[#1a1a1a]/10 px-6 py-3 text-[13px] font-medium text-[#666] transition-colors hover:border-[#1a1a1a]/20 hover:text-[#1a1a1a]"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#1a1a1a]/[0.07] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#1a1a1a]/[0.06] px-4 py-4 sm:px-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">
            {meta.label}
          </h2>
          <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-medium text-[#888]">
            {rows.length} {rows.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="h-6 w-6 rounded-full border-2 border-[#4A5D23]/20 border-t-[#4A5D23] animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="qx-empty">
            <h3>Aún no hay {meta.label.toLowerCase()}.</h3>
            <p>
              Estos registros alimentan lotes e inspecciones. Crea el primero con el formulario
              superior para que aparezca aquí.
            </p>
          </div>
        ) : (
          <>
            {/* Móvil / tablet: tarjetas */}
            <ul className="divide-y divide-[#1a1a1a]/[0.04] lg:hidden">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className={`px-4 py-4 sm:px-5 ${row.is_active ? '' : 'opacity-50'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[14px] font-semibold text-[#1a1a1a]">
                        {row.name}
                      </p>
                      {isProducer && row.rut && (
                        <p className="mt-0.5 text-[12px] text-[#888]">{row.rut}</p>
                      )}
                       {meta.parent && (
                         <p className="mt-0.5 truncate text-[12px] text-[#888]">
                           {parentLabel}: {parentName(row)}
                         </p>
                       )}
                       {isPackaging && (
                         <p className="mt-0.5 text-[12px] text-[#888]">
                           Peso teórico: {row.theoretical_weight_kg != null ? `${row.theoretical_weight_kg} kg` : 'por definir'}
                         </p>
                       )}
                       <p className="mt-0.5 text-[12px] text-[#aaa]">
                        {new Date(row.created_at).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#666]">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          row.is_active ? 'bg-[#4A5D23]' : 'bg-[#ccc]'
                        }`}
                      />
                      {row.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {canManage && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        disabled={busy}
                        className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[#1a1a1a]/10 px-3.5 py-2 text-[12px] font-medium text-[#666] transition-colors hover:border-[#1a1a1a]/20 hover:text-[#1a1a1a] disabled:opacity-40"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(row)}
                        disabled={busy}
                        className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[#1a1a1a]/10 px-3.5 py-2 text-[12px] font-medium text-[#666] transition-colors hover:border-[#1a1a1a]/20 hover:text-[#1a1a1a] disabled:opacity-40"
                      >
                        {row.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* PC: tabla */}
            <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#1a1a1a]/[0.06]">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#aaa]">
                    {isProducer ? 'Nombre o razón social' : 'Nombre'}
                  </th>
                  {isProducer && (
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#aaa]">
                      RUT
                    </th>
                  )}
                  {meta.parent && parentLabel && (
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#aaa]">
                      {parentLabel}
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#aaa]">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#aaa]">
                    Creado
                  </th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-[#aaa]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-[#1a1a1a]/[0.04] transition-colors last:border-0 hover:bg-black/[0.02] ${
                      row.is_active ? '' : 'opacity-50'
                    }`}
                  >
                     <td className="px-6 py-3.5 font-medium text-[#1a1a1a]">{row.name}</td>
                     {isProducer && (
                      <td className="px-6 py-3.5 text-[#666]">{row.rut || '—'}</td>
                    )}
                    {meta.parent && (
                      <td className="px-6 py-3.5 text-[#666]">{parentName(row)}</td>
                    )}
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#666]">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            row.is_active ? 'bg-[#4A5D23]' : 'bg-[#ccc]'
                          }`}
                        />
                        {row.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-[#888]">
                      {new Date(row.created_at).toLocaleDateString('es-CL')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-right">
                      {canManage && (
                        <span className="space-x-3">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            disabled={busy}
                            className="text-[13px] font-medium text-[#4A5D23] transition-opacity hover:opacity-70"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(row)}
                            disabled={busy}
                            className="text-[13px] font-medium text-[#888] transition-colors hover:text-[#1a1a1a]"
                          >
                            {row.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      <p className="text-[12px] text-[#bbb]">
        La desactivación no elimina historial. No existe eliminación física de registros
        utilizados.
      </p>
    </div>
  );
}
