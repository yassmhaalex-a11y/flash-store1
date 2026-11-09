# FLASH STORE V57.2 BETA
- First visit in browser tab: 2-second minimum logo loader; subsequent page navigation skips it (sessionStorage).
- Desktop: banner left, category list right. Mobile remains banner above categories.
- Desktop Wishlist link in navigation and drawer.
- Desktop cart icon with live cart count; removed duplicated account/cart links from desktop header.
- Ensured wishlist JavaScript is loaded on storefront/product pages (missing in V57.1).
- Recently Viewed renders from locally saved product history.
- No backend/database migrations. Test on Vercel Preview before production.
