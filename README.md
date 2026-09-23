# FLASH STORE V30

This version restores the working homepage hero and adds:
- Hero banners with automatic rotation and product-page BUY NOW links.
- Real category pages (`/category.html?id=...`).
- Real product pages (`/product.html?id=...`).
- Multiple product gallery images from Admin.
- Multiple product types/options (Home, Sign, New Account, etc.) with individual prices.
- Mobile-first product/category layouts.

## Database update
Run this once in Supabase SQL Editor if the existing `products` table does not have the gallery column:

```sql
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;
```

Keep the existing Vercel environment variables. The `SUPABASE_SERVICE_ROLE_KEY` remains server-side only.
