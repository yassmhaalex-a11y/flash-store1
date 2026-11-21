FLASH STORE V57 BETA — PREVIEW ONLY

Changes:
- Premium Gaming + Modern Clean homepage; Categories LEFT of banner on desktop and BELOW banner on mobile.
- Premium product detail layout, responsive option cards Home/Sign/Full (or options configured in Admin).
- 3-step Checkout (Details, Payment, Review) using original checkout API, payment proof and discount functionality.
- New transparent logo used ONLY for favicon and loading overlay, not site header.
- Loading overlay for actual page loads, no forced 5-second delay.
- Admin unread notification count next to title, retaining existing notification polling and management dashboard.

IMPORTANT: Deploy to Vercel Preview branch first. Do NOT overwrite production. The original order and email APIs remain unchanged. Test payment proof, discount, product stock, and admin alerts in Preview before going live.
Rollback: redeploy FLASH_STORE_V55_DEPLOY_FIX.zip or existing production commit.
