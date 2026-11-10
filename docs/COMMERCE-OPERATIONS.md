# Commerce implementation — 6 November 2026

The client confirmed Business Central and online payment at launch, with optional bespoke quotes for any basket. This update supersedes the quote-only launch assumption in the 5 November notes. Payfast is a provisional adapter, not a client-approved provider. The current public publication remains a review site: checkout, live intake and indexing are disabled.

## Implemented

- Exact SKU catalogue fields, inclusive ZAR prices, BC item IDs and approved online stock allocations. Public APIs omit internal BC identifiers and allocation values.
- Basket-to-checkout with contact/delivery details, consent, server-calculated totals, fixed delivery charge for approved provinces, order review, hosted Payfast handoff and private order-status retrieval.
- Optional bespoke quotes for single, multiple or unlisted items; bespoke configuration notes require a quote instead of online purchase.
- Durable orders, item reservations, verified payment ledger, payment exception states and Business Central delivery jobs. Four new tables in migrations 0002/0003.
- Payfast ITN verification: published source IP ranges, merchant/mode/order identity, signature, exact amount and remote provider validation. A browser redirect never marks an order paid. No card data is handled by this website.
- Business Central Online API v2.0 integration using Entra application authentication. Verified payments create draft sales orders against the approved web customer. Quote enquiries create draft sales quotes with request context as comment lines, without issuing an offer.
- Staff order/payment view, fulfilment updates after verified payment and successful BC delivery, and controlled retries with read-first recovery after uncertain writes.
- Same-origin writes, role checks, bounded input, rate-limited checkout, server-only credentials, private status tokens, secure headers, audit history and backup/restore coverage.

## Configuration and test sequence

1. Confirm Business Central Online versus on-premises, company, environment and tenant. This adapter targets Online; on-premises needs a separately agreed endpoint/authentication design. Authorise the Entra application in BC with only required item-read and sales-document permissions. Use the hosting secret store for values listed in `.env.example`.
2. Select the approved existing website customer in BC, configured for ZAR and VAT-inclusive sales documents. Supply exact item GUID/SKU mappings and the delivery service item. Verify address/tax/posting rules with the client's BC partner. Orders are not posted, invoiced or shipped automatically.
3. Obtain approved product/variant images, inclusive prices, VAT basis and stock allocations. Each sellable record must be an exact product, published, marked available to order and enabled for buying.
4. Confirm the payment provider. For Payfast, configure merchant ID, merchant key, a strong matching passphrase and live/sandbox mode using secrets. Configure the exact HTTPS COMMERCE_ORIGIN. Callback is `/api/payments/payfast`. Recheck the provider's current notification IP ranges before activation; the list is fail-closed and requires maintenance.
5. Run provider sandbox integration tests against an isolated deployment/harness with test data, then an agreed live readiness transaction. Public checkout deliberately requires live mode and all launch controls. The automated tests use injected fake APIs and do not replace these real provider/BC tests.
6. Publish client-approved sales, delivery, returns, warranty and refund terms on `/shop-sales-terms/`; replace its review placeholder. Publish approved privacy details and order/accounting retention. Set flat inclusive delivery price and supported provinces. Confirm monitored inbox and operational owners.
7. Verify the hosted owner's management login. Set intake/privacy controls, then commerce terms/stock/connection approval checkboxes. Enable checkout only after the preceding tests pass. No credentials or controls have been enabled by this update.
8. Coordinate domain/DNS/HTTPS, retain existing email records, then set the final COMMERCE_ORIGIN. Test final-domain callbacks and redirects before indexing or announcing launch.

## Stock and operational semantics

`onlineAllocation` is a cumulative website quota, not live BC available-to-promise stock. Active unpaid checkouts hold units for 30 minutes; paid, fulfilled and payment-review orders continue to consume allocation. Set a quota of 10, sell 3, and 7 remain available. Raise the quota only for approved replenishment; never blindly overwrite it with current inventory. Each checkout also checks BC item number/type/blocking and inventory. An allocation dedicated to the website is essential because other BC sales channels are not reserved transactionally by this application.

A late verified payment is retained as `paid_review`; stock may have been reallocated, so fulfilment is blocked. Multiple genuine payments for one order are all recorded and require reconciliation. Staff must check Payfast and BC before refunding or creating an authorised replacement order. There is no automatic refund, payment journal posting or automated inventory import. Payment-review resolution and accounting reconciliation remain manual operations for the client/BC partner; do not edit records or retry payment blindly.

A failed BC job can be retried from management. An uncertain create is looked up by the unique website reference and line sequence before further writes. If a prior write cannot be found, it stays blocked for investigation rather than creating a duplicate. Differences in quantities, unit prices, tax-inclusive configuration or final totals stop delivery. Inspect BC and resolve with the integration operator; do not post a mismatched draft.

An accepted payment is persisted together with a durable outbound job before acknowledgment. Jobs run after the request and remain visible for manual retry if delivery fails. Staff must monitor the queue; automatic scheduled retries/alert emails are not configured. Customer confirmation currently appears on the private order-status page. Transactional email/SMS requires an approved sending provider and message templates before it can be promised to customers.

Quote retention follows configured enquiry retention. Order/payment records are excluded from enquiry purges; the client's accounting retention and erasure policy must be implemented/approved before live intake. Backups contain personal information and order-access token hashes; restrict access. Restore disables checkout/intake/indexing and marks in-flight jobs uncertain. Validate restore in staging, reconcile financial records, then re-enable deliberately.

## Verified in this update

51 automated domain/catalogue/commerce checks passed, including atomic stock reservations, changed catalogue, tampered totals, access denial, duplicate/late notifications, failed provider validation, uncertain BC writes, VAT total mismatch and fulfilment gating. TypeScript and generated-page validation passed. The 6 November production dependency audit reported zero known vulnerabilities. These are implementation checks, not a penetration test or proof of production readiness. Real merchant/BC tests remain dependent on client access.

## Primary references

- [Microsoft: service-to-service Business Central authentication](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/administration/automation-apis-using-s2s-authentication)
- [Microsoft: sales order resource](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/resources/dynamics_salesorder)
- [Microsoft: sales quote resource](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/resources/dynamics_salesquote)
- [Payfast developer documentation](https://developers.payfast.co.za/docs)
