import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, TrendingUp, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Trade {
  id: string;
  symbol: string;
  action: string;
  entryPrice: number;
  targetPrice: number;
  confidence: number;
  reason: string;
  createdAt: string;
}

export function TradeCard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await fetch('/api/trades/recent?limit=4');
        if (response.ok) {
          const data = await response.json();
          setTrades(data);
        }
      } catch (error) {
        console.error('Failed to fetch trades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50 animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-6 bg-muted rounded w-20"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {trades.map((trade, i) => (
        <motion.div
          key={trade.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          data-testid={`card-trade-${trade.id}`}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-display tracking-wider flex items-center gap-2" data-testid={`text-symbol-${trade.id}`}>
                    {trade.symbol}
                    <span 
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                        trade.action === 'BUY' 
                          ? 'bg-primary/20 text-primary border-primary/30' 
                          : 'bg-destructive/20 text-destructive border-destructive/30'
                      }`}
                      data-testid={`text-action-${trade.id}`}
                    >
                      {trade.action}
                    </span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono" data-testid={`text-reason-${trade.id}`}>
                    {trade.reason}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary flex items-center justify-end gap-1" data-testid={`text-confidence-${trade.id}`}>
                    {trade.confidence}%
                    <Zap className="w-4 h-4 fill-primary" />
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-[10px] uppercase">Entry</div>
                  <div className="font-mono text-foreground" data-testid={`text-entry-${trade.id}`}>
                    ${trade.entryPrice.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground text-[10px] uppercase">Target</div>
                  <div className="font-mono text-primary font-bold flex items-center justify-end gap-1" data-testid={`text-target-${trade.id}`}>
                    ${trade.targetPrice.toFixed(2)}
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/30 flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Est. ROI</span>
                <span className="font-bold text-primary" data-testid={`text-roi-${trade.id}`}>
                  +{(((trade.targetPrice - trade.entryPrice) / trade.entryPrice) * 100).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
