import { LivePortfolioPosition } from "@/types/crypto";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PositionCardProps {
  position: LivePortfolioPosition;
  onRemove: (id: string) => void;
}

export function PositionCard({ position, onRemove }: PositionCardProps) {
  const {
    id,
    name,
    symbol,
    qty,
    buyPrice,
    currentPrice,
    value,
    pnl,
    pnlPct,
    image
  } = position;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      toast({
        title: "Copied!",
        description: `${symbol.toUpperCase()} ID copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4 bg-gradient-card border-border/50 backdrop-blur-glass">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={image} 
            alt={`${name} logo`} 
            className="w-12 h-12 rounded-full ring-2 ring-primary/20"
          />
          <div>
            <div className="font-semibold text-foreground">
              {name} <span className="text-sm text-muted-foreground">{symbol.toUpperCase()}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Qty: {qty} • Avg: ${buyPrice} • Current: ${currentPrice}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold text-foreground">
            ${value.toLocaleString()}
          </div>
          <div className={`text-sm font-medium ${
            pnl >= 0 ? 'text-crypto-green' : 'text-crypto-red'
          }`}>
            {pnl >= 0 ? '+' : ''}${pnl} ({pnlPct.toFixed(2)}%)
          </div>
          <div className="mt-2 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyId}
              className="h-8"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => onRemove(id)}
              className="h-8"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}