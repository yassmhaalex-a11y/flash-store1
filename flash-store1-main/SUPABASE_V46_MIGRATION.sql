-- Run only if V45 tables already exist. Safe to run more than once.
ALTER TABLE public.store_features ADD COLUMN IF NOT EXISTS stars_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.store_features ADD COLUMN IF NOT EXISTS game_popup_enabled boolean NOT NULL DEFAULT true;
