# Market-Maker Offer Bots

Automated bots that keep a user's buy/sell offers priced against live market rate (via `coincap-proxy`) with a margin, auto-pausing when unsafe.

## Tier limits (strict)

| Plan    | Active bots | Refresh interval | Daily volume cap |
|---------|-------------|------------------|------------------|
| Free    | 1           | 5 min            | $200             |
| Pro     | 3           | 1 min            | $2,000           |
| Premium | 10          | 20 sec           | $20,000          |

Hard safety: auto-pause after 2 disputes in 24h, on 3 consecutive failed price fetches, or if margin would push price >20% off market.

## Data model (one migration)

- `bots` — user_id, coin, side (buy/sell), fiat_currency, payment_method, margin_pct, min_amount, max_amount, terms, auto_reply, status (active/paused/stopped), pause_reason, offer_id (FK to `offers`), daily_volume, last_run_at, last_error, created_at, updated_at.
- `bot_runs` — bot_id, ran_at, market_price, new_price, action (created/updated/skipped/paused), note.
- Extend `offers`: `bot_id uuid null`, `is_bot boolean default false`.

RLS: owner-only CRUD on `bots`; `bot_runs` read-only to owner + admin; edge function uses service role. Full GRANTs per public-schema rules.

## Backend

- Edge function `bot-tick` (verify_jwt=false, service role): every minute, selects bots due for refresh based on tier interval, fetches CoinCap price, recomputes offer price = market × (1 ± margin), updates or (re)creates the linked `offers` row, enforces caps/safety, writes `bot_runs`, updates `daily_volume` (resets nightly).
- Scheduled via `pg_cron` + `pg_net` → hits `bot-tick` every minute.
- Nightly cron resets `daily_volume` and clears stale pause reasons.

## Frontend

- New route `/bots` in `AppShell` sidebar ("Bots" with Bot icon, Premium sparkle when limits apply).
- `Bots.tsx`: list of user's bots with status pill, live P/L badge, quick pause/resume/stop, "New bot" CTA. Shows tier usage (e.g. "2 / 3 active — Pro").
- `NewBot.tsx`: wizard — coin, side, margin %, amount range, payment method, fiat, terms, auto-reply message. Live price preview + effective offer price.
- `BotDetail.tsx`: run history table from `bot_runs`, chart of applied price vs market (recharts), linked offer card, controls.
- Marketplace offer cards get a small "Bot" badge when `is_bot`.
- Tier gating via existing `subscriptions` table; upgrade CTA links to `/pricing`.

## Safety UX

- Dispute auto-pause surfaces a red banner with reason and one-click resume (only after user acknowledgment).
- Global kill switch in Admin → new "Bots" tab: list, force-stop, view runs, ban user's bots.

## Notifications

- New categories: `bot_paused`, `bot_trade_started`, `bot_daily_cap_hit`. Piggy-back on existing `notifications` table + Realtime.

## Out of scope (v1)

- No auto-accepting incoming trades; bots only manage offer pricing/availability. Human still confirms every trade in the Trade Room.
- No custody, no automated fiat/crypto transfers.

## Technical notes

- Price source: existing `coincap-proxy` edge function (cached 15s in `bot-tick` memory to save calls).
- Concurrency: `bot-tick` uses `SELECT ... FOR UPDATE SKIP LOCKED` on due bots so overlapping ticks don't double-run.
- All new `public` tables ship with GRANTs + RLS + policies in the same migration.
- Realtime enabled on `bots` so the UI reflects pauses instantly.
- Tier lookups via existing `subscriptions.plan`.

## Phasing

1. Migration (`bots`, `bot_runs`, offer columns, RLS, cron).
2. `bot-tick` edge function + cron wiring.
3. `/bots`, `/bots/new`, `/bots/:id` UI + sidebar entry.
4. Marketplace badge + notifications + Admin tab.
