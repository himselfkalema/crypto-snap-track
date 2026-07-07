import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Marketplace from "./pages/Marketplace";
import OfferDetail from "./pages/OfferDetail";
import NewOffer from "./pages/NewOffer";
import Trades from "./pages/Trades";
import TradeRoom from "./pages/TradeRoom";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Notifications from "./pages/Notifications";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";
import Bots from "./pages/Bots";
import NewBot from "./pages/NewBot";
import BotDetail from "./pages/BotDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ComingSoon title="Dashboard" description="Portfolio summary, live markets, trending coins, watchlist, sentiment and news — arriving in Phase 5." />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/bots" element={<Bots />} />
          <Route path="/bots/new" element={<NewBot />} />
          <Route path="/bots/:id" element={<BotDetail />} />
          <Route path="/offers/new" element={<NewOffer />} />
          <Route path="/offers/:id" element={<OfferDetail />} />
          <Route path="/portfolio" element={<ComingSoon title="Portfolio" description="Self-reported holdings with live P/L. Arriving in Phase 5." />} />
          <Route path="/wallet" element={<ComingSoon title="Wallet" description="Linked read-only addresses. Arriving in Phase 5." />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/trades/:id" element={<TradeRoom />} />
          <Route path="/messages" element={<ComingSoon title="Messages" description="Direct messages with attachments, typing indicators and read receipts. Arriving in Phase 7." />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/rewards" element={<ComingSoon title="Rewards" description="Daily streaks, XP, referrals and achievement rewards. Arriving in Phase 6." />} />
          <Route path="/community" element={<ComingSoon title="Community" description="Discussion board, news and trading tips. Arriving in Phase 7." />} />
          <Route path="/leaderboards" element={<ComingSoon title="Leaderboards" description="Top traders, fastest responders, largest volume. Arriving in Phase 6." />} />
          <Route path="/support" element={<ComingSoon title="Support" description="FAQ and contact form. Arriving in Phase 7." />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
