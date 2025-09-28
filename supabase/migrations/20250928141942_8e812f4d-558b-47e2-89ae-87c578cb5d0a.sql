-- Create wallets table for user digital wallets
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric(15,2) NOT NULL DEFAULT 0.00,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- Enable Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wallets
CREATE POLICY "Users can view their own wallet" 
ON public.wallets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallet" 
ON public.wallets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" 
ON public.wallets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create transactions table to track wallet transactions
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount numeric(15,2) NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'topup')),
  description text,
  phone_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transactions
CREATE POLICY "Users can view their own transactions" 
ON public.wallet_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.wallet_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallet_transactions_updated_at
BEFORE UPDATE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create default wallet for new users
CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, currency)
  VALUES (NEW.id, 0.00, 'USD')
  ON CONFLICT (user_id, currency) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create wallet on user signup
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_wallet();