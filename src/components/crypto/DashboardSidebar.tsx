import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PanelRight, Plus, Settings, BarChart3, Lightbulb, X } from "lucide-react";
import { AddPositionForm } from "./AddPositionForm";
import { QuickActions } from "./QuickActions";
import MarketOverview from "./MarketOverview";
import { InfoPanel } from "./InfoPanel";
import { Coin } from "@/types/crypto";
import { cn } from "@/lib/utils";

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
          className={cn(
            "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg border-0",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "transition-all duration-300 ease-out",
            "hover:scale-110 hover:shadow-xl hover:shadow-primary/25",
            "active:scale-95",
            open && "rotate-90 opacity-0 pointer-events-none"
          )}
        >
          <PanelRight className="h-6 w-6 transition-transform duration-200" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[400px] overflow-y-auto bg-background/95 backdrop-blur-xl border-border/50"
      >
        <div className="space-y-6 py-6">
          {/* Quick Nav Pills with staggered animation */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'add-position', icon: Plus, label: 'Add Position', delay: 0 },
              { id: 'quick-actions', icon: Settings, label: 'Actions', delay: 50 },
              { id: 'market-overview', icon: BarChart3, label: 'Market', delay: 100 },
              { id: 'tips-info', icon: Lightbulb, label: 'Tips', delay: 150 },
            ].map((item) => (
              <Button
                key={item.id}
                variant="secondary"
                size="sm"
                className={cn(
                  "gap-2 transition-all duration-300 ease-out",
                  "hover:scale-105 hover:shadow-md",
                  "animate-in fade-in slide-in-from-right-4",
                )}
                style={{ animationDelay: `${item.delay}ms`, animationFillMode: 'backwards' }}
                onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>

          {/* Content sections with staggered animations */}
          <div 
            id="add-position"
            className="animate-in fade-in slide-in-from-bottom-4 duration-400"
            style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
          >
            <AddPositionForm
              coins={coins}
              onAddPosition={onAddPosition}
              error={error}
            />
          </div>

          <div 
            id="quick-actions"
            className="animate-in fade-in slide-in-from-bottom-4 duration-400"
            style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
          >
            <QuickActions
              onResetPortfolio={onResetPortfolio}
              onRefreshData={onRefreshData}
            />
          </div>

          <div 
            id="market-overview"
            className="animate-in fade-in slide-in-from-bottom-4 duration-400"
            style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
          >
            <MarketOverview />
          </div>

          <div 
            id="tips-info"
            className="animate-in fade-in slide-in-from-bottom-4 duration-400"
            style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
          >
            <InfoPanel />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
