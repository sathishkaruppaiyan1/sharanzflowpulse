
import React, { useState, useRef, useCallback } from 'react';
import { Scan, Package, CheckCircle, X, Camera, Keyboard } from 'lucide-react';
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
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('manual');
  const [scannedCode, setScannedCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [matchedItem, setMatchedItem] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const findItemBySKU = useCallback((sku: string) => {
    console.log('Searching for SKU:', sku);
    
    for (const order of orders) {
      if (order.order_items) {
        for (const item of order.order_items) {
          console.log('Checking item SKU:', item.sku, 'vs scanned:', sku);
          if (item.sku && item.sku.toLowerCase() === sku.toLowerCase()) {
            console.log('Found matching item:', item);
            return { order, item };
          }
          // Also check title for partial matches
          if (item.title && item.title.toLowerCase().includes(sku.toLowerCase())) {
            console.log('Found matching item by title:', item);
            return { order, item };
          }
        }
      }
    }
    return null;
  }, [orders]);

  const handleScan = async (code: string) => {
    if (!code.trim()) return;
    
    setIsProcessing(true);
    console.log('Processing scanned code:', code);

    try {
      const match = findItemBySKU(code.trim());
      
      if (match) {
        const { order, item } = match;
        
        if (item.packed) {
          toast({
            title: "Already Packed",
            description: `${item.title} is already marked as packed.`,
            variant: "default"
          });
        } else {
          setCurrentOrder(order);
          setMatchedItem(item);
          setShowScanDialog(true);
        }
      } else {
        toast({
          title: "Item Not Found",
          description: `No item found with SKU: ${code}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing scan:', error);
      toast({
        title: "Scan Error",
        description: "Failed to process scanned item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setScannedCode('');
    }
  };

  const handleMarkAsPacked = async () => {
    if (!currentOrder || !matchedItem) return;

    try {
      console.log('Marking item as packed:', matchedItem.id);
      await supabaseOrderService.updateOrderItemPacked(matchedItem.id, true);
      
      onItemPacked(currentOrder.id, matchedItem.id);
      
      // Refresh orders data
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      toast({
        title: "Item Packed",
        description: `${matchedItem.title} marked as packed successfully!`,
      });
      
      setShowScanDialog(false);
      setCurrentOrder(null);
      setMatchedItem(null);
    } catch (error) {
      console.error('Error marking item as packed:', error);
      toast({
        title: "Error",
        description: "Failed to mark item as packed. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan(scannedCode);
    }
  };

  const unpackedItemsCount = orders.reduce((total, order) => {
    return total + (order.order_items?.filter((item: any) => !item.packed).length || 0);
  }, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scan className="h-5 w-5 text-blue-600" />
              <CardTitle>Item Scanner</CardTitle>
            </div>
            <Badge variant="outline" className="text-sm">
              {unpackedItemsCount} items remaining
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scan Mode Toggle */}
          <div className="flex space-x-2">
            <Button
              variant={scanMode === 'manual' ? 'default' : 'outline'}
              onClick={() => setScanMode('manual')}
              className="flex items-center space-x-2"
            >
              <Keyboard className="h-4 w-4" />
              <span>Manual Entry</span>
            </Button>
            <Button
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              onClick={() => setScanMode('camera')}
              className="flex items-center space-x-2"
              disabled
            >
              <Camera className="h-4 w-4" />
              <span>Camera Scan (Coming Soon)</span>
            </Button>
          </div>

          {/* Manual Input */}
          {scanMode === 'manual' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Scan or Enter SKU/Product Code:
              </label>
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  placeholder="Enter SKU or scan barcode..."
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isProcessing}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleScan(scannedCode)}
                  disabled={!scannedCode.trim() || isProcessing}
                  className="flex items-center space-x-2"
                >
                  <Scan className="h-4 w-4" />
                  <span>{isProcessing ? 'Processing...' : 'Scan'}</span>
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Tip: Use a barcode scanner or type the product SKU manually
              </p>
            </div>
          )}

          {/* Camera Scanner Placeholder */}
          {scanMode === 'camera' && (
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Camera scanning will be available soon</p>
              <p className="text-sm text-gray-500 mt-2">Use manual entry for now</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <span>Confirm Item Packing</span>
            </DialogTitle>
          </DialogHeader>
          
          {matchedItem && currentOrder && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-800 mb-2">Item Found:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Product:</strong> {matchedItem.title}</p>
                  <p><strong>SKU:</strong> {matchedItem.sku || 'N/A'}</p>
                  <p><strong>Quantity:</strong> {matchedItem.quantity}</p>
                  <p><strong>Order:</strong> {currentOrder.order_number}</p>
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
                  onClick={() => setShowScanDialog(false)}
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
