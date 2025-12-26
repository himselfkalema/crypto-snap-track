import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, TrendingUp, TrendingDown, Zap, Shield, BarChart3, Wallet, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarketData {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
}

export default function Landing() {
  const { user, loading } = useAuth();
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchMarkets = async () => {
      const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];
      const res = await Promise.all(
        symbols.map((sym) =>
          fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`).then((r) => r.json())
        )
      );
      setMarkets(res);
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleAuth = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-background bg-hero bg-mesh text-foreground flex flex-col relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl float pointer-events-none" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-accent/15 rounded-full blur-3xl float-delayed pointer-events-none" />
      <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-crypto-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex justify-between items-center border-b border-border/50 glass-strong">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-primary">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="text-gradient">Crypto</span>
          <span>SnapTrack</span>
        </h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleAuth}
            variant="ghost"
            className="font-medium hover:bg-primary/10"
          >
            Log In
          </Button>
          <Button
            onClick={handleAuth}
            className="font-semibold bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
          >
            Get Started
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 text-center py-24 px-6 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Real-time portfolio tracking powered by Binance</span>
        </div>
        
        <h2 className="text-5xl md:text-7xl font-bold font-display mb-6 leading-tight">
          Manage Your Crypto
          <br />
          <span className="text-gradient">Like a Pro</span>
        </h2>
        
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Track, automate, and analyze your entire portfolio in one sleek dashboard. 
          Real prices, real control, real results.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Button
            onClick={handleAuth}
            size="lg"
            className="text-lg px-8 py-6 bg-gradient-primary hover:opacity-90 transition-all shadow-glow font-semibold"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          <Button
            onClick={() => navigate("/pricing")}
            size="lg"
            variant="outline"
            className="text-lg px-8 py-6 glass border-primary/30 hover:border-primary/50 hover:bg-primary/5"
          >
            View Pricing
          </Button>
        </div>
      </section>

      {/* Live Market Ticker */}
      <section className="relative z-10 px-6 pb-16 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="glass-card rounded-2xl p-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/20">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-xl font-semibold font-display">Live Market</h3>
            <div className="ml-auto flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crypto-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-crypto-green"></span>
              </span>
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {markets.map((coin) => {
              const isPositive = parseFloat(coin.priceChangePercent) >= 0;
              return (
                <div 
                  key={coin.symbol} 
                  className="p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg">{coin.symbol.replace("USDT", "")}</span>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-crypto-green" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-crypto-red" />
                    )}
                  </div>
                  <div className="text-xl font-mono font-semibold">
                    ${parseFloat(coin.lastPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-sm font-medium ${isPositive ? 'text-crypto-green' : 'text-crypto-red'}`}>
                    {isPositive ? '+' : ''}{parseFloat(coin.priceChangePercent).toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
          
          <p className="mt-6 text-sm text-muted-foreground text-center">
            Market data provided by{" "}
            <a
              href="https://www.binance.com/register?ref=373173114"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Binance
            </a>
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 py-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold font-display text-center mb-12">
            Why Choose <span className="text-gradient">CryptoSnapTrack</span>?
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Real-Time Tracking",
                description: "Live price updates and portfolio valuation with millisecond accuracy"
              },
              {
                icon: Shield,
                title: "Bank-Grade Security",
                description: "Your data is encrypted and secured with enterprise-level protection"
              },
              {
                icon: BarChart3,
                title: "Smart Analytics",
                description: "AI-powered insights and performance metrics to optimize your trades"
              }
            ].map((feature, index) => (
              <div 
                key={feature.title}
                className="glass-card rounded-2xl p-6 group"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="p-3 rounded-xl bg-gradient-primary w-fit mb-4 group-hover:shadow-glow transition-shadow">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="relative z-10 px-6 py-16 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold font-display text-center mb-4">
            Choose Your Plan
          </h3>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Start free and upgrade as you grow. All plans include core features.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Pro Tier */}
            <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-warning to-crypto-orange" />
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🥈</span>
                <h4 className="text-2xl font-bold font-display">Pro</h4>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold font-display">$24</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-muted-foreground">
                {[
                  "Portfolio Analytics Dashboard",
                  "Smart Alerts & Auto DCA (3 strategies)",
                  "Tax Reports & Wallet Risk Scanner",
                  "NFT Tracker Lite"
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="rounded-full p-1 bg-success/20 mt-0.5">
                      <svg className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => navigate("/pricing")}
                className="w-full py-6 font-semibold"
                variant="outline"
              >
                Get Pro
              </Button>
            </div>

            {/* Premium Tier */}
            <div className="glass-card rounded-2xl p-8 relative overflow-hidden border-primary/30 glow-hover">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary" />
              <div className="absolute -top-1 right-6 px-4 py-1.5 rounded-b-xl bg-gradient-primary text-white text-sm font-bold shadow-lg">
                Most Popular
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🥇</span>
                <h4 className="text-2xl font-bold font-display text-gradient">Premium</h4>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold font-display">$85</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8 text-muted-foreground">
                {[
                  "Everything in Pro, plus:",
                  "AI Portfolio Advisor & Predictive Analytics",
                  "DeFi Command Center + Cross-Chain",
                  "Private API & Security Vault",
                  "Withdraw Skips (5/month instant payout)"
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="rounded-full p-1 bg-primary/20 mt-0.5">
                      <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => navigate("/pricing")}
                className="w-full py-6 font-semibold bg-gradient-primary hover:opacity-90 shadow-glow"
              >
                Get Premium
                <Sparkles className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 glass py-8 px-6 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            <span>© {new Date().getFullYear()} CryptoSnapTrack</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Built for modern traders 🌍
          </div>
        </div>
      </footer>
    </div>
  );
}