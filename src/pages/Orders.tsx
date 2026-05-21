import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import OrderDetailsBasic from '@/components/orders/OrderDetailsBasic';
import OrderStatusChangeControls from '@/components/orders/OrderStatusChangeControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { useShopifyHeldOrderIds } from '@/hooks/useShopifyHeldOrderIds';
import { useToast } from '@/hooks/use-toast';
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
  const location = useLocation();
  const isHoldRoute = location.pathname === '/hold';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'processing' | 'inprogress' | 'hold'>(
    isHoldRoute ? 'hold' : 'processing'
  );

  // Lock tab to 'hold' whenever the user lands on /hold so the page stays focused.
  useEffect(() => {
    if (isHoldRoute && activeTab !== 'hold') {
      setActiveTab('hold');
    }
  }, [isHoldRoute, activeTab]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [openStageDialog, setOpenStageDialog] = useState(false);
  const [statusDialogOrderId, setStatusDialogOrderId] = useState<string | number | null>(null);
  // Track selection by Shopify order ID — works for orders not yet synced to
  // the local DB (e.g. fresh InProgress orders). We lazy-sync them on bulk
  // submit.
  const [selectedShopifyOrderIds, setSelectedShopifyOrderIds] = useState<Set<string>>(new Set());
  type BulkTarget = OrderStage | 'inprogress';
  const [bulkTargetStage, setBulkTargetStage] = useState<BulkTarget | ''>('');
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const { toast } = useToast();
  const bulkUpdateStageMutation = useBulkUpdateOrderStage();
  const queryClient = useQueryClient();
  
  // Debounce search term to avoid filtering on every keystroke
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Use both Shopify orders and our internal orders
  const { 
    orders: rawShopifyOrders = [], 
    loading: isLoadingShopifyOrders, 
    error: shopifyOrdersError, 
    refetch 
  } = useShopifyOrders();
  
  const { data: internalOrders = [] } = useOrders();
  const {
    heldIds: shopifyHeldIds,
    heldOrders: rawHeldShopifyOrders = [],
    inProgressIds: shopifyInProgressIds,
    inProgressOrders: rawInProgressShopifyOrders = [],
    isLoading: isLoadingHeldOrders,
    error: heldOrdersError,
    refetch: refetchHeldOrders,
  } = useShopifyHeldOrderIds();
  const isLoading = isLoadingShopifyOrders || isLoadingHeldOrders;
  const error = shopifyOrdersError || heldOrdersError;

  // Sort orders by newest first (created_at descending)
  const shopifyOrders = useMemo(() => {
    const mergedOrders = new Map<string, any>();

    rawShopifyOrders.forEach((order) => {
      mergedOrders.set(String(order.id), order);
    });

    rawHeldShopifyOrders.forEach((order) => {
      mergedOrders.set(String(order.id), {
        ...mergedOrders.get(String(order.id)),
        ...order,
      });
    });

    rawInProgressShopifyOrders.forEach((order) => {
      mergedOrders.set(String(order.id), {
        ...mergedOrders.get(String(order.id)),
        ...order,
      });
    });

    return Array.from(mergedOrders.values()).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Newest first
    });
  }, [rawHeldShopifyOrders, rawInProgressShopifyOrders, rawShopifyOrders]);

  const internalOrderMap = useMemo(() => {
    return new Map(
      internalOrders
        .filter(order => order.shopify_order_id)
        .map(order => [Number(order.shopify_order_id), order])
    );
  }, [internalOrders]);

  // An order is "held" if EITHER the DB stage is 'hold' OR Shopify reports a
  // fulfillment hold against it. Used by both tab counts and filtering below.
  const isOrderHeld = useCallback(
    (orderId: string | number) => {
      const internalOrder = internalOrderMap.get(Number(orderId));
      if (internalOrder?.stage === 'hold') return true;
      return shopifyHeldIds.has(String(orderId));
    },
    [internalOrderMap, shopifyHeldIds]
  );

  const isOrderInProgress = useCallback(
    (orderId: string | number) => {
      if (isOrderHeld(orderId)) return false;
      return shopifyInProgressIds.has(String(orderId));
    },
    [isOrderHeld, shopifyInProgressIds]
  );

  const getOrderQueueStatus = useCallback(
    (orderId: string | number): 'processing' | 'hold' | 'inprogress' => {
      if (isOrderHeld(orderId)) return 'hold';
      if (isOrderInProgress(orderId)) return 'inprogress';
      return 'processing';
    },
    [isOrderHeld, isOrderInProgress]
  );

  const tabCounts = useMemo(() => {
    let processing = 0;
    let inprogress = 0;
    let hold = 0;

    shopifyOrders.forEach(order => {
      if (isOrderHeld(order.id)) {
        hold += 1;
      } else if (isOrderInProgress(order.id)) {
        inprogress += 1;
      } else {
        processing += 1;
      }
    });

    return { processing, inprogress, hold };
  }, [shopifyOrders, isOrderHeld, isOrderInProgress]);

  // Memoized filter function for better performance
  const filteredOrders = useMemo(() => {
    return shopifyOrders.filter(order => {
      const held = isOrderHeld(order.id);
      const inProgress = isOrderInProgress(order.id);

      if (activeTab === 'hold') {
        if (!held) return false;
      } else if (activeTab === 'inprogress') {
        if (!inProgress) return false;
      } else if (held) {
        return false;
      } else if (inProgress) {
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
  }, [shopifyOrders, isOrderHeld, isOrderInProgress, activeTab, debouncedSearchTerm, statusFilter, dateFilter]);

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

  const allCurrentPageSelected =
    paginationData.currentOrders.length > 0 &&
    paginationData.currentOrders.every((order) => selectedShopifyOrderIds.has(String(order.id)));

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, dateFilter, activeTab]);

  useEffect(() => {
    setSelectedShopifyOrderIds(new Set());
    setBulkTargetStage('');
  }, [activeTab, debouncedSearchTerm, statusFilter, dateFilter]);

  useEffect(() => {
    if (!heldOrdersError) return;
    toast({
      title: 'Hold orders unavailable',
      description: heldOrdersError,
      variant: 'destructive',
    });
  }, [heldOrdersError, toast]);

  // Memoized status badge function
  const getStatusBadge = useCallback((fulfillmentStatus: string, financialStatus: string) => {
    let color = 'bg-blue-100 text-blue-800';
    let label = 'New';

    const fulfillment = fulfillmentStatus || '';
    const financial = financialStatus || '';

    if (fulfillment === 'fulfilled') {
      color = 'bg-green-100 text-green-800';
      label = 'Shipped';
    } else if (fulfillment === 'in_progress') {
      color = 'bg-amber-100 text-amber-800';
      label = 'In Progress';
    } else if (fulfillment === 'on_hold') {
      color = 'bg-red-100 text-red-800';
      label = 'Hold';
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
      await Promise.all([refetch(), refetchHeldOrders()]);
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

  const handleSaveShippingAddress = async (address: {
    address1: string;
    address2: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  }) => {
    if (!selectedOrder) return;

    try {
      let internalOrder = getInternalOrder(selectedOrder.id);

      if (!internalOrder) {
        const newOrderId = await supabaseOrderService.createOrderFromShopify(selectedOrder, 'pending');
        await queryClient.invalidateQueries({ queryKey: ['orders'] });
        await queryClient.refetchQueries({ queryKey: ['orders'] });
        internalOrder = queryClient
          .getQueryData<any[]>(['orders'])
          ?.find((order) => order.id === newOrderId) || null;
      }

      if (!internalOrder) {
        throw new Error('Order could not be synced into the database for address editing.');
      }

      await supabaseOrderService.updateShippingAddress(internalOrder.id, {
        address_line_1: address.address1,
        address_line_2: address.address2 || null,
        city: address.city,
        state: address.province || null,
        postal_code: address.zip || null,
        country: address.country,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.refetchQueries({ queryKey: ['orders'] }),
      ]);

      setSelectedOrder((prev: any) =>
        prev
          ? {
              ...prev,
              shipping_address: {
                ...prev.shipping_address,
                address1: address.address1,
                address2: address.address2,
                city: address.city,
                province: address.province,
                zip: address.zip,
                country: address.country,
              },
            }
          : prev
      );

      toast({
        title: 'Address updated',
        description: 'Shipping address saved to the database.',
      });
    } catch (error) {
      console.error('Failed to update shipping address:', error);
      toast({
        title: 'Address update failed',
        description: error instanceof Error ? error.message : 'Failed to save the shipping address.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleStageChange = (orderId: string | number) => {
    setStatusDialogOrderId(orderId);
    setOpenStageDialog(true);
  };

  const getInternalOrder = (shopifyOrderId: string | number) => {
    return internalOrderMap.get(Number(shopifyOrderId));
  };

  const handleSelectOrder = (shopifyOrderId: string | number, checked: boolean) => {
    setSelectedShopifyOrderIds((prev) => {
      const next = new Set(prev);
      const key = String(shopifyOrderId);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handleSelectAllCurrentPage = (checked: boolean) => {
    setSelectedShopifyOrderIds((prev) => {
      const next = new Set(prev);
      paginationData.currentOrders.forEach((order) => {
        const key = String(order.id);
        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
      });
      return next;
    });
  };

  const handleBulkStageChange = async () => {
    if (!bulkTargetStage || selectedShopifyOrderIds.size === 0) {
      toast({
        title: 'Bulk update unavailable',
        description: 'Select orders and choose a status first.',
        variant: 'destructive',
      });
      return;
    }

    setIsBulkSyncing(true);
    try {
      // 1. Resolve internal DB IDs for every selected Shopify order. Anything
      //    that isn't synced yet is upserted via createOrderFromShopify so the
      //    bulk DB stage update can target it.
      const selectedShopifyArr = Array.from(selectedShopifyOrderIds);
      const internalIds: string[] = [];
      const syncFailures: string[] = [];

      await Promise.all(
        selectedShopifyArr.map(async (shopifyId) => {
          const existing = internalOrderMap.get(Number(shopifyId));
          if (existing) {
            internalIds.push(existing.id);
            return;
          }
          const shopifyOrder = shopifyOrders.find(
            (o) => String(o.id) === String(shopifyId)
          );
          if (!shopifyOrder) {
            syncFailures.push(shopifyId);
            return;
          }
          try {
            const newId = await supabaseOrderService.createOrderFromShopify(
              shopifyOrder,
              'pending'
            );
            internalIds.push(newId);
          } catch (err) {
            console.error(`Failed to sync Shopify order ${shopifyId} to DB:`, err);
            syncFailures.push(shopifyId);
          }
        })
      );

      if (internalIds.length === 0) {
        toast({
          title: 'Bulk update failed',
          description: 'No orders could be synced to the local database.',
          variant: 'destructive',
        });
        return;
      }

      // 2. DB stage update (skip for inprogress — it's a Shopify-only status,
      //    not a pipeline stage).
      if (bulkTargetStage !== 'inprogress') {
        await bulkUpdateStageMutation.mutateAsync({
          orderIds: internalIds,
          stage: bulkTargetStage,
        });
      }

      // 3. Shopify side-effect per selected order:
      //    - hold        → put Shopify on_hold
      //    - inprogress  → mark Shopify in_progress (release hold if needed)
      //    - printing/packing/tracking → release hold + mark open → unfulfilled
      //    - pending     → leave Shopify alone (parked locally only)
      const stageToShopifyTarget: Partial<
        Record<BulkTarget, 'hold' | 'inprogress' | 'pending'>
      > = {
        hold: 'hold',
        inprogress: 'inprogress',
        printing: 'pending',
        packing: 'pending',
        tracking: 'pending',
      };
      const shopifyTarget = stageToShopifyTarget[bulkTargetStage];

      if (shopifyTarget) {
        const failed: string[] = [];
        await Promise.all(
          selectedShopifyArr.map(async (sid) => {
            try {
              await supabaseOrderService.syncShopifyOrderStage(sid, shopifyTarget);
            } catch (err) {
              console.error(`Shopify sync failed for ${sid}:`, err);
              failed.push(sid);
            }
          })
        );

        if (failed.length > 0) {
          toast({
            title: 'Shopify sync partially failed',
            description: `${failed.length} of ${selectedShopifyArr.length} orders failed to sync to Shopify.`,
            variant: 'destructive',
          });
        }
      }

      if (syncFailures.length > 0) {
        toast({
          title: 'Some orders not synced',
          description: `${syncFailures.length} order(s) could not be synced from Shopify into the DB.`,
          variant: 'destructive',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['shopify-orders'] });
      queryClient.invalidateQueries({ queryKey: ['shopify-held-order-ids'] });

      setSelectedShopifyOrderIds(new Set());
      setBulkTargetStage('');
    } catch (error) {
      console.error('Bulk stage change failed:', error);
      toast({
        title: 'Bulk update failed',
        description: error instanceof Error ? error.message : 'Unexpected error during bulk update.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkSyncing(false);
    }
  };

  // Bulk dropdown shows both Shopify statuses (hold/inprogress) and pipeline
  // stages. Each option handles BOTH the DB stage update AND the Shopify
  // side-effect (see stageToShopifyTarget above). Hide the option that matches
  // the currently active tab so we don't show no-op moves.
  const bulkStageOptions: BulkTarget[] = (
    ['hold', 'inprogress', 'printing', 'packing', 'tracking'] as BulkTarget[]
  ).filter((opt) => {
    if (activeTab === 'hold' && opt === 'hold') return false;
    if (activeTab === 'inprogress' && opt === 'inprogress') return false;
    return true;
  });

  const bulkOptionLabels: Record<BulkTarget, string> = {
    hold: 'Hold (status)',
    inprogress: 'In Progress (status)',
    pending: 'Pending',
    printing: 'Printing',
    packing: 'Packing',
    tracking: 'Tracking',
    shipped: 'Shipped',
    delivered: 'Delivered',
    delivery: 'Delivery',
  };

  const handleEditStatus = (shopifyOrder: any) => {
    // Open the dialog immediately. The dropdown renders right away using the
    // Shopify order data, and any required local DB sync happens lazily on
    // submit inside OrderStatusChangeControls.
    handleStageChange(shopifyOrder.id);
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

  // Handle error state for the main Shopify order feed only.
  if (shopifyOrdersError) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={isHoldRoute ? 'Hold Orders' : 'Orders Management'} />
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
                {isHoldRoute ? (
                  <div className="inline-flex items-center rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 border border-red-200">
                    Hold Orders ({tabCounts.hold})
                  </div>
                ) : (
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as 'processing' | 'inprogress' | 'hold')}
                  >
                    <TabsList className="grid w-full grid-cols-2 md:w-[280px]">
                      <TabsTrigger value="processing">
                        Processing ({tabCounts.processing})
                      </TabsTrigger>
                      <TabsTrigger value="inprogress">
                        In Progress ({tabCounts.inprogress})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

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

              {heldOrdersError && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Hold/In Progress orders could not be fetched from Shopify. These counts may be incomplete.
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-gray-600">
                  {selectedShopifyOrderIds.size === 0
                    ? 'No orders selected'
                    : `${selectedShopifyOrderIds.size} orders selected`}
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Select value={bulkTargetStage} onValueChange={(value) => setBulkTargetStage(value as BulkTarget)}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Bulk change status" />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkStageOptions.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {bulkOptionLabels[stage]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleBulkStageChange}
                    disabled={
                      selectedShopifyOrderIds.size === 0 ||
                      !bulkTargetStage ||
                      bulkUpdateStageMutation.isPending ||
                      isBulkSyncing
                    }
                  >
                    {bulkUpdateStageMutation.isPending || isBulkSyncing ? 'Updating...' : 'Update Selected'}
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
                  {activeTab === 'hold' ? 'Hold Orders' : activeTab === 'inprogress' ? 'In Progress Orders' : 'Processing Orders'} ({totalOrders} total, showing {totalOrders === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalOrders)})
                </CardTitle>
                <Button onClick={handleSyncFromShopify}>
                  Sync from Shopify
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner text={isLoadingHeldOrders ? "Loading Shopify and hold orders..." : "Loading Shopify orders..."} />
                </div>
              ) : currentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500">
                    {searchTerm || dateFilter || statusFilter !== 'all'
                      ? 'No orders match your search criteria.'
                      : (activeTab === 'hold' || activeTab === 'inprogress') && heldOrdersError
                      ? `${activeTab === 'hold' ? 'Hold' : 'In Progress'} orders could not be loaded from Shopify.`
                      : activeTab === 'inprogress'
                      ? 'No in progress orders available.'
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
                          const isSelected = selectedShopifyOrderIds.has(String(order.id));
                          return (
                          <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              <Checkbox
                                checked={isSelected}
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
                                  onClick={() => handleEditStatus(order)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
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
        canEditShippingAddress={Boolean(selectedOrder)}
        onSaveShippingAddress={handleSaveShippingAddress}
      />

      <Dialog
        open={openStageDialog}
        onOpenChange={(open) => {
          setOpenStageDialog(open);
          if (!open) setStatusDialogOrderId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Order Status</DialogTitle>
          </DialogHeader>
          {statusDialogOrderId ? (
            <OrderStatusChangeControls
              internalOrder={getInternalOrder(statusDialogOrderId) ?? null}
              shopifyOrder={shopifyOrders.find(
                (o) => String(o.id) === String(statusDialogOrderId)
              )}
              shopifyOrderId={statusDialogOrderId}
              currentStatus={getOrderQueueStatus(statusDialogOrderId)}
              onStatusChange={() => {
                setOpenStageDialog(false);
                setStatusDialogOrderId(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
