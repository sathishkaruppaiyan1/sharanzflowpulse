
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, RefreshCw, Eye, Package, Clock } from 'lucide-react';
import { orderService, Order } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Fetch orders using React Query
  const { 
    data: orders = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => {
      if (statusFilter === 'all') {
        return orderService.fetchOrders();
      }
      return orderService.fetchOrdersByStatus(statusFilter as Order['status']);
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Auto-check for new orders
  useEffect(() => {
    const checkNewOrders = async () => {
      try {
        const newOrders = await orderService.getNewOrders();
        if (newOrders.length > 0) {
          toast({
            title: "New Orders Received",
            description: `${newOrders.length} new order(s) added to the system`,
          });
          refetch(); // Refresh the orders list
        }
      } catch (error) {
        console.error('Error checking new orders:', error);
      }
    };

    const interval = setInterval(checkNewOrders, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, [toast, refetch]);

  // Filter orders based on search term
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const lowercaseSearch = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(lowercaseSearch) ||
      order.customerName.toLowerCase().includes(lowercaseSearch) ||
      order.email.toLowerCase().includes(lowercaseSearch) ||
      order.items.some(item => 
        item.name.toLowerCase().includes(lowercaseSearch) ||
        item.sku.toLowerCase().includes(lowercaseSearch)
      )
    );
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { variant: 'default' as const, label: 'New', color: 'bg-blue-100 text-blue-800' },
      processing: { variant: 'secondary' as const, label: 'Processing', color: 'bg-yellow-100 text-yellow-800' },
      printed: { variant: 'outline' as const, label: 'Printed', color: 'bg-purple-100 text-purple-800' },
      packed: { variant: 'outline' as const, label: 'Packed', color: 'bg-green-100 text-green-800' },
      shipped: { variant: 'outline' as const, label: 'Shipped', color: 'bg-indigo-100 text-indigo-800' },
      delivered: { variant: 'outline' as const, label: 'Delivered', color: 'bg-green-100 text-green-800' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      urgent: { variant: 'destructive' as const, label: 'Urgent', color: 'bg-red-100 text-red-800' },
      high: { variant: 'destructive' as const, label: 'High', color: 'bg-orange-100 text-orange-800' },
      normal: { variant: 'outline' as const, label: 'Normal', color: 'bg-gray-100 text-gray-800' },
      low: { variant: 'secondary' as const, label: 'Low', color: 'bg-gray-100 text-gray-600' },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
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

  if (error) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Orders Management" />
        <main className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load orders</h3>
            <p className="text-gray-500 mb-4">There was an error fetching your orders.</p>
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
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold">{orders.length}</p>
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
                    <p className="text-2xl font-bold text-blue-600">
                      {orders.filter(o => o.status === 'new').length}
                    </p>
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
                    <p className="text-2xl font-bold text-yellow-600">
                      {orders.filter(o => o.status === 'processing').length}
                    </p>
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
                    <p className="text-2xl font-bold text-green-600">
                      {orders.filter(o => o.status === 'shipped').length}
                    </p>
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
                      placeholder="Search by order ID, customer name, email, or SKU..."
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
                    <SelectItem value="printed">Printed</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
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
                <CardTitle>Orders ({filteredOrders.length})</CardTitle>
                <Button onClick={handleSyncFromShopify}>
                  Sync from Shopify
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner text="Loading orders..." />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500">
                    {searchTerm ? 'No orders match your search criteria.' : 'No orders available.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Order ID</th>
                        <th className="text-left py-3 px-4 font-medium">Customer</th>
                        <th className="text-left py-3 px-4 font-medium">Items</th>
                        <th className="text-left py-3 px-4 font-medium">Total</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Priority</th>
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-sm font-medium">{order.id}</td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">{order.customerName}</div>
                              <div className="text-sm text-gray-500">{order.email}</div>
                              <div className="text-sm text-gray-500">{order.phone}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">{order.items.length} items</div>
                              <div className="text-sm text-gray-500">
                                {order.items.slice(0, 2).map(item => item.name).join(', ')}
                                {order.items.length > 2 && '...'}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">{order.total}</td>
                          <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                          <td className="py-3 px-4">{getPriorityBadge(order.priority)}</td>
                          <td className="py-3 px-4 text-sm text-gray-500">{order.date}</td>
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Orders;
