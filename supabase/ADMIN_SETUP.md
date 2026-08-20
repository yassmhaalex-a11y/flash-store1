# Create your first admin

1. Create a normal account from `/account`.
2. In Supabase Dashboard → Authentication → Users, copy that user's UUID.
3. Run this SQL in SQL Editor:

insert into public.admin_users (user_id, role)
values ('YOUR-AUTH-USER-UUID', 'admin');

The admin panel is at:
`/admin`

For a production launch, keep the admin RLS policies enabled and never expose a Supabase service-role key in the frontend.