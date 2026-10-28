# Pickup Watch — Stripe integration plan and review

Business: https://pickup-watch.vercel.app  
Service: US iPhone pickup availability lookup. Free checks target 15 minutes; Plus checks target two minutes while the visitor's tab is open. Plus costs **$2.99 USD/month**; owner access is free. Apple can throttle checks, and availability is not guaranteed.

## Source and setup status

The requested Claude installation command could not run because Claude Code is not installed. Stripe's MCP server was then registered with Codex and **OAuth authentication succeeded**. The tool was not attached to the current session's normal tool list, but it was reached directly through authenticated MCP, and **`stripe_implementation_planner` was successfully run** with the business context and existing implementation. Its decision tree was completed and returned **status: accepted**, recommending hosted Checkout for the web app. The official skills fallback was also installed and used to review billing/security details.

Chosen planner paths: web → code integration → redirect accepted → Stripe-hosted Checkout; flat-rate pricing; freemium with no card required for Free; Customer Portal with cancellation at period end; Stripe-native recovery recommendation. Sales-led quotes/contracts do not apply. Tax obligations/registrations were explicitly left unresolved rather than falsely selecting “no obligations.” No recovery emails or tax settings were enabled by this work. The plan's SDK implementation uses flexible subscription billing mode. Raw MCP outputs are retained in `docs/stripe-planner-guide.json` and `docs/stripe-planner-result.json`.

The supplied TEST key authenticated successfully. The setup script created/reused the Plus product and its monthly Price and configured a TEST billing portal. No charges, subscriptions, outgoing invoices, or payment emails were created. Local credentials are in Git-ignored `.env.local` with mode 0600. Production Vercel variables have not been changed. Rotate the test secret that was pasted in chat, then update local/Vercel secrets. Prefer an appropriately scoped restricted key for deployment.

## Product selection

| Stripe product | How Pickup Watch uses it |
| --- | --- |
| Payments | Stripe-hosted Checkout collects the initial subscription payment. Card information stays on Stripe. No custom payment form or standalone PaymentIntent is needed. |
| Billing | One Plus Product with a recurring $2.99 monthly Price; Stripe manages renewals and payment retries. Subscription lifecycle webhooks update entitlements. |
| Invoicing | Billing automatically creates subscription invoices. Stripe Customer Portal provides invoice history/PDFs and payment-method management; a scoped read-only invoices endpoint is also implemented. Do not create a second manual invoice for the same monthly subscription. |

Hosted Checkout does not require your publishable key in the browser. The key is saved only in local configuration for possible future Stripe.js use; the secret key always stays on the server. Dynamic payment methods remain enabled; no hardcoded `payment_method_types` allowlist is sent.

## Review and changes implemented

| Previous behavior | Updated behavior |
| --- | --- |
| Raw REST requests used the account default API version | Official Stripe SDK client, API `2026-09-30.endive`, bounded retries/timeouts |
| Checkout return page was the only activation path | Signature-verified webhooks fulfill paid Checkout sessions; the return page only activates a browser session after webhook fulfillment exists |
| No asynchronous payment handling | Completed/unpaid sessions do not grant access; asynchronous success fulfills and asynchronous failure records failure |
| No durable subscriber entitlement record | Redis stores subscription state, fulfilled session records, risk holds and processed event markers |
| Subscription cancellation was checked only during requests | Subscription/invoice events synchronize current Stripe state; access reads durable records |
| Inactive customers could lose their management link | Signed subscriber sessions retain portal and invoice access even after losing Plus |
| Checkout retries could create additional sessions | Stripe idempotency keys tied to signed checkout nonces, plus the required integration identifier |
| No dispute/refund/fraud handling | Version-correct PaymentIntent → InvoicePayment → Invoice → Subscription mapping; review records for all three risk events; disputes/full refunds put the affected app subscription on hold |
| Portal depended on the account's default configuration | Explicit test portal configuration includes cancellation at period end, invoice history and payment-method updates |
| Checkout enabled with only API key/price | Paid checkout also requires durable storage and a webhook signing secret |

