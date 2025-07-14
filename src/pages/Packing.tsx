import React, { useState, useEffect } from 'react';
import { Package, Scan, User, Mail, Phone, MapPin, Weight, Truck, CheckCircle, AlertTriangle, Hash, BarChart3, ArrowRight, Settings } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import MobileSidebar from '@/components/layout/MobileSidebar';
import PackingQueue from '@/components/packing/PackingQueue';
import PackingStats from '@/components/packing/PackingStats';
import StageChangeControls from '@/components/common/StageChangeControls';
import { useOrdersByStage, useUpdateOrderStage } from '@/hooks/useOrders';
import { useItemScanning } from '@/hooks/useItemScanning';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Order } from '@/types/database';

interface PackingProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user: { email: string; role: string; name: string };
  onLogout: () => void;
}

const Packing = ({ onMenuClick, isMobileMenuOpen, setIsMobileMenuOpen, user, onLogout }: PackingProps) => {
  const { data: packingOrders = [], isLoading: packingLoading } = useOrdersByStage('packing');
  const { data: trackingOrders = [] } = useOrdersByStage('tracking');
  const updateOrderStage = useUpdateOrderStage();
  
  const [orderScanInput, setOrderScanInput] = useState('');
  const [skuScanInput, setSkuScanInput] = useState('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderLoadedMessage, setOrderLoadedMessage] = useState('');
  const [showStageDialog, setShowStageDialog] = useState(false);

  const {
    scanProgress,
    initializeScanProgress,
    scanItem,
    isOrderComplete,
    getOrderProgress,
    isScanning
  } = useItemScanning(currentOrder);

  const isLoading = packingLoading;

  // Calculate stats
  const readyToPack = packingOrders.length;
  const readyForTracking = trackingOrders.length;

  // Initialize scan progress when order is loaded
  useEffect(() => {
    if (currentOrder) {
      console.log('Initializing scan progress for order:', currentOrder.order_number);
      initializeScanProgress(currentOrder);
    }
  }, [currentOrder]);

  const handleOrderScan = () => {
    if (!orderScanInput.trim()) return;
    
    console.log('Scanning for order:', orderScanInput);
    
    // Find order by order number or ID
    const order = packingOrders.find(o => 
      o.order_number === orderScanInput || 
      o.id === orderScanInput ||
      o.order_number === `#${orderScanInput}` ||
      o.order_number.replace('#', '') === orderScanInput
    );
    
    if (order) {
      console.log('Order found:', order.order_number);
      setCurrentOrder(order);
      setOrderLoadedMessage(`Order #${order.order_number.replace('#', '')} loaded - Ready for SKU scanning`);
      setOrderScanInput('');
    } else {
      console.log('Order not found:', orderScanInput);
      setOrderLoadedMessage('');
      setCurrentOrder(null);
      toast.error(`Order "${orderScanInput}" not found in packing queue`);
    }
  };

  const handleSkuScan = () => {
    if (!skuScanInput.trim() || !currentOrder) return;
    
    console.log('SKU scan attempt:', skuScanInput);
    const success = scanItem(skuScanInput);
    if (success) {
      setSkuScanInput('');
    }
  };

  const handleManualStageChange = (orderId: string, orderNumber: string, newStage: 'tracking' | 'shipped') => {
    console.log(`Manually moving order ${orderNumber} to ${newStage} stage`);
    updateOrderStage.mutate({ 
      orderId, 
      stage: newStage 
    }, {
      onSuccess: () => {
        if (currentOrder && currentOrder.id === orderId) {
          setCurrentOrder(null);
          setOrderLoadedMessage('');
          setOrderScanInput('');
          setSkuScanInput('');
        }
      }
    });
  };

  const resetScanner = () => {
    setCurrentOrder(null);
    setOrderLoadedMessage('');
    setOrderScanInput('');
    setSkuScanInput('');
    setShowStageDialog(false);
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
      <>
        <MobileSidebar 
          user={user}
          onLogout={onLogout}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex flex-col h-full">
          <Header title="Packing" showSearch={false} onMenuClick={onMenuClick} />
          <div className="flex-1 p-6 bg-gray-50">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-500">Loading packing data...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { scannedItems, totalItems } = getOrderProgress();
  const progressPercentage = totalItems > 0 ? (scannedItems / totalItems) * 100 : 0;
  const orderComplete = isOrderComplete();

  return (
    <>
      <MobileSidebar 
        user={user}
        onLogout={onLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex flex-col h-full">
        <Header title="Packing" showSearch={false} onMenuClick={onMenuClick} />
      
      <div className="flex-1 p-3 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6">
          
          {/* Packing Analytics */}
          <PackingStats orders={packingOrders} />

          {/* Main Packing Interface */}
          <div className="mobile-grid lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Left Column - Barcode Scanner */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Scan className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  <CardTitle className="text-base sm:text-lg">Barcode Scanner</CardTitle>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">
                  Scan order ID to load, then scan product SKUs to pack items
                </p>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                
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
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
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
                      className="mobile-button sm:px-3"
                      disabled={!!currentOrder}
                    >
                      <Scan className="h-4 w-4 sm:mr-1" />
                      <span className="sm:hidden">Scan Order</span>
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

                {/* Scanning Progress */}
                {currentOrder && (
                  <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800">Scanning Progress</span>
                      <Badge variant="outline" className="bg-white">
                        {scannedItems}/{totalItems}
                      </Badge>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <p className="text-xs text-blue-600">
                      {progressPercentage.toFixed(0)}% completed
                    </p>
                    {orderComplete && (
                      <div className="flex items-center space-x-2 p-2 bg-green-100 border border-green-300 rounded">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800 font-medium">All items scanned! Ready to dispatch.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Product SKU Scanner - Only show when order is loaded */}
                {currentOrder && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Product SKU Scanner</label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Scan product SKU or name"
                        value={skuScanInput}
                        onChange={(e) => setSkuScanInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSkuScan()}
                        className="flex-1"
                        disabled={isScanning}
                      />
                      <Button 
                        onClick={handleSkuScan}
                        size="sm"
                        variant="outline"
                        className="px-3"
                        disabled={isScanning}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Manual Stage Controls */}
                {currentOrder && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Stage Management</label>
                      <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4 mr-1" />
                            Change Stage
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Change Order Stage</DialogTitle>
                          </DialogHeader>
                          <StageChangeControls 
                            order={currentOrder} 
                            currentStage="packing"
                            onStageChange={() => {
                              setShowStageDialog(false);
                              resetScanner();
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => handleManualStageChange(currentOrder.id, currentOrder.order_number, 'tracking')}
                        disabled={updateOrderStage.isPending}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Move to Tracking
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                      <Button 
                        onClick={() => handleManualStageChange(currentOrder.id, currentOrder.order_number, 'shipped')}
                        disabled={updateOrderStage.isPending}
                        size="sm"
                        variant="outline"
                      >
                        Mark as Shipped
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Use these controls to manually move orders between stages
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Column - Current Order Details */}
            <Card>
              <CardHeader>
                <div className="mobile-row">
                  <CardTitle className="text-base sm:text-lg">Current Order Details</CardTitle>
                  {currentOrder && (
                    <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Change Order Stage</DialogTitle>
                        </DialogHeader>
                        <StageChangeControls 
                          order={currentOrder} 
                          currentStage="packing"
                          onStageChange={() => {
                            setShowStageDialog(false);
                            resetScanner();
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
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
                            PACKING
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
                    <div className="mobile-grid sm:grid-cols-2 gap-4 pt-4 border-t">
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

                    {/* Required Items with Scan Progress */}
                    <div className="pt-4 border-t">
                      <p className="font-medium text-sm mb-3">Required Items:</p>
                      <div className="space-y-3">
                        {currentOrder.order_items.map((item) => {
                          const itemProgress = scanProgress[item.id];
                          return (
                            <div key={item.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{item.title}</p>
                                  {item.sku ? (
                                    <div className="flex items-center space-x-1 mt-1">
                                      <Hash className="h-3 w-3 text-blue-600" />
                                      <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border font-bold">
                                        {item.sku}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1 mt-1">
                                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                                      <span className="text-xs text-orange-600">No SKU - Search by name</span>
                                    </div>
                                  )}
                                </div>
                                <Badge 
                                  variant={itemProgress?.completed ? "default" : "outline"}
                                  className={itemProgress?.completed ? "bg-green-100 text-green-800" : ""}
                                >
                                  {itemProgress?.scannedCount || 0}/{item.quantity}
                                </Badge>
                              </div>
                              {itemProgress && item.quantity > 1 && (
                                <Progress 
                                  value={(itemProgress.scannedCount / itemProgress.requiredCount) * 100} 
                                  className="h-1"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Overall Progress */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Overall Progress:</span>
                        <span className="text-sm font-medium">
                          {scannedItems} / {totalItems} items scanned
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
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
              <PackingQueue />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
};

export default Packing;
