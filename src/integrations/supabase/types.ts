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
      attorney_referral_transition_rules: {
        Row: {
          allowed_roles: string[]
          completes_task_types: string[]
          created_at: string
          creates_task_json: Json | null
          description: string | null
          event_key: string
          from_status: Database["public"]["Enums"]["attorney_referral_status"]
          id: string
          is_active: boolean
          label: string
          order_index: number
          requires_named_attorney: boolean
          requires_packet: boolean
          requires_reason: boolean
          to_status: Database["public"]["Enums"]["attorney_referral_status"]
          transition_key: string
          updated_at: string
        }
        Insert: {
          allowed_roles?: string[]
          completes_task_types?: string[]
          created_at?: string
          creates_task_json?: Json | null
          description?: string | null
          event_key: string
          from_status: Database["public"]["Enums"]["attorney_referral_status"]
          id?: string
          is_active?: boolean
          label: string
          order_index?: number
          requires_named_attorney?: boolean
          requires_packet?: boolean
          requires_reason?: boolean
          to_status: Database["public"]["Enums"]["attorney_referral_status"]
          transition_key: string
          updated_at?: string
        }
        Update: {
          allowed_roles?: string[]
          completes_task_types?: string[]
          created_at?: string
          creates_task_json?: Json | null
          description?: string | null
          event_key?: string
          from_status?: Database["public"]["Enums"]["attorney_referral_status"]
          id?: string
          is_active?: boolean
          label?: string
          order_index?: number
          requires_named_attorney?: boolean
          requires_packet?: boolean
          requires_reason?: boolean
          to_status?: Database["public"]["Enums"]["attorney_referral_status"]
          transition_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      attorney_referral_transitions: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          case_id: string
          created_at: string
          from_status:
            | Database["public"]["Enums"]["attorney_referral_status"]
            | null
          id: string
          idempotency_key: string | null
          metadata: Json
          reason: string | null
          referral_id: string
          to_status: Database["public"]["Enums"]["attorney_referral_status"]
          transition_key: string
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          case_id: string
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["attorney_referral_status"]
            | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          reason?: string | null
          referral_id: string
          to_status: Database["public"]["Enums"]["attorney_referral_status"]
          transition_key: string
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          case_id?: string
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["attorney_referral_status"]
            | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          reason?: string | null
          referral_id?: string
          to_status?: Database["public"]["Enums"]["attorney_referral_status"]
          transition_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "attorney_referral_transitions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attorney_referral_transitions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "attorney_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      attorney_referrals: {
        Row: {
          attorney_id: string | null
          case_id: string
          client_visible_status: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decline_reason: string | null
          fee_arrangement: string | null
          firm_id: string | null
          id: string
          idempotency_key: string | null
          referral_packet_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["attorney_referral_status"]
          updated_at: string
          withdrawal_reason: string | null
        }
        Insert: {
          attorney_id?: string | null
          case_id: string
          client_visible_status?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decline_reason?: string | null
          fee_arrangement?: string | null
          firm_id?: string | null
          id?: string
          idempotency_key?: string | null
          referral_packet_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["attorney_referral_status"]
          updated_at?: string
          withdrawal_reason?: string | null
        }
        Update: {
          attorney_id?: string | null
          case_id?: string
          client_visible_status?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decline_reason?: string | null
          fee_arrangement?: string | null
          firm_id?: string | null
          id?: string
          idempotency_key?: string | null
          referral_packet_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["attorney_referral_status"]
          updated_at?: string
          withdrawal_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attorney_referrals_attorney_id_fkey"
            columns: ["attorney_id"]
            isOneToOne: false
            referencedRelation: "counsel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attorney_referrals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attorney_referrals_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attorney_referrals_referral_packet_id_fkey"
            columns: ["referral_packet_id"]
            isOneToOne: false
            referencedRelation: "referral_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_snapshots: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          snapshot_date: string
          snapshot_type: Database["public"]["Enums"]["balance_snapshot_type"]
          source_entry_ids: Json
          source_ledger_version: string | null
          total_balance: number
          total_charges: number
          total_credits: number
          total_payments: number
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          snapshot_date?: string
          snapshot_type: Database["public"]["Enums"]["balance_snapshot_type"]
          source_entry_ids?: Json
          source_ledger_version?: string | null
          total_balance?: number
          total_charges?: number
          total_credits?: number
          total_payments?: number
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          snapshot_date?: string
          snapshot_type?: Database["public"]["Enums"]["balance_snapshot_type"]
          source_entry_ids?: Json
          source_ledger_version?: string | null
          total_balance?: number
          total_charges?: number
          total_credits?: number
          total_payments?: number
        }
        Relationships: [
          {
            foreignKeyName: "balance_snapshots_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
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
          firm_id: string | null
          id: string
          notes: string | null
          retainer_amount: number | null
          role: string
          scope: Database["public"]["Enums"]["assignment_scope"]
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          case_id: string
          counsel_id: string
          created_at?: string
          fee_arrangement?: string | null
          firm_id?: string | null
          id?: string
          notes?: string | null
          retainer_amount?: number | null
          role?: string
          scope?: Database["public"]["Enums"]["assignment_scope"]
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          case_id?: string
          counsel_id?: string
          created_at?: string
          fee_arrangement?: string | null
          firm_id?: string | null
          id?: string
          notes?: string | null
          retainer_amount?: number | null
          role?: string
          scope?: Database["public"]["Enums"]["assignment_scope"]
          unassigned_at?: string | null
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
          {
            foreignKeyName: "case_counsel_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
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
          author_counsel_id: string | null
          case_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          note_type: Database["public"]["Enums"]["note_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["note_visibility"]
        }
        Insert: {
          author_counsel_id?: string | null
          case_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_type?: Database["public"]["Enums"]["note_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Update: {
          author_counsel_id?: string | null
          case_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_type?: Database["public"]["Enums"]["note_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_author_counsel_id_fkey"
            columns: ["author_counsel_id"]
            isOneToOne: false
            referencedRelation: "counsel"
            referencedColumns: ["id"]
          },
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
          confirmation_notes: string | null
          confirmed_eligible_to_file_date: string | null
          court_address: string | null
          court_case_number: string | null
          court_name: string | null
          created_at: string
          current_balance: number | null
          eligibility_confirmed_at: string | null
          eligibility_confirmed_by: string | null
          eviction_reason: string
          eviction_reason_other: string | null
          first_unpaid_month: string | null
          hold_reason: string | null
          id: string
          intake_step: number | null
          is_on_hold: boolean
          jurisdiction_county: string
          jurisdiction_state: string
          last_payment_date: string | null
          lq_attorney_retained: boolean | null
          lq_collection_agency_involved: boolean | null
          lq_current_occupant: boolean | null
          lq_judgment_exists: boolean | null
          lq_known_bankruptcy: boolean | null
          lq_military_verified: boolean | null
          lq_notes: string | null
          lq_tenant_moved: boolean | null
          matter_type: Database["public"]["Enums"]["matter_type"] | null
          military_verified: boolean
          opened_date: string
          primary_tenant_id: string | null
          priority: Database["public"]["Enums"]["case_priority"]
          property_id: string | null
          proposed_eligible_to_file_date: string | null
          status: Database["public"]["Enums"]["case_status"]
          sub_status: string | null
          submitted_at: string | null
          submitted_by: string | null
          tenancy_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_admin_id?: string | null
          case_number?: string
          case_type?: string
          client_id: string
          closed_date?: string | null
          confirmation_notes?: string | null
          confirmed_eligible_to_file_date?: string | null
          court_address?: string | null
          court_case_number?: string | null
          court_name?: string | null
          created_at?: string
          current_balance?: number | null
          eligibility_confirmed_at?: string | null
          eligibility_confirmed_by?: string | null
          eviction_reason?: string
          eviction_reason_other?: string | null
          first_unpaid_month?: string | null
          hold_reason?: string | null
          id?: string
          intake_step?: number | null
          is_on_hold?: boolean
          jurisdiction_county?: string
          jurisdiction_state?: string
          last_payment_date?: string | null
          lq_attorney_retained?: boolean | null
          lq_collection_agency_involved?: boolean | null
          lq_current_occupant?: boolean | null
          lq_judgment_exists?: boolean | null
          lq_known_bankruptcy?: boolean | null
          lq_military_verified?: boolean | null
          lq_notes?: string | null
          lq_tenant_moved?: boolean | null
          matter_type?: Database["public"]["Enums"]["matter_type"] | null
          military_verified?: boolean
          opened_date?: string
          primary_tenant_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          property_id?: string | null
          proposed_eligible_to_file_date?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          sub_status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          tenancy_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_admin_id?: string | null
          case_number?: string
          case_type?: string
          client_id?: string
          closed_date?: string | null
          confirmation_notes?: string | null
          confirmed_eligible_to_file_date?: string | null
          court_address?: string | null
          court_case_number?: string | null
          court_name?: string | null
          created_at?: string
          current_balance?: number | null
          eligibility_confirmed_at?: string | null
          eligibility_confirmed_by?: string | null
          eviction_reason?: string
          eviction_reason_other?: string | null
          first_unpaid_month?: string | null
          hold_reason?: string | null
          id?: string
          intake_step?: number | null
          is_on_hold?: boolean
          jurisdiction_county?: string
          jurisdiction_state?: string
          last_payment_date?: string | null
          lq_attorney_retained?: boolean | null
          lq_collection_agency_involved?: boolean | null
          lq_current_occupant?: boolean | null
          lq_judgment_exists?: boolean | null
          lq_known_bankruptcy?: boolean | null
          lq_military_verified?: boolean | null
          lq_notes?: string | null
          lq_tenant_moved?: boolean | null
          matter_type?: Database["public"]["Enums"]["matter_type"] | null
          military_verified?: boolean
          opened_date?: string
          primary_tenant_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          property_id?: string | null
          proposed_eligible_to_file_date?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          sub_status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          tenancy_id?: string | null
          unit_id?: string | null
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
          {
            foreignKeyName: "cases_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
          activated_at: string | null
          activation_acknowledged_at: string | null
          activation_terms_version: string | null
          address: string | null
          attorney_name: string
          bar_jurisdictions: string[]
          bar_number: string | null
          created_at: string
          email: string | null
          firm_id: string | null
          firm_name: string | null
          id: string
          invited_at: string | null
          is_active: boolean
          is_firm_admin: boolean
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["attorney_status"]
          updated_at: string
          user_id: string | null
          user_linked_at: string | null
        }
        Insert: {
          activated_at?: string | null
          activation_acknowledged_at?: string | null
          activation_terms_version?: string | null
          address?: string | null
          attorney_name: string
          bar_jurisdictions?: string[]
          bar_number?: string | null
          created_at?: string
          email?: string | null
          firm_id?: string | null
          firm_name?: string | null
          id?: string
          invited_at?: string | null
          is_active?: boolean
          is_firm_admin?: boolean
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["attorney_status"]
          updated_at?: string
          user_id?: string | null
          user_linked_at?: string | null
        }
        Update: {
          activated_at?: string | null
          activation_acknowledged_at?: string | null
          activation_terms_version?: string | null
          address?: string | null
          attorney_name?: string
          bar_jurisdictions?: string[]
          bar_number?: string | null
          created_at?: string
          email?: string | null
          firm_id?: string | null
          firm_name?: string | null
          id?: string
          invited_at?: string | null
          is_active?: boolean
          is_firm_admin?: boolean
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["attorney_status"]
          updated_at?: string
          user_id?: string | null
          user_linked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counsel_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
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
      filing_approvals: {
        Row: {
          approval_notes: string | null
          approval_status: Database["public"]["Enums"]["filing_approval_status"]
          approved_at: string | null
          attorney_id: string | null
          balance_snapshot_id: string | null
          case_id: string
          created_at: string
          created_by: string | null
          eligibility_confirmation_id: string | null
          id: string
          idempotency_key: string | null
          invalidated_at: string | null
          invalidated_by_change_event_id: string | null
          invalidation_reason: string | null
          lease_document_id: string | null
          notice_manifest: Json
          packet_manifest: Json
          questionnaire_snapshot: Json
          referral_id: string | null
          referral_packet_id: string | null
          service_manifest: Json
          superseded_by_approval_id: string | null
          supersedes_approval_id: string | null
          updated_at: string
          version_number: number
          withdrawal_reason: string | null
          withdrawn_at: string | null
          withdrawn_by: string | null
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["filing_approval_status"]
          approved_at?: string | null
          attorney_id?: string | null
          balance_snapshot_id?: string | null
          case_id: string
          created_at?: string
          created_by?: string | null
          eligibility_confirmation_id?: string | null
          id?: string
          idempotency_key?: string | null
          invalidated_at?: string | null
          invalidated_by_change_event_id?: string | null
          invalidation_reason?: string | null
          lease_document_id?: string | null
          notice_manifest?: Json
          packet_manifest?: Json
          questionnaire_snapshot?: Json
          referral_id?: string | null
          referral_packet_id?: string | null
          service_manifest?: Json
          superseded_by_approval_id?: string | null
          supersedes_approval_id?: string | null
          updated_at?: string
          version_number?: number
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Update: {
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["filing_approval_status"]
          approved_at?: string | null
          attorney_id?: string | null
          balance_snapshot_id?: string | null
          case_id?: string
          created_at?: string
          created_by?: string | null
          eligibility_confirmation_id?: string | null
          id?: string
          idempotency_key?: string | null
          invalidated_at?: string | null
          invalidated_by_change_event_id?: string | null
          invalidation_reason?: string | null
          lease_document_id?: string | null
          notice_manifest?: Json
          packet_manifest?: Json
          questionnaire_snapshot?: Json
          referral_id?: string | null
          referral_packet_id?: string | null
          service_manifest?: Json
          superseded_by_approval_id?: string | null
          supersedes_approval_id?: string | null
          updated_at?: string
          version_number?: number
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filing_approvals_attorney_id_fkey"
            columns: ["attorney_id"]
            isOneToOne: false
            referencedRelation: "counsel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_approvals_balance_snapshot_id_fkey"
            columns: ["balance_snapshot_id"]
            isOneToOne: false
            referencedRelation: "balance_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_approvals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_approvals_eligibility_confirmation_id_fkey"
            columns: ["eligibility_confirmation_id"]
            isOneToOne: false
            referencedRelation: "filing_eligibility_confirmations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_approvals_invalidated_by_change_event_id_fkey"
            columns: ["invalidated_by_change_event_id"]
            isOneToOne: false
            referencedRelation: "matter_change_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_approvals_lease_document_id_fkey"
            columns: ["lease_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_approvals_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "attorney_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_approvals_referral_packet_id_fkey"
            columns: ["referral_packet_id"]
            isOneToOne: false
            referencedRelation: "referral_packets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_approvals_superseded_by_approval_id_fkey"
            columns: ["superseded_by_approval_id"]
            isOneToOne: false
            referencedRelation: "filing_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_approvals_supersedes_approval_id_fkey"
            columns: ["supersedes_approval_id"]
            isOneToOne: false
            referencedRelation: "filing_approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      filing_eligibility_confirmations: {
        Row: {
          active_hold_snapshot: Json
          attorney_id: string | null
          balance_snapshot_id: string | null
          blocking_request_count: number
          case_id: string
          confirmation_notes: string
          confirmed_at: string
          confirmed_eligible_to_file_date: string
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          invalidated_at: string | null
          invalidated_by_change_event_id: string | null
          invalidation_reason: string | null
          lease_document_id: string | null
          notice_manifest: Json
          proposed_eligible_to_file_date: string | null
          questionnaire_snapshot: Json
          referral_id: string | null
          referral_packet_id: string | null
          service_manifest: Json
          status: Database["public"]["Enums"]["eligibility_confirmation_status"]
          superseded_by_confirmation_id: string | null
          supersedes_confirmation_id: string | null
          updated_at: string
          version_number: number
        }
        Insert: {
          active_hold_snapshot?: Json
          attorney_id?: string | null
          balance_snapshot_id?: string | null
          blocking_request_count?: number
          case_id: string
          confirmation_notes: string
          confirmed_at?: string
          confirmed_eligible_to_file_date: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          invalidated_at?: string | null
          invalidated_by_change_event_id?: string | null
          invalidation_reason?: string | null
          lease_document_id?: string | null
          notice_manifest?: Json
          proposed_eligible_to_file_date?: string | null
          questionnaire_snapshot?: Json
          referral_id?: string | null
          referral_packet_id?: string | null
          service_manifest?: Json
          status?: Database["public"]["Enums"]["eligibility_confirmation_status"]
          superseded_by_confirmation_id?: string | null
          supersedes_confirmation_id?: string | null
          updated_at?: string
          version_number?: number
        }
        Update: {
          active_hold_snapshot?: Json
          attorney_id?: string | null
          balance_snapshot_id?: string | null
          blocking_request_count?: number
          case_id?: string
          confirmation_notes?: string
          confirmed_at?: string
          confirmed_eligible_to_file_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          invalidated_at?: string | null
          invalidated_by_change_event_id?: string | null
          invalidation_reason?: string | null
          lease_document_id?: string | null
          notice_manifest?: Json
          proposed_eligible_to_file_date?: string | null
          questionnaire_snapshot?: Json
          referral_id?: string | null
          referral_packet_id?: string | null
          service_manifest?: Json
          status?: Database["public"]["Enums"]["eligibility_confirmation_status"]
          superseded_by_confirmation_id?: string | null
          supersedes_confirmation_id?: string | null
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "filing_eligibility_confirmati_invalidated_by_change_event__fkey"
            columns: ["invalidated_by_change_event_id"]
            isOneToOne: false
            referencedRelation: "matter_change_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_eligibility_confirmati_superseded_by_confirmation_i_fkey"
            columns: ["superseded_by_confirmation_id"]
            isOneToOne: false
            referencedRelation: "filing_eligibility_confirmations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_eligibility_confirmation_supersedes_confirmation_id_fkey"
            columns: ["supersedes_confirmation_id"]
            isOneToOne: false
            referencedRelation: "filing_eligibility_confirmations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_eligibility_confirmations_attorney_id_fkey"
            columns: ["attorney_id"]
            isOneToOne: false
            referencedRelation: "counsel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_eligibility_confirmations_balance_snapshot_id_fkey"
            columns: ["balance_snapshot_id"]
            isOneToOne: false
            referencedRelation: "balance_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_eligibility_confirmations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_eligibility_confirmations_lease_document_id_fkey"
            columns: ["lease_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_eligibility_confirmations_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "attorney_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_eligibility_confirmations_referral_packet_id_fkey"
            columns: ["referral_packet_id"]
            isOneToOne: false
            referencedRelation: "referral_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_members: {
        Row: {
          counsel_id: string
          created_at: string
          firm_id: string
          id: string
          member_role: Database["public"]["Enums"]["firm_member_role"]
          updated_at: string
        }
        Insert: {
          counsel_id: string
          created_at?: string
          firm_id: string
          id?: string
          member_role?: Database["public"]["Enums"]["firm_member_role"]
          updated_at?: string
        }
        Update: {
          counsel_id?: string
          created_at?: string
          firm_id?: string
          id?: string
          member_role?: Database["public"]["Enums"]["firm_member_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_members_counsel_id_fkey"
            columns: ["counsel_id"]
            isOneToOne: false
            referencedRelation: "counsel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_members_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          jurisdictions: string[]
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          jurisdictions?: string[]
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          jurisdictions?: string[]
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      information_request_responses: {
        Row: {
          case_id: string
          created_at: string
          document_ids: string[]
          id: string
          idempotency_key: string | null
          is_revision: boolean
          request_id: string
          responded_by: string | null
          responder_role: string | null
          response_text: string
        }
        Insert: {
          case_id: string
          created_at?: string
          document_ids?: string[]
          id?: string
          idempotency_key?: string | null
          is_revision?: boolean
          request_id: string
          responded_by?: string | null
          responder_role?: string | null
          response_text: string
        }
        Update: {
          case_id?: string
          created_at?: string
          document_ids?: string[]
          id?: string
          idempotency_key?: string | null
          is_revision?: boolean
          request_id?: string
          responded_by?: string | null
          responder_role?: string | null
          response_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "information_request_responses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "information_request_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "information_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      information_requests: {
        Row: {
          assigned_role: string | null
          assigned_user_id: string | null
          blocking: boolean
          case_id: string
          category: string
          created_at: string
          description: string
          due_at: string | null
          id: string
          referral_id: string | null
          related_record_id: string | null
          related_record_type: string | null
          requested_by: string | null
          requested_by_counsel_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          responded_at: string | null
          responded_by: string | null
          response_text: string | null
          status: Database["public"]["Enums"]["information_request_status"]
          task_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_role?: string | null
          assigned_user_id?: string | null
          blocking?: boolean
          case_id: string
          category?: string
          created_at?: string
          description: string
          due_at?: string | null
          id?: string
          referral_id?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          requested_by?: string | null
          requested_by_counsel_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_text?: string | null
          status?: Database["public"]["Enums"]["information_request_status"]
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_role?: string | null
          assigned_user_id?: string | null
          blocking?: boolean
          case_id?: string
          category?: string
          created_at?: string
          description?: string
          due_at?: string | null
          id?: string
          referral_id?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          requested_by?: string | null
          requested_by_counsel_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_text?: string | null
          status?: Database["public"]["Enums"]["information_request_status"]
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "information_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "information_requests_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "attorney_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "information_requests_requested_by_counsel_id_fkey"
            columns: ["requested_by_counsel_id"]
            isOneToOne: false
            referencedRelation: "counsel"
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
          credit_amount: number
          description: string | null
          entry_date: string
          id: string
          payment_amount: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number
          case_id: string
          charge_type?: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          description?: string | null
          entry_date?: string
          id?: string
          payment_amount?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          case_id?: string
          charge_type?: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          description?: string | null
          entry_date?: string
          id?: string
          payment_amount?: number
          sort_order?: number
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
      matter_change_events: {
        Row: {
          case_id: string
          change_class: Database["public"]["Enums"]["matter_change_class"]
          change_key: string
          created_at: string
          created_by: string | null
          detail: string | null
          id: string
          invalidated_approval: boolean
          metadata: Json
          packet_id: string | null
        }
        Insert: {
          case_id: string
          change_class: Database["public"]["Enums"]["matter_change_class"]
          change_key: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          invalidated_approval?: boolean
          metadata?: Json
          packet_id?: string | null
        }
        Update: {
          case_id?: string
          change_class?: Database["public"]["Enums"]["matter_change_class"]
          change_key?: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          invalidated_approval?: boolean
          metadata?: Json
          packet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matter_change_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matter_change_events_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "referral_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_change_rules: {
        Row: {
          change_class: Database["public"]["Enums"]["matter_change_class"]
          change_key: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          change_class: Database["public"]["Enums"]["matter_change_class"]
          change_key: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          change_class?: Database["public"]["Enums"]["matter_change_class"]
          change_key?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      matter_events: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          detail: string | null
          event_key: string
          id: string
          is_internal: boolean
          label: string
          metadata: Json | null
          occurred_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          event_key: string
          id?: string
          is_internal?: boolean
          label: string
          metadata?: Json | null
          occurred_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          event_key?: string
          id?: string
          is_internal?: boolean
          label?: string
          metadata?: Json | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matter_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_holds: {
        Row: {
          case_id: string
          created_at: string
          held_from_status: Database["public"]["Enums"]["case_status"] | null
          hold_type: Database["public"]["Enums"]["matter_hold_type"]
          id: string
          opened_by: string | null
          owner_user_id: string | null
          reason: string | null
          release_reason: string | null
          released_at: string | null
          released_by: string | null
          review_date: string | null
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          held_from_status?: Database["public"]["Enums"]["case_status"] | null
          hold_type: Database["public"]["Enums"]["matter_hold_type"]
          id?: string
          opened_by?: string | null
          owner_user_id?: string | null
          reason?: string | null
          release_reason?: string | null
          released_at?: string | null
          released_by?: string | null
          review_date?: string | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          held_from_status?: Database["public"]["Enums"]["case_status"] | null
          hold_type?: Database["public"]["Enums"]["matter_hold_type"]
          id?: string
          opened_by?: string | null
          owner_user_id?: string | null
          reason?: string | null
          release_reason?: string | null
          released_at?: string | null
          released_by?: string | null
          review_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matter_holds_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_transition_rules: {
        Row: {
          allowed_roles: string[]
          blocking_hold_types: Database["public"]["Enums"]["matter_hold_type"][]
          completes_task_types: string[]
          created_at: string
          creates_task_json: Json | null
          description: string | null
          from_status: Database["public"]["Enums"]["case_status"]
          id: string
          is_active: boolean
          label: string
          order_index: number
          prerequisite_keys: string[]
          requires_reason: boolean
          to_status: Database["public"]["Enums"]["case_status"]
          transition_key: string
          updated_at: string
        }
        Insert: {
          allowed_roles?: string[]
          blocking_hold_types?: Database["public"]["Enums"]["matter_hold_type"][]
          completes_task_types?: string[]
          created_at?: string
          creates_task_json?: Json | null
          description?: string | null
          from_status: Database["public"]["Enums"]["case_status"]
          id?: string
          is_active?: boolean
          label: string
          order_index?: number
          prerequisite_keys?: string[]
          requires_reason?: boolean
          to_status: Database["public"]["Enums"]["case_status"]
          transition_key: string
          updated_at?: string
        }
        Update: {
          allowed_roles?: string[]
          blocking_hold_types?: Database["public"]["Enums"]["matter_hold_type"][]
          completes_task_types?: string[]
          created_at?: string
          creates_task_json?: Json | null
          description?: string | null
          from_status?: Database["public"]["Enums"]["case_status"]
          id?: string
          is_active?: boolean
          label?: string
          order_index?: number
          prerequisite_keys?: string[]
          requires_reason?: boolean
          to_status?: Database["public"]["Enums"]["case_status"]
          transition_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      matter_transitions: {
        Row: {
          actor_role: string | null
          case_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["case_status"] | null
          id: string
          idempotency_key: string | null
          metadata: Json
          performed_by: string | null
          reason: string | null
          requested_by: string | null
          to_status: Database["public"]["Enums"]["case_status"]
          transition_key: string
        }
        Insert: {
          actor_role?: string | null
          case_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["case_status"] | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          performed_by?: string | null
          reason?: string | null
          requested_by?: string | null
          to_status: Database["public"]["Enums"]["case_status"]
          transition_key: string
        }
        Update: {
          actor_role?: string | null
          case_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["case_status"] | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          performed_by?: string | null
          reason?: string | null
          requested_by?: string | null
          to_status?: Database["public"]["Enums"]["case_status"]
          transition_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "matter_transitions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
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
      notice_rules: {
        Row: {
          count_business_days: boolean
          created_at: string
          cure_days: number
          id: string
          is_active: boolean
          jurisdiction_county: string
          jurisdiction_state: string
          mailing_days_json: Json
          min_days_before_filing: number
          notes: string | null
          notice_kind: Database["public"]["Enums"]["notice_kind"]
          updated_at: string
        }
        Insert: {
          count_business_days?: boolean
          created_at?: string
          cure_days?: number
          id?: string
          is_active?: boolean
          jurisdiction_county?: string
          jurisdiction_state: string
          mailing_days_json?: Json
          min_days_before_filing?: number
          notes?: string | null
          notice_kind: Database["public"]["Enums"]["notice_kind"]
          updated_at?: string
        }
        Update: {
          count_business_days?: boolean
          created_at?: string
          cure_days?: number
          id?: string
          is_active?: boolean
          jurisdiction_county?: string
          jurisdiction_state?: string
          mailing_days_json?: Json
          min_days_before_filing?: number
          notes?: string | null
          notice_kind?: Database["public"]["Enums"]["notice_kind"]
          updated_at?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          amount_demanded: number
          amount_overridden: boolean
          case_id: string
          computed_amount: number | null
          created_at: string
          cure_by_date: string | null
          document_id: string | null
          eligible_to_file_date: string | null
          id: string
          notes: string | null
          notice_kind: Database["public"]["Enums"]["notice_kind"]
          period_through: string | null
          prepared_by: string | null
          prepared_date: string
          served_date: string | null
          service_method: Database["public"]["Enums"]["service_method"] | null
          status: Database["public"]["Enums"]["notice_status"]
          updated_at: string
        }
        Insert: {
          amount_demanded?: number
          amount_overridden?: boolean
          case_id: string
          computed_amount?: number | null
          created_at?: string
          cure_by_date?: string | null
          document_id?: string | null
          eligible_to_file_date?: string | null
          id?: string
          notes?: string | null
          notice_kind: Database["public"]["Enums"]["notice_kind"]
          period_through?: string | null
          prepared_by?: string | null
          prepared_date?: string
          served_date?: string | null
          service_method?: Database["public"]["Enums"]["service_method"] | null
          status?: Database["public"]["Enums"]["notice_status"]
          updated_at?: string
        }
        Update: {
          amount_demanded?: number
          amount_overridden?: boolean
          case_id?: string
          computed_amount?: number | null
          created_at?: string
          cure_by_date?: string | null
          document_id?: string | null
          eligible_to_file_date?: string | null
          id?: string
          notes?: string | null
          notice_kind?: Database["public"]["Enums"]["notice_kind"]
          period_through?: string | null
          prepared_by?: string | null
          prepared_date?: string
          served_date?: string | null
          service_method?: Database["public"]["Enums"]["service_method"] | null
          status?: Database["public"]["Enums"]["notice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      referral_packet_documents: {
        Row: {
          created_at: string
          document_id: string
          id: string
          packet_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          packet_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          packet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_packet_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_packet_documents_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "referral_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_packets: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          balance_amount: number
          balance_as_of: string | null
          case_id: string
          counsel_id: string | null
          created_at: string
          created_by: string | null
          firm_id: string | null
          id: string
          invalidated_at: string | null
          invalidation_reason: string | null
          issued_at: string | null
          issued_by: string | null
          notes: string | null
          review_flagged_at: string | null
          review_reason: string | null
          snapshot: Json
          status: Database["public"]["Enums"]["referral_packet_status"]
          superseded_at: string | null
          superseded_by_packet_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          balance_amount?: number
          balance_as_of?: string | null
          case_id: string
          counsel_id?: string | null
          created_at?: string
          created_by?: string | null
          firm_id?: string | null
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          issued_at?: string | null
          issued_by?: string | null
          notes?: string | null
          review_flagged_at?: string | null
          review_reason?: string | null
          snapshot?: Json
          status?: Database["public"]["Enums"]["referral_packet_status"]
          superseded_at?: string | null
          superseded_by_packet_id?: string | null
          updated_at?: string
          version: number
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          balance_amount?: number
          balance_as_of?: string | null
          case_id?: string
          counsel_id?: string | null
          created_at?: string
          created_by?: string | null
          firm_id?: string | null
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          issued_at?: string | null
          issued_by?: string | null
          notes?: string | null
          review_flagged_at?: string | null
          review_reason?: string | null
          snapshot?: Json
          status?: Database["public"]["Enums"]["referral_packet_status"]
          superseded_at?: string | null
          superseded_by_packet_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_packets_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_packets_counsel_id_fkey"
            columns: ["counsel_id"]
            isOneToOne: false
            referencedRelation: "counsel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_packets_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_packets_superseded_by_packet_id_fkey"
            columns: ["superseded_by_packet_id"]
            isOneToOne: false
            referencedRelation: "referral_packets"
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
          notice_id: string | null
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
          notice_id?: string | null
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
          notice_id?: string | null
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
          {
            foreignKeyName: "service_records_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
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
      tasks: {
        Row: {
          assigned_role: string | null
          assigned_user_id: string | null
          blocking: boolean
          case_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          escalation_level: number
          id: string
          is_internal: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          related_record_id: string | null
          related_record_type: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role?: string | null
          assigned_user_id?: string | null
          blocking?: boolean
          case_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          escalation_level?: number
          id?: string
          is_internal?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          related_record_id?: string | null
          related_record_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role?: string | null
          assigned_user_id?: string | null
          blocking?: boolean
          case_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          escalation_level?: number
          id?: string
          is_internal?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          related_record_id?: string | null
          related_record_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancies: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          lease_end: string | null
          lease_start: string | null
          lease_type: string | null
          monthly_rent: number | null
          notes: string | null
          occupancy_status: Database["public"]["Enums"]["occupancy_status"]
          property_id: string
          security_deposit: number | null
          tenant_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          lease_end?: string | null
          lease_start?: string | null
          lease_type?: string | null
          monthly_rent?: number | null
          notes?: string | null
          occupancy_status?: Database["public"]["Enums"]["occupancy_status"]
          property_id: string
          security_deposit?: number | null
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lease_end?: string | null
          lease_start?: string | null
          lease_type?: string | null
          monthly_rent?: number | null
          notes?: string | null
          occupancy_status?: Database["public"]["Enums"]["occupancy_status"]
          property_id?: string
          security_deposit?: number | null
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          bank_info: Json
          created_at: string
          date_of_birth: string | null
          drivers_license: Json
          email: string | null
          emergency_contacts: Json
          employment_info: Json
          first_name: string | null
          full_name: string
          id: string
          identity_info: Json
          last_name: string | null
          mailing_address: string | null
          notes: string | null
          phone: string | null
          previous_address: Json
          ssn_last4: string | null
          tenant_references: Json
          updated_at: string
          vehicles: Json
        }
        Insert: {
          bank_info?: Json
          created_at?: string
          date_of_birth?: string | null
          drivers_license?: Json
          email?: string | null
          emergency_contacts?: Json
          employment_info?: Json
          first_name?: string | null
          full_name: string
          id?: string
          identity_info?: Json
          last_name?: string | null
          mailing_address?: string | null
          notes?: string | null
          phone?: string | null
          previous_address?: Json
          ssn_last4?: string | null
          tenant_references?: Json
          updated_at?: string
          vehicles?: Json
        }
        Update: {
          bank_info?: Json
          created_at?: string
          date_of_birth?: string | null
          drivers_license?: Json
          email?: string | null
          emergency_contacts?: Json
          employment_info?: Json
          first_name?: string | null
          full_name?: string
          id?: string
          identity_info?: Json
          last_name?: string | null
          mailing_address?: string | null
          notes?: string | null
          phone?: string | null
          previous_address?: Json
          ssn_last4?: string | null
          tenant_references?: Json
          updated_at?: string
          vehicles?: Json
        }
        Relationships: []
      }
      units: {
        Row: {
          active: boolean
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          description: string | null
          id: string
          monthly_rent: number | null
          property_id: string
          unit_number: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          description?: string | null
          id?: string
          monthly_rent?: number | null
          property_id: string
          unit_number: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          description?: string | null
          id?: string
          monthly_rent?: number | null
          property_id?: string
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      activate_attorney_account: {
        Args: {
          _accept: boolean
          _bar_jurisdictions?: string[]
          _bar_number?: string
          _terms_version: string
        }
        Returns: Json
      }
      add_days_skip_weekends: {
        Args: { _days: number; _start: string }
        Returns: string
      }
      approve_filing_readiness: {
        Args: { _case_id: string; _idempotency_key?: string; _notes?: string }
        Returns: Json
      }
      attach_revised_packet: {
        Args: { _notes?: string; _packet_id: string; _referral_id: string }
        Returns: Json
      }
      attorney_can_access_case: { Args: { _case_id: string }; Returns: boolean }
      attorney_can_access_referral: {
        Args: { _referral_id: string }
        Returns: boolean
      }
      attorney_firm_ids: { Args: never; Returns: string[] }
      client_can_access_case: { Args: { _case_id: string }; Returns: boolean }
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
      complete_task: {
        Args: { _note?: string; _task_id: string }
        Returns: boolean
      }
      confirm_filing_eligibility: {
        Args: { _case_id: string; _confirmed_date: string; _notes?: string }
        Returns: Json
      }
      confirm_filing_eligibility_v2: {
        Args: {
          _case_id: string
          _confirmed_date: string
          _idempotency_key?: string
          _notes: string
          _questionnaire_snapshot?: Json
          _referral_id?: string
          _referral_packet_id?: string
        }
        Returns: Json
      }
      create_attorney_referral: {
        Args: {
          _attorney_id?: string
          _case_id: string
          _fee_arrangement?: string
          _firm_id?: string
          _idempotency_key?: string
          _referral_packet_id?: string
        }
        Returns: Json
      }
      create_balance_snapshot: {
        Args: {
          _case_id: string
          _metadata?: Json
          _snapshot_type: Database["public"]["Enums"]["balance_snapshot_type"]
        }
        Returns: {
          case_id: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          snapshot_date: string
          snapshot_type: Database["public"]["Enums"]["balance_snapshot_type"]
          source_entry_ids: Json
          source_ledger_version: string | null
          total_balance: number
          total_charges: number
          total_credits: number
          total_payments: number
        }
        SetofOptions: {
          from: "*"
          to: "balance_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_information_request: {
        Args: {
          _assigned_role?: string
          _assigned_user_id?: string
          _blocking?: boolean
          _case_id: string
          _category: string
          _description: string
          _due_at?: string
          _idempotency_key?: string
          _referral_id?: string
          _related_record_id?: string
          _related_record_type?: string
        }
        Returns: Json
      }
      current_attorney_id: { Args: never; Returns: string }
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      has_blocking_information_request: {
        Args: { _case_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_attorney: { Args: never; Returns: boolean }
      is_draft_matter_owner: { Args: { _case_id: string }; Returns: boolean }
      is_firm_admin: { Args: { _firm_id: string }; Returns: boolean }
      issue_referral_packet: {
        Args: { _case_id: string; _counsel_id?: string; _notes?: string }
        Returns: Json
      }
      ledger_balance_as_of: {
        Args: { _as_of?: string; _case_id: string }
        Returns: number
      }
      link_attorney_user: { Args: never; Returns: Json }
      open_matter_hold: {
        Args: {
          _case_id: string
          _hold_type: Database["public"]["Enums"]["matter_hold_type"]
          _owner_user_id?: string
          _reason: string
          _review_date?: string
        }
        Returns: string
      }
      owns_client: { Args: { _client_id: string }; Returns: boolean }
      process_matter_change_event: {
        Args: {
          _case_id: string
          _change_class: Database["public"]["Enums"]["matter_change_class"]
          _change_event_id: string
          _change_key: string
          _detail?: string
        }
        Returns: Json
      }
      record_matter_change: {
        Args: {
          _case_id: string
          _change_key: string
          _detail?: string
          _metadata?: Json
        }
        Returns: Json
      }
      release_matter_hold: {
        Args: { _hold_id: string; _release_reason: string }
        Returns: boolean
      }
      resolve_information_request: {
        Args: {
          _reopen?: boolean
          _request_id: string
          _resolution_notes: string
        }
        Returns: Json
      }
      respond_to_information_request: {
        Args: {
          _document_ids?: string[]
          _idempotency_key?: string
          _request_id: string
          _response_text: string
        }
        Returns: Json
      }
      review_information_request: {
        Args: { _note?: string; _request_id: string }
        Returns: Json
      }
      transition_attorney_referral: {
        Args: {
          _idempotency_key?: string
          _metadata?: Json
          _reason?: string
          _referral_id: string
          _transition_key: string
        }
        Returns: Json
      }
      transition_matter: {
        Args: {
          _case_id: string
          _idempotency_key?: string
          _metadata?: Json
          _reason?: string
          _transition_key: string
        }
        Returns: Json
      }
      withdraw_filing_approval: {
        Args: { _approval_id: string; _reason: string }
        Returns: Json
      }
      withdraw_information_request: {
        Args: { _reason: string; _request_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "client" | "attorney"
      assignment_scope: "attorney_only" | "firm"
      attorney_referral_status:
        | "draft"
        | "sent"
        | "pending_acceptance"
        | "accepted"
        | "declined"
        | "needs_information"
        | "withdrawn"
        | "completed"
      attorney_status: "invited" | "active" | "inactive" | "suspended"
      balance_snapshot_type:
        | "submission"
        | "five_day_notice"
        | "fourteen_day_demand"
        | "filing_eligibility"
        | "filing_approval"
        | "filing"
        | "judgment"
        | "final_accounting"
        | "collection_handoff"
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
        | "draft"
        | "attorney_review"
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
      eligibility_confirmation_status:
        | "draft"
        | "confirmed"
        | "invalidated"
        | "superseded"
        | "withdrawn"
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
      filing_approval_status:
        | "draft"
        | "approved"
        | "invalidated"
        | "withdrawn"
        | "superseded"
      firm_member_role: "member" | "firm_admin"
      information_request_status:
        | "open"
        | "responded"
        | "under_review"
        | "resolved"
        | "withdrawn"
      matter_change_class: "hard" | "soft"
      matter_hold_type:
        | "bankruptcy"
        | "military_review"
        | "payment_plan"
        | "attorney_review"
        | "missing_documentation"
        | "tenant_dispute"
        | "court_stay"
        | "compliance_review"
        | "administrative"
      matter_type:
        | "non_payment"
        | "holdover"
        | "lease_violation"
        | "former_tenant_collection"
        | "judgment_collection"
        | "other"
      milestone_status: "pending" | "complete" | "overdue" | "skipped"
      note_type: "internal" | "client_update"
      note_visibility:
        | "admin_internal"
        | "client_visible"
        | "attorney_privileged"
        | "agency_visible"
        | "system_generated"
      notice_kind:
        | "five_day_late"
        | "fourteen_day_demand"
        | "notice_to_quit"
        | "other"
      notice_status:
        | "draft"
        | "issued"
        | "served"
        | "cure_running"
        | "ripe"
        | "cured"
        | "withdrawn"
      notification_channel: "in_app" | "email"
      notification_status: "queued" | "sent" | "failed" | "read"
      occupancy_status:
        | "current_tenant"
        | "former_tenant"
        | "evicted"
        | "unknown"
      payment_frequency: "weekly" | "biweekly" | "monthly"
      payment_plan_status: "active" | "completed" | "cancelled" | "defaulted"
      referral_packet_status:
        | "draft"
        | "issued"
        | "approved"
        | "superseded"
        | "invalidated"
        | "withdrawn"
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
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status: "open" | "in_progress" | "completed" | "cancelled"
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
      app_role: ["super_admin", "admin", "client", "attorney"],
      assignment_scope: ["attorney_only", "firm"],
      attorney_referral_status: [
        "draft",
        "sent",
        "pending_acceptance",
        "accepted",
        "declined",
        "needs_information",
        "withdrawn",
        "completed",
      ],
      attorney_status: ["invited", "active", "inactive", "suspended"],
      balance_snapshot_type: [
        "submission",
        "five_day_notice",
        "fourteen_day_demand",
        "filing_eligibility",
        "filing_approval",
        "filing",
        "judgment",
        "final_accounting",
        "collection_handoff",
      ],
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
        "draft",
        "attorney_review",
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
      eligibility_confirmation_status: [
        "draft",
        "confirmed",
        "invalidated",
        "superseded",
        "withdrawn",
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
      filing_approval_status: [
        "draft",
        "approved",
        "invalidated",
        "withdrawn",
        "superseded",
      ],
      firm_member_role: ["member", "firm_admin"],
      information_request_status: [
        "open",
        "responded",
        "under_review",
        "resolved",
        "withdrawn",
      ],
      matter_change_class: ["hard", "soft"],
      matter_hold_type: [
        "bankruptcy",
        "military_review",
        "payment_plan",
        "attorney_review",
        "missing_documentation",
        "tenant_dispute",
        "court_stay",
        "compliance_review",
        "administrative",
      ],
      matter_type: [
        "non_payment",
        "holdover",
        "lease_violation",
        "former_tenant_collection",
        "judgment_collection",
        "other",
      ],
      milestone_status: ["pending", "complete", "overdue", "skipped"],
      note_type: ["internal", "client_update"],
      note_visibility: [
        "admin_internal",
        "client_visible",
        "attorney_privileged",
        "agency_visible",
        "system_generated",
      ],
      notice_kind: [
        "five_day_late",
        "fourteen_day_demand",
        "notice_to_quit",
        "other",
      ],
      notice_status: [
        "draft",
        "issued",
        "served",
        "cure_running",
        "ripe",
        "cured",
        "withdrawn",
      ],
      notification_channel: ["in_app", "email"],
      notification_status: ["queued", "sent", "failed", "read"],
      occupancy_status: [
        "current_tenant",
        "former_tenant",
        "evicted",
        "unknown",
      ],
      payment_frequency: ["weekly", "biweekly", "monthly"],
      payment_plan_status: ["active", "completed", "cancelled", "defaulted"],
      referral_packet_status: [
        "draft",
        "issued",
        "approved",
        "superseded",
        "invalidated",
        "withdrawn",
      ],
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
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["open", "in_progress", "completed", "cancelled"],
    },
  },
} as const
