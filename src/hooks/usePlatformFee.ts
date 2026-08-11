import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FEE_KEY = 'platform_trade_fee_percentage';

/**
 * Reads the admin-configurable marketplace fee.
 * The value shown here is display-only — the authoritative fee is recomputed
 * server-side by the `trades_validate_insert` trigger when a trade is created.
 */
export function usePlatformFee() {
  const [feePct, setFeePct] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', FEE_KEY)
      .maybeSingle();
    if (err) setError(err.message);
    else setFeePct(Number(data?.value ?? 0));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { feePct, loading, error, reload: load };
}

export async function updatePlatformFee(pct: number, actorId: string) {
  return supabase
    .from('platform_settings')
    .update({ value: pct as any, updated_by: actorId })
    .eq('key', FEE_KEY);
}
