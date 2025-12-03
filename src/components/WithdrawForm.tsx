import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowDownToLine, AlertCircle, Phone, Banknote } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WithdrawFormProps {
  userId: string;
  walletBalance: number;
  onSuccess?: () => void;
}

interface Profile {
  mobile: string | null;
  provider: string | null;
  subscription_tier: string | null;
  withdraw_skips_used: number | null;
  withdraw_skips_limit: number | null;
}

const FEE_PERCENTAGE = 0.35;

const WithdrawForm: React.FC<WithdrawFormProps> = ({ userId, walletBalance, onSuccess }) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [provider, setProvider] = useState<string>("MTN");
  const [mobile, setMobile] = useState("");

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("mobile, provider, subscription_tier, withdraw_skips_used, withdraw_skips_limit")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Profile fetch error:", error);
        } else if (data) {
          setProfile(data);
          setProvider(data.provider || "MTN");
          setMobile(data.mobile || "");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const amountNum = parseFloat(amount) || 0;
  const feeAmount = Number((amountNum * FEE_PERCENTAGE).toFixed(2));
  const netAmount = Number((amountNum - feeAmount).toFixed(2));
  const isValidAmount = amountNum > 0 && amountNum <= walletBalance && amountNum <= 10000000;

  // Save provider and mobile to profile before withdraw
  const updateProfile = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ provider, mobile })
      .eq("id", userId);

    if (error) {
      console.error("Profile update error:", error);
      throw new Error("Failed to update profile");
    }
  };

  const handleWithdraw = async () => {
    if (!isValidAmount) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount"
      });
      return;
    }

    if (!mobile.trim()) {
      toast({
        variant: "destructive",
        title: "Mobile Required",
        description: "Please enter your mobile number"
      });
      return;
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[0-9]{9,15}$/;
    if (!phoneRegex.test(mobile.replace(/\D/g, ''))) {
      toast({
        variant: "destructive",
        title: "Invalid Phone",
        description: "Please enter a valid mobile number"
      });
      return;
    }

    setLoading(true);
    try {
      // First update profile with latest mobile and provider
      await updateProfile();

      // Call withdraw edge function
      const { data, error } = await supabase.functions.invoke("withdraw", {
        body: { gross_amount: amountNum }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Withdrawal Initiated",
          description: `${netAmount.toLocaleString()} UGX is being sent to ${mobile}`
        });
        setAmount("");
        onSuccess?.();
      } else {
        throw new Error(data?.error || "Withdrawal failed");
      }
    } catch (err: any) {
      console.error("Withdraw error:", err);
      toast({
        variant: "destructive",
        title: "Withdrawal Failed",
        description: err.message || "Please try again later"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <Card className="bg-gradient-card border-border/50 backdrop-blur-glass shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isPremium = profile?.subscription_tier === "premium";
  const skipsRemaining = isPremium 
    ? (profile?.withdraw_skips_limit || 5) - (profile?.withdraw_skips_used || 0) 
    : 0;

  return (
    <Card className="bg-gradient-card border-border/50 backdrop-blur-glass shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownToLine className="h-5 w-5 text-primary" />
          Withdraw to Mobile Money
        </CardTitle>
        <CardDescription>
          Withdraw funds to your MTN or Airtel mobile money account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider">Mobile Money Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MTN">MTN Mobile Money</SelectItem>
              <SelectItem value="AIRTEL">Airtel Money</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="mobile"
              type="tel"
              placeholder="256XXXXXXXXX"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your phone number in international format (e.g., 256700123456)
          </p>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="withdraw-amount">Amount (UGX)</Label>
          <div className="relative">
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="withdraw-amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={1}
              max={Math.min(walletBalance, 10000000)}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Available balance: {walletBalance.toLocaleString()} UGX
          </p>
        </div>

        {/* Fee Breakdown */}
        {amountNum > 0 && (
          <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Withdrawal Amount</span>
              <span>{amountNum.toLocaleString()} UGX</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fee (35%)</span>
              <span className="text-destructive">-{feeAmount.toLocaleString()} UGX</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex justify-between font-semibold">
              <span>You'll Receive</span>
              <span className="text-primary">{netAmount.toLocaleString()} UGX</span>
            </div>
          </div>
        )}

        {/* Premium Skip Info */}
        {isPremium && skipsRemaining > 0 && (
          <Alert className="bg-primary/10 border-primary/20">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              As a Premium user, you have {skipsRemaining} instant withdrawal skip(s) remaining this month.
            </AlertDescription>
          </Alert>
        )}

        {/* Insufficient Balance Warning */}
        {amountNum > walletBalance && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Insufficient balance. Maximum withdrawal: {walletBalance.toLocaleString()} UGX
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleWithdraw}
          disabled={loading || !isValidAmount || !mobile.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              Withdraw {netAmount > 0 ? `${netAmount.toLocaleString()} UGX` : ""}
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Withdrawals are processed within 1-5 minutes. Contact support if you experience delays.
        </p>
      </CardContent>
    </Card>
  );
};

export default WithdrawForm;
