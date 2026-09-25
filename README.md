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

## V36 — Mobile + Email + Password Reset

### Vercel Environment Variables
Set these in Vercel Project Settings → Environment Variables:

- `ADMIN_EMAIL` — the email address that should receive FLASH STORE admin alerts for new accounts and new orders.
- `RESEND_API_KEY` — Resend API key used for transactional emails.
- `EMAIL_FROM` — sender shown to customers/admin, for example `FLASH STORE <no-reply@your-domain.com>`.

The existing Supabase variables remain required:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`.

### Password reset redirect
In Supabase Dashboard → Authentication → URL Configuration, add:
`https://flash-store1.vercel.app/reset-password.html`

The forgot-password email now redirects to the production reset page instead of localhost. The reset page updates the password and signs the user in.

### Email behavior
- New customer signup → admin email alert + Admin Panel notification.
- New order → admin email alert + customer order-received email + Admin Panel notification.
- Order status `Processing`, `Completed`, `Cancelled`, or `Paid` → customer status email.
- Email subjects and sender use FLASH STORE branding.

For a custom sender address, verify your sending domain in Resend first. If using Resend's test sender, delivery is limited by Resend's test-domain rules.


V37: Admin Panel Store Settings now includes the notification email for new orders and new customer accounts. Run SUPABASE_V37.sql once.
