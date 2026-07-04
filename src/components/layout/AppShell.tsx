import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Store, Wallet, PieChart, History, MessageSquare, Bell, Trophy, Users2, Award,
  CreditCard, LifeBuoy, Settings, ShieldCheck, Menu, Moon, Sun, Plus, Bot,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, auth: true },
  { to: '/marketplace', label: 'Marketplace', icon: Store },
  { to: '/bots', label: 'Bots', icon: Bot, auth: true },
  { to: '/portfolio', label: 'Portfolio', icon: PieChart, auth: true },
  { to: '/wallet', label: 'Wallet', icon: Wallet, auth: true },
  { to: '/trades', label: 'Trade History', icon: History, auth: true },
  { to: '/messages', label: 'Messages', icon: MessageSquare, auth: true },
  { to: '/notifications', label: 'Notifications', icon: Bell, auth: true },
  { to: '/leaderboards', label: 'Leaderboards', icon: Trophy },
  { to: '/community', label: 'Community', icon: Users2 },
  { to: '/rewards', label: 'Rewards', icon: Award, auth: true },
  { to: '/pricing', label: 'Subscription', icon: CreditCard },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/settings', label: 'Settings', icon: Settings, auth: true },
];


function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  return (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {nav.filter(n => !n.auth || user).map(n => (
        <NavLink
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-gradient-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`
          }
        >
          <n.icon className="h-[18px] w-[18px]" />
          <span>{n.label}</span>
        </NavLink>
      ))}
      {isAdmin && (
        <NavLink
          to="/admin"
          onClick={onNavigate}
          className={({ isActive }) =>
            `mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-accent/30 ${
              isActive ? 'bg-accent text-accent-foreground' : 'text-accent hover:bg-accent/10'
            }`
          }
        >
          <ShieldCheck className="h-[18px] w-[18px]" />
          <span>Admin</span>
        </NavLink>
      )}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  // Landing page uses a simpler top-bar shell
  if (isLanding || !user) {
    return (
      <div className="min-h-screen bg-background bg-mesh">
        <header className="sticky top-0 z-40 border-b border-border/40 backdrop-blur-xl bg-background/70">
          <div className="container flex h-16 items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
              <Logo className="h-9 w-9" />
              <span>BitBite</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <NavLink to="/marketplace" className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60">Marketplace</NavLink>
              <NavLink to="/leaderboards" className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60">Leaderboards</NavLink>
              <NavLink to="/community" className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60">Community</NavLink>
              <NavLink to="/pricing" className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60">Pricing</NavLink>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              {user ? (
                <Button size="sm" onClick={() => navigate('/dashboard')} className="bg-gradient-primary">Dashboard</Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Sign in</Button>
                  <Button size="sm" onClick={() => navigate('/auth?tab=signup')} className="bg-gradient-primary">Get started</Button>
                </>
              )}
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  // Authenticated app layout with sidebar
  return (
    <div className="min-h-screen bg-background bg-mesh">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex sticky top-0 h-screen w-64 shrink-0 flex-col border-r border-border/40 bg-sidebar/60 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-6 border-b border-border/40">
            <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold">
              <Logo className="h-9 w-9" />
              <span>BitBite</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          <div className="p-3 border-t border-border/40">
            <Button className="w-full bg-gradient-primary" size="sm" onClick={() => navigate('/offers/new')}>
              <Plus className="h-4 w-4 mr-1" /> Create Offer
            </Button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-30 border-b border-border/40 backdrop-blur-xl bg-background/70">
            <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-72">
                    <div className="flex h-16 items-center gap-2 px-6 border-b border-border/40">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <span className="font-display font-bold">BitBite</span>
                    </div>
                    <SidebarNav />
                  </SheetContent>
                </Sheet>
                <Link to="/dashboard" className="lg:hidden flex items-center gap-2 font-display font-bold">
                  <span>BitBite</span>
                </Link>
              </div>

              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground text-[10px]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">Account</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/offers/new')}>Create Offer</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/pricing')}>Subscription</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} BitBite. Trade Crypto With Confidence.
          </footer>
        </div>
      </div>
    </div>
  );
}
