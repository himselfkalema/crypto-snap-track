## Plan: SEO meta tags for Landing & Auth

Add per-route head tags via `react-helmet-async`, plus a branded OG image and sitewide JSON-LD.

### Changes

1. **Install** `react-helmet-async` and wrap the app root.
   - `src/main.tsx`: wrap `<App />` in `<HelmetProvider>`.

2. **Generate OG image** (1200×630, branded BitBite, dark navy + electric blue) → `src/assets/og-bitbite.jpg`, then upload via `lovable-assets` for a stable CDN URL referenced in meta tags.

3. **`index.html`** — keep as social-crawler fallback. Update:
   - Remove `<link rel="canonical">` (each route owns its own via Helmet — but currently none exists, so add canonical pointing to `https://bitbite.lovable.app/` only as sitewide fallback for non-Helmet routes... actually skip: add canonical via Helmet only).
   - Add sitewide `og:url`, `og:image`, `twitter:image`, `og:site_name: BitBite`.
   - Add Organization + WebSite JSON-LD.

4. **`src/pages/Landing.tsx`** — add `<Helmet>` block:
   - `<title>BitBite — Buy & Sell Crypto Securely | P2P Marketplace</title>`
   - description targeting "p2p crypto marketplace, buy bitcoin, sell ethereum"
   - canonical + og:url → `https://bitbite.lovable.app/`
   - og:title, og:description, og:image, twitter:* (self-referencing)
   - JSON-LD: `WebSite` with `SearchAction` pointing at `/marketplace`.

5. **`src/pages/Auth.tsx`** — add `<Helmet>`:
   - `<title>Sign in or Create Account — BitBite</title>`
   - description: "Sign in to BitBite or create a free account to start trading crypto P2P."
   - canonical + og:url → `https://bitbite.lovable.app/auth`
   - `<meta name="robots" content="noindex,follow">` (auth pages shouldn't rank)
   - og:title, og:description, og:image, twitter:*

### Out of scope
Other routes (Marketplace, Pricing, etc.) — only Landing & Auth as requested.

### Note to user
Social platforms cache previews; after publishing, the new OG image may take time to appear in shared links until refreshed in each platform's debugger.
