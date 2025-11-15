import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Zap, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Pricing() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubscribe = async (tierName: string, price: number) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(tierName);
    
    toast({
      title: "Payment Integration Required",
      description: "Stripe integration needs to be enabled to process subscriptions. Contact support for setup.",
      variant: "destructive"
    });
    
    setLoading(null);
    
    // When Stripe is enabled, this will create a checkout session:
    // const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    //   body: { tier: tierName, price }
    // });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const tiers = [
    {
      name: "Pro",
      price: 24,
      icon: Zap,
      description: "Perfect for active traders",
      features: [
        "Portfolio Analytics Dashboard",
        "Smart Alerts & Auto DCA",
        "Up to 3 automation strategies",
        "Tax Reports & Export",
        "Wallet Risk Scanner",
        "NFT Tracker Lite",
        "Email Support"
      ]
    },
    {
      name: "Premium",
      price: 85,
      icon: Crown,
      description: "For serious crypto professionals",
      features: [
        "All Pro features included",
        "AI Portfolio Advisor",
        "Predictive Analytics",
        "DeFi Command Center",
        "Cross-Chain Automation",
        "Private API Access",
        "Security Vault",
        "Withdraw Skips (5/month)",
        "Priority Support"
      ],
      popular: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            <span className="text-primary">Crypto</span>SnapTrack
          </h1>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">{user.email}</span>
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  Log In
                </Button>
                <Button onClick={() => navigate("/auth")}>
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Trading Edge
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock powerful automation, analytics, and insights to maximize your crypto portfolio
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            
            return (
              <Card 
                key={tier.name}
                className={`relative ${tier.popular ? 'border-primary shadow-glow' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-3xl">{tier.name}</CardTitle>
                  <CardDescription className="text-base">{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-5xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    size="lg"
                    variant={tier.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(tier.name, tier.price)}
                    disabled={loading === tier.name}
                  >
                    {loading === tier.name ? "Processing..." : `Subscribe to ${tier.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            All plans include 24/7 market data, secure wallet integration, and mobile app access
          </p>
          <p className="text-sm text-muted-foreground">
            Need a custom solution? <a href="mailto:support@cryptosnaptrack.com" className="text-primary hover:underline">Contact us</a>
          </p>
        </div>
      </main>
    </div>
  );
}
