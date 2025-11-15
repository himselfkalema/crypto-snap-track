import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CreditCard, Crown, Zap, ArrowUpCircle, LogOut, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  id: string;
  tier_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  tier: {
    name: string;
    price_usd: number;
    description: string;
    features: string[];
  };
}

export default function SubscriptionManagement() {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchSubscriptionData(session.user.id);
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    return () => authSub.unsubscribe();
  }, [navigate]);

  const fetchSubscriptionData = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch current active subscription
      const { data: activeSub, error: activeError } = await supabase
        .from("user_subscriptions")
        .select(`
          id,
          tier_id,
          status,
          started_at,
          expires_at,
          auto_renew,
          created_at
        `)
        .eq("user_id", userId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeError && activeSub) {
        // Fetch tier details separately
        const { data: tierData } = await supabase
          .from("tiers")
          .select("name, price_usd, description, features")
          .eq("id", activeSub.tier_id)
          .single();

        if (tierData) {
          setSubscription({
            ...activeSub,
            tier: tierData as any
          });
        }
      }

      // Fetch subscription history
      const { data: historyData, error: historyError } = await supabase
        .from("user_subscriptions")
        .select(`
          id,
          tier_id,
          status,
          started_at,
          expires_at,
          auto_renew,
          created_at
        `)
        .eq("user_id", userId)
        .order("started_at", { ascending: false });

      if (!historyError && historyData) {
        // Fetch tier details for each history item
        const enrichedHistory = await Promise.all(
          historyData.map(async (sub) => {
            const { data: tierData } = await supabase
              .from("tiers")
              .select("name, price_usd, description, features")
              .eq("id", sub.tier_id)
              .single();
            
            return {
              ...sub,
              tier: tierData || { name: "Unknown", price_usd: 0, description: "", features: [] }
            };
          })
        );
        setHistory(enrichedHistory as Subscription[]);
      }
    } catch (err) {
      console.error("Error fetching subscription:", err);
      toast({
        title: "Error",
        description: "Failed to load subscription data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !user) return;

    const confirmed = confirm("Are you sure you want to cancel your subscription? You'll lose access to premium features.");
    if (!confirmed) return;

    toast({
      title: "Cancellation Not Available",
      description: "Please contact support to cancel your subscription",
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getTierIcon = (tierName: string) => {
    if (tierName.toLowerCase().includes("premium")) return Crown;
    if (tierName.toLowerCase().includes("pro")) return Zap;
    return CreditCard;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      expired: "secondary",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading subscription details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">
              <span className="text-primary">Subscription</span> Management
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Current Plan */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-primary" />
              Current Plan
            </CardTitle>
            <CardDescription>Manage your subscription and billing</CardDescription>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      {(() => {
                        const Icon = getTierIcon(subscription.tier.name);
                        return <Icon className="w-8 h-8 text-primary" />;
                      })()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{subscription.tier.name} Plan</h3>
                      <p className="text-muted-foreground">{subscription.tier.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-3xl font-bold">${subscription.tier.price_usd}</span>
                        <span className="text-muted-foreground">/month</span>
                        {getStatusBadge(subscription.status)}
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => navigate("/pricing")} variant="outline">
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Change Plan
                  </Button>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      Billing Cycle
                    </div>
                    <p className="font-medium">
                      Started: {new Date(subscription.started_at).toLocaleDateString()}
                    </p>
                    {subscription.expires_at && (
                      <p className="text-sm text-muted-foreground">
                        Expires: {new Date(subscription.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Auto-Renewal</div>
                    <p className="font-medium">
                      {subscription.auto_renew ? "Enabled" : "Disabled"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {subscription.auto_renew 
                        ? "Your plan will renew automatically"
                        : "Your plan will expire at the end of the period"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Included Features:</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {Array.isArray(subscription.tier.features) && subscription.tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-success mt-2" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {subscription.auto_renew && (
                  <Button 
                    variant="destructive" 
                    onClick={handleCancelSubscription}
                    className="w-full md:w-auto"
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">You don't have an active subscription</p>
                <Button onClick={() => navigate("/pricing")}>
                  Browse Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" />
              Billing History
            </CardTitle>
            <CardDescription>View your past subscriptions and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        {(() => {
                          const Icon = getTierIcon(item.tier.name);
                          return <Icon className="w-6 h-6 text-muted-foreground" />;
                        })()}
                      </div>
                      <div>
                        <div className="font-semibold">{item.tier.name} Plan</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(item.started_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">${item.tier.price_usd}</span>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No billing history available
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
