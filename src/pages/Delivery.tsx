import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package, MapPin, Clock, Truck, AlertCircle, Settings, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useDeliveryTracking } from '@/hooks/useDeliveryTracking';
import { useTrackingOrders } from '@/hooks/useTrackingOrders';
import { Link } from 'react-router-dom';

const Delivery = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [searchedOrderNumber, setSearchedOrderNumber] = useState('');
  const { 
    deliveryDetails, 
    isLoading, 
    error, 
    fetchDeliveryDetails,
    deliveryHistory 
  } = useDeliveryTracking();
  const { 
    trackingOrders, 
    isLoading: isLoadingOrders, 
    refreshTracking 
  } = useTrackingOrders();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!orderNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter an order number",
        variant: "destructive",
      });
      return;
    }

    try {
      await fetchDeliveryDetails(orderNumber.trim());
      setSearchedOrderNumber(orderNumber.trim());
      
      // Only show success toast if there's no error
      if (!error) {
        toast({
          title: "Success",
          description: "Delivery details fetched successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch delivery details",
        variant: "destructive",
      });
    }
  };

  const handleRefreshStatus = async () => {
    try {
      await refreshTracking();
      toast({
        title: "Success",
        description: "Status tracking refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh tracking status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_transit':
      case 'transit': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'out_for_delivery': 
      case 'out for delivery': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'exception': 
      case 'returned': 
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': 
      case 'info_received': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Delivery Tracking</h2>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">Search Order</TabsTrigger>
          <TabsTrigger value="status">Status Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4 pr-4">
              {/* Search Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Search className="mr-2 h-5 w-5" />
                    Search Order Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <Label htmlFor="order-number">Order Number</Label>
                      <Input
                        id="order-number"
                        placeholder="Enter order number (e.g., #1001, BS1012)"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleSearch} disabled={isLoading}>
                        {isLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                        Search
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Error Display with Configuration Link */}
              {error && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between py-4">
                      <div className="flex items-center text-red-600">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span>{error}</span>
                      </div>
                      {error.includes('API') && (
                        <Link to="/settings">
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Configure API
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Current Search Results - Only show if we have delivery details and no error */}
              {deliveryDetails && searchedOrderNumber && !error && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Package className="mr-2 h-5 w-5" />
                        Order #{searchedOrderNumber} Delivery Details
                      </div>
                      <Badge className={getStatusColor(deliveryDetails.status)}>
                        {deliveryDetails.sub_status || deliveryDetails.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Overview Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                          <Truck className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">Carrier</p>
                            <p className="text-sm text-gray-600">
                              {deliveryDetails.courier_name || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                          <Package className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">Tracking Number</p>
                            <p className="text-sm text-gray-600">
                              {deliveryDetails.tracking_number || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">Destination</p>
                            <p className="text-sm text-gray-600">
                              {deliveryDetails.destination_country || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">
                              {deliveryDetails.delivered_at ? 'Delivered' : 'Expected Delivery'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(deliveryDetails.delivered_at || deliveryDetails.estimated_delivery_date)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tracking Events */}
                      {deliveryDetails.tracking_events && deliveryDetails.tracking_events.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Tracking History</h3>
                          <div className="space-y-4">
                            {deliveryDetails.tracking_events
                              .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                              .map((event, index) => (
                              <div key={index} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-0">
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                  index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                                }`}></div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">{event.description}</p>
                                    <p className="text-xs text-gray-500">
                                      {formatDate(event.time)}
                                    </p>
                                  </div>
                                  {event.location && (
                                    <p className="text-xs text-gray-600 mt-1">{event.location}</p>
                                  )}
                                  {event.status && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      {event.status}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Delivery History - Only show if there are items in history */}
              {deliveryHistory && deliveryHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Delivery Searches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order Number</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Carrier</TableHead>
                          <TableHead>Tracking Number</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deliveryHistory.map((delivery) => (
                          <TableRow key={delivery.id}>
                            <TableCell className="font-medium">
                              #{delivery.order_number}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(delivery.status)}>
                                {delivery.sub_status || delivery.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{delivery.courier_name || 'N/A'}</TableCell>
                            <TableCell>{delivery.tracking_number || 'N/A'}</TableCell>
                            <TableCell>{formatDate(delivery.last_updated)}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setOrderNumber(delivery.order_number);
                                  setSearchedOrderNumber(delivery.order_number);
                                  fetchDeliveryDetails(delivery.order_number);
                                }}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4 pr-4">
              {/* Status Tracking Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="mr-2 h-5 w-5" />
                      Order Status Tracking
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshStatus}
                      disabled={isLoadingOrders}
                    >
                      {isLoadingOrders ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingOrders ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner />
                      <span className="ml-2">Loading tracking orders...</span>
                    </div>
                  ) : trackingOrders && trackingOrders.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order Number</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Carrier</TableHead>
                          <TableHead>Tracking Number</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trackingOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              #{order.order_number}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.tracking_status || 'pending')}>
                                {order.tracking_sub_status || order.tracking_status || 'Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell>{order.courier_name || 'N/A'}</TableCell>
                            <TableCell>{order.tracking_number || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {order.stage}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(order.tracking_last_updated || order.updated_at)}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setOrderNumber(order.order_number);
                                  setSearchedOrderNumber(order.order_number);
                                  fetchDeliveryDetails(order.order_number);
                                }}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No orders in tracking stage found</p>
                      <p className="text-sm mt-1">Orders will appear here automatically when they move to tracking stage</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Delivery;
