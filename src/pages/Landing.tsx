import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ShieldCheck, Zap, Star, Users, Globe, TrendingUp, Sparkles, Check } from 'lucide-react';

const OG_IMAGE = 'https://bitbite.lovable.app/__l5e/assets-v1/714bc711-c4eb-4758-a428-5e20b3e7724e/og-bitbite.jpg';

const sampleOffers = [
  { type: 'buy', coin: 'BTC', price: 67432.10, trader: 'cryptoking', rating: 4.9, trades: 1247, method: 'Bank Transfer' },
  { type: 'sell', coin: 'USDT', price: 1.002, trader: 'fastexchange', rating: 5.0, trades: 3201, method: 'Wise' },
  { type: 'buy', coin: 'ETH', price: 3204.55, trader: 'ethmaster', rating: 4.8, trades: 689, method: 'PayPal' },
  { type: 'sell', coin: 'SOL', price: 162.40, trader: 'solanahub', rating: 4.95, trades: 942, method: 'SEPA' },
];

const steps = [
  { n: '01', title: 'Create Account', body: 'Sign up in seconds with email — verify and you\'re in.' },
  { n: '02', title: 'Browse Offers', body: 'Filter buy or sell offers by coin, country, and payment method.' },
  { n: '03', title: 'Start Trade', body: 'Open a secure trade room and chat with the counterparty in real time.' },
  { n: '04', title: 'Complete Transaction', body: 'Confirm payment, release crypto, and leave a review.' },
];

const features = [
  { icon: Zap, title: 'Real-Time Marketplace', body: 'Live offer updates and instant trade rooms powered by realtime infrastructure.' },
  { icon: ShieldCheck, title: 'Trusted Traders', body: 'Every trader is verified and rated by the community.' },
  { icon: Star, title: 'Ratings System', body: 'Transparent reputation scores so you trade with confidence.' },
  { icon: TrendingUp, title: 'Fast Trades', body: 'Average completion under 15 minutes with our streamlined flow.' },
  { icon: Users, title: 'Global Community', body: 'Thousands of traders across 50+ countries.' },
  { icon: Globe, title: 'Secure Platform', body: 'Bank-grade security, full dispute resolution, and 24/7 admin oversight.' },
];

const plans = [
  { name: 'Free', price: '$0', features: ['Up to 3 active offers', 'Basic marketplace access', 'Standard support'], cta: 'Get started' },
  { name: 'Pro', price: '$0.99', highlight: false, features: ['10 active offers', 'Advanced filters', 'Priority support', 'Profile customization'], cta: 'Start Pro' },
  { name: 'Premium', price: '$1.99', highlight: true, features: ['Unlimited offers', 'Featured listings', 'Premium badge', 'AI pricing suggestions', 'Marketplace analytics'], cta: 'Go Premium' },
];

export default function Landing() {
  return (
    <AppShell>
      <Helmet>
        <title>BitBite — Buy & Sell Crypto Securely | P2P Marketplace</title>
        <meta name="description" content="Trade Bitcoin, Ethereum, USDT and Solana peer-to-peer on BitBite. Real-time offers, verified traders, and secure escrow — start trading in minutes." />
        <link rel="canonical" href="https://bitbite.lovable.app/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="BitBite" />
        <meta property="og:title" content="BitBite — Buy & Sell Crypto Securely" />
        <meta property="og:description" content="Real-time P2P marketplace for Bitcoin, Ethereum, USDT, Solana and more." />
        <meta property="og:url" content="https://bitbite.lovable.app/" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BitBite — Buy & Sell Crypto Securely" />
        <meta name="twitter:description" content="Real-time P2P marketplace for Bitcoin, Ethereum, USDT, Solana and more." />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Helmet>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="container py-20 md:py-32 text-center relative z-10">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30 bg-primary/5">
            <Sparkles className="mr-2 h-3 w-3" /> Real-time P2P crypto marketplace
          </Badge>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight">
            Buy & Sell Crypto <span className="text-gradient">Securely</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Trade Bitcoin, Ethereum, USDT, Solana and more with trusted users worldwide.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-gradient-primary glow-hover">
              <Link to="/auth?tab=signup">Start Trading <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/marketplace">Browse Marketplace</Link>
            </Button>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-radial opacity-50 pointer-events-none" />
      </section>

      {/* MARKETPLACE PREVIEW */}
      <section className="container py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Live offers right now</h2>
            <p className="text-muted-foreground mt-2">A glimpse at what's trading on the marketplace.</p>
          </div>
          <Button asChild variant="ghost" className="hidden md:inline-flex">
            <Link to="/marketplace">View all <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sampleOffers.map((o, i) => (
            <Card key={i} className="glass-card p-5 lift">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={o.type === 'buy' ? 'default' : 'secondary'} className={o.type === 'buy' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
                  {o.type.toUpperCase()} {o.coin}
                </Badge>
                <div className="text-xs text-muted-foreground">{o.method}</div>
              </div>
              <div className="font-mono text-2xl font-bold">${o.price.toLocaleString()}</div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-medium">@{o.trader}</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3 w-3 fill-warning text-warning" /> {o.rating} · {o.trades}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold">How it works</h2>
          <p className="text-muted-foreground mt-2">From signup to trade in minutes.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {steps.map(s => (
            <Card key={s.n} className="glass-card p-6">
              <div className="font-mono text-sm text-primary mb-3">{s.n}</div>
              <h3 className="font-semibold text-lg">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold">Why choose BitBite</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(f => (
            <Card key={f.title} className="glass-card p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="container py-20" id="pricing">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold">Simple pricing</h2>
          <p className="text-muted-foreground mt-2">Start free. Upgrade when you outgrow it.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map(p => (
            <Card key={p.name} className={`p-8 ${p.highlight ? 'glass-strong border-primary/40 glow' : 'glass-card'}`}>
              {p.highlight && <Badge className="mb-3 bg-gradient-primary">Most popular</Badge>}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <div className="mt-3 font-mono text-4xl font-bold">{p.price}<span className="text-base text-muted-foreground font-sans"> /mo</span></div>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild className={`mt-6 w-full ${p.highlight ? 'bg-gradient-primary' : ''}`} variant={p.highlight ? 'default' : 'outline'}>
                <Link to="/pricing">{p.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
