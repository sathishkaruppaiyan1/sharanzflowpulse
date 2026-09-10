-- Applied to project fmhwcnjvlagoilicsmuw on 2026-09-10.
--
-- autovacuum had never run on these tables (last_autovacuum was NULL across
-- the board), which left the planner working from wildly stale row estimates
-- -- it believed `addresses` held 485 rows when it actually holds ~153,000.
-- A 300x underestimate drives the planner into nested-loop plans, which is
-- consistent with the 6+ second average origin time on the embed queries.
--
-- Scale factor 0 plus a small flat threshold makes autovacuum trigger on
-- absolute row counts, so statistics stay fresh on these upsert-heavy tables.
ALTER TABLE public.addresses   SET (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 200,
                                    autovacuum_analyze_scale_factor = 0, autovacuum_analyze_threshold = 200);
ALTER TABLE public.customers   SET (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 200,
                                    autovacuum_analyze_scale_factor = 0, autovacuum_analyze_threshold = 200);
ALTER TABLE public.order_items SET (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 500,
                                    autovacuum_analyze_scale_factor = 0, autovacuum_analyze_threshold = 500);
ALTER TABLE public.products    SET (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 500,
                                    autovacuum_analyze_scale_factor = 0, autovacuum_analyze_threshold = 500);
ALTER TABLE public.orders      SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 1000,
                                    autovacuum_analyze_scale_factor = 0.02, autovacuum_analyze_threshold = 1000);
