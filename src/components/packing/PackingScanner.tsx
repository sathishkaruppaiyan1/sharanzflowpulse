
import React, { useState, useRef, useEffect } from 'react';
import { Scan, Package, CheckCircle, User, Phone, AlertTriangle, Truck, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Order } from '@/types/database';
import { usePackingScanner } from '@/hooks/usePackingScanner';
import { toast } from 'sonner';
import { getPhoneNumber } from '@/lib/utils';
import { getVariationDisplayText, normalizeItemForDisplay } from '@/utils/productVariationUtils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PackingScannerProps {
  orders: Order[];
  onItemPacked?: (orderId: string, itemId: string) => void;
  onOrderSelected?: (order: Order | null) => void;
}

const PackingScanner = ({ orders, onItemPacked, onOrderSelected }: PackingScannerProps) => {
  const [orderInput, setOrderInput] = useState('');
  const [skuInput, setSkuInput] = useState('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const orderInputRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { scanItem, getOrderProgress, isOrderComplete } = usePackingScanner(currentOrder);

  // Bulk move mutation
  const bulkMoveToTracking = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const promises = orderIds.map(orderId => 
        supabase
          .from('orders')
          .update({ 
            stage: 'tracking',
            packed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Successfully moved ${selectedOrders.size} orders to tracking stage`);
      setSelectedOrders(new Set());
    },
    onError: (error) => {
      console.error('Error moving orders to tracking:', error);
      toast.error('Failed to move some orders. Please try again.');
    },
  });

  // Focus order input on mount
  useEffect(() => {
    orderInputRef.current?.focus();
  }, []);

  const handleOrderScan = () => {
    const orderNumber = orderInput.trim();
    if (!orderNumber) {
      toast.error('Please enter an order number');
      return;
    }

    const foundOrder = orders.find(order => 
      order.order_number.toLowerCase().includes(orderNumber.toLowerCase()) ||
      order.id === orderNumber
    );

    if (!foundOrder) {
      toast.error(`Order "${orderNumber}" not found in packing queue`);
      return;
    }

    setCurrentOrder(foundOrder);
    onOrderSelected?.(foundOrder);
    setOrderInput('');
    
    // Focus SKU input after order is loaded
    setTimeout(() => skuInputRef.current?.focus(), 100);
    
    toast.success(`✅ Order ${foundOrder.order_number} loaded successfully`);
  };

  const handleSkuScan = () => {
    const sku = skuInput.trim();
    if (!sku) {
      toast.error('Please enter a SKU');
      return;
    }

    const success = scanItem(sku);
    if (success) {
      setSkuInput('');
      onItemPacked?.(currentOrder!.id, ''); // Trigger refresh
    }
  };

  const handleOrderInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleOrderScan();
    }
  };

  const handleSkuInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSkuScan();
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const readyOrders = orders.filter(order => 
        order.order_items.every(item => item.packed)
      );
      setSelectedOrders(new Set(readyOrders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleBulkMoveToTracking = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select orders to move');
      return;
    }

    setIsBulkProcessing(true);
    try {
      await bulkMoveToTracking.mutateAsync(Array.from(selectedOrders));
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const progress = getOrderProgress();
  const readyOrders = orders.filter(order => order.order_items.every(item => item.packed));
  const allReadySelected = readyOrders.length > 0 && readyOrders.every(order => selectedOrders.has(order.id));

  return (
    <div className="space-y-6">
      {/* Scanner Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            1. Scan Order ID
          </label>
          <div className="flex space-x-2">
            <Input
              ref={orderInputRef}
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              onKeyPress={handleOrderInputKeyPress}
              placeholder="Enter order number"
              className="flex-1"
            />
            <Button 
              onClick={handleOrderScan}
              size="sm"
              className="px-4"
            >
              <Package className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            2. Scan Product SKU
          </label>
          <div className="flex space-x-2">
            <Input
              ref={skuInputRef}
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              onKeyPress={handleSkuInputKeyPress}
              placeholder="Enter product SKU"
              disabled={!currentOrder}
              className="flex-1"
            />
            <Button 
              onClick={handleSkuScan}
              disabled={!currentOrder}
              size="sm"
              className="px-4"
            >
              <Scan className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Order Progress */}
      {currentOrder && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {currentOrder.order_number}
                  </span>
                  <Badge variant="outline" className="bg-white">
                    {progress.packedItems}/{progress.totalItems} packed
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {getPhoneNumber(currentOrder) ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <Phone className="h-3 w-3" />
                    <span className="text-sm font-medium">{getPhoneNumber(currentOrder)}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-red-500">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-sm">No phone</span>
                  </div>
                )}
                
                {isOrderComplete() && (
                  <Badge className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready for Dispatch
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Order Selection */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-purple-900 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Bulk Order Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bulk Actions Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Checkbox
                checked={allReadySelected}
                onCheckedChange={handleSelectAll}
                className="border-purple-400"
              />
              <span className="text-sm font-medium text-purple-900">
                Select All Ready Orders ({readyOrders.length} ready)
              </span>
              {selectedOrders.size > 0 && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {selectedOrders.size} selected
                </Badge>
              )}
            </div>
            {selectedOrders.size > 0 && (
              <Button
                onClick={handleBulkMoveToTracking}
                disabled={isBulkProcessing}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Truck className="h-4 w-4 mr-2" />
                Move to Tracking ({selectedOrders.size})
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          {/* Ready Orders List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {readyOrders.length > 0 ? (
              readyOrders.map((order) => {
                const isSelected = selectedOrders.has(order.id);
                const phoneNumber = getPhoneNumber(order);
                
                return (
                  <div 
                    key={order.id} 
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      isSelected ? 'bg-purple-100 border-purple-300' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                        className="border-purple-400"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm text-purple-900">
                            {order.order_number}
                          </span>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            {order.order_items.length} items ready
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {order.customer?.first_name} {order.customer?.last_name}
                          {phoneNumber && (
                            <span className="ml-2 text-green-600">📱 {phoneNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No orders ready for dispatch</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PackingScanner;
