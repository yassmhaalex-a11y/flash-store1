# FLASH STORE V58 — Implementation audit

## Implemented in this revision
- Shared server-side coupon evaluator for preview and order creation. No client-supplied prices are trusted.
- Scope checks, percentage cap, min/max eligible totals, maximum uses, first-order and one-use-per-account checks.
- Checkout rejects invalid products, invalid options, excessive quantities and invalid prices instead of silently omitting items.
- Removed the internal request to a URL derived from the Host header when applying discounts.

## Remaining production blockers
- Discount usage counters and per-user redemption need **atomic database transaction / RPC** to prevent concurrent redemptions. Current checks are best-effort.
- Order creation and item insertion must be transactional to avoid orphan/partial orders.
- Review spam prevention/rate limiting and moderation protections.
- Full approved admin and checkout redesign is not complete; browser and Supabase end-to-end tests have not been run.
- Back up the database and test on staging; do not claim production readiness.

## Current search updates
- More consistent Unicode-aware case-insensitive matching.
- Accessible pagination buttons with current-page indicator.
- Results pagination scrolls to heading, not page top.
- Browser Back/Forward restores query state without reloading.

## Latest checkout/order fixes
- Checkout submit button now guards against rapid repeat clicks during proof upload and order submission.
- Order items are inserted as one batch instead of one HTTP request per item, reducing partial item writes and round trips.
- This does NOT provide transactional order creation or server-side idempotency; those still need database changes and staging tests.

## Checkout correctness pass (November 9)
- Cart quantity/removal invalidates coupon previews so the displayed total is not based on a stale cart.
- Editing coupon input invalidates previously applied discount; order submission only sends the code that was successfully previewed.
- Payment proof is checked client-side for image type and 10 MB size before upload; server must independently validate type/size.
- Revoke old image preview object URLs when selecting another proof.
- Syntax check passed (`node --check checkout.js`).

## Payment proof server hardening
- Multipart uploads now stop after 5 MiB of request data to avoid unbounded memory usage.
- Actual PNG/JPEG/WebP/GIF file signatures are checked, not only user-supplied MIME types.
- Generic server error messages prevent leaking internal storage errors to clients.
- The existing public proof storage bucket remains a privacy issue requiring a private-bucket and signed-access migration; not production ready.

## Payment proof URL validation pass
- Order submission now rejects external or malformed proof URLs; only this project's expected proof path is accepted.
- Uploaded proof extensions derive from validated MIME types, not client-supplied filenames.
- URL validation is **not** proof ownership: a private bucket and ownership checks remain required.

## Payment proof ownership receipt (November 9)
- Upload now returns a server-signed, one-hour receipt bound to the authenticated user and exact proof URL.
- Checkout sends the receipt and orders API validates it using timing-safe HMAC comparison.
- Prevents another customer from submitting an arbitrary existing proof URL without a valid receipt.
- **Still not private storage:** public bucket URLs remain exposed to anyone who obtains a link. Must migrate to a private bucket and signed admin/customer access before production.

## Proof reuse protection (November 9, continuation)
- POST /api/orders now checks whether the same uploaded proof has already been used.
- A retry by the same user returns the existing order number instead of creating another order; a different user receives a conflict.
- Added `V58_PROOF_REUSE_GUARD.sql` with a partial unique index for database-enforced concurrency protection. **Not deployed**: apply only after backup and checking historical duplicates on staging.
- This is not a substitute for a full transactional order/discount/stock RPC.

## Proof upload collision and overwrite hardening
- Proof filenames now use cryptographically random UUIDs, scoped by authenticated user ID, rather than timestamp and Math.random.
- Removed storage x-upsert so a colliding key cannot overwrite an existing proof.
- Static syntax check passed. Still requires private storage migration and end-to-end tests.

