-- Add mobile field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile text;

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gross_amount numeric NOT NULL,
  fee_amount numeric NOT NULL,
  net_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'UGX',
  mobile_number text NOT NULL,
  provider text NOT NULL DEFAULT 'MTN',
  status text NOT NULL DEFAULT 'PENDING',
  external_ref text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- RPC: atomically debit wallet (fails if insufficient funds)
CREATE OR REPLACE FUNCTION public.debit_wallet_if_enough(p_user_id uuid, p_amount numeric)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  cur_bal numeric;
BEGIN
  SELECT balance INTO cur_bal FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF cur_bal IS NULL THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;
  IF cur_bal < p_amount THEN
    RETURN false;
  END IF;
  UPDATE wallets SET balance = balance - p_amount, updated_at = now() WHERE user_id = p_user_id;
  RETURN true;
END;
$$;

-- RPC: credit wallet (used on failure refund)
CREATE OR REPLACE FUNCTION public.credit_wallet(p_user_id uuid, p_amount numeric)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  UPDATE wallets SET balance = balance + p_amount, updated_at = now() WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO wallets(user_id, balance, currency) VALUES (p_user_id, p_amount, 'UGX');
  END IF;
END;
$$;

-- Update timestamp trigger on withdrawals
CREATE OR REPLACE FUNCTION public.touch_withdrawal_updated_at() 
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_withdrawals_updated 
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE PROCEDURE touch_withdrawal_updated_at();

-- RLS Policies for withdrawals
CREATE POLICY "Users can insert their own withdrawals" 
ON public.withdrawals
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own withdrawals" 
ON public.withdrawals
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all withdrawals" 
ON public.withdrawals
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));