
import React, { useState, useRef, useCallback } from 'react';
import { Scan, Package, CheckCircle, X, Camera, Keyboard, Lock, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { useQueryClient } from '@tanstack/react-query';

interface PackingScannerProps {
  orders: any[];
  onItemPacked: (orderId: string, itemId: string) => void;
}

const PackingScanner = ({ orders, onItemPacked }: PackingScannerProps) => {
  const [step, setStep] = useState<'order' | 'sku'>('order');
  const [orderIdInput, setOrderIdInput] = useState('');
  const [skuInput, setSkuInput] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedItem, setMatchedItem] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const orderInputRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const findOrderByNumber = useCallback((orderNumber: string) => {
    return orders.find(order => 
      order.order_number?.toLowerCase() === orderNumber.toLowerCase()
    );
  }, [orders]);

  const findItemBySKU = useCallback((sku: string, order: any) => {
    if (!order.order_items) return null;
    
    return order.order_items.find((item: any) => {
      return item.sku && item.sku.toLowerCase() === sku.toLowerCase();
    });
  }, []);

  const handleOrderScan = async () => {
    if (!orderIdInput.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const order = findOrderByNumber(orderIdInput.trim());
      
      if (!order) {
        toast({
          title: "Order Not Found",
          description: `No order found with number: ${orderIdInput}`,
          variant: "destructive"
        });
        return;
      }

      if (order.stage !== 'packing') {
        toast({
          title: "Order Not Ready",
          description: `Order ${order.order_number} is in ${order.stage} stage, not ready for packing.`,
          variant: "destructive"
        });
        return;
      }

      // Check if all items are already packed
      const unpackedItems = order.order_items?.filter((item: any) => !item.packed) || [];
      if (unpackedItems.length === 0) {
        toast({
          title: "Order Complete",
          description: `All items in order ${order.order_number} are already packed.`,
          variant: "default"
        });
        return;
      }

      setSelectedOrder(order);
      setStep('sku');
      
      toast({
        title: "Order Selected",
        description: `Order ${order.order_number} locked. Now scan SKUs for this order.`,
      });

      // Focus on SKU input after a short delay
      setTimeout(() => {
        skuInputRef.current?.focus();
      }, 100);

    } catch (error) {
      console.error('Error processing order scan:', error);
      toast({
        title: "Scan Error",
        description: "Failed to process order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSKUScan = async () => {
    if (!skuInput.trim() || !selectedOrder) return;
    
    setIsProcessing(true);
    
    try {
      const item = findItemBySKU(skuInput.trim(), selectedOrder);
      
      if (!item) {
        toast({
          title: "SKU Not Found",
          description: `No item found with SKU: ${skuInput} in order ${selectedOrder.order_number}`,
          variant: "destructive"
        });
        setSkuInput('');
        skuInputRef.current?.focus();
        return;
      }

      if (item.packed) {
        toast({
          title: "Already Packed",
          description: `${item.title} is already marked as packed.`,
          variant: "default"
        });
        setSkuInput('');
        skuInputRef.current?.focus();
        return;
      }

      setMatchedItem(item);
      setShowConfirmDialog(true);

    } catch (error) {
      console.error('Error processing SKU scan:', error);
      toast({
        title: "Scan Error",
        description: "Failed to process SKU. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsPacked = async () => {
    if (!selectedOrder || !matchedItem) return;

    try {
      await supabaseOrderService.updateOrderItemPacked(matchedItem.id, true);
      
      onItemPacked(selectedOrder.id, matchedItem.id);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      toast({
        title: "Item Packed",
        description: `${matchedItem.title} marked as packed successfully!`,
      });
      
      setShowConfirmDialog(false);
      setMatchedItem(null);
      setSkuInput('');

      // Check if all items in the order are now packed
      const updatedOrder = findOrderByNumber(selectedOrder.order_number);
      if (updatedOrder) {
        const unpackedItems = updatedOrder.order_items?.filter((item: any) => !item.packed && item.id !== matchedItem.id) || [];
        
        if (unpackedItems.length === 0) {
          toast({
            title: "Order Complete!",
            description: `All items in order ${selectedOrder.order_number} are now packed. Order will move to tracking.`,
          });
          // Reset to start
          resetScanner();
        } else {
          // Continue scanning for this order
          setTimeout(() => {
            skuInputRef.current?.focus();
          }, 100);
        }
      }

    } catch (error) {
      console.error('Error marking item as packed:', error);
      toast({
        title: "Error",
        description: "Failed to mark item as packed. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetScanner = () => {
    setStep('order');
    setOrderIdInput('');
    setSkuInput('');
    setSelectedOrder(null);
    setMatchedItem(null);
    setShowConfirmDialog(false);
    
    setTimeout(() => {
      orderInputRef.current?.focus();
    }, 100);
  };

  const handleOrderKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleOrderScan();
    }
  };

  const handleSKUKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSKUScan();
    }
  };

  const remainingItems = selectedOrder 
    ? selectedOrder.order_items?.filter((item: any) => !item.packed).length || 0
    : 0;

  return (
    <div className="space-y-6">
      {/* Step 1: Order ID Scanner */}
      <Card className={step === 'order' ? 'border-blue-500 shadow-md' : 'bg-gray-50'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'order' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                1
              </div>
              <CardTitle className={step === 'order' ? 'text-blue-600' : 'text-gray-500'}>
                Scan Order ID
              </CardTitle>
              {selectedOrder && (
                <Lock className="h-4 w-4 text-green-600" />
              )}
            </div>
            {selectedOrder && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Order: {selectedOrder.order_number}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              ref={orderInputRef}
              placeholder="Scan or enter order number..."
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
              onKeyPress={handleOrderKeyPress}
              disabled={isProcessing || step === 'sku'}
              className="flex-1"
            />
            <Button
              onClick={handleOrderScan}
              disabled={!orderIdInput.trim() || isProcessing || step === 'sku'}
              className="flex items-center space-x-2"
            >
              <Scan className="h-4 w-4" />
              <span>{isProcessing ? 'Processing...' : 'Scan'}</span>
            </Button>
            {step === 'sku' && (
              <Button
                variant="outline"
                onClick={resetScanner}
                className="flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </Button>
            )}
          </div>
          
          {selectedOrder && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-sm space-y-1">
                <p><strong>Customer:</strong> {selectedOrder.customer?.first_name} {selectedOrder.customer?.last_name}</p>
                <p><strong>Total Items:</strong> {selectedOrder.order_items?.length || 0}</p>
                <p><strong>Remaining to Pack:</strong> {remainingItems}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: SKU Scanner */}
      <Card className={step === 'sku' ? 'border-blue-500 shadow-md' : 'bg-gray-50'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'sku' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
              <CardTitle className={step === 'sku' ? 'text-blue-600' : 'text-gray-500'}>
                Scan Product SKU
              </CardTitle>
            </div>
            {step === 'sku' && (
              <Badge variant="outline" className="text-orange-700 bg-orange-50 border-orange-200">
                {remainingItems} items remaining
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              ref={skuInputRef}
              placeholder="Scan or enter product SKU..."
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              onKeyPress={handleSKUKeyPress}
              disabled={isProcessing || step === 'order'}
              className="flex-1"
            />
            <Button
              onClick={handleSKUScan}
              disabled={!skuInput.trim() || isProcessing || step === 'order'}
              className="flex items-center space-x-2"
            >
              <Scan className="h-4 w-4" />
              <span>{isProcessing ? 'Processing...' : 'Scan'}</span>
            </Button>
          </div>
          
          {step === 'sku' && selectedOrder && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">Items in this order:</h4>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {selectedOrder.order_items?.map((item: any) => (
                  <div key={item.id} className={`p-2 rounded border text-sm ${
                    item.packed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-gray-500">SKU: {item.sku || 'No SKU'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">x{item.quantity}</Badge>
                        {item.packed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Package className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <span>Confirm Item Packing</span>
            </DialogTitle>
          </DialogHeader>
          
          {matchedItem && selectedOrder && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-800 mb-2">Item Found:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Product:</strong> {matchedItem.title}</p>
                  <p><strong>SKU:</strong> {matchedItem.sku || 'N/A'}</p>
                  <p><strong>Quantity:</strong> {matchedItem.quantity}</p>
                  <p><strong>Order:</strong> {selectedOrder.order_number}</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleMarkAsPacked}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Packed
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setSkuInput('');
                    setTimeout(() => skuInputRef.current?.focus(), 100);
                  }}
                  className="flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackingScanner;
