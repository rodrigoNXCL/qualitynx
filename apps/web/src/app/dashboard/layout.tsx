'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentSession,
  getUserProfile,
  onAuthStateChange,
  getSupabaseClient,
} from '@qualitynx/database';
import { UserRole } from '@qualitynx/shared';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  company_id: string | null;
  companies: {
    id: string;
    name: string;
    code: string;
    is_active: boolean;
  } | null;
}

type NavItem = { name: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Inicio',
    items: [{ name: 'Resumen', href: '/dashboard' }],
  },
  {
    label: 'Operación',
    items: [
      { name: 'Lotes', href: '/dashboard/lotes' },
      { name: 'Recepción', href: '/dashboard/recepcion' },
      { name: 'Inspecciones', href: '/dashboard/inspections' },
      { name: 'Existencias', href: '/dashboard/existencias' },
      { name: 'Transformaciones', href: '/dashboard/transformaciones' },
    ],
  },
  {
    label: 'Análisis',
    items: [{ name: 'Análisis', href: '/dashboard/analisis' }],
  },
  {
    label: 'Informes',
    items: [{ name: 'Informes', href: '/dashboard/reports' }],
  },
  {
    label: 'Configuración',
    items: [
      { name: 'Datos maestros', href: '/dashboard/master-data' },
      { name: 'Puntos y criterios', href: '/dashboard/inspection-points' },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Admin de Empresa',
  INSPECTOR: 'Inspector',
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { session } = await getCurrentSession();
      if (!session) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const { data } = await getUserProfile(session.user.id);
      if (!cancelled) {
        setProfile((data as UserProfile) ?? null);
        setLoading(false);
      }
    };

    load();

    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { data } = await getUserProfile(session.user.id);
        if (!cancelled) {
          setProfile((data as UserProfile) ?? null);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
        <div className="h-8 w-8 rounded-full border-2 border-[#4A5D23]/20 border-t-[#4A5D23] animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-[#FAFAF7] px-4">
        <p className="text-sm text-[#666] text-center">
          No se pudo cargar tu perfil. Verifica que tu usuario esté activo.
        </p>
        <button
          type="button"
          onClick={async () => {
            await getSupabaseClient().auth.signOut();
          }}
          className="text-sm font-medium text-[#4A5D23] hover:underline"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  const canManage =
    profile.role === UserRole.COMPANY_ADMIN || profile.role === UserRole.SUPER_ADMIN;

  const roleLabel = ROLE_LABELS[profile.role] ?? profile.role;

  return (
    <div className="min-h-screen bg-[#f4f5f0] text-[#1a1a1a] antialiased">
      <header className="sticky top-0 z-50 border-b border-[#1a1a1a]/[0.08] bg-[#f4f5f0]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1560px] items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
              <img
                src="/logos/isotipo_qualityNX.png"
                alt=""
                className="h-7 w-7"
              />
              <span className="hidden text-[15px] font-semibold tracking-[-0.01em] sm:inline">
                QualityNX
              </span>
            </Link>
            <nav
              className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex"
              aria-label="Principal"
            >
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="flex shrink-0 items-center gap-1">
                  <span
                    aria-hidden
                    className="hidden px-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a8ad9c] 2xl:inline"
                  >
                    {group.label}
                  </span>
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                          active
                            ? 'bg-white text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                            : 'text-[#73786a] hover:bg-white/70 hover:text-[#1a1a1a]'
                        }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                  <span aria-hidden className="mx-1 h-4 w-px bg-[#1a1a1a]/12 2xl:hidden" />
                </div>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block leading-tight">
                <p className="text-[13px] font-medium">{profile.full_name}</p>
                <p className="text-[11px] text-[#888]">
                  {profile.companies?.name ?? 'Plataforma'} · {roleLabel}
                </p>
              </div>
              <div
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4A5D23] text-[12px] font-semibold text-white"
              >
                {initials(profile.full_name)}
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await getSupabaseClient().auth.signOut();
              }}
              className="rounded-full border border-[#1a1a1a]/10 px-3 py-1.5 text-[13px] font-medium text-[#666] transition-colors hover:border-[#1a1a1a]/20 hover:text-[#1a1a1a] sm:px-4"
            >
              Salir
            </button>
          </div>
        </div>

        <nav
          className="flex items-center gap-3 overflow-x-auto px-4 pb-2.5 sm:px-6 md:hidden"
          aria-label="Principal móvil"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex shrink-0 items-center gap-1">
              <span
                aria-hidden
                className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a8ad9c]"
              >
                {group.label}
              </span>
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-all ${
                      active
                        ? 'bg-white text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                        : 'text-[#888]'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1560px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      {!canManage && (pathname.startsWith('/dashboard/master-data') || pathname.startsWith('/dashboard/lots') || pathname.startsWith('/dashboard/inspections')) && (
        <div className="mx-auto w-full max-w-[1560px] px-4 pb-8 sm:px-6">
          <p className="rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            Su rol permite consultar. La administración requiere Admin de Empresa o
            Super Admin.
          </p>
        </div>
      )}

      <footer className="border-t border-[#1a1a1a]/[0.06] py-6">
        <p className="mx-auto w-full max-w-[1560px] px-4 text-[11px] text-[#aaa] sm:px-6">
          QualityNX — Control de calidad de fruta. Una solución NXChile.
        </p>
      </footer>
    </div>
  );
}
