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
      activities: {
        Row: {
          company_id: string | null
          completed: boolean | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          opportunity_id: string | null
          priority: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          opportunity_id?: string | null
          priority?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          opportunity_id?: string | null
          priority?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          messages: Json
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          messages?: Json
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          messages?: Json
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backups: {
        Row: {
          backup_type: string | null
          created_at: string | null
          expires_at: string | null
          file_size: number | null
          file_url: string
          id: string
          includes: string[] | null
          status: string | null
          total_records: number | null
          user_id: string
        }
        Insert: {
          backup_type?: string | null
          created_at?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          includes?: string[] | null
          status?: string | null
          total_records?: number | null
          user_id: string
        }
        Update: {
          backup_type?: string | null
          created_at?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          includes?: string[] | null
          status?: string | null
          total_records?: number | null
          user_id?: string
        }
        Relationships: []
      }
      branding: {
        Row: {
          company_name: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          domain: string | null
          employee_count: number | null
          id: string
          industry: string | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          phone: string | null
          revenue: number | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          revenue?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          revenue?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      contact_documents: {
        Row: {
          contact_id: string
          created_at: string | null
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          description?: string | null
          document_type?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          mime_type: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          department: string | null
          email: string
          first_name: string | null
          id: string
          job_title: string | null
          last_contacted_at: string | null
          last_name: string | null
          linkedin_url: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicates: {
        Row: {
          created_at: string | null
          entity_id_1: string
          entity_id_2: string
          entity_type: string
          id: string
          matching_fields: string[] | null
          merged_into: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          similarity_score: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id_1: string
          entity_id_2: string
          entity_type: string
          id?: string
          matching_fields?: string[] | null
          merged_into?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id_1?: string
          entity_id_2?: string
          entity_type?: string
          id?: string
          matching_fields?: string[] | null
          merged_into?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_score?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          entity_type: string
          error_message: string | null
          expires_at: string | null
          file_size: number | null
          file_url: string | null
          filters: Json | null
          format: string | null
          id: string
          progress: number | null
          status: string | null
          total_records: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          entity_type: string
          error_message?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_url?: string | null
          filters?: Json | null
          format?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          total_records?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          entity_type?: string
          error_message?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_url?: string | null
          filters?: Json | null
          format?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          total_records?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          column_mapping: Json | null
          completed_at: string | null
          created_at: string | null
          entity_type: string
          errors: Json | null
          failed_rows: number | null
          file_size: number | null
          filename: string
          id: string
          import_settings: Json | null
          processed_rows: number | null
          progress: number | null
          skipped_rows: number | null
          started_at: string | null
          status: string | null
          successful_rows: number | null
          total_rows: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string | null
          entity_type: string
          errors?: Json | null
          failed_rows?: number | null
          file_size?: number | null
          filename: string
          id?: string
          import_settings?: Json | null
          processed_rows?: number | null
          progress?: number | null
          skipped_rows?: number | null
          started_at?: string | null
          status?: string | null
          successful_rows?: number | null
          total_rows?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string | null
          entity_type?: string
          errors?: Json | null
          failed_rows?: number | null
          file_size?: number | null
          filename?: string
          id?: string
          import_settings?: Json | null
          processed_rows?: number | null
          progress?: number | null
          skipped_rows?: number | null
          started_at?: string | null
          status?: string | null
          successful_rows?: number | null
          total_rows?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          access_token: string | null
          created_at: string | null
          error_message: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          metadata: Json | null
          provider: string
          refresh_token: string | null
          sync_status: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          provider: string
          refresh_token?: string | null
          sync_status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          provider?: string
          refresh_token?: string | null
          sync_status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          browser_notifications: boolean | null
          created_at: string | null
          deal_updates: boolean | null
          email_notifications: boolean | null
          email_sync: boolean | null
          id: string
          new_contacts: boolean | null
          reminder_hours: number | null
          task_reminders: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          browser_notifications?: boolean | null
          created_at?: string | null
          deal_updates?: boolean | null
          email_notifications?: boolean | null
          email_sync?: boolean | null
          id?: string
          new_contacts?: boolean | null
          reminder_hours?: number | null
          task_reminders?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          browser_notifications?: boolean | null
          created_at?: string | null
          deal_updates?: boolean | null
          email_notifications?: boolean | null
          email_sync?: boolean | null
          id?: string
          new_contacts?: boolean | null
          reminder_hours?: number | null
          task_reminders?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          priority: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          priority?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          priority?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          closed_at: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          pipeline_id: string | null
          probability: number | null
          stage_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          pipeline_id?: string | null
          probability?: number | null
          stage_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          pipeline_id?: string | null
          probability?: number | null
          stage_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stages: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_closed_lost: boolean | null
          is_closed_won: boolean | null
          name: string
          pipeline_id: string
          position: number
          probability: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_closed_lost?: boolean | null
          is_closed_won?: boolean | null
          name: string
          pipeline_id: string
          position: number
          probability?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_closed_lost?: boolean | null
          is_closed_won?: boolean | null
          name?: string
          pipeline_id?: string
          position?: number
          probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_entries: {
        Row: {
          action_items: Json | null
          body: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          entry_type: string
          id: string
          metadata: Json | null
          occurred_at: string | null
          opportunity_id: string | null
          participants: Json | null
          source: string | null
          subject: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          body?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          entry_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          opportunity_id?: string | null
          participants?: Json | null
          source?: string | null
          subject?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          action_items?: Json | null
          body?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          entry_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          opportunity_id?: string | null
          participants?: Json | null
          source?: string | null
          subject?: string | null
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_entries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_entries_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
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
