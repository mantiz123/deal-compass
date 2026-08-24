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
          avg_response_time_hours: number | null
          close_ratio: number | null
          company_name: string | null
          contact_name: string
          created_at: string
          deals_closed: number | null
          deals_responded: number | null
          email: string | null
          id: string
          is_active: boolean | null
          last_deal_date: string | null
          liquidity_score: number | null
          max_arv: number | null
          max_repair_level: string | null
          min_arv: number | null
          notes: string | null
          organization_id: string
          phone: string | null
          preferred_cities: string[] | null
          preferred_discount_percent: number | null
          preferred_property_types:
            | Database["public"]["Enums"]["property_type"][]
            | null
          preferred_zip_codes: string[] | null
          tier: Database["public"]["Enums"]["buyer_tier"]
          total_deals_offered: number | null
          total_volume: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_match_score?: number | null
          avg_close_time_days?: number | null
          avg_response_time_hours?: number | null
          close_ratio?: number | null
          company_name?: string | null
          contact_name: string
          created_at?: string
          deals_closed?: number | null
          deals_responded?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_deal_date?: string | null
          liquidity_score?: number | null
          max_arv?: number | null
          max_repair_level?: string | null
          min_arv?: number | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          preferred_cities?: string[] | null
          preferred_discount_percent?: number | null
          preferred_property_types?:
            | Database["public"]["Enums"]["property_type"][]
            | null
          preferred_zip_codes?: string[] | null
          tier?: Database["public"]["Enums"]["buyer_tier"]
          total_deals_offered?: number | null
          total_volume?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_match_score?: number | null
          avg_close_time_days?: number | null
          avg_response_time_hours?: number | null
          close_ratio?: number | null
          company_name?: string | null
          contact_name?: string
          created_at?: string
          deals_closed?: number | null
          deals_responded?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_deal_date?: string | null
          liquidity_score?: number | null
          max_arv?: number | null
          max_repair_level?: string | null
          min_arv?: number | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          preferred_cities?: string[] | null
          preferred_discount_percent?: number | null
          preferred_property_types?:
            | Database["public"]["Enums"]["property_type"][]
            | null
          preferred_zip_codes?: string[] | null
          tier?: Database["public"]["Enums"]["buyer_tier"]
          total_deals_offered?: number | null
          total_volume?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          contract_id: string
          id: string
          ip_address: string | null
          organization_id: string
          signature_image: string | null
          signed_at: string
          signer_email: string | null
          signer_name: string
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          signature_image?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          signature_image?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_data: Json | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          created_by: string | null
          document_hash: string | null
          id: string
          ip_address: string | null
          lead_id: string
          organization_id: string
          pdf_url: string | null
          seller_email: string | null
          seller_phone: string | null
          sent_at: string | null
          signed_at: string | null
          signed_pdf_url: string | null
          signing_token: string | null
          signing_token_expires_at: string | null
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          contract_data?: Json | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
          document_hash?: string | null
          id?: string
          ip_address?: string | null
          lead_id: string
          organization_id?: string
          pdf_url?: string | null
          seller_email?: string | null
          seller_phone?: string | null
          sent_at?: string | null
          signed_at?: string | null
          signed_pdf_url?: string | null
          signing_token?: string | null
          signing_token_expires_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          contract_data?: Json | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
          document_hash?: string | null
          id?: string
          ip_address?: string | null
          lead_id?: string
          organization_id?: string
          pdf_url?: string | null
          seller_email?: string | null
          seller_phone?: string | null
          sent_at?: string | null
          signed_at?: string | null
          signed_pdf_url?: string | null
          signing_token?: string | null
          signing_token_expires_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_checklist_items: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          is_done: boolean
          label: string
          notes: string | null
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          is_done?: boolean
          label: string
          notes?: string | null
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          is_done?: boolean
          label?: string
          notes?: string | null
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_checklist_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_checklist_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_comps: {
        Row: {
          address: string
          bathrooms: number | null
          bedrooms: number | null
          closed_date: string | null
          created_at: string
          days_on_market: number | null
          deal_id: string
          distance_miles: number | null
          exclusion_reason: string | null
          id: string
          included: boolean
          lot_size_acres: number | null
          notes: string | null
          organization_id: string
          price: number | null
          similarity_score: number | null
          sqft: number | null
          status: Database["public"]["Enums"]["comp_status"]
          year_built: number | null
        }
        Insert: {
          address: string
          bathrooms?: number | null
          bedrooms?: number | null
          closed_date?: string | null
          created_at?: string
          days_on_market?: number | null
          deal_id: string
          distance_miles?: number | null
          exclusion_reason?: string | null
          id?: string
          included?: boolean
          lot_size_acres?: number | null
          notes?: string | null
          organization_id: string
          price?: number | null
          similarity_score?: number | null
          sqft?: number | null
          status?: Database["public"]["Enums"]["comp_status"]
          year_built?: number | null
        }
        Update: {
          address?: string
          bathrooms?: number | null
          bedrooms?: number | null
          closed_date?: string | null
          created_at?: string
          days_on_market?: number | null
          deal_id?: string
          distance_miles?: number | null
          exclusion_reason?: string | null
          id?: string
          included?: boolean
          lot_size_acres?: number | null
          notes?: string | null
          organization_id?: string
          price?: number | null
          similarity_score?: number | null
          sqft?: number | null
          status?: Database["public"]["Enums"]["comp_status"]
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_comps_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_comps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_scenarios: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          inputs: Json
          is_primary: boolean
          name: string
          organization_id: string
          results: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          inputs?: Json
          is_primary?: boolean
          name?: string
          organization_id: string
          results?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          inputs?: Json
          is_primary?: boolean
          name?: string
          organization_id?: string
          results?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_scenarios_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_scenarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          address: string
          annual_taxes: number | null
          apn: string | null
          assessed_value: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          cma_recommended_offer: number | null
          county: string | null
          created_at: string
          created_by: string | null
          decision: Database["public"]["Enums"]["deal_decision"]
          extracted_data: Json
          id: string
          investment_score: number | null
          list_price: number | null
          listing_description: string | null
          lot_size_acres: number | null
          mls_id: string | null
          notes: string | null
          organization_id: string
          pdf_filename: string | null
          pdf_path: string | null
          property_type: string | null
          rvm_range_high: number | null
          rvm_range_low: number | null
          rvm_value: number | null
          sqft: number | null
          stage: Database["public"]["Enums"]["deal_stage"]
          state: string | null
          updated_at: string
          year_built: number | null
          zip_code: string | null
          zoning: string | null
        }
        Insert: {
          address: string
          annual_taxes?: number | null
          apn?: string | null
          assessed_value?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          cma_recommended_offer?: number | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          decision?: Database["public"]["Enums"]["deal_decision"]
          extracted_data?: Json
          id?: string
          investment_score?: number | null
          list_price?: number | null
          listing_description?: string | null
          lot_size_acres?: number | null
          mls_id?: string | null
          notes?: string | null
          organization_id: string
          pdf_filename?: string | null
          pdf_path?: string | null
          property_type?: string | null
          rvm_range_high?: number | null
          rvm_range_low?: number | null
          rvm_value?: number | null
          sqft?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          state?: string | null
          updated_at?: string
          year_built?: number | null
          zip_code?: string | null
          zoning?: string | null
        }
        Update: {
          address?: string
          annual_taxes?: number | null
          apn?: string | null
          assessed_value?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          cma_recommended_offer?: number | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          decision?: Database["public"]["Enums"]["deal_decision"]
          extracted_data?: Json
          id?: string
          investment_score?: number | null
          list_price?: number | null
          listing_description?: string | null
          lot_size_acres?: number | null
          mls_id?: string | null
          notes?: string | null
          organization_id?: string
          pdf_filename?: string | null
          pdf_path?: string | null
          property_type?: string | null
          rvm_range_high?: number | null
          rvm_range_low?: number | null
          rvm_value?: number | null
          sqft?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          state?: string | null
          updated_at?: string
          year_built?: number | null
          zip_code?: string | null
          zoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hud_fmr_alabama_fy2026: {
        Row: {
          area_name: string
          county_fips: string | null
          county_name: string | null
          created_at: string
          effective_date: string
          fiscal_year: number
          fmr_0br: number
          fmr_1br: number
          fmr_2br: number
          fmr_3br: number
          fmr_4br: number
          has_may_2026_revision: boolean
          hud_area_code: string
          id: string
          is_metro: boolean
          payment_standard_0br: number | null
          payment_standard_1br: number | null
          payment_standard_2br: number | null
          payment_standard_3br: number | null
          payment_standard_4br: number | null
          payment_standard_pha_name: string | null
          payment_standard_source: string
          payment_standard_updated_at: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          area_name: string
          county_fips?: string | null
          county_name?: string | null
          created_at?: string
          effective_date?: string
          fiscal_year?: number
          fmr_0br: number
          fmr_1br: number
          fmr_2br: number
          fmr_3br: number
          fmr_4br: number
          has_may_2026_revision?: boolean
          hud_area_code: string
          id?: string
          is_metro?: boolean
          payment_standard_0br?: number | null
          payment_standard_1br?: number | null
          payment_standard_2br?: number | null
          payment_standard_3br?: number | null
          payment_standard_4br?: number | null
          payment_standard_pha_name?: string | null
          payment_standard_source?: string
          payment_standard_updated_at?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          area_name?: string
          county_fips?: string | null
          county_name?: string | null
          created_at?: string
          effective_date?: string
          fiscal_year?: number
          fmr_0br?: number
          fmr_1br?: number
          fmr_2br?: number
          fmr_3br?: number
          fmr_4br?: number
          has_may_2026_revision?: boolean
          hud_area_code?: string
          id?: string
          is_metro?: boolean
          payment_standard_0br?: number | null
          payment_standard_1br?: number | null
          payment_standard_2br?: number | null
          payment_standard_3br?: number | null
          payment_standard_4br?: number | null
          payment_standard_pha_name?: string | null
          payment_standard_source?: string
          payment_standard_updated_at?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hud_fmr_safmr_zip: {
        Row: {
          area_name: string
          created_at: string
          effective_date: string
          fiscal_year: number
          has_may_2026_revision: boolean
          hud_area_code: string
          id: string
          safmr_0br: number
          safmr_1br: number
          safmr_2br: number
          safmr_3br: number
          safmr_4br: number
          updated_at: string
          zip_code: string
        }
        Insert: {
          area_name: string
          created_at?: string
          effective_date?: string
          fiscal_year?: number
          has_may_2026_revision?: boolean
          hud_area_code: string
          id?: string
          safmr_0br: number
          safmr_1br: number
          safmr_2br: number
          safmr_3br: number
          safmr_4br: number
          updated_at?: string
          zip_code: string
        }
        Update: {
          area_name?: string
          created_at?: string
          effective_date?: string
          fiscal_year?: number
          has_may_2026_revision?: boolean
          hud_area_code?: string
          id?: string
          safmr_0br?: number
          safmr_1br?: number
          safmr_2br?: number
          safmr_3br?: number
          safmr_4br?: number
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          agreement_signed_at: string | null
          city: string | null
          commission_split_student: number
          country: string | null
          created_at: string
          deals_closed_count: number
          id: string
          is_active: boolean
          is_klose_internal: boolean
          logo_url: string | null
          metadata: Json
          name: string
          onboarding_completed_at: string | null
          owner_user_id: string | null
          primary_color: string | null
          slug: string
          tier: Database["public"]["Enums"]["organization_tier"]
          total_earned_student: number
          updated_at: string
        }
        Insert: {
          agreement_signed_at?: string | null
          city?: string | null
          commission_split_student?: number
          country?: string | null
          created_at?: string
          deals_closed_count?: number
          id?: string
          is_active?: boolean
          is_klose_internal?: boolean
          logo_url?: string | null
          metadata?: Json
          name: string
          onboarding_completed_at?: string | null
          owner_user_id?: string | null
          primary_color?: string | null
          slug: string
          tier?: Database["public"]["Enums"]["organization_tier"]
          total_earned_student?: number
          updated_at?: string
        }
        Update: {
          agreement_signed_at?: string | null
          city?: string | null
          commission_split_student?: number
          country?: string | null
          created_at?: string
          deals_closed_count?: number
          id?: string
          is_active?: boolean
          is_klose_internal?: boolean
          logo_url?: string | null
          metadata?: Json
          name?: string
          onboarding_completed_at?: string | null
          owner_user_id?: string | null
          primary_color?: string | null
          slug?: string
          tier?: Database["public"]["Enums"]["organization_tier"]
          total_earned_student?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          description: string | null
          environment: string
          expires_at: string | null
          id: string
          notes: string | null
          organization_id: string
          paddle_customer_id: string | null
          paddle_transaction_id: string | null
          paid_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          title: string
          token: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          paddle_customer_id?: string | null
          paddle_transaction_id?: string | null
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          title: string
          token?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          paddle_customer_id?: string | null
          paddle_transaction_id?: string | null
          paid_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          title?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          realtor_id?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          is_approved: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          absentee_type: string | null
          active_liens_count: number | null
          address: string
          apn: string | null
          arv: number | null
          auction_date: string | null
          bathrooms: number | null
          bedrooms: number | null
          bk_date: string | null
          city: string
          county: string | null
          created_at: string
          crime_index: number | null
          data_fetched_at: string | null
          data_source: string | null
          days_on_market: number | null
          days_on_market_avg: number | null
          divorce_date: string | null
          do_not_mail: boolean | null
          email_bounced: boolean | null
          equity_percent: number | null
          estimated_monthly_rent: number | null
          eviction_count: number | null
          exterior_condition: string | null
          id: string
          is_absentee_owner: boolean | null
          is_foreclosure: boolean | null
          is_litigator: boolean | null
          is_probate: boolean | null
          is_vacant: boolean | null
          last_refinance_date: string | null
          last_sale_date: string | null
          last_sale_price: number | null
          lien_amount: number | null
          lien_date: string | null
          lien_type: string | null
          lot_size: number | null
          mailing_address_different: boolean | null
          mao: number | null
          median_household_income: number | null
          mls_agent_email: string | null
          mls_agent_name: string | null
          mls_agent_phone: string | null
          mortgage_age_years: number | null
          mortgage_balance: number | null
          neighborhood_vacancy_rate: number | null
          notes: string | null
          organization_id: string
          owner_2_name: string | null
          owner_email: string | null
          owner_email_2: string | null
          owner_email_3: string | null
          owner_email_4: string | null
          owner_mailing_address: string | null
          owner_mailing_city: string | null
          owner_mailing_state: string | null
          owner_name: string | null
          owner_phone: string | null
          owner_tenure_years: number | null
          owner_type: string | null
          phone_1_dnc: boolean | null
          phone_1_type: string | null
          phone_2: string | null
          phone_2_dnc: boolean | null
          phone_2_type: string | null
          phone_3: string | null
          phone_3_dnc: boolean | null
          phone_3_type: string | null
          phone_4: string | null
          phone_4_dnc: boolean | null
          phone_4_type: string | null
          phone_5: string | null
          phone_5_dnc: boolean | null
          phone_5_type: string | null
          population_growth_5yr: number | null
          prefc_default_amount: number | null
          prefc_lender: string | null
          prefc_opening_bid: number | null
          prefc_record_type: string | null
          prefc_recording_date: string | null
          prefc_unpaid_balance: number | null
          price_growth_3yr: number | null
          property_condition: string | null
          property_status: string | null
          property_type: Database["public"]["Enums"]["property_type"]
          proximity_to_development: string | null
          repair_cost: number | null
          school_rating: number | null
          skip_trace_priority: boolean | null
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
          absentee_type?: string | null
          active_liens_count?: number | null
          address: string
          apn?: string | null
          arv?: number | null
          auction_date?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          bk_date?: string | null
          city: string
          county?: string | null
          created_at?: string
          crime_index?: number | null
          data_fetched_at?: string | null
          data_source?: string | null
          days_on_market?: number | null
          days_on_market_avg?: number | null
          divorce_date?: string | null
          do_not_mail?: boolean | null
          email_bounced?: boolean | null
          equity_percent?: number | null
          estimated_monthly_rent?: number | null
          eviction_count?: number | null
          exterior_condition?: string | null
          id?: string
          is_absentee_owner?: boolean | null
          is_foreclosure?: boolean | null
          is_litigator?: boolean | null
          is_probate?: boolean | null
          is_vacant?: boolean | null
          last_refinance_date?: string | null
          last_sale_date?: string | null
          last_sale_price?: number | null
          lien_amount?: number | null
          lien_date?: string | null
          lien_type?: string | null
          lot_size?: number | null
          mailing_address_different?: boolean | null
          mao?: number | null
          median_household_income?: number | null
          mls_agent_email?: string | null
          mls_agent_name?: string | null
          mls_agent_phone?: string | null
          mortgage_age_years?: number | null
          mortgage_balance?: number | null
          neighborhood_vacancy_rate?: number | null
          notes?: string | null
          organization_id?: string
          owner_2_name?: string | null
          owner_email?: string | null
          owner_email_2?: string | null
          owner_email_3?: string | null
          owner_email_4?: string | null
          owner_mailing_address?: string | null
          owner_mailing_city?: string | null
          owner_mailing_state?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_tenure_years?: number | null
          owner_type?: string | null
          phone_1_dnc?: boolean | null
          phone_1_type?: string | null
          phone_2?: string | null
          phone_2_dnc?: boolean | null
          phone_2_type?: string | null
          phone_3?: string | null
          phone_3_dnc?: boolean | null
          phone_3_type?: string | null
          phone_4?: string | null
          phone_4_dnc?: boolean | null
          phone_4_type?: string | null
          phone_5?: string | null
          phone_5_dnc?: boolean | null
          phone_5_type?: string | null
          population_growth_5yr?: number | null
          prefc_default_amount?: number | null
          prefc_lender?: string | null
          prefc_opening_bid?: number | null
          prefc_record_type?: string | null
          prefc_recording_date?: string | null
          prefc_unpaid_balance?: number | null
          price_growth_3yr?: number | null
          property_condition?: string | null
          property_status?: string | null
          property_type?: Database["public"]["Enums"]["property_type"]
          proximity_to_development?: string | null
          repair_cost?: number | null
          school_rating?: number | null
          skip_trace_priority?: boolean | null
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
          absentee_type?: string | null
          active_liens_count?: number | null
          address?: string
          apn?: string | null
          arv?: number | null
          auction_date?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          bk_date?: string | null
          city?: string
          county?: string | null
          created_at?: string
          crime_index?: number | null
          data_fetched_at?: string | null
          data_source?: string | null
          days_on_market?: number | null
          days_on_market_avg?: number | null
          divorce_date?: string | null
          do_not_mail?: boolean | null
          email_bounced?: boolean | null
          equity_percent?: number | null
          estimated_monthly_rent?: number | null
          eviction_count?: number | null
          exterior_condition?: string | null
          id?: string
          is_absentee_owner?: boolean | null
          is_foreclosure?: boolean | null
          is_litigator?: boolean | null
          is_probate?: boolean | null
          is_vacant?: boolean | null
          last_refinance_date?: string | null
          last_sale_date?: string | null
          last_sale_price?: number | null
          lien_amount?: number | null
          lien_date?: string | null
          lien_type?: string | null
          lot_size?: number | null
          mailing_address_different?: boolean | null
          mao?: number | null
          median_household_income?: number | null
          mls_agent_email?: string | null
          mls_agent_name?: string | null
          mls_agent_phone?: string | null
          mortgage_age_years?: number | null
          mortgage_balance?: number | null
          neighborhood_vacancy_rate?: number | null
          notes?: string | null
          organization_id?: string
          owner_2_name?: string | null
          owner_email?: string | null
          owner_email_2?: string | null
          owner_email_3?: string | null
          owner_email_4?: string | null
          owner_mailing_address?: string | null
          owner_mailing_city?: string | null
          owner_mailing_state?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_tenure_years?: number | null
          owner_type?: string | null
          phone_1_dnc?: boolean | null
          phone_1_type?: string | null
          phone_2?: string | null
          phone_2_dnc?: boolean | null
          phone_2_type?: string | null
          phone_3?: string | null
          phone_3_dnc?: boolean | null
          phone_3_type?: string | null
          phone_4?: string | null
          phone_4_dnc?: boolean | null
          phone_4_type?: string | null
          phone_5?: string | null
          phone_5_dnc?: boolean | null
          phone_5_type?: string | null
          population_growth_5yr?: number | null
          prefc_default_amount?: number | null
          prefc_lender?: string | null
          prefc_opening_bid?: number | null
          prefc_record_type?: string | null
          prefc_recording_date?: string | null
          prefc_unpaid_balance?: number | null
          price_growth_3yr?: number | null
          property_condition?: string | null
          property_status?: string | null
          property_type?: Database["public"]["Enums"]["property_type"]
          proximity_to_development?: string | null
          repair_cost?: number | null
          school_rating?: number | null
          skip_trace_priority?: boolean | null
          sqft?: number | null
          state?: string
          tax_debt?: number | null
          tax_delinquent?: boolean | null
          updated_at?: string
          walkability_score?: number | null
          year_built?: number | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          property_id?: string
          risk_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          price_per_sqft?: number | null
          property_id?: string
          sale_date?: string | null
          sale_price?: number
          source?: string | null
          sqft?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_comps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          property_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_images_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_underwriting: {
        Row: {
          amortization_years: number
          cap_rate: number | null
          capex_pct: number
          cash_invested: number | null
          closing_cost_pct: number
          coc_return: number | null
          created_at: string
          down_payment_pct: number
          dscr: number | null
          hoa_monthly: number
          hud_area_code: string | null
          id: string
          insurance_annual: number
          interest_rate: number
          monthly_cashflow: number | null
          monthly_rent: number
          noi_annual: number | null
          notes: string | null
          organization_id: string
          property_id: string | null
          property_mgmt_pct: number
          property_tax_rate_pct: number
          purchase_price: number
          rehab_cost: number
          rent_source: string | null
          repairs_pct: number
          scenario_name: string
          traffic_light: string | null
          updated_at: string
          user_id: string
          vacancy_pct: number
        }
        Insert: {
          amortization_years?: number
          cap_rate?: number | null
          capex_pct?: number
          cash_invested?: number | null
          closing_cost_pct?: number
          coc_return?: number | null
          created_at?: string
          down_payment_pct?: number
          dscr?: number | null
          hoa_monthly?: number
          hud_area_code?: string | null
          id?: string
          insurance_annual?: number
          interest_rate?: number
          monthly_cashflow?: number | null
          monthly_rent: number
          noi_annual?: number | null
          notes?: string | null
          organization_id: string
          property_id?: string | null
          property_mgmt_pct?: number
          property_tax_rate_pct?: number
          purchase_price: number
          rehab_cost?: number
          rent_source?: string | null
          repairs_pct?: number
          scenario_name?: string
          traffic_light?: string | null
          updated_at?: string
          user_id: string
          vacancy_pct?: number
        }
        Update: {
          amortization_years?: number
          cap_rate?: number | null
          capex_pct?: number
          cash_invested?: number | null
          closing_cost_pct?: number
          coc_return?: number | null
          created_at?: string
          down_payment_pct?: number
          dscr?: number | null
          hoa_monthly?: number
          hud_area_code?: string | null
          id?: string
          insurance_annual?: number
          interest_rate?: number
          monthly_cashflow?: number | null
          monthly_rent?: number
          noi_annual?: number | null
          notes?: string | null
          organization_id?: string
          property_id?: string | null
          property_mgmt_pct?: number
          property_tax_rate_pct?: number
          purchase_price?: number
          rehab_cost?: number
          rent_source?: string | null
          repairs_pct?: number
          scenario_name?: string
          traffic_light?: string | null
          updated_at?: string
          user_id?: string
          vacancy_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_underwriting_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      site_submissions: {
        Row: {
          address: string | null
          asking_price: number | null
          city: string | null
          created_at: string
          email: string
          id: string
          kind: string
          message: string | null
          name: string
          phone: string | null
          property_type: string | null
          state: string | null
          timeline: string | null
        }
        Insert: {
          address?: string | null
          asking_price?: number | null
          city?: string | null
          created_at?: string
          email: string
          id?: string
          kind?: string
          message?: string | null
          name: string
          phone?: string | null
          property_type?: string | null
          state?: string | null
          timeline?: string | null
        }
        Update: {
          address?: string | null
          asking_price?: number | null
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          kind?: string
          message?: string | null
          name?: string
          phone?: string | null
          property_type?: string | null
          state?: string | null
          timeline?: string | null
        }
        Relationships: []
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
      get_default_org_id: { Args: never; Returns: string }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_klose_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin_or_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agent" | "buyer"
      archive_reason:
        | "price_too_high"
        | "not_motivated"
        | "legal_issues"
        | "no_response"
        | "title_problems"
        | "property_condition"
        | "lost_to_competitor"
        | "other"
      buyer_tier: "platinum" | "gold" | "silver" | "bronze"
      comp_status: "closed" | "pending" | "active" | "unknown"
      contract_status: "draft" | "sent" | "viewed" | "signed" | "completed"
      contract_type: "AB" | "BC" | "AMENDMENT" | "DC"
      deal_decision: "buy" | "negotiate" | "pass" | "undecided"
      deal_stage:
        | "under_analysis"
        | "offer"
        | "under_contract"
        | "rehab"
        | "listed"
        | "sold"
        | "passed"
      kcfy_priority: "low" | "normal" | "high" | "urgent"
      kcfy_status:
        | "pending"
        | "accepted"
        | "in_progress"
        | "closed"
        | "rejected"
        | "cancelled"
      lead_status:
        | "captacion"
        | "contacto"
        | "bajo_contrato"
        | "cesion"
        | "cerrado"
      org_member_role: "owner" | "admin" | "agent" | "viewer"
      organization_tier: "internal" | "free" | "pro" | "elite"
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
      tax_classification:
        | "individual"
        | "sole_proprietor"
        | "single_member_llc"
        | "c_corporation"
        | "s_corporation"
        | "partnership"
        | "trust_estate"
        | "llc_c"
        | "llc_s"
        | "llc_p"
        | "other"
      tin_type: "ssn" | "itin" | "ein"
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
      archive_reason: [
        "price_too_high",
        "not_motivated",
        "legal_issues",
        "no_response",
        "title_problems",
        "property_condition",
        "lost_to_competitor",
        "other",
      ],
      buyer_tier: ["platinum", "gold", "silver", "bronze"],
      comp_status: ["closed", "pending", "active", "unknown"],
      contract_status: ["draft", "sent", "viewed", "signed", "completed"],
      contract_type: ["AB", "BC", "AMENDMENT", "DC"],
      deal_decision: ["buy", "negotiate", "pass", "undecided"],
      deal_stage: [
        "under_analysis",
        "offer",
        "under_contract",
        "rehab",
        "listed",
        "sold",
        "passed",
      ],
      kcfy_priority: ["low", "normal", "high", "urgent"],
      kcfy_status: [
        "pending",
        "accepted",
        "in_progress",
        "closed",
        "rejected",
        "cancelled",
      ],
      lead_status: [
        "captacion",
        "contacto",
        "bajo_contrato",
        "cesion",
        "cerrado",
      ],
      org_member_role: ["owner", "admin", "agent", "viewer"],
      organization_tier: ["internal", "free", "pro", "elite"],
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
      tax_classification: [
        "individual",
        "sole_proprietor",
        "single_member_llc",
        "c_corporation",
        "s_corporation",
        "partnership",
        "trust_estate",
        "llc_c",
        "llc_s",
        "llc_p",
        "other",
      ],
      tin_type: ["ssn", "itin", "ein"],
    },
  },
} as const
