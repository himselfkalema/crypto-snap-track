import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const statusColor: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  payment_sent: 'bg-primary text-primary-foreground',
  completed: 'bg-success text-success-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  disputed: 'bg-destructive text-destructive-foreground',
};

export default function Trades() {
  const { user, loading } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('trades')
      .select('*')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setTrades(data ?? []));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppShell>
      <div className="container py-8">
        <h1 className="text-3xl font-display font-bold mb-6">My trades</h1>
        {trades.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <p className="text-muted-foreground">You haven't started any trades yet.</p>
            <Link to="/marketplace" className="text-primary underline">Browse the marketplace</Link>
          </Card>
        ) : (
          <div className="grid gap-3">
            {trades.map(t => (
              <Link key={t.id} to={`/trades/${t.id}`}>
                <Card className="glass-card p-4 lift">
                  <div className="grid sm:grid-cols-5 gap-3 items-center">
                    <Badge className={statusColor[t.status]}>{t.status.replace('_', ' ')}</Badge>
                    <div>
                      <div className="text-xs text-muted-foreground">Coin</div>
                      <div className="font-semibold">{t.coin}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Crypto</div>
                      <div className="font-mono">{Number(t.crypto_amount).toFixed(8)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Fiat</div>
                      <div className="font-mono">{Number(t.fiat_amount).toLocaleString()} {t.fiat_currency}</div>
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-right">
                      {new Date(t.created_at).toLocaleString()}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
