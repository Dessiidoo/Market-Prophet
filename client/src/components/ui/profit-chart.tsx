import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Portfolio {
  id: string;
  userId: string;
  initialInvestment: number;
  currentValue: number;
  createdAt: string;
}

export function ProfitChart({ active, initialAmount }: { active: boolean; initialAmount: number }) {
  const [data, setData] = useState<Array<{ time: number; value: number }>>([]);
  const [currentValue, setCurrentValue] = useState(initialAmount);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);

  useEffect(() => {
    const initializePortfolio = async () => {
      const storedPortfolioId = localStorage.getItem('golddust_portfolio_id');
      
      if (storedPortfolioId) {
        try {
          const response = await fetch(`/api/portfolio/${storedPortfolioId}`);
          if (response.ok) {
            const portfolio: Portfolio = await response.json();
            setPortfolioId(portfolio.id);
            setCurrentValue(portfolio.currentValue);
            setData(Array.from({ length: 20 }, (_, i) => ({
              time: i,
              value: portfolio.initialInvestment + (i / 20) * (portfolio.currentValue - portfolio.initialInvestment),
            })));
            return;
          }
        } catch (error) {
          console.error('Failed to fetch portfolio:', error);
        }
      }
      
      try {
        const response = await fetch('/api/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'demo-user',
            initialInvestment: initialAmount,
          }),
        });
        
        if (response.ok) {
          const portfolio: Portfolio = await response.json();
          setPortfolioId(portfolio.id);
          localStorage.setItem('golddust_portfolio_id', portfolio.id);
          setCurrentValue(initialAmount);
          setData(Array.from({ length: 20 }, (_, i) => ({
            time: i,
            value: initialAmount + (Math.random() * (initialAmount * 0.05)),
          })));
          
          fetch('/api/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ portfolioId: portfolio.id }),
          }).catch(err => console.error('Failed to initialize trade signals:', err));
        }
      } catch (error) {
        console.error('Failed to create portfolio:', error);
        setData(Array.from({ length: 20 }, (_, i) => ({
          time: i,
          value: initialAmount + (Math.random() * (initialAmount * 0.05)),
        })));
        setCurrentValue(initialAmount);
      }
    };

    initializePortfolio();
  }, [initialAmount]);

  useEffect(() => {
    if (!active || !portfolioId) return;

    const interval = setInterval(() => {
      setData((prev) => {
        const lastValue = prev[prev.length - 1].value;
        
        const growthRate = 0.02 + (Math.random() * 0.03); 
        const volatility = lastValue * 0.01; 
        
        const change = (lastValue * growthRate) + (Math.random() * volatility - (volatility * 0.5));
        const newValue = lastValue + change;
        
        const newData = [...prev.slice(1), { time: prev[prev.length - 1].time + 1, value: newValue }];
        setCurrentValue(newValue);
        
        fetch(`/api/portfolio/${portfolioId}/value`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentValue: newValue }),
        }).catch(err => console.error('Failed to update portfolio value:', err));
        
        return newData;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [active, portfolioId]);

  const percentageGain = initialAmount > 0 ? ((currentValue - initialAmount) / initialAmount) * 100 : 0;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-end justify-between mb-4">
        <div>
           <div className="text-muted-foreground text-sm font-mono tracking-widest uppercase">Projected Portfolio Value</div>
           <motion.div 
             className="text-4xl md:text-5xl font-display font-bold text-foreground"
             key={Math.floor(currentValue)}
             initial={{ scale: 1.1, color: "hsl(var(--primary))" }}
             animate={{ scale: 1, color: "hsl(var(--foreground))" }}
             transition={{ duration: 0.2 }}
             data-testid="text-portfolio-value"
           >
             ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
           </motion.div>
        </div>
        <div className="text-right">
          <div 
            className={`text-2xl font-bold font-mono ${percentageGain >= 0 ? 'text-primary' : 'text-destructive'}`}
            data-testid="text-portfolio-gain"
          >
            {percentageGain >= 0 ? '+' : ''}{percentageGain.toFixed(2)}%
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Return</div>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full bg-black/20 rounded-lg border border-border/50 p-4 relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis 
              domain={['auto', 'auto']} 
              orientation="right" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'Rajdhani' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value < 1000 ? value.toFixed(0) : (value/1000).toFixed(1) + 'k'}`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--primary))' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Value"]}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
      </div>
    </div>
  );
}
