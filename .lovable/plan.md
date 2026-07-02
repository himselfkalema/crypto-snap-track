# BitBite V3 — Ultimate P2P Crypto Marketplace

This is a large multi-phase rebuild. I'll ship it in coherent phases so you can review as we go, rather than one 40-file mega-change. Each phase leaves the app fully working.

## Scope confirmation

A few decisions before I start (please confirm or adjust):

1. **Custody model.** Real P2P marketplaces need a crypto escrow wallet. Building non-custodial on-chain escrow is out of scope for a Lovable app. I'll build BitBite as a **coordination + reputation layer** (offers, trade rooms, chat, reviews, disputes, receipts, timers) — real crypto/fiat settlement happens off-platform between the two traders, exactly like LocalBitcoins/Paxful's "no-escrow" tier. Everything else (reputation, disputes, admin) is enforced by the platform. OK?
2. **Portfolio / Wallet pages.** Since we're not custodial, "Portfolio" and "Wallet" become **self-reported holdings + linked read-only addresses** (manual entries + optional public address balance lookup via a price API). Not an actual custodial wallet. OK?
3. **Live market data.** Continue using the existing `coincap-proxy` edge function for prices/charts. News feed uses a free public RSS (CoinDesk/CryptoPanic public).
4. **AI features.** Use Lovable AI Gateway (google/gemini-3-flash-preview) — no extra key needed. Gated to Premium.
5. **Legacy wipe.** I'll delete every remaining legacy page/component/table not used by the new spec (mobile-money withdrawal skips, wallet topup RPCs, disbursement callbacks, etc.). Clean slate.

## Phased build

### Phase 1 — Legacy wipe & foundation
- Delete legacy pages, components, hooks, edge functions, and DB tables not in the new spec.
- New design system pass in `index.css` + `tailwind.config.ts`: refined glassmorphism, dark+light themes, gradient tokens, typography scale, motion tokens.
- New `AppShell` with sidebar nav (Dashboard, Marketplace, Portfolio, Wallet, Trade History, Messages, Notifications, Rewards, Community, Leaderboards, Subscription, Support, Settings, Admin).
- Theme toggle, mobile nav drawer, command palette skeleton.

### Phase 2 — Data model
Single migration adding/adjusting tables (with GRANTs + RLS + policies):
- `profiles` — extend: banner_url, trading_level, xp, followers_count, following_count, response_time_avg, release_time_avg, is_merchant, is_online, last_seen, about
- `follows` (follower_id, followee_id)
- `favorites` (user_id, offer_id / trader_id / coin)
- `watchlist` (user_id, coin)
- `offers` — extend: terms, auto_reply, visibility, paused, expires_at
- `trades`, `trade_messages` — add typing/read receipts, reactions, attachments
- `reviews` — split into communication/speed/trust/overall
- `disputes`, `dispute_evidence`
- `achievements`, `user_achievements`
- `rewards_ledger` (xp, source, meta)
- `community_posts`, `community_comments`, `community_likes`
- `messages` (DM inbox separate from trade chat), `message_threads`
- `notifications` (extend with categories)
- `price_alerts`
- `portfolio_positions` (self-reported holdings)
- `linked_addresses` (read-only)
- `announcements`, `feature_flags`, `audit_logs` (already exist — keep)
- Enable Supabase Realtime on: trades, trade_messages, messages, notifications, offers, community_posts.

### Phase 3 — Marketplace + Offers
- Marketplace page with Buy/Sell tabs, all filters, sort, infinite scroll, virtualized offer list.
- Rich offer cards with all trader stats.
- Offer detail page.
- New offer wizard (multi-step) with all fields incl. terms/auto-reply/visibility/pause/expiration.
- My offers management page.

### Phase 4 — Trade Room + Realtime
- Trade room layout: timeline, live chat, payment instructions, receipt upload (Supabase Storage `trade-receipts` bucket), countdown timer, status, notes, reactions, typing indicator, read receipts.
- Real-time via Supabase channels.
- Post-trade review modal (4 axes).
- Confetti on first completed trade.

### Phase 5 — Dashboard + Portfolio + Wallet + Watchlist
- Dashboard with all widgets: portfolio summary, live markets (BTC/ETH/SOL/BNB/XRP/DOGE/ADA/USDT via coincap-proxy), trending/gainers/losers, watchlist, market sentiment (Fear & Greed via alternative.me public API), news feed.
- Portfolio: self-reported positions, P/L calculations, allocation chart.
- Wallet: linked read-only addresses.
- Price alerts.

### Phase 6 — Profile, Reputation, Achievements, Reviews, Leaderboards, Rewards
- Public profile page (avatar, banner, all stats, badges, achievements, reviews, about).
- Reputation ranks (Explorer → Legend) computed from trades + XP.
- Achievements engine (server-side awarding via triggers/functions).
- Rewards page: daily login, streaks, referral, XP progress.
- Leaderboards page (top traders, fastest, highest rated, largest volume, most followers).

### Phase 7 — Messages + Notifications + Community + Support
- DM inbox with search, unread badges, attachments, typing, read receipts, online status.
- Notifications center with categories + realtime.
- Community discussion board with posts, comments, likes, pinning, tags.
- Support page with contact form + FAQ.

### Phase 8 — Subscriptions (Lemon Squeezy) + AI (Premium)
- Pricing page (Free / Pro $0.99 / Premium $1.99).
- `lemon-checkout` + `lemon-webhook` edge functions (already scaffolded — verify + polish).
- Manage subscription, invoices, billing history.
- AI edge functions (gated to Premium): pricing assistant, scam detection, trade summary, portfolio insights, market forecast, risk score, chat assistant.

### Phase 9 — Admin Control Center
- Live analytics dashboard (users, trades, revenue, disputes, subscriptions, growth charts).
- User management (ban, verify).
- Dispute resolution UI.
- Offers/reviews/reports moderation.
- Feature flags + announcements editors.
- Audit log viewer.
- System health.

### Phase 10 — Security, Performance, Polish
- RLS audit + `has_role()` everywhere.
- Rate-limit edge functions.
- Optional 2FA (Supabase MFA).
- Lazy routes, code splitting, image optimization, virtualization, skeleton loaders, empty states, error pages, micro-interactions, 404/500.
- SEO per page.

## Technical notes

- Stack unchanged: React + Vite + TS + Tailwind + shadcn + Supabase (Lovable Cloud) + Lemon Squeezy + Lovable AI Gateway.
- Realtime via `supabase.channel(...)` inside `useEffect` (cleanup mandatory).
- Storage buckets: `avatars` (public), `banners` (public), `trade-receipts` (private, RLS), `community-media` (public).
- Every new `public` table gets GRANTs + RLS + policies in the same migration.

## Starting point

Once you confirm the 5 scope questions above, I'll begin with **Phase 1 (legacy wipe + design system + new AppShell)** and check in with you before Phase 2's migration.
