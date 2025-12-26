import { useEffect, useState } from "react";
import { useCryptoData } from "@/hooks/useCryptoData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PortfolioSummary } from "@/components/crypto/PortfolioSummary";
import { PositionCard } from "@/components/crypto/PositionCard";
import { MarketMovers } from "@/components/crypto/MarketMovers";
import { DashboardSidebar } from "@/components/crypto/DashboardSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, TrendingUp, LogOut, User, Banknote, Sparkles } from "lucide-react";
import { Navigate, Link } from "react-router-dom";

interface WalletData {
  balance: number;
  currency: string;
}

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  
  const {
    coins,
    livePortfolio,
    portfolioSummary,
    isLoading,
    error,
    setError,
    addPosition,
    removePosition,
    resetPortfolio,
    refreshData,
  } = useCryptoData(user?.id);

  // Fetch wallet balance
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchWallet = async () => {
      const { data } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setWalletData(data);
      }
    };
    
    fetchWallet();
  }, [user?.id]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background bg-hero bg-mesh flex items-center justify-center">
        <div className="flex items-center gap-3 glass-card p-6 rounded-2xl">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to landing if not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background bg-hero bg-mesh relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 right-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-5xl mx-auto p-6 relative z-10">
        <div className="space-y-6">
          {/* Wallet Balance Card */}
          <Card className="p-6 glass-card rounded-2xl border-primary/20 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-gradient-primary shadow-glow">
                  <Banknote className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Wallet Balance</p>
                  <p className="text-4xl font-bold font-display text-foreground">
                    {walletData 
                      ? `${walletData.balance.toLocaleString()} ${walletData.currency}`
                      : '0 UGX'
                    }
                  </p>
                </div>
              </div>
              <Link to="/wallet">
                <Button className="bg-gradient-primary hover:opacity-90 shadow-glow font-semibold">
                  <Wallet className="h-4 w-4 mr-2" />
                  Manage Wallet
                </Button>
              </Link>
            </div>
          </Card>

          {/* Header Card */}
          <Card className="p-6 glass-card rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-primary">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold font-display text-foreground">Crypto Portfolio</h1>
                    <p className="text-muted-foreground">Track your investments and market performance</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{user.email}</span>
                  </div>
                  <Link to="/subscription">
                    <Button variant="outline" size="sm" className="glass border-primary/30 hover:border-primary/50">
                      <Sparkles className="h-4 w-4 mr-1 text-primary" />
                      Subscription
                    </Button>
                  </Link>
                  <Button onClick={signOut} variant="ghost" size="sm" className="hover:bg-destructive/10 hover:text-destructive">
                    <LogOut className="h-4 w-4 mr-1" />
                    Sign Out
                  </Button>
                </div>
              </div>
              <PortfolioSummary summary={portfolioSummary} />
            </div>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <Card className="p-6 glass-card rounded-2xl">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-muted-foreground">Loading market data...</span>
              </div>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="p-4 glass border-destructive/30 bg-destructive/5 rounded-2xl">
              <div className="text-destructive text-sm">{error}</div>
            </Card>
          )}

          {/* Portfolio Holdings */}
          <Card className="p-6 glass-card rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/20">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold font-display">Your Holdings</h2>
              <span className="px-2.5 py-1 rounded-full glass text-sm text-muted-foreground">
                {livePortfolio.length} positions
              </span>
            </div>

            <div className="space-y-4">
              {livePortfolio.length === 0 ? (
                <div className="text-center py-16">
                  <div className="p-4 rounded-2xl bg-primary/10 w-fit mx-auto mb-4">
                    <Wallet className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No positions yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Add your first crypto position to start tracking your portfolio performance
                  </p>
                </div>
              ) : (
                livePortfolio.map((position, index) => (
                  <div
                    key={position.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${0.05 * index}s` }}
                  >
                    <PositionCard
                      position={position}
                      onRemove={removePosition}
                    />
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Market Movers */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <MarketMovers coins={coins} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground py-6 border-t border-border/30">
          <div className="flex items-center justify-center gap-2">
            <span>Powered by</span>
            <a 
              href="https://coingecko.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              CoinGecko API
            </a>
            <span>•</span>
            <span>Made with ❤️ for crypto enthusiasts</span>
          </div>
        </footer>
      </div>

      {/* Floating Sidebar */}
      <DashboardSidebar
        coins={coins}
        onAddPosition={addPosition}
        onResetPortfolio={resetPortfolio}
        onRefreshData={refreshData}
        error={error || undefined}
      />
    </div>
  );
};

export default Dashboard;