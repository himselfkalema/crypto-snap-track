import { Coin } from "@/types/crypto";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MarketMoversProps {
  coins: Coin[];
}

export function MarketMovers({ coins }: MarketMoversProps) {
  const topCoins = coins.slice(0, 10);

  return (
    <Card className="p-6 bg-gradient-card border-border/50 backdrop-blur-glass">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Market Movers</h2>
        <span className="text-sm text-muted-foreground">(Top 10)</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {topCoins.map((coin) => {
          const isPositive = coin.price_change_percentage_24h >= 0;
          
          return (
            <Card key={coin.id} className="p-3 bg-card/50 border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src={coin.image} 
                  alt={`${coin.name} logo`} 
                  className="w-6 h-6 rounded-full" 
                />
                <div className="font-medium text-sm">
                  {coin.symbol.toUpperCase()}
                </div>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 text-crypto-green ml-auto" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-crypto-red ml-auto" />
                )}
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  ${coin.current_price.toLocaleString()}
                </div>
                <div className={`text-xs font-medium ${
                  isPositive ? 'text-crypto-green' : 'text-crypto-red'
                }`}>
                  {isPositive ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}