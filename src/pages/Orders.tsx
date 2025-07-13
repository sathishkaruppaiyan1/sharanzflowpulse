import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/layout/Header';
import MobileSidebar from '@/components/layout/MobileSidebar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import OrderDetails from '@/components/orders/OrderDetails';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Search, RefreshCw, Eye, Package, Clock } from 'lucide-react';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { useToast } from '@/hooks/use-toast';

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

interface OrdersProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user: { email: string; role: string; name: string };
  onLogout: () => void;
}

const Orders = ({ onMenuClick, isMobileMenuOpen, setIsMobileMenuOpen, user, onLogout }: OrdersProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const { toast } = useToast();
  
  // Debounce search term to avoid filtering on every keystroke
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Use Shopify orders instead of mock orders - sort by newest first
  const { 
    orders: rawShopifyOrders = [], 
    loading: isLoading, 
    error, 
    refetch 
  } = useShopifyOrders();

  // Sort orders by newest first (created_at descending)
  const shopifyOrders = useMemo(() => {
    return [...rawShopifyOrders].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Newest first
    });
  }, [rawShopifyOrders]);

  // Memoized filter function for better performance
  const filteredOrders = useMemo(() => {
    return shopifyOrders.filter(order => {
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
  }, [shopifyOrders, debouncedSearchTerm, statusFilter, dateFilter]);

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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, dateFilter]);

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
      <>
        <MobileSidebar 
          user={user}
          onLogout={onLogout}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Orders Management" onMenuClick={onMenuClick} />
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
      </>
    );
  }

  return (
    <>
      <MobileSidebar 
        user={user}
        onLogout={onLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Orders Management" onMenuClick={onMenuClick} />
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
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
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
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
            </CardContent>
          </Card>

          {/* Orders List */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  Shopify Orders ({totalOrders} total, showing {startIndex + 1}-{Math.min(endIndex, totalOrders)})
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
                    {searchTerm || dateFilter || statusFilter !== 'all' ? 'No orders match your search criteria.' : 'No Shopify orders available.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
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
                        {currentOrders.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
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
                              <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex justify-between items-center">
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

      <OrderDetails
        open={showOrderDetails}
        onClose={() => setShowOrderDetails(false)}
        order={selectedOrder}
      />
      </div>
    </>
  );
};

export default Orders;
