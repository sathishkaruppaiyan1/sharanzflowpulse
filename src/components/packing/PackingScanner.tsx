
import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { normalizeItemForDisplay, getVariationDisplayText } from '@/utils/productVariationUtils';
import { useSoundNotifications } from '@/hooks/useSoundNotifications';

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
  const [focusLocked, setFocusLocked] = useState(false);
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);
  
  const orderInputRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { playErrorSound, playSuccessSound, playWarningSound, playCompleteSound } = useSoundNotifications();

  // Initial focus on order input when component mounts
  useEffect(() => {
    if (step === 'order' && orderInputRef.current && !focusLocked && autoFocusEnabled) {
      const timer = setTimeout(() => {
        orderInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step, focusLocked, autoFocusEnabled]);

  // Enhanced focus management with better button click detection
  useEffect(() => {
    if (!autoFocusEnabled) return;

    const handleFocusManagement = () => {
      const activeElement = document.activeElement;
      
      // Check if user is interacting with any clickable element
      const isClickableElement = activeElement?.tagName === 'BUTTON' || 
                                activeElement?.getAttribute('role') === 'button' ||
                                activeElement?.tagName === 'A' ||
                                activeElement?.closest('[role="dialog"]') ||
                                activeElement?.closest('[data-dialog-content]') ||
                                activeElement?.closest('.manage-button') ||
                                activeElement?.closest('[data-radix-popper-content-wrapper]') ||
                                activeElement?.closest('[data-radix-dialog-content]');

      // Don't steal focus from clickable elements or dialog content
      if (isClickableElement) {
        setFocusLocked(true);
        setAutoFocusEnabled(false);
        // Re-enable auto-focus after a longer delay when user stops interacting
        setTimeout(() => {
          setFocusLocked(false);
          setAutoFocusEnabled(true);
        }, 3000);
        return;
      }

      // Only refocus to scanner inputs if focus is lost and auto-focus is enabled
      if (autoFocusEnabled && !focusLocked) {
        if (step === 'order' && orderInputRef.current && activeElement !== orderInputRef.current) {
          orderInputRef.current.focus();
        } else if (step === 'sku' && skuInputRef.current && activeElement !== skuInputRef.current) {
          skuInputRef.current.focus();
        }
      }
    };

    const interval = setInterval(handleFocusManagement, 500);
    return () => clearInterval(interval);
  }, [step, focusLocked, autoFocusEnabled]);

  // Focus SKU input when switching to SKU step
  useEffect(() => {
    if (step === 'sku' && skuInputRef.current && !focusLocked && autoFocusEnabled) {
      const timer = setTimeout(() => {
        skuInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step, focusLocked, autoFocusEnabled]);

  // Enhanced user interaction detection
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Check if user clicked on any button or interactive element
      if (target?.closest('button') || 
          target?.closest('[role="button"]') ||
          target?.closest('a') ||
          target?.closest('[data-radix-popper-content-wrapper]') ||
          target?.closest('[data-radix-dialog-content]') ||
          target?.closest('.manage-button')) {
        
        // Don't disable auto-focus for scanner-specific buttons
        if (!target?.closest('.scanner-input')) {
          setFocusLocked(true);
          setAutoFocusEnabled(false);
          
          // Re-enable auto-focus after user stops interacting
          setTimeout(() => {
            setFocusLocked(false);
            setAutoFocusEnabled(true);
          }, 3000);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable auto-focus when user presses Tab or other navigation keys
      if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'F1' || e.key === 'F2') {
        setFocusLocked(true);
        setAutoFocusEnabled(false);
        
        setTimeout(() => {
          setFocusLocked(false);
          setAutoFocusEnabled(true);
        }, 2000);
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const findOrderByNumber = useCallback((orderNumber: string) => {
    const cleanInput = orderNumber.trim().toLowerCase();

    return orders.find((order) => {
      const currentOrderNumber = order.order_number?.toLowerCase() || '';
      const normalizedOrderNumber = currentOrderNumber.replace(/^#/, '');
      const normalizedInput = cleanInput.replace(/^#/, '');

      return (
        currentOrderNumber === cleanInput ||
        currentOrderNumber === `#${normalizedInput}` ||
        normalizedOrderNumber === normalizedInput
      );
    });
  }, [orders]);

  const findItemBySKU = useCallback((sku: string, order: any) => {
    if (!order.order_items) return null;
    
    return order.order_items.find((item: any) => {
      const skuMatch = item.sku && item.sku.toLowerCase() === sku.toLowerCase();
      const nameMatch = item.title && item.title.toLowerCase().includes(sku.toLowerCase());
      
      // Enhanced matching with variation data from Supabase
      const variationText = getVariationDisplayText(item);
      const variationMatch = variationText && variationText.toLowerCase().includes(sku.toLowerCase());
      
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

  // Handle clicks outside scanner to temporarily lock focus
  const handleUserInteraction = () => {
    setFocusLocked(true);
    setTimeout(() => setFocusLocked(false), 1000);
  };

  // Add event listener for user interactions
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target?.closest('button') && !target?.closest('.scanner-input')) {
        handleUserInteraction();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleOrderScan = async () => {
    if (!orderIdInput.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const order = findOrderByNumber(orderIdInput.trim());
      
      if (!order) {
        // Play error sound for order not found
        playErrorSound();
        toast({
          title: "Order Not Found",
          description: `No order found with number: ${orderIdInput}`,
          variant: "destructive"
        });
        return;
      }

      if (order.stage !== 'packing') {
        // Play error sound for wrong stage
        playErrorSound();
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
        // Play warning sound for already complete order
        playWarningSound();
        toast({
          title: "Order Complete",
          description: `All items in order ${order.order_number} are already packed.`,
          variant: "default"
        });
        return;
      }

      // Play success sound for valid order
      playSuccessSound();
      setSelectedOrder(order);
      setScannedItems({});
      setStep('sku');
      
      toast({
        title: "Order Selected",
        description: `Order ${order.order_number} locked. Scan each item ${order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0)} times total.`,
      });

      // Focus on SKU input after a short delay
      setTimeout(() => {
        if (!focusLocked && autoFocusEnabled) {
          skuInputRef.current?.focus();
        }
      }, 100);

    } catch (error) {
      console.error('Error processing order scan:', error);
      playErrorSound();
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
        // Play error sound for item not found
        playErrorSound();
        toast({
          title: "Item Not Found",
          description: `No item found with SKU/Name: ${skuInput} in order ${selectedOrder.order_number}`,
          variant: "destructive"
        });
        setSkuInput('');
        if (!focusLocked && autoFocusEnabled) {
          skuInputRef.current?.focus();
        }
        return;
      }

      // Check current scan count for this item
      const currentScans = scannedItems[item.id] || 0;
      
      if (currentScans >= item.quantity) {
        // Play warning sound for already complete item
        playWarningSound();
        // Use enhanced variation display for completed items
        const normalizedItem = normalizeItemForDisplay(item);
        const variationText = getVariationDisplayText(normalizedItem);
        
        toast({
          title: "Item Complete",
          description: `${item.title || item.name} (${variationText}) has been scanned ${item.quantity} times already.`,
          variant: "default"
        });
        setSkuInput('');
        if (!focusLocked && autoFocusEnabled) {
          skuInputRef.current?.focus();
        }
        return;
      }

      // Play success sound for valid item scan
      playSuccessSound();

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
      const variationText = getVariationDisplayText(normalizedItem);
      
      toast({
        title: "Item Scanned",
        description: `${item.title || item.name} (${variationText}) scanned (${newScannedItems[item.id]}/${item.quantity})${isItemComplete ? ' - Complete!' : ''}`,
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
        // Play complete sound for finished order
        playCompleteSound();
        toast({
          title: "Order Complete! 🎉",
          description: `Order ${selectedOrder.order_number} fully packed and moved to tracking stage.`,
        });
        resetScanner();
      } else {
        setTimeout(() => {
          if (!focusLocked && autoFocusEnabled) {
            skuInputRef.current?.focus();
          }
        }, 100);
      }

    } catch (error) {
      console.error('Error processing SKU scan:', error);
      playErrorSound();
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
    setFocusLocked(false);
    setAutoFocusEnabled(true);
    
    setTimeout(() => {
      if (!focusLocked && autoFocusEnabled) {
        orderInputRef.current?.focus();
      }
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
            onFocus={() => {
              setFocusLocked(false);
              setAutoFocusEnabled(true);
            }}
            disabled={isProcessing || step === 'sku'}
            className="flex-1 scanner-input"
            autoFocus
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleOrderScan}
            disabled={!orderIdInput.trim() || isProcessing || step === 'sku'}
            className="scanner-input"
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
              className="text-xs scanner-input"
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
              onFocus={() => {
                setFocusLocked(false);
                setAutoFocusEnabled(true);
              }}
              disabled={isProcessing}
              className="flex-1 scanner-input"
              autoFocus
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleSKUScan}
              disabled={!skuInput.trim() || isProcessing}
              className="scanner-input"
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
                  const variationText = getVariationDisplayText(normalizedItem);
                  
                  console.log(`Scanner display for item ${item.id}:`, {
                    originalItem: item,
                    supabaseVariantTitle: item.variant_title,
                    supabaseVariantOptions: item.variant_options,
                    normalizedItem,
                    variationText
                  });
                  
                  return (
                    <div key={item.id} className={`p-2 rounded-lg border ${isComplete ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">{item.title || item.name}</p>
                            {variationText && variationText !== 'No variations' && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {variationText}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>SKU: {item.sku || 'N/A'}</p>
                            {item.variant_title && (
                              <p>Supabase Variant: {item.variant_title}</p>
                            )}
                            {variationText && variationText !== 'No variations' ? (
                              <p className="text-green-600">✅ Variation from Supabase</p>
                            ) : (
                              <p className="text-amber-600">⚠️ Using fallback variation detection</p>
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
