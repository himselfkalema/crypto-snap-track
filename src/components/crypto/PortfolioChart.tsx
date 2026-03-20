import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface Position {
  id: string;
  name: string;
  symbol: string;
  qty: number;
  buyPrice: number;
  currentPrice: number;
}

interface PortfolioChartProps {
  positions: Position[];
}

export function PortfolioChart({ positions }: PortfolioChartProps) {
  const chartData = useMemo(() => {
    if (positions.length === 0) return [];

    const totalCost = positions.reduce((s, p) => s + p.qty * p.buyPrice, 0);
    const totalValue = positions.reduce((s, p) => s + p.qty * p.currentPrice, 0);

    // Simulate 7-day performance curve between cost basis and current value
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];
    const diff = totalValue - totalCost;

    return days.map((day, i) => {
      const progress = i / (days.length - 1);
      // Ease-in-out curve with slight variance
      const curve = Math.pow(progress, 1.4);
      const jitter = i > 0 && i < days.length - 1
        ? (Math.sin(i * 2.7) * diff * 0.08)
        : 0;
      return {
        day,
        value: Math.round(totalCost + diff * curve + jitter),
        cost: Math.round(totalCost),
      };
    });
  }, [positions]);

  if (positions.length === 0) return null;

  const totalValue = positions.reduce((s, p) => s + p.qty * p.currentPrice, 0);
  const totalCost = positions.reduce((s, p) => s + p.qty * p.buyPrice, 0);
  const isPositive = totalValue >= totalCost;
  const changePercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100).toFixed(2) : "0";

  return (
    <Card className="p-6 glass-card rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold font-display">Portfolio Performance</h2>
            <p className="text-sm text-muted-foreground">7-day overview</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono">${totalValue.toLocaleString()}</p>
          <p className={`text-sm font-medium ${isPositive ? "text-crypto-green" : "text-crypto-red"}`}>
            {isPositive ? "+" : ""}{changePercent}%
          </p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isPositive ? "hsl(var(--crypto-green))" : "hsl(var(--crypto-red))"}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isPositive ? "hsl(var(--crypto-green))" : "hsl(var(--crypto-red))"}
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                padding: "12px 16px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString()}`,
                name === "value" ? "Portfolio Value" : "Cost Basis",
              ]}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#costGradient)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isPositive ? "hsl(var(--crypto-green))" : "hsl(var(--crypto-red))"}
              strokeWidth={2.5}
              fill="url(#valueGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: isPositive ? "hsl(var(--crypto-green))" : "hsl(var(--crypto-red))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
