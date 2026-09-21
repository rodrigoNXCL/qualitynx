'use client';

import { getCurrentSession, getUserProfile } from '@qualitynx/database';
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

export default async function DashboardPage() {
  const { session } = await getCurrentSession();
  
  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  const { data: profile } = await getUserProfile(session.user.id);
  
  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Perfil de usuario no encontrado</p>
      </div>
    );
  }

  const stats = [
    { label: 'Rol', value: profile.role.replace('_', ' ') },
    { label: 'Empresa', value: profile.companies?.name || 'N/A (Super Admin)' },
    { label: 'Código Empresa', value: profile.companies?.code || 'N/A' },
    { label: 'Estado Empresa', value: profile.companies?.isActive ? 'Activa' : 'Inactiva' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Bienvenido, {profile.fullName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">{stat.label}</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{stat.value}</dd>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/companies"
            className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Gestión de Empresas</h3>
            <p className="text-sm text-gray-500 mt-1">Administrar empresas del sistema</p>
          </a>
          <a
            href="/dashboard/users"
            className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Gestión de Usuarios</h3>
            <p className="text-sm text-gray-500 mt-1">Administrar usuarios y roles</p>
          </a>
          <a
            href="/dashboard/audit"
            className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Auditoría</h3>
            <p className="text-sm text-gray-500 mt-1">Ver logs de auditoría del sistema</p>
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de la Etapa FOUNDATION</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Plataforma central (Supabase)</span>
            <span className="text-green-600 font-medium">✓ Configurado</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Base de datos (PostgreSQL)</span>
            <span className="text-green-600 font-medium">✓ Configurado</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Autenticación (Supabase Auth)</span>
            <span className="text-green-600 font-medium">✓ Configurado</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Multiempresa con RLS</span>
            <span className="text-green-600 font-medium">✓ Configurado</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Roles base (Super Admin, Company Admin, Inspector)</span>
            <span className="text-green-600 font-medium">✓ Configurado</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Auditoría base</span>
            <span className="text-green-600 font-medium">✓ Configurado</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Almacenamiento (Supabase Storage)</span>
            <span className="text-yellow-600 font-medium">⚠ Pendiente bucket</span>
          </div>
        </div>
      </div>
    </div>
  );
}