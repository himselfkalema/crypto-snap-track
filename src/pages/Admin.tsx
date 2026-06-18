import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function Admin() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();
  const [stats, setStats] = useState({ users: 0, trades: 0, openDisputes: 0, activeOffers: 0, revenue: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [tradesList, setTradesList] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
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
      const [{ data: u }, { data: t }, { data: d }, { data: l }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('trades').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('disputes').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      setUsers(u ?? []); setTradesList(t ?? []); setDisputes(d ?? []); setLogs(l ?? []);
    };
    load();
  }, [isAdmin]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const audit = (action: string, target: string) =>
    supabase.from('audit_logs').insert({ actor_id: user.id, action, target_id: target });

  const toggleSuspend = async (u: any) => {
    await supabase.from('profiles').update({ suspended: !u.suspended }).eq('id', u.id);
    await audit(u.suspended ? 'unsuspend_user' : 'suspend_user', u.id);
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, suspended: !u.suspended } : x));
  };
  const toggleVerify = async (u: any) => {
    await supabase.from('profiles').update({ verified: !u.verified }).eq('id', u.id);
    await audit(u.verified ? 'unverify_user' : 'verify_user', u.id);
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, verified: !u.verified } : x));
  };

  const resolveDispute = async (id: string, resolution: string) => {
    await supabase.from('disputes').update({ status: 'resolved', resolution, resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', id);
    await audit('resolve_dispute', id);
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved', resolution } : d));
    toast.success('Dispute resolved');
  };

  const publishAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) return toast.error('Title and body required');
    await supabase.from('announcements').insert({ title: annTitle, body: annBody, created_by: user.id });
    await audit('publish_announcement', annTitle);
    setAnnTitle(''); setAnnBody('');
    toast.success('Announcement published');
  };

  const filteredUsers = users.filter(u => !search || u.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppShell>
      <div className="container py-8 space-y-6">
        <h1 className="text-3xl font-display font-bold">Admin dashboard</h1>

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
            <TabsTrigger value="logs">Audit logs</TabsTrigger>
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
                    <Button size="sm" variant={u.suspended ? 'outline' : 'destructive'} onClick={() => toggleSuspend(u)}>{u.suspended ? 'Unsuspend' : 'Suspend'}</Button>
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
              <Button onClick={publishAnnouncement} className="bg-gradient-primary">Publish</Button>
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
        </Tabs>
      </div>
    </AppShell>
  );
}
