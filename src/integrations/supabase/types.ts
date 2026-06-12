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
      case_counsel: {
        Row: {
          assigned_at: string
          case_id: string
          counsel_id: string
          created_at: string
          fee_arrangement: string | null
          id: string
          notes: string | null
          retainer_amount: number | null
          role: string
        }
        Insert: {
          assigned_at?: string
          case_id: string
          counsel_id: string
          created_at?: string
          fee_arrangement?: string | null
          id?: string
          notes?: string | null
          retainer_amount?: number | null
          role?: string
        }
        Update: {
          assigned_at?: string
          case_id?: string
          counsel_id?: string
          created_at?: string
          fee_arrangement?: string | null
          id?: string
          notes?: string | null
          retainer_amount?: number | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_counsel_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_counsel_counsel_id_fkey"
            columns: ["counsel_id"]
            isOneToOne: false
            referencedRelation: "counsel"
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
          eviction_reason: string
          eviction_reason_other: string | null
          hold_reason: string | null
          id: string
          is_on_hold: boolean
          jurisdiction_county: string
          jurisdiction_state: string
          military_verified: boolean
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
          eviction_reason?: string
          eviction_reason_other?: string | null
          hold_reason?: string | null
          id?: string
          is_on_hold?: boolean
          jurisdiction_county?: string
          jurisdiction_state?: string
          military_verified?: boolean
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
          eviction_reason?: string
          eviction_reason_other?: string | null
          hold_reason?: string | null
          id?: string
          is_on_hold?: boolean
          jurisdiction_county?: string
          jurisdiction_state?: string
          military_verified?: boolean
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
      collection_activities: {
        Row: {
          activity_at: string
          activity_type: Database["public"]["Enums"]["collection_activity_type"]
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          is_internal: boolean
          matter_id: string
        }
        Insert: {
          activity_at?: string
          activity_type?: Database["public"]["Enums"]["collection_activity_type"]
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_internal?: boolean
          matter_id: string
        }
        Update: {
          activity_at?: string
          activity_type?: Database["public"]["Enums"]["collection_activity_type"]
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_internal?: boolean
          matter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_activities_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "collection_matters"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_agencies: {
        Row: {
          address_line1: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          default_commission_pct: number | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          default_commission_pct?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          default_commission_pct?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      collection_matters: {
        Row: {
          agency_commission_pct: number | null
          agency_id: string | null
          agency_placed_at: string | null
          agency_recall_date: string | null
          agency_reference_number: string | null
          assignment_doc_reference: string | null
          attorney_fees: number | null
          case_id: string | null
          client_id: string
          closed_date: string | null
          closure_reason: string | null
          court_costs: number
          created_at: string
          created_by: string | null
          debtor_id: string
          demand_letter_sent_date: string | null
          description: string | null
          filing_fees: number | null
          id: string
          interest_end_date: string | null
          interest_paid_through: string | null
          interest_rate: number
          interest_start_date: string
          is_active: boolean
          judgment_date: string | null
          judgment_entered_date: string | null
          judgment_expiration_date: string | null
          judgment_renewal_date: string | null
          last_contact_date: string | null
          last_payment_date: string | null
          legal_fees: number
          matter_number: string | null
          next_action_date: string | null
          origin: Database["public"]["Enums"]["collection_origin"]
          original_account_number: string | null
          original_creditor: string | null
          other_fees: number | null
          placed_with_agency_date: string | null
          principal: number
          priority: string | null
          service_fees: number | null
          settlement_accepted: boolean | null
          settlement_offer_amount: number | null
          settlement_terms: string | null
          sol_expiration_date: string | null
          sol_state: string | null
          sold_at: string | null
          sold_price: number | null
          sold_to: string | null
          status: Database["public"]["Enums"]["collection_status"]
          tags: string[] | null
          updated_at: string
          validation_notice_sent_date: string | null
        }
        Insert: {
          agency_commission_pct?: number | null
          agency_id?: string | null
          agency_placed_at?: string | null
          agency_recall_date?: string | null
          agency_reference_number?: string | null
          assignment_doc_reference?: string | null
          attorney_fees?: number | null
          case_id?: string | null
          client_id: string
          closed_date?: string | null
          closure_reason?: string | null
          court_costs?: number
          created_at?: string
          created_by?: string | null
          debtor_id: string
          demand_letter_sent_date?: string | null
          description?: string | null
          filing_fees?: number | null
          id?: string
          interest_end_date?: string | null
          interest_paid_through?: string | null
          interest_rate?: number
          interest_start_date?: string
          is_active?: boolean
          judgment_date?: string | null
          judgment_entered_date?: string | null
          judgment_expiration_date?: string | null
          judgment_renewal_date?: string | null
          last_contact_date?: string | null
          last_payment_date?: string | null
          legal_fees?: number
          matter_number?: string | null
          next_action_date?: string | null
          origin?: Database["public"]["Enums"]["collection_origin"]
          original_account_number?: string | null
          original_creditor?: string | null
          other_fees?: number | null
          placed_with_agency_date?: string | null
          principal?: number
          priority?: string | null
          service_fees?: number | null
          settlement_accepted?: boolean | null
          settlement_offer_amount?: number | null
          settlement_terms?: string | null
          sol_expiration_date?: string | null
          sol_state?: string | null
          sold_at?: string | null
          sold_price?: number | null
          sold_to?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          tags?: string[] | null
          updated_at?: string
          validation_notice_sent_date?: string | null
        }
        Update: {
          agency_commission_pct?: number | null
          agency_id?: string | null
          agency_placed_at?: string | null
          agency_recall_date?: string | null
          agency_reference_number?: string | null
          assignment_doc_reference?: string | null
          attorney_fees?: number | null
          case_id?: string | null
          client_id?: string
          closed_date?: string | null
          closure_reason?: string | null
          court_costs?: number
          created_at?: string
          created_by?: string | null
          debtor_id?: string
          demand_letter_sent_date?: string | null
          description?: string | null
          filing_fees?: number | null
          id?: string
          interest_end_date?: string | null
          interest_paid_through?: string | null
          interest_rate?: number
          interest_start_date?: string
          is_active?: boolean
          judgment_date?: string | null
          judgment_entered_date?: string | null
          judgment_expiration_date?: string | null
          judgment_renewal_date?: string | null
          last_contact_date?: string | null
          last_payment_date?: string | null
          legal_fees?: number
          matter_number?: string | null
          next_action_date?: string | null
          origin?: Database["public"]["Enums"]["collection_origin"]
          original_account_number?: string | null
          original_creditor?: string | null
          other_fees?: number | null
          placed_with_agency_date?: string | null
          principal?: number
          priority?: string | null
          service_fees?: number | null
          settlement_accepted?: boolean | null
          settlement_offer_amount?: number | null
          settlement_terms?: string | null
          sol_expiration_date?: string | null
          sol_state?: string | null
          sold_at?: string | null
          sold_price?: number | null
          sold_to?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          tags?: string[] | null
          updated_at?: string
          validation_notice_sent_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_matters_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "collection_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_matters_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_matters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_matters_debtor_id_fkey"
            columns: ["debtor_id"]
            isOneToOne: false
            referencedRelation: "debtors"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          matter_id: string
          notes: string | null
          payment_date: string
          payment_type: Database["public"]["Enums"]["collection_payment_type"]
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          matter_id: string
          notes?: string | null
          payment_date?: string
          payment_type?: Database["public"]["Enums"]["collection_payment_type"]
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          matter_id?: string
          notes?: string | null
          payment_date?: string
          payment_type?: Database["public"]["Enums"]["collection_payment_type"]
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_payments_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "collection_matters"
            referencedColumns: ["id"]
          },
        ]
      }
      counsel: {
        Row: {
          address: string | null
          attorney_name: string
          bar_number: string | null
          created_at: string
          email: string | null
          firm_name: string | null
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          attorney_name: string
          bar_number?: string | null
          created_at?: string
          email?: string | null
          firm_name?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          attorney_name?: string
          bar_number?: string | null
          created_at?: string
          email?: string | null
          firm_name?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
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
      debtors: {
        Row: {
          address_line1: string | null
          alias: string | null
          assets: Json | null
          bank_account_last4: string | null
          bank_account_type: string | null
          bank_branch: string | null
          bank_name: string | null
          bankruptcy_case_number: string | null
          bankruptcy_chapter: string | null
          bankruptcy_filed: boolean | null
          cease_and_desist: boolean | null
          cease_and_desist_date: string | null
          city: string | null
          client_id: string
          co_debtors: Json | null
          company_name: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          dba: string | null
          debtor_attorney_name: string | null
          debtor_attorney_phone: string | null
          debtor_type: Database["public"]["Enums"]["debtor_type"]
          dl_state: string | null
          dob: string | null
          drivers_license: string | null
          ein_last4: string | null
          email: string | null
          email_secondary: string | null
          employer_address: string | null
          employer_name: string | null
          employer_phone: string | null
          est_wages: number | null
          forwarding_address: string | null
          full_name: string
          id: string
          is_active_military: boolean | null
          job_title: string | null
          mailing_address: string | null
          notes: string | null
          pay_frequency: string | null
          phone: string | null
          phone_secondary: string | null
          represented_by_attorney: boolean | null
          skip_trace_date: string | null
          skip_trace_source: string | null
          skip_trace_status: string | null
          ssn_last4: string | null
          state: string | null
          tenant_id: string | null
          updated_at: string
          wages_period: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          alias?: string | null
          assets?: Json | null
          bank_account_last4?: string | null
          bank_account_type?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bankruptcy_case_number?: string | null
          bankruptcy_chapter?: string | null
          bankruptcy_filed?: boolean | null
          cease_and_desist?: boolean | null
          cease_and_desist_date?: string | null
          city?: string | null
          client_id: string
          co_debtors?: Json | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          dba?: string | null
          debtor_attorney_name?: string | null
          debtor_attorney_phone?: string | null
          debtor_type?: Database["public"]["Enums"]["debtor_type"]
          dl_state?: string | null
          dob?: string | null
          drivers_license?: string | null
          ein_last4?: string | null
          email?: string | null
          email_secondary?: string | null
          employer_address?: string | null
          employer_name?: string | null
          employer_phone?: string | null
          est_wages?: number | null
          forwarding_address?: string | null
          full_name: string
          id?: string
          is_active_military?: boolean | null
          job_title?: string | null
          mailing_address?: string | null
          notes?: string | null
          pay_frequency?: string | null
          phone?: string | null
          phone_secondary?: string | null
          represented_by_attorney?: boolean | null
          skip_trace_date?: string | null
          skip_trace_source?: string | null
          skip_trace_status?: string | null
          ssn_last4?: string | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string
          wages_period?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          alias?: string | null
          assets?: Json | null
          bank_account_last4?: string | null
          bank_account_type?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bankruptcy_case_number?: string | null
          bankruptcy_chapter?: string | null
          bankruptcy_filed?: boolean | null
          cease_and_desist?: boolean | null
          cease_and_desist_date?: string | null
          city?: string | null
          client_id?: string
          co_debtors?: Json | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          dba?: string | null
          debtor_attorney_name?: string | null
          debtor_attorney_phone?: string | null
          debtor_type?: Database["public"]["Enums"]["debtor_type"]
          dl_state?: string | null
          dob?: string | null
          drivers_license?: string | null
          ein_last4?: string | null
          email?: string | null
          email_secondary?: string | null
          employer_address?: string | null
          employer_name?: string | null
          employer_phone?: string | null
          est_wages?: number | null
          forwarding_address?: string | null
          full_name?: string
          id?: string
          is_active_military?: boolean | null
          job_title?: string | null
          mailing_address?: string | null
          notes?: string | null
          pay_frequency?: string | null
          phone?: string | null
          phone_secondary?: string | null
          represented_by_attorney?: boolean | null
          skip_trace_date?: string | null
          skip_trace_source?: string | null
          skip_trace_status?: string | null
          ssn_last4?: string | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string
          wages_period?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debtors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debtors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string | null
          category: Database["public"]["Enums"]["document_category"]
          collection_matter_id: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_internal: boolean | null
          mime_type: string | null
          updated_at: string
          uploaded_by: string | null
          version_number: number
          visible_to_client: boolean
        }
        Insert: {
          case_id?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          collection_matter_id?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_internal?: boolean | null
          mime_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version_number?: number
          visible_to_client?: boolean
        }
        Update: {
          case_id?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          collection_matter_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_internal?: boolean | null
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
            foreignKeyName: "documents_collection_matter_id_fkey"
            columns: ["collection_matter_id"]
            isOneToOne: false
            referencedRelation: "collection_matters"
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
      enforcement_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["enforcement_type"]
          amount: number | null
          created_at: string
          created_by: string | null
          filed_date: string | null
          id: string
          matter_id: string
          notes: string | null
          reference: string | null
          served_date: string | null
          status: Database["public"]["Enums"]["enforcement_status"]
          target_address: string | null
          target_name: string | null
          updated_at: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["enforcement_type"]
          amount?: number | null
          created_at?: string
          created_by?: string | null
          filed_date?: string | null
          id?: string
          matter_id: string
          notes?: string | null
          reference?: string | null
          served_date?: string | null
          status?: Database["public"]["Enums"]["enforcement_status"]
          target_address?: string | null
          target_name?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["enforcement_type"]
          amount?: number | null
          created_at?: string
          created_by?: string | null
          filed_date?: string | null
          id?: string
          matter_id?: string
          notes?: string | null
          reference?: string | null
          served_date?: string | null
          status?: Database["public"]["Enums"]["enforcement_status"]
          target_address?: string | null
          target_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enforcement_actions_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "collection_matters"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount: number
          case_id: string
          charge_type: string
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          case_id: string
          charge_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          case_id?: string
          charge_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_created_by_fkey"
            columns: ["created_by"]
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
      payment_plans: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          frequency: Database["public"]["Enums"]["payment_frequency"]
          id: string
          installment_amount: number
          installment_count: number
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["payment_plan_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          frequency?: Database["public"]["Enums"]["payment_frequency"]
          id?: string
          installment_amount: number
          installment_count: number
          notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["payment_plan_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          frequency?: Database["public"]["Enums"]["payment_frequency"]
          id?: string
          installment_amount?: number
          installment_count?: number
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["payment_plan_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
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
      scheduled_payments: {
        Row: {
          amount_due: number
          amount_paid: number
          case_id: string
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          method: string | null
          notes: string | null
          paid_date: string | null
          payment_plan_id: string | null
          status: Database["public"]["Enums"]["scheduled_payment_status"]
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          case_id: string
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_plan_id?: string | null
          status?: Database["public"]["Enums"]["scheduled_payment_status"]
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          case_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_plan_id?: string | null
          status?: Database["public"]["Enums"]["scheduled_payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_payments_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
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
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          full_name: string
          id: string
          last_name: string | null
          mailing_address: string | null
          notes: string | null
          phone: string | null
          ssn_last4: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          last_name?: string | null
          mailing_address?: string | null
          notes?: string | null
          phone?: string | null
          ssn_last4?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          last_name?: string | null
          mailing_address?: string | null
          notes?: string | null
          phone?: string | null
          ssn_last4?: string | null
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
      collection_matter_balance: {
        Args: { _matter_id: string }
        Returns: {
          accrued_interest: number
          balance_due: number
          court_costs: number
          legal_fees: number
          payments_total: number
          principal: number
          write_offs_total: number
        }[]
      }
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
      collection_activity_type:
        | "note"
        | "call"
        | "letter"
        | "email"
        | "demand"
        | "payment_received"
        | "agency_placement"
        | "judgment_sale"
        | "enforcement"
        | "status_change"
        | "other"
      collection_origin:
        | "money_judgment"
        | "case_closed_balance"
        | "skip_tenant"
        | "manual"
        | "vendor_debt"
      collection_payment_type:
        | "payment"
        | "adjustment"
        | "write_off"
        | "commission"
        | "court_cost_recovery"
        | "interest_adjustment"
      collection_status:
        | "open"
        | "in_house"
        | "placed_with_agency"
        | "judgment_sold"
        | "in_enforcement"
        | "settled"
        | "written_off"
        | "paid"
      court_event_type:
        | "hearing"
        | "adjournment"
        | "judgment"
        | "warrant"
        | "other"
      debtor_type:
        | "tenant"
        | "contractor"
        | "vendor"
        | "process_server"
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
      enforcement_status:
        | "drafted"
        | "filed"
        | "served"
        | "active"
        | "satisfied"
        | "released"
        | "closed"
      enforcement_type:
        | "wage_garnishment"
        | "bank_levy"
        | "property_lien"
        | "income_execution"
        | "restraining_notice"
        | "other"
      milestone_status: "pending" | "complete" | "overdue" | "skipped"
      note_type: "internal" | "client_update"
      notification_channel: "in_app" | "email"
      notification_status: "queued" | "sent" | "failed" | "read"
      payment_frequency: "weekly" | "biweekly" | "monthly"
      payment_plan_status: "active" | "completed" | "cancelled" | "defaulted"
      scheduled_payment_status:
        | "scheduled"
        | "paid"
        | "partial"
        | "missed"
        | "cancelled"
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
      collection_activity_type: [
        "note",
        "call",
        "letter",
        "email",
        "demand",
        "payment_received",
        "agency_placement",
        "judgment_sale",
        "enforcement",
        "status_change",
        "other",
      ],
      collection_origin: [
        "money_judgment",
        "case_closed_balance",
        "skip_tenant",
        "manual",
        "vendor_debt",
      ],
      collection_payment_type: [
        "payment",
        "adjustment",
        "write_off",
        "commission",
        "court_cost_recovery",
        "interest_adjustment",
      ],
      collection_status: [
        "open",
        "in_house",
        "placed_with_agency",
        "judgment_sold",
        "in_enforcement",
        "settled",
        "written_off",
        "paid",
      ],
      court_event_type: [
        "hearing",
        "adjournment",
        "judgment",
        "warrant",
        "other",
      ],
      debtor_type: [
        "tenant",
        "contractor",
        "vendor",
        "process_server",
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
      enforcement_status: [
        "drafted",
        "filed",
        "served",
        "active",
        "satisfied",
        "released",
        "closed",
      ],
      enforcement_type: [
        "wage_garnishment",
        "bank_levy",
        "property_lien",
        "income_execution",
        "restraining_notice",
        "other",
      ],
      milestone_status: ["pending", "complete", "overdue", "skipped"],
      note_type: ["internal", "client_update"],
      notification_channel: ["in_app", "email"],
      notification_status: ["queued", "sent", "failed", "read"],
      payment_frequency: ["weekly", "biweekly", "monthly"],
      payment_plan_status: ["active", "completed", "cancelled", "defaulted"],
      scheduled_payment_status: [
        "scheduled",
        "paid",
        "partial",
        "missed",
        "cancelled",
      ],
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
