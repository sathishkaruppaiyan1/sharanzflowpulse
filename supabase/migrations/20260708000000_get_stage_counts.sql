-- Egress reduction: replace the client's 7 separate head-count requests
-- (one per stage) with a single server-side aggregate. The function returns
-- one small row per stage, so the client makes one round-trip instead of seven
-- and transfers a few dozen bytes instead of seven HTTP responses.
--
-- SECURITY INVOKER so the caller's RLS on public.orders still applies exactly
-- as it did for the per-stage count queries this replaces.
CREATE OR REPLACE FUNCTION public.get_stage_counts()
RETURNS TABLE (stage public.order_stage, count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT stage, COUNT(*)::BIGINT
  FROM public.orders
  WHERE stage IS NOT NULL
  GROUP BY stage;
$$;

GRANT EXECUTE ON FUNCTION public.get_stage_counts() TO authenticated, anon, service_role;
