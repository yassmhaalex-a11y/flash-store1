# FLASH STORE V60 — implementation progress

Implemented in this package:
- Supabase refresh-token cookie and automatic renewal through /api/me, with browser periodic session refresh.
- Signed-in-only game request submission, using server-verified account name/email.
- New English Xbox game request page, account type/edition, sign-in gate and Thank You state.
- Signed-in-only review submission.

Not yet implemented: all ten redesigned customer emails, game request confirmation email, admin delivery instructions manager, account delivery security page, cancellation reason workflow, full regression tests against a deployed Supabase project.

IMPORTANT: Existing sign-in sessions that predate V60 have no refresh cookie and may require a one-time sign-in. Refresh sessions are subject to Supabase refresh-token policies. Deploy and test on staging first. No SQL migration required for the features in this interim build.
