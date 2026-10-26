# Monthly welcome handoff (prepared, not deployed)

Mack resources:
- Welcome flow: https://app.macknified.com/dashboard/flows/editor/7323
- Direct webhook welcome: flow 7323 (webhook URL must remain a secret; flow paused)
- Legacy intake 7324: inactive, webhook disabled, all actions removed
- Legacy tag automation 2157: retired and disabled; do not reactivate
- Verified tag: 1759

## Current blocker
A controlled setup email to the operator's info@rollflow.net failed:
Microsoft 365 returned 535 5.7.139, SmtpClientAuthentication is disabled for the Tenant.
Use a working, supported verified sender in Mack and confirm delivery before activation.

The billing-management website button already links directly to Stripe's hosted email login. This handoff adds only a transactional welcome email.

## Delivery behavior
Only a signature-verified LIVE checkout.session.completed with payment_status=paid or checkout.session.async_payment_succeeded is considered. The session must use subscription mode, a server-allowlisted monthly tier, and contain a subscription ID. The ledger must still show paid/active. Failed, refunded, one-time and renewal events do not initiate a welcome.

D1 tracks one delivery per subscription, with a lease for concurrent webhook handling. HTTP delivery failures return an error so Stripe can retry; an accepted Mack handoff is not a claim of email delivery.

The former tag automation triggered a loop-detection warning during setup testing. That chain is retired. Flow 7323 now has only Start -> Send Email, with no tag, field, pipeline or nested-flow actions. Flow 7324 is inactive with no actions and its webhook disabled. Automation 2157 stays disabled.

D1 deduplicates the server handoff per subscription; an HTTP acknowledgment means Mack accepted the handoff, not that an email arrived. Failed sends must be investigated in Mack before a deliberate manual retry. Do not bulk replay historical payments.

Only contact email/name are sent to Mack. Notes, wall consent and payment amounts are not forwarded. Public checkout code must never contain the private intake webhook.

## Activation after sender verification
1. Verify one setup email arrives at the operator's inbox.
2. Verify the direct webhook's contactEmail resolves to the intended recipient, and that duplicate Stripe delivery is suppressed by D1.
3. Apply monthly-welcome-migration.sql to the LIVE D1 database.
4. Store welcome flow 7323's private webhook URL as Worker secret MACK_MONTHLY_WEBHOOK_URL.
5. Deploy this worker.js to tipwheelz-live, preserving current bindings and secrets.
6. Activate direct welcome flow 7323. Leave automation 2157 and legacy intake 7324 disabled.
7. Check a controlled paid monthly checkout; do not create or charge a real payment without authorization.

The sandbox Worker is unchanged. Do not use the LIVE intake for sandbox events.

## Checks
node --test infra/tipwheelz-worker/*.test.mjs

17 tests pass, including checkout, authorization, webhook signatures, refund ordering, welcome eligibility, destination restrictions, retries, and deduplication. No live payment or end-to-end successful email delivery was performed.
