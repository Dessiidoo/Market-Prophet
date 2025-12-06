import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Cpu, ShieldCheck, Wifi } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

const MOCK_LOGS = [
  "Initializing neural pathways...",
  "Connecting to global market exchanges...",
  "Analyzing 40,000 assets...",
  "Sentiment analysis: TWITTER [POSITIVE]",
  "Sentiment analysis: REDDIT [NEUTRAL]",
  "Sentiment analysis: BLOOMBERG [NEGATIVE]",
  "Cross-referencing historical volatility...",
  "Detecting arbitrage opportunity on EXCHANGE_04...",
  "Optimizing entry points...",
  "Risk assessment: 0.001% downside probability...",
  "Allocating capital to high-frequency nodes...",
  "Pattern recognition: BULL_FLAG detected on AAPL...",
  "Pattern recognition: HEAD_SHOULDERS on BTC...",
  "Executing trade sequence ALPHA-9...",
  "Profit target locked.",
  "Re-calibrating predictive models...",
  "Ingesting SEC filings...",
  "Parsing Federal Reserve minutes...",
  "Monitoring whale wallet movements...",
  "Encryption layer secure.",
];

export function AiTerminal({ active }: { active: boolean }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      const randomLog = MOCK_LOGS[Math.floor(Math.random() * MOCK_LOGS.length)];
      const newLog: LogEntry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 }),
        message: randomLog,
        type: randomLog.includes("profit") || randomLog.includes("Optimizing") ? "success" : "info",
      };

      setLogs((prev) => [...prev.slice(-20), newLog]);
    }, 800);

    return () => clearInterval(interval);
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
          <span className="font-bold tracking-widest">OMNISCOUT_KERNEL_V4.2</span>
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