Webhook replay handling is idempotent for record updates: successfully processed event IDs are recorded after processing. Processing errors return 500 so Stripe retries. Current subscriptions are retrieved during event handling rather than trusting out-of-order event snapshots. A refund/dispute review hold is separate from normal lifecycle state and is not silently cleared by a later invoice event. Early fraud warnings and partial refunds create review records without automatically canceling, refunding or messaging anyone.

## Required deployment setup

1. Commit and deploy this updated repository through your GitHub/Vercel project.
2. Set Vercel **sensitive server-side variables**: `STRIPE_SECRET_KEY`, `STRIPE_PLUS_PRICE_ID`, `STRIPE_PORTAL_CONFIGURATION_ID`, `SESSION_SECRET`, `OWNER_ACCESS_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. `SITE_URL` must be `https://pickup-watch.vercel.app` for production. Values are never committed. Use separate test and live resources.
3. In Stripe test mode, register `https://pickup-watch.vercel.app/api/stripe-webhook` with API version `2026-09-30.endive` and these events:
   - `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`
   - `invoice.paid`, `invoice.payment_failed`, `invoice.finalization_failed`
   - `charge.dispute.created`, `charge.refunded`, `radar.early_fraud_warning.created`
4. Put that endpoint's signing secret in `STRIPE_WEBHOOK_SECRET`, then redeploy. It is separate from the secret API key and the local Stripe CLI signing secret.
5. For localhost, keep `SITE_URL=http://127.0.0.1:8767`. `npm run dev` loads the ignored `.env.local`. Run `npx stripe listen --forward-to http://127.0.0.1:8767/api/stripe-webhook`, complete its Stripe authentication, and put its local webhook secret in `.env.local`. Configure durable Redis storage for local webhook tests too. Restart the dev server after changing settings.
6. Run a test-mode checkout with a Stripe test payment method; verify paid webhook delivery, Plus activation, invoice visibility and portal cancellation. Then test failed/delayed payments, duplicate events, full refunds and dispute holds. The code tests use mocks and generated valid signatures; they do not replace an account-level checkout test.
7. Keep using the free owner-code flow for yourself. It does not create a Stripe customer, invoice or subscription.

## Remaining launch requirements / suggested improvements

- **Customer identity and recovery:** access is browser-bound. Add account sign-in and recovery that maps an app user to a Stripe Customer/Subscription before selling recurring subscriptions broadly. Cookies alone cannot restore access across devices or after clearing browser data. Webhook fulfillment is now durable, but login/recovery is still required to associate a new browser with an existing customer safely.
- **Operations:** build a small owner-only review screen/alert process for `review:*` and `risk:*` records; decide a documented policy for resolving holds. No third-party messages are sent by the current integration. Watch failed webhook deliveries in Stripe Workbench.
- **Idempotency/retention:** records have explicit retention (processed events seven days, billing records 400 days). Adjust retention to your support/data policy and use a durable database rather than cache eviction for larger-scale subscription records.
- **Pricing disclosure:** two-minute checks are a target, not guaranteed restocks. Keep the recurring price, cancellation terms and Apple-throttling disclosure visible before Checkout.
- **Tax:** assess tax obligations before live sales. Read Stripe Tax guidance and confirm applicable active registrations before enabling automatic tax; simply enabling it without registrations is insufficient. This change does not enable automatic tax or create registrations.
- **Go live:** rotate the disclosed test key; replace with separate live product/price/portal/webhook resources only after testing. No live account resources or charges were created in this work.

## References

- [Official MCP setup](https://docs.stripe.com/mcp)
- [Stripe-hosted subscription Checkout](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Subscription webhooks and risk events](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [Subscription invoicing](https://docs.stripe.com/billing/invoices/subscription)
- [Tax for recurring payments](https://docs.stripe.com/billing/taxes/collect-taxes)
