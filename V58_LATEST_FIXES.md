# V58 additional reliability fixes (2026-11-09)

- Order-created email delivery is best effort. An email outage no longer returns HTTP 500 after an order has already been saved, reducing accidental customer retries and duplicates.
- Order and review API errors no longer expose internal database errors to customers; server logs retain the diagnostic details.

## Still blocking production
- Atomic order + item creation and discount redemption in a database transaction.
- End-to-end testing with a staging Supabase project and real Vercel deployment.
- Completion and validation of all approved UI features.
