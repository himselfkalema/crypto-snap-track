import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Plus, Pause, Play, Square, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const TIER_LIMITS: Record<string, { max: number; interval: string; cap: string }> = {
  free: { max: 1, interval: '5 min', cap: '$200 / day' },
  pro: { max: 3, interval: '1 min', cap: '$2,000 / day' },
  premium: { max: 10, interval: '20 sec', cap: '$20,000 / day' },
};

export default function Bots() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [bots, setBots] = useState<any[]>([]);
  const [plan, setPlan] = useState<string>('free');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: b }, { data: s }] = await Promise.all([
        supabase.from('bots').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('plan,status').eq('user_id', user.id).maybeSingle(),
      ]);
      setBots(b ?? []);
      setPlan(s?.status === 'active' ? (s.plan ?? 'free') : 'free');
    };
    load();
    const channel = supabase.channel('bots-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bots', filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const limits = TIER_LIMITS[plan] ?? TIER_LIMITS.free;
  const activeCount = bots.filter(b => b.status === 'active').length;
  const atLimit = activeCount >= limits.max;

  const setStatus = async (id: string, status: string) => {
    setBusy(true);
    const patch: any = { status };
    if (status === 'active') { patch.pause_reason = null; patch.consecutive_errors = 0; }
    const { error } = await supabase.from('bots').update(patch).eq('id', id);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success(`Bot ${status}`);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this bot? Its offer will also be removed.')) return;
    const { error } = await supabase.from('bots').delete().eq('id', id);
    if (error) toast.error(error.message);
    else toast.success('Bot deleted');
  };

  return (
    <AppShell>
      <div className="container py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Bot className="h-7 w-7 text-primary" /> Market-Maker Bots
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-price your offers against live market rate. Plan: <span className="font-mono uppercase">{plan}</span> ·
              {' '}Active {activeCount}/{limits.max} · Refresh {limits.interval} · Cap {limits.cap}
            </p>
          </div>
          <Button
            className="bg-gradient-primary"
            disabled={atLimit}
            onClick={() => navigate('/bots/new')}
          >
            <Plus className="h-4 w-4 mr-1" /> New bot
          </Button>
        </div>

        {atLimit && (
          <Card className="glass-card p-4 border-amber-500/40 bg-amber-500/5 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div className="flex-1 text-sm">
              You've reached your plan limit ({limits.max} active bots).{' '}
              <Link to="/pricing" className="underline">Upgrade</Link> for more.
            </div>
          </Card>
        )}

        {bots.length === 0 ? (
          <Card className="glass-card p-10 text-center space-y-3">
            <Bot className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="font-medium">No bots yet</div>
            <p className="text-sm text-muted-foreground">Create your first market-maker bot to keep an offer priced automatically.</p>
            <Button onClick={() => navigate('/bots/new')} className="bg-gradient-primary mt-2">Create bot</Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {bots.map(b => (
              <Card key={b.id} className="glass-card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <Link to={`/bots/${b.id}`} className="font-medium hover:underline">
                      {b.name}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {b.side.toUpperCase()} {b.coin} · margin {Number(b.margin_pct).toFixed(2)}% ·
                      {' '}{Number(b.min_amount)}–{Number(b.max_amount)} {b.fiat_currency}
                    </div>
                    {b.pause_reason && (
                      <div className="text-xs text-amber-500 mt-1">⚠ {b.pause_reason}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={b.status === 'active' ? 'default' : b.status === 'paused' ? 'outline' : 'destructive'}>
                      {b.status}
                    </Badge>
                    {b.status === 'active' ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus(b.id, 'paused')}>
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : b.status === 'paused' ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus(b.id, 'active')}>
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {b.status !== 'stopped' && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus(b.id, 'stopped')}>
                        <Square className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(b.id)}>Delete</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
