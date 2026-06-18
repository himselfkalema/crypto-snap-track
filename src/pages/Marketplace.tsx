import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SUPPORTED_COINS, PAYMENT_METHODS, COUNTRIES } from '@/lib/coins';
import { Star, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface OfferRow {
  id: string; user_id: string; type: 'buy' | 'sell'; coin: string;
  fiat_currency: string; price: number; available_amount: number;
  min_trade: number; max_trade: number; payment_methods: string[];
  country: string | null; terms: string | null; featured: boolean;
  status: string; created_at: string;
  profiles?: { username: string; reputation_score: number; total_trades: number; successful_trades: number; verified: boolean } | null;
}

export default function Marketplace() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [coin, setCoin] = useState<string>('all');
  const [country, setCountry] = useState<string>('all');
  const [method, setMethod] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('offers')
        .select('*, profiles!offers_user_id_fkey(username, reputation_score, total_trades, successful_trades, verified)')
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      setOffers((data ?? []) as any);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel('offers-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => offers.filter(o =>
    o.type === type &&
    (coin === 'all' || o.coin === coin) &&
    (country === 'all' || o.country === country) &&
    (method === 'all' || o.payment_methods.includes(method)) &&
    (!search || o.profiles?.username.toLowerCase().includes(search.toLowerCase()))
  ), [offers, type, coin, country, method, search]);

  return (
    <AppShell>
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">Marketplace</h1>
            <p className="text-muted-foreground mt-1">Live P2P offers from traders worldwide.</p>
          </div>
          {user && (
            <Button asChild className="bg-gradient-primary">
              <Link to="/offers/new">+ Create offer</Link>
            </Button>
          )}
        </div>

        <Tabs value={type} onValueChange={(v) => setType(v as any)}>
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="buy">I want to Buy</TabsTrigger>
            <TabsTrigger value="sell">I want to Sell</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="glass-card p-4 mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select value={coin} onValueChange={setCoin}>
            <SelectTrigger><SelectValue placeholder="Coin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All coins</SelectItem>
              {SUPPORTED_COINS.map(c => <SelectItem key={c.symbol} value={c.symbol}>{c.symbol} — {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue placeholder="Payment method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Search trader…" value={search} onChange={e => setSearch(e.target.value)} className="lg:col-span-2" />
        </Card>

        <div className="grid gap-4 mt-6">
          {loading && <p className="text-muted-foreground text-center py-12">Loading offers…</p>}
          {!loading && filtered.length === 0 && (
            <Card className="glass-card p-12 text-center">
              <p className="text-muted-foreground">No offers match your filters. Try widening your search or {user && <Link to="/offers/new" className="text-primary underline">create one</Link>}.</p>
            </Card>
          )}
          {filtered.map(o => (
            <Card key={o.id} className="glass-card p-5 lift">
              <div className="grid md:grid-cols-4 gap-4 items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">@{o.profiles?.username ?? 'trader'}</span>
                    {o.profiles?.verified && <ShieldCheck className="h-4 w-4 text-primary" />}
                    {o.featured && <Badge variant="outline" className="border-accent text-accent"><Sparkles className="h-3 w-3 mr-1" />Featured</Badge>}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    {(o.profiles?.reputation_score ?? 0).toFixed(1)} · {o.profiles?.total_trades ?? 0} trades
                    {(o.profiles?.total_trades ?? 0) > 0 && <> · {Math.round(((o.profiles?.successful_trades ?? 0) / (o.profiles?.total_trades ?? 1)) * 100)}%</>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Price</div>
                  <div className="font-mono text-xl font-bold">{o.price.toLocaleString(undefined, { maximumFractionDigits: 8 })} {o.fiat_currency}</div>
                  <div className="text-xs text-muted-foreground">per {o.coin}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Limits</div>
                  <div className="font-mono text-sm">{o.min_trade.toLocaleString()} – {o.max_trade.toLocaleString()} {o.fiat_currency}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {o.payment_methods.slice(0, 3).map(m => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}
                  </div>
                </div>
                <div className="md:text-right">
                  <Button asChild className={o.type === 'buy' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}>
                    <Link to={`/offers/${o.id}`}>
                      {o.type === 'buy' ? `Sell ${o.coin}` : `Buy ${o.coin}`}
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
