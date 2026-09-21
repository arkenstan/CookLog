export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cook_events: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["cook_event_kind"]
          meal_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["cook_event_kind"]
          meal_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["cook_event_kind"]
          meal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cook_events_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "daily_kitchen_docket"
            referencedColumns: ["meal_id"]
          },
          {
            foreignKeyName: "cook_events_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      event_entries: {
        Row: {
          amount: number
          item_id: string
          meal_id: string
          source: Database["public"]["Enums"]["entry_source"]
          user_id: string
        }
        Insert: {
          amount: number
          item_id: string
          meal_id: string
          source?: Database["public"]["Enums"]["entry_source"]
          user_id: string
        }
        Update: {
          amount?: number
          item_id?: string
          meal_id?: string
          source?: Database["public"]["Enums"]["entry_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "docket_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "event_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_entries_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "daily_kitchen_docket"
            referencedColumns: ["meal_id"]
          },
          {
            foreignKeyName: "event_entries_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          dinner_cutoff: string
          id: string
          invite_code: string
          lunch_cutoff: string
          name: string
          timezone: string
        }
        Insert: {
          created_at?: string
          dinner_cutoff?: string
          id?: string
          invite_code?: string
          lunch_cutoff?: string
          name: string
          timezone?: string
        }
        Update: {
          created_at?: string
          dinner_cutoff?: string
          id?: string
          invite_code?: string
          lunch_cutoff?: string
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          household_id: string
          id: string
          name: string
          status: Database["public"]["Enums"]["stock_status"]
        }
        Insert: {
          household_id: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["stock_status"]
        }
        Update: {
          household_id?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["stock_status"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          kind: Database["public"]["Enums"]["item_kind"]
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          kind: Database["public"]["Enums"]["item_kind"]
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["item_kind"]
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          created_by: string | null
          cutoff_at: string
          household_id: string
          id: string
          starts_at: string
          status: Database["public"]["Enums"]["meal_status"]
          title: string
          type: Database["public"]["Enums"]["meal_type"]
        }
        Insert: {
          created_by?: string | null
          cutoff_at: string
          household_id: string
          id?: string
          starts_at: string
          status?: Database["public"]["Enums"]["meal_status"]
          title?: string
          type: Database["public"]["Enums"]["meal_type"]
        }
        Update: {
          created_by?: string | null
          cutoff_at?: string
          household_id?: string
          id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["meal_status"]
          title?: string
          type?: Database["public"]["Enums"]["meal_type"]
        }
        Relationships: [
          {
            foreignKeyName: "meals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          allergies: string[]
          user_id: string
        }
        Insert: {
          allergies?: string[]
          user_id: string
        }
        Update: {
          allergies?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_household_id: string | null
          created_at: string
          device_token: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          active_household_id?: string | null
          created_at?: string
          device_token?: string | null
          id: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          active_household_id?: string | null
          created_at?: string
          device_token?: string | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["active_household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      regulars: {
        Row: {
          amount: number
          item_id: string
          user_id: string
        }
        Insert: {
          amount: number
          item_id: string
          user_id: string
        }
        Update: {
          amount?: number
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulars_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "docket_items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "regulars_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          meal_id: string
          status: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Insert: {
          meal_id: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Update: {
          meal_id?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "daily_kitchen_docket"
            referencedColumns: ["meal_id"]
          },
          {
            foreignKeyName: "rsvps_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_kitchen_docket: {
        Row: {
          allergies: string[] | null
          cutoff_at: string | null
          household_id: string | null
          meal_id: string | null
          people_in: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["meal_status"] | null
          title: string | null
          type: Database["public"]["Enums"]["meal_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "meals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      docket_items: {
        Row: {
          contributors: number | null
          household_id: string | null
          item_id: string | null
          kind: Database["public"]["Enums"]["item_kind"] | null
          meal_id: string | null
          name: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_entries_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "daily_kitchen_docket"
            referencedColumns: ["meal_id"]
          },
          {
            foreignKeyName: "event_entries_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_regulars: {
        Args: { p_meal: string; p_user: string }
        Returns: undefined
      }
      create_household: {
        Args: { p_name: string }
        Returns: {
          created_at: string
          dinner_cutoff: string
          id: string
          invite_code: string
          lunch_cutoff: string
          name: string
          timezone: string
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_meal_event: {
        Args: {
          p_cutoff_at: string
          p_starts_at: string
          p_title: string
          p_type: Database["public"]["Enums"]["meal_type"]
        }
        Returns: {
          created_by: string | null
          cutoff_at: string
          household_id: string
          id: string
          starts_at: string
          status: Database["public"]["Enums"]["meal_status"]
          title: string
          type: Database["public"]["Enums"]["meal_type"]
        }
        SetofOptions: {
          from: "*"
          to: "meals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_household: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_member: { Args: { hid: string }; Returns: boolean }
      join_household: { Args: { p_code: string }; Returns: string }
      set_active_household: {
        Args: { p_household: string }
        Returns: undefined
      }
      set_availability: {
        Args: {
          p_meal: string
          p_status: Database["public"]["Enums"]["rsvp_status"]
        }
        Returns: undefined
      }
      shares_household: { Args: { uid: string }; Returns: boolean }
    }
    Enums: {
      cook_event_kind: "arriving" | "ready" | "cannot_make"
      entry_source: "regular" | "manual"
      item_kind: "count" | "portion"
      meal_status: "pending" | "locked" | "cooked"
      meal_type: "lunch" | "dinner" | "other"
      rsvp_status: "in" | "out"
      stock_status: "stocked" | "missing"
      user_role: "resident" | "cook"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cook_event_kind: ["arriving", "ready", "cannot_make"],
      entry_source: ["regular", "manual"],
      item_kind: ["count", "portion"],
      meal_status: ["pending", "locked", "cooked"],
      meal_type: ["lunch", "dinner", "other"],
      rsvp_status: ["in", "out"],
      stock_status: ["stocked", "missing"],
      user_role: ["resident", "cook"],
    },
  },
} as const

