# FLASH STORE V57.4 — Consolidated development build

This archive includes the full V57.3 project and all V57.4 changes currently implemented in the working tree.

Included: My Orders filters/timeline/mobile refinements; search redesign with live filtering, sorting, category filters, pagination, retry on network error, keyboard focus styling; public reviews auto-publish; read-only admin dashboard cards; checkout and admin visual refresh.

**Not yet complete:** full redesign of every admin section, advanced discount rules, guest order tracking, production performance testing and end-to-end checkout verification. Existing customer sign-in requirement remains unchanged.

**Do not deploy to production without:** staging test; Supabase backup; order/payment/discount/review/stock tests; admin access checks. No live database changes were made. Never put service-role keys in public JS.
