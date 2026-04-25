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
      academy_enrollments: {
        Row: {
          completed_at: string | null
          current_lesson_id: string | null
          enrolled_at: string
          id: string
          total_xp_earned: number
          track_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_lesson_id?: string | null
          enrolled_at?: string
          id?: string
          total_xp_earned?: number
          track_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_lesson_id?: string | null
          enrolled_at?: string
          id?: string
          total_xp_earned?: number
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_enrollments_current_lesson_id_fkey"
            columns: ["current_lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_enrollments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "academy_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_lesson_progress: {
        Row: {
          completed_at: string | null
          id: string
          lesson_id: string
          started_at: string
          status: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lesson_id: string
          started_at?: string
          status?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string | null
          id?: string
          lesson_id?: string
          started_at?: string
          status?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_lessons: {
        Row: {
          content_markdown: string
          created_at: string
          estimated_minutes: number | null
          id: string
          is_published: boolean
          lesson_order: number
          slug: string
          summary: string | null
          title: string
          track_id: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          content_markdown: string
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean
          lesson_order: number
          slug: string
          summary?: string | null
          title: string
          track_id: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          content_markdown?: string
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean
          lesson_order?: number
          slug?: string
          summary?: string | null
          title?: string
          track_id?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_lessons_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "academy_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quiz_attempts: {
        Row: {
          answers: Json
          attempted_at: string
          correct_count: number
          id: string
          lesson_id: string
          passed: boolean
          score_percent: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json
          attempted_at?: string
          correct_count: number
          id?: string
          lesson_id: string
          passed: boolean
          score_percent: number
          total_questions: number
          user_id: string
        }
        Update: {
          answers?: Json
          attempted_at?: string
          correct_count?: number
          id?: string
          lesson_id?: string
          passed?: boolean
          score_percent?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          lesson_id: string
          options: Json
          question: string
          question_order: number
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          lesson_id: string
          options: Json
          question: string
          question_order?: number
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          lesson_id?: string
          options?: Json
          question?: string
          question_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_tracks: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_published: boolean
          level_order: number
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          level_order: number
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          level_order?: number
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_demos: {
        Row: {
          agent_persona: string
          audio_path: string | null
          audio_url: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          language: string
          organization_id: string
          scenario_summary: string | null
          seller_persona: string
          status: string
          transcript: Json
          updated_at: string
        }
        Insert: {
          agent_persona: string
          audio_path?: string | null
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          language?: string
          organization_id?: string
          scenario_summary?: string | null
          seller_persona: string
          status?: string
          transcript: Json
          updated_at?: string
        }
        Update: {
          agent_persona?: string
          audio_path?: string | null
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          language?: string
          organization_id?: string
          scenario_summary?: string | null
          seller_persona?: string
          status?: string
          transcript?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_demos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          contract_data?: Json | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
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
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          contract_data?: Json | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string | null
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
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
          response: string | null
          sent_at: string
        }
        Insert: {
          buyer_id: string
          clicked_at?: string | null
          id?: string
          lead_id: string
          opened_at?: string | null
          organization_id?: string
          response?: string | null
          sent_at?: string
        }
        Update: {
          buyer_id?: string
          clicked_at?: string | null
          id?: string
          lead_id?: string
          opened_at?: string | null
          organization_id?: string
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
          {
            foreignKeyName: "deal_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          trigger_status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drip_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
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
          {
            foreignKeyName: "interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kcfy_requests: {
        Row: {
          accepted_at: string | null
          agreed_split_student: number | null
          closed_at: string | null
          created_at: string
          deal_value_estimate: number | null
          id: string
          klose_assignee_id: string | null
          lead_id: string
          notes: string | null
          organization_id: string
          priority: Database["public"]["Enums"]["kcfy_priority"]
          rejection_reason: string | null
          requested_by: string
          status: Database["public"]["Enums"]["kcfy_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          agreed_split_student?: number | null
          closed_at?: string | null
          created_at?: string
          deal_value_estimate?: number | null
          id?: string
          klose_assignee_id?: string | null
          lead_id: string
          notes?: string | null
          organization_id?: string
          priority?: Database["public"]["Enums"]["kcfy_priority"]
          rejection_reason?: string | null
          requested_by: string
          status?: Database["public"]["Enums"]["kcfy_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          agreed_split_student?: number | null
          closed_at?: string | null
          created_at?: string
          deal_value_estimate?: number | null
          id?: string
          klose_assignee_id?: string | null
          lead_id?: string
          notes?: string | null
          organization_id?: string
          priority?: Database["public"]["Enums"]["kcfy_priority"]
          rejection_reason?: string | null
          requested_by?: string
          status?: Database["public"]["Enums"]["kcfy_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kcfy_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_cleanup_log: {
        Row: {
          action: string
          created_at: string
          id: string
          lead_data: Json | null
          lead_id: string | null
          notes: string | null
          organization_id: string
          property_address: string | null
          property_city: string | null
          reason: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          lead_data?: Json | null
          lead_id?: string | null
          notes?: string | null
          organization_id?: string
          property_address?: string | null
          property_city?: string | null
          reason: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          lead_data?: Json | null
          lead_id?: string | null
          notes?: string | null
          organization_id?: string
          property_address?: string | null
          property_city?: string | null
          reason?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_cleanup_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
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
          {
            foreignKeyName: "lead_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          archive_notes: string | null
          archive_reason: Database["public"]["Enums"]["archive_reason"] | null
          archived_at: string | null
          assigned_agent_id: string | null
          assignment_fee: number | null
          closing_date: string | null
          created_at: string
          days_without_activity: number | null
          id: string
          last_contact_at: string | null
          listing_price: number | null
          next_follow_up_at: string | null
          offer_amount: number | null
          organization_id: string
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
          archive_notes?: string | null
          archive_reason?: Database["public"]["Enums"]["archive_reason"] | null
          archived_at?: string | null
          assigned_agent_id?: string | null
          assignment_fee?: number | null
          closing_date?: string | null
          created_at?: string
          days_without_activity?: number | null
          id?: string
          last_contact_at?: string | null
          listing_price?: number | null
          next_follow_up_at?: string | null
          offer_amount?: number | null
          organization_id?: string
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
          archive_notes?: string | null
          archive_reason?: Database["public"]["Enums"]["archive_reason"] | null
          archived_at?: string | null
          assigned_agent_id?: string | null
          assignment_fee?: number | null
          closing_date?: string | null
          created_at?: string
          days_without_activity?: number | null
          id?: string
          last_contact_at?: string | null
          listing_price?: number | null
          next_follow_up_at?: string | null
          offer_amount?: number | null
          organization_id?: string
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
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "property_analyses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
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
      realtors: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "realtors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
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
          {
            foreignKeyName: "seller_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          agent_score: number | null
          audio_url: string | null
          coaching_summary: string | null
          created_at: string
          difficulty: string | null
          duration_seconds: number | null
          elevenlabs_conversation_id: string | null
          final_offer: number | null
          id: string
          organization_id: string
          outcome: string | null
          persona: string
          raw_result_tag: string | null
          skill_scores: Json | null
          strengths: string[] | null
          transcript: Json | null
          user_id: string
          weaknesses: string[] | null
          would_close: boolean | null
        }
        Insert: {
          agent_score?: number | null
          audio_url?: string | null
          coaching_summary?: string | null
          created_at?: string
          difficulty?: string | null
          duration_seconds?: number | null
          elevenlabs_conversation_id?: string | null
          final_offer?: number | null
          id?: string
          organization_id?: string
          outcome?: string | null
          persona: string
          raw_result_tag?: string | null
          skill_scores?: Json | null
          strengths?: string[] | null
          transcript?: Json | null
          user_id: string
          weaknesses?: string[] | null
          would_close?: boolean | null
        }
        Update: {
          agent_score?: number | null
          audio_url?: string | null
          coaching_summary?: string | null
          created_at?: string
          difficulty?: string | null
          duration_seconds?: number | null
          elevenlabs_conversation_id?: string | null
          final_offer?: number | null
          id?: string
          organization_id?: string
          outcome?: string | null
          persona?: string
          raw_result_tag?: string | null
          skill_scores?: Json | null
          strengths?: string[] | null
          transcript?: Json | null
          user_id?: string
          weaknesses?: string[] | null
          would_close?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      dead_leads_analytics: {
        Row: {
          archive_reason: Database["public"]["Enums"]["archive_reason"] | null
          avg_days_stale: number | null
          avg_piw_score: number | null
          count: number | null
        }
        Relationships: []
      }
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
      has_completed_foundations: {
        Args: { _user_id: string }
        Returns: boolean
      }
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
      contract_status: "draft" | "sent" | "viewed" | "signed" | "completed"
      contract_type: "AB" | "BC" | "AMENDMENT"
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
      contract_status: ["draft", "sent", "viewed", "signed", "completed"],
      contract_type: ["AB", "BC", "AMENDMENT"],
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
    },
  },
} as const
