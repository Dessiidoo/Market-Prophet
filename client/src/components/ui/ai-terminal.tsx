import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Cpu, ShieldCheck, Wifi } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

export function AiTerminal({ active }: { active: boolean }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastTradeCheck, setLastTradeCheck] = useState<string>("");
  const [lastPortfolioValue, setLastPortfolioValue] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0);

  // Stable, non-random IDs — order of real events, not Math.random()
  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    logIdCounter.current += 1;
    const newLog: LogEntry = {
      id: `log-${logIdCounter.current}`,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 }),
      message,
      type,
    };
    setLogs((prev) => [...prev.slice(-20), newLog]);
  };

  useEffect(() => {
    if (!active) return;

    // One-time real status messages on activation — not fabricated, just state transitions
    addLog("System activated.", "info");

    let cancelled = false;

    // Poll for real trade signals — this was already legitimate, kept as-is
    const tradeCheckInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/trades/recent?limit=1");
        if (!response.ok) return;
        const trades = await response.json();
        if (cancelled) return;
        if (trades.length > 0 && trades[0].id !== lastTradeCheck) {
          setLastTradeCheck(trades[0].id);
          addLog(`>>> Signal: ${trades[0].symbol} ${trades[0].action}`, "success");
          addLog(
            `Confidence: ${trades[0].confidence}% | Entry: $${trades[0].entryPrice?.toFixed(2)}`,
            "success"
          );
          if (trades[0].reason) addLog(`Reason: ${trades[0].reason}`, "info");
        }
      } catch (error) {
        console.error("Failed to fetch trades for terminal:", error);
        addLog("Trade feed unreachable — retrying...", "warning");
      }
    }, 5000);

    // Report real portfolio changes — every time value actually changes, not on a coin flip
    const portfolioInterval = setInterval(async () => {
      const portfolioId = localStorage.getItem("golddust_portfolio_id");
      if (!portfolioId) return;
      try {
        const response = await fetch(`/api/portfolio/${portfolioId}`);
        if (!response.ok) return;
        const portfolio = await response.json();
        if (cancelled) return;

        if (lastPortfolioValue !== null && portfolio.currentValue !== lastPortfolioValue) {
          const gain =
            ((portfolio.currentValue - portfolio.initialInvestment) / portfolio.initialInvestment) * 100;
          const direction = portfolio.currentValue >= lastPortfolioValue ? "success" : "warning";
          addLog(
            `Portfolio update: $${portfolio.currentValue.toFixed(2)} (${gain >= 0 ? "+" : ""}${gain.toFixed(2)}%)`,
            direction
          );
        }
        setLastPortfolioValue(portfolio.currentValue);
      } catch (error) {
        console.error("Failed to fetch portfolio for terminal:", error);
      }
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(tradeCheckInterval);
      clearInterval(portfolioInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-20"></div>
      </div>
    </div>
  );
}
