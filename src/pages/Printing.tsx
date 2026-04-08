
import React, { useState, useCallback, useEffect } from 'react';
import { Printer, Filter, RefreshCw, Search, Settings } from 'lucide-react';
import Header from '@/components/layout/Header';
import PrintQueue from '@/components/printing/PrintQueue';
import PrintingFilters from '@/components/printing/PrintingFilters';
import ShippingLabelPreview from '@/components/printing/ShippingLabelPreview';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { useOrdersByStage } from '@/hooks/useOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { supabaseOrderService } from '@/services/supabaseOrderService';

const Printing = () => {
  // Keep DB queries for stage tracking and printed counts
  const { data: printingOrders = [], isPending: isLoadingPrintingOrders, refetch: refetchPrintingOrders } = useOrdersByStage('printing');
  const { data: packingOrders = [], isPending: isLoadingPackingOrders } = useOrdersByStage('packing');
  
  // Shopify orders = source of truth for unfulfilled orders
  const {
    orders: shopifyOrders = [],
    loading: isLoadingShopify,
    refetch: refetchShopify,
    isConfigured: isShopifyConfigured,
  } = useShopifyOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [bulkOrders, setBulkOrders] = useState<any[]>([]);
  const [todayPrintedCount, setTodayPrintedCount] = useState(0);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStats, setSyncStats] = useState({ total: 0, synced: 0, inDb: 0 });
  const [laterStageShopifyIds, setLaterStageShopifyIds] = useState<Set<string>>(new Set());

  // Fetch orders already in later stages to exclude from printing view
  const fetchLaterStageIds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('shopify_order_id, stage')
        .not('shopify_order_id', 'is', null)
        .in('stage', ['packing', 'tracking', 'shipping', 'shipped', 'delivered', 'completed'] as any);

      if (!error && data) {
        const ids = new Set<string>(data.map((o: any) => String(o.shopify_order_id)));
        setLaterStageShopifyIds(ids);
        console.log('📋 Orders in later stages (excluded from printing):', ids.size);
      }
    } catch (e) {
      console.error('Failed to fetch later stage IDs:', e);
    }
  }, []);

  useEffect(() => {
    fetchLaterStageIds();
  }, [printingOrders, packingOrders, fetchLaterStageIds]);

  // Show ALL unfulfilled Shopify orders directly, excluding those in later stages
  const formattedPrintingOrders = React.useMemo(() => {
    const unfulfilled = shopifyOrders.filter(order => 
      !order.fulfillment_status || order.fulfillment_status === 'unfulfilled'
    );

    console.log('=== PRINTING ORDER SOURCE ===');
    console.log('Total Shopify unfulfilled:', unfulfilled.length);
    console.log('Orders in later stages (excluded):', laterStageShopifyIds.size);

    const result = unfulfilled
      .filter(order => !laterStageShopifyIds.has(String(order.id)))
      .map(order => ({
        id: order.id.toString(),
        shopify_order_id: order.id.toString(),
        order_number: order.order_number,
        name: order.order_number,
        created_at: order.created_at,
        fulfillment_status: 'unfulfilled',
        current_total_price: order.current_total_price || order.total_amount,
        currency: order.currency || 'INR',
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        financial_status: order.financial_status || 'paid',
        total_weight: order.total_weight || 0,
        customer: order.customer ? {
          first_name: order.customer.first_name,
          last_name: order.customer.last_name,
          phone: order.customer.phone,
          email: order.customer.email,
          id: order.customer.id
        } : null,
        shipping_address: order.shipping_address ? {
          address1: order.shipping_address.address1,
          address2: order.shipping_address.address2,
          city: order.shipping_address.city,
          province: order.shipping_address.province,
          zip: order.shipping_address.zip,
          country: order.shipping_address.country,
          phone: order.shipping_address.phone
        } : null,
        line_items: order.line_items?.map(item => ({
          title: item.title,
          name: item.name || item.title,
          variant_title: item.variant_title,
          quantity: item.quantity,
          price: item.price,
          variant_id: item.variant_id,
          sku: item.sku
        })) || [],
        _isShopifyDirect: true,
      }))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    console.log('Final printing orders to show:', result.length);
    return result;
  }, [shopifyOrders, laterStageShopifyIds]);

  // Enhanced comprehensive sync function for instant updates
  const syncNewOrders = useCallback(async (showToast = true) => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      console.log('🔄 Starting instant comprehensive sync of Shopify fulfillment state...');

      const shopifyResult = await refetchShopify();
      const latestShopifyOrders = shopifyResult.data ?? shopifyOrders;

      const { data: existingOrders, error: fetchError } = await supabase
        .from('orders')
        .select('shopify_order_id, id, stage, tracking_number, printed_at, packed_at, shipped_at')
        .not('shopify_order_id', 'is', null);

      if (fetchError) {
        throw fetchError;
      }

      const existingByShopifyId = new Map<number, any>();
      existingOrders.forEach((order: any) => {
        if (order.shopify_order_id) {
          existingByShopifyId.set(Number(order.shopify_order_id), order);
        }
      });

      const existingShopifyIds = new Set(
        existingOrders
          .map((order: any) => Number(order.shopify_order_id))
          .filter((id: number) => Number.isFinite(id))
      );

      const unfulfilled = latestShopifyOrders.filter(order => !order.fulfillment_status || order.fulfillment_status === 'unfulfilled');
      const unfulfilledShopifyIds = new Set(unfulfilled.map(order => Number(order.id)));

      console.log('📦 Total Shopify unfulfilled orders:', unfulfilled.length);
      console.log('📋 Existing Shopify orders in Supabase:', existingShopifyIds.size);

      const newOrders = unfulfilled.filter(order => !existingShopifyIds.has(Number(order.id)));
      const promoteToPrintIds: string[] = [];
      const stalePrintingOrders: Array<{ id: string; nextStage: string }> = [];

      // Stages that are "later" than printing — don't demote these back
      const laterStages = new Set(['packing', 'tracking', 'shipping', 'shipped', 'delivered', 'completed']);

      unfulfilled.forEach(order => {
        const rec = existingByShopifyId.get(Number(order.id));
        if (rec && rec.stage !== 'printing' && !laterStages.has(rec.stage)) {
          // Promote any early-stage order (pending, new, null, etc.) to printing
          promoteToPrintIds.push(rec.id);
        }
      });

      existingOrders.forEach((order: any) => {
        if (order.stage !== 'printing' || !order.shopify_order_id) return;
        if (unfulfilledShopifyIds.has(Number(order.shopify_order_id))) return;

        const nextStage = order.shipped_at || order.tracking_number
          ? 'shipped'
          : order.packed_at
            ? 'tracking'
            : order.printed_at
              ? 'packing'
              : 'pending';

        stalePrintingOrders.push({ id: order.id, nextStage });
      });

      console.log('🆕 New unfulfilled orders to upsert:', newOrders.length);
      console.log('📝 Existing orders to promote to printing:', promoteToPrintIds.length);
      console.log('🧹 Printing orders no longer unfulfilled in Shopify:', stalePrintingOrders.length);

      setSyncStats({
        total: unfulfilled.length,
        synced: newOrders.length + promoteToPrintIds.length,
        inDb: existingShopifyIds.size
      });

      let syncedCount = 0;
      const batchSize = 5;

      if (newOrders.length > 0) {
        for (let i = 0; i < newOrders.length; i += batchSize) {
          const batch = newOrders.slice(i, i + batchSize);

          await Promise.all(batch.map(async (shopifyOrder) => {
            try {
              console.log('⏳ Upserting order:', shopifyOrder.id);
              await supabaseOrderService.createOrderFromShopify(shopifyOrder, 'printing');
              console.log('✅ Upserted to printing stage:', shopifyOrder.id);
              syncedCount++;
            } catch (orderError) {
              console.error('❌ Failed to upsert order:', shopifyOrder.id, orderError);
            }
          }));

          if (i + batchSize < newOrders.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      let promotedCount = 0;
      if (promoteToPrintIds.length > 0) {
        const stageBatch = 10;
        for (let i = 0; i < promoteToPrintIds.length; i += stageBatch) {
          const batchIds = promoteToPrintIds.slice(i, i + stageBatch);
          await Promise.all(batchIds.map(async (orderId) => {
            try {
              await supabaseOrderService.updateOrderStage(orderId, 'printing');
              promotedCount++;
            } catch (e) {
              console.error('❌ Failed to promote order to printing:', orderId, e);
            }
          }));
        }
      }

      let reconciledCount = 0;
      if (stalePrintingOrders.length > 0) {
        const reconcileBatch = 20;
        for (let i = 0; i < stalePrintingOrders.length; i += reconcileBatch) {
          const batch = stalePrintingOrders.slice(i, i + reconcileBatch);
          await Promise.all(batch.map(async ({ id, nextStage }) => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({
                  stage: nextStage as any,
                  updated_at: new Date().toISOString(),
                  shopify_synced_at: new Date().toISOString(),
                })
                .eq('id', id);

              if (error) throw error;
              reconciledCount++;
            } catch (reconcileError) {
              console.error('❌ Failed to reconcile fulfilled Shopify order:', id, reconcileError);
            }
          }));
        }
      }

      if (syncedCount > 0 || promotedCount > 0 || reconciledCount > 0) {
        if (showToast) {
          toast({
            title: '🎉 Sync Successful',
            description: `${syncedCount} new, ${promotedCount} moved to printing, ${reconciledCount} removed from printing after Shopify status changes.`,
          });
        }
        await refetchPrintingOrders();
      } else if (showToast) {
        toast({
          title: '✅ Sync Complete',
          description: `Printing stage already matches Shopify for all ${unfulfilled.length} unfulfilled orders.`,
        });
      }

      setLastSyncTime(new Date());
      console.log('🎉 Instant sync completed');

    } catch (error) {
      console.error('💥 Instant sync failed:', error);
      if (showToast) {
        toast({
          title: '❌ Sync Failed',
          description: 'Failed to sync Shopify fulfillment changes. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [shopifyOrders, isSyncing, refetchPrintingOrders, refetchShopify]);

  // Instant sync on component mount and every 2 minutes for real-time updates
  useEffect(() => {
    // Initial instant sync after a short delay
    const initialTimer = setTimeout(() => {
      syncNewOrders(false); // Silent initial sync
    }, 1000);

    // Set up frequent sync every 30 seconds for near-instant updates
    const intervalTimer = setInterval(() => {
      console.log('🔄 Auto-syncing orders for instant updates...');
      syncNewOrders(false); // Silent auto-sync
    }, 30 * 1000); // 30 seconds for more frequent updates

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [syncNewOrders]);

  // Real-time window focus sync for immediate updates when user returns
  useEffect(() => {
    const handleWindowFocus = () => {
      console.log('🎯 Window focused - triggering instant sync');
      syncNewOrders(false);
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [syncNewOrders]);

  // Calculate today's printed orders count from packing stage
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

  // Simplified filtering for Supabase-only orders
  const getBaseFilteredOrders = useCallback(() => {
    if (isLoadingShopify && shopifyOrders.length === 0) {
      return [];
    }
    
    let readyToPrintOrders = [...formattedPrintingOrders];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      readyToPrintOrders = readyToPrintOrders.filter(order => {
        if (order.order_number?.toLowerCase().includes(query)) return true;
        if (order.id?.toString().toLowerCase().includes(query)) return true;
        if (order.shipping_address?.phone?.toLowerCase().includes(query)) return true;
        if (order.line_items?.some((item: any) => 
          (item.title || item.name)?.toLowerCase().includes(query)
        )) return true;
        return false;
      });
    }
    
    return readyToPrintOrders;
  }, [formattedPrintingOrders, searchQuery, isLoadingShopify, shopifyOrders.length]);

  useEffect(() => {
    const baseOrders = getBaseFilteredOrders();
    setFilteredOrders(baseOrders);
    // Orders are already sorted in formattedPrintingOrders
    setFilteredOrders(baseOrders);
  }, [getBaseFilteredOrders, isLoadingPrintingOrders]);

  const handleFilterChange = (filtered: any[]) => {
    setFilteredOrders(filtered);
    console.log('Filter applied, showing orders:', filtered.length);
  };

  const handleSelectedCountChange = (count: number, selectedIds: Set<string>) => {
    setSelectedCount(count);
    setSelectedOrderIds(selectedIds);
  };

  const handleSelectAll = (currentPageOrders?: any[]) => {
    // If currentPageOrders is provided (from PrintQueue), select only current page
    // Otherwise, select all filtered orders (for backward compatibility)
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
      toast({
        title: "No Orders Selected",
        description: "Please select orders to print labels for.",
        variant: "destructive"
      });
      return;
    }

    // Get selected orders
    const ordersToProcess = filteredOrders.filter(order => selectedOrderIds.has(order.id));
    setBulkOrders(ordersToProcess);
    setShowBulkPreview(true);
  };

  const handleBulkPrintComplete = (orderIds: string | string[]) => {
    const count = Array.isArray(orderIds) ? orderIds.length : 1;
    
    // Update today's printed count
    setTodayPrintedCount(prev => prev + count);
    
    toast({
      title: "Success",
      description: `${count} labels printed successfully! Orders moved to packing stage.`
    });
    
    setShowBulkPreview(false);
    setBulkOrders([]);
    setSelectedOrderIds(new Set());
    setSelectedCount(0);
    
    // Refresh the printing orders and later stage IDs to remove printed orders from view
    refetchPrintingOrders();
    fetchLaterStageIds();
  };

  const handleRefresh = () => {
    refetchShopify();
    refetchPrintingOrders();
  };

  const handleInstantSync = () => {
    syncNewOrders(true); // Show toast for manual sync
  };

  if (isLoadingShopify && shopifyOrders.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Printing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Printer className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading printing orders with instant sync...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const readyForPacking = packingOrders.filter(order => order.stage === 'packing').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Printing Stage - Instant Sync</h1>
            <p className="text-gray-600 text-sm">
              Real-time sync enabled • {formattedPrintingOrders.length} orders ready for printing
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
              <span>{isSyncing ? 'Syncing...' : 'Instant Sync'}</span>
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
          {/* Enhanced Sync Status Bar */}
          <div className="mb-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    {isSyncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-blue-700 font-medium">Syncing new orders instantly from Shopify...</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-700">
                          Last sync: {lastSyncTime?.toLocaleTimeString() || 'Never'} • Auto-sync every 2 minutes
                        </span>
                      </>
                    )}
                    
                    {/* Sync Statistics */}
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
                    🚀 Sync Now
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
                <CardTitle className="text-lg">Orders for Printing - Instant Updates</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {filteredOrders.length} orders in printing stage • Real-time sync from Shopify
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
                onAfterPrint={fetchLaterStageIds}
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
