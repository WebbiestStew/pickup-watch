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
