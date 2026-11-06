# FLASH STORE V48

- Product form draft is stored in browser sessionStorage and restored after reload; image files must be reselected.
- Automatic admin polling no longer rerenders form while it is being edited.
- Coupon creation now selects one or more eligible products/categories, and saves relationships to existing discount_products / discount_categories tables.
- The checkout discount API continues to calculate only eligible items and rejects codes that apply to none of the cart.
- No new SQL migration is required if the original discount link tables already exist.
- Test in a preview deployment before promoting to production.
