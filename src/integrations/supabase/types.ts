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
      activities: {
        Row: {
          changed_by: string | null
          client_id: string
          created_at: string
          description: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          organization_id: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          changed_by?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id?: string | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          changed_by?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_settings: {
        Row: {
          agency_name: string
          created_at: string
          headquarters: string | null
          id: string
          knowledge_base_name: string | null
          knowledge_base_text: string | null
          knowledge_base_url: string | null
          nuit: string | null
          representative_name: string | null
          representative_position: string | null
          updated_at: string
        }
        Insert: {
          agency_name?: string
          created_at?: string
          headquarters?: string | null
          id?: string
          knowledge_base_name?: string | null
          knowledge_base_text?: string | null
          knowledge_base_url?: string | null
          nuit?: string | null
          representative_name?: string | null
          representative_position?: string | null
          updated_at?: string
        }
        Update: {
          agency_name?: string
          created_at?: string
          headquarters?: string | null
          id?: string
          knowledge_base_name?: string | null
          knowledge_base_text?: string | null
          knowledge_base_url?: string | null
          nuit?: string | null
          representative_name?: string | null
          representative_position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          organization_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_message_favorites: {
        Row: {
          created_at: string
          id: string
          message_id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_message_favorites_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_message_favorites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          client_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          organization_id: string | null
          report: string | null
          stage: Database["public"]["Enums"]["journey_stage"]
          title: string
        }
        Insert: {
          client_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          report?: string | null
          stage: Database["public"]["Enums"]["journey_stage"]
          title: string
        }
        Update: {
          client_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          report?: string | null
          stage?: Database["public"]["Enums"]["journey_stage"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          organization_id: string
          sort_order: number
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          organization_id: string
          sort_order?: number
          stage: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          organization_id?: string
          sort_order?: number
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          bant_authority: number | null
          bant_budget: number | null
          bant_need: number | null
          bant_timeline: number | null
          company_name: string
          contact_name: string
          contract_name: string | null
          contract_url: string | null
          created_at: string
          current_stage: Database["public"]["Enums"]["journey_stage"]
          email: string | null
          id: string
          is_social_locked: boolean | null
          late_profile_id: string | null
          monthly_budget: number | null
          notes: string | null
          organization_id: string | null
          paid_traffic_budget: number | null
          paused: boolean
          paused_at: string | null
          paused_by: string | null
          phone: string | null
          qualification: Database["public"]["Enums"]["lead_qualification"]
          services: string[] | null
          social_disconnection_count: number | null
          source: string | null
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bant_authority?: number | null
          bant_budget?: number | null
          bant_need?: number | null
          bant_timeline?: number | null
          company_name: string
          contact_name: string
          contract_name?: string | null
          contract_url?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["journey_stage"]
          email?: string | null
          id?: string
          is_social_locked?: boolean | null
          late_profile_id?: string | null
          monthly_budget?: number | null
          notes?: string | null
          organization_id?: string | null
          paid_traffic_budget?: number | null
          paused?: boolean
          paused_at?: string | null
          paused_by?: string | null
          phone?: string | null
          qualification?: Database["public"]["Enums"]["lead_qualification"]
          services?: string[] | null
          social_disconnection_count?: number | null
          source?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bant_authority?: number | null
          bant_budget?: number | null
          bant_need?: number | null
          bant_timeline?: number | null
          company_name?: string
          contact_name?: string
          contract_name?: string | null
          contract_url?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["journey_stage"]
          email?: string | null
          id?: string
          is_social_locked?: boolean | null
          late_profile_id?: string | null
          monthly_budget?: number | null
          notes?: string | null
          organization_id?: string | null
          paid_traffic_budget?: number | null
          paused?: boolean
          paused_at?: string | null
          paused_by?: string | null
          phone?: string | null
          qualification?: Database["public"]["Enums"]["lead_qualification"]
          services?: string[] | null
          social_disconnection_count?: number | null
          source?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string
          document_type: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          document_type?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          document_type?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_plans: {
        Row: {
          client_id: string
          content: Json | null
          created_at: string
          created_by: string | null
          id: string
          month: number
          organization_id: string
          updated_at: string
          year: number
        }
        Insert: {
          client_id: string
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          organization_id: string
          updated_at?: string
          year: number
        }
        Update: {
          client_id?: string
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          organization_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "editorial_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_tasks: {
        Row: {
          client_id: string
          content_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          notes: string | null
          organization_id: string
          plan_id: string | null
          platform: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          plan_id?: string | null
          platform?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          plan_id?: string | null
          platform?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "editorial_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          verified?: boolean
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string
          organization_id: string | null
          status: string
          subject: string
          type: string
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message: string
          organization_id?: string | null
          status?: string
          subject: string
          type?: string
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string
          organization_id?: string | null
          status?: string
          subject?: string
          type?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          type: Database["public"]["Enums"]["financial_transaction_type"]
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          type: Database["public"]["Enums"]["financial_transaction_type"]
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          type?: Database["public"]["Enums"]["financial_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          created_at: string
          current_amount: number
          goal_type: Database["public"]["Enums"]["financial_goal_type"]
          id: string
          month: number | null
          name: string
          organization_id: string
          target_amount: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          current_amount?: number
          goal_type?: Database["public"]["Enums"]["financial_goal_type"]
          id?: string
          month?: number | null
          name: string
          organization_id: string
          target_amount: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          current_amount?: number
          goal_type?: Database["public"]["Enums"]["financial_goal_type"]
          id?: string
          month?: number | null
          name?: string
          organization_id?: string
          target_amount?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_projects: {
        Row: {
          budget: number
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          organization_id: string
          start_date: string
          status: Database["public"]["Enums"]["financial_project_status"]
          updated_at: string
        }
        Insert: {
          budget?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          organization_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["financial_project_status"]
          updated_at?: string
        }
        Update: {
          budget?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["financial_project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          notes: string | null
          organization_id: string
          payment_method: Database["public"]["Enums"]["financial_payment_method"]
          type: Database["public"]["Enums"]["financial_transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          notes?: string | null
          organization_id: string
          payment_method?: Database["public"]["Enums"]["financial_payment_method"]
          type: Database["public"]["Enums"]["financial_transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: Database["public"]["Enums"]["financial_payment_method"]
          type?: Database["public"]["Enums"]["financial_transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_template_settings: {
        Row: {
          created_at: string | null
          custom_layout: Json | null
          footer_text: string | null
          id: string
          organization_id: string
          paper_size: string | null
          primary_color: string | null
          show_logo: boolean | null
          show_watermark: boolean | null
          template_style: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_layout?: Json | null
          footer_text?: string | null
          id?: string
          organization_id: string
          paper_size?: string | null
          primary_color?: string | null
          show_logo?: boolean | null
          show_watermark?: boolean | null
          template_style?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_layout?: Json | null
          footer_text?: string | null
          id?: string
          organization_id?: string
          paper_size?: string | null
          primary_color?: string | null
          show_logo?: boolean | null
          show_watermark?: boolean | null
          template_style?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_template_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      link_analytics: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          link_block_id: string | null
          link_page_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          link_block_id?: string | null
          link_page_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          link_block_id?: string | null
          link_page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_analytics_link_block_id_fkey"
            columns: ["link_block_id"]
            isOneToOne: false
            referencedRelation: "link_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_analytics_link_page_id_fkey"
            columns: ["link_page_id"]
            isOneToOne: false
            referencedRelation: "link_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      link_blocks: {
        Row: {
          clicks: number | null
          content: Json
          created_at: string | null
          id: string
          is_enabled: boolean | null
          link_page_id: string
          sort_order: number
          style: Json | null
          type: string
          updated_at: string | null
        }
        Insert: {
          clicks?: number | null
          content?: Json
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          link_page_id: string
          sort_order?: number
          style?: Json | null
          type: string
          updated_at?: string | null
        }
        Update: {
          clicks?: number | null
          content?: Json
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          link_page_id?: string
          sort_order?: number
          style?: Json | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_blocks_link_page_id_fkey"
            columns: ["link_page_id"]
            isOneToOne: false
            referencedRelation: "link_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      link_pages: {
        Row: {
          bio: string | null
          client_id: string
          created_at: string | null
          custom_domain: string | null
          id: string
          is_published: boolean | null
          logo_url: string | null
          name: string
          organization_id: string
          slug: string
          theme: Json | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          client_id: string
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          is_published?: boolean | null
          logo_url?: string | null
          name: string
          organization_id: string
          slug: string
          theme?: Json | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          client_id?: string
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          is_published?: boolean | null
          logo_url?: string | null
          name?: string
          organization_id?: string
          slug?: string
          theme?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_pages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          id: string
          ip_address: string | null
          logged_in_at: string
          provider: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          provider?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          provider?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string
          feedback_id: string | null
          id: string
          message: string
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          feedback_id?: string | null
          id?: string
          message: string
          target_user_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          feedback_id?: string | null
          id?: string
          message?: string
          target_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedbacks"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invite_token: string
          invited_by: string
          organization_id: string
          privileges: string[] | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          invite_token?: string
          invited_by: string
          organization_id: string
          privileges?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invite_token?: string
          invited_by?: string
          organization_id?: string
          privileges?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          privileges: string[] | null
          removed_at: string | null
          removed_by: string | null
          privileges: string[] | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          organization_id: string
          privileges?: string[] | null
          removed_at?: string | null
          removed_by?: string | null
          privileges?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          organization_id?: string
          privileges?: string[] | null
          removed_at?: string | null
          removed_by?: string | null
          privileges?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
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
          created_at: string
          currency: string
          delete_scheduled_for: string | null
          deleted_at: string | null
          deleted_by: string | null
          headquarters: string | null
          id: string
          knowledge_base_name: string | null
          knowledge_base_text: string | null
          knowledge_base_url: string | null
          late_profile_id: string | null
          name: string
          nuit: string | null
          onboarding_completed: boolean | null
          owner_id: string
          payment_account_number: string | null
          payment_provider_name: string | null
          payment_recipient_name: string | null
          phone: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          representative_name: string | null
          representative_position: string | null
          slug: string
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          delete_scheduled_for?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          headquarters?: string | null
          id?: string
          knowledge_base_name?: string | null
          knowledge_base_text?: string | null
          knowledge_base_url?: string | null
          late_profile_id?: string | null
          name: string
          nuit?: string | null
          onboarding_completed?: boolean | null
          owner_id: string
          payment_account_number?: string | null
          payment_provider_name?: string | null
          payment_recipient_name?: string | null
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          representative_name?: string | null
          representative_position?: string | null
          slug: string
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          delete_scheduled_for?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          headquarters?: string | null
          id?: string
          knowledge_base_name?: string | null
          knowledge_base_text?: string | null
          knowledge_base_url?: string | null
          late_profile_id?: string | null
          name?: string
          nuit?: string | null
          onboarding_completed?: boolean | null
          owner_id?: string
          payment_account_number?: string | null
          payment_provider_name?: string | null
          payment_recipient_name?: string | null
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          representative_name?: string | null
          representative_position?: string | null
          slug?: string
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          lemonsqueezy_invoice_id: string | null
          lemonsqueezy_order_id: string | null
          organization_id: string
          payment_date: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          lemonsqueezy_invoice_id?: string | null
          lemonsqueezy_order_id?: string | null
          organization_id: string
          payment_date?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          lemonsqueezy_invoice_id?: string | null
          lemonsqueezy_order_id?: string | null
          organization_id?: string
          payment_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_number: string
          created_at: string
          id: string
          is_default: boolean
          organization_id: string
          provider_name: string
          recipient_name: string | null
          updated_at: string
        }
        Insert: {
          account_number: string
          created_at?: string
          id?: string
          is_default?: boolean
          organization_id: string
          provider_name: string
          recipient_name?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string
          created_at?: string
          id?: string
          is_default?: boolean
          organization_id?: string
          provider_name?: string
          recipient_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          can_export_data: boolean | null
          created_at: string | null
          has_editorial_module: boolean | null
          has_finance_module: boolean | null
          has_linktree_module: boolean | null
          has_social_inbox: boolean | null
          has_social_module: boolean | null
          has_studio_module: boolean | null
          id: string
          max_ai_messages_per_month: number | null
          max_clients: number | null
          max_contract_templates: number | null
          max_contracts_per_month: number | null
          max_link_pages: number | null
          max_social_accounts: number | null
          max_social_posts_per_month: number | null
          max_studio_generations: number | null
          max_team_members: number | null
          plan_type: Database["public"]["Enums"]["plan_type"]
        }
        Insert: {
          can_export_data?: boolean | null
          created_at?: string | null
          has_editorial_module?: boolean | null
          has_finance_module?: boolean | null
          has_linktree_module?: boolean | null
          has_social_inbox?: boolean | null
          has_social_module?: boolean | null
          has_studio_module?: boolean | null
          id?: string
          max_ai_messages_per_month?: number | null
          max_clients?: number | null
          max_contract_templates?: number | null
          max_contracts_per_month?: number | null
          max_link_pages?: number | null
          max_social_accounts?: number | null
          max_social_posts_per_month?: number | null
          max_studio_generations?: number | null
          max_team_members?: number | null
          plan_type: Database["public"]["Enums"]["plan_type"]
        }
        Update: {
          can_export_data?: boolean | null
          created_at?: string | null
          has_editorial_module?: boolean | null
          has_finance_module?: boolean | null
          has_linktree_module?: boolean | null
          has_social_inbox?: boolean | null
          has_social_module?: boolean | null
          has_studio_module?: boolean | null
          id?: string
          max_ai_messages_per_month?: number | null
          max_clients?: number | null
          max_contract_templates?: number | null
          max_contracts_per_month?: number | null
          max_link_pages?: number | null
          max_social_accounts?: number | null
          max_social_posts_per_month?: number | null
          max_studio_generations?: number | null
          max_team_members?: number | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          created_at: string | null
          current_organization_id: string | null
          email: string | null
          full_name: string | null
          id: string
          last_notified_privileges: string[] | null
          last_notified_role: Database["public"]["Enums"]["user_role"] | null
          organization_id: string | null
          privileges: string[] | null
          role: Database["public"]["Enums"]["user_role"]
          suspended: boolean
          suspended_at: string | null
          suspended_by: string | null
          tutorial_completed: boolean
          updated_at: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          created_at?: string | null
          current_organization_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_notified_privileges?: string[] | null
          last_notified_role?: Database["public"]["Enums"]["user_role"] | null
          organization_id?: string | null
          privileges?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          suspended?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          tutorial_completed?: boolean
          updated_at?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          created_at?: string | null
          current_organization_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_notified_privileges?: string[] | null
          last_notified_role?: Database["public"]["Enums"]["user_role"] | null
          organization_id?: string | null
          privileges?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          suspended?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          tutorial_completed?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_invoices: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          organization_id: string
          pdf_url: string | null
          services: Json
          status: string | null
          subtotal: number
          tax_amount: number | null
          tax_percentage: number | null
          total: number
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          organization_id: string
          pdf_url?: string | null
          services: Json
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          tax_percentage?: number | null
          total: number
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          organization_id?: string
          pdf_url?: string | null
          services?: Json
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_percentage?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          access_token: string | null
          account_name: string
          avatar_url: string | null
          client_id: string | null
          created_at: string
          facebook_page_id: string | null
          followers_count: number | null
          id: string
          is_connected: boolean
          late_account_id: string | null
          organization_id: string
          platform: string
          updated_at: string
          username: string
        }
        Insert: {
          access_token?: string | null
          account_name?: string
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          facebook_page_id?: string | null
          followers_count?: number | null
          id?: string
          is_connected?: boolean
          late_account_id?: string | null
          organization_id: string
          platform: string
          updated_at?: string
          username?: string
        }
        Update: {
          access_token?: string | null
          account_name?: string
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          facebook_page_id?: string | null
          followers_count?: number | null
          id?: string
          is_connected?: boolean
          late_account_id?: string | null
          organization_id?: string
          platform?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_messages: {
        Row: {
          client_id: string | null
          content: string
          created_at: string
          external_id: string | null
          id: string
          is_read: boolean
          message_type: string
          organization_id: string
          platform: string
          post_id: string | null
          received_at: string
          replied_at: string | null
          reply_content: string | null
          sender_avatar_url: string | null
          sender_name: string
          sender_username: string | null
          social_account_id: string
        }
        Insert: {
          client_id?: string | null
          content: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          organization_id: string
          platform: string
          post_id?: string | null
          received_at?: string
          replied_at?: string | null
          reply_content?: string | null
          sender_avatar_url?: string | null
          sender_name: string
          sender_username?: string | null
          social_account_id: string
        }
        Update: {
          client_id?: string | null
          content?: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          organization_id?: string
          platform?: string
          post_id?: string | null
          received_at?: string
          replied_at?: string | null
          reply_content?: string | null
          sender_avatar_url?: string | null
          sender_name?: string
          sender_username?: string | null
          social_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          approval_token: string | null
          approved_at: string | null
          approved_by: string | null
          client_id: string | null
          content: string
          content_type: string
          created_at: string
          created_by: string | null
          cta_type: string | null
          cta_value: string | null
          hashtags: string[] | null
          id: string
          late_post_id: string | null
          location: string | null
          media_urls: Json | null
          metrics: Json | null
          notes: string | null
          organization_id: string
          platforms: string[]
          published_at: string | null
          rejection_reason: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          content?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          cta_type?: string | null
          cta_value?: string | null
          hashtags?: string[] | null
          id?: string
          late_post_id?: string | null
          location?: string | null
          media_urls?: Json | null
          metrics?: Json | null
          notes?: string | null
          organization_id: string
          platforms?: string[]
          published_at?: string | null
          rejection_reason?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          content?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          cta_type?: string | null
          cta_value?: string | null
          hashtags?: string[] | null
          id?: string
          late_post_id?: string | null
          location?: string | null
          media_urls?: Json | null
          metrics?: Json | null
          notes?: string | null
          organization_id?: string
          platforms?: string[]
          published_at?: string | null
          rejection_reason?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_ai_learnings: {
        Row: {
          content: string
          context: string | null
          created_at: string
          id: string
          learning_type: string
          project_id: string
          user_id: string
        }
        Insert: {
          content: string
          context?: string | null
          created_at?: string
          id?: string
          learning_type: string
          project_id: string
          user_id: string
        }
        Update: {
          content?: string
          context?: string | null
          created_at?: string
          id?: string
          learning_type?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_ai_learnings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_flyer_ratings: {
        Row: {
          created_at: string
          feedback: string | null
          flyer_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          flyer_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          flyer_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_flyer_ratings_flyer_id_fkey"
            columns: ["flyer_id"]
            isOneToOne: false
            referencedRelation: "studio_flyers"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_flyers: {
        Row: {
          created_at: string
          created_by: string
          generation_mode: string | null
          id: string
          image_url: string
          model: string | null
          niche: string | null
          organization_id: string
          project_id: string
          prompt: string
          size: string | null
          style: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          generation_mode?: string | null
          id?: string
          image_url: string
          model?: string | null
          niche?: string | null
          organization_id: string
          project_id: string
          prompt: string
          size?: string | null
          style?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          generation_mode?: string | null
          id?: string
          image_url?: string
          model?: string | null
          niche?: string | null
          organization_id?: string
          project_id?: string
          prompt?: string
          size?: string | null
          style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_flyers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_flyers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "studio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_projects: {
        Row: {
          ai_instructions: string | null
          ai_restrictions: string | null
          client_id: string | null
          created_at: string
          created_by: string
          description: string | null
          font_family: string | null
          footer_text: string | null
          id: string
          logo_images: string[] | null
          name: string
          niche: string | null
          organization_id: string
          primary_color: string | null
          reference_images: string[] | null
          secondary_color: string | null
          template_image: string | null
          updated_at: string
        }
        Insert: {
          ai_instructions?: string | null
          ai_restrictions?: string | null
          client_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          font_family?: string | null
          footer_text?: string | null
          id?: string
          logo_images?: string[] | null
          name: string
          niche?: string | null
          organization_id: string
          primary_color?: string | null
          reference_images?: string[] | null
          secondary_color?: string | null
          template_image?: string | null
          updated_at?: string
        }
        Update: {
          ai_instructions?: string | null
          ai_restrictions?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          font_family?: string | null
          footer_text?: string | null
          id?: string
          logo_images?: string[] | null
          name?: string
          niche?: string | null
          organization_id?: string
          primary_color?: string | null
          reference_images?: string[] | null
          secondary_color?: string | null
          template_image?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      study_suggestions: {
        Row: {
          ai_generated: boolean | null
          category: string
          created_at: string
          description: string | null
          difficulty_level: string | null
          id: string
          organization_id: string | null
          source: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          category: string
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          organization_id?: string | null
          source?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          category?: string
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          organization_id?: string | null
          source?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          lemonsqueezy_customer_id: string | null
          lemonsqueezy_order_id: string | null
          lemonsqueezy_product_id: string | null
          lemonsqueezy_subscription_id: string | null
          lemonsqueezy_variant_id: string | null
          organization_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          lemonsqueezy_customer_id?: string | null
          lemonsqueezy_order_id?: string | null
          lemonsqueezy_product_id?: string | null
          lemonsqueezy_subscription_id?: string | null
          lemonsqueezy_variant_id?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          lemonsqueezy_customer_id?: string | null
          lemonsqueezy_order_id?: string | null
          lemonsqueezy_product_id?: string | null
          lemonsqueezy_subscription_id?: string | null
          lemonsqueezy_variant_id?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          organization_id: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          created_at: string | null
          feature_type: string
          id: string
          organization_id: string
          period_end: string
          period_start: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          feature_type: string
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          feature_type?: string
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      check_invite_email_exists: { Args: { token: string }; Returns: boolean }
      cleanup_old_support_tickets: { Args: never; Returns: undefined }
      generate_slug: { Args: { name: string }; Returns: string }
      get_current_user_email: { Args: never; Returns: string }
      get_or_create_usage: {
        Args: { p_feature_type: string; p_organization_id: string }
        Returns: number
      }
      get_public_link_page: {
        Args: { p_org_slug: string; p_page_slug: string }
        Returns: Json
      }
      get_user_organization_id: { Args: { user_uuid: string }; Returns: string }
      get_user_organizations: {
        Args: { user_uuid: string }
        Returns: {
          organization_id: string
          organization_name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      has_active_subscription: { Args: { org_uuid: string }; Returns: boolean }
      has_pending_invite: { Args: { org_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { p_feature_type: string; p_organization_id: string }
        Returns: number
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      remove_from_team: {
        Args: {
          member_user_id: string
          org_uuid: string
          removed_by_user_id: string
        }
        Returns: boolean
      }
      respond_to_social_post_approval: {
        Args: {
          p_approver_name?: string
          p_rejection_reason?: string
          p_status: string
          p_token: string
        }
        Returns: undefined
      }
      restore_organization: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      schedule_organization_deletion: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      set_current_organization: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      user_belongs_to_org: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      user_is_member_of_org: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
      user_owns_contract: { Args: { contract_path: string }; Returns: boolean }
    }
    Enums: {
      account_type: "owner" | "collaborator"
      activity_type:
      | "call"
      | "email"
      | "meeting"
      | "note"
      | "task"
      | "milestone"
      | "field_change"
      | "stage_change"
      | "status_change"
      | "task_completed"
      | "task_uncompleted"
      app_role: "admin" | "moderator" | "user" | "proprietor"
      financial_goal_type: "monthly" | "quarterly" | "yearly"
      financial_payment_method:
      | "transfer"
      | "mpesa"
      | "emola"
      | "cash"
      | "other"
      | "cheque"
      financial_project_status:
      | "planning"
      | "in_progress"
      | "completed"
      | "cancelled"
      financial_transaction_type: "income" | "expense"
      journey_stage:
      | "prospeccao"
      | "reuniao"
      | "contratacao"
      | "producao"
      | "trafego"
      | "retencao"
      | "fidelizacao"
      lead_qualification: "cold" | "warm" | "hot" | "qualified"
      plan_type: "free" | "starter" | "pro" | "agency"
      subscription_status:
      | "trialing"
      | "active"
      | "past_due"
      | "cancelled"
      | "expired"
      user_role: "sales" | "operations" | "campaign_management" | "admin"
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
      account_type: ["owner", "collaborator"],
      activity_type: [
        "call",
        "email",
        "meeting",
        "note",
        "task",
        "milestone",
        "field_change",
        "stage_change",
        "status_change",
        "task_completed",
        "task_uncompleted",
      ],
      app_role: ["admin", "moderator", "user", "proprietor"],
      financial_goal_type: ["monthly", "quarterly", "yearly"],
      financial_payment_method: [
        "transfer",
        "mpesa",
        "emola",
        "cash",
        "other",
        "cheque",
      ],
      financial_project_status: [
        "planning",
        "in_progress",
        "completed",
        "cancelled",
      ],
      financial_transaction_type: ["income", "expense"],
      journey_stage: [
        "prospeccao",
        "reuniao",
        "contratacao",
        "producao",
        "trafego",
        "retencao",
        "fidelizacao",
      ],
      lead_qualification: ["cold", "warm", "hot", "qualified"],
      plan_type: ["free", "starter", "pro", "agency"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "cancelled",
        "expired",
      ],
      user_role: ["sales", "operations", "campaign_management", "admin"],
    },
  },
} as const
