import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PanelRight, Plus, Settings, BarChart3, Lightbulb } from "lucide-react";
import { AddPositionForm } from "./AddPositionForm";
import { QuickActions } from "./QuickActions";
import MarketOverview from "./MarketOverview";
import { InfoPanel } from "./InfoPanel";
import { Coin } from "@/types/crypto";

interface DashboardSidebarProps {
  coins: Coin[];
  onAddPosition: (data: { id: string; qty: number; buyPrice: number }) => void;
  onResetPortfolio: () => void;
  onRefreshData: () => void;
  error?: string;
}

export function DashboardSidebar({
  coins,
  onAddPosition,
  onResetPortfolio,
  onRefreshData,
  error,
}: DashboardSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 border-0"
        >
          <PanelRight className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[400px] overflow-y-auto bg-background/95 backdrop-blur-xl border-border/50"
      >
        <div className="space-y-6 py-6">
          {/* Quick Nav Pills */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => document.getElementById('add-position')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Plus className="h-4 w-4" />
              Add Position
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => document.getElementById('quick-actions')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Settings className="h-4 w-4" />
              Actions
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => document.getElementById('market-overview')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <BarChart3 className="h-4 w-4" />
              Market
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => document.getElementById('tips-info')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Lightbulb className="h-4 w-4" />
              Tips
            </Button>
          </div>

          <div id="add-position">
            <AddPositionForm
              coins={coins}
              onAddPosition={onAddPosition}
              error={error}
            />
          </div>

          <div id="quick-actions">
            <QuickActions
              onResetPortfolio={onResetPortfolio}
              onRefreshData={onRefreshData}
            />
          </div>

          <div id="market-overview">
            <MarketOverview />
          </div>

          <div id="tips-info">
            <InfoPanel />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
