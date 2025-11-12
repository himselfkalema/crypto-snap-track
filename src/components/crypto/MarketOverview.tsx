import { useEffect, useState } from "react";

interface MarketData {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
}

export default function MarketOverview() {
  const [markets, setMarkets] = useState<MarketData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
      const results = await Promise.all(
        symbols.map(sym =>
          fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`).then(r => r.json())
        )
      );
      setMarkets(results);
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-card">
      <h2 className="text-xl font-bold mb-4">📊 Live Market Overview</h2>
      <div className="space-y-2">
        {markets.map((coin, i) => (
          <div key={i} className="flex justify-between">
            <span className="font-medium">{coin.symbol.replace("USDT", "")}</span>
            <span className={parseFloat(coin.priceChangePercent) >= 0 ? "text-success" : "text-destructive"}>
              ${parseFloat(coin.lastPrice).toFixed(2)} ({parseFloat(coin.priceChangePercent).toFixed(2)}%)
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
  );
}
