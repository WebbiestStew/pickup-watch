# Pickup Watch Texas

A free iPhone Duo pickup checker for all 17 Texas Apple Stores. Choose storage, color, and carrier, then enter a Texas ZIP code. Purchases happen on Apple’s website.

Checks refresh about every two minutes while the tab is open. Shared caching and a global throttle reduce requests; Apple blocks trigger longer cooldowns with a countdown. Unchecked and stale stock stays unconfirmed. No accounts, subscriptions, payments, or Stripe integration.

## Development

Run `npm ci`, `npm run build`, `npm test`, then `npm run dev`. Preview: http://127.0.0.1:8767.

## Deployment

Push main to the connected GitHub repository to deploy on Vercel. Keep the free Upstash database connected for shared caching. The app accepts `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or the equivalent `UPSTASH_REDIS_REST_*` names). Only `SITE_URL` is used for public configuration. Keep credentials in ignored local env files and Vercel secrets.

`/api/catalog` returns Texas stores and all 32 phone configurations; `/api/health` reports 17 stores. `/api/availability?zip=77002` checks nearby Texas stock.
