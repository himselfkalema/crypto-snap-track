import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Wallet, Plus, History, DollarSign, Loader2, ArrowLeft, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Link } from "react-router-dom";
import MobileMoneyTopup from "@/components/MobileMoneyTopup";
import WithdrawForm from "@/components/WithdrawForm";

interface WalletData {
  id: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  status: string;
  created_at: string;
}

const WalletPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Fetch wallet data
  useEffect(() => {
    if (!user) return;
    
    const fetchWallet = async () => {
      try {
        const { data, error } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .eq("currency", "USD")
          .single();

        if (error) {
          console.error("Wallet fetch error:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load wallet information"
          });
        } else if (data) {
          setWallet(data);
        }
      } catch (err) {
        console.error("Error fetching wallet:", err);
      }
    };

    fetchWallet();
  }, [user, toast]);

  // Fetch transactions
  useEffect(() => {
    if (!user) return;
    
    const fetchTransactions = async () => {
      setLoadingTransactions(true);
      try {
        const { data, error } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Transactions fetch error:", error);
        } else if (data) {
          setTransactions(data);
        }
      } catch (err) {
        console.error("Error fetching transactions:", err);
      } finally {
        setLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, [user]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background bg-hero bg-mesh flex items-center justify-center">
        <div className="flex items-center gap-3 glass-card p-6 rounded-2xl">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleTopUp = async () => {
    if (!user || !wallet) return;
    
    if (!phone.trim() || !amount.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please enter both phone number and amount"
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a positive amount"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wallet-topup", {
        body: {
          user_id: user.id,
          phone: phone.trim(),
          amount: amountNum,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setWallet({ ...wallet, balance: data.balance });
        setShowModal(false);
        setPhone("");
        setAmount("");
        
        const { data: newTransactions } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (newTransactions) setTransactions(newTransactions);
        
        toast({
          title: "Success!",
          description: data.message || `Successfully topped up $${amountNum}`
        });
      } else {
        throw new Error(data?.error || "Top-up failed");
      }
    } catch (err: any) {
      console.error("Top-up error:", err);
      toast({
        variant: "destructive",
        title: "Top-up Failed",
        description: err.message || "Please try again later"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/10 text-success border-success/20";
      case "failed": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-warning/10 text-warning border-warning/20";
    }
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes('deposit') || type.includes('topup')) {
      return <ArrowDownLeft className="h-4 w-4 text-crypto-green" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-crypto-red" />;
  };

  return (
    <div className="min-h-screen bg-background bg-hero bg-mesh relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-4xl mx-auto p-6 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 glass px-4 py-2 rounded-full text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Portfolio
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-primary shadow-glow">
              <Wallet className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-display text-foreground">Wallet</h1>
              <p className="text-muted-foreground">Manage your digital wallet balance</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Wallet Balance Card */}
          <Card className="glass-card rounded-2xl border-primary/20 animate-fade-in-up">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-primary/20">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="text-4xl font-bold font-display text-foreground mb-1">
                    {wallet ? `$${wallet.balance.toFixed(2)}` : "Loading..."}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {wallet ? wallet.currency : ""}
                  </div>
                </div>
                
                <Dialog open={showModal} onOpenChange={setShowModal}>
                  <DialogTrigger asChild>
                    <Button className="w-full py-6 bg-gradient-primary hover:opacity-90 font-semibold shadow-glow">
                      <Plus className="h-5 w-5 mr-2" />
                      Top Up Wallet
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-strong border-border/50">
                    <DialogHeader>
                      <DialogTitle className="font-display text-xl">Top Up Wallet</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Mobile Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="Enter your mobile number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="glass border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (USD)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Enter amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="glass border-border/50"
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowModal(false)}
                          className="flex-1 glass border-border/50"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleTopUp} 
                          disabled={loading}
                          className="flex-1 bg-gradient-primary hover:opacity-90"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Confirm"
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="glass-card rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-primary/20">
                  <History className="h-5 w-5 text-primary" />
                </div>
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-3 rounded-xl bg-muted/50 w-fit mx-auto mb-3">
                      <History className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No transactions yet</p>
                  </div>
                ) : (
                  transactions.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-xl glass border-border/30 hover:border-primary/20 transition-colors animate-fade-in"
                      style={{ animationDelay: `${0.05 * index}s` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted/50">
                          {getTransactionIcon(transaction.transaction_type)}
                        </div>
                        <div>
                          <div className="font-medium capitalize text-foreground">
                            {transaction.transaction_type}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold font-mono text-foreground">
                          +${transaction.amount.toFixed(2)}
                        </div>
                        <div className={`text-xs px-2 py-0.5 rounded-full border capitalize ${getStatusStyles(transaction.status)}`}>
                          {transaction.status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Money Top-up & Withdraw */}
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <MobileMoneyTopup 
              userId={user.id} 
              onSuccess={() => {
                if (wallet) {
                  supabase
                    .from("wallets")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("currency", "UGX")
                    .single()
                    .then(({ data }) => {
                      if (data) setWallet(data);
                    });
                }
                
                supabase
                  .from("wallet_transactions")
                  .select("*")
                  .eq("user_id", user.id)
                  .order("created_at", { ascending: false })
                  .limit(10)
                  .then(({ data }) => {
                    if (data) setTransactions(data);
                  });
              }}
            />
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <WithdrawForm 
              userId={user.id}
              walletBalance={wallet?.balance || 0}
              onSuccess={() => {
                if (wallet) {
                  supabase
                    .from("wallets")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("currency", "UGX")
                    .single()
                    .then(({ data }) => {
                      if (data) setWallet(data);
                    });
                }
                
                supabase
                  .from("wallet_transactions")
                  .select("*")
                  .eq("user_id", user.id)
                  .order("created_at", { ascending: false })
                  .limit(10)
                  .then(({ data }) => {
                    if (data) setTransactions(data);
                  });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;