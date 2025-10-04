-- Create mobile_money_transactions table
CREATE TABLE IF NOT EXISTS public.mobile_money_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  status TEXT NOT NULL DEFAULT 'PENDING',
  provider TEXT NOT NULL,
  external_tx_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mobile_money_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for mobile_money_transactions
CREATE POLICY "Users can view their own mobile money transactions"
  ON public.mobile_money_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mobile money transactions"
  ON public.mobile_money_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RPC function to increment wallet balance
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallets
  SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.wallets(user_id, balance, currency)
    VALUES (p_user_id, p_amount, 'UGX');
  END IF;
END;
$$;