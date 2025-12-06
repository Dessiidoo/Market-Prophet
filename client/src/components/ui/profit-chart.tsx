import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const INITIAL_DATA = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  value: 1000 + Math.random() * 50,
}));

export function ProfitChart({ active, initialAmount }: { active: boolean; initialAmount: number }) {
  const [data, setData] = useState(INITIAL_DATA);
  const [currentValue, setCurrentValue] = useState(initialAmount);

  useEffect(() => {
    setData(Array.from({ length: 20 }, (_, i) => ({
      time: i,
      value: initialAmount + (Math.random() * (initialAmount * 0.05)),
    })));
    setCurrentValue(initialAmount);
  }, [initialAmount]);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setData((prev) => {
        const lastValue = prev[prev.length - 1].value;
        
        // Aggressive growth algorithm for "Wow Factor"
        // Base growth between 2% and 5% per tick
        const growthRate = 0.02 + (Math.random() * 0.03); 
        const volatility = lastValue * 0.01; 
        
        const change = (lastValue * growthRate) + (Math.random() * volatility - (volatility * 0.5));
        const newValue = lastValue + change;
        
        const newData = [...prev.slice(1), { time: prev[prev.length - 1].time + 1, value: newValue }];
        setCurrentValue(newValue);
        return newData;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [active]);

  const percentageGain = initialAmount > 0 ? ((currentValue - initialAmount) / initialAmount) * 100 : 0;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-end justify-between mb-4">
        <div>
           <div className="text-muted-foreground text-sm font-mono tracking-widest uppercase">Projected Portfolio Value</div>
           <motion.div 
             className="text-4xl md:text-5xl font-display font-bold text-foreground"
             key={Math.floor(currentValue)} // Animate on integer change
             initial={{ scale: 1.1, color: "hsl(var(--primary))" }}
             animate={{ scale: 1, color: "hsl(var(--foreground))" }}
             transition={{ duration: 0.2 }}
           >
             ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
           </motion.div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold font-mono ${percentageGain >= 0 ? 'text-primary' : 'text-destructive'}`}>
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
