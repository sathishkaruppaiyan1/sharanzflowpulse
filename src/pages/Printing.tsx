
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

const Printing = () => {
  const { orders: rawShopifyOrders = [], loading: isLoading, error, refetch } = useShopifyOrders();
  
  // Separate queries - ONLY printing stage for display, packing for stats only
  const { data: printingOrders = [], isPending: isLoadingPrintingOrders } = useOrdersByStage('printing');
  const { data: packingOrders = [], isPending: isLoadingPackingOrders } = useOrdersByStage('packing');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [bulkOrders, setBulkOrders] = useState<any[]>([]);
  const [todayPrintedCount, setTodayPrintedCount] = useState(0);
  const [syncedShopifyOrderIds, setSyncedShopifyOrderIds] = useState<Set<number>>(new Set());
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);

  // Sort Shopify orders by newest first (created_at descending)
  const shopifyOrders = React.useMemo(() => {
    return [...rawShopifyOrders].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Newest first
    });
  }, [rawShopifyOrders]);

  // Clear cache and refetch when component mounts to handle token changes
  useEffect(() => {
    console.log('Printing page mounted - clearing stale data after token change');
    setSelectedOrderIds(new Set());
    setSelectedCount(0);
    setSyncedShopifyOrderIds(new Set());
  }, []);

  // Fetch synced Shopify order IDs - exclude orders that are beyond printing stage
  useEffect(() => {
    const fetchSyncedOrders = async () => {
      try {
        console.log('Fetching synced orders to determine exclusions...');
        const { data: syncedOrders, error } = await supabase
          .from('orders')
          .select('shopify_order_id, stage')
          .not('shopify_order_id', 'is', null);
          
        if (error) {
          console.error('Error fetching synced orders:', error);
          return;
        }
        
        // Exclude orders that are NOT in printing stage (packing, tracking, shipped, delivered)
        const syncedIds = new Set(
          syncedOrders
            .filter(order => order.stage !== 'printing')
            .map(order => order.shopify_order_id)
            .filter(Boolean)
        );
        
        console.log(`Found ${syncedIds.size} synced orders to exclude from Shopify display`);
        console.log('Excluded stages:', syncedOrders.filter(o => o.stage !== 'printing').map(o => `${o.shopify_order_id}:${o.stage}`));
        setSyncedShopifyOrderIds(syncedIds);
      } catch (error) {
        console.error('Error in fetchSyncedOrders:', error);
      }
    };

    fetchSyncedOrders();
  }, [printingOrders, packingOrders]); // Refresh when orders change

  // Calculate today's printed orders count from packing stage only
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayPrinted = packingOrders.filter(order => {
      if (!order.printed_at) return false;
      const printedDate = new Date(order.printed_at);
      printedDate.setHours(0, 0, 0, 0);
      return printedDate.getTime() === today.getTime();
    });
    
    setTodayPrintedCount(todayPrinted.length);
  }, [packingOrders]);

  // Process and filter orders - ONLY show printing stage orders
  const getBaseFilteredOrders = useCallback(() => {
    if (isLoadingPrintingOrders) {
      return [];
    }
    
    console.log('=== PRINTING ORDER FILTERING DEBUG ===');
    console.log('Total Shopify orders:', shopifyOrders.length);
    console.log('Synced order IDs to exclude:', Array.from(syncedShopifyOrderIds));
    console.log('Supabase orders in PRINTING stage ONLY:', printingOrders.length);
    
    // Create a map to track orders by Shopify order ID
    const orderMap = new Map();
    
    // First, add ONLY printing stage orders from Supabase
    printingOrders.forEach(order => {
      const shopifyOrderId = order.shopify_order_id?.toString();
      if (shopifyOrderId) {
        const formattedOrder = {
          id: shopifyOrderId,
          order_number: order.order_number,
          created_at: order.created_at,
          fulfillment_status: 'unfulfilled',
          current_total_price: order.total_amount?.toString() || '0',
          currency: order.currency || 'INR',
          customer_name: order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : '',
          total_amount: order.total_amount?.toString() || '0',
          financial_status: 'paid',
          total_weight: 0,
          customer: order.customer ? {
            first_name: order.customer.first_name,
            last_name: order.customer.last_name,
            phone: order.customer.phone,
            email: order.customer.email,
            id: order.customer.id
          } : null,
          shipping_address: order.shipping_address ? {
            address1: order.shipping_address.address_line_1,
            address2: order.shipping_address.address_line_2,
            city: order.shipping_address.city,
            province: order.shipping_address.state,
            zip: order.shipping_address.postal_code,
            country: order.shipping_address.country,
            phone: order.customer?.phone
          } : null,
          line_items: order.order_items?.map(item => ({
            title: item.title,
            name: item.title,
            variant_title: item.variant_title,
            quantity: item.quantity,
            price: item.price,
            product_id: item.product_id,
            variant_id: item.shopify_variant_id,
            sku: item.sku
          })) || [],
          _isSupabaseOrder: true
        };
        orderMap.set(shopifyOrderId, formattedOrder);
        console.log(`✓ Added Supabase PRINTING order ${order.order_number} (ID: ${shopifyOrderId})`);
      }
    });

    // Then, add unfulfilled Shopify orders that are NOT already synced to any stage
    shopifyOrders.forEach(order => {
      const orderId = order.id.toString();
      
      // Skip if already in map (from Supabase printing stage)
      if (orderMap.has(orderId)) {
        console.log(`⚠ Skipping Shopify order ${order.id} - already exists in printing stage`);
        return;
      }
      
      // Only include unfulfilled orders that are not synced to ANY stage
      const isUnfulfilled = order.fulfillment_status === 'unfulfilled' || order.fulfillment_status === null;
      const isNotSynced = !syncedShopifyOrderIds.has(Number(order.id));
      
      console.log(`Shopify Order ${order.id}: fulfillment=${order.fulfillment_status}, synced=${!isNotSynced}`);
      
      if (isUnfulfilled && isNotSynced) {
        orderMap.set(orderId, {
          ...order,
          _isSupabaseOrder: false
        });
        console.log(`✓ Added NEW Shopify order ${order.id} to printing display`);
      } else {
        console.log(`✗ Excluded Shopify order ${order.id} - fulfilled: ${!isUnfulfilled}, synced: ${!isNotSynced}`);
      }
    });

    let readyToPrintOrders = Array.from(orderMap.values());
    
    console.log('=== FINAL PRINTING RESULTS ===');
    console.log('Total orders ready for PRINTING:', readyToPrintOrders.length);
    console.log('Orders by source:', {
      supabase_printing: readyToPrintOrders.filter(o => o._isSupabaseOrder).length,
      shopify_new: readyToPrintOrders.filter(o => !o._isSupabaseOrder).length
    });

    // Apply search filter
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
      console.log(`Search filtered orders: ${readyToPrintOrders.length} match "${query}"`);
    }
    
    return readyToPrintOrders;
  }, [shopifyOrders, searchQuery, syncedShopifyOrderIds, printingOrders, isLoadingPrintingOrders]);

  // Initialize filtered orders with default sorting
  useEffect(() => {
    if (isLoadingPrintingOrders) {
      return;
    }
      
    const baseOrders = getBaseFilteredOrders();
    // Sort by newest first
    const sorted = [...baseOrders].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
    setFilteredOrders(sorted);
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

    const ordersToProcess = filteredOrders.filter(order => selectedOrderIds.has(order.id));
    setBulkOrders(ordersToProcess);
    setShowBulkPreview(true);
  };

  const handleBulkPrintComplete = (orderIds: string | string[]) => {
    const count = Array.isArray(orderIds) ? orderIds.length : 1;
    
    setTodayPrintedCount(prev => prev + count);
    
    toast({
      title: "Success",
      description: `${count} labels printed successfully! Orders moved to packing stage.`
    });
    
    setShowBulkPreview(false);
    setBulkOrders([]);
    setSelectedOrderIds(new Set());
    setSelectedCount(0);
    
    // Force refresh after printing and clear synced order cache
    console.log('Refreshing after successful print - orders should move to packing...');
    // Clear the synced orders cache so excluded orders list is refreshed
    setSyncedShopifyOrderIds(new Set());
    refetch();
  };

  const handleRefresh = () => {
    console.log('Manual refresh - clearing cache and refetching after token change...');
    setSelectedOrderIds(new Set());
    setSelectedCount(0);
    setSyncedShopifyOrderIds(new Set());
    refetch();
  };

  if (isLoading || isLoadingPrintingOrders || isLoadingPackingOrders) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Printing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Printer className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading orders with updated token...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Printing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Shopify Connection Error</CardTitle>
              <CardDescription>
                Unable to load orders with the new token. Please check your Shopify configuration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <Button onClick={handleRefresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry with New Token
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const readyForPacking = packingOrders.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Printing Stage</h1>
            <p className="text-gray-600 text-sm">
              Generate shipping labels • Updated with new token
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Orders for Printing</CardTitle>
                  <p className="text-sm text-gray-600">
                    {filteredOrders.length} orders ready for printing • Token updated
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-900"
                    onClick={() => handleSelectAll()}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-900"
                    onClick={handleUnselectAll}
                  >
                    Unselect All
                  </Button>
                </div>
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
                itemsPerPage={10}
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
