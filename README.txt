FLASH STORE V10
تشغيل:
npm install
npm start
ثم http://localhost:3000

Admin passwords: 2013 أو 2009

V10:
- إصلاح زر الثلاث شرط والقائمة الجانبية.
- تسجيل/إنشاء حساب، وبعد تسجيل الدخول يظهر Sign Out.
- الطلبات تتطلب تسجيل الدخول.
- أرقام الطلبات Order 1, Order 2... محفوظة على السيرفر.
- خصم مباشر على المنتج بدون كود من Admin > Products.
- أكواد خصم قابلة للإضافة والتعديل والتفعيل والإيقاف والحذف.
- الخصم النهائي يُحسب على السيرفر.


FLASH STORE V13
- Fixed checkout success modal close button (closeCheckout was missing).
- Fixed admin loading flow and added visible errors instead of blank admin pages.
- Admin Products/Categories now sync the admin data into the edit forms.
- Admin order status updates now URL-encode order IDs and return a clear error if an order is unavailable.
- Added seed-data rehydration for empty catalog instances on Vercel.
