import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AiTerminal } from "@/components/ui/ai-terminal";
import { ProfitChart } from "@/components/ui/profit-chart";
import { TradeCard } from "@/components/ui/trade-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Activity, Play, Power, RotateCcw, Lock, CreditCard, Loader2, Wallet, Building, ArrowDownToLine, CheckCircle2 } from "lucide-react";
import aiCoreImg from "@assets/generated_images/glowing_futuristic_ai_core_orb.png";

export default function DashboardPage() {
  const [active, setActive] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [parsedAmount, setParsedAmount] = useState(1000);
  const [currentBalance, setCurrentBalance] = useState(1000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'cancelled' | 'verifying'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  
  const [connectStatus, setConnectStatus] = useState<{
    hasConnectAccount: boolean;
    onboardingComplete: boolean;
    canWithdraw: boolean;
  }>({ hasConnectAccount: false, onboardingComplete: false, canWithdraw: false });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    const connect = urlParams.get('connect');
    const connectPortfolioId = urlParams.get('portfolioId');

    if (payment === 'success' && sessionId) {
      setPaymentStatus('verifying');
      verifyPayment(sessionId);
    } else if (payment === 'cancelled') {
      setPaymentStatus('cancelled');
      window.history.replaceState({}, '', '/');
      setTimeout(() => setPaymentStatus('idle'), 3000);
    } else if (connect === 'complete' && connectPortfolioId) {
      localStorage.setItem('golddust_portfolio_id', connectPortfolioId);
      window.history.replaceState({}, '', '/');
      setActive(true);
      checkConnectStatus(connectPortfolioId);
    } else if (connect === 'refresh' && connectPortfolioId) {
      localStorage.setItem('golddust_portfolio_id', connectPortfolioId);
      window.history.replaceState({}, '', '/');
      setActive(true);
      startConnectOnboarding();
    } else {
      const savedPortfolioId = localStorage.getItem('golddust_portfolio_id');
      if (savedPortfolioId) {
        loadPortfolio(savedPortfolioId);
      }
    }
  }, []);

  const loadPortfolio = async (portfolioId: string) => {
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}`);
      if (response.ok) {
        const portfolio = await response.json();
        setParsedAmount(portfolio.initialInvestment);
        setCurrentBalance(portfolio.currentValue);
        setActive(true);
        checkConnectStatus(portfolioId);
      }
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
  };

  const checkConnectStatus = async (portfolioId: string) => {
    try {
      const response = await fetch(`/api/connect/status/${portfolioId}`);
      if (response.ok) {
        const status = await response.json();
        setConnectStatus(status);
      }
    } catch (error) {
      console.error('Failed to check connect status:', error);
    }
  };

  const verifyPayment = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/checkout/session/${sessionId}`);
      const data = await response.json();
      
      if (data.status === 'paid' && data.portfolioId) {
        localStorage.setItem('golddust_portfolio_id', data.portfolioId);
        const investmentAmount = parseFloat(data.amount) || 1000;
        setParsedAmount(investmentAmount);
        setCurrentBalance(investmentAmount);
        setAmount(investmentAmount.toString());
        setPaymentStatus('success');
        setActive(true);
        window.history.replaceState({}, '', '/');
        checkConnectStatus(data.portfolioId);
      } else {
        setPaymentStatus('cancelled');
        window.history.replaceState({}, '', '/');
        setTimeout(() => setPaymentStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      setPaymentStatus('cancelled');
      window.history.replaceState({}, '', '/');
      setTimeout(() => setPaymentStatus('idle'), 3000);
    }
  };

  const handleActivate = async () => {
    if (!amount) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      localStorage.removeItem('golddust_portfolio_id');
      
      const portfolioResponse = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialInvestment: val, currentValue: val })
      });
      
      if (!portfolioResponse.ok) {
        const errorData = await portfolioResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create portfolio');
      }
      
      const portfolio = await portfolioResponse.json();
      
      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val, portfolioId: portfolio.id })
      });
      
      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const { url } = await checkoutResponse.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      setIsProcessing(false);
      setErrorMessage(error.message || 'Payment initialization failed. Please try again.');
    }
  };

  const startConnectOnboarding = async () => {
    const portfolioId = localStorage.getItem('golddust_portfolio_id');
    if (!portfolioId) return;
    
    setIsConnecting(true);
    
    try {
      const response = await fetch('/api/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start bank account setup');
      }
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No onboarding URL received');
      }
    } catch (error: any) {
      console.error('Connect onboarding error:', error);
      setIsConnecting(false);
      setErrorMessage(error.message || 'Failed to start bank account setup');
    }
  };

  const handleWithdraw = async () => {
    const portfolioId = localStorage.getItem('golddust_portfolio_id');
    if (!portfolioId) return;
    
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError('Please enter a valid amount');
      return;
    }
    
    if (amt > currentBalance) {
      setWithdrawError('Insufficient balance');
      return;
    }
    
    setIsWithdrawing(true);
    setWithdrawError(null);
    
    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId, amount: amt })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Withdrawal failed');
      }
      
      const data = await response.json();
      setCurrentBalance(data.newBalance);
      setWithdrawSuccess(true);
      
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawSuccess(false);
        setWithdrawAmount("");
      }, 2000);
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      setWithdrawError(error.message || 'Withdrawal failed. Please try again.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleReset = () => {
    setActive(false);
    setPaymentStatus('idle');
    setConnectStatus({ hasConnectAccount: false, onboardingComplete: false, canWithdraw: false });
    localStorage.removeItem('golddust_portfolio_id');
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
              GOLD <span className="text-primary">DUST</span>
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
                    {paymentStatus === 'verifying' ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <p className="font-mono text-sm text-muted-foreground">VERIFYING PAYMENT...</p>
                        </div>
                    ) : paymentStatus === 'cancelled' ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <Power className="w-6 h-6 text-red-500" />
                            </div>
                            <p className="font-mono text-sm text-red-400">PAYMENT CANCELLED</p>
                        </div>
                    ) : !active ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Initial Investment</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input 
                                        type="number" 
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        disabled={isProcessing}
                                        data-testid="input-investment-amount"
                                        className="pl-8 bg-black/50 border-white/10 h-12 text-lg font-mono focus:border-primary/50 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <Button 
                                onClick={handleActivate}
                                disabled={isProcessing}
                                data-testid="button-initiate-payment"
                                className="w-full h-14 text-lg font-display tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 w-5 h-5 animate-spin" /> PROCESSING...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="mr-2 w-5 h-5" /> FUND & ACTIVATE
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-center text-muted-foreground font-mono">
                                SECURE PAYMENT VIA STRIPE
                            </p>
                            {errorMessage && (
                                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono text-center" data-testid="text-error-message">
                                    {errorMessage}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 rounded bg-primary/10 border border-primary/20 text-center">
                                <div className="text-xs text-muted-foreground uppercase">Current Balance</div>
                                <div className="text-2xl font-bold text-primary font-mono" data-testid="text-current-balance">
                                    ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                            
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

                            {!connectStatus.hasConnectAccount ? (
                                <Button 
                                    onClick={startConnectOnboarding}
                                    disabled={isConnecting}
                                    data-testid="button-setup-bank"
                                    className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    {isConnecting ? (
                                        <>
                                            <Loader2 className="mr-2 w-4 h-4 animate-spin" /> CONNECTING...
                                        </>
                                    ) : (
                                        <>
                                            <Building className="mr-2 w-4 h-4" /> SETUP BANK ACCOUNT
                                        </>
                                    )}
                                </Button>
                            ) : connectStatus.onboardingComplete && !connectStatus.canWithdraw ? (
                                <div className="space-y-2">
                                    <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono text-center flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        BANK VERIFICATION IN PROGRESS...
                                    </div>
                                    <p className="text-xs text-center text-muted-foreground">
                                        Your bank account is being verified. Withdrawals will be available shortly.
                                    </p>
                                </div>
                            ) : !connectStatus.onboardingComplete ? (
                                <Button 
                                    onClick={startConnectOnboarding}
                                    disabled={isConnecting}
                                    data-testid="button-complete-setup"
                                    className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    {isConnecting ? (
                                        <>
                                            <Loader2 className="mr-2 w-4 h-4 animate-spin" /> CONNECTING...
                                        </>
                                    ) : (
                                        <>
                                            <Building className="mr-2 w-4 h-4" /> COMPLETE BANK SETUP
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button 
                                    onClick={() => setShowWithdrawModal(true)}
                                    data-testid="button-withdraw"
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <ArrowDownToLine className="mr-2 w-4 h-4" /> WITHDRAW FUNDS
                                </Button>
                            )}

                            <Button 
                                onClick={handleReset}
                                variant="outline"
                                data-testid="button-reset-simulation"
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

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              WITHDRAW FUNDS
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Transfer funds from your trading account to your bank
            </DialogDescription>
          </DialogHeader>
          
          {withdrawSuccess ? (
            <div className="py-8 flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <p className="font-mono text-primary">WITHDRAWAL SUCCESSFUL</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="p-3 rounded bg-primary/10 border border-primary/20 text-center">
                  <div className="text-xs text-muted-foreground uppercase">Available Balance</div>
                  <div className="text-xl font-bold text-primary font-mono">
                    ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                    Withdrawal Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Enter amount"
                      disabled={isWithdrawing}
                      data-testid="input-withdraw-amount"
                      className="pl-8 bg-black/50 border-white/10 h-12 text-lg font-mono"
                    />
                  </div>
                </div>
                
                {withdrawError && (
                  <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono text-center">
                    {withdrawError}
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={isWithdrawing}
                  className="border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount}
                  data-testid="button-confirm-withdraw"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="mr-2 w-4 h-4" /> Withdraw
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <footer className="border-t border-white/10 bg-black/40 backdrop-blur-sm py-6 mt-auto">
        <div className="container mx-auto px-4 text-center space-y-2">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            SYSTEM ARCHITECT: LORETTA CHAPMAN
          </div>
          <div className="text-[10px] font-mono text-primary/70">
             BUILD_TIMESTAMP: {new Date().toLocaleString().toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
