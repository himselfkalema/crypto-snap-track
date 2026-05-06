import { useState, useEffect } from 'react';
import { Coin, PortfolioPosition, LivePortfolioPosition, PortfolioSummary } from '@/types/crypto';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// CoinCap API v2 — no key required, no exposure risk
const COINCAP_API_URL = 'https://api.coincap.io/v2/assets?limit=250';
const COINCAP_ICON_URL = (symbol: string) =>
  `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`;

export function useCryptoData(userId?: string) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load portfolio from Supabase
  useEffect(() => {
    if (!userId) return;
    
    const fetchPortfolio = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('portfolios')
          .select('*')
          .eq('user_id', userId);
        
        if (error) {
          setError('Failed to load portfolio');
        } else {
          // Map database fields to interface format
          const mappedData = (data || []).map(item => ({
            id: item.coin_id,
            symbol: item.symbol,
            name: item.name,
            qty: item.qty,
            buyPrice: item.buy_price
          }));
          setPortfolio(mappedData);
        }
      } catch (e) {
        setError('Failed to load portfolio');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolio();
  }, [userId]);

  // Fetch market data
  const fetchCoins = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(COINCAP_API_URL);

      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }

      const json = await response.json();
      // Map CoinCap shape -> our Coin interface (mirrors CoinGecko fields used in the app)
      const mapped: Coin[] = (json.data || []).map((a: any) => {
        const price = parseFloat(a.priceUsd) || 0;
        const changePct = parseFloat(a.changePercent24Hr) || 0;
        const change24h = (price * changePct) / 100;
        return {
          id: a.id,
          symbol: (a.symbol || '').toLowerCase(),
          name: a.name,
          image: COINCAP_ICON_URL(a.symbol),
          current_price: price,
          market_cap: parseFloat(a.marketCapUsd) || 0,
          market_cap_rank: parseInt(a.rank, 10) || 0,
          price_change_24h: Number(change24h.toFixed(8)),
          price_change_percentage_24h: Number(changePct.toFixed(4)),
        };
      });
      setCoins(mapped);
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
  const addPosition = async ({ id, qty, buyPrice }: { id: string; qty: number; buyPrice: number }) => {
    if (!userId || !id || !qty) return;
    
    const coin = coins.find((c) => c.id === id) || findCoin(id);
    if (!coin) {
      setError('Coin not found. Try searching by symbol (eg. btc) or coin id (eg. bitcoin)');
      return;
    }

    try {
      const existing = portfolio.find((p) => p.id === coin.id);
      
      if (existing) {
        // Update existing position with weighted average
        const totalQty = Number(existing.qty) + Number(qty);
        const totalCost = (existing.buyPrice * existing.qty) + (buyPrice * qty);
        const avgPrice = Number((totalCost / totalQty).toFixed(8));
        
        const { error } = await supabase
          .from('portfolios')
          .update({ 
            qty: totalQty, 
            buy_price: avgPrice,
            updated_at: new Date().toISOString()
          })
          .eq('coin_id', existing.id)
          .eq('user_id', userId);

        if (error) {
          setError('Failed to update position');
          return;
        }

        setPortfolio(portfolio.map(p => 
          p.id === existing.id 
            ? { ...p, qty: totalQty, buyPrice: avgPrice }
            : p
        ));
      } else {
        // Create new position
        const { data, error } = await supabase
          .from('portfolios')
          .insert({
            user_id: userId,
            coin_id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            qty: Number(qty),
            buy_price: Number(buyPrice)
          })
          .select()
          .single();

        if (error) {
          setError('Failed to add position');
          return;
        }

        const newPosition: PortfolioPosition = {
          id: coin.id,  // Use coin ID for consistency
          symbol: coin.symbol,
          name: coin.name,
          qty: Number(qty),
          buyPrice: Number(buyPrice)
        };

        setPortfolio([...portfolio, newPosition]);
      }
      
      setError(null);
      toast({
        title: "Position added",
        description: `Added ${qty} ${coin.symbol.toUpperCase()} to your portfolio`
      });
    } catch (e) {
      setError('Failed to save position');
    }
  };

  // Remove position
  const removePosition = async (coinId: string) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('coin_id', coinId)
        .eq('user_id', userId);

      if (error) {
        setError('Failed to remove position');
        return;
      }

      setPortfolio(portfolio.filter(p => p.id !== coinId));
      toast({
        title: "Position removed",
        description: "Successfully removed from your portfolio"
      });
    } catch (e) {
      setError('Failed to remove position');
    }
  };

  // Reset portfolio
  const resetPortfolio = async () => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('user_id', userId);

      if (error) {
        setError('Failed to reset portfolio');
        return;
      }

      setPortfolio([]);
      toast({
        title: "Portfolio reset",
        description: "All positions have been removed"
      });
    } catch (e) {
      setError('Failed to reset portfolio');
    }
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