'use client';

/**
 * QualityNX — D-032 · EXISTENCIAS
 *
 * Disponibilidad real por lote, derivada de cantidades declaradas + libro de
 * movimientos. NO se determina por lot_status: un lote CREADO puede estar
 * agotado y uno APROBADO puede tener saldo.
 *
 * Los lotes agotados se excluyen del listado de existencias pero siguen
 * consultables en el histórico.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentSession, getUserProfile, listLotAvailability } from '@qualitynx/database';
import type { AvailabilityRow } from '@qualitynx/database';
import type { UserRole } from '@qualitynx/shared';
import { Banner, EmptyState, LoadingBlock, inputClass } from '@/components/ui';

const panel = 'rounded-xl border border-[#1a1a1a]/10 bg-white px-4 py-3.5';
const th = 'px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]';
const td = 'px-2.5 py-2 text-[12px] text-[#1a1a1a]';
const thN = 'px-2.5 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]';
const tdN = 'px-2.5 py-2 text-right text-[12px] text-[#1a1a1a]';

const STATUS_LABEL: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  PARCIALMENTE_UTILIZADO: 'Parcialmente utilizado',
  AGOTADO: 'Agotado',
  CANTIDAD_NO_DECLARADA: 'Cantidad no declarada',
};

export default function ExistenciasPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelMissing, setModelMissing] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(true);

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
    const res = await listLotAvailability({ companyId, query, onlyAvailable });
    setRows(res.data);
    setModelMissing(res.model_missing);
    setLoading(false);
  }, [companyId, query, onlyAvailable]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const totals = rows.reduce(
    (acc, r) => {
      acc.disponibles += 1;
      if (r.availability_status === 'PARCIALMENTE_UTILIZADO') acc.parciales += 1;
      if (r.availability_status === 'AGOTADO') acc.agotados += 1;
      if (r.availability_status === 'CANTIDAD_NO_DECLARADA') acc.sin_unidad += 1;
      return acc;
    },
    { disponibles: 0, parciales: 0, agotados: 0, sin_unidad: 0 }
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold text-[#1a1a1a]">Existencias</h1>
        <p className="mt-1 max-w-4xl text-[12px] leading-relaxed text-[#5c6b45]">
          Disponibilidad real por lote. No se deduce del estado del lote: un lote
          <strong> CREADO</strong> puede estar agotado y uno <strong> APROBADO</strong> puede
          tener saldo. Sesión {role ?? '—'} · consulta.
        </p>
      </header>

      {modelMissing ? (
        <Banner type="error">
          El libro de movimientos (migración D-032) todavía no está aplicado. La
          disponibilidad se calcula con cantidades declaradas, pero sin movimientos no hay
          consumos ni agotamientos que mostrar.
        </Banner>
      ) : null}

      <section className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-[#aaa]">Disponibles</p>
              <p className="text-[1.4rem] font-semibold tabular-nums">{totals.disponibles}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-[#aaa]">Parciales</p>
              <p className="text-[1.4rem] font-semibold tabular-nums">{totals.parciales}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-[#aaa]">Agotados</p>
              <p className="text-[1.4rem] font-semibold tabular-nums">{totals.agotados}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-[#aaa]">Sin unidad</p>
              <p className="text-[1.4rem] font-semibold tabular-nums">{totals.sin_unidad}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input
              className={`${inputClass} w-64`}
              placeholder="Buscar por folio, productor, variedad…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="flex items-center gap-1.5 text-[12px] text-[#5c6b45]">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
              />
              Solo con saldo
            </label>
          </div>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Sin existencias que mostrar"
            description="Ningún lote cumple el filtro. Un lote aparece cuando declara cantidad y unidad."
          />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse" data-testid="tabla-existencias">
              <thead>
                <tr className="border-b border-[#1a1a1a]/10">
                  <th className={th}>Folio</th>
                  <th className={th}>Productor</th>
                  <th className={th}>Variedad</th>
                  <th className={th}>Etapa</th>
                  <th className={thN}>Declarado</th>
                  <th className={thN}>Entradas</th>
                  <th className={thN}>Consumos</th>
                  <th className={thN}>Disponible</th>
                  <th className={th}>Estado</th>
                  <th className={th}>Estado del lote</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.lot_id} className="border-b border-[#1a1a1a]/5">
                    <td className={`${td} font-medium`}>
                      <Link className="underline" href={`/dashboard/lots/${r.lot_id}/report`}>
                        {r.folio ?? r.harvest_block ?? r.lot_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className={td}>{r.producer_name ?? '—'}</td>
                    <td className={td}>{r.variety_name ?? '—'}</td>
                    <td className={td}>{r.stage_name ?? <span className="text-[#8a6d1f]">sin etapa</span>}</td>
                    <td className={tdN}>
                      {r.declared_quantity ?? '—'} {r.declared_unit ?? ''}
                    </td>
                    <td className={tdN}>{r.total_in}</td>
                    <td className={tdN}>{r.total_out}</td>
                    <td className={tdN}>
                      {r.available_quantity === null ? '—' : `${r.available_quantity} ${r.unit ?? ''}`}
                    </td>
                    <td className={td}>{STATUS_LABEL[r.availability_status] ?? r.availability_status}</td>
                    <td className={td}>{r.lot_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}