-- Create market_preferences table
CREATE TABLE IF NOT EXISTS public.market_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_symbols text[] NOT NULL DEFAULT ARRAY['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.market_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own market preferences"
  ON public.market_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own market preferences"
  ON public.market_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own market preferences"
  ON public.market_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_market_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_market_preferences_updated_at
  BEFORE UPDATE ON public.market_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_market_preferences_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_market_preferences_user_id ON public.market_preferences(user_id);