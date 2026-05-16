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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      approval_history: {
        Row: {
          action: Database["public"]["Enums"]["approval_action"]
          actor_id: string | null
          created_at: string
          from_role: Database["public"]["Enums"]["profile_role"] | null
          from_status: Database["public"]["Enums"]["profile_status"] | null
          id: string
          profile_id: string
          reason: string | null
          to_role: Database["public"]["Enums"]["profile_role"] | null
          to_status: Database["public"]["Enums"]["profile_status"] | null
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_action"]
          actor_id?: string | null
          created_at?: string
          from_role?: Database["public"]["Enums"]["profile_role"] | null
          from_status?: Database["public"]["Enums"]["profile_status"] | null
          id?: string
          profile_id: string
          reason?: string | null
          to_role?: Database["public"]["Enums"]["profile_role"] | null
          to_status?: Database["public"]["Enums"]["profile_status"] | null
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action"]
          actor_id?: string | null
          created_at?: string
          from_role?: Database["public"]["Enums"]["profile_role"] | null
          from_status?: Database["public"]["Enums"]["profile_status"] | null
          id?: string
          profile_id?: string
          reason?: string | null
          to_role?: Database["public"]["Enums"]["profile_role"] | null
          to_status?: Database["public"]["Enums"]["profile_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_attendances: {
        Row: {
          match_id: string
          profile_id: string
          responded_at: string
          response: Database["public"]["Enums"]["attendance_response"]
          updated_at: string
        }
        Insert: {
          match_id: string
          profile_id: string
          responded_at?: string
          response: Database["public"]["Enums"]["attendance_response"]
          updated_at?: string
        }
        Update: {
          match_id?: string
          profile_id?: string
          responded_at?: string
          response?: Database["public"]["Enums"]["attendance_response"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_attendances_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_attendances_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_attendances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_check_ins: {
        Row: {
          checked_in_at: string
          checked_in_by: string
          match_id: string
          player_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_in_by: string
          match_id: string
          player_id: string
        }
        Update: {
          checked_in_at?: string
          checked_in_by?: string
          match_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_check_ins_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_check_ins_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_check_ins_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_check_ins_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_scouts: {
        Row: {
          blue_cards: number
          draws: number
          goals: number
          match_id: string
          player_id: string
          red_cards: number
          updated_at: string
          updated_by: string
          wins: number
          yellow_cards: number
        }
        Insert: {
          blue_cards?: number
          draws?: number
          goals?: number
          match_id: string
          player_id: string
          red_cards?: number
          updated_at?: string
          updated_by: string
          wins?: number
          yellow_cards?: number
        }
        Update: {
          blue_cards?: number
          draws?: number
          goals?: number
          match_id?: string
          player_id?: string
          red_cards?: number
          updated_at?: string
          updated_by?: string
          wins?: number
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_scouts_check_in_fk"
            columns: ["match_id", "player_id"]
            isOneToOne: true
            referencedRelation: "match_check_ins"
            referencedColumns: ["match_id", "player_id"]
          },
          {
            foreignKeyName: "match_scouts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          created_by: string
          id: string
          match_date: string
          match_time: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          match_date: string
          match_time: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          match_date?: string
          match_time?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          is_monthly: boolean
          joined_at: string
          nickname: string | null
          player_status: Database["public"]["Enums"]["player_status"]
          player_status_changed_at: string | null
          player_status_note: string | null
          preferred_position: string | null
          profile_id: string
          shirt_number: number | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_monthly?: boolean
          joined_at?: string
          nickname?: string | null
          player_status?: Database["public"]["Enums"]["player_status"]
          player_status_changed_at?: string | null
          player_status_note?: string | null
          preferred_position?: string | null
          profile_id: string
          shirt_number?: number | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_monthly?: boolean
          joined_at?: string
          nickname?: string | null
          player_status?: Database["public"]["Enums"]["player_status"]
          player_status_changed_at?: string | null
          player_status_note?: string | null
          preferred_position?: string | null
          profile_id?: string
          shirt_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          denied_reason: string | null
          display_name: string
          email: string
          id: string
          is_admin: boolean
          onboarded_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"] | null
          status: Database["public"]["Enums"]["profile_status"]
          theme_preference: Database["public"]["Enums"]["theme_preference"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          denied_reason?: string | null
          display_name: string
          email: string
          id: string
          is_admin?: boolean
          onboarded_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["profile_role"] | null
          status?: Database["public"]["Enums"]["profile_status"]
          theme_preference?: Database["public"]["Enums"]["theme_preference"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          denied_reason?: string | null
          display_name?: string
          email?: string
          id?: string
          is_admin?: boolean
          onboarded_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["profile_role"] | null
          status?: Database["public"]["Enums"]["profile_status"]
          theme_preference?: Database["public"]["Enums"]["theme_preference"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      matches_with_counts: {
        Row: {
          created_at: string | null
          created_by: string | null
          declined_count: number | null
          going_count: number | null
          id: string | null
          match_date: string | null
          match_time: string | null
          maybe_count: number | null
          status: Database["public"]["Enums"]["match_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_update_player_position: {
        Args: { p_position?: string; p_target_profile: string }
        Returns: {
          archived_at: string | null
          created_at: string
          id: string
          is_monthly: boolean
          joined_at: string
          nickname: string | null
          player_status: Database["public"]["Enums"]["player_status"]
          player_status_changed_at: string | null
          player_status_note: string | null
          preferred_position: string | null
          profile_id: string
          shirt_number: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_player_status: {
        Args: {
          p_note?: string
          p_status: Database["public"]["Enums"]["player_status"]
          p_target_profile: string
        }
        Returns: {
          archived_at: string | null
          created_at: string
          id: string
          is_monthly: boolean
          joined_at: string
          nickname: string | null
          player_status: Database["public"]["Enums"]["player_status"]
          player_status_changed_at: string | null
          player_status_note: string | null
          preferred_position: string | null
          profile_id: string
          shirt_number: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_user: {
        Args: {
          p_role: Database["public"]["Enums"]["profile_role"]
          p_target: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          denied_reason: string | null
          display_name: string
          email: string
          id: string
          is_admin: boolean
          onboarded_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"] | null
          status: Database["public"]["Enums"]["profile_status"]
          theme_preference: Database["public"]["Enums"]["theme_preference"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      change_user_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["profile_role"]
          p_target: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          denied_reason: string | null
          display_name: string
          email: string
          id: string
          is_admin: boolean
          onboarded_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"] | null
          status: Database["public"]["Enums"]["profile_status"]
          theme_preference: Database["public"]["Enums"]["theme_preference"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_match: {
        Args: { p_match_id: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          match_date: string
          match_time: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_match: {
        Args: { p_match_date: string; p_match_time: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          match_date: string
          match_time: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_match: { Args: { p_match_id: string }; Returns: undefined }
      deny_user: {
        Args: { p_reason: string; p_target: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          denied_reason: string | null
          display_name: string
          email: string
          id: string
          is_admin: boolean
          onboarded_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"] | null
          status: Database["public"]["Enums"]["profile_status"]
          theme_preference: Database["public"]["Enums"]["theme_preference"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_player_detail: {
        Args: { p_target: string }
        Returns: {
          avatar_url: string
          birth_date: string
          display_name: string
          email: string
          is_admin: boolean
          joined_at: string
          member_since: string
          nickname: string
          phone: string
          player_status: Database["public"]["Enums"]["player_status"]
          preferred_position: string
          profile_id: string
        }[]
      }
      list_match_attendances: {
        Args: { p_match_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          nickname: string
          preferred_position: string
          profile_id: string
          responded_at: string
          response: Database["public"]["Enums"]["attendance_response"]
        }[]
      }
      list_match_check_in_candidates: {
        Args: { p_match_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          nickname: string
          player_id: string
          preferred_position: string
          profile_id: string
        }[]
      }
      list_match_check_ins: {
        Args: { p_match_id: string }
        Returns: {
          avatar_url: string
          checked_in_at: string
          display_name: string
          nickname: string
          player_id: string
          preferred_position: string
          profile_id: string
        }[]
      }
      list_match_scouts: {
        Args: { p_match_id: string }
        Returns: {
          avatar_url: string
          blue_cards: number
          check_in_count: number
          display_name: string
          draws: number
          goals: number
          nickname: string
          player_id: string
          preferred_position: string
          profile_id: string
          red_cards: number
          total_match_count: number
          wins: number
          yellow_cards: number
        }[]
      }
      list_players_public: {
        Args: never
        Returns: {
          avatar_url: string
          check_in_count: number
          display_name: string
          is_admin: boolean
          nickname: string
          player_status: Database["public"]["Enums"]["player_status"]
          preferred_position: string
          profile_id: string
          total_goals: number
          total_match_count: number
          total_points: number
        }[]
      }
      record_match_check_ins: {
        Args: { p_match_id: string; p_player_ids: string[] }
        Returns: number
      }
      record_match_scouts: {
        Args: { p_entries: Json; p_match_id: string }
        Returns: number
      }
      remove_match_check_in: {
        Args: { p_match_id: string; p_player_id: string }
        Returns: undefined
      }
      revoke_approval: {
        Args: { p_target: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          denied_reason: string | null
          display_name: string
          email: string
          id: string
          is_admin: boolean
          onboarded_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"] | null
          status: Database["public"]["Enums"]["profile_status"]
          theme_preference: Database["public"]["Enums"]["theme_preference"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_admin_flag: {
        Args: { p_target: string; p_value: boolean }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          denied_reason: string | null
          display_name: string
          email: string
          id: string
          is_admin: boolean
          onboarded_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"] | null
          status: Database["public"]["Enums"]["profile_status"]
          theme_preference: Database["public"]["Enums"]["theme_preference"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_my_attendance: {
        Args: {
          p_match_id: string
          p_response: Database["public"]["Enums"]["attendance_response"]
        }
        Returns: {
          match_id: string
          profile_id: string
          responded_at: string
          response: Database["public"]["Enums"]["attendance_response"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "match_attendances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_player_monthly: {
        Args: { p_target_player: string; p_value: boolean }
        Returns: {
          archived_at: string | null
          created_at: string
          id: string
          is_monthly: boolean
          joined_at: string
          nickname: string | null
          player_status: Database["public"]["Enums"]["player_status"]
          player_status_changed_at: string | null
          player_status_note: string | null
          preferred_position: string | null
          profile_id: string
          shirt_number: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_match_schedule: {
        Args: { p_match_date: string; p_match_id: string; p_match_time: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          match_date: string
          match_time: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_player: {
        Args: {
          p_nickname?: string
          p_preferred_position?: string
          p_shirt_number?: number
        }
        Returns: {
          archived_at: string | null
          created_at: string
          id: string
          is_monthly: boolean
          joined_at: string
          nickname: string | null
          player_status: Database["public"]["Enums"]["player_status"]
          player_status_changed_at: string | null
          player_status_note: string | null
          preferred_position: string | null
          profile_id: string
          shirt_number: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_profile: {
        Args: {
          p_avatar_url?: string
          p_birth_date?: string
          p_display_name: string
          p_phone?: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          denied_reason: string | null
          display_name: string
          email: string
          id: string
          is_admin: boolean
          onboarded_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"] | null
          status: Database["public"]["Enums"]["profile_status"]
          theme_preference: Database["public"]["Enums"]["theme_preference"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_theme_preference: {
        Args: { p_value: Database["public"]["Enums"]["theme_preference"] }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          denied_reason: string | null
          display_name: string
          email: string
          id: string
          is_admin: boolean
          onboarded_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"] | null
          status: Database["public"]["Enums"]["profile_status"]
          theme_preference: Database["public"]["Enums"]["theme_preference"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_player_status: {
        Args: {
          p_note?: string
          p_status: Database["public"]["Enums"]["player_status"]
          p_target_player: string
        }
        Returns: {
          archived_at: string | null
          created_at: string
          id: string
          is_monthly: boolean
          joined_at: string
          nickname: string | null
          player_status: Database["public"]["Enums"]["player_status"]
          player_status_changed_at: string | null
          player_status_note: string | null
          preferred_position: string | null
          profile_id: string
          shirt_number: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      approval_action:
        | "approved"
        | "denied"
        | "revoked"
        | "role_changed"
        | "admin_granted"
        | "admin_revoked"
        | "player_status_changed"
      attendance_response: "going" | "maybe" | "declined"
      match_status: "open" | "closed"
      player_status: "active" | "inactive" | "injured"
      profile_role: "player" | "spectator"
      profile_status: "pending" | "approved" | "denied"
      theme_preference: "light" | "dark"
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
      approval_action: [
        "approved",
        "denied",
        "revoked",
        "role_changed",
        "admin_granted",
        "admin_revoked",
        "player_status_changed",
      ],
      attendance_response: ["going", "maybe", "declined"],
      match_status: ["open", "closed"],
      player_status: ["active", "inactive", "injured"],
      profile_role: ["player", "spectator"],
      profile_status: ["pending", "approved", "denied"],
      theme_preference: ["light", "dark"],
    },
  },
} as const
