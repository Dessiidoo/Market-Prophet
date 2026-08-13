import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";

interface Portfolio {
  id: string;
  initialInvestment: number;
  currentValue: number;
}

export function ProfitChart({ active, initialAmount }: { active: boolean; initialAmount: number }) {
  const [data, setData] = useState<Array<{ time: number; value: number }>>([]);
  const [currentValue, setCurrentValue] = useState(initialAmount);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);

  useEffect(() => {
    const loadPortfolio = async () => {
      const storedPortfolioId = localStorage.getItem("golddust_portfolio_id");
      if (!storedPortfolioId) {
        setCurrentValue(initialAmount);
        setData([{ time: Date.now(), value: initialAmount }]);
        return;
      }

      try {
        const response = await fetch(`/api/portfolio/${storedPortfolioId}`);
        if (!response.ok) throw new Error("Portfolio unavailable");
        const portfolio: Portfolio = await response.json();
        setPortfolioId(portfolio.id);
        setCurrentValue(portfolio.currentValue);
        setData([{ time: Date.now(), value: portfolio.currentValue }]);
      } catch (error) {
        console.error("Failed to fetch portfolio:", error);
        setCurrentValue(initialAmount);
        setData([{ time: Date.now(), value: initialAmount }]);
      }
    };

    loadPortfolio();
  }, [initialAmount]);

  useEffect(() => {
    if (!active || !portfolioId) return;

    const refresh = async () => {
      try {
        const response = await fetch(`/api/portfolio/${portfolioId}`);
        if (!response.ok) return;
        const portfolio: Portfolio = await response.json();
        setCurrentValue(portfolio.currentValue);
        setData(prev => [...prev.slice(-29), { time: Date.now(), value: portfolio.currentValue }]);
      } catch (error) {
        console.error("Failed to refresh portfolio:", error);
      }
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [active, portfolioId]);

  const percentageGain = initialAmount > 0
    ? ((currentValue - initialAmount) / initialAmount) * 100
    : 0;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-muted-foreground text-sm font-mono tracking-widest uppercase">Portfolio Value</div>
          <div className="text-4xl md:text-5xl font-display font-bold text-foreground" data-testid="text-portfolio-value">
            ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold font-mono ${percentageGain >= 0 ? "text-primary" : "text-destructive"}`} data-testid="text-portfolio-gain">
            {percentageGain >= 0 ? "+" : ""}{percentageGain.toFixed(2)}%
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Return</div>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full bg-black/20 rounded-lg border border-border/50 p-4 relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis domain={["auto", "auto"]} orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "Rajdhani" }} axisLine={false} tickLine={false}
              tickFormatter={(value) => `$${value < 1000 ? value.toFixed(0) : (value / 1000).toFixed(1) + "k"}`} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Value"]} />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={0.2} fill="hsl(var(--primary))" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
