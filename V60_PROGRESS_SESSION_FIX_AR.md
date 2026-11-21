# FLASH STORE V60 — session consistency fix

- Updated `lib/customer-auth.js` to refresh expired Supabase access tokens using the HttpOnly refresh cookie on authenticated Review and Game Request endpoints.
- Updated both endpoints to pass the response object so refreshed cookies can be returned.
- Updated `/api/auth` to clear invalid cookies on rejected refresh tokens.
- Password recovery now clears the non-refreshable recovery session and directs users to sign in again.

## Remaining before production
- Account email flows (welcome, verification, sign-in alert, reset) are NOT implemented to the agreed design. Current signup still immediately confirms emails; this requires a coordinated auth-flow redesign and Supabase email template configuration.
- Test concurrent refresh requests, cookie behavior, actual Supabase credentials, deployed Vercel environment and Google Apps Script worker.
- Review RLS, transactional email reliability and security before publishing.
- This archive is NOT the final deploy-ready V60 release.
