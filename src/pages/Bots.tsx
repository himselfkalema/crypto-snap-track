import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bot,
  Plus,
  Pause,
  Play,
  Square,
  AlertTriangle,
  Activity,
  Timer,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

const TIER_LIMITS: Record<string, { max: number; interval: string; cap: string }> = {
  free: { max: 1, interval: '5 min', cap: '$200 / day' },
  pro: { max: 3, interval: '1 min', cap: '$2,000 / day' },
  premium: { max: 10, interval: '20 sec', cap: '$20,000 / day' },
};

export default function Bots() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [bots, setBots] = useState<any[] | null>(null);
  const [plan, setPlan] = useState<string>('free');
  const [busy, setBusy] = useState<string | null>(null);

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
    const channel = supabase
      .channel('bots-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bots', filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const limits = TIER_LIMITS[plan] ?? TIER_LIMITS.free;
  const list = bots ?? [];
  const activeCount = list.filter((b) => b.status === 'active').length;
  const pausedCount = list.filter((b) => b.status === 'paused').length;
  const atLimit = activeCount >= limits.max;
  const usagePct = Math.min(100, (activeCount / limits.max) * 100);

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    const patch: any = { status };
    if (status === 'active') {
      patch.pause_reason = null;
      patch.consecutive_errors = 0;
    }
    const { error } = await supabase.from('bots').update(patch).eq('id', id);
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success(`Bot ${status}`);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this bot? Its offer will also be removed.')) return;
    const { error } = await supabase.from('bots').delete().eq('id', id);
    if (error) toast.error(error.message);
    else toast.success('Bot deleted');
  };

  return (
    <AppShell>
      <div className="container py-8 space-y-8 max-w-6xl">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl glass-strong p-6 md:p-8">
          <div className="absolute inset-0 bg-mesh opacity-60 pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                Market-maker automation
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight flex items-center gap-3">
                <span className="p-2 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <Bot className="h-6 w-6" />
                </span>
                Trading Bots
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Auto-price your P2P offers against live market rate. Bots pause automatically on errors and respect your daily cap.
              </p>
            </div>
            <Button
              size="lg"
              className="hover:shadow-glow-strong transition-shadow"
              disabled={atLimit}
              onClick={() => navigate('/bots/new')}
            >
              <Plus className="h-4 w-4" /> New bot
            </Button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="Active"
            value={`${activeCount}`}
            hint={`of ${limits.max} on ${plan.toUpperCase()}`}
            accent="text-crypto-green"
          >
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-primary transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </StatCard>
          <StatCard
            icon={<Pause className="h-4 w-4" />}
            label="Paused"
            value={`${pausedCount}`}
            hint="not running"
            accent="text-warning"
          />
          <StatCard
            icon={<Timer className="h-4 w-4" />}
            label="Refresh rate"
            value={limits.interval}
            hint="between ticks"
            accent="text-primary"
          />
          <StatCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Daily cap"
            value={limits.cap.split(' / ')[0]}
            hint="per bot / day"
            accent="text-accent"
          />
        </div>

        {atLimit && (
          <Card className="glass-card p-4 border-warning/40 bg-warning/5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/15">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1 text-sm">
              You've reached your plan limit of{' '}
              <span className="font-semibold">{limits.max} active bots</span>.{' '}
              <Link to="/pricing" className="underline underline-offset-2 text-primary font-medium">
                Upgrade
              </Link>{' '}
              to run more strategies concurrently.
            </div>
          </Card>
        )}

        {/* Bot list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Your bots
            </h2>
            {list.length > 0 && (
              <span className="text-xs text-muted-foreground font-mono">{list.length} total</span>
            )}
          </div>

          {bots === null ? (
            <div className="grid gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <Card className="glass-card p-12 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="font-display font-semibold text-lg">No bots yet</div>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Spin up your first market-maker to keep an offer priced automatically against the live rate.
                </p>
              </div>
              <Button
                onClick={() => navigate('/bots/new')}
                className="bg-gradient-primary shadow-glow"
              >
                <Plus className="h-4 w-4" /> Create your first bot
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {list.map((b) => (
                <BotRow
                  key={b.id}
                  bot={b}
                  busy={busy === b.id}
                  onSetStatus={setStatus}
                  onDelete={remove}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="glass-card p-4">
      <div className={`flex items-center gap-2 text-xs font-medium ${accent}`}>
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
      {children}
    </Card>
  );
}

function BotRow({
  bot,
  busy,
  onSetStatus,
  onDelete,
}: {
  bot: any;
  busy: boolean;
  onSetStatus: (id: string, s: string) => void;
  onDelete: (id: string) => void;
}) {
  const isBuy = bot.side === 'buy';
  const statusVariant =
    bot.status === 'active' ? 'default' : bot.status === 'paused' ? 'outline' : 'destructive';

  return (
    <Card className="glass-card p-4 md:p-5 group hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Side indicator */}
          <div
            className={`shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${
              isBuy
                ? 'bg-crypto-green/10 text-crypto-green border border-crypto-green/20'
                : 'bg-crypto-red/10 text-crypto-red border border-crypto-red/20'
            }`}
          >
            {isBuy ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/bots/${bot.id}`}
                className="font-display font-semibold truncate hover:text-primary transition-colors"
              >
                {bot.name}
              </Link>
              <Badge variant={statusVariant} className="capitalize text-[10px]">
                {bot.status === 'active' && (
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                )}
                {bot.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-mono flex flex-wrap gap-x-3 gap-y-1">
              <span className={isBuy ? 'text-crypto-green' : 'text-crypto-red'}>
                {bot.side.toUpperCase()} {bot.coin}
              </span>
              <span>margin {Number(bot.margin_pct).toFixed(2)}%</span>
              <span>
                {Number(bot.min_amount)}–{Number(bot.max_amount)} {bot.fiat_currency}
              </span>
            </div>
            {bot.pause_reason && (
              <div className="text-xs text-warning mt-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                {bot.pause_reason}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {bot.status === 'active' ? (
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              disabled={busy}
              onClick={() => onSetStatus(bot.id, 'paused')}
              title="Pause"
            >
              <Pause className="h-4 w-4" />
            </Button>
          ) : bot.status === 'paused' ? (
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              disabled={busy}
              onClick={() => onSetStatus(bot.id, 'active')}
              title="Resume"
            >
              <Play className="h-4 w-4" />
            </Button>
          ) : null}
          {bot.status !== 'stopped' && (
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              disabled={busy}
              onClick={() => onSetStatus(bot.id, 'stopped')}
              title="Stop"
            >
              <Square className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(bot.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Link
            to={`/bots/${bot.id}`}
            className="ml-1 hidden sm:inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
