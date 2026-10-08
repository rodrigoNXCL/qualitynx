import { useEffect, type ReactNode } from 'react';

export function Spinner({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`${className} inline-block rounded-full border-2 border-[#4A5D23]/20 border-t-[#4A5D23] animate-spin`}
    />
  );
}

export function LoadingBlock({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14">
      <Spinner />
      <p className="text-[13px] text-[#888]">{label}</p>
    </div>
  );
}

export function Banner({
  type,
  children,
  role = 'status',
}: {
  type: 'ok' | 'error';
  children: ReactNode;
  role?: 'status' | 'alert';
}) {
  return (
    <div role={role} className={`qx-banner ${type === 'ok' ? 'qx-banner-ok' : 'qx-banner-error'}`}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="qx-empty">
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="qx-action">{action}</div> : null}
    </div>
  );
}

/** Traduce errores técnicos comunes a lenguaje operacional. */
export function friendlyError(error: unknown, fallback = 'No pudimos completar la operación.'): string {
  const raw =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : '';

  const m = raw.toLowerCase();
  if (!m) return fallback;
  if (m.includes('duplicate key') || m.includes('23505'))
    return 'Ya existe un registro con estos datos.';
  if (m.includes('row-level security') || m.includes('rls') || m.includes('permission denied'))
    return 'Tu rol no tiene permiso para esta acción.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sin conexión. Revisa tu red e intenta de nuevo.';
  if (m.includes('jwt') || m.includes('token') || m.includes('session'))
    return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (m.includes('violates foreign key') || m.includes('23503'))
    return 'La referencia seleccionada ya no existe.';
  if (m.includes('null value') || m.includes('not-null'))
    return 'Faltan datos obligatorios en el formulario.';
  // Último recurso: mensaje técnico solo si es corto y legible
  if (raw.length <= 120 && !/^[a-z_]+\./i.test(raw)) return raw;
  return fallback;
}

export const STATUS_CHIP_STYLES: Record<string, string> = {
  CREADO: 'bg-[#eef0ea] text-[#4b5245] border-[#1a1a1a]/10',
  'EN PROCESO': 'bg-[#e7edd9] text-[#3a4d1b] border-[#4A5D23]/25',
  'EN INSPECCIÓN': 'bg-[#e7edd9] text-[#3a4d1b] border-[#4A5D23]/30',
  RETENIDO: 'bg-[#fef3c7] text-[#92400e] border-amber-300/70',
  APROBADO: 'bg-[#dce8c8] text-[#2f4016] border-[#4A5D23]/35',
  RECHAZADO: 'bg-[#fee2e2] text-[#991b1b] border-red-300/70',
  SEGREGADO: 'bg-[#ffedd5] text-[#9a3412] border-orange-300/70',
  'EN REPROCESO': 'bg-[#eef0ea] text-[#4b5245] border-[#1a1a1a]/10',
  LIBERADO: 'bg-[#dce8c8] text-[#2f4016] border-[#4A5D23]/35',
  CERRADO: 'bg-[#e5e7eb] text-[#374151] border-[#1a1a1a]/15',
  'EN CURSO': 'bg-[#e7edd9] text-[#3a4d1b] border-[#4A5D23]/30',
  EN_CURSO: 'bg-[#e7edd9] text-[#3a4d1b] border-[#4A5D23]/30',
  COMPLETADA: 'bg-[#dce8c8] text-[#2f4016] border-[#4A5D23]/35',
  REGISTRADA: 'bg-[#dce8c8] text-[#2f4016] border-[#4A5D23]/35',
  ANULADA: 'bg-[#fee2e2] text-[#991b1b] border-red-300/70',
  ACTIVO: 'bg-[#dce8c8] text-[#2f4016] border-[#4A5D23]/35',
  INACTIVO: 'bg-[#eef0ea] text-[#4b5245] border-[#1a1a1a]/10',
};

export function StatusChip({ label, className = '' }: { label: string; className?: string }) {
  const style = STATUS_CHIP_STYLES[label] ?? STATUS_CHIP_STYLES[label.replace(/\s+/g, '_')] ?? 'bg-[#eef0ea] text-[#4b5245] border-[#1a1a1a]/10';
  return <span className={`qx-chip ${style} ${className}`}>{label}</span>;
}

/** Cierra el menú al hacer clic fuera o Escape. Devuelve openId. */
export function useDismissable(id: string | null, close: () => void) {
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onClick = () => close();
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, [id, close]);
}

export const inputClass =
  'qx-input';

export const sectionCard = 'qx-card p-4 sm:p-6';
