# FLASH STORE V50 — SEO Edition

Built on V49, preserving existing API, admin, reviews and cart code.

## What changed
- Arabic/English search-friendly page titles and descriptions
- Organization, WebSite and WebPage JSON-LD on homepage
- Open Graph and Twitter metadata and existing store logo
- Canonical URLs, robots.txt and sitemap.xml for crawlable public pages
- Query-based product/category/search pages set to noindex until dedicated server-rendered URLs exist; prevents thin/duplicate URL indexing.

## Publish safely
1. Back up current repository and Supabase before replacing files.
2. Upload extracted V50 contents to the same repository root; overwrite matching files, do not duplicate directories.
3. Verify Vercel deployment, homepage, cart, admin and API before promoting to production.
4. Check https://flash-store1.vercel.app/sitemap.xml and /robots.txt. Submit sitemap.xml in Google Search Console (not repeatedly).
5. Test structured data with Google Rich Results Test and check URL inspection over coming weeks.

## Limits
Google decides ranking and indexing. Static product pages depend on JavaScript/query strings; to rank individual products, build unique server-rendered product URLs with real canonical tags and dynamically generated sitemap entries. Do not claim guaranteed first-page ranking.
