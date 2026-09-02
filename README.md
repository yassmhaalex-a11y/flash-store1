# FLASH STORE V16 CLEAN

نسخة جديدة ونظيفة. لا نخلطها مع جداول V14/V15 القديمة.

## أهم الجديد
- FLASH STORE باللغة الإنجليزية.
- Categories + Products + Platforms.
- Featured Products.
- Newly Added Products (آخر 60 يوم).
- Search.
- Checkout.
- Vodafone Cash / Telda / InstaPay.
- بيانات العميل: Full Name / Phone / Email.
- رفع Payment Proof سيتم ربطه بالـ Storage في الخطوة التالية.
- Product options لدعم Xbox Home / Sign-in / New Account وغيرها.
- Discount targeting:
  1. All Products
  2. Selected Products
  3. Selected Categories

## نشتغل خطوة بخطوة
1. استخدم Supabase نظيف قدر الإمكان.
2. افتح SQL Editor.
3. الصق schema.sql بالكامل.
4. Run وانتظر Success.
5. في Vercel > Environment Variables أضف:
   SUPABASE_URL
   SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ADMIN_EMAIL
6. Redeploy.
7. افتح /api/health.
8. بعد نجاح Health نكمل Admin Panel وباقي الأنظمة.

ممنوع وضع SUPABASE_SERVICE_ROLE_KEY داخل ملفات public أو المتصفح.
