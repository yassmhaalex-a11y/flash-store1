-- Run once in Supabase SQL Editor before deploying V53.
ALTER TABLE public.store_features ADD COLUMN IF NOT EXISTS rating_stars numeric(2,1) NOT NULL DEFAULT 2.5;
UPDATE public.store_features SET rating_stars = 2.5 WHERE rating_stars IS NULL;
