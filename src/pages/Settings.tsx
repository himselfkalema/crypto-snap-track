import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES } from '@/lib/coins';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function Settings() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('Worldwide');
  const [subscription, setSubscription] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setCountry(profile.country ?? 'Worldwide');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => setSubscription(data));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName, bio, country }).eq('id', user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Profile updated');
  };

  return (
    <AppShell>
      <div className="container py-8 max-w-2xl space-y-6">
        <h1 className="text-3xl font-display font-bold">Settings</h1>

        <Card className="glass-card p-6 space-y-4">
          <h2 className="font-semibold">Profile</h2>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={profile?.username ?? ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={50} />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={save} disabled={saving} className="bg-gradient-primary">{saving ? 'Saving…' : 'Save profile'}</Button>
        </Card>

        <Card className="glass-card p-6 space-y-3">
          <h2 className="font-semibold">Subscription</h2>
          {subscription ? (
            <div className="flex items-center justify-between">
              <div>
                <Badge className="bg-gradient-primary capitalize">{subscription.plan}</Badge>
                <p className="text-sm text-muted-foreground mt-2">Status: {subscription.status}</p>
                {subscription.current_period_end && (
                  <p className="text-xs text-muted-foreground">Renews {new Date(subscription.current_period_end).toLocaleDateString()}</p>
                )}
              </div>
              <Button asChild variant="outline"><a href="/pricing">Manage plan</a></Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </Card>

        <Card className="glass-card p-6 space-y-3">
          <h2 className="font-semibold">Account</h2>
          <p className="text-sm text-muted-foreground">Email: {user.email}</p>
        </Card>
      </div>
    </AppShell>
  );
}
