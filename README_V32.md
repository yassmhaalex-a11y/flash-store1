# FLASH STORE V32

Built from the working FLASH STORE V31 package.

## Added
- Product-level **Require Email + Password** switch.
- Checkout requires customer **Sign In** before ordering.
- Mandatory **Payment Proof** upload for every order.
- Cart quantity controls and remove buttons.
- New customer and new order **Admin Notifications** with unread badge and polling.
- New accounts are created as **client** by default; admin role can be assigned from Admin Panel.
- Hero banner can target a specific product and supports editable text overlay, product price/category display, BUY NOW button and overlay position.
- Admin-configurable Support title/text and WhatsApp number; Support button opens WhatsApp.
- Custom styled delete/role confirmation modal in Admin Panel.
- Order list shows payment proof and product account credentials when required.

## Supabase update
Run `schema_updates_v32.sql` in the existing Supabase SQL Editor before deploying this version.

Do not paste service-role keys into source files.
