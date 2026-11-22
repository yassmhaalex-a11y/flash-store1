-- FLASH STORE V61: safe, additive rewards foundation.
-- Run once in Supabase SQL Editor AFTER backing up the database.
-- No changes to checkout, payments, existing orders or email triggers.
CREATE TABLE IF NOT EXISTS public.flash_points_rules (
 product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
 multiplier numeric(5,2) NOT NULL DEFAULT 1 CHECK (multiplier >= 0 AND multiplier <= 1),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.flash_points_ledger (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL,
 order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
 event_type text NOT NULL CHECK (event_type IN ('earned','reversed')),
 points integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_id,event_type)
);
CREATE INDEX IF NOT EXISTS flash_points_ledger_user_idx ON public.flash_points_ledger(user_id,created_at DESC);
ALTER TABLE public.flash_points_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_points_ledger ENABLE ROW LEVEL SECURITY;
-- No browser access to reward tables; access only through trusted server API.
REVOKE ALL ON public.flash_points_rules FROM anon, authenticated;
REVOKE ALL ON public.flash_points_ledger FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.flash_points_on_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_points integer; v_awarded integer;
BEGIN
 IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
 IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
   SELECT COALESCE(SUM(
     LEAST(200, FLOOR(GREATEST(0, COALESCE(oi.unit_price,0)) / 10 * COALESCE(r.multiplier,1))::integer)
     * GREATEST(0,COALESCE(oi.quantity,1))
   ),0)::integer INTO v_points
   FROM public.order_items oi
   LEFT JOIN public.flash_points_rules r ON r.product_id = oi.product_id
   WHERE oi.order_id=NEW.id;
   IF v_points>0 THEN
     INSERT INTO public.flash_points_ledger(user_id,order_id,event_type,points)
     VALUES(NEW.user_id,NEW.id,'earned',v_points)
     ON CONFLICT(order_id,event_type) DO NOTHING;
   END IF;
 ELSIF NEW.status IN ('canceled','cancelled') AND OLD.status = 'completed' THEN
   SELECT points INTO v_awarded FROM public.flash_points_ledger
   WHERE order_id=NEW.id AND event_type='earned';
   IF COALESCE(v_awarded,0)>0 THEN
     INSERT INTO public.flash_points_ledger(user_id,order_id,event_type,points)
     VALUES(NEW.user_id,NEW.id,'reversed',-v_awarded)
     ON CONFLICT(order_id,event_type) DO NOTHING;
   END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS flash_points_order_status ON public.orders;
CREATE TRIGGER flash_points_order_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.flash_points_on_order_status();
-- No backfill: old orders are not awarded points retroactively.
