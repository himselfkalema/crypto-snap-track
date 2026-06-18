import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, ShieldCheck } from 'lucide-react';

export default function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('*').eq('username', username!).maybeSingle().then(async ({ data }) => {
      setProfile(data);
      if (data) {
        const [{ data: rs }, { data: os }] = await Promise.all([
          supabase.from('reviews').select('*').eq('reviewee_id', data.id).order('created_at', { ascending: false }).limit(20),
          supabase.from('offers').select('*').eq('user_id', data.id).eq('status', 'active').order('created_at', { ascending: false }),
        ]);
        setReviews(rs ?? []);
        setOffers(os ?? []);
      }
    });
  }, [username]);

  if (!profile) return <AppShell><div className="container py-12">Loading…</div></AppShell>;
  const successRate = profile.total_trades ? Math.round((profile.successful_trades / profile.total_trades) * 100) : 0;

  return (
    <AppShell>
      <div className="container py-8 grid lg:grid-cols-3 gap-6">
        <Card className="glass-card p-6 lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-primary grid place-items-center text-2xl font-bold text-primary-foreground">
              {profile.username[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">@{profile.username}</h1>
                {profile.verified && <ShieldCheck className="h-5 w-5 text-primary" />}
              </div>
              {profile.display_name && <p className="text-sm text-muted-foreground">{profile.display_name}</p>}
            </div>
          </div>
          {profile.bio && <p className="text-sm text-muted-foreground mb-4">{profile.bio}</p>}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-mono text-lg font-bold flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" />{Number(profile.reputation_score).toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </div>
            <div>
              <div className="font-mono text-lg font-bold">{profile.total_trades}</div>
              <div className="text-xs text-muted-foreground">Trades</div>
            </div>
            <div>
              <div className="font-mono text-lg font-bold">{successRate}%</div>
              <div className="text-xs text-muted-foreground">Success</div>
            </div>
          </div>
          {profile.country && <p className="mt-4 text-sm text-muted-foreground">📍 {profile.country}</p>}
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <section>
            <h2 className="font-semibold mb-3">Active offers</h2>
            {offers.length === 0 ? (
              <Card className="glass-card p-6 text-center text-muted-foreground text-sm">No active offers.</Card>
            ) : (
              <div className="grid gap-3">
                {offers.map(o => (
                  <Link key={o.id} to={`/offers/${o.id}`}>
                    <Card className="glass-card p-4 lift flex items-center justify-between">
                      <div>
                        <Badge className={o.type === 'buy' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
                          {o.type.toUpperCase()} {o.coin}
                        </Badge>
                        <span className="ml-3 font-mono">{Number(o.price).toLocaleString()} {o.fiat_currency}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{o.min_trade}–{o.max_trade}</div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-semibold mb-3">Recent reviews</h2>
            {reviews.length === 0 ? (
              <Card className="glass-card p-6 text-center text-muted-foreground text-sm">No reviews yet.</Card>
            ) : (
              <div className="grid gap-3">
                {reviews.map(r => (
                  <Card key={r.id} className="glass-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-warning">{'★'.repeat(r.rating)}<span className="text-muted">{'★'.repeat(5 - r.rating)}</span></div>
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
