import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/layout/Header';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import OrderDetailsBasic from '@/components/orders/OrderDetailsBasic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Search, RefreshCw, Eye, Package, Clock, Pencil } from 'lucide-react';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { useToast } from '@/hooks/use-toast';
import StageChangeControls from '@/components/common/StageChangeControls';
import { useBulkUpdateOrderStage, useOrders } from '@/hooks/useOrders';
import { OrderStage } from '@/types/database';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { useQueryClient } from '@tanstack/react-query';

const ORDERS_PER_PAGE = 25;

// Custom hook for debounced value
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'processing' | 'hold'>('processing');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [openStageDialog, setOpenStageDialog] = useState<string | number | null>(null);
  const [selectedInternalOrderIds, setSelectedInternalOrderIds] = useState<Set<string>>(new Set());
  const [bulkTargetStage, setBulkTargetStage] = useState<OrderStage | ''>('');
  const [syncingEditOrderIds, setSyncingEditOrderIds] = useState<Set<string | number>>(new Set());
  const { toast } = useToast();
  const bulkUpdateStageMutation = useBulkUpdateOrderStage();
  const queryClient = useQueryClient();
  
  // Debounce search term to avoid filtering on every keystroke
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Use both Shopify orders and our internal orders
  const { 
    orders: rawShopifyOrders = [], 
    loading: isLoading, 
    error, 
    refetch 
  } = useShopifyOrders();
  
  const { data: internalOrders = [] } = useOrders();

  // Sort orders by newest first (created_at descending)
  const shopifyOrders = useMemo(() => {
    return [...rawShopifyOrders].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Newest first
    });
  }, [rawShopifyOrders]);

  const internalOrderMap = useMemo(() => {
    return new Map(
      internalOrders
        .filter(order => order.shopify_order_id)
        .map(order => [Number(order.shopify_order_id), order])
    );
  }, [internalOrders]);

  const tabCounts = useMemo(() => {
    let processing = 0;
    let hold = 0;

    shopifyOrders.forEach(order => {
      const internalOrder = internalOrderMap.get(Number(order.id));
      if (internalOrder?.stage === 'hold') {
        hold += 1;
      } else {
        processing += 1;
      }
    });

    return { processing, hold };
  }, [shopifyOrders, internalOrderMap]);

  // Memoized filter function for better performance
  const filteredOrders = useMemo(() => {
    return shopifyOrders.filter(order => {
      const internalOrder = internalOrderMap.get(Number(order.id));

      if (activeTab === 'hold') {
        if (internalOrder?.stage !== 'hold') {
          return false;
        }
      } else if (internalOrder?.stage === 'hold') {
        return false;
      }

      // Status filter - improved logic with null safety
      if (statusFilter !== 'all') {
        const fulfillmentStatus = order.fulfillment_status || '';
        const financialStatus = order.financial_status || '';
        
        if (statusFilter === 'new' && fulfillmentStatus !== 'unfulfilled') {
          return false;
        }
        if (statusFilter === 'processing' && !(fulfillmentStatus === 'partial' || (fulfillmentStatus === 'unfulfilled' && financialStatus === 'paid'))) {
          return false;
        }
        if (statusFilter === 'shipped' && fulfillmentStatus !== 'fulfilled') {
          return false;
        }
      }

      // Date filter - improved date comparison
      if (dateFilter) {
        try {
          const orderDate = new Date(order.created_at);
          const filterDate = new Date(dateFilter);
          
          // Compare dates by setting time to midnight
          orderDate.setHours(0, 0, 0, 0);
          filterDate.setHours(0, 0, 0, 0);
          
          if (orderDate.getTime() !== filterDate.getTime()) {
            return false;
          }
        } catch (e) {
          // If date parsing fails, exclude the order
          return false;
        }
      }

      // Search filter - improved with null safety
      if (!debouncedSearchTerm) return true;
      const lowercaseSearch = debouncedSearchTerm.toLowerCase();
      
      return (
        (order.order_number || '').toLowerCase().includes(lowercaseSearch) ||
        (order.customer_name || '').toLowerCase().includes(lowercaseSearch) ||
        (order.id || '').toString().toLowerCase().includes(lowercaseSearch)
      );
    });
  }, [shopifyOrders, internalOrderMap, activeTab, debouncedSearchTerm, statusFilter, dateFilter]);

  // Calculate pagination values - memoized
  const paginationData = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    const endIndex = startIndex + ORDERS_PER_PAGE;
    const currentOrders = filteredOrders.slice(startIndex, endIndex);
    
    return {
      totalOrders,
      totalPages,
      startIndex,
      endIndex,
      currentOrders
    };
  }, [filteredOrders, currentPage]);

  const selectableCurrentOrders = useMemo(() => {
    return paginationData.currentOrders.filter((order) => Boolean(internalOrderMap.get(Number(order.id))?.id));
  }, [paginationData.currentOrders, internalOrderMap]);

  const allCurrentPageSelected =
    selectableCurrentOrders.length > 0 &&
    selectableCurrentOrders.every((order) => {
      const internalOrder = internalOrderMap.get(Number(order.id));
      return internalOrder ? selectedInternalOrderIds.has(internalOrder.id) : false;
    });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, dateFilter, activeTab]);

  useEffect(() => {
    setSelectedInternalOrderIds(new Set());
    setBulkTargetStage('');
  }, [activeTab, debouncedSearchTerm, statusFilter, dateFilter]);

  // Memoized status badge function
  const getStatusBadge = useCallback((fulfillmentStatus: string, financialStatus: string) => {
    let color = 'bg-blue-100 text-blue-800';
    let label = 'New';

    const fulfillment = fulfillmentStatus || '';
    const financial = financialStatus || '';

    if (fulfillment === 'fulfilled') {
      color = 'bg-green-100 text-green-800';
      label = 'Shipped';
    } else if (fulfillment === 'partial') {
      color = 'bg-yellow-100 text-yellow-800';
      label = 'Processing';
    } else if (financial === 'paid') {
      color = 'bg-yellow-100 text-yellow-800';
      label = 'Processing';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  }, []);

  const handleSyncFromShopify = async () => {
    try {
      await refetch();
      toast({
        title: "Orders Synced",
        description: "Successfully synced orders from Shopify",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync orders from Shopify",
        variant: "destructive",
      });
    }
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleStageChange = (orderId: string | number) => {
    setOpenStageDialog(orderId);
  };

  const getInternalOrder = (shopifyOrderId: string | number) => {
    return internalOrderMap.get(Number(shopifyOrderId));
  };

  const handleSelectOrder = (shopifyOrderId: string | number, checked: boolean) => {
    const internalOrder = getInternalOrder(shopifyOrderId);
    if (!internalOrder) return;

    setSelectedInternalOrderIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(internalOrder.id);
      } else {
        next.delete(internalOrder.id);
      }
      return next;
    });
  };

  const handleSelectAllCurrentPage = (checked: boolean) => {
    setSelectedInternalOrderIds((prev) => {
      const next = new Set(prev);
      selectableCurrentOrders.forEach((order) => {
        const internalOrder = internalOrderMap.get(Number(order.id));
        if (!internalOrder) return;
        if (checked) {
          next.add(internalOrder.id);
        } else {
          next.delete(internalOrder.id);
        }
      });
      return next;
    });
  };

  const handleBulkStageChange = async () => {
    if (!bulkTargetStage || selectedInternalOrderIds.size === 0) {
      toast({
        title: 'Bulk update unavailable',
        description: 'Select orders and choose a status first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await bulkUpdateStageMutation.mutateAsync({
        orderIds: Array.from(selectedInternalOrderIds),
        stage: bulkTargetStage,
      });
      setSelectedInternalOrderIds(new Set());
      setBulkTargetStage('');
    } catch (error) {
      console.error('Bulk stage change failed:', error);
    }
  };

  const bulkStageOptions: OrderStage[] = activeTab === 'hold'
    ? ['pending', 'printing', 'packing', 'tracking']
    : ['hold', 'pending', 'printing', 'packing', 'tracking'];

  const handleEditStatus = async (shopifyOrder: any) => {
    const existingOrder = getInternalOrder(shopifyOrder.id);
    if (existingOrder) {
      handleStageChange(shopifyOrder.id);
      return;
    }

    setSyncingEditOrderIds((prev) => new Set(prev).add(shopifyOrder.id));
    try {
      await supabaseOrderService.createOrderFromShopify(shopifyOrder, 'pending');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.refetchQueries({ queryKey: ['orders'] });
      handleStageChange(shopifyOrder.id);
    } catch (error) {
      console.error('Failed to sync order before editing status:', error);
      toast({
        title: 'Unable to open status editor',
        description: 'Failed to sync this order into the system.',
        variant: 'destructive',
      });
    } finally {
      setSyncingEditOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(shopifyOrder.id);
        return next;
      });
    }
  };

  // Memoized pagination function
  const generatePaginationItems = useCallback(() => {
    const items = [];
    const maxVisiblePages = 5;
    const { totalPages } = paginationData;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => setCurrentPage(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if needed
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis1">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show last page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              onClick={() => setCurrentPage(totalPages)}
              isActive={currentPage === totalPages}
              className="cursor-pointer"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }
    
    return items;
  }, [currentPage, paginationData.totalPages]);

  // Calculate stats from Shopify orders - memoized
  const orderStats = useMemo(() => {
    const totalOrdersCount = shopifyOrders.length;
    const newOrders = shopifyOrders.filter(o => (o.fulfillment_status || '') === 'unfulfilled').length;
    const processingOrders = shopifyOrders.filter(o => {
      const fulfillment = o.fulfillment_status || '';
      const financial = o.financial_status || '';
      return fulfillment === 'partial' || (fulfillment === 'unfulfilled' && financial === 'paid');
    }).length;
    const shippedOrders = shopifyOrders.filter(o => (o.fulfillment_status || '') === 'fulfilled').length;
    
    return { totalOrdersCount, newOrders, processingOrders, shippedOrders };
  }, [shopifyOrders]);

  const { totalOrders, totalPages, startIndex, endIndex, currentOrders } = paginationData;

  // Handle error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Orders Management" />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load orders</h3>
            <p className="text-gray-500 mb-4">There was an error fetching your Shopify orders.</p>
            <Button onClick={handleSyncFromShopify}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Orders Management" />
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 px-6 pt-6 pb-2">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold">{orderStats.totalOrdersCount}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">New Orders</p>
                    <p className="text-2xl font-bold text-blue-600">{orderStats.newOrders}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Processing</p>
                    <p className="text-2xl font-bold text-yellow-600">{orderStats.processingOrders}</p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Shipped</p>
                    <p className="text-2xl font-bold text-green-600">{orderStats.shippedOrders}</p>
                  </div>
                  <Package className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Order Filters</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Tabs
                  value={activeTab}
                  onValueChange={(value) => setActiveTab(value as 'processing' | 'hold')}
                >
                  <TabsList className="grid w-full grid-cols-2 md:w-[280px]">
                    <TabsTrigger value="processing">
                      Processing ({tabCounts.processing})
                    </TabsTrigger>
                    <TabsTrigger value="hold">
                      Hold ({tabCounts.hold})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by order number, customer name, or order ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New Orders</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  placeholder="Filter by date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full md:w-48"
                />

                <Button variant="outline" size="sm" onClick={handleSyncFromShopify}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-gray-600">
                  {selectedInternalOrderIds.size === 0
                    ? 'No orders selected'
                    : `${selectedInternalOrderIds.size} orders selected`}
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Select value={bulkTargetStage} onValueChange={(value) => setBulkTargetStage(value as OrderStage)}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Bulk change status" />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkStageOptions.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage.charAt(0).toUpperCase() + stage.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleBulkStageChange}
                    disabled={selectedInternalOrderIds.size === 0 || !bulkTargetStage || bulkUpdateStageMutation.isPending}
                  >
                    {bulkUpdateStageMutation.isPending ? 'Updating...' : 'Update Selected'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {activeTab === 'hold' ? 'Hold Orders' : 'Processing Orders'} ({totalOrders} total, showing {totalOrders === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalOrders)})
                </CardTitle>
                <Button onClick={handleSyncFromShopify}>
                  Sync from Shopify
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner text="Loading Shopify orders..." />
                </div>
              ) : currentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500">
                    {searchTerm || dateFilter || statusFilter !== 'all'
                      ? 'No orders match your search criteria.'
                      : activeTab === 'hold'
                      ? 'No held orders available.'
                      : 'No processing orders available.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-4">
                            <Checkbox
                              checked={allCurrentPageSelected}
                              onCheckedChange={(checked) => handleSelectAllCurrentPage(checked === true)}
                              aria-label="Select all orders on page"
                            />
                          </th>
                          <th className="text-left py-3 px-4 font-medium">Order Number</th>
                          <th className="text-left py-3 px-4 font-medium">Customer</th>
                          <th className="text-left py-3 px-4 font-medium">Total</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-left py-3 px-4 font-medium">Financial</th>
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-left py-3 px-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentOrders.map((order) => {
                          const internalOrder = getInternalOrder(order.id);
                          const isSelected = internalOrder ? selectedInternalOrderIds.has(internalOrder.id) : false;
                          const isSyncingEdit = syncingEditOrderIds.has(order.id);
                          return (
                          <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              <Checkbox
                                checked={isSelected}
                                disabled={!internalOrder}
                                onCheckedChange={(checked) => handleSelectOrder(order.id, checked === true)}
                                aria-label={`Select ${order.order_number || 'order'}`}
                              />
                            </td>
                            <td className="py-3 px-4 font-mono text-sm font-medium">{order.order_number || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{order.customer_name || 'N/A'}</div>
                            </td>
                            <td className="py-3 px-4 font-medium">
                              {order.currency || ''} {order.total_amount || '0'}
                            </td>
                            <td className="py-3 px-4">
                              {getStatusBadge(order.fulfillment_status, order.financial_status)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                (order.financial_status || '') === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : (order.financial_status || '') === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {order.financial_status || 'unknown'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleEditStatus(order)}
                                  disabled={isSyncingEdit}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {internalOrder && (
                                  <Dialog 
                                     open={openStageDialog === order.id} 
                                     onOpenChange={(open) => setOpenStageDialog(open ? order.id : null)}
                                  >
                                    <DialogTrigger asChild>
                                      <span className="hidden" />
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                      <DialogHeader>
                                        <DialogTitle>Change Order Stage</DialogTitle>
                                      </DialogHeader>
                                      <StageChangeControls 
                                        order={internalOrder} 
                                        currentStage={internalOrder.stage || 'pending'}
                                        onStageChange={() => {
                                          setOpenStageDialog(null);
                                        }}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        Showing {startIndex + 1} to {Math.min(endIndex, totalOrders)} of {totalOrders} orders
                      </div>
                      
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              className={`cursor-pointer ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                            />
                          </PaginationItem>
                          
                          {generatePaginationItems()}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              className={`cursor-pointer ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <OrderDetailsBasic
        open={showOrderDetails}
        onClose={() => setShowOrderDetails(false)}
        order={selectedOrder}
      />
    </div>
  );
};

export default Orders;
