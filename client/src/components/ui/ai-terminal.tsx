import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Cpu, ShieldCheck, Wifi } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

const ANALYSIS_MESSAGES = [
  "Analyzing 40,000 assets...",
  "Cross-referencing historical volatility...",
  "Optimizing entry points...",
  "Re-calibrating predictive models...",
  "Monitoring whale wallet movements...",
  "Encryption layer secure.",
];

export function AiTerminal({ active }: { active: boolean }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastTradeCheck, setLastTradeCheck] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 }),
      message,
      type,
    };
    setLogs((prev) => [...prev.slice(-20), newLog]);
  };

  useEffect(() => {
    if (!active) return;

    addLog("Initializing neural pathways...", "info");
    addLog("Connecting to global market exchanges...", "info");

    const analysisInterval = setInterval(() => {
      const randomMsg = ANALYSIS_MESSAGES[Math.floor(Math.random() * ANALYSIS_MESSAGES.length)];
      addLog(randomMsg, "info");
    }, 3000);

    const tradeCheckInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/trades/recent?limit=1');
        if (response.ok) {
          const trades = await response.json();
          if (trades.length > 0 && trades[0].id !== lastTradeCheck) {
            setLastTradeCheck(trades[0].id);
            addLog(`>>> Market signal detected: ${trades[0].symbol} ${trades[0].action}`, "success");
            addLog(`Confidence: ${trades[0].confidence}% | Entry: $${trades[0].entryPrice.toFixed(2)}`, "success");
            addLog(`Reason: ${trades[0].reason}`, "info");
          }
        }
      } catch (error) {
        console.error('Failed to fetch trades for terminal:', error);
      }
    }, 5000);

    const portfolioInterval = setInterval(async () => {
      const portfolioId = localStorage.getItem('golddust_portfolio_id');
      if (portfolioId) {
        try {
          const response = await fetch(`/api/portfolio/${portfolioId}`);
          if (response.ok) {
            const portfolio = await response.json();
            const gain = ((portfolio.currentValue - portfolio.initialInvestment) / portfolio.initialInvestment) * 100;
            if (Math.random() > 0.7) {
              addLog(`Portfolio update: $${portfolio.currentValue.toFixed(2)} (+${gain.toFixed(2)}%)`, "success");
            }
          }
        } catch (error) {
          console.error('Failed to fetch portfolio for terminal:', error);
        }
      }
    }, 10000);

    return () => {
      clearInterval(analysisInterval);
      clearInterval(tradeCheckInterval);
      clearInterval(portfolioInterval);
    };
  }, [active, lastTradeCheck]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="rounded-lg border border-border/50 bg-black/40 backdrop-blur-sm overflow-hidden flex flex-col h-full font-mono text-xs">
      <div className="flex items-center justify-between p-2 border-b border-border/50 bg-white/5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Terminal className="w-4 h-4" />
          <span className="font-bold tracking-widest">GOLD_DUST_KERNEL_V4.2</span>
        </div>
        <div className="flex gap-2">
           <Wifi className={`w-3 h-3 ${active ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
           <Cpu className={`w-3 h-3 ${active ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
           <ShieldCheck className="w-3 h-3 text-primary" />
        </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-1 relative">
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3"
            >
              <span className="text-muted-foreground/50 shrink-0">[{log.timestamp}]</span>
              <span className={log.type === "success" ? "text-primary" : "text-foreground/80"}>
                {log.type === "success" && ">>> "}
                {log.message}
              </span>
            </motion.div>
          ))}
          {logs.length === 0 && (
            <div className="text-muted-foreground/30 italic">System Ready. Awaiting Activation...</div>
          )}
        </AnimatePresence>
        
        {/* Scan line effect */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-20"></div>
      </div>
    </div>
  );
}
