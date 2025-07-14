import React, { useState } from 'react';
import { Package, Minus, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface QuantitySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  totalQuantity: number;
  alreadyPacked: number;
  onConfirm: (packedQty: number, pendingQty: number) => void;
}

const QuantitySelector = ({ 
  isOpen, 
  onClose, 
  itemTitle, 
  totalQuantity, 
  alreadyPacked,
  onConfirm 
}: QuantitySelectorProps) => {
  const [packingQuantity, setPackingQuantity] = useState(1);
  const remainingQuantity = totalQuantity - alreadyPacked;
  const pendingQuantity = remainingQuantity - packingQuantity;

  const handleConfirm = () => {
    onConfirm(alreadyPacked + packingQuantity, pendingQuantity);
    onClose();
    setPackingQuantity(1);
  };

  const handleCancel = () => {
    onClose();
    setPackingQuantity(1);
  };

  const incrementQuantity = () => {
    if (packingQuantity < remainingQuantity) {
      setPackingQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (packingQuantity > 0) {
      setPackingQuantity(prev => prev - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Select Quantity to Pack</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Item Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm">{itemTitle}</h4>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600">
              <span>Total: {totalQuantity}</span>
              <span>Already Packed: {alreadyPacked}</span>
              <span>Remaining: {remainingQuantity}</span>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium">How many to pack now?</label>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={decrementQuantity}
                disabled={packingQuantity <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Input
                type="number"
                value={packingQuantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (value >= 0 && value <= remainingQuantity) {
                    setPackingQuantity(value);
                  }
                }}
                className="w-20 text-center"
                min={0}
                max={remainingQuantity}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={incrementQuantity}
                disabled={packingQuantity >= remainingQuantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
            <h5 className="text-sm font-medium text-blue-800">Summary:</h5>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Will pack now:</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {packingQuantity}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Will move to pending:</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {pendingQuantity}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
              disabled={packingQuantity <= 0}
            >
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuantitySelector;