'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';

type LeadValues = {
  name: string;
  company: string;
  role: string;
  whatsapp: string;
  fruit_type: string;
  company_type: string;
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
  fruit_type: '',
  company_type: '',
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
    const form = event.currentTarget;
    setStatus({ type: 'loading', message: 'Enviando la solicitud...' });

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'No fue posible enviar la solicitud.');
      }

      setStatus({ type: 'success', message: 'Solicitud recibida. Nos pondremos en contacto contigo.' });
      setValues(initialValues);
      form.reset();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'No fue posible enviar la solicitud.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-sm md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="nombre" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-amber-200">
            Nombre
          </label>
          <input
            id="nombre"
            name="name"
            required
            type="text"
            autoComplete="name"
            placeholder="Tu nombre"
            value={values.name}
            onChange={updateValue}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-[#2C2C2C] placeholder:text-[#999] focus:border-[#F7F6F2] focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
        <div>
          <label htmlFor="empresa" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-amber-200">
            Empresa
          </label>
          <input
            id="empresa"
            name="company"
            required
            type="text"
            autoComplete="organization"
            placeholder="Nombre de la empresa"
            value={values.company}
            onChange={updateValue}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-[#2C2C2C] placeholder:text-[#999] focus:border-[#F7F6F2] focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
        <div>
          <label htmlFor="cargo" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-amber-200">
            Cargo
          </label>
          <input
            id="cargo"
            name="role"
            type="text"
            autoComplete="organization-title"
            placeholder="Cargo"
            value={values.role}
            onChange={updateValue}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-[#2C2C2C] placeholder:text-[#999] focus:border-[#F7F6F2] focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
        <div>
          <label htmlFor="whatsapp" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-amber-200">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            required
            type="tel"
            autoComplete="tel"
            placeholder="+56 9 ..."
            value={values.whatsapp}
            onChange={updateValue}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-[#2C2C2C] placeholder:text-[#999] focus:border-[#F7F6F2] focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
        <div>
          <label htmlFor="fruta" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-amber-200">
            Tipo de fruta
          </label>
          <input
            id="fruta"
            name="fruit_type"
            type="text"
            placeholder="Ej.: arándano"
            value={values.fruit_type}
            onChange={updateValue}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-[#2C2C2C] placeholder:text-[#999] focus:border-[#F7F6F2] focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
        <div>
          <label htmlFor="tipo" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-amber-200">
            ¿Productor / Packing / Exportadora / Otro?
          </label>
          <select
            id="tipo"
            name="company_type"
            required
            value={values.company_type}
            onChange={updateValue}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-[#2C2C2C] focus:border-[#F7F6F2] focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            <option>Productor</option>
            <option>Packing</option>
            <option>Exportadora</option>
            <option>Otro</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="problema" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-amber-200">
            Principal problema de calidad
          </label>
          <textarea
            id="problema"
            name="problem"
            required
            rows={4}
            placeholder="Cuéntanos qué información no puedes encontrar o relacionar..."
            value={values.problem}
            onChange={updateValue}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-[#2C2C2C] placeholder:text-[#999] focus:border-[#F7F6F2] focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={status.type === 'loading'}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F7F6F2] px-7 py-4 text-base font-semibold text-[#4A5D23] transition-all hover:bg-white md:w-auto disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status.type === 'loading' ? 'Enviando...' : 'Solicitar demostración'}
        <span aria-hidden="true">→</span>
      </button>
      <div aria-live="polite" className={`mt-4 text-xs leading-relaxed ${status.type === 'error' ? 'text-[#FFD9D0]' : 'text-[#E9E2C8]'}`}>
        {status.message}
      </div>
    </form>
  );
}
