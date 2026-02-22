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
      activity_log: {
        Row: {
          action_type: string
          case_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata_json: Json | null
          new_value_json: Json | null
          old_value_json: Json | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          case_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata_json?: Json | null
          new_value_json?: Json | null
          old_value_json?: Json | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          case_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata_json?: Json | null
          new_value_json?: Json | null
          old_value_json?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_milestones: {
        Row: {
          case_id: string
          client_visible: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          due_date: string | null
          id: string
          label: string
          milestone_key: string
          notes: string | null
          order_index: number
          status: Database["public"]["Enums"]["milestone_status"]
          updated_at: string
        }
        Insert: {
          case_id: string
          client_visible?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          label: string
          milestone_key: string
          notes?: string | null
          order_index: number
          status?: Database["public"]["Enums"]["milestone_status"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          client_visible?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          label?: string
          milestone_key?: string
          notes?: string | null
          order_index?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_milestones_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_milestones_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          case_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          note_type: Database["public"]["Enums"]["note_type"]
          updated_at: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_type?: Database["public"]["Enums"]["note_type"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_type?: Database["public"]["Enums"]["note_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_tenants: {
        Row: {
          case_id: string
          created_at: string
          id: string
          is_primary: boolean
          tenant_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          tenant_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_tenants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          assigned_admin_id: string | null
          case_number: string
          case_type: string
          client_id: string
          closed_date: string | null
          court_address: string | null
          court_case_number: string | null
          court_name: string | null
          created_at: string
          hold_reason: string | null
          id: string
          is_on_hold: boolean
          jurisdiction_county: string
          jurisdiction_state: string
          opened_date: string
          primary_tenant_id: string | null
          priority: Database["public"]["Enums"]["case_priority"]
          property_id: string | null
          status: Database["public"]["Enums"]["case_status"]
          sub_status: string | null
          updated_at: string
        }
        Insert: {
          assigned_admin_id?: string | null
          case_number?: string
          case_type?: string
          client_id: string
          closed_date?: string | null
          court_address?: string | null
          court_case_number?: string | null
          court_name?: string | null
          created_at?: string
          hold_reason?: string | null
          id?: string
          is_on_hold?: boolean
          jurisdiction_county?: string
          jurisdiction_state?: string
          opened_date?: string
          primary_tenant_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          property_id?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          sub_status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_admin_id?: string | null
          case_number?: string
          case_type?: string
          client_id?: string
          closed_date?: string | null
          court_address?: string | null
          court_case_number?: string | null
          court_name?: string | null
          created_at?: string
          hold_reason?: string | null
          id?: string
          is_on_hold?: boolean
          jurisdiction_county?: string
          jurisdiction_state?: string
          opened_date?: string
          primary_tenant_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          property_id?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          sub_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_primary_tenant_id_fkey"
            columns: ["primary_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      court_events: {
        Row: {
          case_id: string
          court_name: string | null
          created_at: string
          created_by: string | null
          end_at: string | null
          event_type: Database["public"]["Enums"]["court_event_type"]
          id: string
          location: string | null
          next_event_at: string | null
          notes: string | null
          outcome: string | null
          start_at: string | null
          updated_at: string
          virtual_link: string | null
        }
        Insert: {
          case_id: string
          court_name?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["court_event_type"]
          id?: string
          location?: string | null
          next_event_at?: string | null
          notes?: string | null
          outcome?: string | null
          start_at?: string | null
          updated_at?: string
          virtual_link?: string | null
        }
        Update: {
          case_id?: string
          court_name?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["court_event_type"]
          id?: string
          location?: string | null
          next_event_at?: string | null
          notes?: string | null
          outcome?: string | null
          start_at?: string | null
          updated_at?: string
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "court_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          updated_at: string
          uploaded_by: string | null
          version_number: number
          visible_to_client: boolean
        }
        Insert: {
          case_id: string
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version_number?: number
          visible_to_client?: boolean
        }
        Update: {
          case_id?: string
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version_number?: number
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_template_items: {
        Row: {
          auto_offset_days: number | null
          created_at: string
          default_client_visible: boolean
          id: string
          label: string
          milestone_key: string
          order_index: number
          required_document_category:
            | Database["public"]["Enums"]["document_category"]
            | null
          template_id: string
          updated_at: string
        }
        Insert: {
          auto_offset_days?: number | null
          created_at?: string
          default_client_visible?: boolean
          id?: string
          label: string
          milestone_key: string
          order_index: number
          required_document_category?:
            | Database["public"]["Enums"]["document_category"]
            | null
          template_id: string
          updated_at?: string
        }
        Update: {
          auto_offset_days?: number | null
          created_at?: string
          default_client_visible?: boolean
          id?: string
          label?: string
          milestone_key?: string
          order_index?: number
          required_document_category?:
            | Database["public"]["Enums"]["document_category"]
            | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "milestone_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_templates: {
        Row: {
          case_type: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          jurisdiction_county: string
          jurisdiction_state: string
          template_name: string
          updated_at: string
        }
        Insert: {
          case_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          jurisdiction_county?: string
          jurisdiction_state?: string
          template_name: string
          updated_at?: string
        }
        Update: {
          case_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          jurisdiction_county?: string
          jurisdiction_state?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          case_id: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          message: string | null
          read_at: string | null
          recipient_user_id: string
          status: Database["public"]["Enums"]["notification_status"]
          title: string
        }
        Insert: {
          case_id?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          message?: string | null
          read_at?: string | null
          recipient_user_id: string
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
        }
        Update: {
          case_id?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          message?: string | null
          read_at?: string | null
          recipient_user_id?: string
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          client_id: string
          county: string | null
          created_at: string
          id: string
          notes: string | null
          state: string
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city?: string
          client_id: string
          county?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          state?: string
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          client_id?: string
          county?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          state?: string
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      service_records: {
        Row: {
          affidavit_document_id: string | null
          case_id: string
          created_at: string
          id: string
          mailing_tracking_number: string | null
          notes: string | null
          notice_type: string | null
          served_by: string | null
          service_date: string | null
          service_method: Database["public"]["Enums"]["service_method"] | null
          service_time: string | null
          updated_at: string
        }
        Insert: {
          affidavit_document_id?: string | null
          case_id: string
          created_at?: string
          id?: string
          mailing_tracking_number?: string | null
          notes?: string | null
          notice_type?: string | null
          served_by?: string | null
          service_date?: string | null
          service_method?: Database["public"]["Enums"]["service_method"] | null
          service_time?: string | null
          updated_at?: string
        }
        Update: {
          affidavit_document_id?: string | null
          case_id?: string
          created_at?: string
          id?: string
          mailing_tracking_number?: string | null
          notes?: string | null
          notice_type?: string | null
          served_by?: string | null
          service_date?: string | null
          service_method?: Database["public"]["Enums"]["service_method"] | null
          service_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_records_affidavit_document_id_fkey"
            columns: ["affidavit_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_records_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value_json: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value_json?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value_json?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          mailing_address: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          mailing_address?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          mailing_address?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "client"
      case_priority: "low" | "normal" | "high"
      case_status:
        | "intake"
        | "notice_preparation"
        | "notice_served"
        | "waiting_period"
        | "ready_to_file"
        | "filed"
        | "court_scheduled"
        | "in_court_process"
        | "outcome_pending"
        | "resolved"
        | "closed"
        | "on_hold"
      court_event_type:
        | "hearing"
        | "adjournment"
        | "judgment"
        | "warrant"
        | "other"
      document_category:
        | "lease"
        | "rent_ledger"
        | "notice"
        | "proof_of_service"
        | "petition_filing"
        | "court_document"
        | "photo"
        | "correspondence"
        | "other"
      milestone_status: "pending" | "complete" | "overdue" | "skipped"
      note_type: "internal" | "client_update"
      notification_channel: "in_app" | "email"
      notification_status: "queued" | "sent" | "failed" | "read"
      service_method:
        | "personal"
        | "substituted"
        | "conspicuous_nail_mail"
        | "certified_mail"
        | "other"
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
      app_role: ["super_admin", "admin", "client"],
      case_priority: ["low", "normal", "high"],
      case_status: [
        "intake",
        "notice_preparation",
        "notice_served",
        "waiting_period",
        "ready_to_file",
        "filed",
        "court_scheduled",
        "in_court_process",
        "outcome_pending",
        "resolved",
        "closed",
        "on_hold",
      ],
      court_event_type: [
        "hearing",
        "adjournment",
        "judgment",
        "warrant",
        "other",
      ],
      document_category: [
        "lease",
        "rent_ledger",
        "notice",
        "proof_of_service",
        "petition_filing",
        "court_document",
        "photo",
        "correspondence",
        "other",
      ],
      milestone_status: ["pending", "complete", "overdue", "skipped"],
      note_type: ["internal", "client_update"],
      notification_channel: ["in_app", "email"],
      notification_status: ["queued", "sent", "failed", "read"],
      service_method: [
        "personal",
        "substituted",
        "conspicuous_nail_mail",
        "certified_mail",
        "other",
      ],
    },
  },
} as const
