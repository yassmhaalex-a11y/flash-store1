# Flash Store

Digital gaming store built with React + Vite + Supabase.

## Run locally
1. Install Node.js 20+
2. `npm install`
3. Copy `.env.example` to `.env`
4. Put your Supabase URL and anon key in `.env`
5. `npm run dev`

## Deploy
Push the project to GitHub, import the repository into Vercel, and add the same two environment variables in Vercel.

## Admin
The admin route is `/admin`. For production, use the supplied Supabase RLS policies and replace the demo admin check with your preferred admin-role setup.

## Database
Run `supabase/schema.sql` in Supabase SQL Editor before using the live database.

The app falls back to demo data when Supabase variables are missing, so the UI can be previewed immediately.