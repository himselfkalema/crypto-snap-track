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
import { Wallet, Plus, History, DollarSign, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Fetch wallet data
  useEffect(() => {
    const fetchWallet = async () => {
      if (!user) return;
      
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
    const fetchTransactions = async () => {
      if (!user) return;
      
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

  const handleTopUp = async () => {
    if (!user || !wallet) return;
    
    // Validate inputs
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

      if (error) {
        throw error;
      }

      if (data?.success) {
        setWallet({ ...wallet, balance: data.balance });
        setShowModal(false);
        setPhone("");
        setAmount("");
        
        // Refresh transactions
        const { data: newTransactions } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (newTransactions) {
          setTransactions(newTransactions);
        }
        
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "failed": return "text-red-600";
      default: return "text-yellow-600";
    }
  };

  return (
    <div className="min-h-screen bg-background bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Portfolio
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
              <p className="text-muted-foreground">Manage your digital wallet balance</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Wallet Balance Card */}
          <Card className="bg-gradient-card border-border/50 backdrop-blur-glass shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold text-foreground">
                  {wallet ? `$${wallet.balance.toFixed(2)}` : "Loading..."}
                </div>
                <div className="text-sm text-muted-foreground">
                  {wallet ? wallet.currency : ""}
                </div>
                
                <Dialog open={showModal} onOpenChange={setShowModal}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Top Up Wallet
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Top Up Wallet</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="phone">Mobile Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="Enter your mobile number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="amount">Amount (USD)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Enter amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowModal(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleTopUp} 
                          disabled={loading}
                          className="flex-1"
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
          <Card className="bg-gradient-card border-border/50 backdrop-blur-glass shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No transactions yet</p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50"
                    >
                      <div className="space-y-1">
                        <div className="font-medium capitalize">
                          {transaction.transaction_type}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </div>
                        {transaction.description && (
                          <div className="text-xs text-muted-foreground">
                            {transaction.description}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          +${transaction.amount.toFixed(2)}
                        </div>
                        <div className={`text-sm capitalize ${getStatusColor(transaction.status)}`}>
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
      </div>
    </div>
  );
};

export default WalletPage;