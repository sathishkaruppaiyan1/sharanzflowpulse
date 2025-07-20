import React, { useState, useRef, useCallback } from 'react';
import { Scan, Package, CheckCircle, X, Camera, Keyboard, Lock, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeItemForDisplay, getVariationDisplay } from '@/utils/productVariationUtils';

interface PackingScannerProps {
  orders: any[];
  onItemPacked: (orderId: string, itemId: string) => void;
  onOrderSelected?: (order: any | null) => void;
}

const PackingScanner = ({ orders, onItemPacked, onOrderSelected }: PackingScannerProps) => {
  const [step, setStep] = useState<'order' | 'sku'>('order');
  const [orderIdInput, setOrderIdInput] = useState('');
  const [skuInput, setSkuInput] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItems, setScannedItems] = useState<{[key: string]: number}>({});
  
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
      const skuMatch = item.sku && item.sku.toLowerCase() === sku.toLowerCase();
      const nameMatch = item.title && item.title.toLowerCase().includes(sku.toLowerCase());
      
      // Enhanced matching with variation data from Supabase
      const variationInfo = getVariationDisplay(item);
      const variationMatch = variationInfo.variation && variationInfo.variation.toLowerCase().includes(sku.toLowerCase());
      
      console.log(`Scanner matching for SKU "${sku}":`, {
        itemTitle: item.title,
        itemSku: item.sku,
        itemVariant: item.variant_title,
        skuMatch,
        nameMatch,
        variationMatch
      });
      
      return skuMatch || nameMatch || variationMatch;
    });
  }, []);

  const calculateProgress = useCallback(() => {
    if (!selectedOrder || !selectedOrder.order_items) return { scanned: 0, total: 0, percentage: 0 };
    
    const totalQty = selectedOrder.order_items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const scannedQty = Object.values(scannedItems).reduce((sum: number, count: number) => sum + count, 0);
    
    return {
      scanned: scannedQty,
      total: totalQty,
      percentage: totalQty > 0 ? Math.round((scannedQty / totalQty) * 100) : 0
    };
  }, [selectedOrder, scannedItems]);

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
      setScannedItems({});
      setStep('sku');
      
      toast({
        title: "Order Selected",
        description: `Order ${order.order_number} locked. Scan each item ${order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0)} times total.`,
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
          title: "Item Not Found",
          description: `No item found with SKU/Name: ${skuInput} in order ${selectedOrder.order_number}`,
          variant: "destructive"
        });
        setSkuInput('');
        skuInputRef.current?.focus();
        return;
      }

      // Check current scan count for this item
      const currentScans = scannedItems[item.id] || 0;
      
      if (currentScans >= item.quantity) {
        // Use enhanced variation display for completed items
        const normalizedItem = normalizeItemForDisplay(item);
        const variationInfo = getVariationDisplay(normalizedItem);
        
        toast({
          title: "Item Complete",
          description: `${variationInfo.fullDisplay} has been scanned ${item.quantity} times already.`,
          variant: "default"
        });
        setSkuInput('');
        skuInputRef.current?.focus();
        return;
      }

      // Increment scan count
      const newScannedItems = {
        ...scannedItems,
        [item.id]: currentScans + 1
      };
      setScannedItems(newScannedItems);

      // Check if this item is now complete
      const isItemComplete = newScannedItems[item.id] >= item.quantity;
      
      // Use enhanced variation display for scan confirmation
      const normalizedItem = normalizeItemForDisplay(item);
      const variationInfo = getVariationDisplay(normalizedItem);
      
      toast({
        title: "Item Scanned",
        description: `${variationInfo.fullDisplay} scanned (${newScannedItems[item.id]}/${item.quantity})${isItemComplete ? ' - Complete!' : ''}`,
      });

      // If item is complete, mark it as packed
      if (isItemComplete) {
        await supabaseOrderService.updateOrderItemPacked(item.id, true);
        onItemPacked(selectedOrder.id, item.id);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }

      setSkuInput('');
      
      // Check if all items are complete
      const progress = calculateProgress();
      const newTotal = Object.values(newScannedItems).reduce((sum: number, count: number) => sum + count, 0);
      
      if (newTotal >= progress.total) {
        toast({
          title: "Order Complete! 🎉",
          description: `Order ${selectedOrder.order_number} fully packed and moved to tracking stage.`,
        });
        resetScanner();
      } else {
        setTimeout(() => {
          skuInputRef.current?.focus();
        }, 100);
      }

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

  const resetScanner = () => {
    setStep('order');
    setOrderIdInput('');
    setSkuInput('');
    setSelectedOrder(null);
    setScannedItems({});
    
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

  // Notify parent about selected order
  React.useEffect(() => {
    onOrderSelected?.(selectedOrder);
  }, [selectedOrder, onOrderSelected]);

  return (
    <div className="space-y-6">
      {/* Order ID Scanner */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Order ID Scanner</h3>
        <div className="flex space-x-2">
          <Input
            ref={orderInputRef}
            placeholder="Scan or enter Order ID"
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            onKeyPress={handleOrderKeyPress}
            disabled={isProcessing || step === 'sku'}
            className="flex-1"
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleOrderScan}
            disabled={!orderIdInput.trim() || isProcessing || step === 'sku'}
          >
            <Scan className="h-4 w-4" />
          </Button>
        </div>
        {step === 'sku' && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={resetScanner}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* SKU Scanner - only show if order is selected */}
      {step === 'sku' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Product Scanner</h3>
            
            {/* Progress Bar */}
            {(() => {
              const progress = calculateProgress();
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progress: {progress.scanned}/{progress.total} items scanned</span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <Progress value={progress.percentage} className="h-2" />
                </div>
              );
            })()}
          </div>
          
          <div className="flex space-x-2">
            <Input
              ref={skuInputRef}
              placeholder="Scan or enter product SKU or name"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              onKeyPress={handleSKUKeyPress}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleSKUScan}
              disabled={!skuInput.trim() || isProcessing}
            >
              <Scan className="h-4 w-4" />
            </Button>
          </div>

          {/* Enhanced Item Status Display with Supabase variation data */}
          {selectedOrder && selectedOrder.order_items && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Items to Pack (with Supabase Variations):</h4>
              <div className="grid gap-2">
                {selectedOrder.order_items.map((item: any) => {
                  const scanned = scannedItems[item.id] || 0;
                  const isComplete = scanned >= item.quantity;
                  
                  // Enhanced normalization with Supabase variation data
                  const normalizedItem = normalizeItemForDisplay(item);
                  const variationInfo = getVariationDisplay(normalizedItem);
                  
                  console.log(`Scanner display for item ${item.id}:`, {
                    originalItem: item,
                    supabaseVariantTitle: item.variant_title,
                    supabaseVariantOptions: item.variant_options,
                    normalizedItem,
                    variationInfo
                  });
                  
                  return (
                    <div key={item.id} className={`p-2 rounded-lg border ${isComplete ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">{variationInfo.productName}</p>
                            {variationInfo.hasVariation && variationInfo.variation && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {variationInfo.variation}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>SKU: {item.sku || 'N/A'}</p>
                            {item.variant_title && (
                              <p>Supabase Variant: {item.variant_title}</p>
                            )}
                            {variationInfo.hasVariation && (
                              <p className="text-green-600">✅ Variation from Supabase</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={isComplete ? "default" : "secondary"}>
                            {scanned}/{item.quantity}
                          </Badge>
                          {isComplete && <CheckCircle className="h-4 w-4 text-green-600 inline ml-1" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PackingScanner;
