import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface MarketData {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
}

interface FlashState {
  [symbol: string]: "up" | "down" | null;
}

export default function MarketTicker() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [flash, setFlash] = useState<FlashState>({});
  const prevPrices = useRef<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];
        const res = await Promise.all(
          symbols.map((sym) =>
            fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`).then((r) => r.json())
          )
        );

        // Detect price changes for flash effect
        const newFlash: FlashState = {};
        res.forEach((coin: MarketData) => {
          const current = parseFloat(coin.lastPrice);
          const prev = prevPrices.current[coin.symbol];
          if (prev !== undefined && current !== prev) {
            newFlash[coin.symbol] = current > prev ? "up" : "down";
          }
          prevPrices.current[coin.symbol] = current;
        });

        if (Object.keys(newFlash).length > 0) {
          setFlash(newFlash);
          setTimeout(() => setFlash({}), 800);
        }

        setMarkets(res);
      } catch (e) {
        console.error("Market fetch error:", e);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logic — duplicate items for seamless loop
  useEffect(() => {
    if (!scrollRef.current || markets.length === 0 || isPaused) return;

    const el = scrollRef.current;
    let animationId: number;
    let scrollPos = 0;
    const speed = 0.5;

    const step = () => {
      scrollPos += speed;
      // Reset when we've scrolled past the first set of items
      if (scrollPos >= el.scrollWidth / 2) {
        scrollPos = 0;
      }
      el.scrollLeft = scrollPos;
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationId);
  }, [markets, isPaused]);

  const duplicatedMarkets = [...markets, ...markets];

  return (
    <div className="glass-card rounded-2xl p-6 max-w-5xl mx-auto overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-primary/20">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-xl font-semibold font-display">Live Market</h3>
        <div className="ml-auto flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crypto-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-crypto-green" />
          </span>
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Scrolling ticker strip */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="flex gap-4 overflow-hidden select-none"
        style={{ scrollBehavior: "auto" }}
      >
        {duplicatedMarkets.map((coin, i) => {
          const isPositive = parseFloat(coin.priceChangePercent) >= 0;
          const flashDir = flash[coin.symbol];
          const flashClass =
            flashDir === "up"
              ? "ring-2 ring-crypto-green/60 bg-crypto-green/10"
              : flashDir === "down"
              ? "ring-2 ring-crypto-red/60 bg-crypto-red/10"
              : "";

          return (
            <div
              key={`${coin.symbol}-${i}`}
              className={`flex-shrink-0 w-52 p-4 rounded-xl bg-background/50 border border-border/50
                hover:border-primary/30 transition-all duration-300 ${flashClass}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">{coin.symbol.replace("USDT", "")}</span>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-crypto-green" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-crypto-red" />
                )}
              </div>
              <div className={`text-xl font-mono font-semibold transition-colors duration-300 ${
                flashDir === "up" ? "text-crypto-green" : flashDir === "down" ? "text-crypto-red" : ""
              }`}>
                ${parseFloat(coin.lastPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className={`text-sm font-medium ${isPositive ? "text-crypto-green" : "text-crypto-red"}`}>
                {isPositive ? "+" : ""}
                {parseFloat(coin.priceChangePercent).toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-sm text-muted-foreground text-center">
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
  );
}
