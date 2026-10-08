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
      producers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          rut: string | null;
          address: string | null;
          comuna: string | null;
          city: string | null;
          gps_point: string | null;
          phone: string | null;
          email: string | null;
          contact_person: string | null;
          salida_producer_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          rut?: string | null;
          address?: string | null;
          comuna?: string | null;
          city?: string | null;
          gps_point?: string | null;
          phone?: string | null;
          email?: string | null;
          contact_person?: string | null;
          salida_producer_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          rut?: string | null;
          address?: string | null;
          comuna?: string | null;
          city?: string | null;
          gps_point?: string | null;
          phone?: string | null;
          email?: string | null;
          contact_person?: string | null;
          salida_producer_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producers_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "producers_salida_producer_id_fkey";
            column: "salida_producer_id";
            isOneToOne: false;
            referencedRelation: "producers";
            referencedSchema: "public";
          },
        ];
      };
      fields: {
        Row: {
          id: string;
          company_id: string;
          producer_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          producer_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          producer_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fields_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "fields_producer_id_fkey";
            column: "producer_id";
            isOneToOne: false;
            referencedRelation: "producers";
            referencedSchema: "public";
          },
        ];
      };
      blocks: {
        Row: {
          id: string;
          company_id: string;
          field_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          field_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          field_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "blocks_field_id_fkey";
            column: "field_id";
            isOneToOne: false;
            referencedRelation: "fields";
            referencedSchema: "public";
          },
        ];
      };
      species: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "species_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
        ];
      };
      varieties: {
        Row: {
          id: string;
          company_id: string;
          species_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          species_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          species_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "varieties_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "varieties_species_id_fkey";
            column: "species_id";
            isOneToOne: false;
            referencedRelation: "species";
            referencedSchema: "public";
          },
        ];
      };
      seasons: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          start_date: string | null;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          start_date?: string | null;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          start_date?: string | null;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
        ];
      };
      lots: {
        Row: {
          id: string;
          company_id: string;
          producer_id: string;
          variety_id: string;
          fruit_date: string;
          harvest_block: string;
          status: 'CREADO' | 'EN PROCESO' | 'EN INSPECCIÓN' | 'RETENIDO' | 'APROBADO' | 'RECHAZADO' | 'SEGREGADO' | 'EN REPROCESO' | 'LIBERADO' | 'CERRADO';
          species_id: string | null;
          field_id: string | null;
          block_id: string | null;
          season_id: string | null;
          entry_operational_stage_id: string | null;
          current_operational_stage_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          producer_id: string;
          variety_id: string;
          fruit_date: string;
          harvest_block: string;
          status?: 'CREADO' | 'EN PROCESO' | 'EN INSPECCIÓN' | 'RETENIDO' | 'APROBADO' | 'RECHAZADO' | 'SEGREGADO' | 'EN REPROCESO' | 'LIBERADO' | 'CERRADO';
          species_id?: string | null;
          field_id?: string | null;
          block_id?: string | null;
          season_id?: string | null;
          entry_operational_stage_id?: string | null;
          current_operational_stage_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          producer_id?: string;
          variety_id?: string;
          fruit_date?: string;
          harvest_block?: string;
          status?: 'CREADO' | 'EN PROCESO' | 'EN INSPECCIÓN' | 'RETENIDO' | 'APROBADO' | 'RECHAZADO' | 'SEGREGADO' | 'EN REPROCESO' | 'LIBERADO' | 'CERRADO';
          species_id?: string | null;
          field_id?: string | null;
          block_id?: string | null;
          season_id?: string | null;
          entry_operational_stage_id?: string | null;
          current_operational_stage_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lots_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "lots_producer_id_fkey";
            column: "producer_id";
            isOneToOne: false;
            referencedRelation: "producers";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "lots_variety_id_fkey";
            column: "variety_id";
            isOneToOne: false;
            referencedRelation: "varieties";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "lots_species_id_fkey";
            column: "species_id";
            isOneToOne: false;
            referencedRelation: "species";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "lots_field_id_fkey";
            column: "field_id";
            isOneToOne: false;
            referencedRelation: "fields";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "lots_block_id_fkey";
            column: "block_id";
            isOneToOne: false;
            referencedRelation: "blocks";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "lots_season_id_fkey";
            column: "season_id";
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "lots_entry_operational_stage_id_fkey";
            column: "entry_operational_stage_id";
            isOneToOne: false;
            referencedRelation: "operational_stages";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "lots_current_operational_stage_id_fkey";
            column: "current_operational_stage_id";
            isOneToOne: false;
            referencedRelation: "operational_stages";
            referencedSchema: "public";
          },
        ];
      };
      inspection_points: {
        Row: {
          id: string;
          company_id: string;
          species_id: string;
          operational_stage_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          species_id: string;
          operational_stage_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          species_id?: string;
          operational_stage_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspection_points_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "inspection_points_species_id_fkey";
            column: "species_id";
            isOneToOne: false;
            referencedRelation: "species";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "inspection_points_operational_stage_id_fkey";
            column: "operational_stage_id";
            isOneToOne: false;
            referencedRelation: "operational_stages";
            referencedSchema: "public";
          },
        ];
      };
      operational_stages: {
        Row: {
          id: string;
          name: string;
          display_order: number;
          purpose: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_order: number;
          purpose?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_order?: number;
          purpose?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lot_stage_events: {
        Row: {
          id: string;
          company_id: string;
          lot_id: string;
          operational_stage_id: string;
          event_type: 'INGRESO' | 'TRANSICION';
          user_id: string;
          notes: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          lot_id: string;
          operational_stage_id: string;
          event_type: 'INGRESO' | 'TRANSICION';
          user_id: string;
          notes?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          lot_id?: string;
          operational_stage_id?: string;
          event_type?: 'INGRESO' | 'TRANSICION';
          user_id?: string;
          notes?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lot_stage_events_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "lot_stage_events_lot_id_fkey";
            column: "lot_id";
            isOneToOne: false;
            referencedRelation: "lots";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "lot_stage_events_operational_stage_id_fkey";
            column: "operational_stage_id";
            isOneToOne: false;
            referencedRelation: "operational_stages";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "lot_stage_events_user_id_fkey";
            column: "user_id";
            isOneToOne: false;
            referencedRelation: "users";
            referencedSchema: "public";
          },
        ];
      };
      measurement_defs: {
        Row: {
          id: string;
          company_id: string;
          inspection_point_id: string;
          name: string;
          value_type: 'numérica' | 'porcentaje' | 'entero' | 'texto' | 'lista' | 'sí/no' | 'cálculo derivado' | 'temperatura' | 'fecha' | 'fecha-hora' | 'multiselección' | 'foto' | 'archivo';
          unit: string | null;
          is_required: boolean;
          min_value: number | null;
          max_value: number | null;
          options: string[] | null;
          is_active: boolean;
          description: string | null;
          info_text: string | null;
          recommendation_text: string | null;
          method_text: string | null;
          source_kind: string | null;
          source_ref: string | null;
          validation_status: string;
          evidence_required: boolean;
          observation_required: boolean;
          sort_order: number;
          criteria_version: number;
          alert_only_out_of_range: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          inspection_point_id: string;
          name: string;
          value_type?: 'numérica' | 'porcentaje' | 'entero' | 'texto' | 'lista' | 'sí/no' | 'cálculo derivado' | 'temperatura' | 'fecha' | 'fecha-hora' | 'multiselección' | 'foto' | 'archivo';
          unit?: string | null;
          is_required?: boolean;
          min_value?: number | null;
          max_value?: number | null;
          options?: string[] | null;
          is_active?: boolean;
          description?: string | null;
          info_text?: string | null;
          recommendation_text?: string | null;
          method_text?: string | null;
          source_kind?: string | null;
          source_ref?: string | null;
          validation_status?: string;
          evidence_required?: boolean;
          observation_required?: boolean;
          sort_order?: number;
          criteria_version?: number;
          alert_only_out_of_range?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          inspection_point_id?: string;
          name?: string;
          value_type?: 'numérica' | 'porcentaje' | 'entero' | 'texto' | 'lista' | 'sí/no' | 'cálculo derivado' | 'temperatura' | 'fecha' | 'fecha-hora' | 'multiselección' | 'foto' | 'archivo';
          unit?: string | null;
          is_required?: boolean;
          min_value?: number | null;
          max_value?: number | null;
          options?: string[] | null;
          is_active?: boolean;
          description?: string | null;
          info_text?: string | null;
          recommendation_text?: string | null;
          method_text?: string | null;
          source_kind?: string | null;
          source_ref?: string | null;
          validation_status?: string;
          evidence_required?: boolean;
          observation_required?: boolean;
          sort_order?: number;
          criteria_version?: number;
          alert_only_out_of_range?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "measurement_defs_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "measurement_defs_inspection_point_id_fkey";
            column: "inspection_point_id";
            isOneToOne: false;
            referencedRelation: "inspection_points";
            referencedSchema: "public";
          },
        ];
      };
      inspections: {
        Row: {
          id: string;
          company_id: string;
          lot_id: string;
          inspection_point_id: string;
          inspector_id: string;
          status: 'EN CURSO' | 'COMPLETADA';
          inspected_at: string;
          observations: string | null;
          result: string | null;
          decision: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          lot_id: string;
          inspection_point_id: string;
          inspector_id: string;
          status?: 'EN CURSO' | 'COMPLETADA';
          inspected_at?: string;
          observations?: string | null;
          result?: string | null;
          decision?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          lot_id?: string;
          inspection_point_id?: string;
          inspector_id?: string;
          status?: 'EN CURSO' | 'COMPLETADA';
          inspected_at?: string;
          observations?: string | null;
          result?: string | null;
          decision?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspections_company_id_fkey";
            column: "company_id";
            isOneToOne: false;
            referencedRelation: "companies";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "inspections_lot_id_fkey";
            column: "lot_id";
            isOneToOne: false;
            referencedRelation: "lots";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "inspections_inspection_point_id_fkey";
            column: "inspection_point_id";
            isOneToOne: false;
            referencedRelation: "inspection_points";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "inspections_inspector_id_fkey";
            column: "inspector_id";
            isOneToOne: false;
            referencedRelation: "users";
            referencedSchema: "public";
          },
        ];
      };
      samples: {
        Row: {
          id: string;
          inspection_id: string;
          label: string | null;
          fruit_quantity: number | null;
          notes: string | null;
          method_text: string | null;
          instrument_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          label?: string | null;
          fruit_quantity?: number | null;
          notes?: string | null;
          method_text?: string | null;
          instrument_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          label?: string | null;
          fruit_quantity?: number | null;
          notes?: string | null;
          method_text?: string | null;
          instrument_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "samples_inspection_id_fkey";
            column: "inspection_id";
            isOneToOne: false;
            referencedRelation: "inspections";
            referencedSchema: "public";
          },
        ];
      };
      measurements: {
        Row: {
          id: string;
          inspection_id: string;
          measurement_def_id: string;
          sample_id: string | null;
          value: string | null;
          observation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          measurement_def_id: string;
          sample_id?: string | null;
          value?: string | null;
          observation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          measurement_def_id?: string;
          sample_id?: string | null;
          value?: string | null;
          observation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "measurements_inspection_id_fkey";
            column: "inspection_id";
            isOneToOne: false;
            referencedRelation: "inspections";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "measurements_measurement_def_id_fkey";
            column: "measurement_def_id";
            isOneToOne: false;
            referencedRelation: "measurement_defs";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "measurements_sample_id_fkey";
            column: "sample_id";
            isOneToOne: false;
            referencedRelation: "samples";
            referencedSchema: "public";
          },
        ];
      };
      inspection_evidence: {
        Row: {
          id: string;
          inspection_id: string;
          storage_path: string;
          measurement_def_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          storage_path: string;
          measurement_def_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          storage_path?: string;
          measurement_def_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspection_evidence_inspection_id_fkey";
            column: "inspection_id";
            isOneToOne: false;
            referencedRelation: "inspections";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "inspection_evidence_measurement_def_id_fkey";
            column: "measurement_def_id";
            isOneToOne: false;
            referencedRelation: "measurement_defs";
            referencedSchema: "public";
          },
        ];
      };
      ai_inspection_analysis: {
        Row: {
          id: string;
          company_id: string;
          inspection_id: string;
          model: string;
          model_version: string | null;
          prompt_version: string;
          input_snapshot: unknown;
          recommendation: string;
          reasoning_summary: string | null;
          confidence: number | null;
          alerts: unknown;
          supporting_factors: unknown;
          data_quality_warnings: unknown;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          inspection_id: string;
          model: string;
          model_version?: string | null;
          prompt_version?: string;
          input_snapshot: unknown;
          recommendation: string;
          reasoning_summary?: string | null;
          confidence?: number | null;
          alerts?: unknown;
          supporting_factors?: unknown;
          data_quality_warnings?: unknown;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          inspection_id?: string;
          model?: string;
          model_version?: string | null;
          prompt_version?: string;
          input_snapshot?: unknown;
          recommendation?: string;
          reasoning_summary?: string | null;
          confidence?: number | null;
          alerts?: unknown;
          supporting_factors?: unknown;
          data_quality_warnings?: unknown;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_learning_records: {
        Row: {
          id: string;
          company_id: string;
          inspection_id: string;
          ai_analysis_id: string;
          recommendation_ai: string;
          decision_inspector: string | null;
          decision_inspector_user_id: string | null;
          decision_inspector_at: string | null;
          agreement: boolean | null;
          outcome_posterior: string | null;
          outcome_posterior_at: string | null;
          feedback_type: string | null;
          feedback_notes: string | null;
          validated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          inspection_id: string;
          ai_analysis_id: string;
          recommendation_ai: string;
          decision_inspector?: string | null;
          decision_inspector_user_id?: string | null;
          decision_inspector_at?: string | null;
          agreement?: boolean | null;
          outcome_posterior?: string | null;
          outcome_posterior_at?: string | null;
          feedback_type?: string | null;
          feedback_notes?: string | null;
          validated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          inspection_id?: string;
          ai_analysis_id?: string;
          recommendation_ai?: string;
          decision_inspector?: string | null;
          decision_inspector_user_id?: string | null;
          decision_inspector_at?: string | null;
          agreement?: boolean | null;
          outcome_posterior?: string | null;
          outcome_posterior_at?: string | null;
          feedback_type?: string | null;
          feedback_notes?: string | null;
          validated?: boolean;
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
      lot_status: 'CREADO' | 'EN PROCESO' | 'EN INSPECCIÓN' | 'RETENIDO' | 'APROBADO' | 'RECHAZADO' | 'SEGREGADO' | 'EN REPROCESO' | 'LIBERADO' | 'CERRADO';
      inspection_status: 'EN CURSO' | 'COMPLETADA';
      measurement_value_type: 'numérica' | 'porcentaje' | 'entero' | 'texto' | 'lista' | 'sí/no' | 'cálculo derivado' | 'temperatura' | 'fecha' | 'fecha-hora' | 'multiselección' | 'foto' | 'archivo';
      lot_stage_event_type: 'INGRESO' | 'TRANSICION';
    };
  };
}
