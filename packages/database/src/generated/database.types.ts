// Placeholder types for Supabase Database
// These will be replaced by `supabase gen types typescript` when Supabase is configured
// Do not edit manually - this file is generated

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          code: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      users: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          full_name: string;
          company_id: string | null;
          role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSPECTOR';
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          full_name: string;
          company_id?: string | null;
          role?: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSPECTOR';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          full_name?: string;
          company_id?: string | null;
          role?: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSPECTOR';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'ACCESS_DENIED' | 'ROLE_CHANGE' | 'COMPANY_ASSIGNMENT';
          user_id: string;
          company_id: string | null;
          previous_value: Record<string, unknown> | null;
          new_value: Record<string, unknown> | null;
          reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'ACCESS_DENIED' | 'ROLE_CHANGE' | 'COMPANY_ASSIGNMENT';
          user_id: string;
          company_id?: string | null;
          previous_value?: Record<string, unknown> | null;
          new_value?: Record<string, unknown> | null;
          reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          action?: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'ACCESS_DENIED' | 'ROLE_CHANGE' | 'COMPANY_ASSIGNMENT';
          user_id?: string;
          company_id?: string | null;
          previous_value?: Record<string, unknown> | null;
          new_value?: Record<string, unknown> | null;
          reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_current_user_company_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSPECTOR';
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSPECTOR';
      audit_action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'ACCESS_DENIED' | 'ROLE_CHANGE' | 'COMPANY_ASSIGNMENT';
    };
  };
}