/**
 * QualityNX — Cliente Supabase (web)
 * Etapa 01 FOUNDATION.
 *
 * Web-safe: sin dependencias de React Native.
 * El cliente para móvil se añadirá en su etapa (03+ / mobile),
 * en apps/mobile con su propio storage adapter.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { Database } from './generated/database.types';

export * from '@qualitynx/shared';

// ============================================
// CONFIGURACIÓN DE ENTORNO
// ============================================

function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Falta configuración de Supabase: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return { url, anonKey };
}

// ============================================
// CLIENTE (singleton en navegador)
// ============================================

let webClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseConfig();

  if (typeof window !== 'undefined') {
    if (!webClient) {
      webClient = createClient<Database>(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
    return webClient;
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ============================================
// AUTENTICACIÓN
// ============================================

export async function signIn(email: string, password: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  return { user: data.user, error };
}

export async function getCurrentSession() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  return { session: data.session, error };
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const client = getSupabaseClient();
  return client.auth.onAuthStateChange(callback);
}

// ============================================
// PERFIL DE USUARIO (tabla users)
// ============================================

export async function getUserProfile(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*, companies (id, name, code, is_active)')
    .eq('auth_id', userId)
    .maybeSingle();

  return { data: (data as any) ?? null, error };
}

export async function getUserCompany(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('company_id, companies (id, name, code, is_active)')
    .eq('auth_id', userId)
    .maybeSingle();

  return { data, error };
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  const { data } = await client
    .from('users')
    .select('role')
    .eq('auth_id', userId)
    .maybeSingle();

  return data?.role === 'SUPER_ADMIN';
}
