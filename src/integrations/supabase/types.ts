export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          booking_id: string
          confirmed: boolean
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          scheduled_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          booking_id: string
          confirmed?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          scheduled_at: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          booking_id?: string
          confirmed?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          scheduled_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          operation: Database["public"]["Enums"]["audit_operation"]
          record_id: string
          table_name: string
          tenant_id: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          operation: Database["public"]["Enums"]["audit_operation"]
          record_id: string
          table_name: string
          tenant_id?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          operation?: Database["public"]["Enums"]["audit_operation"]
          record_id?: string
          table_name?: string
          tenant_id?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_cats: {
        Row: {
          booking_id: string
          cat_id: string
          id: string
        }
        Insert: {
          booking_id: string
          cat_id: string
          id?: string
        }
        Update: {
          booking_id?: string
          cat_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_cats_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_cats_cat_id_fkey"
            columns: ["cat_id"]
            isOneToOne: false
            referencedRelation: "cats"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_counters: {
        Row: {
          last_counter: number
          tenant_id: string
          year: number
        }
        Insert: {
          last_counter?: number
          tenant_id: string
          year: number
        }
        Update: {
          last_counter?: number
          tenant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_number: string
          cage_pool_type: Database["public"]["Enums"]["cage_pool_type"]
          check_in_date: string
          check_out_date: string
          client_id: string
          created_at: string
          created_by: string | null
          deposit_amount: number | null
          id: string
          notes: string | null
          pet_type: Database["public"]["Enums"]["pet_type"] | null
          price_breakdown: Json | null
          status: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          total_amount: number | null
          units_occupied: number
          updated_at: string
        }
        Insert: {
          booking_number: string
          cage_pool_type?: Database["public"]["Enums"]["cage_pool_type"]
          check_in_date: string
          check_out_date: string
          client_id: string
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          id?: string
          notes?: string | null
          pet_type?: Database["public"]["Enums"]["pet_type"] | null
          price_breakdown?: Json | null
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          total_amount?: number | null
          units_occupied?: number
          updated_at?: string
        }
        Update: {
          booking_number?: string
          cage_pool_type?: Database["public"]["Enums"]["cage_pool_type"]
          check_in_date?: string
          check_out_date?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          id?: string
          notes?: string | null
          pet_type?: Database["public"]["Enums"]["pet_type"] | null
          price_breakdown?: Json | null
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id?: string
          total_amount?: number | null
          units_occupied?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cage_overrides: {
        Row: {
          cage_pool_type: Database["public"]["Enums"]["cage_pool_type"]
          capacity_change: number
          created_at: string
          created_by: string | null
          id: string
          override_date: string
          reason: string | null
          tenant_id: string
        }
        Insert: {
          cage_pool_type: Database["public"]["Enums"]["cage_pool_type"]
          capacity_change: number
          created_at?: string
          created_by?: string | null
          id?: string
          override_date: string
          reason?: string | null
          tenant_id: string
        }
        Update: {
          cage_pool_type?: Database["public"]["Enums"]["cage_pool_type"]
          capacity_change?: number
          created_at?: string
          created_by?: string | null
          id?: string
          override_date?: string
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cage_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policies: {
        Row: {
          admin_fee: number
          created_at: string
          id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          admin_fee?: number
          created_at?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_fee?: number
          created_at?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policy_rules: {
        Row: {
          created_at: string
          days_before_checkin: number
          id: string
          policy_id: string
          refund_percentage: number
        }
        Insert: {
          created_at?: string
          days_before_checkin: number
          id?: string
          policy_id: string
          refund_percentage?: number
        }
        Update: {
          created_at?: string
          days_before_checkin?: number
          id?: string
          policy_id?: string
          refund_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_policy_rules_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "cancellation_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      cat_registry: {
        Row: {
          booking_id: string
          cat_id: string
          cat_name: string
          check_in_date: string
          check_out_date: string | null
          client_name: string
          created_at: string
          id: string
          microchip: string | null
          notes: string | null
          reason: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          cat_id: string
          cat_name: string
          check_in_date: string
          check_out_date?: string | null
          client_name: string
          created_at?: string
          id?: string
          microchip?: string | null
          notes?: string | null
          reason?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          cat_id?: string
          cat_name?: string
          check_in_date?: string
          check_out_date?: string | null
          client_name?: string
          created_at?: string
          id?: string
          microchip?: string | null
          notes?: string | null
          reason?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cat_registry_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cat_registry_cat_id_fkey"
            columns: ["cat_id"]
            isOneToOne: false
            referencedRelation: "cats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cat_registry_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cats: {
        Row: {
          behavioral_notes: string | null
          birth_date: string | null
          breed: string | null
          client_id: string
          color: string | null
          created_at: string
          dietary_notes: string | null
          gender: string | null
          id: string
          is_neutered: boolean | null
          medical_notes: string | null
          microchip: string | null
          name: string
          needs_double_cage: boolean
          pet_type: Database["public"]["Enums"]["pet_type"] | null
          sibling_group_id: string | null
          tenant_id: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          behavioral_notes?: string | null
          birth_date?: string | null
          breed?: string | null
          client_id: string
          color?: string | null
          created_at?: string
          dietary_notes?: string | null
          gender?: string | null
          id?: string
          is_neutered?: boolean | null
          medical_notes?: string | null
          microchip?: string | null
          name: string
          needs_double_cage?: boolean
          pet_type?: Database["public"]["Enums"]["pet_type"] | null
          sibling_group_id?: string | null
          tenant_id: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          behavioral_notes?: string | null
          birth_date?: string | null
          breed?: string | null
          client_id?: string
          color?: string | null
          created_at?: string
          dietary_notes?: string | null
          gender?: string | null
          id?: string
          is_neutered?: boolean | null
          medical_notes?: string | null
          microchip?: string | null
          name?: string
          needs_double_cage?: boolean
          pet_type?: Database["public"]["Enums"]["pet_type"] | null
          sibling_group_id?: string | null
          tenant_id?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cats_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          blacklist_reason: string | null
          created_at: string
          email: string | null
          first_name: string
          fiscal_code: string | null
          id: string
          is_blacklisted: boolean
          last_name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          blacklist_reason?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          fiscal_code?: string | null
          id?: string
          is_blacklisted?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          blacklist_reason?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          fiscal_code?: string | null
          id?: string
          is_blacklisted?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          booking_id: string | null
          created_at: string
          created_by: string | null
          document_type: string
          file_name: string
          id: string
          mime_type: string | null
          storage_path: string
          tenant_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          document_type: string
          file_name: string
          id?: string
          mime_type?: string | null
          storage_path: string
          tenant_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
          subject: string
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject: string
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          id: string
          name: string
          slug: string
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_html: string
          created_at?: string
          id?: string
          name: string
          slug: string
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          created_by: string | null
          id: string
          method: string | null
          notes: string | null
          payment_date: string
          payment_method_id: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          tenant_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          payment_method_id?: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          tenant_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          payment_method_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          task_date: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          task_date: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          task_date?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          cage_pool_type: Database["public"]["Enums"]["cage_pool_type"] | null
          created_at: string
          extra_cat_supplement: number | null
          extra_km_cost: number | null
          fixed_cost: number | null
          id: string
          included_km: number | null
          is_active: boolean
          name: string
          pet_type: Database["public"]["Enums"]["pet_type"] | null
          price_per_day: number
          season: string | null
          tariff_type: Database["public"]["Enums"]["tariff_type"]
          tenant_id: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          cage_pool_type?: Database["public"]["Enums"]["cage_pool_type"] | null
          created_at?: string
          extra_cat_supplement?: number | null
          extra_km_cost?: number | null
          fixed_cost?: number | null
          id?: string
          included_km?: number | null
          is_active?: boolean
          name: string
          pet_type?: Database["public"]["Enums"]["pet_type"] | null
          price_per_day?: number
          season?: string | null
          tariff_type?: Database["public"]["Enums"]["tariff_type"]
          tenant_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          cage_pool_type?: Database["public"]["Enums"]["cage_pool_type"] | null
          created_at?: string
          extra_cat_supplement?: number | null
          extra_km_cost?: number | null
          fixed_cost?: number | null
          id?: string
          included_km?: number | null
          is_active?: boolean
          name?: string
          pet_type?: Database["public"]["Enums"]["pet_type"] | null
          price_per_day?: number
          season?: string | null
          tariff_type?: Database["public"]["Enums"]["tariff_type"]
          tenant_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_delete: boolean
          can_read: boolean
          can_write: boolean
          created_at: string | null
          id: string
          is_visible: boolean
          resource: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          can_delete?: boolean
          can_read?: boolean
          can_write?: boolean
          created_at?: string | null
          id?: string
          is_visible?: boolean
          resource: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          can_delete?: boolean
          can_read?: boolean
          can_write?: boolean
          created_at?: string | null
          id?: string
          is_visible?: boolean
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_configs: {
        Row: {
          appointment_type: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          max_appointments: number
          slot_duration_minutes: number
          start_time: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          max_appointments?: number
          slot_duration_minutes?: number
          start_time: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          max_appointments?: number
          slot_duration_minutes?: number
          start_time?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          cap: string | null
          city: string | null
          count_checkin_day: boolean
          count_checkout_day: boolean
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          max_cats: number
          name: string
          num_doppie: number
          num_doppie_cani: number
          num_doppie_gatti: number
          num_singole: number
          num_singole_cani: number
          num_singole_gatti: number
          occupancy_rule_days: number
          partita_iva: string | null
          pec: string | null
          pet_type: Database["public"]["Enums"]["pet_type"]
          phone: string | null
          slug: string
          stay_calc_type: string
          titolare_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cap?: string | null
          city?: string | null
          count_checkin_day?: boolean
          count_checkout_day?: boolean
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          max_cats?: number
          name: string
          num_doppie?: number
          num_doppie_cani?: number
          num_doppie_gatti?: number
          num_singole?: number
          num_singole_cani?: number
          num_singole_gatti?: number
          occupancy_rule_days?: number
          partita_iva?: string | null
          pec?: string | null
          pet_type?: Database["public"]["Enums"]["pet_type"]
          phone?: string | null
          slug: string
          stay_calc_type?: string
          titolare_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cap?: string | null
          city?: string | null
          count_checkin_day?: boolean
          count_checkout_day?: boolean
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          max_cats?: number
          name?: string
          num_doppie?: number
          num_doppie_cani?: number
          num_doppie_gatti?: number
          num_singole?: number
          num_singole_cani?: number
          num_singole_gatti?: number
          occupancy_rule_days?: number
          partita_iva?: string | null
          pec?: string | null
          pet_type?: Database["public"]["Enums"]["pet_type"]
          phone?: string | null
          slug?: string
          stay_calc_type?: string
          titolare_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      copy_global_templates_to_tenant: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_booking_number: { Args: { _tenant_id: string }; Returns: string }
      reset_tenant_cancellation_policy: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      reset_tenant_payment_methods: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      reset_tenant_price_lists: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      reset_tenant_slot_configs: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "ceo" | "titolare" | "manager" | "operatore"
      appointment_type: "check_in" | "check_out"
      audit_operation: "INSERT" | "UPDATE" | "DELETE" | "RESTORE"
      booking_status:
        | "preventivo"
        | "confermata"
        | "appuntamento_fissato"
        | "check_in"
        | "in_corso"
        | "check_out"
        | "chiusa"
        | "cancellata"
        | "rimborsata"
        | "scaduto"
        | "appuntamento_in_fissato"
        | "appuntamento_out_fissato"
        | "appuntamento_in_out_fissato"
      cage_pool_type: "singola" | "doppia"
      email_status: "queued" | "sent" | "failed"
      payment_type:
        | "caparra"
        | "saldo"
        | "extra"
        | "rimborso"
        | "manuale"
        | "gestione_pratica"
      pet_type: "gatti" | "cani" | "entrambi"
      tariff_type:
        | "stagionale"
        | "extra_giornaliero"
        | "extra_km"
        | "extra_una_tantum"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "ceo", "titolare", "manager", "operatore"],
      appointment_type: ["check_in", "check_out"],
      audit_operation: ["INSERT", "UPDATE", "DELETE", "RESTORE"],
      booking_status: [
        "preventivo",
        "confermata",
        "appuntamento_fissato",
        "check_in",
        "in_corso",
        "check_out",
        "chiusa",
        "cancellata",
        "rimborsata",
        "scaduto",
        "appuntamento_in_fissato",
        "appuntamento_out_fissato",
        "appuntamento_in_out_fissato",
      ],
      cage_pool_type: ["singola", "doppia"],
      email_status: ["queued", "sent", "failed"],
      payment_type: [
        "caparra",
        "saldo",
        "extra",
        "rimborso",
        "manuale",
        "gestione_pratica",
      ],
      pet_type: ["gatti", "cani", "entrambi"],
      tariff_type: [
        "stagionale",
        "extra_giornaliero",
        "extra_km",
        "extra_una_tantum",
      ],
    },
  },
} as const
