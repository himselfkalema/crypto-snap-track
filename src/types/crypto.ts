export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  qty: number;
  buyPrice: number;
}

export interface LivePortfolioPosition extends PortfolioPosition {
  currentPrice: number;
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  image?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPct: number;
}