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
      admin_actions_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          reason: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          title?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      bot_runs: {
        Row: {
          action: string
          bot_id: string
          id: string
          market_price: number | null
          new_price: number | null
          note: string | null
          ran_at: string
        }
        Insert: {
          action: string
          bot_id: string
          id?: string
          market_price?: number | null
          new_price?: number | null
          note?: string | null
          ran_at?: string
        }
        Update: {
          action?: string
          bot_id?: string
          id?: string
          market_price?: number | null
          new_price?: number | null
          note?: string | null
          ran_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_runs_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      bots: {
        Row: {
          auto_reply: string | null
          available_amount: number
          coin: string
          consecutive_errors: number
          country: string | null
          created_at: string
          daily_volume: number
          daily_volume_reset_at: string
          fiat_currency: string
          id: string
          last_error: string | null
          last_market_price: number | null
          last_run_at: string | null
          margin_pct: number
          max_amount: number
          min_amount: number
          name: string
          offer_id: string | null
          pause_reason: string | null
          payment_methods: string[]
          side: Database["public"]["Enums"]["offer_type"]
          status: string
          terms: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_reply?: string | null
          available_amount: number
          coin: string
          consecutive_errors?: number
          country?: string | null
          created_at?: string
          daily_volume?: number
          daily_volume_reset_at?: string
          fiat_currency?: string
          id?: string
          last_error?: string | null
          last_market_price?: number | null
          last_run_at?: string | null
          margin_pct?: number
          max_amount: number
          min_amount: number
          name: string
          offer_id?: string | null
          pause_reason?: string | null
          payment_methods?: string[]
          side: Database["public"]["Enums"]["offer_type"]
          status?: string
          terms?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_reply?: string | null
          available_amount?: number
          coin?: string
          consecutive_errors?: number
          country?: string | null
          created_at?: string
          daily_volume?: number
          daily_volume_reset_at?: string
          fiat_currency?: string
          id?: string
          last_error?: string | null
          last_market_price?: number | null
          last_run_at?: string | null
          margin_pct?: number
          max_amount?: number
          min_amount?: number
          name?: string
          offer_id?: string | null
          pause_reason?: string | null
          payment_methods?: string[]
          side?: Database["public"]["Enums"]["offer_type"]
          status?: string
          terms?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bots_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_evidence: {
        Row: {
          created_at: string
          dispute_id: string
          file_url: string | null
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          file_url?: string | null
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          file_url?: string | null
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          id: string
          opener_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          trade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opener_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          trade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opener_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: true
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          enabled: boolean
          key: string
          payload: Json | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          key: string
          payload?: Json | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          key?: string
          payload?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          available_amount: number
          bot_id: string | null
          coin: string
          country: string | null
          created_at: string
          featured: boolean
          fiat_currency: string
          id: string
          is_bot: boolean
          max_trade: number
          min_trade: number
          payment_methods: string[]
          price: number
          status: Database["public"]["Enums"]["offer_status"]
          terms: string | null
          type: Database["public"]["Enums"]["offer_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          available_amount: number
          bot_id?: string | null
          coin: string
          country?: string | null
          created_at?: string
          featured?: boolean
          fiat_currency?: string
          id?: string
          is_bot?: boolean
          max_trade: number
          min_trade: number
          payment_methods?: string[]
          price: number
          status?: Database["public"]["Enums"]["offer_status"]
          terms?: string | null
          type: Database["public"]["Enums"]["offer_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          available_amount?: number
          bot_id?: string | null
          coin?: string
          country?: string | null
          created_at?: string
          featured?: boolean
          fiat_currency?: string
          id?: string
          is_bot?: boolean
          max_trade?: number
          min_trade?: number
          payment_methods?: string[]
          price?: number
          status?: Database["public"]["Enums"]["offer_status"]
          terms?: string | null
          type?: Database["public"]["Enums"]["offer_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          lemon_order_id: string | null
          metadata: Json | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          lemon_order_id?: string | null
          metadata?: Json | null
          status: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          lemon_order_id?: string | null
          metadata?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          reputation_score: number
          successful_trades: number
          suspended: boolean
          total_trades: number
          updated_at: string
          username: string
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          reputation_score?: number
          successful_trades?: number
          suspended?: boolean
          total_trades?: number
          updated_at?: string
          username: string
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          reputation_score?: number
          successful_trades?: number
          suspended?: boolean
          total_trades?: number
          updated_at?: string
          username?: string
          verified?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          trade_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          trade_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          lemon_customer_id: string | null
          lemon_subscription_id: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          status: Database["public"]["Enums"]["sub_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          lemon_customer_id?: string | null
          lemon_subscription_id?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["sub_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          lemon_customer_id?: string | null
          lemon_subscription_id?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["sub_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_messages: {
        Row: {
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          read_at: string | null
          sender_id: string
          trade_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
          trade_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_messages_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          buyer_id: string
          cancelled_at: string | null
          coin: string
          completed_at: string | null
          created_at: string
          crypto_amount: number
          expires_at: string
          fiat_amount: number
          fiat_currency: string
          id: string
          offer_id: string
          payment_method: string | null
          price: number
          seller_id: string
          status: Database["public"]["Enums"]["trade_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          cancelled_at?: string | null
          coin: string
          completed_at?: string | null
          created_at?: string
          crypto_amount: number
          expires_at?: string
          fiat_amount: number
          fiat_currency: string
          id?: string
          offer_id: string
          payment_method?: string | null
          price: number
          seller_id: string
          status?: Database["public"]["Enums"]["trade_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          cancelled_at?: string | null
          coin?: string
          completed_at?: string | null
          created_at?: string
          crypto_amount?: number
          expires_at?: string
          fiat_amount?: number
          fiat_currency?: string
          id?: string
          offer_id?: string
          payment_method?: string | null
          price?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["trade_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
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
      wallet_balances: {
        Row: {
          available: number
          coin: string
          escrow: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available?: number
          coin: string
          escrow?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available?: number
          coin?: string
          escrow?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          coin: string
          created_at: string
          delta_available: number
          delta_escrow: number
          id: string
          reason: string
          ref_trade_id: string | null
          user_id: string
        }
        Insert: {
          coin: string
          created_at?: string
          delta_available?: number
          delta_escrow?: number
          id?: string
          reason: string
          ref_trade_id?: string | null
          user_id: string
        }
        Update: {
          coin?: string
          created_at?: string
          delta_available?: number
          delta_escrow?: number
          id?: string
          reason?: string
          ref_trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_ref_trade_id_fkey"
            columns: ["ref_trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_credit_wallet: {
        Args: {
          _amount: number
          _coin: string
          _reason?: string
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      wallet_move: {
        Args: {
          _coin: string
          _delta_available: number
          _delta_escrow: number
          _reason: string
          _ref_trade_id?: string
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      dispute_status: "open" | "under_review" | "resolved"
      offer_status: "active" | "paused" | "completed" | "deleted"
      offer_type: "buy" | "sell"
      plan_tier: "free" | "pro" | "premium"
      sub_status: "active" | "cancelled" | "expired" | "past_due"
      trade_status:
        | "pending"
        | "payment_sent"
        | "completed"
        | "cancelled"
        | "disputed"
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
      app_role: ["admin", "user"],
      dispute_status: ["open", "under_review", "resolved"],
      offer_status: ["active", "paused", "completed", "deleted"],
      offer_type: ["buy", "sell"],
      plan_tier: ["free", "pro", "premium"],
      sub_status: ["active", "cancelled", "expired", "past_due"],
      trade_status: [
        "pending",
        "payment_sent",
        "completed",
        "cancelled",
        "disputed",
      ],
    },
  },
} as const
