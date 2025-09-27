import { useState } from "react";
import { Coin } from "@/types/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Plus, X } from "lucide-react";

interface AddPositionFormProps {
  coins: Coin[];
  onAddPosition: (data: { id: string; qty: number; buyPrice: number }) => void;
  error?: string;
}

export function AddPositionForm({ coins, onAddPosition, error }: AddPositionFormProps) {
  const [query, setQuery] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [qty, setQty] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const findCoin = (input: string) => {
    const q = input.trim().toLowerCase();
    return (
      coins.find((c) => c.id === q || c.symbol === q || c.name.toLowerCase() === q) ||
      coins.find((c) => c.symbol === q.replace(/^\$/, ''))
    );
  };

  const handleSearch = () => {
    const coin = findCoin(query);
    if (coin) {
      setSelectedCoin(coin);
      setBuyPrice(coin.current_price.toString());
    }
  };

  const handleAdd = () => {
    if (!selectedCoin || !qty) return;
    
    onAddPosition({
      id: selectedCoin.id,
      qty: Number(qty),
      buyPrice: Number(buyPrice || selectedCoin.current_price)
    });

    // Reset form
    setQuery('');
    setSelectedCoin(null);
    setQty('');
    setBuyPrice('');
  };

  const handleClear = () => {
    setQuery('');
    setSelectedCoin(null);
    setQty('');
    setBuyPrice('');
  };

  return (
    <Card className="p-6 bg-gradient-card border-border/50 backdrop-blur-glass">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Add Position</h3>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or symbol (eg. bitcoin or btc)"
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {selectedCoin && (
          <Card className="p-3 bg-primary/10 border-primary/20">
            <div className="flex items-center gap-3">
              <img 
                src={selectedCoin.image} 
                alt={`${selectedCoin.name} logo`} 
                className="w-10 h-10 rounded-full" 
              />
              <div>
                <div className="font-medium text-foreground">
                  {selectedCoin.name} ({selectedCoin.symbol.toUpperCase()})
                </div>
                <div className="text-sm text-muted-foreground">
                  Current Price: ${selectedCoin.current_price.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Quantity (eg. 0.5)"
            type="number"
            step="any"
          />
          <Input
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="Buy Price (USD)"
            type="number"
            step="any"
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleAdd} 
            disabled={!selectedCoin || !qty}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to Portfolio
          </Button>
          <Button onClick={handleClear} variant="outline">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}