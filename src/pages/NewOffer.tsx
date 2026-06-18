import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { SUPPORTED_COINS, PAYMENT_METHODS, COUNTRIES } from '@/lib/coins';
import { toast } from 'sonner';

const schema = z.object({
  type: z.enum(['buy', 'sell']),
  coin: z.string().min(2),
  fiat_currency: z.string().length(3),
  price: z.number().positive(),
  available_amount: z.number().positive(),
  min_trade: z.number().positive(),
  max_trade: z.number().positive(),
  payment_methods: z.array(z.string()).min(1),
  country: z.string().optional(),
  terms: z.string().max(2000).optional(),
});

export default function NewOffer() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<'buy' | 'sell'>('sell');
  const [coin, setCoin] = useState('USDT');
  const [fiat, setFiat] = useState('USD');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [minTrade, setMinTrade] = useState('');
  const [maxTrade, setMaxTrade] = useState('');
  const [methods, setMethods] = useState<string[]>([]);
  const [country, setCountry] = useState('Worldwide');
  const [terms, setTerms] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const toggleMethod = (m: string) =>
    setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      type, coin, fiat_currency: fiat,
      price: Number(price), available_amount: Number(amount),
      min_trade: Number(minTrade), max_trade: Number(maxTrade),
      payment_methods: methods, country, terms,
    });
    if (!parsed.success) return toast.error('Please complete all fields correctly');
    if (parsed.data.min_trade > parsed.data.max_trade) return toast.error('Min trade must be ≤ max trade');

    setSubmitting(true);
    const { error } = await supabase.from('offers').insert({ ...parsed.data, user_id: user.id });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Offer created');
    navigate('/marketplace');
  };

  return (
    <AppShell>
      <div className="container py-8 max-w-2xl">
        <h1 className="text-3xl font-display font-bold mb-6">Create offer</h1>
        <Card className="glass-card p-6">
          <form onSubmit={submit} className="space-y-5">
            <Tabs value={type} onValueChange={(v) => setType(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="buy">I want to Buy</TabsTrigger>
                <TabsTrigger value="sell">I want to Sell</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coin</Label>
                <Select value={coin} onValueChange={setCoin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_COINS.map(c => <SelectItem key={c.symbol} value={c.symbol}>{c.symbol} — {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fiat currency</Label>
                <Input value={fiat} onChange={e => setFiat(e.target.value.toUpperCase())} maxLength={3} />
              </div>
              <div className="space-y-2">
                <Label>Price per {coin}</Label>
                <Input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Available amount ({coin})</Label>
                <Input type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Min trade ({fiat})</Label>
                <Input type="number" step="any" value={minTrade} onChange={e => setMinTrade(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Max trade ({fiat})</Label>
                <Input type="number" step="any" value={maxTrade} onChange={e => setMaxTrade(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment methods</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={methods.includes(m)} onCheckedChange={() => toggleMethod(m)} />
                    {m}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Terms (optional)</Label>
              <Textarea value={terms} onChange={e => setTerms(e.target.value)} maxLength={2000} rows={4} placeholder="e.g. Please send payment within 15 minutes. No third-party payments." />
            </div>

            <Button type="submit" className="w-full bg-gradient-primary" disabled={submitting}>
              {submitting ? 'Publishing…' : 'Publish offer'}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
