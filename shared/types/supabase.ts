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
      healthcheck: {
        Row: {
          config_name: Database["public"]["Enums"]["thealthcheck"]
          config_value: string
          id: number
        }
        Insert: {
          config_name: Database["public"]["Enums"]["thealthcheck"]
          config_value: string
          id?: number
        }
        Update: {
          config_name?: Database["public"]["Enums"]["thealthcheck"]
          config_value?: string
          id?: number
        }
        Relationships: []
      }
      pluto_migrations: {
        Row: {
          applied_at: string
          id: number
          layer_name: string
        }
        Insert: {
          applied_at?: string
          id?: number
          layer_name: string
        }
        Update: {
          applied_at?: string
          id?: number
          layer_name?: string
        }
        Relationships: []
      }
      product_availability: {
        Row: {
          created_at: string
          id: number
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: never
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: never
          label?: string
          slug?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          description: string | null
          id: number
          label: string
          slug: string
        }
        Insert: {
          description?: string | null
          id?: never
          label: string
          slug: string
        }
        Update: {
          description?: string | null
          id?: never
          label?: string
          slug?: string
        }
        Relationships: []
      }
      product_media: {
        Row: {
          alt: string | null
          created_at: string
          id: number
          name: string
          product_id: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: never
          name: string
          product_id?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: never
          name?: string
          product_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          availability: number | null
          category: number | null
          created_at: string
          description: string | null
          id: number
          is_custom: boolean
          name: string
          price: number
          slug: string
          stock_quantity: number | null
        }
        Insert: {
          availability?: number | null
          category?: number | null
          created_at?: string
          description?: string | null
          id?: never
          is_custom?: boolean
          name: string
          price: number
          slug: string
          stock_quantity?: number | null
        }
        Update: {
          availability?: number | null
          category?: number | null
          created_at?: string
          description?: string | null
          id?: never
          is_custom?: boolean
          name?: string
          price?: number
          slug?: string
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_availability_fkey"
            columns: ["availability"]
            isOneToOne: false
            referencedRelation: "product_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          display_name: string | null
          email: string | null
          id: string
          is_admin: boolean
          updated_at: string | null
          username: string | null
        }
        Insert: {
          display_name?: string | null
          email?: string | null
          id: string
          is_admin?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          setting_name: Database["public"]["Enums"]["tsettings"]
          setting_value: string
        }
        Insert: {
          id?: number
          setting_name: Database["public"]["Enums"]["tsettings"]
          setting_value: string
        }
        Update: {
          id?: number
          setting_name?: Database["public"]["Enums"]["tsettings"]
          setting_value?: string
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
      thealthcheck: "first_setup"
      tsettings: "website_title" | "website_url" | "website_description"
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
      thealthcheck: ["first_setup"],
      tsettings: ["website_title", "website_url", "website_description"],
    },
  },
} as const
