# Deploy Pickup Watch USA on your own Vercel account

This is a standalone copy of your website, with no Sites hosting account, private tokens, or Python server required. It contains the complete frontend and Vercel Node.js Functions. You own the Vercel project, its URL, and any domain you connect.

## Fastest: deploy from Terminal

Install Node.js 22 or newer if `node --version` does not work. Then:

```sh
cd /Users/diegovillarreal/Desktop/checker/vercel-app
npm run build
npm test
npx vercel@latest login
npx vercel@latest --prod
```

The first `npx` invocation may ask to install the official Vercel CLI; accept it. Sign in to YOUR Vercel account in the browser. If your machine has a newer Node version, Vercel will still build this project on Node 22, as declared in package.json.

Answer the setup prompts:

1. Set up and deploy? **Y**.
2. Which scope? **Your own account** (or your team, if that's where you want it).
3. Link to an existing project? **N**, unless you already made one for this site.
4. Project name? Choose your own, e.g. `pickup-watch-usa`.
5. Directory containing the code? **./**.
6. Framework preset, if asked? **Other**.
7. Keep the detected configuration: build `npm run build`, output `public`.

The CLI prints your production `https://YOUR-PROJECT.vercel.app` URL. That is your deployment. Future edits can be redeployed with `npx vercel@latest --prod` from this folder.

## Alternative: GitHub → Vercel

Create a GitHub repository under your account and upload the CONTENTS of this `vercel-app` folder (not the entire checker folder). On Vercel choose **Add New → Project**, import that repository, use **Other** for framework, root **./**, build command **npm run build**, output **public**, and deploy. `vercel.json` contains these settings. Do not publish your `.vercel` folder or `.env` files.

If you instead put the whole checker workspace in GitHub, set Vercel's Root Directory to `vercel-app`.

## After deployment

- Open your new URL, select your phone, and check a five-digit US ZIP.
- Open `/api/health` to verify the backend: it should show `ok: true` and `stores: 269`.
- Check ZIP `77002` or `10001`. Results should show nearby stores and a last-checked time; cached results are labeled.
- In your Vercel project, **Settings → Domains** lets you add your own domain. Follow the DNS records Vercel gives you.
- If a browser cannot visit your production link without logging in, check Vercel's Deployment Protection settings for that project.
- Stock checking makes no purchases or reservations. Apple may reject Vercel's outbound requests with HTTP 403/429/541; the UI will show a cooldown, not pretend stock is unavailable.

## Before a large public launch

The basic deployment needs no environment variables. For a larger public audience, configure the built-in Upstash Redis support described below to share stock results and cooldowns across Vercel instances. Without those variables, the app uses warm-instance memory only. Apple can still reject hosted requests; no cache setup guarantees inventory access. Vercel usage and plan rules depend on your account; check them in your dashboard.

The directory has 269 US stores and 32 model/carrier configurations, verified October 27, 2026. Searches check nearby stores on demand and refresh that area while the tab is open. It does not continuously scan every US store. Unchecked and expired results remain unconfirmed.

## Edit

Frontend: `src/page.html`, `src/style.css`, `src/client.js`.
Backend: `src/api.js`.
Catalogs: `src/models.json`, `src/stores.json`.

Run `npm run build` after editing: this generates `public/index.html`, fingerprinted assets in `public/assets/`, and `lib/inventory.js`. `api/` contains the small Vercel entry points. The generated files are included for easy import, and Vercel regenerates them during each build.

## GitHub first (your own commit and deployment)

This folder is the repository root. Do not upload the surrounding checker workspace or the other hosted copy. To publish your own repo:

```sh
cd /Users/diegovillarreal/Desktop/checker/vercel-app
git add .
git commit -m "Launch Pickup Watch USA"
```

Create an empty GitHub repository under your account (no generated README). Copy its remote URL, then:

```sh
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

In Vercel: **Add New → Project → Import that repository → Deploy**. `vercel.json` sets the framework, build, and output directory. If this folder is the repo root, leave Root Directory as `./`. Subsequent GitHub pushes trigger Vercel deployments.

## Public launch polish

- HTML is about 7 KB; fingerprinted CSS and JavaScript are cached for a year and safely change URLs after edits.
- Initial store list is 12 cards. City/name search is debounced; unchanged results do not rebuild the list.
- Countdown runs once per second; background tabs pause display work. Mobile keeps a compact animated timer.
- Fresh area results survive page reloads in session storage, avoiding repeated Apple checks.
- **Share** copies a link containing the selected model, state, and optional ZIP. Shared links prefill the form; visitors press Find my iPhone to check.
- PNG Open Graph/Twitter preview image and metadata are included. Vercel's production URL is used automatically at build time; set `SITE_URL` to your custom domain if desired.
- GitHub Actions runs the build and tests on pushes and pull requests. Run `npm ci` first; the official Stripe SDK and Stripe CLI are locked in package-lock.json.

## Shared cache for a public audience

The code now supports a shared Upstash Redis database. In your Vercel project, add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as server-side environment variables (see `.env.example`), then redeploy. You can create/connect Upstash through Vercel's Marketplace. Do not paste credentials into source files or send them in chat.

With both values configured, an atomic Redis script reuses cached area results and enforces a global 30-second interval between uncached Apple checks across Vercel instances. Rejected Apple requests set a shared cooldown. If configured Redis is unavailable, checks fail closed instead of sending uncontrolled requests to Apple. Existing cached results can still be used in the browser until expiry. Without Redis configured, the app retains the basic per-instance memory cache. Redis integration is covered with mocked REST tests; a real database connection still needs to be verified on your Vercel account.

For local preview: `npm run dev`, then visit http://127.0.0.1:8767. The preview loads ignored `.env.local` settings and uses real Apple requests. Tests do not load your local Stripe keys.

## Plus: $2.99/month, with free owner access

- Free: area checks target every 15 minutes.
- Plus: area checks target every 2 minutes, while the tab is open.
- Owner: the Plus interval at no cost, using your private owner code.
- Apple cooldowns apply to every tier. Faster intervals do not guarantee available stock or a successful purchase.

Checkout is disabled until webhook and durable billing storage are configured. A $2.99/month TEST product/price and test portal have been configured with the supplied test credentials. No Stripe account, subscription, or charge was created.

### Connect your own Stripe account

The test catalog and billing portal are configured. Follow **Required deployment setup** in [STRIPE-INTEGRATION-PLAN.md](STRIPE-INTEGRATION-PLAN.md) to add Vercel's sensitive variables, connect durable Redis billing storage, and register the signed webhook endpoint before testing checkout. Use test mode throughout. Local values are saved only in Git-ignored `.env.local`; do not commit or share that file.

Free owner access does not require a Stripe subscription: enter your private `OWNER_ACCESS_KEY` in the Owner access form. The generated code is in your ignored local settings; do not paste it into chat or source. Set it as a sensitive variable in Vercel for your deployed site.

Rotate the test API secret pasted into chat. Prefer a restricted API key with the minimum permissions for the deployed integration. Use a different random value for `SESSION_SECRET` and `OWNER_ACCESS_KEY`. Run `openssl rand -hex 32` or use a password manager to generate them.

Only switch to separate live keys, product/price, portal and webhook resources after account-level testing, sign-in/recovery, and tax assessment. No one is subscribed automatically; visitors must explicitly confirm a subscription on Stripe.

### What is enforced

`/api/availability` verifies an HttpOnly signed cookie on the server. Client query parameters and localStorage cannot grant Plus. Subscriber access is checked against durable, webhook-maintained subscription records; canceled/inactive, wrong-price or risk-held subscriptions lose Plus. Price amount, currency and monthly interval are verified before creating checkout, and activation requires a completed paid checkout tied to the browser's signed checkout nonce. Billing changes stay on Stripe's portal. Verified webhooks and durable Redis billing storage are now required before subscriber checkout can be enabled. See STRIPE-INTEGRATION-PLAN.md for setup and the required events.

Free and Plus inventory caches are separate, so a paid visitor does not receive a 15-minute cache entry while being promised two-minute checks. The shared global Apple throttle/cooldowns remain in effect. Configure Redis as described above before a public launch.

### Current billing limits

Access is attached to the browser that completes checkout, not a full cross-device account. Clearing cookies or using a different device loses access until it is restored manually; implement account-based sign-in/restoration before promoting recurring billing widely. Stripe's emailed receipt/customer portal can still be used to manage or cancel the subscription. The 365-day subscriber cookie also expires; account-based restoration is a future improvement. The owner code remains a free way for you to use the tool. Billing integration has been tested with mocked Stripe responses; real test-mode checkout, portal configuration and taxes still need verification in your own Stripe account before accepting real payments.

## Stripe integration review

See [STRIPE-INTEGRATION-PLAN.md](STRIPE-INTEGRATION-PLAN.md) for the tailored Payments/Billing/Invoicing plan, completed changes, webhook/Redis setup, and remaining account-recovery requirements. Stripe MCP registration is separate from application billing credentials. The official skills fallback is installed under `.agents/skills/`.
