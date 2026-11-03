# Pickup Watch Texas

Free Apple product pickup checks across 17 Texas Apple Stores. Select a category, product, and exact retail configuration, or load a US Apple Store product link. All purchases happen at Apple.

## Coverage

The catalog comes from Apple's public US shopping pages, including Mac, iPhone, iPad, Watch, AirPods, displays, Vision Pro, home products, AirTag, and accessories. Configuration labels include exact retail part numbers. Only the selected SKU is checked, and each SKU/area has its own two-minute cache. A shared global throttle and Apple error cooldown protect the upstream service. Stock stays unconfirmed until checked and expires when stale.

Apple Watch entries describe case stock; band compatibility and fit must be confirmed at Apple. Mac entries cover standard retail SKUs; custom-built machines may not support pickup. Digital services, gift cards, engraving, prescription lenses, and online-only items do not necessarily expose pickup SKUs. The link importer reports missing metadata rather than guessing stock.

## Development

`npm ci`, `npm run build`, `npm test`, `npm run dev`. Preview: http://127.0.0.1:8767.

Use `npm run sync:products` to refresh the catalog from Apple's URLs in `src/product-sources.json`. Review the resulting catalog before deploying. No sync runs during visitors' normal stock checks. Product configurations are loaded on demand; only small family summaries are bundled in the browser. Imported links stay on Apple's US domain, redirects are validated, and product page size/time limits apply.

## Deployment

Push main to the connected GitHub repository for Vercel deployment. Free Upstash Redis provides shared caching using `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`). Keep credentials in ignored env files or Vercel secrets. No billing or accounts.

`/api/catalog` lists product families and stores. `/api/catalog?product=buy-airpods/airpods-5` returns configurations. `/api/product?url=...` loads another Apple product. `/api/availability?zip=77002&part=MKFW4LL%2FA` checks the selected SKU. `/api/health` reports service health.

## Browser stock alerts

Select an exact configuration and Texas ZIP, then click **Notify me when available** and allow browser notifications. A tone and in-page message accompany stock changes. **Test sound** verifies local audio. Alerts run only while this page remains open on that product and ZIP; changing either stops the alert. Sleep mode, closed tabs, mobile/browser restrictions, and Apple cooldowns can delay or stop checks. Sound is enabled by a user click; no email, background push service, or server monitoring is provided.

## Personal Telegram monitor

`server/personal-watch.json` pins the personal watch to iPhone Duo 256GB Night Sky, SKU `MK1F4LL/A`, at San Antonio's NorthPark Center, Knox Street, and Galleria Dallas stores. The authenticated `/api/telegram-monitor` route uses the shared Apple throttle/cache and durable Redis state, sends a message only for newly confirmed available stores, and retries delivery failures on subsequent runs. Unknown or failed checks never count as a restock. Telegram requests are mocked in tests.

1. Create a Telegram bot with the verified `@BotFather` using `/newbot`. Save `TELEGRAM_BOT_TOKEN` in the ignored `.env.telegram.local` file. Never commit it.
2. Run `npm run telegram:connect`. Follow the generated Telegram link and tap Start, then rerun it. The random start code ties the bot to your private chat without selecting an unrelated Telegram user.
3. Set production secrets `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and a random 32+ character `MONITOR_SECRET` in the existing Vercel project. Keep Redis connected.
4. Put that same monitor secret in the GitHub Actions repository secret `PICKUP_MONITOR_SECRET`. Set repository Actions variable `TELEGRAM_MONITOR_ENABLED` to `true` only after testing the connection.
5. GitHub Actions is an optional five-minute fallback. It is currently disabled through `TELEGRAM_MONITOR_ENABLED=false` because cron-job.org now triggers the monitor every minute. Do not enable both schedulers together. No paid service is selected.

Pause the cron-job.org job to pause checks; keep the GitHub fallback variable disabled. The only recipient is the private Telegram chat in the server secret. Bot tokens/chat IDs never enter frontend assets or workflow source. No purchase, reservation, or charge is performed.

### Active faster scheduler

cron-job.org job `8778953` (Pickup Watch — San Antonio iPhone Duo) sends an authenticated POST to `/api/telegram-monitor` every minute. The trigger key is stored as an Authorization header in that account; the Telegram bot token remains only in server secrets. Response-body history saving is off. The shared 120-second product cache means fresh Apple requests occur about every two minutes; Apple throttling and connection failures retain their cooldown. The monitor checks only NorthPark Center, Knox Street, and Galleria Dallas for the configured 256GB Night Sky SKU and suppresses unchanged-stock messages.

The personal watch now targets Dallas ZIP 75225 and store IDs R144, R042, and R746. The scheduler job title may retain its original San Antonio label; the deployed server configuration determines the actual target.
