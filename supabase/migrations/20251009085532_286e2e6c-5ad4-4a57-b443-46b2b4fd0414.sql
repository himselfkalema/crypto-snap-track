-- Create tiers table
CREATE TABLE public.tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  price_usd numeric NOT NULL,
  description text,
  features jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.tiers(id),
  status text NOT NULL CHECK (status IN ('active', 'inactive', 'trial')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  auto_renew boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create withdraw_skips table
CREATE TABLE public.withdraw_skips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month text NOT NULL,
  skips_used int NOT NULL DEFAULT 0,
  limit_per_month int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_skips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tiers
CREATE POLICY "Anyone can view tiers"
  ON public.tiers FOR SELECT
  USING (true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for withdraw_skips
CREATE POLICY "Users can view their own withdraw skips"
  ON public.withdraw_skips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdraw skips"
  ON public.withdraw_skips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own withdraw skips"
  ON public.withdraw_skips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all withdraw skips"
  ON public.withdraw_skips FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed tiers data
INSERT INTO public.tiers (name, price_usd, description, features) VALUES
('pro', 24, 'Professional tier with advanced portfolio and automation features', 
  '{"portfolio": ["Portfolio Analytics Dashboard", "Real-time profit/loss tracking (multi-chain)", "Coin performance heatmap", "Risk scoring & asset correlation"], "automation": ["Smart Alerts & Auto-Triggers", "Custom rules (e.g. ETH gas < 15 gwei)", "Auto DCA / Rebalancing bots (3 strategies)"], "multiWallet": ["Unified wallet dashboard (ETH, BTC, SOL, etc.)", "Gas optimization + quick transfers"], "tax": ["One-click tax export (CSV, PDF)", "Automatic cost basis tracking (FIFO/LIFO)"], "security": ["Wallet risk scanner", "Custom spending limits / freeze mode"], "nft": ["NFT Tracker Lite", "Floor price & rarity insights"], "ui": ["Pro Themes & Layout Presets", "Dark Mode+ / Data Density control"]}'::jsonb
),
('premium', 85, 'Premium tier with AI advisor, DeFi tools, and priority support', 
  '{"ai": ["AI Portfolio Advisor", "Predictive market analytics", "Risk-adjusted yield strategies"], "defi": ["DeFi Command Center (staking, pooling, farming)", "APR optimizer + Auto-harvest"], "automation": ["Cross-Chain Automation", "Unified gas management"], "api": ["Private API Access for algos & bots"], "analytics": ["Whale tracking & token velocity metrics", "Smart Money replication"], "security": ["Multi-sig Vault", "Real-time signing alerts", "Web3 threat detection AI"], "nft": ["NFT Management Pro", "AI rarity pricing & auto-listing"], "perks": ["Priority Withdraw Skips (5/month)", "24/7 Premium Support", "Private Alpha Discord Access", "Gas rebates + token sale invites"]}'::jsonb
);

-- Create indexes
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_tier_id ON public.user_subscriptions(tier_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_withdraw_skips_user_id ON public.withdraw_skips(user_id);
CREATE INDEX idx_withdraw_skips_month ON public.withdraw_skips(month);

-- Trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();