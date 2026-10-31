-- ============================================================
-- Product price in cents
-- Before this file, products.price held whole reais (49 means
-- R$ 49). From this file on, it holds integer cents (4900 means
-- R$ 49,00). The column stays bigint.
--
-- Run this file once only. The migration ledger
-- (public.pluto_migrations) records it, so the admin UI never
-- applies it twice. A second run would multiply every price by
-- 100 again.
-- ============================================================

UPDATE public.products
SET price = price * 100;