### Upload validation hardening (2026-11-09)
- Strengthened payment-proof image signature checks: PNG IHDR/IEND, JPEG SOI/EOI, GIF terminator, and WebP RIFF length/chunk markers.
- Moved authentication lookup inside the API error handler to avoid unhandled promise rejections on upstream auth outages.
- Verified JavaScript syntax with `node --check api/upload-proof.js`.
- **Outstanding:** Proof images still use a public storage bucket; private storage and authenticated admin viewing remain necessary. These checks do not establish that a file is a fully decoded, safe image.

## Private payment proof storage (2026-11-09)
- New uploads use a separate private `flash-payment-proofs` Supabase Storage bucket (service-role API only), not the public product-image bucket.
- Checkout stores a private object identifier and signed upload receipt; order creation checks user-bound path and receipt.
- Authenticated customer and admin order APIs generate short-lived (5 minute) signed viewing URLs.
- Historical public proof URLs are left intact for backwards compatibility; **they remain public until migrated**. Do not remove historical data blindly.
- Node syntax checks and local private path-validation tests passed. Live Supabase integration and permissions have NOT been tested; no deployment performed.

## Proof display resilience (2026-11-09)
- Private proof signing failures no longer fail the whole customer/admin order listing.
- A failed signature returns `null` instead of exposing a raw private storage object identifier.
- Legacy public proof links remain unchanged for compatibility and still need migration.
- Syntax checks passed for private-proof helper, admin API, and orders API.
- Live Supabase signing/permissions still require integration tests.

## Legacy proof URL output validation (2026-11-09)
- Hardened customer/admin proof link rendering: legacy proof URLs are only returned if they are valid same-origin Supabase public Storage URLs; arbitrary external URLs and unsafe URL schemes are rejected.
- Existing valid public Storage receipts still display, pending controlled migration to private Storage.
- Node syntax check and focused local URL-validation assertions passed.
- Live Supabase and end-to-end verification still outstanding.

## Checkout input bounds (2026-11-09)
- Added bounded discount-code and account-detail payload checks.
- Limited total cart quantity and rejected extreme or non-finite computed prices/totals.
- Bounded account credential field lengths before database insertion.
- `node --check api/orders.js` passed. These are static checks, not a production integration test.

## Proof object existence verification (2026-11-09)
- Checkout now verifies that a private proof object exists in Supabase Storage before creating an order; a valid HMAC receipt alone is insufficient.
- Missing objects get a user-facing re-upload message; Storage errors fail closed.
- JavaScript syntax checks passed. Live Supabase Storage endpoint behavior and end-to-end tests remain unverified.

## Discount target lookup hardening (2026-11-09)
- Changed discount target validation from fetching every product/category ID to querying only selected IDs, avoiding false rejection once the catalog exceeds the Supabase default row limit.
- Added bounds and deduplication for selected target IDs (maximum 100 submitted targets).
- `node --check api/admin.js` passed. Live Supabase behavior remains untested.

## Targeted cart/discount catalog queries (2026-11-09)
- Changed trusted cart item verification to fetch only the product IDs and option IDs referenced by the submitted cart, rather than relying on an unbounded `select('*')` subject to Supabase's default 1,000-row response cap.
- Changed category-scoped discount calculation to fetch category membership for the cart's products only, avoiding incorrect rejection in larger catalogs.
- Extended local integration test coverage to include category-scoped discounts.
- `node --check` and all four local test files passed. Live Supabase integration and concurrent order processing remain unverified.

## Admin Panel visual redesign (2026-11-09)
- Added v58-admin-redesign.css and v58-admin-redesign.js and wired into admin.html.
- Responsive dark Xbox-style styling across dashboard, tiles, forms, cards, stats, buttons and sections.
- Added keyboard-accessible section finder (Ctrl/Cmd+K), quick actions for Orders, Products and Discounts.
- Existing admin IDs, handlers, authentication, API routes and Supabase contracts unchanged.
- Local JavaScript syntax check passed; browser/API integration testing still required.
