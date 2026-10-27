# Monthly welcome handoff

The LIVE Worker sends verified initial paid monthly checkout events to a private Mack intake. Stripe remains the payment source of truth. The billing-management website button separately uses Stripe's hosted email login.

## Mack configuration

- Intake flow7324 applies verified tag1759, then stops.
- Automation2157 starts email-only welcome7323, which sends using the operator's SMTP sender, then ends.
- No tag/field/pipeline mutations, nested flow starts or outgoing webhooks are permitted in welcome7323. This prevents the earlier automation loop.
- Mack tags also suppress repeated welcomes to an already-tagged contact. A returning contact with a new subscription may need a deliberate manual welcome.

## Worker configuration

Apply monthly-welcome-migration.sql to LIVE D1 and store the private intake URL as MACK_MONTHLY_WEBHOOK_URL. Never commit it or expose it in browser code. Deploy worker.js through Cloudflare's content-only endpoint, preserving bindings and secrets including the $15 one-time price.

Only signature-verified LIVE checkout.session.completed with payment_status=paid or checkout.session.async_payment_succeeded can initiate a handoff. Session mode, monthly tier and subscription ID must match; the ledger must remain paid/active. Tips, unpaid sessions, renewals and sandbox events do not send welcomes.

D1 tracks handoffs by subscription with an atomic lease. Accepted handoffs are skipped on duplicate delivery. HTTP failures remain pending and return an error so Stripe retries. A timeout after Mack accepted a request is ambiguous: inspect execution history before manual replay. Only email/name are forwarded; never notes, amounts or wall consent. Do not bulk replay historical payments.

## Validation

Run `node --test infra/tipwheelz-worker/*.test.mjs` (18 tests). Coverage includes signed LIVE webhook handoffs using SQLite, duplicate events, delayed success, failed delivery retry, renewal/tip/unpaid exclusions, sandbox separation, authorization, refunds and wall privacy.

Deployment verification on 2026-10-26: SMTP send accepted from info@rollflow.net; private intake returned completed for operator address blain@rollflow.net; automation2157 recorded one new successful execution. No real charge was created. Inbox arrival and a real paid checkout remain separate from these checks.

## Operations

Activate flows7324/7323 and automation2157. Inspect Mack failures if an email is missing; HTTP acceptance does not guarantee inbox delivery. Disable automation2157 to pause sending. Remove MACK_MONTHLY_WEBHOOK_URL to disable handoffs without changing checkout. Keep the tracking table for deduplication/audit. Sandbox remains unchanged.
