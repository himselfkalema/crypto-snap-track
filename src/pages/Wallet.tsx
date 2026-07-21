import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet as WalletIcon, Lock, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface Balance {
  coin: string;
  available: number;
  escrow: number;
}

interface LedgerEntry {
  id: string;
  coin: string;
  delta_available: number;
  delta_escrow: number;
  reason: string;
  ref_trade_id: string | null;
  created_at: string;
}

const REASON_LABEL: Record<string, string> = {
  trade_escrow_lock: 'Locked in escrow',
  trade_release_seller: 'Released to buyer',
  trade_release_buyer: 'Received from seller',
  trade_refund_seller: 'Trade cancelled — refund',
  admin_credit: 'Admin credit',
};

export default function Wallet() {
  const { user, loading } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingData(true);
      const [{ data: b }, { data: l }] = await Promise.all([
        supabase.from('wallet_balances').select('*').eq('user_id', user.id),
        supabase.from('wallet_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      ]);
      setBalances((b ?? []) as Balance[]);
      setLedger((l ?? []) as LedgerEntry[]);
      setLoadingData(false);
    };
    load();

    const channel = supabase
      .channel(`wallet:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_ledger', filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppShell>
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Balances backing your trades. Escrow is locked while trades are pending.
          </p>
        </div>

        {/* Balances */}
        {loadingData ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0,1,2].map(i => <Card key={i} className="glass-card p-6 h-32 animate-pulse" />)}
          </div>
        ) : balances.length === 0 ? (
          <Card className="glass-card p-10 text-center">
            <WalletIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">No balances yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You'll see crypto balances here once you complete a trade or receive a deposit.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map(b => (
              <Card key={b.coin} className="glass-card p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-mono">{b.coin}</Badge>
                  <WalletIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Available</div>
                  <div className="text-2xl font-bold font-mono">{Number(b.available).toFixed(8)}</div>
                </div>
                {Number(b.escrow) > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> In escrow
                    </span>
                    <span className="text-sm font-mono">{Number(b.escrow).toFixed(8)}</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Ledger */}
        <Card className="glass-card p-6">
          <h2 className="font-semibold mb-4">Recent activity</h2>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wallet activity yet.</p>
          ) : (
            <div className="space-y-2">
              {ledger.map(e => {
                const net = Number(e.delta_available) + Number(e.delta_escrow);
                const positive = net >= 0;
                return (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg grid place-items-center ${positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {positive ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{REASON_LABEL[e.reason] ?? e.reason}</div>
                        <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono ${positive ? 'text-success' : 'text-destructive'}`}>
                        {positive ? '+' : ''}{net.toFixed(8)} {e.coin}
                      </div>
                      {Number(e.delta_escrow) !== 0 && (
                        <div className="text-xs text-muted-foreground">
                          escrow {Number(e.delta_escrow) > 0 ? '+' : ''}{Number(e.delta_escrow).toFixed(8)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
