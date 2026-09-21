// Placeholder types for Supabase Database
// NOTA: Regenerar con `npm run db:generate` cuando Supabase CLI esté disponible.

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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            column: "user_id";
            isOneToOne: false;
            referencedRelation: "users";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "audit_logs_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          name: string;
          company: string;
          role: string | null;
          whatsapp: string;
          fruit_type: string | null;
          company_type: 'Productor' | 'Packing' | 'Exportadora' | 'Otro';
          recording_method: string | null;
          inspection_volume: string | null;
          problem: string;
          status: 'new' | 'contacted' | 'qualified' | 'closed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          company: string;
          role?: string | null;
          whatsapp: string;
          fruit_type?: string | null;
          company_type: 'Productor' | 'Packing' | 'Exportadora' | 'Otro';
          recording_method?: string | null;
          inspection_volume?: string | null;
          problem: string;
          status?: 'new' | 'contacted' | 'qualified' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          company?: string;
          role?: string | null;
          whatsapp?: string;
          fruit_type?: string | null;
          company_type?: 'Productor' | 'Packing' | 'Exportadora' | 'Otro';
          recording_method?: string | null;
          inspection_volume?: string | null;
          problem?: string;
          status?: 'new' | 'contacted' | 'qualified' | 'closed';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
