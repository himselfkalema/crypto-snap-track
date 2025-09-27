import { PortfolioSummary as PortfolioSummaryType } from "@/types/crypto";

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
}

export function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  const { totalValue, totalPnl, totalPnlPct } = summary;

  return (
    <div className="text-right">
      <div className="text-sm text-muted-foreground">Total Value</div>
      <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
        ${totalValue.toLocaleString()}
      </div>
      <div className={`text-sm font-medium ${
        totalPnl >= 0 
          ? 'text-crypto-green' 
          : 'text-crypto-red'
      }`}>
        {totalPnl >= 0 ? '+' : ''}${totalPnl} ({totalPnlPct.toFixed(2)}%)
      </div>
    </div>
  );
}