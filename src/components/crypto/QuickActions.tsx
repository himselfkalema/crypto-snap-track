import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, RotateCcw, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QuickActionsProps {
  onResetPortfolio: () => void;
  onRefreshData: () => void;
}

export function QuickActions({ onResetPortfolio, onRefreshData }: QuickActionsProps) {
  const handleReset = () => {
    if (confirm("Are you sure you want to reset your entire portfolio? This action cannot be undone.")) {
      onResetPortfolio();
      toast({
        title: "Portfolio Reset",
        description: "Your portfolio has been cleared successfully",
      });
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-border/50 backdrop-blur-glass">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Quick Actions</h3>
      </div>

      <div className="space-y-3">
        <Button 
          onClick={onRefreshData} 
          variant="outline" 
          className="w-full justify-start"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Market Data
        </Button>
        
        <Button 
          onClick={handleReset} 
          variant="destructive" 
          className="w-full justify-start"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Portfolio
        </Button>
      </div>
    </Card>
  );
}