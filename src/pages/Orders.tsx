
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Filter, RefreshCw, Eye, Package, Clock } from 'lucide-react';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { useToast } from '@/hooks/use-toast';

const ORDERS_PER_PAGE = 25;

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  
  // Use Shopify orders instead of mock orders
  const { 
    orders: shopifyOrders = [], 
    loading: isLoading, 
    error, 
    refetch 
  } = useShopifyOrders();

  // Auto-check for new orders
  useEffect(() => {
    const checkNewOrders = async () => {
      try {
        await refetch();
        // Note: In a real implementation, you'd compare with previous state
        // to detect new orders and show toast notifications
      } catch (error) {
        console.error('Error checking new orders:', error);
      }
    };

    const interval = setInterval(checkNewOrders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [refetch]);

  // Filter orders based on search term and status
  const filteredOrders = shopifyOrders.filter(order => {
    // Status filter
    if (statusFilter !== 'all') {
      const statusMap = {
        'new': 'unfulfilled',
        'processing': 'partial',
        'shipped': 'fulfilled'
      };
      if (order.fulfillment_status !== statusMap[statusFilter as keyof typeof statusMap]) {
        return false;
      }
    }

    // Search filter
    if (!searchTerm) return true;
    const lowercaseSearch = searchTerm.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(lowercaseSearch) ||
      order.customer_name.toLowerCase().includes(lowercaseSearch) ||
      order.id.toLowerCase().includes(lowercaseSearch)
    );
  });

  // Calculate pagination values
  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);
  const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
  const endIndex = startIndex + ORDERS_PER_PAGE;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const getStatusBadge = (fulfillmentStatus: string, financialStatus: string) => {
    let status = 'new';
    let color = 'bg-blue-100 text-blue-800';
    let label = 'New';

    if (fulfillmentStatus === 'fulfilled') {
      status = 'shipped';
      color = 'bg-green-100 text-green-800';
      label = 'Shipped';
    } else if (fulfillmentStatus === 'partial') {
      status = 'processing';
      color = 'bg-yellow-100 text-yellow-800';
      label = 'Processing';
    } else if (financialStatus === 'paid') {
      status = 'processing';
      color = 'bg-yellow-100 text-yellow-800';
      label = 'Processing';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

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

  const generatePaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    
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
  };

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

  // Calculate stats from Shopify orders
  const totalOrdersCount = shopifyOrders.length;
  const newOrders = shopifyOrders.filter(o => o.fulfillment_status === 'unfulfilled' && o.financial_status === 'pending').length;
  const processingOrders = shopifyOrders.filter(o => o.fulfillment_status === 'partial' || (o.fulfillment_status === 'unfulfilled' && o.financial_status === 'paid')).length;
  const shippedOrders = shopifyOrders.filter(o => o.fulfillment_status === 'fulfilled').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Orders Management" />
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold">{totalOrdersCount}</p>
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
                    <p className="text-2xl font-bold text-blue-600">{newOrders}</p>
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
                    <p className="text-2xl font-bold text-yellow-600">{processingOrders}</p>
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
                    <p className="text-2xl font-bold text-green-600">{shippedOrders}</p>
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

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSyncFromShopify}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
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
                    {searchTerm ? 'No orders match your search criteria.' : 'No Shopify orders available.'}
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
                            <td className="py-3 px-4 font-mono text-sm font-medium">{order.order_number}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{order.customer_name}</div>
                            </td>
                            <td className="py-3 px-4 font-medium">{order.currency} {order.total_amount}</td>
                            <td className="py-3 px-4">
                              {getStatusBadge(order.fulfillment_status, order.financial_status)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                order.financial_status === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : order.financial_status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {order.financial_status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <Button variant="outline" size="sm">
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
    </div>
  );
};

export default Orders;
