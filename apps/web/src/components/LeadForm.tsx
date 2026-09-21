'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';

type LeadValues = {
  name: string;
  company: string;
  role: string;
  whatsapp: string;
  company_type: string;
  fruit_type: string;
  recording_method: string;
  inspection_volume: string;
  problem: string;
};

type FormStatus =
  | { type: 'idle'; message: string }
  | { type: 'loading'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

const initialValues: LeadValues = {
  name: '',
  company: '',
  role: '',
  whatsapp: '',
  company_type: '',
  fruit_type: '',
  recording_method: '',
  inspection_volume: '',
  problem: '',
};

export function LeadForm() {
  const [values, setValues] = useState<LeadValues>(initialValues);
  const [status, setStatus] = useState<FormStatus>({ type: 'idle', message: '' });

  const updateValue = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setValues((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errs: string[] = [];
    if (!values.name.trim()) errs.push('Ingresa tu nombre.');
    if (!values.company.trim()) errs.push('Ingresa tu empresa.');
    if (!values.whatsapp.trim()) errs.push('Ingresa tu WhatsApp.');
    if (!values.company_type) errs.push('Selecciona tipo de empresa.');
    if (!values.problem.trim()) errs.push('Cuéntanos tu situación.');

    if (errs.length > 0) {
      setStatus({ type: 'error', message: errs[0] });
      return;
    }

    setStatus({ type: 'loading', message: 'Enviando...' });

    const payload: Record<string, string> = {
      name: values.name.trim(),
      company: values.company.trim(),
      whatsapp: values.whatsapp.trim(),
      company_type: values.company_type,
      problem: values.problem.trim(),
    };
    if (values.role.trim()) payload.role = values.role.trim();
    if (values.fruit_type) payload.fruit_type = values.fruit_type;
    if (values.recording_method) payload.recording_method = values.recording_method;
    if (values.inspection_volume) payload.inspection_volume = values.inspection_volume;

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.error || data.fields ? (Object.values(data.fields || {}).flat().join('. ') || 'Error de validación') : 'Error al enviar.';
        throw new Error(msg);
      }

      setStatus({ type: 'success', message: '¡Solicitud recibida! Nos pondremos en contacto contigo.' });
      setValues(initialValues);
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Error al enviar.' });
    }
  };

  const inputBase = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#4A5D23] focus:ring-1 focus:ring-[#4A5D23]/30';
  const selectBase = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#4A5D23] focus:ring-1 focus:ring-[#4A5D23]/30';
  const labelBase = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#4A5D23]';

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelBase}>Nombre *</label>
          <input id="name" name="name" type="text" required value={values.name} onChange={updateValue} placeholder="Tu nombre" className={inputBase} />
        </div>
        <div>
          <label htmlFor="company" className={labelBase}>Empresa *</label>
          <input id="company" name="company" type="text" required value={values.company} onChange={updateValue} placeholder="Nombre de tu empresa" className={inputBase} />
        </div>
        <div>
          <label htmlFor="role" className={labelBase}>Cargo</label>
          <input id="role" name="role" type="text" value={values.role} onChange={updateValue} placeholder="Tu cargo" className={inputBase} />
        </div>
        <div>
          <label htmlFor="whatsapp" className={labelBase}>WhatsApp *</label>
          <input id="whatsapp" name="whatsapp" type="tel" required value={values.whatsapp} onChange={updateValue} placeholder="+56 9 1234 5678" className={inputBase} />
        </div>
        <div>
          <label htmlFor="company_type" className={labelBase}>Tipo de empresa *</label>
          <select id="company_type" name="company_type" required value={values.company_type} onChange={updateValue} className={selectBase}>
            <option value="" disabled>Seleccionar</option>
            <option value="Productor">Productor</option>
            <option value="Packing">Packing</option>
            <option value="Exportadora">Exportadora</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div>
          <label htmlFor="fruit_type" className={labelBase}>Tipo de fruta</label>
          <select id="fruit_type" name="fruit_type" value={values.fruit_type} onChange={updateValue} className={selectBase}>
            <option value="">Sin especificar</option>
            <option value="Arándanos">Arándanos</option>
            <option value="Frambuesas">Frambuesas</option>
            <option value="Cerezas">Cerezas</option>
            <option value="Uva">Uva</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div>
          <label htmlFor="recording_method" className={labelBase}>¿Cómo registran la información?</label>
          <select id="recording_method" name="recording_method" value={values.recording_method} onChange={updateValue} className={selectBase}>
            <option value="">Sin especificar</option>
            <option value="Excel">Excel</option>
            <option value="Formularios">Formularios</option>
            <option value="Papel">Papel</option>
            <option value="Sistema propio">Sistema propio</option>
            <option value="Varios sistemas">Varios sistemas</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div>
          <label htmlFor="inspection_volume" className={labelBase}>¿Cuántas inspecciones al mes?</label>
          <select id="inspection_volume" name="inspection_volume" value={values.inspection_volume} onChange={updateValue} className={selectBase}>
            <option value="">Sin especificar</option>
            <option value="Menos de 50">Menos de 50</option>
            <option value="50-200">50 – 200</option>
            <option value="200-500">200 – 500</option>
            <option value="Más de 500">Más de 500</option>
            <option value="No lo sé">No lo sé</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="problem" className={labelBase}>¿Qué necesitas controlar y qué información te gustaría poder recuperar? *</label>
          <textarea id="problem" name="problem" required rows={4} value={values.problem} onChange={updateValue} placeholder="Cuéntanos tu situación actual..." className={inputBase + ' resize-none'} />
        </div>
      </div>

      {status.type !== 'idle' && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : status.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-gray-50 text-gray-600 border border-gray-200'
          }`}
        >
          {status.message}
        </div>
      )}

      <button
        type="submit"
        disabled={status.type === 'loading'}
        className="mt-6 w-full rounded-full bg-[#4A5D23] px-8 py-4 text-base font-semibold text-white transition-all hover:bg-[#3a4d1b] hover:shadow-xl disabled:opacity-50"
      >
        {status.type === 'loading' ? 'Enviando...' : 'Solicitar demostración'}
      </button>
    </form>
  );
}
