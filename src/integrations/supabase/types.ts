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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      buyers: {
        Row: {
          ai_match_score: number | null
          avg_close_time_days: number | null
          company_name: string | null
          contact_name: string
          created_at: string
          deals_closed: number | null
          email: string | null
          id: string
          is_active: boolean | null
          max_arv: number | null
          max_repair_level: string | null
          min_arv: number | null
          notes: string | null
          phone: string | null
          preferred_property_types:
            | Database["public"]["Enums"]["property_type"][]
            | null
          preferred_zip_codes: string[] | null
          tier: Database["public"]["Enums"]["buyer_tier"]
          total_volume: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_match_score?: number | null
          avg_close_time_days?: number | null
          company_name?: string | null
          contact_name: string
          created_at?: string
          deals_closed?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          max_arv?: number | null
          max_repair_level?: string | null
          min_arv?: number | null
          notes?: string | null
          phone?: string | null
          preferred_property_types?:
            | Database["public"]["Enums"]["property_type"][]
            | null
          preferred_zip_codes?: string[] | null
          tier?: Database["public"]["Enums"]["buyer_tier"]
          total_volume?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_match_score?: number | null
          avg_close_time_days?: number | null
          company_name?: string | null
          contact_name?: string
          created_at?: string
          deals_closed?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          max_arv?: number | null
          max_repair_level?: string | null
          min_arv?: number | null
          notes?: string | null
          phone?: string | null
          preferred_property_types?:
            | Database["public"]["Enums"]["property_type"][]
            | null
          preferred_zip_codes?: string[] | null
          tier?: Database["public"]["Enums"]["buyer_tier"]
          total_volume?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      campaign_enrollments: {
        Row: {
          campaign_id: string
          completed_at: string | null
          current_sequence: number
          enrolled_at: string
          id: string
          last_sent_at: string | null
          lead_id: string
          next_send_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          current_sequence?: number
          enrolled_at?: string
          id?: string
          last_sent_at?: string | null
          lead_id: string
          next_send_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          current_sequence?: number
          enrolled_at?: string
          id?: string
          last_sent_at?: string | null
          lead_id?: string
          next_send_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "drip_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_message_logs: {
        Row: {
          channel: string
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          enrollment_id: string
          error_message: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          sequence_id: string
          status: string
        }
        Insert: {
          channel: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          enrollment_id: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          sequence_id: string
          status?: string
        }
        Update: {
          channel?: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          enrollment_id?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          sequence_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_message_logs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "campaign_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_message_logs_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "campaign_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sequences: {
        Row: {
          campaign_id: string
          channel: string
          content: string
          created_at: string
          delay_days: number
          delay_hours: number
          id: string
          sequence_order: number
          subject: string | null
        }
        Insert: {
          campaign_id: string
          channel: string
          content: string
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          sequence_order: number
          subject?: string | null
        }
        Update: {
          campaign_id?: string
          channel?: string
          content?: string
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          sequence_order?: number
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "drip_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_packages: {
        Row: {
          buyer_id: string
          clicked_at: string | null
          id: string
          lead_id: string
          opened_at: string | null
          response: string | null
          sent_at: string
        }
        Insert: {
          buyer_id: string
          clicked_at?: string | null
          id?: string
          lead_id: string
          opened_at?: string | null
          response?: string | null
          sent_at?: string
        }
        Update: {
          buyer_id?: string
          clicked_at?: string | null
          id?: string
          lead_id?: string
          opened_at?: string | null
          response?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_packages_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_packages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_status: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          direction: string | null
          id: string
          interaction_type: string
          lead_id: string
          sentiment: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          id?: string
          interaction_type: string
          lead_id: string
          sentiment?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          id?: string
          interaction_type?: string
          lead_id?: string
          sentiment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          lead_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lead_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lead_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_agent_id: string | null
          assignment_fee: number | null
          closing_date: string | null
          created_at: string
          id: string
          last_contact_at: string | null
          listing_price: number | null
          next_follow_up_at: string | null
          offer_amount: number | null
          piw_score: number | null
          piw_score_factors: Json | null
          property_id: string
          referral_commission: number | null
          referred_by_realtor_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          assignment_fee?: number | null
          closing_date?: string | null
          created_at?: string
          id?: string
          last_contact_at?: string | null
          listing_price?: number | null
          next_follow_up_at?: string | null
          offer_amount?: number | null
          piw_score?: number | null
          piw_score_factors?: Json | null
          property_id: string
          referral_commission?: number | null
          referred_by_realtor_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          assignment_fee?: number | null
          closing_date?: string | null
          created_at?: string
          id?: string
          last_contact_at?: string | null
          listing_price?: number | null
          next_follow_up_at?: string | null
          offer_amount?: number | null
          piw_score?: number | null
          piw_score_factors?: Json | null
          property_id?: string
          referral_commission?: number | null
          referred_by_realtor_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_referred_by_realtor_id_fkey"
            columns: ["referred_by_realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          lead_id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          realtor_id: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          realtor_id?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          realtor_id?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
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
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          active_liens_count: number | null
          address: string
          arv: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          created_at: string
          crime_index: number | null
          data_fetched_at: string | null
          data_source: string | null
          days_on_market_avg: number | null
          equity_percent: number | null
          estimated_monthly_rent: number | null
          eviction_count: number | null
          id: string
          is_absentee_owner: boolean | null
          is_foreclosure: boolean | null
          is_probate: boolean | null
          last_refinance_date: string | null
          last_sale_date: string | null
          last_sale_price: number | null
          lot_size: number | null
          mailing_address_different: boolean | null
          mao: number | null
          median_household_income: number | null
          mortgage_age_years: number | null
          neighborhood_vacancy_rate: number | null
          notes: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          owner_tenure_years: number | null
          owner_type: string | null
          population_growth_5yr: number | null
          price_growth_3yr: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          proximity_to_development: string | null
          repair_cost: number | null
          school_rating: number | null
          sqft: number | null
          state: string
          tax_debt: number | null
          tax_delinquent: boolean | null
          updated_at: string
          walkability_score: number | null
          year_built: number | null
          zip_code: string
        }
        Insert: {
          active_liens_count?: number | null
          address: string
          arv?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          created_at?: string
          crime_index?: number | null
          data_fetched_at?: string | null
          data_source?: string | null
          days_on_market_avg?: number | null
          equity_percent?: number | null
          estimated_monthly_rent?: number | null
          eviction_count?: number | null
          id?: string
          is_absentee_owner?: boolean | null
          is_foreclosure?: boolean | null
          is_probate?: boolean | null
          last_refinance_date?: string | null
          last_sale_date?: string | null
          last_sale_price?: number | null
          lot_size?: number | null
          mailing_address_different?: boolean | null
          mao?: number | null
          median_household_income?: number | null
          mortgage_age_years?: number | null
          neighborhood_vacancy_rate?: number | null
          notes?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_tenure_years?: number | null
          owner_type?: string | null
          population_growth_5yr?: number | null
          price_growth_3yr?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          proximity_to_development?: string | null
          repair_cost?: number | null
          school_rating?: number | null
          sqft?: number | null
          state?: string
          tax_debt?: number | null
          tax_delinquent?: boolean | null
          updated_at?: string
          walkability_score?: number | null
          year_built?: number | null
          zip_code: string
        }
        Update: {
          active_liens_count?: number | null
          address?: string
          arv?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          created_at?: string
          crime_index?: number | null
          data_fetched_at?: string | null
          data_source?: string | null
          days_on_market_avg?: number | null
          equity_percent?: number | null
          estimated_monthly_rent?: number | null
          eviction_count?: number | null
          id?: string
          is_absentee_owner?: boolean | null
          is_foreclosure?: boolean | null
          is_probate?: boolean | null
          last_refinance_date?: string | null
          last_sale_date?: string | null
          last_sale_price?: number | null
          lot_size?: number | null
          mailing_address_different?: boolean | null
          mao?: number | null
          median_household_income?: number | null
          mortgage_age_years?: number | null
          neighborhood_vacancy_rate?: number | null
          notes?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_tenure_years?: number | null
          owner_type?: string | null
          population_growth_5yr?: number | null
          price_growth_3yr?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          proximity_to_development?: string | null
          repair_cost?: number | null
          school_rating?: number | null
          sqft?: number | null
          state?: string
          tax_debt?: number | null
          tax_delinquent?: boolean | null
          updated_at?: string
          walkability_score?: number | null
          year_built?: number | null
          zip_code?: string
        }
        Relationships: []
      }
      property_analyses: {
        Row: {
          analysis: Json
          created_at: string
          created_by: string | null
          deal_verdict: string | null
          executive_summary: string | null
          id: string
          lead_id: string
          motivation_level: string | null
          offer_max: number | null
          offer_min: number | null
          offer_optimal: number | null
          opportunity_score: number | null
          property_id: string
          risk_level: string | null
        }
        Insert: {
          analysis: Json
          created_at?: string
          created_by?: string | null
          deal_verdict?: string | null
          executive_summary?: string | null
          id?: string
          lead_id: string
          motivation_level?: string | null
          offer_max?: number | null
          offer_min?: number | null
          offer_optimal?: number | null
          opportunity_score?: number | null
          property_id: string
          risk_level?: string | null
        }
        Update: {
          analysis?: Json
          created_at?: string
          created_by?: string | null
          deal_verdict?: string | null
          executive_summary?: string | null
          id?: string
          lead_id?: string
          motivation_level?: string | null
          offer_max?: number | null
          offer_min?: number | null
          offer_optimal?: number | null
          opportunity_score?: number | null
          property_id?: string
          risk_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_analyses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_analyses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_comps: {
        Row: {
          address: string
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          created_by: string | null
          distance_miles: number | null
          id: string
          notes: string | null
          price_per_sqft: number | null
          property_id: string
          sale_date: string | null
          sale_price: number
          source: string | null
          sqft: number | null
        }
        Insert: {
          address: string
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          created_by?: string | null
          distance_miles?: number | null
          id?: string
          notes?: string | null
          price_per_sqft?: number | null
          property_id: string
          sale_date?: string | null
          sale_price: number
          source?: string | null
          sqft?: number | null
        }
        Update: {
          address?: string
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          created_by?: string | null
          distance_miles?: number | null
          id?: string
          notes?: string | null
          price_per_sqft?: number | null
          property_id?: string
          sale_date?: string | null
          sale_price?: number
          source?: string | null
          sqft?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_comps_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_primary: boolean
          property_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_primary?: boolean
          property_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_primary?: boolean
          property_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      realtors: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      seller_conversations: {
        Row: {
          ai_adjusted_score: number | null
          ai_adjustment_reason: string | null
          conversation_date: string
          created_at: string
          created_by: string | null
          id: string
          key_objection: string | null
          lead_id: string
          main_pain: string
          notes: string | null
          our_offer_discussed: number | null
          previous_piw_score: number | null
          price_flexibility: Database["public"]["Enums"]["price_flexibility"]
          seller_asking_price: number | null
          urgency_level: Database["public"]["Enums"]["seller_urgency_level"]
        }
        Insert: {
          ai_adjusted_score?: number | null
          ai_adjustment_reason?: string | null
          conversation_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_objection?: string | null
          lead_id: string
          main_pain: string
          notes?: string | null
          our_offer_discussed?: number | null
          previous_piw_score?: number | null
          price_flexibility: Database["public"]["Enums"]["price_flexibility"]
          seller_asking_price?: number | null
          urgency_level: Database["public"]["Enums"]["seller_urgency_level"]
        }
        Update: {
          ai_adjusted_score?: number | null
          ai_adjustment_reason?: string | null
          conversation_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key_objection?: string | null
          lead_id?: string
          main_pain?: string
          notes?: string | null
          our_offer_discussed?: number | null
          previous_piw_score?: number | null
          price_flexibility?: Database["public"]["Enums"]["price_flexibility"]
          seller_asking_price?: number | null
          urgency_level?: Database["public"]["Enums"]["seller_urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "seller_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      property_comps_summary: {
        Row: {
          avg_price_per_sqft: number | null
          avg_sale_price: number | null
          comp_count: number | null
          max_sale_price: number | null
          min_sale_price: number | null
          property_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_comps_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agent" | "buyer"
      buyer_tier: "platinum" | "gold" | "silver" | "bronze"
      lead_status:
        | "captacion"
        | "contacto"
        | "bajo_contrato"
        | "cesion"
        | "cerrado"
      payment_method: "cash" | "check" | "wire" | "zelle" | "venmo" | "other"
      payment_status: "pending" | "paid" | "cancelled"
      price_flexibility:
        | "very_flexible"
        | "somewhat_flexible"
        | "firm"
        | "unrealistic"
      property_type:
        | "single_family"
        | "multi_family"
        | "condo"
        | "townhouse"
        | "land"
        | "commercial"
      seller_urgency_level: "desperate" | "high" | "moderate" | "low" | "none"
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
      app_role: ["admin", "agent", "buyer"],
      buyer_tier: ["platinum", "gold", "silver", "bronze"],
      lead_status: [
        "captacion",
        "contacto",
        "bajo_contrato",
        "cesion",
        "cerrado",
      ],
      payment_method: ["cash", "check", "wire", "zelle", "venmo", "other"],
      payment_status: ["pending", "paid", "cancelled"],
      price_flexibility: [
        "very_flexible",
        "somewhat_flexible",
        "firm",
        "unrealistic",
      ],
      property_type: [
        "single_family",
        "multi_family",
        "condo",
        "townhouse",
        "land",
        "commercial",
      ],
      seller_urgency_level: ["desperate", "high", "moderate", "low", "none"],
    },
  },
} as const
