
import React, { useState, useCallback, useEffect } from 'react';
import { Printer, Filter, RefreshCw, Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import MobileSidebar from '@/components/layout/MobileSidebar';
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

interface PrintingProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user: { email: string; role: string; name: string };
  onLogout: () => void;
}

const Printing = ({ onMenuClick, isMobileMenuOpen, setIsMobileMenuOpen, user, onLogout }: PrintingProps) => {
  const { orders: rawShopifyOrders = [], loading: isLoading, error, refetch } = useShopifyOrders();
  const { data: packingOrders = [] } = useOrdersByStage('packing');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [bulkOrders, setBulkOrders] = useState<any[]>([]);
  const [todayPrintedCount, setTodayPrintedCount] = useState(0);
  const [syncedShopifyOrderIds, setSyncedShopifyOrderIds] = useState<Set<number>>(new Set());

  // Sort Shopify orders by newest first (created_at descending)
  const shopifyOrders = React.useMemo(() => {
    return [...rawShopifyOrders].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Newest first
    });
  }, [rawShopifyOrders]);

  // Fetch synced Shopify order IDs to exclude from printing stage
  useEffect(() => {
    const fetchSyncedOrders = async () => {
      try {
        const { data: syncedOrders, error } = await supabase
          .from('orders')
          .select('shopify_order_id')
          .not('shopify_order_id', 'is', null);
          
        if (error) {
          console.error('Error fetching synced orders:', error);
          return;
        }
        
        const syncedIds = new Set(syncedOrders.map(order => order.shopify_order_id).filter(Boolean));
        setSyncedShopifyOrderIds(syncedIds);
        console.log('Synced Shopify order IDs:', Array.from(syncedIds));
      } catch (error) {
        console.error('Error in fetchSyncedOrders:', error);
      }
    };

    fetchSyncedOrders();
  }, [packingOrders]); // Refetch when packing orders change

  // Calculate today's printed orders count
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

  // Process and filter orders without causing re-renders
  const getFilteredOrders = useCallback(() => {
    console.log('Total Shopify orders:', shopifyOrders.length);
    console.log('Synced order IDs to exclude:', Array.from(syncedShopifyOrderIds));
    
    let readyToPrintOrders = shopifyOrders.filter(order => {
      // Exclude orders that are already fulfilled
      const isUnfulfilled = order.fulfillment_status === 'unfulfilled' || order.fulfillment_status === null;
      
      // Exclude orders that have already been synced to Supabase (already printed)
      const isNotSynced = !syncedShopifyOrderIds.has(Number(order.id));
      
      console.log(`Order ${order.id}: fulfillment=${order.fulfillment_status}, synced=${!isNotSynced}`);
      
      return isUnfulfilled && isNotSynced;
    });

    console.log('Orders ready for printing after filtering:', readyToPrintOrders.length);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      readyToPrintOrders = readyToPrintOrders.filter(order => {
        // Search in order number/ID
        if (order.order_number?.toLowerCase().includes(query)) return true;
        if (order.id?.toString().toLowerCase().includes(query)) return true;
        
        // Search in customer phone
        if (order.shipping_address?.phone?.toLowerCase().includes(query)) return true;
        
        // Search in product names
        if (order.line_items?.some((item: any) => 
          (item.title || item.name)?.toLowerCase().includes(query)
        )) return true;
        
        return false;
      });
    }
    
    return readyToPrintOrders;
  }, [shopifyOrders, searchQuery, syncedShopifyOrderIds]);

  const filteredOrders = getFilteredOrders();

  const handleFilterChange = (filtered: any[]) => {
    // This will be handled by the PrintingFilters component internally
    console.log('Filter changed:', filtered.length);
  };

  const handleSelectedCountChange = (count: number, selectedIds: Set<string>) => {
    setSelectedCount(count);
    setSelectedOrderIds(selectedIds);
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredOrders.map(order => order.id));
    setSelectedOrderIds(allIds);
    setSelectedCount(allIds.size);
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
    
    // Refresh the orders to show updated stages
    refetch();
  };

  if (isLoading) {
    return (
      <>
        <MobileSidebar 
          user={user}
          onLogout={onLogout}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex flex-col h-full">
          <Header title="Printing Stage" showSearch={false} onMenuClick={onMenuClick} />
          <div className="flex-1 p-6 bg-gray-50">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Printer className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-500">Loading Shopify orders...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <MobileSidebar 
          user={user}
          onLogout={onLogout}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex flex-col h-full">
          <Header title="Printing Stage" showSearch={false} onMenuClick={onMenuClick} />
          <div className="flex-1 p-6 bg-gray-50">
            <Card className="max-w-md mx-auto mt-8">
              <CardHeader>
                <CardTitle className="text-red-600">Error Loading Shopify Orders</CardTitle>
                <CardDescription>
                  Unable to load orders from Shopify. Please check your API configuration.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{error}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const readyForPacking = packingOrders.length;

  return (
    <>
      <MobileSidebar 
        user={user}
        onLogout={onLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Printing Stage</h1>
            <p className="text-gray-600 text-sm">
              Generate shipping labels with smart filtering • Auto-refresh every 30s
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={refetch}
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
                  Filter orders by products, variations, and date for efficient batch processing
                </p>
              </CardHeader>
              <CardContent>
                <PrintingFilters 
                  orders={filteredOrders} 
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
                    {filteredOrders.length} orders match your filter criteria
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <PrintQueue 
                orders={filteredOrders} 
                isShopifyOrders={true}
                onSelectedCountChange={handleSelectedCountChange}
                selectedOrderIds={selectedOrderIds}
                onSelectAll={handleSelectAll}
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
    </>
  );
};

export default Printing;
