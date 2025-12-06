import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, TrendingUp, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface Trade {
  ticker: string;
  name: string;
  entry: number;
  target: number;
  confidence: number;
}

const MOCK_TRADES: Trade[] = [
  { ticker: "NVDA", name: "NVIDIA Corp", entry: 890.45, target: 1250.00, confidence: 98.4 },
  { ticker: "BTC", name: "Bitcoin", entry: 64500.20, target: 82000.00, confidence: 96.1 },
  { ticker: "TSLA", name: "Tesla Inc", entry: 175.30, target: 240.00, confidence: 92.8 },
  { ticker: "AMD", name: "Adv Micro Dev", entry: 162.15, target: 210.50, confidence: 91.5 },
];

export function TradeCard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {MOCK_TRADES.map((trade, i) => (
        <motion.div
          key={trade.ticker}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-display tracking-wider flex items-center gap-2">
                    {trade.ticker}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono border border-primary/30">BUY</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono">{trade.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary flex items-center justify-end gap-1">
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
                  <div className="font-mono text-foreground">${trade.entry.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground text-[10px] uppercase">Target</div>
                  <div className="font-mono text-primary font-bold flex items-center justify-end gap-1">
                    ${trade.target.toFixed(2)}
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/30 flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Est. ROI</span>
                <span className="font-bold text-primary">
                  +{(((trade.target - trade.entry) / trade.entry) * 100).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
