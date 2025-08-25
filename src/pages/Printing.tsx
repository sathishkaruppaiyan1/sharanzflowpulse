
import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Package, CheckCircle2, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PrintingFilters } from '@/components/printing/PrintingFilters';
import { ShippingLabelPreview } from '@/components/printing/ShippingLabelPreview';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useOrders } from '@/hooks/useOrders';
import { useShopifyAutoSync } from '@/hooks/useShopifyAutoSync';
import { ShopifySync } from '@/components/printing/ShopifySync';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, parseISO } from 'date-fns';
import type { Order } from '@/types/database';

interface FilterState {
  searchQuery: string;
  selectedProducts: string[];
  filterType: 'contains' | 'only';
  selectedColors: string[];
  selectedSizes: string[];
  sortOrder: 'newest' | 'oldest';
  dateRange: {
    from: string;
    to: string;
  };
}

const ITEMS_PER_PAGE = 10;

export default function Printing() {
  // Auto-sync Shopify orders every 5 minutes
  useShopifyAutoSync(5);

  const { orders: printingOrders, loading: printingLoading, refetch: refetchPrinting } = useOrders('printing');
  const { orders: packingOrders, loading: packingLoading, refetch: refetchPacking } = useOrders('packing');
  const { toast } = useToast();

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedProducts: [],
    filterType: 'contains',
    selectedColors: [],
    selectedSizes: [],
    sortOrder: 'newest',
    dateRange: { from: '', to: '' }
  });

  // Get filtered orders from database only
  const filteredOrders = useMemo(() => {
    if (!printingOrders) return [];

    let filtered = [...printingOrders];

    // Search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.order_number?.toLowerCase().includes(query) ||
        order.customer?.phone?.includes(query) ||
        order.order_items?.some(item => 
          item.title?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query)
        )
      );
    }

    // Product filter
    if (filters.selectedProducts.length > 0) {
      filtered = filtered.filter(order => {
        const orderProducts = order.order_items?.map(item => item.title?.toLowerCase()) || [];
        
        if (filters.filterType === 'only') {
          return orderProducts.length > 0 && 
                 orderProducts.every(product => 
                   filters.selectedProducts.some(selected => 
                     product?.includes(selected.toLowerCase())
                   )
                 );
        } else {
          return filters.selectedProducts.some(selected =>
            orderProducts.some(product => 
              product?.includes(selected.toLowerCase())
            )
          );
        }
      });
    }

    // Color and size filters
    if (filters.selectedColors.length > 0) {
      filtered = filtered.filter(order =>
        order.order_items?.some(item =>
          filters.selectedColors.some(color =>
            item.variant_title?.toLowerCase().includes(color.toLowerCase()) ||
            item.title?.toLowerCase().includes(color.toLowerCase())
          )
        )
      );
    }

    if (filters.selectedSizes.length > 0) {
      filtered = filtered.filter(order =>
        order.order_items?.some(item =>
          filters.selectedSizes.some(size =>
            item.variant_title?.toLowerCase().includes(size.toLowerCase()) ||
            item.title?.toLowerCase().includes(size.toLowerCase())
          )
        )
      );
    }

    // Date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter(order => {
        if (!order.created_at) return false;
        const orderDate = parseISO(order.created_at).toISOString().split('T')[0];
        const fromDate = filters.dateRange.from || '2000-01-01';
        const toDate = filters.dateRange.to || '2099-12-31';
        return orderDate >= fromDate && orderDate <= toDate;
      });
    }

    // Sort orders
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return filters.sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [printingOrders, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, currentPage]);

  // Stats calculations
  const stats = useMemo(() => {
    const today = new Date();
    const todayPrintedCount = packingOrders?.filter(order => 
      order.printed_at && isToday(parseISO(order.printed_at))
    ).length || 0;

    return {
      todayPrinted: todayPrintedCount,
      readyForPrinting: printingOrders?.length || 0,
      readyForPacking: packingOrders?.length || 0,
      selected: selectedOrders.length
    };
  }, [printingOrders, packingOrders, selectedOrders]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Reset selected orders when page changes
  useEffect(() => {
    setSelectedOrders([]);
  }, [currentPage]);

  const handleOrderSelect = (orderId: string, checked: boolean) => {
    setSelectedOrders(prev => 
      checked 
        ? [...prev, orderId]
        : prev.filter(id => id !== orderId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedOrders(checked ? paginatedOrders.map(order => order.id) : []);
  };

  const handlePrintLabels = () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "No Orders Selected",
        description: "Please select at least one order to print labels.",
        variant: "destructive",
      });
      return;
    }
    setShowLabelPreview(true);
  };

  const handlePrintComplete = async () => {
    try {
      // Move selected orders to packing stage
      for (const orderId of selectedOrders) {
        await supabaseOrderService.updateOrderStage(orderId, 'packing');
      }

      toast({
        title: "Success",
        description: `${selectedOrders.length} order(s) moved to packing stage`,
      });

      // Reset selection and refresh data
      setSelectedOrders([]);
      setShowLabelPreview(false);
      refetchPrinting();
      refetchPacking();

    } catch (error) {
      console.error('Error moving orders to packing:', error);
      toast({
        title: "Error",
        description: "Failed to update order stages. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSyncComplete = () => {
    refetchPrinting();
  };

  if (printingLoading || packingLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Printing Queue</h1>
          <p className="text-gray-600">Print shipping labels for orders</p>
        </div>
        <ShopifySync onSyncComplete={handleSyncComplete} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today Printed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.todayPrinted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready for Printing</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.readyForPrinting}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready for Packing</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.readyForPacking}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.selected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <PrintingFilters
            orders={printingOrders || []}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrintLabels}
            disabled={selectedOrders.length === 0}
            className="min-w-[140px]"
          >
            Print Selected Labels
            {selectedOrders.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedOrders.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Orders Ready for Printing</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={paginatedOrders.length > 0 && selectedOrders.length === paginatedOrders.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-gray-600">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">
                {filters.searchQuery || filters.selectedProducts.length > 0 
                  ? "No orders match your current filters."
                  : "All orders have been processed or there are no new orders to print."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{order.order_number}</h3>
                          <Badge variant="outline">Printing</Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {order.created_at && format(parseISO(order.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Customer</p>
                          <p className="font-medium">
                            {order.customer ? `${order.customer.first_name} ${order.customer.last_name}`.trim() : 'Guest'}
                          </p>
                          {order.customer?.phone && (
                            <p className="text-gray-600">{order.customer.phone}</p>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-gray-600">Items ({order.order_items?.length || 0})</p>
                          {order.order_items?.slice(0, 2).map((item, index) => (
                            <p key={index} className="font-medium">
                              {item.quantity}x {item.title}
                              {item.variant_title && ` (${item.variant_title})`}
                            </p>
                          ))}
                          {(order.order_items?.length || 0) > 2 && (
                            <p className="text-gray-600">+{(order.order_items?.length || 0) - 2} more items</p>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-gray-600">Total</p>
                          <p className="font-medium">
                            {order.currency} {order.total_amount}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Label Preview Modal */}
      {showLabelPreview && (
        <ShippingLabelPreview
          orderIds={selectedOrders}
          onClose={() => setShowLabelPreview(false)}
          onPrintComplete={handlePrintComplete}
        />
      )}
    </div>
  );
}
