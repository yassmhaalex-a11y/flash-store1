# FLASH STORE V45 — initial stabilization build

Based on V44. Changes:
- Home New Add list limited to 30 items.
- Store API fetch retries up to three times, with a 12-second per-attempt timeout; automatic retry after a failed load.
- Account lookup begins in parallel with store data fetch.
- Password recovery links use PUBLIC_SITE_URL when configured; otherwise the HTTPS request host, rejecting localhost.
- Removed plaintext customer password from the signup notification email payload.

Deployment: Set PUBLIC_SITE_URL=https://flash-store1.vercel.app in Vercel environment variables, or to your actual live HTTPS domain. Keep existing Supabase environment variables. No SQL migration needed for these changes.

Not yet implemented: reviews and ratings, order-game flow, advanced coupon conditions, new logo, comprehensive automated tests. Do not treat this ZIP as a finished implementation of all previously requested features.
