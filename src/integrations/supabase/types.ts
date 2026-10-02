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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_name: string | null
          image_type: string
          image_url: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_name?: string | null
          image_type: string
          image_url: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_name?: string | null
          image_type?: string
          image_url?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: Json
          ui_theme: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_type: string
          setting_value: Json
          ui_theme?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          ui_theme?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_type: string | null
          arrived_at: string | null
          clinic_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          doctor_id: string
          duration_minutes: number | null
          id: string
          invoice_id: string | null
          notes: string | null
          patient_id: string
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          seated_at: string | null
          status: string | null
          treatment_plan_id: string | null
          visit_number: number | null
        }
        Insert: {
          appointment_date: string
          appointment_type?: string | null
          arrived_at?: string | null
          clinic_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          doctor_id: string
          duration_minutes?: number | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          seated_at?: string | null
          status?: string | null
          treatment_plan_id?: string | null
          visit_number?: number | null
        }
        Update: {
          appointment_date?: string
          appointment_type?: string | null
          arrived_at?: string | null
          clinic_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string
          duration_minutes?: number | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id?: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          seated_at?: string | null
          status?: string | null
          treatment_plan_id?: string | null
          visit_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_backup_logs: {
        Row: {
          backup_type: string
          clinic_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_name: string | null
          file_size: number | null
          google_drive_file_id: string | null
          id: string
          records_count: number | null
          started_at: string | null
          status: string
          tables_included: string[] | null
        }
        Insert: {
          backup_type?: string
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_size?: number | null
          google_drive_file_id?: string | null
          id?: string
          records_count?: number | null
          started_at?: string | null
          status?: string
          tables_included?: string[] | null
        }
        Update: {
          backup_type?: string
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_size?: number | null
          google_drive_file_id?: string | null
          id?: string
          records_count?: number | null
          started_at?: string | null
          status?: string
          tables_included?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "automated_backup_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "automated_backup_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_models: {
        Row: {
          billing_type: string
          created_at: string | null
          currency: string | null
          default_price_per_unit: number
          description: string | null
          id: string
          is_active: boolean | null
          model_name: string
          plan_id: string | null
          updated_at: string | null
        }
        Insert: {
          billing_type: string
          created_at?: string | null
          currency?: string | null
          default_price_per_unit: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_name: string
          plan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_type?: string
          created_at?: string | null
          currency?: string | null
          default_price_per_unit?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_name?: string
          plan_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_models_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_billing_settings: {
        Row: {
          billing_model_id: string
          clinic_id: string
          created_at: string | null
          custom_price_per_unit: number | null
          id: string
          is_active: boolean | null
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_model_id: string
          clinic_id: string
          created_at?: string | null
          custom_price_per_unit?: number | null
          id?: string
          is_active?: boolean | null
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_model_id?: string
          clinic_id?: string
          created_at?: string | null
          custom_price_per_unit?: number | null
          id?: string
          is_active?: boolean | null
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_billing_settings_billing_model_id_fkey"
            columns: ["billing_model_id"]
            isOneToOne: false
            referencedRelation: "billing_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_billing_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_billing_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_currency_settings: {
        Row: {
          clinic_id: string
          created_at: string | null
          currency_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          currency_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          currency_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_currency_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_currency_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_currency_settings_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_invoice_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          item_type: string
          line_total: number
          patient_id: string | null
          patient_name: string | null
          quantity: number | null
          tooth_number: string | null
          treatment_date: string | null
          treatment_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          item_type: string
          line_total: number
          patient_id?: string | null
          patient_name?: string | null
          quantity?: number | null
          tooth_number?: string | null
          treatment_date?: string | null
          treatment_id?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string
          line_total?: number
          patient_id?: string | null
          patient_name?: string | null
          quantity?: number | null
          tooth_number?: string | null
          treatment_date?: string | null
          treatment_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinic_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "clinic_monthly_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_invoice_items_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_invoice_items_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_monthly_invoices: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          billing_type: string
          clinic_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          discount_amount: number | null
          discount_percentage: number | null
          due_date: string | null
          id: string
          invoice_number: string
          issued_date: string | null
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string | null
          subtotal: number
          total_amount: number
          unit_count: number
          unit_price: number
          updated_at: string | null
          usage_record_id: string | null
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          billing_type: string
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_date?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          subtotal: number
          total_amount: number
          unit_count?: number
          unit_price: number
          updated_at?: string | null
          usage_record_id?: string | null
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          billing_type?: string
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          subtotal?: number
          total_amount?: number
          unit_count?: number
          unit_price?: number
          updated_at?: string | null
          usage_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_monthly_invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_monthly_invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_monthly_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "clinic_monthly_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_monthly_invoices_usage_record_id_fkey"
            columns: ["usage_record_id"]
            isOneToOne: false
            referencedRelation: "monthly_clinic_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          selected_invoice_template_id: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          selected_invoice_template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          selected_invoice_template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_settings_selected_invoice_template_id_fkey"
            columns: ["selected_invoice_template_id"]
            isOneToOne: false
            referencedRelation: "invoice_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_mode: string | null
          clinic_id: string
          created_at: string | null
          custom_price_monthly: number | null
          custom_price_per_patient: number | null
          custom_price_per_treatment: number | null
          end_date: string | null
          id: string
          notes: string | null
          plan_id: string
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          billing_mode?: string | null
          clinic_id: string
          created_at?: string | null
          custom_price_monthly?: number | null
          custom_price_per_patient?: number | null
          custom_price_per_treatment?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          billing_mode?: string | null
          clinic_id?: string
          created_at?: string | null
          custom_price_monthly?: number | null
          custom_price_per_patient?: number | null
          custom_price_per_treatment?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_types: {
        Row: {
          billing_model_id: string | null
          billing_per_patient: number | null
          billing_per_treatment: number | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          max_cleaners: number | null
          max_dentists: number | null
          max_receptionists: number | null
          max_workers: number | null
          min_cleaners: number | null
          min_dentists: number | null
          min_receptionists: number | null
          min_workers: number | null
          name: string
          subscription_plan_id: string | null
          updated_at: string | null
        }
        Insert: {
          billing_model_id?: string | null
          billing_per_patient?: number | null
          billing_per_treatment?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_cleaners?: number | null
          max_dentists?: number | null
          max_receptionists?: number | null
          max_workers?: number | null
          min_cleaners?: number | null
          min_dentists?: number | null
          min_receptionists?: number | null
          min_workers?: number | null
          name: string
          subscription_plan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_model_id?: string | null
          billing_per_patient?: number | null
          billing_per_treatment?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_cleaners?: number | null
          max_dentists?: number | null
          max_receptionists?: number | null
          max_workers?: number | null
          min_cleaners?: number | null
          min_dentists?: number | null
          min_receptionists?: number | null
          min_workers?: number | null
          name?: string
          subscription_plan_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_types_billing_model_id_fkey"
            columns: ["billing_model_id"]
            isOneToOne: false
            referencedRelation: "billing_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_types_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_usage_logs: {
        Row: {
          clinic_id: string
          created_at: string | null
          event_date: string | null
          event_type: string
          id: string
          metadata: Json | null
          reference_id: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          event_date?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_usage_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_usage_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          active_theme_preset: string | null
          address: string | null
          clinic_name_ar: string | null
          clinic_name_ku: string | null
          clinic_type_id: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          max_patients: number | null
          max_staff: number | null
          name: string
          name_ar: string | null
          phone: string | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_status: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          active_theme_preset?: string | null
          address?: string | null
          clinic_name_ar?: string | null
          clinic_name_ku?: string | null
          clinic_type_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_patients?: number | null
          max_staff?: number | null
          name: string
          name_ar?: string | null
          phone?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          active_theme_preset?: string | null
          address?: string | null
          clinic_name_ar?: string | null
          clinic_name_ku?: string | null
          clinic_type_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_patients?: number | null
          max_staff?: number | null
          name?: string
          name_ar?: string | null
          phone?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_clinic_type_id_fkey"
            columns: ["clinic_type_id"]
            isOneToOne: false
            referencedRelation: "clinic_types"
            referencedColumns: ["id"]
          },
        ]
      }
      coming_soon_settings: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          custom_html: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          custom_html?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          custom_html?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_payment_items: {
        Row: {
          amount: number
          commission_amount: number
          commission_rate: number
          created_at: string | null
          description: string | null
          id: string
          patient_id: string
          payment_id: string
          source_id: string
          source_type: string
          treatment_date: string
        }
        Insert: {
          amount: number
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          description?: string | null
          id?: string
          patient_id: string
          payment_id: string
          source_id: string
          source_type: string
          treatment_date: string
        }
        Update: {
          amount?: number
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          description?: string | null
          id?: string
          patient_id?: string
          payment_id?: string
          source_id?: string
          source_type?: string
          treatment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payment_items_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payment_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "commission_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          clinic_id: string
          commission_calculation_id: string | null
          created_at: string
          created_by: string
          doctor_id: string
          id: string
          notes: string | null
          paid_by: string | null
          payment_amount: number
          payment_date: string
          payment_method: string
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          status: string | null
          total_commission: number | null
        }
        Insert: {
          clinic_id: string
          commission_calculation_id?: string | null
          created_at?: string
          created_by: string
          doctor_id: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_amount: number
          payment_date: string
          payment_method: string
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          total_commission?: number | null
        }
        Update: {
          clinic_id?: string
          commission_calculation_id?: string | null
          created_at?: string
          created_by?: string
          doctor_id?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_amount?: number
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          total_commission?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "commission_payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "commission_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "commission_payments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "commission_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string | null
          decimal_digits: number | null
          exchange_rate_to_usd: number | null
          id: string
          is_active: boolean | null
          is_custom: boolean | null
          name: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          decimal_digits?: number | null
          exchange_rate_to_usd?: number | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          name: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          decimal_digits?: number | null
          exchange_rate_to_usd?: number | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          name?: string
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      database_backups: {
        Row: {
          backup_name: string
          backup_type: string | null
          clinic_id: string | null
          created_at: string | null
          created_by: string | null
          file_size: number | null
          file_url: string | null
          id: string
          records_count: number | null
          status: string | null
          tables_included: string[] | null
        }
        Insert: {
          backup_name: string
          backup_type?: string | null
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          records_count?: number | null
          status?: string | null
          tables_included?: string[] | null
        }
        Update: {
          backup_name?: string
          backup_type?: string | null
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          records_count?: number | null
          status?: string | null
          tables_included?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "database_backups_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "database_backups_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "database_backups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "database_backups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_commission_rates: {
        Row: {
          clinic_id: string
          commission_rate: number
          created_at: string | null
          doctor_id: string
          id: string
          is_default: boolean | null
          treatment_type_id: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          commission_rate: number
          created_at?: string | null
          doctor_id: string
          id?: string
          is_default?: boolean | null
          treatment_type_id?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          commission_rate?: number
          created_at?: string | null
          doctor_id?: string
          id?: string
          is_default?: boolean | null
          treatment_type_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_commission_rates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "doctor_commission_rates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_commission_rates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "doctor_commission_rates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_commission_rates_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "analytics_treatment_performance"
            referencedColumns: ["treatment_type_id"]
          },
          {
            foreignKeyName: "doctor_commission_rates_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "treatment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          background_color: string | null
          border_color: string | null
          border_style: string | null
          border_width: number | null
          clinic_id: string
          color_scheme: string | null
          content_padding_bottom: number | null
          content_padding_left: number | null
          content_padding_right: number | null
          content_padding_top: number | null
          created_at: string | null
          custom_css: string | null
          custom_html: string | null
          font_family: string | null
          font_size: number | null
          footer_alignment: string | null
          footer_image_url: string | null
          footer_text: string | null
          header_alignment: string | null
          header_image_url: string | null
          header_text: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          layout_type: string | null
          letter_spacing: number | null
          line_height: number | null
          logo_url: string | null
          paper_size: string | null
          preview_data: Json | null
          primary_color: string | null
          show_clinic_info: boolean | null
          show_doctor_info: boolean | null
          show_page_numbers: boolean | null
          show_watermark: boolean | null
          template_name: string | null
          template_name_ar: string | null
          template_type: string
          template_variables: Json | null
          updated_at: string | null
          use_custom_template: boolean | null
          watermark_opacity: number | null
          watermark_text: string | null
        }
        Insert: {
          background_color?: string | null
          border_color?: string | null
          border_style?: string | null
          border_width?: number | null
          clinic_id: string
          color_scheme?: string | null
          content_padding_bottom?: number | null
          content_padding_left?: number | null
          content_padding_right?: number | null
          content_padding_top?: number | null
          created_at?: string | null
          custom_css?: string | null
          custom_html?: string | null
          font_family?: string | null
          font_size?: number | null
          footer_alignment?: string | null
          footer_image_url?: string | null
          footer_text?: string | null
          header_alignment?: string | null
          header_image_url?: string | null
          header_text?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          layout_type?: string | null
          letter_spacing?: number | null
          line_height?: number | null
          logo_url?: string | null
          paper_size?: string | null
          preview_data?: Json | null
          primary_color?: string | null
          show_clinic_info?: boolean | null
          show_doctor_info?: boolean | null
          show_page_numbers?: boolean | null
          show_watermark?: boolean | null
          template_name?: string | null
          template_name_ar?: string | null
          template_type: string
          template_variables?: Json | null
          updated_at?: string | null
          use_custom_template?: boolean | null
          watermark_opacity?: number | null
          watermark_text?: string | null
        }
        Update: {
          background_color?: string | null
          border_color?: string | null
          border_style?: string | null
          border_width?: number | null
          clinic_id?: string
          color_scheme?: string | null
          content_padding_bottom?: number | null
          content_padding_left?: number | null
          content_padding_right?: number | null
          content_padding_top?: number | null
          created_at?: string | null
          custom_css?: string | null
          custom_html?: string | null
          font_family?: string | null
          font_size?: number | null
          footer_alignment?: string | null
          footer_image_url?: string | null
          footer_text?: string | null
          header_alignment?: string | null
          header_image_url?: string | null
          header_text?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          layout_type?: string | null
          letter_spacing?: number | null
          line_height?: number | null
          logo_url?: string | null
          paper_size?: string | null
          preview_data?: Json | null
          primary_color?: string | null
          show_clinic_info?: boolean | null
          show_doctor_info?: boolean | null
          show_page_numbers?: boolean | null
          show_watermark?: boolean | null
          template_name?: string | null
          template_name_ar?: string | null
          template_type?: string
          template_variables?: Json | null
          updated_at?: string | null
          use_custom_template?: boolean | null
          watermark_opacity?: number | null
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "document_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          clinic_id: string
          created_at: string | null
          created_by: string | null
          description: string
          description_ar: string | null
          expense_date: string | null
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          description_ar?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          description_ar?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "expenses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_settings: {
        Row: {
          backup_schedule: string | null
          backup_time: string | null
          clinic_id: string | null
          connection_status: string | null
          created_at: string | null
          folder_id: string | null
          id: string
          is_enabled: boolean | null
          last_backup_at: string | null
          retention_days: number | null
          service_account_email: string | null
          service_account_json: string | null
          updated_at: string | null
        }
        Insert: {
          backup_schedule?: string | null
          backup_time?: string | null
          clinic_id?: string | null
          connection_status?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          is_enabled?: boolean | null
          last_backup_at?: string | null
          retention_days?: number | null
          service_account_email?: string | null
          service_account_json?: string | null
          updated_at?: string | null
        }
        Update: {
          backup_schedule?: string | null
          backup_time?: string | null
          clinic_id?: string | null
          connection_status?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          is_enabled?: boolean | null
          last_backup_at?: string | null
          retention_days?: number | null
          service_account_email?: string | null
          service_account_json?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "google_drive_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          clinic_id: string
          created_at: string | null
          expiry_date: string | null
          id: string
          item_name: string
          item_name_ar: string | null
          quantity: number | null
          reorder_level: number | null
          sku: string | null
          supplier: string | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          category?: string | null
          clinic_id: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_name: string
          item_name_ar?: string | null
          quantity?: number | null
          reorder_level?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          category?: string | null
          clinic_id?: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_name?: string
          item_name_ar?: string | null
          quantity?: number | null
          reorder_level?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "inventory_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          created_at: string | null
          id: string
          preview_url: string
          template_code: string
          template_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preview_url: string
          template_code: string
          template_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preview_url?: string
          template_code?: string
          template_name?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          clinic_id: string
          created_at: string | null
          created_by: string | null
          discount: number | null
          doctor_id: string | null
          id: string
          invoice_date: string | null
          invoice_number: string
          items: Json | null
          notes: string | null
          paid_amount: number | null
          patient_id: string
          payment_method: string | null
          payment_status: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          treatment_plan_id: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          doctor_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          items?: Json | null
          notes?: string | null
          paid_amount?: number | null
          patient_id: string
          payment_method?: string | null
          payment_status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          treatment_plan_id?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          doctor_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          items?: Json | null
          notes?: string | null
          paid_amount?: number | null
          patient_id?: string
          payment_method?: string | null
          payment_status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          treatment_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "invoices_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      language_settings: {
        Row: {
          arabic_enabled: boolean | null
          created_at: string | null
          display_order: number | null
          english_enabled: boolean | null
          id: string
          is_enabled: boolean | null
          is_rtl: boolean | null
          language_code: string | null
          language_name: string | null
          updated_at: string | null
        }
        Insert: {
          arabic_enabled?: boolean | null
          created_at?: string | null
          display_order?: number | null
          english_enabled?: boolean | null
          id?: string
          is_enabled?: boolean | null
          is_rtl?: boolean | null
          language_code?: string | null
          language_name?: string | null
          updated_at?: string | null
        }
        Update: {
          arabic_enabled?: boolean | null
          created_at?: string | null
          display_order?: number | null
          english_enabled?: boolean | null
          id?: string
          is_enabled?: boolean | null
          is_rtl?: boolean | null
          language_code?: string | null
          language_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medications: {
        Row: {
          barcode: string | null
          brand_names: string[] | null
          clinic_id: string | null
          common_dosages: Json | null
          contraindications: string | null
          controlled_substance: boolean | null
          created_at: string | null
          default_dosage: string | null
          default_duration: string | null
          default_frequency: string | null
          dosage_form: string | null
          drug_class: string | null
          generic_name: string | null
          id: string
          indication: string | null
          instructions: string | null
          instructions_ar: string | null
          interactions: string | null
          is_active: boolean | null
          is_global: boolean | null
          name: string
          name_ar: string | null
          ndc_code: string | null
          notes: string | null
          pregnancy_category: string | null
          side_effects: string | null
          storage_conditions: string | null
          strength: string | null
          timing: string | null
          timing_ar: string | null
          updated_at: string | null
          warnings: string | null
          warnings_ar: string | null
        }
        Insert: {
          barcode?: string | null
          brand_names?: string[] | null
          clinic_id?: string | null
          common_dosages?: Json | null
          contraindications?: string | null
          controlled_substance?: boolean | null
          created_at?: string | null
          default_dosage?: string | null
          default_duration?: string | null
          default_frequency?: string | null
          dosage_form?: string | null
          drug_class?: string | null
          generic_name?: string | null
          id?: string
          indication?: string | null
          instructions?: string | null
          instructions_ar?: string | null
          interactions?: string | null
          is_active?: boolean | null
          is_global?: boolean | null
          name: string
          name_ar?: string | null
          ndc_code?: string | null
          notes?: string | null
          pregnancy_category?: string | null
          side_effects?: string | null
          storage_conditions?: string | null
          strength?: string | null
          timing?: string | null
          timing_ar?: string | null
          updated_at?: string | null
          warnings?: string | null
          warnings_ar?: string | null
        }
        Update: {
          barcode?: string | null
          brand_names?: string[] | null
          clinic_id?: string | null
          common_dosages?: Json | null
          contraindications?: string | null
          controlled_substance?: boolean | null
          created_at?: string | null
          default_dosage?: string | null
          default_duration?: string | null
          default_frequency?: string | null
          dosage_form?: string | null
          drug_class?: string | null
          generic_name?: string | null
          id?: string
          indication?: string | null
          instructions?: string | null
          instructions_ar?: string | null
          interactions?: string | null
          is_active?: boolean | null
          is_global?: boolean | null
          name?: string
          name_ar?: string | null
          ndc_code?: string | null
          notes?: string | null
          pregnancy_category?: string | null
          side_effects?: string | null
          storage_conditions?: string | null
          strength?: string | null
          timing?: string | null
          timing_ar?: string | null
          updated_at?: string | null
          warnings?: string | null
          warnings_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "medications_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_clinic_usage: {
        Row: {
          billable_unit_count: number | null
          billing_period_end: string
          billing_period_start: string
          calculated_at: string | null
          clinic_id: string
          created_at: string | null
          id: string
          patient_count: number | null
          status: string | null
          total_amount: number | null
          treatment_count: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          billable_unit_count?: number | null
          billing_period_end: string
          billing_period_start: string
          calculated_at?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          patient_count?: number | null
          status?: string | null
          total_amount?: number | null
          treatment_count?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          billable_unit_count?: number | null
          billing_period_end?: string
          billing_period_start?: string
          calculated_at?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          patient_count?: number | null
          status?: string | null
          total_amount?: number | null
          treatment_count?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_clinic_usage_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "monthly_clinic_usage_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          message_content: string
          notification_type: string
          patient_id: string | null
          phone_number: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          appointment_id?: string | null
          clinic_id: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content: string
          notification_type: string
          patient_id?: string | null
          phone_number: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message_content?: string
          notification_type?: string
          patient_id?: string | null
          phone_number?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "notification_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          auto_reminder_enabled: boolean | null
          clinic_id: string
          created_at: string | null
          id: string
          reminder_hours_before: number | null
          sms_enabled: boolean | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_phone_number: string | null
          updated_at: string | null
          whatsapp_api_key: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          auto_reminder_enabled?: boolean | null
          clinic_id: string
          created_at?: string | null
          id?: string
          reminder_hours_before?: number | null
          sms_enabled?: boolean | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          auto_reminder_enabled?: boolean | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          reminder_hours_before?: number | null
          sms_enabled?: boolean | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "notification_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          language_code: string
          message_template: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language_code: string
          message_template: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language_code?: string
          message_template?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "notification_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          assigned_doctor_id: string | null
          blood_type: string | null
          clinic_id: string
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string
          full_name_ar: string | null
          gender: string | null
          has_diabetes: boolean | null
          has_heart_failure: boolean | null
          has_hepatitis_b: boolean | null
          has_hepatitis_c: boolean | null
          has_hypertension: boolean | null
          has_stent: boolean | null
          id: string
          language_preference: string | null
          medical_conditions_notes: string | null
          medical_history: string | null
          patient_number: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          assigned_doctor_id?: string | null
          blood_type?: string | null
          clinic_id: string
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          full_name_ar?: string | null
          gender?: string | null
          has_diabetes?: boolean | null
          has_heart_failure?: boolean | null
          has_hepatitis_b?: boolean | null
          has_hepatitis_c?: boolean | null
          has_hypertension?: boolean | null
          has_stent?: boolean | null
          id?: string
          language_preference?: string | null
          medical_conditions_notes?: string | null
          medical_history?: string | null
          patient_number: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          assigned_doctor_id?: string | null
          blood_type?: string | null
          clinic_id?: string
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          full_name_ar?: string | null
          gender?: string | null
          has_diabetes?: boolean | null
          has_heart_failure?: boolean | null
          has_hepatitis_b?: boolean | null
          has_hepatitis_c?: boolean | null
          has_hypertension?: boolean | null
          has_stent?: boolean | null
          id?: string
          language_preference?: string | null
          medical_conditions_notes?: string | null
          medical_history?: string | null
          patient_number?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_assigned_doctor_id_fkey"
            columns: ["assigned_doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "patients_assigned_doctor_id_fkey"
            columns: ["assigned_doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          clinic_id: string
          collected_at: string | null
          collected_by: string | null
          created_at: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          patient_id: string | null
          payment_method: string | null
          reference: string | null
          visit_id: string | null
        }
        Insert: {
          amount?: number
          clinic_id: string
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id?: string | null
          payment_method?: string | null
          reference?: string | null
          visit_id?: string | null
        }
        Update: {
          amount?: number
          clinic_id?: string
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id?: string | null
          payment_method?: string | null
          reference?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "payment_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "payment_transactions_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "treatment_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string | null
          dosage: string
          drug_name: string
          duration: string
          frequency: string
          id: string
          instructions: string | null
          medication_id: string | null
          prescription_id: string
          special_instructions: string | null
          timing: string | null
        }
        Insert: {
          created_at?: string | null
          dosage: string
          drug_name: string
          duration: string
          frequency: string
          id?: string
          instructions?: string | null
          medication_id?: string | null
          prescription_id: string
          special_instructions?: string | null
          timing?: string | null
        }
        Update: {
          created_at?: string | null
          dosage?: string
          drug_name?: string
          duration?: string
          frequency?: string
          id?: string
          instructions?: string | null
          medication_id?: string | null
          prescription_id?: string
          special_instructions?: string | null
          timing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_templates: {
        Row: {
          clinic_id: string
          color_scheme: string | null
          created_at: string | null
          doctor_id: string
          font_family: string | null
          footer_image_url: string | null
          footer_text: string | null
          header_image_url: string | null
          header_text: string | null
          id: string
          logo_url: string | null
          paper_size: string | null
          show_clinic_info: boolean | null
          show_doctor_info: boolean | null
          template_name: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          color_scheme?: string | null
          created_at?: string | null
          doctor_id: string
          font_family?: string | null
          footer_image_url?: string | null
          footer_text?: string | null
          header_image_url?: string | null
          header_text?: string | null
          id?: string
          logo_url?: string | null
          paper_size?: string | null
          show_clinic_info?: boolean | null
          show_doctor_info?: boolean | null
          template_name: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          color_scheme?: string | null
          created_at?: string | null
          doctor_id?: string
          font_family?: string | null
          footer_image_url?: string | null
          footer_text?: string | null
          header_image_url?: string | null
          header_text?: string | null
          id?: string
          logo_url?: string | null
          paper_size?: string | null
          show_clinic_info?: boolean | null
          show_doctor_info?: boolean | null
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "prescription_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_templates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "prescription_templates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          clinic_id: string
          created_at: string | null
          diagnosis: string | null
          doctor_id: string
          id: string
          instructions: string | null
          instructions_ar: string | null
          medications: Json | null
          notes: string | null
          patient_id: string
          prescription_date: string | null
          treatment_id: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          diagnosis?: string | null
          doctor_id: string
          id?: string
          instructions?: string | null
          instructions_ar?: string | null
          medications?: Json | null
          notes?: string | null
          patient_id: string
          prescription_date?: string | null
          treatment_id?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          instructions?: string | null
          instructions_ar?: string | null
          medications?: Json | null
          notes?: string | null
          patient_id?: string
          prescription_date?: string | null
          treatment_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "prescriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_templates: {
        Row: {
          clinic_id: string | null
          clinical_fields: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          template_name: string
          template_name_ar: string | null
          treatment_category: string | null
          treatment_type_id: string | null
          typical_visits: number | null
          updated_at: string | null
          visit_workflow: Json | null
        }
        Insert: {
          clinic_id?: string | null
          clinical_fields?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          template_name: string
          template_name_ar?: string | null
          treatment_category?: string | null
          treatment_type_id?: string | null
          typical_visits?: number | null
          updated_at?: string | null
          visit_workflow?: Json | null
        }
        Update: {
          clinic_id?: string | null
          clinical_fields?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          template_name?: string
          template_name_ar?: string | null
          treatment_category?: string | null
          treatment_type_id?: string | null
          typical_visits?: number | null
          updated_at?: string | null
          visit_workflow?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "procedure_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_templates_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "analytics_treatment_performance"
            referencedColumns: ["treatment_type_id"]
          },
          {
            foreignKeyName: "procedure_templates_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "treatment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          clinic_id: string
          created_at: string | null
          created_by: string | null
          id: string
          invoice_number: string | null
          items: Json | null
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          purchase_date: string | null
          supplier: string
          total_amount: number | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          purchase_date?: string | null
          supplier: string
          total_amount?: number | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          items?: Json | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          purchase_date?: string | null
          supplier?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "purchases_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          can_edit_appointments: boolean | null
          can_edit_inventory: boolean | null
          can_edit_invoices: boolean | null
          can_edit_patients: boolean | null
          can_edit_staff: boolean | null
          can_edit_treatment_plans: boolean | null
          can_edit_treatments: boolean | null
          can_view_accounting: boolean | null
          can_view_appointments: boolean | null
          can_view_inventory: boolean | null
          can_view_invoices: boolean | null
          can_view_patients: boolean | null
          can_view_settings: boolean | null
          can_view_staff: boolean | null
          can_view_treatment_plans: boolean | null
          can_view_treatments: boolean | null
          commission_rate: number | null
          created_at: string | null
          updated_at: string | null
          user_id: string
          view_all_appointments: boolean | null
          view_all_invoices: boolean | null
          view_all_patients: boolean | null
          view_all_treatment_plans: boolean | null
        }
        Insert: {
          can_edit_appointments?: boolean | null
          can_edit_inventory?: boolean | null
          can_edit_invoices?: boolean | null
          can_edit_patients?: boolean | null
          can_edit_staff?: boolean | null
          can_edit_treatment_plans?: boolean | null
          can_edit_treatments?: boolean | null
          can_view_accounting?: boolean | null
          can_view_appointments?: boolean | null
          can_view_inventory?: boolean | null
          can_view_invoices?: boolean | null
          can_view_patients?: boolean | null
          can_view_settings?: boolean | null
          can_view_staff?: boolean | null
          can_view_treatment_plans?: boolean | null
          can_view_treatments?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          updated_at?: string | null
          user_id: string
          view_all_appointments?: boolean | null
          view_all_invoices?: boolean | null
          view_all_patients?: boolean | null
          view_all_treatment_plans?: boolean | null
        }
        Update: {
          can_edit_appointments?: boolean | null
          can_edit_inventory?: boolean | null
          can_edit_invoices?: boolean | null
          can_edit_patients?: boolean | null
          can_edit_staff?: boolean | null
          can_edit_treatment_plans?: boolean | null
          can_edit_treatments?: boolean | null
          can_view_accounting?: boolean | null
          can_view_appointments?: boolean | null
          can_view_inventory?: boolean | null
          can_view_invoices?: boolean | null
          can_view_patients?: boolean | null
          can_view_settings?: boolean | null
          can_view_staff?: boolean | null
          can_view_treatment_plans?: boolean | null
          can_view_treatments?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
          view_all_appointments?: boolean | null
          view_all_invoices?: boolean | null
          view_all_patients?: boolean | null
          view_all_treatment_plans?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_salaries: {
        Row: {
          base_salary: number | null
          bonuses: number | null
          clinic_id: string
          created_at: string | null
          created_by: string | null
          deductions: number | null
          id: string
          month: string
          net_salary: number | null
          notes: string | null
          payment_date: string | null
          payment_status: string | null
          staff_id: string
        }
        Insert: {
          base_salary?: number | null
          bonuses?: number | null
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          id?: string
          month: string
          net_salary?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_status?: string | null
          staff_id: string
        }
        Update: {
          base_salary?: number | null
          bonuses?: number | null
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          id?: string
          month?: string
          net_salary?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_status?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_salaries_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "staff_salaries_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_salaries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_salaries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_salaries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_salaries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_features: {
        Row: {
          created_at: string | null
          description: string | null
          feature_key: string
          feature_name: string
          feature_name_ar: string | null
          feature_value: boolean | null
          id: string
          plan_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          feature_key: string
          feature_name: string
          feature_name_ar?: string | null
          feature_value?: boolean | null
          id?: string
          plan_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          feature_key?: string
          feature_name?: string
          feature_name_ar?: string | null
          feature_value?: boolean | null
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_mode: string
          color: string | null
          created_at: string | null
          currency: string
          description: string | null
          description_ar: string | null
          display_name: string
          display_name_ar: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_custom: boolean | null
          is_default: boolean
          max_appointments_per_month: number | null
          max_dentists: number | null
          max_patients: number | null
          max_receptionists: number
          max_staff: number | null
          max_workers: number
          name: string
          price_monthly: number | null
          price_per_patient: number
          price_per_treatment: number
          price_yearly: number | null
          tier_level: number | null
          updated_at: string | null
        }
        Insert: {
          billing_mode?: string
          color?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          description_ar?: string | null
          display_name: string
          display_name_ar?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          is_default?: boolean
          max_appointments_per_month?: number | null
          max_dentists?: number | null
          max_patients?: number | null
          max_receptionists?: number
          max_staff?: number | null
          max_workers?: number
          name: string
          price_monthly?: number | null
          price_per_patient?: number
          price_per_treatment?: number
          price_yearly?: number | null
          tier_level?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_mode?: string
          color?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          description_ar?: string | null
          display_name?: string
          display_name_ar?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          is_default?: boolean
          max_appointments_per_month?: number | null
          max_dentists?: number | null
          max_patients?: number | null
          max_receptionists?: number
          max_staff?: number | null
          max_workers?: number
          name?: string
          price_monthly?: number | null
          price_per_patient?: number
          price_per_treatment?: number
          price_yearly?: number | null
          tier_level?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      template_library: {
        Row: {
          category: string | null
          created_at: string | null
          css_template: string | null
          description: string | null
          description_ar: string | null
          display_order: number | null
          html_template: string | null
          id: string
          is_active: boolean | null
          preview_data: Json | null
          template_name: string
          template_name_ar: string | null
          template_type: string
          template_variables: Json | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          css_template?: string | null
          description?: string | null
          description_ar?: string | null
          display_order?: number | null
          html_template?: string | null
          id?: string
          is_active?: boolean | null
          preview_data?: Json | null
          template_name: string
          template_name_ar?: string | null
          template_type: string
          template_variables?: Json | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          css_template?: string | null
          description?: string | null
          description_ar?: string | null
          display_order?: number | null
          html_template?: string | null
          id?: string
          is_active?: boolean | null
          preview_data?: Json | null
          template_name?: string
          template_name_ar?: string | null
          template_type?: string
          template_variables?: Json | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      template_presets: {
        Row: {
          created_at: string | null
          description: string | null
          design_style: string
          display_order: number | null
          id: string
          is_active: boolean | null
          settings: Json
          template_name: string
          template_type: string
          thumbnail_data: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          design_style: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          settings: Json
          template_name: string
          template_type: string
          thumbnail_data?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          design_style?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          settings?: Json
          template_name?: string
          template_type?: string
          thumbnail_data?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      translation_keys: {
        Row: {
          ar: string | null
          ar_translation: string | null
          category: string
          created_at: string | null
          description: string | null
          en: string | null
          en_translation: string | null
          id: string
          key: string | null
          key_name: string | null
          ku: string | null
          ku_translation: string | null
          updated_at: string | null
        }
        Insert: {
          ar?: string | null
          ar_translation?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          en?: string | null
          en_translation?: string | null
          id?: string
          key?: string | null
          key_name?: string | null
          ku?: string | null
          ku_translation?: string | null
          updated_at?: string | null
        }
        Update: {
          ar?: string | null
          ar_translation?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          en?: string | null
          en_translation?: string | null
          id?: string
          key?: string | null
          key_name?: string | null
          ku?: string | null
          ku_translation?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string | null
          id: string
          key: string | null
          key_id: string | null
          language: string | null
          language_code: string | null
          translated_text: string | null
          translation: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key?: string | null
          key_id?: string | null
          language?: string | null
          language_code?: string | null
          translated_text?: string | null
          translation?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string | null
          key_id?: string | null
          language?: string | null
          language_code?: string | null
          translated_text?: string | null
          translation?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translations_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "translation_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_items: {
        Row: {
          amount: number | null
          clinic_id: string
          created_at: string | null
          description: string | null
          doctor_id: string | null
          id: string
          invoice_id: string | null
          patient_id: string | null
          quantity: number | null
          tooth_number: string | null
          treatment_id: string | null
          treatment_type_id: string | null
          unit_price: number | null
        }
        Insert: {
          amount?: number | null
          clinic_id: string
          created_at?: string | null
          description?: string | null
          doctor_id?: string | null
          id?: string
          invoice_id?: string | null
          patient_id?: string | null
          quantity?: number | null
          tooth_number?: string | null
          treatment_id?: string | null
          treatment_type_id?: string | null
          unit_price?: number | null
        }
        Update: {
          amount?: number | null
          clinic_id?: string
          created_at?: string | null
          description?: string | null
          doctor_id?: string | null
          id?: string
          invoice_id?: string | null
          patient_id?: string | null
          quantity?: number | null
          tooth_number?: string | null
          treatment_id?: string | null
          treatment_type_id?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "treatment_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_items_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "treatment_items_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_items_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_items_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_items_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "analytics_treatment_performance"
            referencedColumns: ["treatment_type_id"]
          },
          {
            foreignKeyName: "treatment_items_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "treatment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          clinic_id: string
          completed_visits: number | null
          completion_date: string | null
          created_at: string | null
          created_by: string | null
          doctor_id: string
          id: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          paid_amount: number | null
          patient_id: string
          payment_locked: boolean | null
          procedure_template_id: string | null
          start_date: string | null
          status: string | null
          tooth_numbers: string[] | null
          total_cost: number | null
          total_planned_visits: number | null
          treatment_category: string | null
          treatment_type_id: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          completed_visits?: number | null
          completion_date?: string | null
          created_at?: string | null
          created_by?: string | null
          doctor_id: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          paid_amount?: number | null
          patient_id: string
          payment_locked?: boolean | null
          procedure_template_id?: string | null
          start_date?: string | null
          status?: string | null
          tooth_numbers?: string[] | null
          total_cost?: number | null
          total_planned_visits?: number | null
          treatment_category?: string | null
          treatment_type_id?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          completed_visits?: number | null
          completion_date?: string | null
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          paid_amount?: number | null
          patient_id?: string
          payment_locked?: boolean | null
          procedure_template_id?: string | null
          start_date?: string | null
          status?: string | null
          tooth_numbers?: string[] | null
          total_cost?: number | null
          total_planned_visits?: number | null
          treatment_category?: string | null
          treatment_type_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "treatment_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "treatment_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "treatment_plans_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "treatment_plans_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_procedure_template_id_fkey"
            columns: ["procedure_template_id"]
            isOneToOne: false
            referencedRelation: "procedure_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "analytics_treatment_performance"
            referencedColumns: ["treatment_type_id"]
          },
          {
            foreignKeyName: "treatment_plans_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "treatment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_types: {
        Row: {
          category: string | null
          clinic_id: string
          cost: number | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
        }
        Insert: {
          category?: string | null
          clinic_id: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
        }
        Update: {
          category?: string | null
          clinic_id?: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_types_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "treatment_types_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_visits: {
        Row: {
          clinic_id: string
          clinical_data: Json | null
          complications: string | null
          created_at: string | null
          created_by: string | null
          doctor_id: string
          duration_minutes: number | null
          id: string
          invoice_id: string | null
          locked_at: string | null
          locked_by: string | null
          next_visit_notes: string | null
          patient_id: string
          payment_collected_at: string | null
          payment_collected_by: string | null
          payment_locked: boolean | null
          payment_received: number | null
          prescription_id: string | null
          procedure_performed: string | null
          procedure_performed_ar: string | null
          status: string | null
          tooth_numbers: string[] | null
          treatment_plan_id: string
          updated_at: string | null
          visit_cost: number | null
          visit_date: string | null
          visit_number: number | null
          visit_type: string | null
        }
        Insert: {
          clinic_id: string
          clinical_data?: Json | null
          complications?: string | null
          created_at?: string | null
          created_by?: string | null
          doctor_id: string
          duration_minutes?: number | null
          id?: string
          invoice_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_visit_notes?: string | null
          patient_id: string
          payment_collected_at?: string | null
          payment_collected_by?: string | null
          payment_locked?: boolean | null
          payment_received?: number | null
          prescription_id?: string | null
          procedure_performed?: string | null
          procedure_performed_ar?: string | null
          status?: string | null
          tooth_numbers?: string[] | null
          treatment_plan_id: string
          updated_at?: string | null
          visit_cost?: number | null
          visit_date?: string | null
          visit_number?: number | null
          visit_type?: string | null
        }
        Update: {
          clinic_id?: string
          clinical_data?: Json | null
          complications?: string | null
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string
          duration_minutes?: number | null
          id?: string
          invoice_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_visit_notes?: string | null
          patient_id?: string
          payment_collected_at?: string | null
          payment_collected_by?: string | null
          payment_locked?: boolean | null
          payment_received?: number | null
          prescription_id?: string | null
          procedure_performed?: string | null
          procedure_performed_ar?: string | null
          status?: string | null
          tooth_numbers?: string[] | null
          treatment_plan_id?: string
          updated_at?: string | null
          visit_cost?: number | null
          visit_date?: string | null
          visit_number?: number | null
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_visits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "treatment_visits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "treatment_visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "treatment_visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_visits_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_visits_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "treatment_visits_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_visits_payment_collected_by_fkey"
            columns: ["payment_collected_by"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "treatment_visits_payment_collected_by_fkey"
            columns: ["payment_collected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_visits_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_visits_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          cost: number | null
          created_at: string | null
          diagnosis: string | null
          diagnosis_ar: string | null
          doctor_id: string
          id: string
          notes: string | null
          paid_amount: number | null
          patient_id: string
          payment_status: string | null
          procedure: string | null
          procedure_ar: string | null
          status: string | null
          tooth_number: string | null
          total_cost: number | null
          treatment_date: string | null
          treatment_type_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          clinic_id: string
          cost?: number | null
          created_at?: string | null
          diagnosis?: string | null
          diagnosis_ar?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          patient_id: string
          payment_status?: string | null
          procedure?: string | null
          procedure_ar?: string | null
          status?: string | null
          tooth_number?: string | null
          total_cost?: number | null
          treatment_date?: string | null
          treatment_type_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          cost?: number | null
          created_at?: string | null
          diagnosis?: string | null
          diagnosis_ar?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          patient_id?: string
          payment_status?: string | null
          procedure?: string | null
          procedure_ar?: string | null
          status?: string | null
          tooth_number?: string | null
          total_cost?: number | null
          treatment_date?: string | null
          treatment_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "treatments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "treatments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "analytics_treatment_performance"
            referencedColumns: ["treatment_type_id"]
          },
          {
            foreignKeyName: "treatments_treatment_type_id_fkey"
            columns: ["treatment_type_id"]
            isOneToOne: false
            referencedRelation: "treatment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          full_name: string
          full_name_ar: string | null
          id: string
          is_active: boolean | null
          must_change_password: boolean
          phone: string | null
          role: string
          specialization: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          full_name: string
          full_name_ar?: string | null
          id: string
          is_active?: boolean | null
          must_change_password?: boolean
          phone?: string | null
          role: string
          specialization?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          full_name?: string
          full_name_ar?: string | null
          id?: string
          is_active?: boolean | null
          must_change_password?: boolean
          phone?: string | null
          role?: string
          specialization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          language: string
          message_type: string
          template_text: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string
          message_type: string
          template_text: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string
          message_type?: string
          template_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "whatsapp_message_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_reminders: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          created_at: string | null
          id: string
          message_content: string
          patient_id: string | null
          patient_phone: string
          sent_at: string | null
          status: string | null
          updated_at: string | null
          whatsapp_link: string | null
        }
        Insert: {
          appointment_id?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          message_content: string
          patient_id?: string | null
          patient_phone: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp_link?: string | null
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          message_content?: string
          patient_id?: string | null
          patient_phone?: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          whatsapp_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_reminders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "whatsapp_reminders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          appointment_reminders_enabled: boolean | null
          clinic_id: string
          created_at: string | null
          enabled: boolean | null
          id: string
          invoice_notifications_enabled: boolean | null
          payment_reminders_enabled: boolean | null
          phone_number: string | null
          prescription_notifications_enabled: boolean | null
          reminder_hours_before: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_reminders_enabled?: boolean | null
          clinic_id: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          invoice_notifications_enabled?: boolean | null
          payment_reminders_enabled?: boolean | null
          phone_number?: string | null
          prescription_notifications_enabled?: boolean | null
          reminder_hours_before?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_reminders_enabled?: boolean | null
          clinic_id?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          invoice_notifications_enabled?: boolean | null
          payment_reminders_enabled?: boolean | null
          phone_number?: string | null
          prescription_notifications_enabled?: boolean | null
          reminder_hours_before?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "whatsapp_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      analytics_appointment_stats: {
        Row: {
          appointment_count: number | null
          clinic_id: string | null
          doctor_id: string | null
          period: string | null
          status: string | null
          unique_patients: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "analytics_staff_performance"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_expense_analysis: {
        Row: {
          avg_amount: number | null
          category: string | null
          clinic_id: string | null
          expense_count: number | null
          period: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "expenses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_patient_stats: {
        Row: {
          assigned_patients: number | null
          clinic_id: string | null
          new_patients: number | null
          patients_with_dob: number | null
          registration_period: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_revenue_trends: {
        Row: {
          avg_invoice_amount: number | null
          clinic_id: string | null
          period: string | null
          total_invoices: number | null
          total_outstanding: number | null
          total_paid: number | null
          total_revenue: number | null
          unique_patients: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_staff_performance: {
        Row: {
          avg_revenue_per_appointment: number | null
          cancelled_appointments: number | null
          clinic_id: string | null
          completed_appointments: number | null
          full_name: string | null
          full_name_ar: string | null
          period: string | null
          role: string | null
          staff_id: string | null
          total_appointments: number | null
          total_revenue_generated: number | null
          unique_patients_served: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_treatment_performance: {
        Row: {
          avg_revenue_per_treatment: number | null
          category: string | null
          clinic_id: string | null
          period: string | null
          times_performed: number | null
          total_quantity: number | null
          total_revenue: number | null
          treatment_name: string | null
          treatment_name_ar: string | null
          treatment_type_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_billing_info"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "treatment_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_billing_info: {
        Row: {
          billing_type: string | null
          clinic_id: string | null
          clinic_name: string | null
          clinic_type: string | null
          custom_rate: number | null
          effective_rate: number | null
          model_default_rate: number | null
          rate_source: string | null
          type_rate_per_patient: number | null
          type_rate_per_treatment: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_clinic_monthly_usage: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          billable_units: number
          billing_type: string
          clinic_id: string
          clinic_name: string
          patient_count: number
          total_amount: number
          treatment_count: number
          unit_price: number
        }[]
      }
      check_appointment_conflicts: {
        Args: {
          p_appointment_date: string
          p_doctor_id: string
          p_duration_minutes: number
          p_exclude_appointment_id?: string
        }
        Returns: {
          conflict_end: string
          conflict_start: string
          conflicting_appointment_id: string
          has_conflict: boolean
          patient_name: string
        }[]
      }
      check_subscription_limit: {
        Args: { p_clinic_id: string; p_limit_type: string }
        Returns: Json
      }
      clean_empty_invoices: { Args: never; Returns: number }
      clinic_has_feature: {
        Args: { p_clinic_id: string; p_feature_key: string }
        Returns: boolean
      }
      create_clinic_monthly_invoice: {
        Args: {
          p_clinic_id: string
          p_created_by?: string
          p_discount_percentage?: number
          p_due_days?: number
          p_issue_date?: string
          p_usage_record_id: string
        }
        Returns: string
      }
      create_clinic_monthly_invoice_with_items: {
        Args: {
          p_clinic_id: string
          p_created_by?: string
          p_discount_percentage?: number
          p_due_days?: number
          p_issue_date?: string
          p_usage_record_id: string
        }
        Returns: string
      }
      create_default_whatsapp_templates: {
        Args: { p_clinic_id: string }
        Returns: undefined
      }
      current_user_clinic_id: { Args: never; Returns: string }
      get_all_appointment_conflicts: {
        Args: {
          p_appointment_date: string
          p_doctor_id: string
          p_duration_minutes: number
          p_exclude_appointment_id?: string
        }
        Returns: {
          appointment_end: string
          appointment_id: string
          appointment_start: string
          appointment_type: string
          duration: number
          patient_name: string
          patient_phone: string
          status: string
        }[]
      }
      get_clinic_billing_rate: {
        Args: { p_billing_type?: string; p_clinic_id: string }
        Returns: number
      }
      get_clinic_billing_summary: {
        Args: { p_clinic_id: string; p_months_back?: number }
        Returns: {
          amount: number
          billable_units: number
          invoice_number: string
          invoice_status: string
          patient_count: number
          period_end: string
          period_start: string
          status: string
          treatment_count: number
        }[]
      }
      get_clinic_dentists_summary: {
        Args: { p_clinic_id: string }
        Returns: {
          created_at: string
          email: string
          id: string
          mobile: string
          name: string
          stats: Json
        }[]
      }
      get_clinic_effective_billing: {
        Args: { p_clinic_id: string }
        Returns: {
          billing_mode: string
          currency: string
          end_date: string
          max_appointments_per_month: number
          max_dentists: number
          max_patients: number
          max_receptionists: number
          max_staff: number
          plan_id: string
          plan_name: string
          price_monthly: number
          source: string
          start_date: string
          status: string
          unit_price: number
        }[]
      }
      get_clinic_staff_counts: {
        Args: { p_clinic_id: string }
        Returns: {
          can_add_more: boolean
          current_count: number
          max_allowed: number
          min_allowed: number
          role: string
        }[]
      }
      get_clinics_needing_backup: {
        Args: never
        Returns: {
          clinic_id: string
          clinic_name: string
          folder_id: string
          refresh_token: string
        }[]
      }
      get_dentist_analytics: {
        Args: {
          p_dentist_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_doctor_commission_details: {
        Args: {
          p_clinic_id: string
          p_doctor_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          amount: number
          commission_amount: number
          description: string
          patient_id: string
          patient_name: string
          source_id: string
          source_type: string
          treatment_date: string
        }[]
      }
      get_doctor_commission_summary: {
        Args: {
          p_clinic_id: string
          p_doctor_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          commission_rate: number
          from_invoices: number
          from_treatment_plans: number
          total_commission: number
          total_revenue: number
          treatment_count: number
        }[]
      }
      get_invoice_with_items: {
        Args: { p_invoice_id: string }
        Returns: {
          billing_period_end: string
          billing_period_start: string
          billing_type: string
          clinic_name: string
          discount_amount: number
          due_date: string
          invoice_id: string
          invoice_number: string
          issued_date: string
          items: Json
          status: string
          subtotal: number
          total_amount: number
        }[]
      }
      get_patient_retention_stats: {
        Args: { p_clinic_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          new_patients: number
          period: string
          retention_rate: number
          returning_patients: number
        }[]
      }
      get_profit_margins: {
        Args: { p_clinic_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          period: string
          profit: number
          profit_margin: number
          total_expenses: number
          total_revenue: number
        }[]
      }
      get_treatment_details_for_billing: {
        Args: { p_clinic_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          invoice_date: string
          invoice_id: string
          item_description: string
          item_price: number
          item_quantity: number
          item_total: number
          patient_name: string
        }[]
      }
      has_treatment_plan_permission: {
        Args: { permission_type: string }
        Returns: boolean
      }
      is_backup_due: { Args: { p_clinic_id: string }; Returns: boolean }
      is_clinic_admin: { Args: never; Returns: boolean }
      is_clinic_subscription_active: {
        Args: { clinic_uuid: string }
        Returns: boolean
      }
      is_dentist: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      lock_treatment_plan: { Args: { p_plan_id: string }; Returns: Json }
      lock_treatment_visit: { Args: { p_visit_id: string }; Returns: Json }
      mark_backup_completed: {
        Args: {
          p_clinic_id: string
          p_file_id: string
          p_file_size: number
          p_log_id: string
          p_records_count: number
        }
        Returns: undefined
      }
      mark_backup_failed: {
        Args: { p_error_message: string; p_log_id: string }
        Returns: undefined
      }
      recalculate_all_visit_commissions: {
        Args: never
        Returns: {
          commission_amount: number
          message: string
          success: boolean
          visit_id: string
        }[]
      }
      save_monthly_usage_record:
        | {
            Args: {
              p_billable_unit_count: number
              p_billing_period_end: string
              p_billing_period_start: string
              p_clinic_id: string
              p_patient_count: number
              p_status?: string
              p_total_amount: number
              p_treatment_count: number
              p_unit_price: number
            }
            Returns: string
          }
        | {
            Args: {
              p_billable_units: number
              p_clinic_id: string
              p_end_date: string
              p_patient_count: number
              p_start_date: string
              p_total_amount: number
              p_treatment_count: number
              p_unit_price: number
            }
            Returns: string
          }
      set_clinic_invoice_status: {
        Args: { p_invoice_id: string; p_status: string }
        Returns: undefined
      }
      suggest_alternative_slots: {
        Args: {
          p_clinic_id: string
          p_desired_date: string
          p_doctor_id: string
          p_duration_minutes: number
        }
        Returns: {
          is_available: boolean
          suggested_time: string
        }[]
      }
      suspend_expired_clinics: { Args: never; Returns: undefined }
      sync_clinics_with_type_billing: {
        Args: { p_clinic_type_id: string }
        Returns: undefined
      }
      translate_arabic_to_kurdish: {
        Args: { arabic_text: string }
        Returns: string
      }
      translate_arabic_to_kurdish_final: {
        Args: { arabic_text: string }
        Returns: string
      }
      translate_arabic_to_kurdish_phase2: {
        Args: { arabic_text: string }
        Returns: string
      }
      translate_english_phrases_to_kurdish: {
        Args: { english_text: string }
        Returns: string
      }
      translate_english_to_kurdish: {
        Args: { english_text: string }
        Returns: string
      }
      unlock_treatment_plan: { Args: { p_plan_id: string }; Returns: Json }
      unlock_treatment_visit: { Args: { p_visit_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
