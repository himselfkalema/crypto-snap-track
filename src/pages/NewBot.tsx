import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_COINS, PAYMENT_METHODS } from '@/lib/coins';
import { toast } from 'sonner';

export default function NewBot() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', coin: 'BTC', side: 'sell', fiat_currency: 'USD',
    margin_pct: '1', min_amount: '20', max_amount: '500',
    available_amount: '1000', payment_method: 'Bank Transfer',
    terms: '', auto_reply: 'Hi! I\'ll process your payment as soon as it arrives.',
  });
  const [market, setMarket] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.functions.invoke('coincap-proxy', {
      body: { path: `/v3/assets/${form.coin.toLowerCase()}` },
    }).then(({ data }) => setMarket(Number(data?.data?.priceUsd) || null));
  }, [form.coin]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const margin = Number(form.margin_pct) || 0;
  const sign = form.side === 'sell' ? 1 : -1;
  const effective = market ? market * (1 + (sign * margin) / 100) : null;

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    const min = Number(form.min_amount), max = Number(form.max_amount);
    if (min <= 0 || max <= 0 || min > max) return toast.error('Invalid amount range');
    if (Math.abs(margin) > 20) return toast.error('Margin must be within ±20%');

    setSubmitting(true);
    const { error } = await supabase.from('bots').insert({
      user_id: user.id,
      name: form.name.trim(),
      coin: form.coin,
      side: form.side,
      fiat_currency: form.fiat_currency,
      payment_methods: [form.payment_method],
      margin_pct: margin,
      min_amount: min,
      max_amount: max,
      available_amount: Number(form.available_amount) || max,
      terms: form.terms || null,
      auto_reply: form.auto_reply || null,
      status: 'active',
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Bot created');
    navigate('/bots');
  };

  return (
    <AppShell>
      <div className="container max-w-2xl py-8 space-y-6">
        <h1 className="text-2xl font-display font-bold">New market-maker bot</h1>

        <Card className="glass-card p-6 space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. BTC seller — US bank" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Side</Label>
              <Select value={form.side} onValueChange={v => set('side', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell">Sell (I offer crypto)</SelectItem>
                  <SelectItem value="buy">Buy (I want crypto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Coin</Label>
              <Select value={form.coin} onValueChange={v => set('coin', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_COINS.map(c => <SelectItem key={c.symbol} value={c.symbol}>{c.symbol} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Margin (%)</Label>
              <Input type="number" step="0.1" value={form.margin_pct} onChange={e => set('margin_pct', e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">+ over market for sell, – under market for buy. Max ±20%.</p>
            </div>
            <div>
              <Label>Fiat currency</Label>
              <Input value={form.fiat_currency} onChange={e => set('fiat_currency', e.target.value.toUpperCase().slice(0, 4))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><Label>Min</Label><Input type="number" value={form.min_amount} onChange={e => set('min_amount', e.target.value)} /></div>
            <div><Label>Max</Label><Input type="number" value={form.max_amount} onChange={e => set('max_amount', e.target.value)} /></div>
            <div><Label>Available</Label><Input type="number" value={form.available_amount} onChange={e => set('available_amount', e.target.value)} /></div>
          </div>

          <div>
            <Label>Payment method</Label>
            <Select value={form.payment_method} onValueChange={v => set('payment_method', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Terms (optional)</Label>
            <Textarea value={form.terms} onChange={e => set('terms', e.target.value)} rows={3} maxLength={1000} />
          </div>

          <div>
            <Label>Auto-reply message</Label>
            <Textarea value={form.auto_reply} onChange={e => set('auto_reply', e.target.value)} rows={2} maxLength={500} />
          </div>

          <Card className="p-3 bg-secondary/40 border-border/40">
            <div className="text-xs text-muted-foreground">Live preview</div>
            <div className="font-mono text-sm mt-1">
              Market: {market ? `$${market.toFixed(2)}` : '…'}{' '}
              {effective !== null && (
                <span className="text-primary">→ Offer: ${effective.toFixed(2)} ({margin >= 0 ? '+' : ''}{margin}%)</span>
              )}
            </div>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => navigate('/bots')}>Cancel</Button>
            <Button className="bg-gradient-primary" onClick={submit} disabled={submitting}>Create bot</Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
