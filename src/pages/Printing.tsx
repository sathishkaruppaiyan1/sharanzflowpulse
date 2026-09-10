
import React, { useState, useCallback, useEffect } from 'react';
import { Printer, Filter, RefreshCw, Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import PrintQueue from '@/components/printing/PrintQueue';
import PrintingFilters from '@/components/printing/PrintingFilters';
import ShippingLabelPreview from '@/components/printing/ShippingLabelPreview';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { useShopifyHeldOrderIds } from '@/hooks/useShopifyHeldOrderIds';
import { useOrdersByStage } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { supabaseOrderService } from '@/services/supabaseOrderService';

const Printing = () => {
  // ─── DB is the SINGLE source of truth for what appears on this page ───
  const {
    data: printingOrders = [],
    isPending: isLoadingPrintingOrders,
    refetch: refetchPrintingOrders,
  } = useOrdersByStage('printing');
  const { data: packingOrders = [], isPending: isLoadingPackingOrders } = useOrdersByStage('packing');

  // Shopify is only used for the background sync — never for display
  const {
    orders: shopifyOrders = [],
    loading: isLoadingShopify,
    refetch: refetchShopify,
    error: shopifyError,
    isConfigured: isShopifyConfigured,
  } = useShopifyOrders();

  // IN_PROGRESS fulfillmentOrders still report fulfillment_status=unfulfilled
  // at the order level, so we need this side-channel to exclude them.
  const { inProgressIds: shopifyInProgressIds } = useShopifyHeldOrderIds();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [bulkOrders, setBulkOrders] = useState<any[]>([]);
  const [todayPrintedCount, setTodayPrintedCount] = useState(0);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Remembers, per Shopify order id, the version we last pushed into the DB
  // and when. The sync used to re-upsert every pre-print order on every tick
  // regardless of whether anything had changed; this lets it skip the ones
  // that are already up to date.
  const syncedOrderVersions = React.useRef(
    new Map<number, { stamp: string; at: number }>()
  );
  const REFRESH_TTL_MS = 30 * 60 * 1000;
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStats, setSyncStats] = useState({ total: 0, synced: 0, inDb: 0 });

  // ─── Strict unfulfilled gate ──────────────────────────────────────────
  // `shopifyOrders` is already filtered to fulfillment_status=unfulfilled by
  // the edge function. Build a Set of their IDs so we can keep ONLY DB
  // printing rows whose Shopify counterpart is still unfulfilled.
  // IN_PROGRESS fulfillmentOrders are excluded — they show fulfillment_status
  // as "unfulfilled" at the order level but should NOT appear on the printing
  // queue.
  const unfulfilledShopifyIds = React.useMemo(() => {
    const s = new Set<number>();
    shopifyOrders.forEach((o: any) => {
      const n = Number(o.id);
      if (!Number.isFinite(n)) return;
      if (shopifyInProgressIds.has(String(n))) return;
      s.add(n);
    });
    return s;
  }, [shopifyOrders, shopifyInProgressIds]);

  // The strict filter only activates when Shopify is the source of truth:
  // Shopify must be configured, healthy, and we must have received at least
  // one fetched batch. If any of these are false we fall back to DB-only
  // display to avoid wiping the screen on a Shopify outage / misconfig.
  const shopifyStrictMode =
    isShopifyConfigured && !shopifyError && !isLoadingShopify && shopifyOrders.length >= 0
    // If Shopify is configured & healthy but query hasn't returned yet, hold off.
    && (shopifyOrders.length > 0 || (!isLoadingShopify && !shopifyError));

  // ─── Format DB printing orders for display ────────────────────────────
  const formattedPrintingOrders = React.useMemo(() => {
    const strictlyUnfulfilled = printingOrders.filter(order => {
      // Manual orders without a Shopify ID can't be cross-checked — they
      // exist purely in our DB and reaching stage='printing' implies they
      // are unfulfilled in our pipeline.
      if (!order.shopify_order_id) return true;

      // Shopify down / disabled / still loading first batch → trust DB stage.
      if (!shopifyStrictMode) return true;

      const id = Number(order.shopify_order_id);
      return Number.isFinite(id) && unfulfilledShopifyIds.has(id);
    });

    return strictlyUnfulfilled.map(order => {
      // Build line items with per-item grams from the joined product row.
      const items = (order.order_items || []).map((item: any) => {
        const grams = Number(item.product?.weight) || 0;
        return {
          title: item.title,
          name: item.title,
          variant_title: item.variant_title,
          quantity: item.quantity,
          price: item.price,
          product_id: item.product_id,
          variant_id: item.shopify_variant_id,
          sku: item.sku,
          grams,
        };
      });

      // Total weight is the sum of (per-item grams × quantity) — falls back to
      // whatever the order itself stored (e.g. populated by a Shopify sync).
      const computedWeight = items.reduce(
        (sum: number, it: any) => sum + (Number(it.grams) || 0) * (Number(it.quantity) || 1),
        0
      );
      const totalWeight = computedWeight > 0 ? computedWeight : (Number(order.total_weight) || 0);

      return {
        id: order.shopify_order_id?.toString() || order.id,
        order_number: order.order_number,
        name: order.order_number,
        created_at: order.created_at,
        fulfillment_status: 'unfulfilled',
        current_total_price: order.total_amount?.toString() || '0',
        currency: order.currency || 'INR',
        customer_name: order.customer
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
          : '',
        total_amount: order.total_amount?.toString() || '0',
        financial_status: 'paid',
        total_weight: totalWeight,
        customer: order.customer ? {
          first_name: order.customer.first_name,
          last_name: order.customer.last_name,
          phone: order.customer.phone,
          email: order.customer.email,
          id: order.customer.id,
        } : null,
        shipping_address: order.shipping_address ? {
          address1: order.shipping_address.address_line_1,
          address2: order.shipping_address.address_line_2,
          city: order.shipping_address.city,
          province: order.shipping_address.state,
          zip: order.shipping_address.postal_code,
          country: order.shipping_address.country,
          phone: order.customer?.phone,
        } : null,
        line_items: items,
        _isSupabaseOrder: true,
        _originalSupabaseOrder: order,
      };
    }).sort((a, b) => {
      const an = parseInt(String(a.order_number || a.name || '').replace(/\D/g, ''), 10) || 0;
      const bn = parseInt(String(b.order_number || b.name || '').replace(/\D/g, ''), 10) || 0;
      return bn - an;
    });
  }, [printingOrders, unfulfilledShopifyIds, shopifyStrictMode]);

  // ─── Background sync: pull new Shopify unfulfilled → DB printing stage ─
  const syncNewOrders = useCallback(async (showToast = true) => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      // 1. Refresh Shopify data
      const shopifyResult = await refetchShopify();
      const latestShopifyOrders = shopifyResult.data ?? shopifyOrders;

      // 2. Look up which of *these* Shopify orders we already hold.
      //
      //    This used to be `.not('shopify_order_id', 'is', null)` with no
      //    filter, which PostgREST silently capped at 1000 rows. With ~38k
      //    orders in the table that meant the map below was missing ~97% of
      //    them, every unfulfilled Shopify order looked brand new, and the
      //    sync re-upserted the whole batch every two minutes — tens of
      //    thousands of wasted writes a day.
      //
      //    Querying by the ids we actually care about is bounded, correct,
      //    and returns a few hundred bytes instead of a megabyte.
      const shopifyIdsToCheck = Array.from(
        new Set(
          latestShopifyOrders
            .map(order => Number(order.id))
            .filter((id): id is number => Number.isFinite(id))
        )
      );

      const existingOrders: Array<{ shopify_order_id: number | null; id: string; stage: string | null }> = [];
      const LOOKUP_CHUNK = 200; // keep the request URL well under any length limit

      for (let i = 0; i < shopifyIdsToCheck.length; i += LOOKUP_CHUNK) {
        const chunk = shopifyIdsToCheck.slice(i, i + LOOKUP_CHUNK);
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('shopify_order_id, id, stage')
          .in('shopify_order_id', chunk);

        if (fetchError) throw fetchError;
        if (data) existingOrders.push(...(data as typeof existingOrders));
      }

      const existingByShopifyId = new Map<number, { id: string; stage: string | null }>();
      existingOrders.forEach((o: any) => {
        if (o.shopify_order_id) {
          existingByShopifyId.set(Number(o.shopify_order_id), { id: o.id, stage: o.stage });
        }
      });
      const existingShopifyIds = new Set(
        existingOrders
          .map((o: any) => Number(o.shopify_order_id))
          .filter((id: number) => Number.isFinite(id))
      );

      // 3. Filter Shopify unfulfilled orders, excluding IN_PROGRESS ones —
      //    those should never be auto-promoted into the printing queue.
      const unfulfilled = latestShopifyOrders.filter(
        order =>
          (!order.fulfillment_status || order.fulfillment_status === 'unfulfilled') &&
          !shopifyInProgressIds.has(String(order.id))
      );

      // 4. Split into: brand-new orders, pending orders to promote, and
      //    existing pre-print orders to refresh (so Shopify edits to address /
      //    items propagate into the DB before they're displayed).
      const laterStages = new Set(['hold', 'printing', 'packing', 'tracking', 'shipped', 'delivered']);
      const refreshableStages = new Set(['pending', 'printing', 'hold']);
      const newOrders = unfulfilled.filter(order => !existingShopifyIds.has(Number(order.id)));
      const pendingToPrintIds: string[] = [];
      const ordersToRefresh: any[] = [];

      unfulfilled.forEach(order => {
        const rec = existingByShopifyId.get(Number(order.id));
        if (!rec) return;
        // Only promote if currently pending/null — never touch orders already in printing or later
        if (!laterStages.has(rec.stage || '')) {
          pendingToPrintIds.push(rec.id);
        }
        // Refresh pre-print orders so Shopify edits (address, items) flow through
        if (refreshableStages.has(rec.stage || '')) {
          // Only refresh when Shopify says the order changed since we last
          // pushed it (or when our record of it has gone stale). Orders whose
          // `updated_at` is unchanged are already in sync, so re-upserting
          // them is pure waste.
          const shopifyId = Number(order.id);
          const stamp = String(order.updated_at ?? '');
          const seen = syncedOrderVersions.current.get(shopifyId);
          const isUnchanged =
            seen && seen.stamp === stamp && Date.now() - seen.at < REFRESH_TTL_MS;

          if (!isUnchanged) {
            ordersToRefresh.push(order);
          }
        }
      });

      setSyncStats({
        total: unfulfilled.length,
        synced: newOrders.length + pendingToPrintIds.length,
        inDb: existingShopifyIds.size,
      });

      // 5. Upsert brand-new orders into DB with stage='printing'
      let syncedCount = 0;
      const batchSize = 5;

      for (let i = 0; i < newOrders.length; i += batchSize) {
        const batch = newOrders.slice(i, i + batchSize);
        await Promise.all(batch.map(async (shopifyOrder) => {
          try {
            await supabaseOrderService.createOrderFromShopify(shopifyOrder, 'printing');
            syncedCount++;
          } catch (err) {
            console.error('Failed to upsert order:', shopifyOrder.id, err);
          }
        }));
        if (i + batchSize < newOrders.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // 5b. Refresh existing pre-print orders so Shopify edits (address, items)
      //     propagate. The RPC itself no-ops for orders past pre-print, but we
      //     filter client-side too to avoid the round-trip.
      let refreshedCount = 0;
      if (ordersToRefresh.length > 0) {
        const refreshBatch = 5;
        for (let i = 0; i < ordersToRefresh.length; i += refreshBatch) {
          const batch = ordersToRefresh.slice(i, i + refreshBatch);
          await Promise.all(batch.map(async (shopifyOrder) => {
            try {
              await supabaseOrderService.refreshOrderFromShopify(shopifyOrder);
              // Record the version we just pushed so the next tick can skip it.
              syncedOrderVersions.current.set(Number(shopifyOrder.id), {
                stamp: String(shopifyOrder.updated_at ?? ''),
                at: Date.now(),
              });
              refreshedCount++;
            } catch (err) {
              console.error('Failed to refresh order:', shopifyOrder.id, err);
            }
          }));
          if (i + refreshBatch < ordersToRefresh.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      // 6. Promote pending → printing
      let promotedCount = 0;
      if (pendingToPrintIds.length > 0) {
        const stageBatch = 10;
        for (let i = 0; i < pendingToPrintIds.length; i += stageBatch) {
          const batchIds = pendingToPrintIds.slice(i, i + stageBatch);
          await Promise.all(batchIds.map(async (orderId) => {
            try {
              await supabaseOrderService.updateOrderStage(orderId, 'printing');
              promotedCount++;
            } catch (e) {
              console.error('Failed to promote order to printing:', orderId, e);
            }
          }));
        }
      }

      // 7. Refresh DB printing orders (the single source of truth)
      if (syncedCount > 0 || promotedCount > 0 || refreshedCount > 0) {
        await refetchPrintingOrders();
        if (showToast) {
          toast({
            title: 'Sync Successful',
            description: `${syncedCount} new, ${promotedCount} promoted, ${refreshedCount} refreshed.`,
          });
        }
      } else if (showToast) {
        toast({
          title: 'Sync Complete',
          description: `All ${unfulfilled.length} unfulfilled orders already in printing or later stages.`,
        });
      }

      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
      if (showToast) {
        toast({
          title: 'Sync Failed',
          description: 'Failed to sync orders from Shopify. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [shopifyOrders, shopifyInProgressIds, isSyncing, refetchPrintingOrders, refetchShopify]);

  // ─── Stable ref for timers ─────────────────────────────────────────────
  const syncRef = React.useRef(syncNewOrders);
  React.useEffect(() => { syncRef.current = syncNewOrders; }, [syncNewOrders]);

  // Sync on mount + every 2 minutes
  useEffect(() => {
    const initialTimer = setTimeout(() => syncRef.current(false), 1000);
    // Only sync while the tab is actually being looked at. Background tabs
    // left open overnight were syncing every 2 minutes all night.
    const intervalTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncRef.current(false);
      }
    }, 2 * 60 * 1000);
    return () => { clearTimeout(initialTimer); clearInterval(intervalTimer); };
  }, []);

  // Window focus sync (debounced — at most once per 30s)
  useEffect(() => {
    let lastFocusSync = 0;
    const handleWindowFocus = () => {
      const now = Date.now();
      if (now - lastFocusSync < 30_000) return;
      lastFocusSync = now;
      syncRef.current(false);
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  // ─── Today's printed count ─────────────────────────────────────────────
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPrinted = packingOrders.filter(order => {
      if (!order.printed_at || order.stage !== 'packing') return false;
      const printedDate = new Date(order.printed_at);
      printedDate.setHours(0, 0, 0, 0);
      return printedDate.getTime() === today.getTime();
    });
    setTodayPrintedCount(todayPrinted.length);
  }, [packingOrders]);

  // ─── Filtering (search + smart filters) ────────────────────────────────
  const getBaseFilteredOrders = useCallback(() => {
    if (isLoadingPrintingOrders) return [];

    let result = [...formattedPrintingOrders];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => {
        if (order.order_number?.toLowerCase().includes(query)) return true;
        if (order.id?.toString().toLowerCase().includes(query)) return true;
        if (order.shipping_address?.phone?.toLowerCase().includes(query)) return true;
        if (order.line_items?.some((item: any) =>
          (item.title || item.name)?.toLowerCase().includes(query)
        )) return true;
        return false;
      });
    }

    return result;
  }, [formattedPrintingOrders, searchQuery, isLoadingPrintingOrders]);

  useEffect(() => {
    if (!isLoadingPrintingOrders) {
      setFilteredOrders(getBaseFilteredOrders());
    }
  }, [getBaseFilteredOrders, isLoadingPrintingOrders]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleFilterChange = (filtered: any[]) => setFilteredOrders(filtered);

  const handleSelectedCountChange = (count: number, selectedIds: Set<string>) => {
    setSelectedCount(count);
    setSelectedOrderIds(selectedIds);
  };

  const handleSelectAll = (currentPageOrders?: any[]) => {
    const ordersToSelect = currentPageOrders || filteredOrders;
    const allIds = new Set(ordersToSelect.map(order => order.id));
    setSelectedOrderIds(allIds);
    setSelectedCount(allIds.size);
  };

  const handleUnselectAll = () => {
    setSelectedOrderIds(new Set());
    setSelectedCount(0);
  };

  const handleBulkPrint = () => {
    if (selectedCount === 0) {
      toast({ title: 'No Orders Selected', description: 'Please select orders to print labels for.', variant: 'destructive' });
      return;
    }
    const ordersToProcess = filteredOrders.filter(order => selectedOrderIds.has(order.id));
    setBulkOrders(ordersToProcess);
    setShowBulkPreview(true);
  };

  const handleBulkPrintComplete = (orderIds: string | string[]) => {
    const count = Array.isArray(orderIds) ? orderIds.length : 1;
    setTodayPrintedCount(prev => prev + count);
    toast({ title: 'Success', description: `${count} labels printed! Orders moved to next stage.` });
    setShowBulkPreview(false);
    setBulkOrders([]);
    setSelectedOrderIds(new Set());
    setSelectedCount(0);
    // Refresh DB — printed orders will no longer be stage='printing', so they vanish instantly
    refetchPrintingOrders();
  };

  const handleRefresh = () => {
    refetchPrintingOrders();
  };

  const handleInstantSync = () => syncNewOrders(true);

  // ─── Loading state ─────────────────────────────────────────────────────
  if (isLoadingPrintingOrders || isLoadingPackingOrders) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Printing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Printer className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading printing orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const readyForPacking = packingOrders.filter(order => order.stage === 'packing').length;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Printing Stage</h1>
            <p className="text-gray-600 text-sm">
              {formattedPrintingOrders.length} orders ready for printing
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>
            <Button
              onClick={handleInstantSync}
              variant="outline"
              size="sm"
              disabled={isSyncing || isLoadingShopify}
              className="flex items-center space-x-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Shopify'}</span>
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={selectedCount === 0}
              onClick={handleBulkPrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Selected Labels ({selectedCount})
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Sync Status Bar */}
          <div className="mb-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    {isSyncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-blue-700 font-medium">Syncing new orders from Shopify...</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-700">
                          Last sync: {lastSyncTime?.toLocaleTimeString() || 'Never'} &bull; Auto-sync every 2 min
                        </span>
                      </>
                    )}
                    {syncStats.total > 0 && (
                      <div className="flex items-center space-x-3 text-xs bg-white px-3 py-1 rounded-full border">
                        <span className="text-blue-600">Shopify: {syncStats.total}</span>
                        <span className="text-green-600">Database: {syncStats.inDb}</span>
                        <span className="text-orange-600">New: {syncStats.synced}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleInstantSync}
                    variant="ghost"
                    size="sm"
                    disabled={isSyncing}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700"
                  >
                    Sync Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Printer className="h-5 w-5 text-gray-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-gray-700">Today Printed</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-green-600">{todayPrintedCount}</div>
                <p className="text-xs text-gray-500">Labels printed today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Printer className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-gray-700">Ready for Printing</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-blue-600">{filteredOrders.length}</div>
                <p className="text-xs text-gray-500">Orders awaiting labels</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Printer className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-gray-700">Ready for Packing</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-purple-600">{readyForPacking}</div>
                <p className="text-xs text-gray-500">Printed orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Printer className="h-5 w-5 text-orange-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-gray-700">Selected</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-orange-600">{selectedCount}</div>
                <p className="text-xs text-gray-500">For batch printing</p>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by product name, order ID, or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Smart Filtering Section */}
          {showFilters && (
            <Card className="mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-gray-600" />
                  <CardTitle className="text-lg">Smart Product & Variation Filtering</CardTitle>
                </div>
                <p className="text-sm text-gray-600">
                  Filter orders by products, variations, date and sort order for efficient batch processing
                </p>
              </CardHeader>
              <CardContent>
                <PrintingFilters
                  orders={getBaseFilteredOrders()}
                  onFilterChange={handleFilterChange}
                />
              </CardContent>
            </Card>
          )}

          {/* Orders Section */}
          <Card>
            <CardHeader className="pb-4">
              <div>
                <CardTitle className="text-lg">Orders for Printing</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {filteredOrders.length} orders in printing stage
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <PrintQueue
                orders={filteredOrders}
                isShopifyOrders={true}
                onSelectedCountChange={handleSelectedCountChange}
                selectedOrderIds={selectedOrderIds}
                onSelectAll={handleSelectAll}
                onUnselectAll={handleUnselectAll}
                onAfterPrint={() => refetchPrintingOrders()}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bulk Print Preview */}
      {showBulkPreview && bulkOrders.length > 0 && (
        <ShippingLabelPreview
          open={showBulkPreview}
          onClose={() => setShowBulkPreview(false)}
          orders={bulkOrders}
          onPrintComplete={handleBulkPrintComplete}
        />
      )}
    </div>
  );
};

export default Printing;
