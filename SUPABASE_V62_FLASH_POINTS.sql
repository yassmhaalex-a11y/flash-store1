-- FLASH STORE V62: run after V61. Back up database first.
-- Redeeming is OFF by default until you test and enable it in Rewards Management.
CREATE TABLE IF NOT EXISTS public.flash_points_settings (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id=1),
 enabled boolean NOT NULL DEFAULT false,
 min_product_price numeric(12,2) NOT NULL DEFAULT 100 CHECK(min_product_price>=0),
 max_discount_per_unit numeric(12,2) NOT NULL DEFAULT 20 CHECK(max_discount_per_unit>=0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.flash_points_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.flash_points_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.flash_points_settings FROM anon, authenticated;
ALTER TABLE public.flash_points_rules ADD COLUMN IF NOT EXISTS redeem_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.flash_points_ledger DROP CONSTRAINT IF EXISTS flash_points_ledger_event_type_check;
ALTER TABLE public.flash_points_ledger ADD CONSTRAINT flash_points_ledger_event_type_check
 CHECK(event_type IN ('earned','reversed','spent','refunded'));
-- Signed ledger rows are immutable to the browser (V61 RLS remains enabled).
CREATE OR REPLACE FUNCTION public.flash_redeem_points(p_order_id uuid,p_user_id uuid,p_points integer)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_order public.orders%ROWTYPE; v_balance integer; v_cap numeric; v_amount numeric; v_enabled boolean; v_min numeric; v_unitcap numeric;
BEGIN
 IF p_points<=0 OR p_points%20<> 0 THEN RAISE EXCEPTION 'Points must be a positive multiple of 20'; END IF;
 -- Serialize redemption per user across concurrent orders.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 SELECT * INTO v_order FROM public.orders WHERE id=p_order_id AND user_id=p_user_id FOR UPDATE;
 IF NOT FOUND OR v_order.status<>'pending' THEN RAISE EXCEPTION 'Order not eligible'; END IF;
 IF COALESCE(v_order.discount_code,'')<>'' OR COALESCE(v_order.discount_amount,0)>0 THEN RAISE EXCEPTION 'Cannot combine points with another discount'; END IF;
 IF EXISTS(SELECT 1 FROM public.flash_points_ledger WHERE order_id=p_order_id AND event_type='spent') THEN RAISE EXCEPTION 'Points already redeemed on this order'; END IF;
 SELECT enabled,min_product_price,max_discount_per_unit INTO v_enabled,v_min,v_unitcap FROM public.flash_points_settings WHERE id=1;
 IF NOT COALESCE(v_enabled,false) THEN RAISE EXCEPTION 'Point redemption is disabled'; END IF;
 SELECT COALESCE(SUM(points),0) INTO v_balance FROM public.flash_points_ledger WHERE user_id=p_user_id;
 IF v_balance<p_points THEN RAISE EXCEPTION 'Not enough FLASH POINTS'; END IF;
 SELECT COALESCE(SUM(LEAST(oi.unit_price*oi.quantity,v_unitcap*oi.quantity)),0) INTO v_cap
 FROM public.order_items oi LEFT JOIN public.flash_points_rules r ON r.product_id=oi.product_id
 WHERE oi.order_id=p_order_id AND oi.unit_price>=v_min AND COALESCE(r.redeem_enabled,true);
 v_amount:=p_points/4.0;
 IF v_amount>v_cap OR v_amount>v_order.subtotal THEN RAISE EXCEPTION 'Points exceed the eligible discount cap'; END IF;
 INSERT INTO public.flash_points_ledger(user_id,order_id,event_type,points) VALUES(p_user_id,p_order_id,'spent',-p_points);
 UPDATE public.orders SET discount_amount=v_amount,total=GREATEST(0,subtotal-v_amount) WHERE id=p_order_id;
 RETURN v_amount;
END $$;
REVOKE ALL ON FUNCTION public.flash_redeem_points(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
-- Refund spent points once on cancellation, in same transaction as order status update.
CREATE OR REPLACE FUNCTION public.flash_refund_spent_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_spent integer;
BEGIN
 IF NEW.status IN ('canceled','cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
  SELECT points INTO v_spent FROM public.flash_points_ledger WHERE order_id=NEW.id AND event_type='spent';
  IF v_spent<0 THEN
   INSERT INTO public.flash_points_ledger(user_id,order_id,event_type,points)
   VALUES(NEW.user_id,NEW.id,'refunded',-v_spent)
   ON CONFLICT(order_id,event_type) DO NOTHING;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS flash_refund_spent_points_trigger ON public.orders;
CREATE TRIGGER flash_refund_spent_points_trigger AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.flash_refund_spent_points();
