import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Mail, Lock, User as UserIcon } from 'lucide-react';
import { Navigate, useSearchParams, Link } from 'react-router-dom';

export default function Auth() {
  const { user, signIn, signUp, resetPassword } = useAuth();
  const [params] = useSearchParams();
  const defaultTab = params.get('tab') === 'signup' ? 'signup' : 'signin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  if (user) return <Navigate to="/marketplace" replace />;

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); await signIn(email, password); setLoading(false);
  };
  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); await signUp(email, password, displayName || undefined); setLoading(false);
  };
  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); await resetPassword(email); setLoading(false); setShowReset(false);
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 font-display text-xl font-bold">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          Crypto Snap Track
        </Link>

        <Card className="p-8 glass-strong">
          {showReset ? (
            <form onSubmit={onReset} className="space-y-4">
              <h1 className="text-xl font-semibold">Reset your password</h1>
              <p className="text-sm text-muted-foreground">We'll send a reset link to your email.</p>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>Send reset link</Button>
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setShowReset(false)}>
                ← Back to sign in
              </button>
            </form>
          ) : (
            <Tabs defaultValue={defaultTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="si-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pw">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="si-pw" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in'}
                  </Button>
                  <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setShowReset(true)}>
                    Forgot password?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={onSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Display name (optional)</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="su-name" value={displayName} onChange={e => setDisplayName(e.target.value)} className="pl-10" maxLength={50} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="su-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pw">Password (min 8 chars)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="su-pw" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || password.length < 8}>
                    {loading ? 'Creating…' : 'Create account'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    You'll receive a confirmation email — verify to start trading.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </Card>
      </div>
    </div>
  );
}
