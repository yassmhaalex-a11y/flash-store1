FLASH STORE V47
- Fix REST Supabase query builder .limit() missing method, which caused Reviews API failure.
- Initial header stars are 2.5/5 as a display baseline; weighted display changes with published reviews. This is not a real customer rating until reviews exist.
- Review submission success message appears after successful POST.
- FLASH STORE uploaded logo added as favicon and touch icon.
- No database migration required beyond V46 schema.
- Do not delete lib helper files. Test review GET/POST, admin approval and storefront on a preview deployment first.
