import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

const plans = [
  { id: 'free', name: 'Free', price: '$0', period: 'forever', features: ['Up to 3 active offers', 'Basic marketplace access', 'Standard support'] },
  { id: 'pro', name: 'Pro', price: '$0.99', period: '/month', features: ['10 active offers', 'Advanced filters', 'Priority support', 'Profile customization'] },
  { id: 'premium', name: 'Premium', price: '$1.99', period: '/month', highlight: true, features: ['Unlimited offers', 'Featured listings', 'Premium badge', 'AI pricing suggestions', 'Marketplace analytics'] },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState<string>('free');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('subscriptions').select('plan').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setCurrent(data.plan);
    });
  }, [user]);

  const checkout = async (planId: string) => {
    if (!user) return navigate('/auth?tab=signup');
    if (planId === 'free') return toast.info('You are on the free plan');
    setLoading(planId);
    const { data, error } = await supabase.functions.invoke('lemon-checkout', { body: { plan: planId } });
    setLoading(null);
    if (error || !data?.url) return toast.error(data?.error || 'Checkout unavailable. Please configure Lemon Squeezy.');
    window.location.href = data.url;
  };

  return (
    <AppShell>
      <div className="container py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold">Choose your plan</h1>
          <p className="text-muted-foreground mt-2">Upgrade anytime. Cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map(p => (
            <Card key={p.id} className={`p-8 ${p.highlight ? 'glass-strong border-primary/40 glow' : 'glass-card'}`}>
              {p.highlight && <Badge className="mb-3 bg-gradient-primary">Most popular</Badge>}
              {current === p.id && <Badge variant="outline" className="mb-3">Current plan</Badge>}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <div className="mt-3 font-mono text-4xl font-bold">{p.price}<span className="text-base text-muted-foreground font-sans">{p.period}</span></div>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}</li>
                ))}
              </ul>
              <Button
                onClick={() => checkout(p.id)}
                disabled={current === p.id || loading === p.id}
                className={`mt-6 w-full ${p.highlight ? 'bg-gradient-primary' : ''}`}
                variant={p.highlight ? 'default' : 'outline'}
              >
                {current === p.id ? 'Current plan' : loading === p.id ? 'Loading…' : p.id === 'free' ? 'Get started' : 'Upgrade'}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
