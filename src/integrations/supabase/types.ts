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
          next_follow_up_at: string | null
          offer_amount: number | null
          piw_score: number | null
          piw_score_factors: Json | null
          property_id: string
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
          next_follow_up_at?: string | null
          offer_amount?: number | null
          piw_score?: number | null
          piw_score_factors?: Json | null
          property_id: string
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
          next_follow_up_at?: string | null
          offer_amount?: number | null
          piw_score?: number | null
          piw_score_factors?: Json | null
          property_id?: string
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
          data_fetched_at: string | null
          data_source: string | null
          equity_percent: number | null
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
          mortgage_age_years: number | null
          neighborhood_vacancy_rate: number | null
          notes: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          owner_tenure_years: number | null
          owner_type: string | null
          price_growth_3yr: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          proximity_to_development: string | null
          repair_cost: number | null
          sqft: number | null
          state: string
          tax_debt: number | null
          tax_delinquent: boolean | null
          updated_at: string
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
          data_fetched_at?: string | null
          data_source?: string | null
          equity_percent?: number | null
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
          mortgage_age_years?: number | null
          neighborhood_vacancy_rate?: number | null
          notes?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_tenure_years?: number | null
          owner_type?: string | null
          price_growth_3yr?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          proximity_to_development?: string | null
          repair_cost?: number | null
          sqft?: number | null
          state?: string
          tax_debt?: number | null
          tax_delinquent?: boolean | null
          updated_at?: string
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
          data_fetched_at?: string | null
          data_source?: string | null
          equity_percent?: number | null
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
          mortgage_age_years?: number | null
          neighborhood_vacancy_rate?: number | null
          notes?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_tenure_years?: number | null
          owner_type?: string | null
          price_growth_3yr?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          proximity_to_development?: string | null
          repair_cost?: number | null
          sqft?: number | null
          state?: string
          tax_debt?: number | null
          tax_delinquent?: boolean | null
          updated_at?: string
          year_built?: number | null
          zip_code?: string
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
      [_ in never]: never
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
      property_type:
        | "single_family"
        | "multi_family"
        | "condo"
        | "townhouse"
        | "land"
        | "commercial"
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
      property_type: [
        "single_family",
        "multi_family",
        "condo",
        "townhouse",
        "land",
        "commercial",
      ],
    },
  },
} as const
