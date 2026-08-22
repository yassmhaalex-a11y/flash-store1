# FLASH STORE — Ready for GitHub + Vercel

## What this version does

- Professional dark gaming storefront branded as **Flash Store**
- Dynamic categories and platforms
- Dynamic hero banners
- Featured Products carousel (10-second auto movement)
- Newly Added Products = last 60 days automatically
- Product variants (New Account / Shared Account / any name you create)
- Cart + checkout
- Customer sign up / sign in with Supabase Auth
- Admin-only `/admin`
- Admin CRUD for:
  - Products
  - Product variants
  - Categories
  - Platforms
  - Hero banners
  - Order status
- Orders are stored in Supabase
- Optional WhatsApp Business notification for new orders

## Payment behavior — exactly as requested

The customer **does not pay inside the website**.

At checkout the customer:
1. Enters full name.
2. Enters phone number.
3. Chooses one payment method:
   - Vodafone Cash
   - Telda
   - InstaPay
4. Clicks **Confirm Order**.
5. Flash Store creates an order number and shows it.
6. You contact the customer and tell them where/how to pay.
7. After you receive the money, you change the order status from the Admin Panel.

The website never says that a transfer was verified automatically.

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Copy `.env.example` to `.env.local`.
5. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Run:
```bash
npm install
npm run dev
```
7. Create your own customer account at `/auth`.
8. Promote it to admin in Supabase SQL Editor:
```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_EMAIL';
```
9. Open `/admin`.

## WhatsApp

If you want a new order notification on your WhatsApp Business number, configure the official WhatsApp Cloud API values in `.env.local`:

```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ADMIN_TO=
WHATSAPP_API_VERSION=v23.0
```

This is optional. The store works without WhatsApp too.

## Vercel

Push the project to GitHub → import the repo in Vercel → add the same environment variables → Deploy.

## Before going live

Replace demo/default categories with your real store categories and add real product/banners from `/admin`.

Do not put any Supabase service-role key in frontend environment variables.
