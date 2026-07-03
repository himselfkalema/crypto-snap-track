import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function BotDetail() {
  const { user, loading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bot, setBot] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const [{ data: b }, { data: r }] = await Promise.all([
        supabase.from('bots').select('*').eq('id', id).maybeSingle(),
        supabase.from('bot_runs').select('*').eq('bot_id', id).order('ran_at', { ascending: false }).limit(100),
      ]);
      setBot(b); setRuns(r ?? []);
    };
    load();
    const channel = supabase.channel(`bot-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bots', filter: `id=eq.${id}` }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bot_runs', filter: `bot_id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, id]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!bot) return <AppShell><div className="container py-8">Loading…</div></AppShell>;

  const chartData = [...runs]
    .filter(r => r.market_price && r.new_price)
    .reverse()
    .map(r => ({
      t: new Date(r.ran_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      market: Number(r.market_price),
      offer: Number(r.new_price),
    }));

  return (
    <AppShell>
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-muted-foreground"><Link to="/bots" className="hover:underline">← Bots</Link></div>
            <h1 className="text-2xl font-display font-bold mt-1">{bot.name}</h1>
            <div className="text-sm text-muted-foreground font-mono mt-1">
              {bot.side.toUpperCase()} {bot.coin} · {Number(bot.margin_pct)}% · {bot.fiat_currency}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={bot.status === 'active' ? 'default' : bot.status === 'paused' ? 'outline' : 'destructive'}>
              {bot.status}
            </Badge>
            {bot.offer_id && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/offers/${bot.offer_id}`)}>View offer</Button>
            )}
          </div>
        </div>

        {bot.pause_reason && (
          <Card className="glass-card p-4 border-amber-500/40 bg-amber-500/5 text-sm">
            ⚠ {bot.pause_reason}
          </Card>
        )}

        <Card className="glass-card p-4">
          <div className="text-sm font-medium mb-3">Applied price vs market</div>
          <div className="h-64">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="t" fontSize={11} />
                  <YAxis fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="market" stroke="hsl(var(--muted-foreground))" dot={false} />
                  <Line type="monotone" dataKey="offer" stroke="hsl(var(--primary))" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Waiting for first ticks…</div>
            )}
          </div>
        </Card>

        <Card className="glass-card divide-y divide-border/40">
          <div className="p-3 text-sm font-medium">Run history</div>
          {runs.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No runs yet.</div>}
          {runs.map(r => (
            <div key={r.id} className="p-3 grid grid-cols-4 gap-3 text-sm">
              <div className="text-xs text-muted-foreground">{new Date(r.ran_at).toLocaleString()}</div>
              <Badge variant="outline" className="w-fit">{r.action}</Badge>
              <div className="font-mono text-xs">
                {r.market_price ? `mkt $${Number(r.market_price).toFixed(2)}` : '—'}
                {r.new_price ? ` → $${Number(r.new_price).toFixed(2)}` : ''}
              </div>
              <div className="text-xs text-muted-foreground truncate">{r.note ?? ''}</div>
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
  );
}
