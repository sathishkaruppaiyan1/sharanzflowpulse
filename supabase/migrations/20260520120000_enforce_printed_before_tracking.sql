-- ============================================================
-- Migration: enforce printed_at NOT NULL before stage='tracking'
-- Date: 2026-05-20
-- Reason: orders were appearing in tracking without going through
--         printing (printed_at NULL). Block at the DB level so no
--         code path (UI, bulk move, scanner, future feature) can
--         bypass the workflow.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_printed_before_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fires on stage transitions INTO 'tracking'. Updates that
  -- keep stage='tracking' unchanged (e.g. adding a tracking_number)
  -- are not blocked — even if printed_at happens to be NULL on
  -- legacy rows.
  IF NEW.stage = 'tracking'
     AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage)
     AND NEW.printed_at IS NULL THEN
    RAISE EXCEPTION
      'Order % cannot move to tracking: printed_at is NULL. Move through printing stage first.',
      NEW.order_number
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_printed_before_tracking ON public.orders;

CREATE TRIGGER trg_enforce_printed_before_tracking
  BEFORE INSERT OR UPDATE OF stage ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_printed_before_tracking();
