
import React, { useState, useEffect } from 'react';
import { Package, Scan, User, Mail, Phone, MapPin, Weight, Truck, CheckCircle, AlertTriangle } from 'lucide-react';
import Header from '@/components/layout/Header';
import PackingQueue from '@/components/packing/PackingQueue';
import PackingStats from '@/components/packing/PackingStats';
import { useOrdersByStage } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/types/database';

const Packing = () => {
  const { data: packingOrders = [], isLoading: packingLoading } = useOrdersByStage('packing');
  const { data: trackingOrders = [] } = useOrdersByStage('tracking');
  
  const [orderScanInput, setOrderScanInput] = useState('');
  const [skuScanInput, setSkuScanInput] = useState('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderLoadedMessage, setOrderLoadedMessage] = useState('');

  const isLoading = packingLoading;

  // Calculate stats
  const readyToPack = packingOrders.length;
  const readyForTracking = trackingOrders.length;

  const handleOrderScan = () => {
    if (!orderScanInput.trim()) return;
    
    // Find order by order number or ID
    const order = packingOrders.find(o => 
      o.order_number === orderScanInput || 
      o.id === orderScanInput ||
      o.order_number === `#${orderScanInput}` ||
      o.order_number.replace('#', '') === orderScanInput
    );
    
    if (order) {
      setCurrentOrder(order);
      setOrderLoadedMessage(`Order #${order.order_number.replace('#', '')} loaded`);
      setOrderScanInput('');
    } else {
      setOrderLoadedMessage('');
      setCurrentOrder(null);
      alert('Order not found in packing queue');
    }
  };

  const handleSkuScan = () => {
    if (!skuScanInput.trim() || !currentOrder) return;
    
    // Check if scanned SKU matches any item in current order
    const matchingItem = currentOrder.order_items.find(item => 
      item.sku === skuScanInput || 
      item.title.toLowerCase().includes(skuScanInput.toLowerCase())
    );
    
    if (matchingItem) {
      // Correct SKU scanned - move to next stage or mark as packed
      console.log('Correct SKU scanned:', skuScanInput);
      setSkuScanInput('');
      // Here you would typically update the item as packed
    } else {
      // Wrong SKU scanned
      alert('You scanned wrong product');
      setSkuScanInput('');
    }
  };

  const resetScanner = () => {
    setCurrentOrder(null);
    setOrderLoadedMessage('');
    setOrderScanInput('');
    setSkuScanInput('');
  };

  const getPriorityBadge = (order: Order) => {
    const createdDate = new Date(order.created_at);
    const hoursSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
    const isUrgent = hoursSinceCreated > 24;
    
    return (
      <Badge 
        variant="secondary"
        className={isUrgent ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}
      >
        Priority: {isUrgent ? 'urgent' : 'normal'}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Packing" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading packing data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Packing" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Packing Analytics */}
          <PackingStats orders={packingOrders} />

          {/* Main Packing Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column - Barcode Scanner */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Scan className="h-5 w-5 text-gray-600" />
                  <CardTitle className="text-lg">Barcode Scanner</CardTitle>
                </div>
                <p className="text-sm text-gray-600">
                  Scan order ID or order number to load complete order details
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Order Scanner */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Order Scanner</label>
                    {currentOrder && (
                      <Button 
                        onClick={resetScanner}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        Reset Scanner
                      </Button>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Scan or enter Order ID/Number"
                      value={orderScanInput}
                      onChange={(e) => setOrderScanInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleOrderScan()}
                      className="flex-1"
                      disabled={!!currentOrder}
                    />
                    <Button 
                      onClick={handleOrderScan}
                      size="sm"
                      variant="outline"
                      className="px-3"
                      disabled={!!currentOrder}
                    >
                      <Scan className="h-4 w-4" />
                    </Button>
                  </div>
                  {currentOrder && (
                    <p className="text-xs text-gray-500">
                      Order scanner is locked. Complete SKU scanning or reset to scan another order.
                    </p>
                  )}
                </div>

                {/* Order Loaded Message */}
                {orderLoadedMessage && (
                  <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{orderLoadedMessage}</span>
                  </div>
                )}

                {/* Product SKU Scanner - Only show when order is loaded */}
                {currentOrder && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Product SKU Scanner</label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Scan product SKU"
                        value={skuScanInput}
                        onChange={(e) => setSkuScanInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSkuScan()}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSkuScan}
                        size="sm"
                        variant="outline"
                        className="px-3"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Column - Current Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Order Details</CardTitle>
              </CardHeader>
              <CardContent>
                {currentOrder ? (
                  <div className="space-y-4">
                    
                    {/* Order Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Packing order #{currentOrder.order_number.replace('#', '')}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            PRINTED
                          </Badge>
                          {getPriorityBadge(currentOrder)}
                        </div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {currentOrder.customer?.first_name} {currentOrder.customer?.last_name}
                        </span>
                      </div>
                      
                      {currentOrder.customer?.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{currentOrder.customer.email}</span>
                        </div>
                      )}
                      
                      {currentOrder.customer?.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{currentOrder.customer.phone}</span>
                        </div>
                      )}
                      
                      {currentOrder.shipping_address && (
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div className="text-sm text-gray-600">
                            <p>{currentOrder.shipping_address.address_line_1}</p>
                            {currentOrder.shipping_address.address_line_2 && (
                              <p>{currentOrder.shipping_address.address_line_2}</p>
                            )}
                            <p>{currentOrder.shipping_address.city}, {currentOrder.shipping_address.state} {currentOrder.shipping_address.postal_code} {currentOrder.shipping_address.country}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Order Summary */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-500">Total Items</p>
                        <p className="font-semibold">{currentOrder.order_items.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="font-semibold">₹{currentOrder.total_amount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Weight</p>
                        <div className="flex items-center space-x-1">
                          <Weight className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">400g</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Carrier</p>
                        <div className="flex items-center space-x-1">
                          <Truck className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">Professional Couriers</span>
                        </div>
                      </div>
                    </div>

                    {/* Required Items */}
                    <div className="pt-4 border-t">
                      <p className="font-medium text-sm mb-3">Required Items:</p>
                      <div className="space-y-2">
                        {currentOrder.order_items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{item.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.packed ? 'Packed' : 'Pending'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Progress:</span>
                        <span className="text-sm font-medium">
                          {currentOrder.order_items.filter(item => item.packed).length} / {currentOrder.order_items.length} items
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No order selected</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Scan an order ID or number to start packing
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Orders Ready for Packing - Full Width List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Orders Ready for Packing</CardTitle>
              <p className="text-sm text-gray-600">
                {readyToPack} orders waiting to be packed
              </p>
            </CardHeader>
            <CardContent>
              <PackingQueue orders={packingOrders} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Packing;
