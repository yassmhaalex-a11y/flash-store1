# FLASH STORE V57.3 Beta
- Two-row desktop homepage header; removed redundant header actions; retained existing navigation and cart count IDs.
- Wishlist cards inherit FLASH STORE colors and typography; no default purple underlined links.
- Admin section notification badges for orders, reviews, low stock, game requests, and unread notifications, updated from the existing /api/admin polling response (every ~3s, not true push).
- Existing 2-second once-per-tab-session loader preserved.
- No SQL migrations or live deployment performed.
- Review alert classification is based on notification title/message; orders count pending/processing orders, not exclusively new orders. Check against production data before publishing.
