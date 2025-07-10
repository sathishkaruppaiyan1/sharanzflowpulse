
import React from 'react';
import { X, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ShippingLabelPreviewProps {
  open: boolean;
  onClose: () => void;
  order: any;
}

const ShippingLabelPreview = ({ open, onClose, order }: ShippingLabelPreviewProps) => {
  if (!order) return null;

  const trackingNumber = `BD${Math.random().toString().slice(2, 11)}IN`;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Print Preview - 1 Labels</DialogTitle>
          <div className="flex items-center space-x-2">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Printer className="h-4 w-4 mr-2" />
              Print Labels
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="border-2 border-black bg-white p-6 font-mono text-sm">
            {/* Tracking Number */}
            <div className="text-center border-b-2 border-black pb-2 mb-4">
              <div className="font-bold text-lg">TRACKING #</div>
              <div className="border border-black p-2 mt-2 bg-gray-50">
                <div className="font-bold text-lg">{trackingNumber}</div>
              </div>
            </div>

            {/* TO Section */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <span className="mr-2">📍</span>
                <span className="font-bold">TO:</span>
              </div>
              <div className="border border-black p-3 bg-yellow-50">
                <div className="font-bold text-lg">
                  {order.customer?.first_name?.toUpperCase()} {order.customer?.last_name?.toUpperCase()}
                </div>
                <div>123 MG Road, Bangalore, Karnataka 560001 India</div>
                <div>Ph: +91 98765 43210</div>
              </div>
            </div>

            {/* FROM Section */}
            <div className="mb-4">
              <div className="font-bold mb-2">FROM:</div>
              <div className="border border-black p-3 bg-gray-50">
                <div className="font-bold">F3-ENGINE WAREHOUSE</div>
                <div>123 Fulfillment Street</div>
                <div>Mumbai, MH 400001</div>
                <div>Ph: +91-22-1234-5678</div>
              </div>
            </div>

            {/* Package Info */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <span className="mr-2">📦</span>
                <span className="font-bold">PACKAGE INFO:</span>
              </div>
              <div className="border border-black p-3">
                <div className="flex justify-between">
                  <span>Order:</span>
                  <span>#{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Weight:</span>
                  <span>750g</span>
                </div>
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>2</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>₹{order.total_amount}</span>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="mb-4">
              <div className="font-bold mb-2">PRODUCTS:</div>
              <div className="border border-black p-3">
                <div>• Wireless Bluetooth Headphones</div>
                <div>• Phone Case</div>
              </div>
            </div>

            {/* Barcode */}
            <div className="text-center border border-black p-4 bg-gray-50">
              <div className="font-bold mb-2">CODE 128</div>
              <div className="font-mono text-2xl mb-2">||||| ||||| |||||</div>
              <div className="font-bold">#{order.order_number}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingLabelPreview;
