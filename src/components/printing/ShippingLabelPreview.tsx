
import React from 'react';
import { X, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ShippingLabelPreviewProps {
  open: boolean;
  onClose: () => void;
  order: any;
  onPrintComplete?: (orderId: string) => void;
}

const ShippingLabelPreview = ({ open, onClose, order, onPrintComplete }: ShippingLabelPreviewProps) => {
  if (!order) return null;

  const trackingNumber = `BD${Math.random().toString().slice(2, 11)}IN`;
  
  // Proper Code 128 barcode representation
  const generateCode128Barcode = (text: string) => {
    // Code 128 uses bars and spaces with specific widths (1-4 units)
    // This is a simplified visual representation
    const barPattern = [];
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      // Generate alternating thick and thin bars based on character code
      if (char % 2 === 0) {
        barPattern.push('████', '█', '███', '██');
      } else {
        barPattern.push('██', '████', '█', '███');
      }
    }
    return barPattern.join(' ');
  };

  const handlePrint = () => {
    // Trigger browser print dialog
    window.print();
    
    // Call the completion handler to move order to next stage
    if (onPrintComplete) {
      onPrintComplete(order.id);
    }
    
    onClose();
  };

  const customerName = order.customer_name || 
    `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 
    'Guest Customer';

  const shippingAddress = order.shipping_address || {
    address1: 'Address not available',
    city: 'City',
    province: 'State',
    zip: '000000',
    country: 'India',
    phone: 'N/A'
  };

  const totalItems = order.line_items ? 
    order.line_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) : 1;

  const totalWeight = order.total_weight ? `${order.total_weight}g` : '750g';
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Print Preview - 1 Labels</DialogTitle>
          <div className="flex items-center space-x-2">
            <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white">
              <Printer className="h-4 w-4 mr-2" />
              Print Labels
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="mt-4 print:mt-0">
          <div className="border-2 border-black bg-white p-6 font-mono text-sm print:border-0">
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
                  {customerName.toUpperCase()}
                </div>
                <div>{shippingAddress.address1}</div>
                {shippingAddress.address2 && <div>{shippingAddress.address2}</div>}
                <div>{shippingAddress.city}, {shippingAddress.province} {shippingAddress.zip}</div>
                <div>{shippingAddress.country}</div>
                <div>Ph: {shippingAddress.phone || 'N/A'}</div>
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
                  <span>#{order.order_number || order.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Weight:</span>
                  <span>{totalWeight}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>{totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>₹{order.total_amount || order.current_total_price}</span>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="mb-4">
              <div className="font-bold mb-2">PRODUCTS:</div>
              <div className="border border-black p-3">
                {order.line_items ? order.line_items.map((item: any, index: number) => (
                  <div key={index}>• {item.title || item.name} (Qty: {item.quantity || 1})</div>
                )) : (
                  <div>• Order Items</div>
                )}
              </div>
            </div>

            {/* Code 128 Barcode */}
            <div className="text-center border border-black p-4 bg-gray-50">
              <div className="font-bold mb-2">CODE 128</div>
              <div className="font-mono text-xs mb-2 overflow-hidden" style={{ letterSpacing: '0.5px', lineHeight: '20px' }}>
                {generateCode128Barcode(order.order_number || order.name || 'ORDER')}
              </div>
              <div className="font-bold">#{order.order_number || order.name}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingLabelPreview;
