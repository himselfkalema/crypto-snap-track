import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

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
    // Redirect to dashboard if already logged in
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchMarkets = async () => {
      const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
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
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleAuth = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 text-foreground flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-border">
        <h1 className="text-2xl font-extrabold">
          <span className="text-primary">Crypto</span>SnapTrack 🚀
        </h1>
        <div className="space-x-4">
          <button
            onClick={handleAuth}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Log In
          </button>
          <button
            onClick={handleAuth}
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="text-center py-20 px-4">
        <h2 className="text-4xl font-bold mb-4">Manage Your Crypto Like a Pro 💼</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Track, automate, and analyze your entire portfolio in one sleek dashboard. Powered by
          Binance data — real prices, real control.
        </p>
        <div className="space-x-4">
          <button
            onClick={handleAuth}
            className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            Get Started
          </button>
          <button
            onClick={handleAuth}
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors"
          >
            Log In
          </button>
        </div>
      </section>

      {/* Live Market Overview */}
      <section className="px-8">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold mb-4">📊 Live Market Overview</h3>
          <div className="space-y-3">
            {markets.map((coin) => (
              <div key={coin.symbol} className="flex justify-between items-center">
                <span className="font-medium">{coin.symbol.replace("USDT", "")}</span>
                <span
                  className={`${
                    parseFloat(coin.priceChangePercent) >= 0
                      ? "text-success"
                      : "text-destructive"
                  } font-semibold`}
                >
                  ${parseFloat(coin.lastPrice).toFixed(2)} (
                  {parseFloat(coin.priceChangePercent).toFixed(2)}%)
                </span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Market data provided by{" "}
            <a
              href="https://www.binance.com/register?ref=373173114"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent/80 underline transition-colors"
            >
              Binance
            </a>
          </p>
        </div>
      </section>

      {/* Pro & Premium Tiers */}
      <section className="px-8 py-16 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-card">
          <h3 className="text-2xl font-bold mb-3 text-warning">🥈 Pro Tier</h3>
          <ul className="text-muted-foreground list-disc pl-6 space-y-1">
            <li>Portfolio Analytics Dashboard</li>
            <li>Smart Alerts & Auto DCA (3 strategies)</li>
            <li>Tax Reports & Wallet Risk Scanner</li>
            <li>NFT Tracker Lite</li>
          </ul>
          <div className="mt-4 text-primary font-semibold text-xl">$24/month</div>
        </div>
        <div className="bg-card border border-primary/50 p-6 rounded-2xl shadow-glow">
          <h3 className="text-2xl font-bold mb-3 text-primary">🥇 Premium Tier</h3>
          <ul className="text-muted-foreground list-disc pl-6 space-y-1">
            <li>AI Portfolio Advisor & Predictive Analytics</li>
            <li>DeFi Command Center + Cross-Chain Automation</li>
            <li>Private API Access & Security Vault</li>
            <li>Withdraw Skips (Instant, up to 5/month)</li>
          </ul>
          <div className="mt-4 text-primary font-semibold text-xl">$85/month</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border text-center py-6 text-muted-foreground text-sm mt-auto">
        © {new Date().getFullYear()} CryptoSnapTrack • Built for modern traders 🌍
      </footer>
    </div>
  );
}
