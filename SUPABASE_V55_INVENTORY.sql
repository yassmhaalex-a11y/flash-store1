-- FLASH STORE V55 inventory. Run after existing V54 migrations.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity integer;
ALTER TABLE public.product_options ADD COLUMN IF NOT EXISTS stock_quantity integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_deducted boolean NOT NULL DEFAULT false;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='products_stock_nonnegative') THEN ALTER TABLE public.products ADD CONSTRAINT products_stock_nonnegative CHECK (stock_quantity IS NULL OR stock_quantity >= 0); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='options_stock_nonnegative') THEN ALTER TABLE public.product_options ADD CONSTRAINT options_stock_nonnegative CHECK (stock_quantity IS NULL OR stock_quantity >= 0); END IF; END $$;
-- NULL = unlimited. Inventory is managed by a single atomic, row-locked RPC.
CREATE OR REPLACE FUNCTION public.flash_change_order_status(p_order_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders%ROWTYPE; item record; available integer;
BEGIN
 IF p_status NOT IN ('pending','paid','processing','completed','cancelled','canceled') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF p_status='processing' AND NOT o.stock_deducted THEN
  -- Lock all affected product and option rows in a stable order to avoid races.
  PERFORM 1 FROM public.products WHERE id IN (SELECT product_id FROM public.order_items WHERE order_id=p_order_id) ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.product_options WHERE id IN (SELECT option_id FROM public.order_items WHERE order_id=p_order_id) ORDER BY id FOR UPDATE;
  FOR item IN SELECT option_id, product_id, sum(quantity)::integer AS qty FROM public.order_items WHERE order_id=p_order_id GROUP BY option_id,product_id LOOP
   IF item.option_id IS NOT NULL THEN
    SELECT stock_quantity INTO available FROM public.product_options WHERE id=item.option_id;
    IF available IS NOT NULL THEN
     IF available < item.qty THEN RAISE EXCEPTION 'Not enough stock for an option'; END IF;
     UPDATE public.product_options SET stock_quantity=stock_quantity-item.qty WHERE id=item.option_id;
    END IF;
   ELSE
    SELECT stock_quantity INTO available FROM public.products WHERE id=item.product_id;
    IF available IS NOT NULL THEN
     IF available < item.qty THEN RAISE EXCEPTION 'Not enough stock for a product'; END IF;
     UPDATE public.products SET stock_quantity=stock_quantity-item.qty WHERE id=item.product_id;
    END IF;
   END IF;
  END LOOP;
  UPDATE public.orders SET stock_deducted=true WHERE id=p_order_id;
 ELSIF p_status IN ('cancelled','canceled') AND o.stock_deducted THEN
  PERFORM 1 FROM public.products WHERE id IN (SELECT product_id FROM public.order_items WHERE order_id=p_order_id) ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.product_options WHERE id IN (SELECT option_id FROM public.order_items WHERE order_id=p_order_id) ORDER BY id FOR UPDATE;
  FOR item IN SELECT option_id,product_id,sum(quantity)::integer AS qty FROM public.order_items WHERE order_id=p_order_id GROUP BY option_id,product_id LOOP
   IF item.option_id IS NOT NULL THEN
    UPDATE public.product_options SET stock_quantity=stock_quantity+item.qty WHERE id=item.option_id AND stock_quantity IS NOT NULL;
   ELSE
    UPDATE public.products SET stock_quantity=stock_quantity+item.qty WHERE id=item.product_id AND stock_quantity IS NOT NULL;
   END IF;
  END LOOP;
  UPDATE public.orders SET stock_deducted=false WHERE id=p_order_id;
 END IF;
 UPDATE public.orders SET status=p_status WHERE id=p_order_id;
END; $$;
REVOKE ALL ON FUNCTION public.flash_change_order_status(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flash_change_order_status(uuid,text) TO service_role;
