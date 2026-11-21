# FLASH STORE V46
- Fixed a JavaScript ReferenceError (`r is not defined`) that prevented homepage products from rendering even when API succeeded.
- Public store API tolerates missing optional tables, but reports failure if essential categories/products cannot be read.
- Added a 5-star header rating derived from approved 1–10 customer reviews; no fabricated rating.
- Added dismissible Order Game promotional popup, dismissed for the current browser tab session.
- Added separate Reviews and Game Requests tabs in Admin, plus star/popup toggles.
- Run SUPABASE_V46_MIGRATION.sql once to enable the two new admin toggles.
- ZIP is a clean full repository snapshot: replace repository contents, do not just upload over old files.
- Deployment and database connectivity cannot be validated offline.
