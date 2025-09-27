import { useState, useEffect } from 'react';
import { Coin, PortfolioPosition, LivePortfolioPosition, PortfolioSummary } from '@/types/crypto';

export function useCryptoData() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load portfolio from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('crypto_portfolio_v1');
      if (saved) {
        setPortfolio(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load saved portfolio', e);
    }
  }, []);

  // Save portfolio when it changes
  useEffect(() => {
    localStorage.setItem('crypto_portfolio_v1', JSON.stringify(portfolio));
  }, [portfolio]);

  // Fetch market data
  const fetchCoins = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      
      const data = await response.json();
      setCoins(data);
    } catch (e) {
      setError('Failed to load coin data. Please check your internet connection.');
      console.error('Failed to fetch coins:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchCoins();
  }, []);

  // Helper: find coin by id or symbol
  const findCoin = (input: string): Coin | undefined => {
    const q = input.trim().toLowerCase();
    return (
      coins.find((c) => c.id === q || c.symbol === q || c.name.toLowerCase() === q) ||
      coins.find((c) => c.symbol === q.replace(/^\$/, ''))
    );
  };

  // Add position
  const addPosition = ({ id, qty, buyPrice }: { id: string; qty: number; buyPrice: number }) => {
    if (!id || !qty) return;
    
    const coin = coins.find((c) => c.id === id) || findCoin(id);
    if (!coin) {
      setError('Coin not found. Try searching by symbol (eg. btc) or coin id (eg. bitcoin)');
      return;
    }

    const existing = portfolio.find((p) => p.id === coin.id);
    if (existing) {
      // Update existing position with weighted average
      const totalQty = Number(existing.qty) + Number(qty);
      const totalCost = (existing.buyPrice * existing.qty) + (buyPrice * qty);
      const avgPrice = Number((totalCost / totalQty).toFixed(2));
      
      const updated = portfolio.map((p) =>
        p.id === coin.id
          ? { ...p, qty: totalQty, buyPrice: avgPrice }
          : p
      );
      setPortfolio(updated);
    } else {
      setPortfolio((p) => [...p, { 
        id: coin.id, 
        symbol: coin.symbol, 
        name: coin.name, 
        qty: Number(qty), 
        buyPrice: Number(buyPrice) 
      }]);
    }
    
    setError(null);
  };

  // Remove position
  const removePosition = (id: string) => {
    setPortfolio((p) => p.filter((x) => x.id !== id));
  };

  // Reset portfolio
  const resetPortfolio = () => {
    setPortfolio([]);
    localStorage.removeItem('crypto_portfolio_v1');
  };

  // Compute live portfolio with current prices
  const livePortfolio: LivePortfolioPosition[] = portfolio.map((pos) => {
    const coin = coins.find((c) => c.id === pos.id);
    const currentPrice = coin ? coin.current_price : 0;
    const value = Number((currentPrice * pos.qty).toFixed(2));
    const cost = Number((pos.buyPrice * pos.qty).toFixed(2));
    const pnl = Number((value - cost).toFixed(2));
    const pnlPct = cost ? Number(((pnl / cost) * 100).toFixed(2)) : 0;
    
    return { 
      ...pos, 
      currentPrice, 
      value, 
      cost, 
      pnl, 
      pnlPct, 
      image: coin?.image 
    };
  });

  // Calculate portfolio summary
  const portfolioSummary: PortfolioSummary = {
    totalValue: Number(livePortfolio.reduce((s, p) => s + p.value, 0).toFixed(2)),
    totalCost: Number(livePortfolio.reduce((s, p) => s + p.cost, 0).toFixed(2)),
    totalPnl: 0,
    totalPnlPct: 0,
  };
  
  portfolioSummary.totalPnl = Number((portfolioSummary.totalValue - portfolioSummary.totalCost).toFixed(2));
  portfolioSummary.totalPnlPct = portfolioSummary.totalCost 
    ? Number(((portfolioSummary.totalPnl / portfolioSummary.totalCost) * 100).toFixed(2)) 
    : 0;

  return {
    coins,
    portfolio,
    livePortfolio,
    portfolioSummary,
    isLoading,
    error,
    setError,
    addPosition,
    removePosition,
    resetPortfolio,
    refreshData: fetchCoins,
  };
}