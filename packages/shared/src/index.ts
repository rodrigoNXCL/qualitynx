/**
 * QualityNX — Tipos compartidos (etapa 01 FOUNDATION)
 * Refleja el esquema definido en:
 * packages/database/supabase/migrations/20260811000001_foundation_initial_schema.sql
 */

// ============================================
// ROLES (ENUM: user_role)
// ============================================

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  INSPECTOR: 'INSPECTOR',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ============================================
// AUDITORÍA (ENUM: audit_action)
// ============================================

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  ACCESS_DENIED: 'ACCESS_DENIED',
  ROLE_CHANGE: 'ROLE_CHANGE',
  COMPANY_ASSIGNMENT: 'COMPANY_ASSIGNMENT',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// ============================================
// TABLA: companies
// ============================================

export interface Company {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ============================================
// TABLA: users
// ============================================

export interface User {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  company_id: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

// ============================================
// TABLA: audit_logs
// ============================================

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  user_id: string;
  company_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================
// TABLA: leads
// ============================================

export const LeadStatus = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  CLOSED: 'closed',
} as const;

export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export type LeadCompanyType = 'Productor' | 'Packing' | 'Exportadora' | 'Otro';

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string | null;
  whatsapp: string;
  fruit_type: string | null;
  company_type: LeadCompanyType;
  recording_method: string | null;
  inspection_volume: string | null;
  problem: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export type LeadCreate = Omit<Lead, 'id' | 'status' | 'created_at' | 'updated_at'> & {
  role?: string | null;
  fruit_type?: string | null;
  recording_method?: string | null;
  inspection_volume?: string | null;
};
