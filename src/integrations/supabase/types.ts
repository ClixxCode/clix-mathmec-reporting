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
      campaign_narratives: {
        Row: {
          ai_generated: boolean
          change_summary: Json | null
          created_at: string
          id: string
          is_edited: boolean
          month_year: string
          narrative_text: string
          performance_context: Json | null
          updated_at: string
          uploaded_at: string | null
          uploaded_content: string | null
          uploaded_filename: string | null
        }
        Insert: {
          ai_generated?: boolean
          change_summary?: Json | null
          created_at?: string
          id?: string
          is_edited?: boolean
          month_year: string
          narrative_text: string
          performance_context?: Json | null
          updated_at?: string
          uploaded_at?: string | null
          uploaded_content?: string | null
          uploaded_filename?: string | null
        }
        Update: {
          ai_generated?: boolean
          change_summary?: Json | null
          created_at?: string
          id?: string
          is_edited?: boolean
          month_year?: string
          narrative_text?: string
          performance_context?: Json | null
          updated_at?: string
          uploaded_at?: string | null
          uploaded_content?: string | null
          uploaded_filename?: string | null
        }
        Relationships: []
      }
      ctm_calls: {
        Row: {
          ai_summary: string | null
          answered: boolean | null
          call_id: string
          called_at: string | null
          caller_number: string | null
          campaign: string | null
          created_at: string
          duration: number | null
          gclid: string | null
          id: string
          location_url: string | null
          raw_data: Json
          recording_url: string | null
          score: number | null
          source: string | null
          talk_time: number | null
          tracking_number: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          answered?: boolean | null
          call_id: string
          called_at?: string | null
          caller_number?: string | null
          campaign?: string | null
          created_at?: string
          duration?: number | null
          gclid?: string | null
          id?: string
          location_url?: string | null
          raw_data?: Json
          recording_url?: string | null
          score?: number | null
          source?: string | null
          talk_time?: number | null
          tracking_number?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          answered?: boolean | null
          call_id?: string
          called_at?: string | null
          caller_number?: string | null
          campaign?: string | null
          created_at?: string
          duration?: number | null
          gclid?: string | null
          id?: string
          location_url?: string | null
          raw_data?: Json
          recording_url?: string | null
          score?: number | null
          source?: string | null
          talk_time?: number | null
          tracking_number?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_connected: boolean
          last_sync_at: string | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync_at?: string | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync_at?: string | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_ads_changes: {
        Row: {
          ad_group: string | null
          campaign: string | null
          change_category: string | null
          change_date: string
          change_description: string
          created_at: string
          id: string
          raw_data: Json
          user_email: string | null
        }
        Insert: {
          ad_group?: string | null
          campaign?: string | null
          change_category?: string | null
          change_date: string
          change_description: string
          created_at?: string
          id?: string
          raw_data: Json
          user_email?: string | null
        }
        Update: {
          ad_group?: string | null
          campaign?: string | null
          change_category?: string | null
          change_date?: string
          change_description?: string
          created_at?: string
          id?: string
          raw_data?: Json
          user_email?: string | null
        }
        Relationships: []
      }
      google_ads_geo_performance: {
        Row: {
          clicks: number
          conversions: number
          cost: number
          cost_per_conversion: number | null
          created_at: string
          ctr: number | null
          currency_code: string | null
          id: string
          impressions: number
          location: string
          metro_area: string
          raw_data: Json | null
          region: string | null
          report_month: string
        }
        Insert: {
          clicks?: number
          conversions?: number
          cost?: number
          cost_per_conversion?: number | null
          created_at?: string
          ctr?: number | null
          currency_code?: string | null
          id?: string
          impressions?: number
          location: string
          metro_area: string
          raw_data?: Json | null
          region?: string | null
          report_month: string
        }
        Update: {
          clicks?: number
          conversions?: number
          cost?: number
          cost_per_conversion?: number | null
          created_at?: string
          ctr?: number | null
          currency_code?: string | null
          id?: string
          impressions?: number
          location?: string
          metro_area?: string
          raw_data?: Json | null
          region?: string | null
          report_month?: string
        }
        Relationships: []
      }
      google_ads_performance: {
        Row: {
          avg_cpc: number | null
          campaign: string
          clicks: number
          conversion_rate: number | null
          conversions: number
          cost: number
          cost_per_conversion: number | null
          created_at: string
          currency_code: string | null
          date: string
          id: string
          impressions: number
        }
        Insert: {
          avg_cpc?: number | null
          campaign: string
          clicks?: number
          conversion_rate?: number | null
          conversions?: number
          cost?: number
          cost_per_conversion?: number | null
          created_at?: string
          currency_code?: string | null
          date: string
          id?: string
          impressions?: number
        }
        Update: {
          avg_cpc?: number | null
          campaign?: string
          clicks?: number
          conversion_rate?: number | null
          conversions?: number
          cost?: number
          cost_per_conversion?: number | null
          created_at?: string
          currency_code?: string | null
          date?: string
          id?: string
          impressions?: number
        }
        Relationships: []
      }
      hubspot_contacts: {
        Row: {
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          hubspot_create_date: string | null
          id: string
          last_name: string | null
          lead_status: string | null
          lifecycle_stage: string | null
          message: string | null
          original_traffic_source: string | null
          phone_number: string | null
          quality_analysis: Json | null
          quality_score: number | null
          raw_data: Json
          record_id: string
          state_region: string | null
          traffic_source_drill_down_1: string | null
          traffic_source_drill_down_2: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          hubspot_create_date?: string | null
          id?: string
          last_name?: string | null
          lead_status?: string | null
          lifecycle_stage?: string | null
          message?: string | null
          original_traffic_source?: string | null
          phone_number?: string | null
          quality_analysis?: Json | null
          quality_score?: number | null
          raw_data: Json
          record_id: string
          state_region?: string | null
          traffic_source_drill_down_1?: string | null
          traffic_source_drill_down_2?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          hubspot_create_date?: string | null
          id?: string
          last_name?: string | null
          lead_status?: string | null
          lifecycle_stage?: string | null
          message?: string | null
          original_traffic_source?: string | null
          phone_number?: string | null
          quality_analysis?: Json | null
          quality_score?: number | null
          raw_data?: Json
          record_id?: string
          state_region?: string | null
          traffic_source_drill_down_1?: string | null
          traffic_source_drill_down_2?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hubspot_deals: {
        Row: {
          amount: number | null
          associated_contact_id: string | null
          close_date: string | null
          closed_amount: number | null
          create_date: string | null
          created_at: string
          days_to_close: number | null
          deal_id: string
          deal_name: string | null
          deal_owner: string | null
          deal_stage: string | null
          id: string
          ip_city: string | null
          ip_country: string | null
          ip_state: string | null
          original_traffic_source: string | null
          pipeline: string | null
          raw_data: Json
          traffic_source_drill_down_1: string | null
          traffic_source_drill_down_2: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          associated_contact_id?: string | null
          close_date?: string | null
          closed_amount?: number | null
          create_date?: string | null
          created_at?: string
          days_to_close?: number | null
          deal_id: string
          deal_name?: string | null
          deal_owner?: string | null
          deal_stage?: string | null
          id?: string
          ip_city?: string | null
          ip_country?: string | null
          ip_state?: string | null
          original_traffic_source?: string | null
          pipeline?: string | null
          raw_data: Json
          traffic_source_drill_down_1?: string | null
          traffic_source_drill_down_2?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          associated_contact_id?: string | null
          close_date?: string | null
          closed_amount?: number | null
          create_date?: string | null
          created_at?: string
          days_to_close?: number | null
          deal_id?: string
          deal_name?: string | null
          deal_owner?: string | null
          deal_stage?: string | null
          id?: string
          ip_city?: string | null
          ip_country?: string | null
          ip_state?: string | null
          original_traffic_source?: string | null
          pipeline?: string | null
          raw_data?: Json
          traffic_source_drill_down_1?: string | null
          traffic_source_drill_down_2?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hubspot_leads: {
        Row: {
          associated_contact_id: string | null
          closed_won_amount: number | null
          created_at: string
          disqualification_reason: string | null
          first_outreach_date: string | null
          hubspot_create_date: string | null
          id: string
          lead_name: string | null
          lead_owner: string | null
          lead_source: string | null
          lead_stage: string | null
          open_deal_amount: number | null
          product_requested: string | null
          raw_data: Json
          record_id: string
          time_to_first_touch: string | null
          updated_at: string
        }
        Insert: {
          associated_contact_id?: string | null
          closed_won_amount?: number | null
          created_at?: string
          disqualification_reason?: string | null
          first_outreach_date?: string | null
          hubspot_create_date?: string | null
          id?: string
          lead_name?: string | null
          lead_owner?: string | null
          lead_source?: string | null
          lead_stage?: string | null
          open_deal_amount?: number | null
          product_requested?: string | null
          raw_data?: Json
          record_id: string
          time_to_first_touch?: string | null
          updated_at?: string
        }
        Update: {
          associated_contact_id?: string | null
          closed_won_amount?: number | null
          created_at?: string
          disqualification_reason?: string | null
          first_outreach_date?: string | null
          hubspot_create_date?: string | null
          id?: string
          lead_name?: string | null
          lead_owner?: string | null
          lead_source?: string | null
          lead_stage?: string | null
          open_deal_amount?: number | null
          product_requested?: string | null
          raw_data?: Json
          record_id?: string
          time_to_first_touch?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
