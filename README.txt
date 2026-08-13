FLASH STORE V14

Fixes:
- Admin dashboard pages no longer return HTTP 404 on Vercel.
- All /api/* requests are routed through one Vercel function so public and admin API state stays together.
- Admin login remains working.
- Checkout close fix from V13 is preserved.

Deploy: upload the project contents to GitHub, then redeploy on Vercel.
Do not mix old api route files with this version.
