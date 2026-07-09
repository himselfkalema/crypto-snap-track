## Goal
Close the functional gaps that block a real P2P trade from start to finish. Four phases, shipped in order. Each phase leaves the app in a working state; you can stop or reorder between phases.

---

## Phase 1 — User Auth Hardening

Make regular-user accounts trustworthy before any money moves.

- Enable **HIBP leaked-password check** on signup / password change.
- Enforce **email verification** before a user can create an offer, open a trade, or run a bot (gate in UI + server-side check in the trade/offer/bot edge paths).
- **Optional TOTP** for regular users: enroll flow in Settings → Security, badge on profile.
- **Account lockout**: reuse `admin_login_attempts` pattern with a `user_login_attempts` table + edge function; lock for 15 min after 5 failed attempts.
- **Session policy for users**: 30 day absolute, refresh rotation on; "Sign out everywhere" button in Settings.
- Rename generic `Auth.tsx` copy, add password strength meter, add "resend verification email".

Deliverable: verified email + strong password required before trading; 2FA available.

---

## Phase 2 — RLS + AuthZ Sweep

Lock every table down to the minimum policy that still lets the app work.

- Add roles: `verified_user`, `moderator` (in `app_role` enum). `has_role()` already exists.
- Re-audit every public table (offers, trades, trade_messages, disputes, dispute_evidence, bots, bot_runs, reviews, notifications, payments, subscriptions, announcements, feature_flags). One doc listing each policy + intended actor.
- Add `trades_guard_insert` trigger (mirrors the existing `trades_validate_insert` but also blocks self-trading, suspended users, unverified users).
- Add `audit_logs` writes on: role grant/revoke, offer feature toggle, dispute resolution, subscription plan change, wallet debits.
- **Server-side rate limits** on public edge functions (`admin-log-attempt`, `coincap-proxy`, future `create-trade`, `bot-tick`) via a shared `rate_limit(key, window, max)` helper backed by a `rate_limits` table.
- Fix the linter warnings from the last migration (SECURITY DEFINER functions with public EXECUTE) by revoking EXECUTE from `anon`/`authenticated` on the guard/validation triggers — they only need to run as triggers, not as callable RPCs.

Deliverable: no table is over-permissive; sensitive actions are logged; abusive clients get 429s.

---

## Phase 3 — Trade Lifecycle & Escrow

Currently a trade row exists but there is no escrow, no dispute UI, no auto-cancel, no post-trade review prompt.

- **Escrow ledger**: `wallet_balances` and `wallet_ledger` tables + `debit_wallet_if_enough(user_id, coin, amount, reason, ref)` RPC (atomic, SECURITY DEFINER). Trade creation for a `sell` offer moves seller's crypto from `available` → `escrow`; `completed` moves escrow → buyer's available; `cancelled` refunds.
- **Trade room polish**: countdown to `expires_at`, "I've paid" (buyer) → "Release crypto" (seller) → "Open dispute" buttons wired to the status transitions the trigger already allows.
- **Auto-cancel on expiry**: cron edge function `trade-expire-tick` runs every minute, cancels `pending`/`payment_sent` trades past `expires_at`, refunds escrow, notifies both parties.
- **Disputes UI**: `/disputes/:id` page for participants + moderator queue in Admin, evidence uploads to a new `dispute-evidence` storage bucket (private, RLS on `dispute_evidence` table).
- **Reviews**: after `completed`, prompt both parties once; write to `reviews`; recompute `profiles.reputation_score`/`total_trades`/`successful_trades` in a trigger.
- **Notifications**: DB-backed `notifications` rows on every state change; bell badge already exists — wire it up with realtime subscription.

Deliverable: two users can complete a full trade including a dispute path, with escrow guarantees.

---

## Phase 4 — Payments & Payouts

Turn the subscription and mobile-money plumbing into a shipped flow.

- **Lemon Squeezy subscriptions**: finish `lemon-webhook` (verify signature, upsert `subscriptions` row, handle `subscription_created/updated/cancelled/expired`). Pricing page → checkout → success page. Enforce plan limits (bots trigger already exists; add offer limit + withdraw-skip counter).
- **MTN / Airtel disbursements**: `create-withdrawal` edge function → validates KYC + balance → inserts `payments` row `status=queued` → background `payout-tick` calls MTN/Airtel disbursement API → updates status from webhook. Apply the **35% fee** server-side, never client-side.
- **Withdraw-skip** (Premium only): checkbox in the withdraw form; decrements a monthly counter on `subscriptions`; bypasses queue by calling disbursement API immediately.
- **Transaction history** UI at `/wallet` with filters (deposit / withdraw / trade / subscription).
- **Webhook signature verification** for every provider; store raw payload in `payments.metadata`.

Deliverable: user can subscribe, earn crypto in escrow, and cash out to mobile money with correct fees.

---

## Cross-cutting (drip into every phase)

- Empty / loading / error states on every page you touch.
- Mobile layout pass on the pages you touch.
- Add `og:image`, canonical, and per-page titles as you add routes.
- Every new edge function: zod-validated input, CORS, 400 on bad input, structured error.

---

## Suggested order for the next few turns

1. Phase 1 — HIBP + email-verified gate + user TOTP (one turn).
2. Phase 1 — lockout + session controls (one turn).
3. Phase 2 — RLS sweep + rate-limit helper + fix linter warnings (one turn).
4. Phase 3 — escrow ledger + trade room actions (one turn).
5. Phase 3 — disputes + reviews + notifications realtime (one turn).
6. Phase 4 — Lemon Squeezy end-to-end (one turn).
7. Phase 4 — MTN/Airtel payouts + withdraw-skip + wallet history (one turn).

Approve to start with turn 1 (HIBP + email-verified gate + user TOTP), or tell me to reorder.