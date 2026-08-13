FLASH STORE V15
================

What is new
------------
- English is the default site language.
- Supabase persistence for products, categories, users, orders, discounts and settings.
- Product Options / Variants: each product can have any number of options with name, price, old price and image.
- Product homepage controls: Discounts, Flash Offers and Best Sellers.
- Search across product name, category and description.
- Vodafone Cash payment method added beside InstaPay and Telda.
- Discount codes can be limited to one use per account, first order only, and/or a maximum number of uses.
- Orders keep the existing statuses and admin controls: New, Contacted, Paid, Done, Cancelled.

Vercel Environment Variables
----------------------------
Add these to Production (and Preview if you want):

SUPABASE_URL=your Supabase API URL
SUPABASE_SERVICE_ROLE_KEY=your Supabase secret/service-role key
ADMIN_PASSWORD=your admin password (optional; default is 2013)
FLASH_SECRET=a long random secret (optional but recommended)

IMPORTANT: SUPABASE_SERVICE_ROLE_KEY is server-only. Never put it in public/index.html or any NEXT_PUBLIC variable.

Supabase setup
--------------
1. Open Supabase -> SQL Editor.
2. Run supabase_v15.sql once.
3. In Vercel -> Settings -> Environment Variables add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
4. Redeploy.

The V15 API uses the service-role key only on the server so the admin can save data while public users only read active catalog/settings through the application API.

Local run
---------
Node 24 recommended.
Set the same environment variables, then:
  npm install
  npm start

Notes
-----
- Product/option images are stored as data URLs for this V15 starter. Keep images reasonably compressed. For a larger store, migrate images to Supabase Storage later.
- The old JSON files are kept in data/ as backup/seed reference; V15 runtime uses Supabase.
