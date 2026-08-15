import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminSession } from '@/hooks/useAdminSession';
import { MfaChallengeDialog } from '@/components/admin/MfaChallengeDialog';
import { PlatformFeeCard } from '@/components/admin/PlatformFeeCard';

import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShieldCheck, Loader2 } from 'lucide-react';

const STEP_UP_MAX_AGE_SEC = 5 * 60;

export default function Admin() {
  const session = useAdminSession();
  const [stats, setStats] = useState({ users: 0, trades: 0, openDisputes: 0, activeOffers: 0, revenue: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [tradesList, setTradesList] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<any[]>([]);
  const [adminActions, setAdminActions] = useState<any[]>([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [search, setSearch] = useState('');
  const [pendingSuspend, setPendingSuspend] = useState<{ user: any; suspend: boolean } | null>(null);
  const [mfaOpen, setMfaOpen] = useState(false);

  useEffect(() => {
    if (session.status !== 'authorized') return;
    const load = async () => {
      const [usersC, tradesC, openDispC, activeOffersC, payments] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('trades').select('*', { count: 'exact', head: true }),
        supabase.from('disputes').select('*', { count: 'exact', head: true }).neq('status', 'resolved'),
        supabase.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('payments').select('amount').eq('status', 'paid'),
      ]);
      setStats({
        users: usersC.count ?? 0,
        trades: tradesC.count ?? 0,
        openDisputes: openDispC.count ?? 0,
        activeOffers: activeOffersC.count ?? 0,
        revenue: (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0),
      });
      const [{ data: u }, { data: t }, { data: d }, { data: l }, { data: att }, { data: acts }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('trades').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('disputes').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('admin_login_attempts').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('admin_actions_log').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      setUsers(u ?? []); setTradesList(t ?? []); setDisputes(d ?? []); setLogs(l ?? []);
      setLoginAttempts(att ?? []); setAdminActions(acts ?? []);
    };
    load();
  }, [session.status]);

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (session.status === 'unauthorized') {
    // useAdminSession already redirects; render nothing while it happens.
    return null;
  }

  const audit = (action: string, target: string) =>
    supabase.from('audit_logs').insert({ actor_id: session.userId!, action, target_id: target });

  const requestSuspend = (user: any, suspend: boolean) => {
    if (session.mfaAgeSeconds > STEP_UP_MAX_AGE_SEC) {
      setPendingSuspend({ user, suspend });
      setMfaOpen(true);
      return;
    }
    performSuspend(user, suspend);
  };

  const performSuspend = async (user: any, suspend: boolean) => {
    const { data, error } = await supabase.functions.invoke('admin-suspend-user', {
      body: { target_user_id: user.id, suspend },
    });
    if (error || !data?.ok) {
      const msg = (error as any)?.context?.status === 401
        ? 'Re-authentication required.'
        : error?.message ?? 'Action failed.';
      toast.error(msg);
      if ((error as any)?.context?.status === 401) {
        setPendingSuspend({ user, suspend });
        setMfaOpen(true);
      }
      return;
    }
    setUsers(prev => prev.map(x => x.id === user.id ? { ...x, suspended: suspend } : x));
    toast.success(suspend ? 'User suspended' : 'User unsuspended');
    // Refresh session so mfa_age_seconds picks up the fresh challenge.
    session.refresh();
  };

  const toggleVerify = async (u: any) => {
    const { error } = await supabase.from('profiles').update({ verified: !u.verified }).eq('id', u.id);
    if (error) return toast.error(error.message);
    await audit(u.verified ? 'unverify_user' : 'verify_user', u.id);
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, verified: !u.verified } : x));
  };

  const resolveDispute = async (id: string, resolution: string) => {
    await supabase.from('disputes').update({
      status: 'resolved', resolution, resolved_by: session.userId!, resolved_at: new Date().toISOString(),
    }).eq('id', id);
    await audit('resolve_dispute', id);
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved', resolution } : d));
    toast.success('Dispute resolved');
  };

  const publishAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) return toast.error('Title and body required');
    await supabase.from('announcements').insert({ title: annTitle, body: annBody, created_by: session.userId! });
    await audit('publish_announcement', annTitle);
    setAnnTitle(''); setAnnBody('');
    toast.success('Announcement published');
  };

  const filteredUsers = users.filter(u => !search || u.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppShell>
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Admin dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Signed in as {session.email} · session verified server-side
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Sign out</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Users', value: stats.users },
            { label: 'Trades', value: stats.trades },
            { label: 'Active offers', value: stats.activeOffers },
            { label: 'Open disputes', value: stats.openDisputes },
            { label: 'Revenue', value: `$${stats.revenue.toFixed(2)}` },
          ].map(s => (
            <Card key={s.label} className="glass-card p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="font-mono text-2xl font-bold mt-1">{s.value}</div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="logins">Login attempts</TabsTrigger>
            <TabsTrigger value="actions">Admin actions</TabsTrigger>
            <TabsTrigger value="logs">Audit logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>


          <TabsContent value="users" className="mt-4">
            <Input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} className="mb-3 max-w-sm" />
            <Card className="glass-card divide-y divide-border/40">
              {filteredUsers.map(u => (
                <div key={u.id} className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">@{u.username} {u.verified && <Badge variant="outline" className="ml-2">Verified</Badge>} {u.suspended && <Badge variant="destructive" className="ml-2">Suspended</Badge>}</div>
                    <div className="text-xs text-muted-foreground">Trades: {u.total_trades} · Rating: {Number(u.reputation_score).toFixed(1)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleVerify(u)}>{u.verified ? 'Unverify' : 'Verify'}</Button>
                    <Button size="sm" variant={u.suspended ? 'outline' : 'destructive'}
                      onClick={() => requestSuspend(u, !u.suspended)}>
                      {u.suspended ? 'Unsuspend' : 'Suspend'}
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="trades" className="mt-4">
            <Card className="glass-card divide-y divide-border/40">
              {tradesList.map(t => (
                <div key={t.id} className="p-3 grid grid-cols-5 gap-3 items-center">
                  <Badge>{t.status}</Badge>
                  <div className="font-mono">{t.coin}</div>
                  <div className="font-mono">{Number(t.crypto_amount).toFixed(8)}</div>
                  <div className="font-mono">{Number(t.fiat_amount).toFixed(2)} {t.fiat_currency}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="mt-4">
            <Card className="glass-card divide-y divide-border/40">
              {disputes.length === 0 && <div className="p-6 text-muted-foreground text-center">No disputes.</div>}
              {disputes.map(d => (
                <div key={d.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={d.status === 'resolved' ? 'outline' : 'destructive'}>{d.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{d.reason}</p>
                  {d.status !== 'resolved' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => resolveDispute(d.id, 'Resolved in favor of buyer')}>Favor buyer</Button>
                      <Button size="sm" variant="outline" onClick={() => resolveDispute(d.id, 'Resolved in favor of seller')}>Favor seller</Button>
                    </div>
                  )}
                  {d.resolution && <p className="text-xs text-muted-foreground">Resolution: {d.resolution}</p>}
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="announcements" className="mt-4 space-y-3">
            <Card className="glass-card p-4 space-y-3">
              <Label>Title</Label>
              <Input value={annTitle} onChange={e => setAnnTitle(e.target.value)} maxLength={200} />
              <Label>Body</Label>
              <Textarea value={annBody} onChange={e => setAnnBody(e.target.value)} rows={5} maxLength={2000} />
              <Button onClick={publishAnnouncement} className="">Publish</Button>
            </Card>
          </TabsContent>

          <TabsContent value="logins" className="mt-4">
            <Card className="glass-card divide-y divide-border/40">
              {loginAttempts.length === 0 && <div className="p-6 text-muted-foreground text-center">No attempts recorded.</div>}
              {loginAttempts.map(a => (
                <div key={a.id} className="p-3 grid grid-cols-5 gap-3 text-sm items-center">
                  <Badge variant={a.success ? 'outline' : 'destructive'}>{a.success ? 'Success' : 'Failed'}</Badge>
                  <div className="truncate">{a.email}</div>
                  <div className="font-mono text-xs text-muted-foreground truncate">{a.reason ?? '—'}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.ip_address ?? '—'}</div>
                  <div className="text-xs text-muted-foreground text-right">{new Date(a.created_at).toLocaleString()}</div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <Card className="glass-card divide-y divide-border/40">
              {adminActions.length === 0 && <div className="p-6 text-muted-foreground text-center">No admin actions recorded.</div>}
              {adminActions.map(a => (
                <div key={a.id} className="p-3 grid grid-cols-4 gap-3 text-sm">
                  <div className="font-mono">{a.action}</div>
                  <div className="text-muted-foreground truncate">{a.target_type}:{a.target_id}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.ip_address ?? '—'}</div>
                  <div className="text-xs text-muted-foreground text-right">{new Date(a.created_at).toLocaleString()}</div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card className="glass-card divide-y divide-border/40">
              {logs.map(l => (
                <div key={l.id} className="p-3 grid grid-cols-3 gap-3 text-sm">
                  <div className="font-mono">{l.action}</div>
                  <div className="text-muted-foreground truncate">{l.target_id ?? ''}</div>
                  <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <PlatformFeeCard actorId={session.userId!} onAudit={audit} />
          </TabsContent>
        </Tabs>

      </div>

      <MfaChallengeDialog
        open={mfaOpen}
        title="Confirm with your authenticator"
        description={pendingSuspend
          ? `Suspending @${pendingSuspend.user.username} requires a fresh 2FA code.`
          : 'This action requires a fresh 2FA code.'}
        onCancel={() => { setMfaOpen(false); setPendingSuspend(null); }}
        onVerified={async () => {
          setMfaOpen(false);
          await session.refresh();
          if (pendingSuspend) {
            const p = pendingSuspend;
            setPendingSuspend(null);
            await performSuspend(p.user, p.suspend);
          }
        }}
      />
    </AppShell>
  );
}
