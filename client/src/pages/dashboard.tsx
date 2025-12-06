import { useState } from "react";
import { AiTerminal } from "@/components/ui/ai-terminal";
import { ProfitChart } from "@/components/ui/profit-chart";
import { TradeCard } from "@/components/ui/trade-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Play, Power, RotateCcw, Lock } from "lucide-react";
import aiCoreImg from "@assets/generated_images/glowing_futuristic_ai_core_orb.png";

export default function DashboardPage() {
  const [active, setActive] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [parsedAmount, setParsedAmount] = useState(1000);

  const handleActivate = () => {
    if (!amount) return;
    const val = parseFloat(amount);
    if (isNaN(val)) return;
    setParsedAmount(val);
    setActive(true);
  };

  const handleReset = () => {
    setActive(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/20 animate-ping"></div>
                <Activity className="w-5 h-5 text-primary relative z-10" />
            </div>
            <h1 className="font-display font-bold text-xl tracking-wider">
              OMNI<span className="text-primary">SCOUT</span>_AI
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-white/5 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              SYSTEM ONLINE
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              V.4.2.0-STABLE
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-12 space-y-8">
        
        {/* Main Control & Vis Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[600px]">
          
          {/* Left: AI Core & Controls */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full">
            <Card className="flex-1 bg-card/40 border-border/50 backdrop-blur-md overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardContent className="p-6 flex flex-col items-center justify-center h-full space-y-8 relative z-10">
                
                <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto">
                    <img 
                        src={aiCoreImg} 
                        alt="AI Core" 
                        className={`w-full h-full object-contain drop-shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-all duration-1000 ${active ? "scale-110 saturate-150 animate-spin-slow" : "scale-100 grayscale-[0.5]"}`}
                        style={{ animationDuration: '20s' }}
                    />
                    {active && (
                        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping"></div>
                    )}
                </div>

                <div className="w-full space-y-4">
                    {!active ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Initial Investment</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input 
                                        type="number" 
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="pl-8 bg-black/50 border-white/10 h-12 text-lg font-mono focus:border-primary/50 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <Button 
                                onClick={handleActivate}
                                className="w-full h-14 text-lg font-display tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] transition-all"
                            >
                                <Power className="mr-2 w-5 h-5" /> INITIATE SEQUENCE
                            </Button>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="p-3 rounded bg-primary/10 border border-primary/20">
                                    <div className="text-xs text-muted-foreground uppercase">Processing</div>
                                    <div className="text-xl font-bold text-primary font-mono">4.2TB/s</div>
                                </div>
                                <div className="p-3 rounded bg-primary/10 border border-primary/20">
                                    <div className="text-xs text-muted-foreground uppercase">Accuracy</div>
                                    <div className="text-xl font-bold text-primary font-mono">99.9%</div>
                                </div>
                            </div>
                             <Button 
                                onClick={handleReset}
                                variant="outline"
                                className="w-full h-12 border-white/10 hover:bg-white/5 text-muted-foreground"
                            >
                                <RotateCcw className="mr-2 w-4 h-4" /> RESET SIMULATION
                            </Button>
                        </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Chart & Terminal */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-full">
            {/* Chart Section */}
            <Card className="flex-[2] bg-card/40 border-border/50 backdrop-blur-md relative overflow-hidden">
                <CardContent className="p-6 h-full">
                    {!active && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center flex-col gap-4">
                            <Lock className="w-12 h-12 text-muted-foreground/50" />
                            <p className="font-mono text-muted-foreground">SYSTEM LOCKED. AWAITING CAPITAL ALLOCATION.</p>
                        </div>
                    )}
                    <ProfitChart active={active} initialAmount={parsedAmount} />
                </CardContent>
            </Card>

            {/* Terminal Section */}
            <div className="flex-1 h-48 lg:h-auto">
                <AiTerminal active={active} />
            </div>
          </div>
        </div>

        {/* Signals Section */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    LIVE_SIGNALS
                </h2>
                <div className="text-xs font-mono text-muted-foreground animate-pulse">
                    SCANNING GLOBAL MARKETS...
                </div>
            </div>
            
            <div className={`transition-all duration-1000 ${active ? 'opacity-100 translate-y-0' : 'opacity-50 blur-sm translate-y-4 pointer-events-none'}`}>
                <TradeCard />
            </div>
        </div>

      </main>
    </div>
  );
}
