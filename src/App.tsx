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
import NotFound from "./pages/NotFound";

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
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/offers/new" element={<NewOffer />} />
          <Route path="/offers/:id" element={<OfferDetail />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/trades/:id" element={<TradeRoom />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
