import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Loader2 } from "lucide-react";

interface MobileMoneyTopupProps {
  userId: string;
  onSuccess?: () => void;
}

export default function MobileMoneyTopup({ userId, onSuccess }: MobileMoneyTopupProps) {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("MTN");
  const [loading, setLoading] = useState(false);
  const [externalTxId, setExternalTxId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleTopup = async () => {
    if (!phone || !amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mobile-money/request", {
        body: {
          user_id: userId,
          phone_number: phone,
          amount: parseFloat(amount),
          provider,
        },
      });

      if (error) throw error;

      if (data.success) {
        setExternalTxId(data.external_tx_id);
        toast({
          title: "Payment Request Sent",
          description: "Please approve the payment on your phone",
        });
      }
    } catch (error) {
      console.error("Mobile money error:", error);
      toast({
        title: "Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSuccess = async () => {
    if (!externalTxId) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("mobile-money/simulate-success", {
        body: { external_tx_id: externalTxId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment completed successfully!",
      });

      setPhone("");
      setAmount("");
      setExternalTxId(null);
      onSuccess?.();
    } catch (error) {
      console.error("Simulation error:", error);
      toast({
        title: "Error",
        description: "Failed to complete payment simulation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Mobile Money Top-up
        </CardTitle>
        <CardDescription>
          Top up your wallet using MTN or Airtel Money
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MTN">MTN Mobile Money</SelectItem>
              <SelectItem value="Airtel">Airtel Money</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="0774881363"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (UGX)</Label>
          <Input
            id="amount"
            type="number"
            placeholder="10000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <Button
          onClick={handleTopup}
          disabled={loading}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Processing..." : "Request Payment"}
        </Button>

        {externalTxId && (
          <div className="space-y-2 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              For testing: Simulate payment completion
            </p>
            <Button
              onClick={handleSimulateSuccess}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simulate Success
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}