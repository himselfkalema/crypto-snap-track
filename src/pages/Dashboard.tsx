import { useCryptoData } from "@/hooks/useCryptoData";
import { useAuth } from "@/hooks/useAuth";
import { PortfolioSummary } from "@/components/crypto/PortfolioSummary";
import { PositionCard } from "@/components/crypto/PositionCard";
import { AddPositionForm } from "@/components/crypto/AddPositionForm";
import { MarketMovers } from "@/components/crypto/MarketMovers";
import MarketOverview from "@/components/crypto/MarketOverview";
import { QuickActions } from "@/components/crypto/QuickActions";
import { InfoPanel } from "@/components/crypto/InfoPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, TrendingUp, LogOut, User } from "lucide-react";
import { Navigate, Link } from "react-router-dom";

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  
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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to landing if not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <Card className="p-6 bg-gradient-card border-border/50 backdrop-blur-glass shadow-card">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-foreground">Crypto Portfolio</h1>
                      <p className="text-muted-foreground">Track your investments and market performance</p>
                      <div className="flex items-center gap-2 mt-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                        <Link to="/wallet">
                          <Button variant="outline" size="sm" className="ml-2">
                            <Wallet className="h-4 w-4 mr-1" />
                            Wallet
                          </Button>
                        </Link>
                        <Link to="/subscription">
                          <Button variant="outline" size="sm">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Subscription
                          </Button>
                        </Link>
                        <Button onClick={signOut} variant="ghost" size="sm">
                          <LogOut className="h-4 w-4 mr-1" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <PortfolioSummary summary={portfolioSummary} />
              </div>
            </Card>

            {/* Loading State */}
            {isLoading && (
              <Card className="p-6 bg-gradient-card border-border/50 backdrop-blur-glass">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Loading market data...</span>
                </div>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <Card className="p-4 bg-destructive/10 border-destructive/20 backdrop-blur-glass">
                <div className="text-destructive text-sm">{error}</div>
              </Card>
            )}

            {/* Portfolio Holdings */}
            <Card className="p-6 bg-gradient-card border-border/50 backdrop-blur-glass shadow-card">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Your Holdings</h2>
                <span className="text-sm text-muted-foreground">({livePortfolio.length} positions)</span>
              </div>

              <div className="space-y-4">
                {livePortfolio.length === 0 ? (
                  <div className="text-center py-12">
                    <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No positions yet</h3>
                    <p className="text-sm text-muted-foreground">Add your first crypto position to get started</p>
                  </div>
                ) : (
                  livePortfolio.map((position) => (
                    <PositionCard
                      key={position.id}
                      position={position}
                      onRemove={removePosition}
                    />
                  ))
                )}
              </div>
            </Card>

            {/* Market Movers */}
            <MarketMovers coins={coins} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AddPositionForm
              coins={coins}
              onAddPosition={addPosition}
              error={error || undefined}
            />

            <QuickActions
              onResetPortfolio={resetPortfolio}
              onRefreshData={refreshData}
            />

            <MarketOverview />

            <InfoPanel />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <span>Powered by</span>
            <a 
              href="https://coingecko.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              CoinGecko API
            </a>
            <span>• Made with ❤️ for crypto enthusiasts</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
