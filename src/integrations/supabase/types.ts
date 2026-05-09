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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          country: string
          created_at: string
          customer_id: string | null
          id: string
          is_default: boolean | null
          postal_code: string | null
          state: string | null
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          country?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_default?: boolean | null
          postal_code?: string | null
          state?: string | null
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          country?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_default?: boolean | null
          postal_code?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          shopify_customer_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          shopify_customer_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          shopify_customer_id?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_tracking_details: {
        Row: {
          courier_code: string | null
          courier_name: string | null
          created_at: string
          delivered_at: string | null
          destination_country: string | null
          estimated_delivery_date: string | null
          id: string
          last_updated: string
          order_number: string
          origin_country: string | null
          shipped_at: string | null
          status: string | null
          sub_status: string | null
          tracking_events: Json | null
          tracking_number: string | null
        }
        Insert: {
          courier_code?: string | null
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          destination_country?: string | null
          estimated_delivery_date?: string | null
          id?: string
          last_updated?: string
          order_number: string
          origin_country?: string | null
          shipped_at?: string | null
          status?: string | null
          sub_status?: string | null
          tracking_events?: Json | null
          tracking_number?: string | null
        }
        Update: {
          courier_code?: string | null
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          destination_country?: string | null
          estimated_delivery_date?: string | null
          id?: string
          last_updated?: string
          order_number?: string
          origin_country?: string | null
          shipped_at?: string | null
          status?: string | null
          sub_status?: string | null
          tracking_events?: Json | null
          tracking_number?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          packed: boolean | null
          price: number | null
          product_id: string | null
          quantity: number
          shopify_variant_id: number | null
          sku: string | null
          title: string
          total: number | null
          variant_options: Json | null
          variant_title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          packed?: boolean | null
          price?: number | null
          product_id?: string | null
          quantity?: number
          shopify_variant_id?: number | null
          sku?: string | null
          title: string
          total?: number | null
          variant_options?: Json | null
          variant_title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          packed?: boolean | null
          price?: number | null
          product_id?: string | null
          quantity?: number
          shopify_variant_id?: number | null
          sku?: string | null
          title?: string
          total?: number | null
          variant_options?: Json | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tracking_details: {
        Row: {
          courier_code: string | null
          courier_name: string | null
          created_at: string
          delivered_at: string | null
          destination_country: string | null
          estimated_delivery_date: string | null
          id: string
          last_updated: string
          order_id: string
          origin_country: string | null
          shipped_at: string | null
          status: string | null
          sub_status: string | null
          tracking_events: Json | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          courier_code?: string | null
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          destination_country?: string | null
          estimated_delivery_date?: string | null
          id?: string
          last_updated?: string
          order_id: string
          origin_country?: string | null
          shipped_at?: string | null
          status?: string | null
          sub_status?: string | null
          tracking_events?: Json | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          courier_code?: string | null
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          destination_country?: string | null
          estimated_delivery_date?: string | null
          id?: string
          last_updated?: string
          order_id?: string
          origin_country?: string | null
          shipped_at?: string | null
          status?: string | null
          sub_status?: string | null
          tracking_events?: Json | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_details_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          carrier: string | null
          created_at: string
          currency: string | null
          customer_id: string | null
          delivered_at: string | null
          id: string
          order_number: string
          notes: string | null
          packed_at: string | null
          printed_at: string | null
          shipped_at: string | null
          shipping_address_id: string | null
          shopify_order_id: number | null
          shopify_synced_at: string | null
          stage: Database["public"]["Enums"]["order_stage"] | null
          total_amount: number | null
          total_weight: number | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_number: string
          packed_at?: string | null
          printed_at?: string | null
          shipped_at?: string | null
          shipping_address_id?: string | null
          shopify_order_id?: number | null
          shopify_synced_at?: string | null
          stage?: Database["public"]["Enums"]["order_stage"] | null
          total_amount?: number | null
          total_weight?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          packed_at?: string | null
          printed_at?: string | null
          shipped_at?: string | null
          shipping_address_id?: string | null
          shopify_order_id?: number | null
          shopify_synced_at?: string | null
          stage?: Database["public"]["Enums"]["order_stage"] | null
          total_amount?: number | null
          total_weight?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      parcel_panel_analytics: {
        Row: {
          avg_delivery_time_days: number | null
          created_at: string
          date: string
          delivered_orders: number | null
          delivery_rate: number | null
          exception_orders: number | null
          id: string
          in_transit_orders: number | null
          out_for_delivery_orders: number | null
          raw_data: Json | null
          status_breakdown: Json | null
          top_carriers: Json | null
          top_destinations: Json | null
          total_orders: number | null
          updated_at: string
        }
        Insert: {
          avg_delivery_time_days?: number | null
          created_at?: string
          date: string
          delivered_orders?: number | null
          delivery_rate?: number | null
          exception_orders?: number | null
          id?: string
          in_transit_orders?: number | null
          out_for_delivery_orders?: number | null
          raw_data?: Json | null
          status_breakdown?: Json | null
          top_carriers?: Json | null
          top_destinations?: Json | null
          total_orders?: number | null
          updated_at?: string
        }
        Update: {
          avg_delivery_time_days?: number | null
          created_at?: string
          date?: string
          delivered_orders?: number | null
          delivery_rate?: number | null
          exception_orders?: number | null
          id?: string
          in_transit_orders?: number | null
          out_for_delivery_orders?: number | null
          raw_data?: Json | null
          status_breakdown?: Json | null
          top_carriers?: Json | null
          top_destinations?: Json | null
          total_orders?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          id: string
          price: number | null
          shopify_product_id: number | null
          sku: string | null
          title: string
          variant_options: Json | null
          variations: Json | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          price?: number | null
          shopify_product_id?: number | null
          sku?: string | null
          title: string
          variant_options?: Json | null
          variations?: Json | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          price?: number | null
          shopify_product_id?: number | null
          sku?: string | null
          title?: string
          variant_options?: Json | null
          variations?: Json | null
          weight?: number | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      sync_shopify_order: {
        Args: { shopify_order_data: Json }
        Returns: string
      }
      sync_shopify_order_to_db: {
        Args: { shopify_order_data: Json }
        Returns: string
      }
    }
    Enums: {
      order_stage:
        | "pending"
        | "hold"
        | "printing"
        | "packing"
        | "tracking"
        | "shipped"
        | "delivered"
        | "delivery"
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
      order_stage: [
        "pending",
        "hold",
        "printing",
        "packing",
        "tracking",
        "shipped",
        "delivered",
        "delivery",
      ],
    },
  },
} as const
