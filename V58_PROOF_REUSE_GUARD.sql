-- FLASH STORE V58: apply on staging first, after database backup.
-- Inspect duplicate proof URLs before applying the unique index:
-- SELECT proof_url, COUNT(*) FROM public.orders
-- WHERE proof_url IS NOT NULL AND proof_url <> ''
-- GROUP BY proof_url HAVING COUNT(*) > 1;
-- If this query returns rows, investigate and resolve them before applying.
-- This makes the one-proof-per-order guarantee concurrency safe.
CREATE UNIQUE INDEX IF NOT EXISTS orders_proof_url_unique_v58
ON public.orders (proof_url)
WHERE proof_url IS NOT NULL AND proof_url <> '';
