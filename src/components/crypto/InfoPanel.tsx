import { Card } from "@/components/ui/card";
import { Info, Lightbulb } from "lucide-react";

export function InfoPanel() {
  return (
    <Card className="p-6 bg-gradient-card border-border/50 backdrop-blur-glass">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-warning" />
        <h3 className="text-lg font-semibold">Tips & Info</h3>
      </div>

      <div className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
          <div>
            Use coin ID (eg. bitcoin) or symbol (eg. btc) when searching for cryptocurrencies.
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
          <div>
            Buy price is optional - if omitted, current market price will be used.
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
          <div>
            All market data is fetched from CoinGecko's public API in real-time.
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
          <div>
            Your portfolio data is stored locally in your browser and never sent to any server.
          </div>
        </div>
      </div>
    </Card>
  );
}