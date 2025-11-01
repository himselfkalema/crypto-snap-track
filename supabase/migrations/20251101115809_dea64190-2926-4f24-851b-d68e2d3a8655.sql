-- Update profiles table with new fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mobile text,
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'MTN',
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS withdraw_skips_used int DEFAULT 0,
ADD COLUMN IF NOT EXISTS withdraw_skips_limit int DEFAULT 0;

-- Update wallets table to match spec
ALTER TABLE wallets
ALTER COLUMN currency SET DEFAULT 'UGX';

-- Update withdrawals table to match spec
ALTER TABLE withdrawals
ADD COLUMN IF NOT EXISTS mobile_number text,
ALTER COLUMN currency SET DEFAULT 'UGX';

-- Update mobile_number for existing withdrawals from profiles
UPDATE withdrawals w
SET mobile_number = p.mobile
FROM profiles p
WHERE w.user_id = p.id AND w.mobile_number IS NULL;

-- Make mobile_number required going forward
ALTER TABLE withdrawals
ALTER COLUMN mobile_number SET NOT NULL;

-- Create lightning_invoices table
CREATE TABLE IF NOT EXISTS lightning_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  lndhub_invoice_id text,
  payment_request text,
  amount_sat bigint NOT NULL,
  status text DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on lightning_invoices
ALTER TABLE lightning_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for lightning_invoices
CREATE POLICY "Users can view their own invoices"
ON lightning_invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices"
ON lightning_invoices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoices"
ON lightning_invoices FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_logs (admin-only read)
CREATE POLICY "Admins can view all audit logs"
ON audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (true);

-- Add index for better performance on withdrawals lookup by external_ref
CREATE INDEX IF NOT EXISTS idx_withdrawals_external_ref ON withdrawals(external_ref);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status ON withdrawals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lightning_invoices_user ON lightning_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- Update RLS policies on withdrawals to use has_role for admins
DROP POLICY IF EXISTS "Admins can manage all withdrawals" ON withdrawals;
CREATE POLICY "Admins can manage all withdrawals"
ON withdrawals FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add helper function to log audit events
CREATE OR REPLACE FUNCTION log_audit(
  p_user_id uuid,
  p_action text,
  p_details jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, details, ip_address)
  VALUES (p_user_id, p_action, p_details, p_ip_address);
END;
$$;