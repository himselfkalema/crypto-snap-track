import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Bell, Menu, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const nav = [
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/trades', label: 'My Trades', auth: true },
  { to: '/pricing', label: 'Pricing' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background bg-mesh">
      <header className="sticky top-0 z-40 border-b border-border/40 backdrop-blur-xl bg-background/70">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">Crypto Snap Track</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {nav.filter(n => !n.auth || user).map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'text-foreground bg-secondary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className="px-3 py-2 rounded-lg text-sm font-medium text-accent hover:bg-secondary/50">
                Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">Account</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/offers/new')}>Create Offer</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Sign in</Button>
                <Button size="sm" onClick={() => navigate('/auth?tab=signup')}>Get started</Button>
              </>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-2 mt-8">
                  {nav.filter(n => !n.auth || user).map(n => (
                    <Link key={n.to} to={n.to} className="px-3 py-2 rounded-lg hover:bg-secondary">{n.label}</Link>
                  ))}
                  {isAdmin && <Link to="/admin" className="px-3 py-2 rounded-lg hover:bg-secondary text-accent">Admin</Link>}
                  {user && <Link to="/offers/new" className="px-3 py-2 rounded-lg hover:bg-secondary">Create Offer</Link>}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/40 mt-24 py-8 text-center text-sm text-muted-foreground">
        <div className="container">
          © {new Date().getFullYear()} Crypto Snap Track. Trade Crypto With Confidence.
        </div>
      </footer>
    </div>
  );
}
