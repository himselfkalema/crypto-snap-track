import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function OfferDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [fiatAmount, setFiatAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from('offers')
      .select('*, profiles!offers_user_id_fkey(username, reputation_score, total_trades, successful_trades, verified, bio)')
      .eq('id', id!)
      .maybeSingle()
      .then(({ data }) => { setOffer(data); setPaymentMethod((data as any)?.payment_methods?.[0] ?? ''); });
  }, [id]);

  if (!offer) return <AppShell><div className="container py-12">Loading…</div></AppShell>;

  const cryptoAmount = Number(fiatAmount) / Number(offer.price);
  const isOwn = user?.id === offer.user_id;

  const startTrade = async () => {
    if (!user) return navigate('/auth');
    const fa = Number(fiatAmount);
    if (!fa || fa < offer.min_trade || fa > offer.max_trade)
      return toast.error(`Amount must be between ${offer.min_trade} and ${offer.max_trade}`);
    if (!paymentMethod) return toast.error('Choose a payment method');

    setSubmitting(true);
    const buyerId = offer.type === 'sell' ? user.id : offer.user_id;
    const sellerId = offer.type === 'sell' ? offer.user_id : user.id;

    const { data, error } = await supabase.from('trades').insert({
      offer_id: offer.id,
      buyer_id: buyerId,
      seller_id: sellerId,
      coin: offer.coin,
      crypto_amount: cryptoAmount,
      fiat_amount: fa,
      fiat_currency: offer.fiat_currency,
      price: offer.price,
      payment_method: paymentMethod,
    }).select().single();
    setSubmitting(false);
    if (error) return toast.error(error.message);

    // notify counterparty
    const otherId = user.id === offer.user_id ? (buyerId === offer.user_id ? sellerId : buyerId) : offer.user_id;
    await supabase.from('notifications').insert({
      user_id: otherId,
      type: 'new_trade',
      title: 'New trade started',
      body: `A trader started a ${offer.coin} trade with you.`,
      link: `/trades/${data.id}`,
    });

    navigate(`/trades/${data.id}`);
  };

  return (
    <AppShell>
      <div className="container py-8 grid lg:grid-cols-3 gap-6">
        <Card className="glass-card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <Badge className={offer.type === 'buy' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
              {offer.type === 'buy' ? `Buying ${offer.coin}` : `Selling ${offer.coin}`}
            </Badge>
            {offer.profiles?.verified && <ShieldCheck className="h-5 w-5 text-primary" />}
          </div>
          <div className="font-mono text-3xl font-bold">{offer.price.toLocaleString()} {offer.fiat_currency} <span className="text-base text-muted-foreground font-sans">per {offer.coin}</span></div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Limits</div>
              <div className="font-mono">{offer.min_trade.toLocaleString()} – {offer.max_trade.toLocaleString()} {offer.fiat_currency}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Available</div>
              <div className="font-mono">{offer.available_amount} {offer.coin}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Payment methods</div>
              <div className="flex flex-wrap gap-1 mt-1">{offer.payment_methods.map((m: string) => <Badge key={m} variant="secondary">{m}</Badge>)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Country</div>
              <div>{offer.country ?? '—'}</div>
            </div>
          </div>
          {offer.terms && (
            <div>
              <Label>Trader's terms</Label>
              <Card className="bg-secondary/30 p-4 text-sm whitespace-pre-wrap">{offer.terms}</Card>
            </div>
          )}
        </Card>

        <Card className="glass-card p-6 space-y-4">
          <div>
            <Link to={`/profile/${offer.profiles?.username}`} className="font-semibold hover:underline">@{offer.profiles?.username}</Link>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {(offer.profiles?.reputation_score ?? 0).toFixed(1)} · {offer.profiles?.total_trades ?? 0} trades
            </div>
          </div>

          {isOwn ? (
            <p className="text-sm text-muted-foreground">This is your own offer. Manage it from your dashboard.</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Amount in {offer.fiat_currency}</Label>
                <Input type="number" step="any" value={fiatAmount} onChange={e => setFiatAmount(e.target.value)}
                  placeholder={`${offer.min_trade} – ${offer.max_trade}`} />
                {fiatAmount && <p className="text-xs text-muted-foreground">≈ {cryptoAmount.toFixed(8)} {offer.coin}</p>}
              </div>
              <div className="space-y-2">
                <Label>Payment method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {offer.payment_methods.map((m: string) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={startTrade} disabled={submitting} className="w-full bg-gradient-primary">
                {submitting ? 'Starting…' : (offer.type === 'buy' ? `Sell ${offer.coin}` : `Buy ${offer.coin}`)}
              </Button>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
