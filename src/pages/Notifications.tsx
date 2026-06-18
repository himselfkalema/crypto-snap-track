import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Notifications() {
  const { user, loading } = useAuth();
  const { items, markAllRead, unreadCount } = useNotifications();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppShell>
      <div className="container py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-display font-bold">Notifications</h1>
          {unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>}
        </div>
        {items.length === 0 ? (
          <Card className="glass-card p-12 text-center text-muted-foreground">No notifications yet.</Card>
        ) : (
          <div className="grid gap-2">
            {items.map(n => {
              const inner = (
                <Card className={`p-4 ${n.read_at ? 'glass-card' : 'glass-strong border-primary/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                </Card>
              );
              return n.link ? <Link key={n.id} to={n.link}>{inner}</Link> : <div key={n.id}>{inner}</div>;
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
