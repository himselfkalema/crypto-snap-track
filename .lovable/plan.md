## Crypto Snap Track — Complete Rebuild to P2P Marketplace

This is a full platform reset. Everything related to the current portfolio tracker, mobile money (MTN/Airtel), withdrawals, deposits, and CoinCap integration will be removed and replaced with a real-time P2P cryptocurrency marketplace.

### Phase 1 — Wipe Legacy Code

Delete:
- `src/pages/Wallet.tsx`, `src/pages/Dashboard.tsx`, `src/pages/SubscriptionManagement.tsx`, `src/pages/Pricing.tsx`, `src/pages/Landing.tsx`, `src/pages/Admin.tsx` (rebuild from scratch)
- `src/components/MobileMoneyTopup.tsx`, `src/components/WithdrawForm.tsx`
- All `src/components/crypto/*` (portfolio chart, ticker, position cards, dashboard sidebar, etc.)
- `src/hooks/useCryptoData.ts`
- `src/types/crypto.ts`
- All existing edge functions: `coincap-proxy`, `mobile-money`, `wallet-topup`, `withdraw`, `admin-deposits`, `disbursement-callback`, `send-custom-email`
- Secrets: `COINCAP_API_KEY`, `MTN_*`, `AIRTEL_*`, Stripe keys (replaced by Lemon Squeezy)
- All legacy DB tables via migration: wallets, wallet_transactions, withdraw_skips, user_subscriptions, tiers, etc.

### Phase 2 — Enable Lovable Cloud

Backend is not yet enabled. Enable Lovable Cloud for auth, database, realtime, storage, and edge functions.

### Phase 3 — Database Schema

New tables (with RLS + grants):
- `profiles` — id, username, avatar, bio, reputation_score, total_trades, success_rate, verified, joined_at
- `user_roles` — id, user_id, role enum (`user`, `admin`) + `has_role()` security definer
- `offers` — id, user_id, type (buy/sell), coin, price, amount, min_trade, max_trade, payment_methods[], terms, status, country
- `trades` — id, offer_id, buyer_id, seller_id, amount, price, status, created_at, completed_at
- `trade_messages` — id, trade_id, sender_id, content, file_url, read_at, created_at
- `reviews` — id, trade_id, reviewer_id, reviewee_id, rating, comment
- `disputes` — id, trade_id, opener_id, status, resolution
- `dispute_evidence` — id, dispute_id, user_id, file_url, note
- `notifications` — id, user_id, type, payload, read_at
- `subscriptions` — id, user_id, plan (free/pro/premium), status, lemon_subscription_id, current_period_end
- `payments` — id, user_id, amount, currency, lemon_order_id, status
- `announcements` — id, title, body, published_at
- `audit_logs` — id, actor_id, action, target, metadata
- `feature_flags` — key, enabled, payload

Trigger: auto-create `profiles` row + assign `user` role on signup. Auto-assign `admin` role for `kalemaahmed198@gmail.com` and `favorpupi@gmail.com`.

Realtime publication enabled for: `trades`, `trade_messages`, `notifications`, `offers`.

Storage buckets: `avatars` (public), `trade-attachments` (private), `dispute-evidence` (private).

### Phase 4 — Frontend Structure

New routes:
- `/` — Landing page (hero, marketplace preview, how it works, why us, pricing)
- `/auth` — Email signup/login, password reset, email verification
- `/marketplace` — Filters (buy/sell, coin, country, payment, price), offer cards
- `/offers/new` — Create offer form
- `/offers/:id` — Offer detail + start trade
- `/trades` — My trades list
- `/trades/:id` — Trade room (status, timer, chat, dispute button)
- `/profile/:username` — Public profile + reviews
- `/settings` — Profile, security, subscription
- `/pricing` — Free / Pro $0.99 / Premium $1.99 (Lemon Squeezy checkout)
- `/admin` — Overview, users, trades, disputes, announcements, audit logs (admin-only)
- `/notifications` — List of realtime notifications

Shared shell: top nav (logo, marketplace, trades, notifications bell, profile menu), responsive mobile drawer.

### Phase 5 — Design System

Dark glassmorphism, mobile-first. Update `index.css` + `tailwind.config.ts` with semantic tokens:
- Background: deep slate `222 47% 6%`
- Surface/glass: translucent white over slate with backdrop blur
- Primary accent: electric blue `217 91% 60%`
- Success (buy): emerald, Danger (sell): rose
- Inter font + JetBrains Mono for prices
- Framer Motion for hero + card hover transitions

### Phase 6 — Realtime Features

- `useTradeChannel(tradeId)` — subscribe to `trades` row + `trade_messages` inserts
- `useNotifications()` — subscribe to user's notification inserts, toast on new
- `useOfferFeed()` — subscribe to `offers` inserts/updates for live marketplace

### Phase 7 — Subscriptions (Lemon Squeezy)

- Edge function `lemon-checkout` — creates checkout URL using `LEMON_SQUEEZY_API_KEY` + `VITE_LEMON_SQUEEZY_STORE_ID`
- Edge function `lemon-webhook` — verifies signature with `LEMON_SQUEEZY_WEBHOOK_SECRET`, upserts `subscriptions` + `payments`
- Pro/Premium feature gates enforced via `subscriptions.plan`

Secrets requested via `add_secret`: `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_WEBHOOK_SECRET`, `VITE_LEMON_SQUEEZY_STORE_ID` (this one also exposed as a public Vite var).

### Phase 8 — Admin Dashboard

Stats cards (counts via RPC), user table with suspend/verify actions, trade monitor, dispute review with evidence viewer, announcement composer, audit log table. All actions write to `audit_logs`.

### Phase 9 — Security

- RLS on every table; `has_role()` for admin checks
- Edge functions validate JWT, sanitize errors, verify webhook signatures
- Storage policies scoped to trade participants
- `profiles.username` unique constraint, basic input validation with zod
- Audit logging for admin actions

### Technical details

- Stack stays React 18 + Vite + Tailwind + shadcn (no framework change possible on Lovable)
- All new tables get explicit `GRANT` to `authenticated` + `service_role`
- Two-step migration: drop legacy tables (cascade), then create new schema
- Lemon Squeezy is not a built-in Lovable payment provider, so this is a custom integration using their REST API + webhooks (not Lovable's seamless Stripe/Paddle flow). Confirm before proceeding.

### Questions before I build

1. **Lemon Squeezy vs Lovable's built-in payments** — Lovable has seamless Stripe and Paddle integrations that handle tax, compliance, and subscriptions with zero setup. Lemon Squeezy will work but requires you to manage the store, products, and API keys yourself. Do you want to stick with Lemon Squeezy, or switch to Stripe/Paddle?
2. **Legacy data** — Should I drop the old tables entirely (irreversible) or leave them in place and just stop using them? Recommend dropping for a clean slate since this is a full rebuild.
3. **Email verification** — Required before users can trade, or optional?
4. **Trade timer** — Default payment window per trade (e.g. 15 / 30 / 60 minutes)?

Once you confirm, I'll enable Lovable Cloud, run the migration, request the Lemon Squeezy secrets, and build the full app.
