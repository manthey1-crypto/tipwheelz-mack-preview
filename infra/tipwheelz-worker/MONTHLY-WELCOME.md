# Monthly welcome handoff (prepared, not deployed)

Mack resources:
- Private verified-payment intake: flow 7324 (inactive; keep webhook URL secret)
- Email-only welcome: https://app.macknified.com/dashboard/flows/editor/7323 (inactive)
- Automation 2157: tag 1759 -> flow 7323 (disabled)
- No tag, field or pipeline mutations are allowed in the downstream welcome flow.

## Current blocker
A controlled setup email to the operator's info@rollflow.net failed:
Microsoft 365 returned 535 5.7.139, SmtpClientAuthentication is disabled for the Tenant.
Use a working, supported verified sender in Mack and confirm delivery before activation.

The billing-management website button already links directly to Stripe's hosted email login. This handoff adds only a transactional welcome email.

## Delivery behavior
Only a signature-verified LIVE checkout.session.completed with payment_status=paid or checkout.session.async_payment_succeeded is considered. The session must use subscription mode, a server-allowlisted monthly tier, and contain a subscription ID. The ledger must still show paid/active. Failed, refunded, one-time and renewal events do not initiate a welcome.

D1 tracks one delivery per subscription, with a lease for concurrent webhook handling. HTTP delivery failures return an error so Stripe can retry; an accepted Mack handoff is not a claim of email delivery.

The setup-test loop warning was addressed by removing all trigger-generating actions from welcome flow 7323. The one-way route is private payment intake7324 -> apply verified tag1759 -> automation2157 -> email-only flow7323 -> end. There are no downstream tag writes, field changes, pipeline updates, nested flow calls or webhooks that could feed back into the trigger.

D1 deduplicates the server handoff per subscription. An HTTP acknowledgment means Mack accepted the handoff, not that email arrived. Inspect Mack failed-run logs before a deliberate manual resend; do not bulk replay historical payments.

Only contact email/name are sent to Mack. Notes, wall consent and payment amounts are not forwarded. Public checkout code must never contain the private intake webhook.

## Activation after sender verification
1. Verify one setup email arrives at the operator's inbox.
2. Verify the automation's contactEmail resolves to the intended recipient, and that duplicate Stripe delivery is suppressed by D1.
3. Apply monthly-welcome-migration.sql to the LIVE D1 database.
4. Store intake flow 7324's private webhook URL as Worker secret MACK_MONTHLY_WEBHOOK_URL.
5. Deploy this worker.js to tipwheelz-live, preserving current bindings and secrets.
6. Activate intake7324 and welcome7323, then enable automation2157 only after sender delivery and single-contact tests pass.
7. Check a controlled paid monthly checkout; do not create or charge a real payment without authorization.

The sandbox Worker is unchanged. Do not use the LIVE intake for sandbox events.

## Checks
node --test infra/tipwheelz-worker/*.test.mjs

17 tests pass, including checkout, authorization, webhook signatures, refund ordering, welcome eligibility, destination restrictions, retries, and deduplication. No live payment or end-to-end successful email delivery was performed.
