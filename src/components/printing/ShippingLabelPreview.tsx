import React from 'react';
import { X, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUpdateOrderStage } from '@/hooks/useOrders';

interface ShippingLabelPreviewProps {
  open: boolean;
  onClose: () => void;
  order: any;
  onPrintComplete?: (orderId: string) => void;
}

const ShippingLabelPreview = ({ open, onClose, order, onPrintComplete }: ShippingLabelPreviewProps) => {
  const updateOrderStage = useUpdateOrderStage();

  if (!order) return null;

  // Use the actual order number from Shopify, with fallback
  const orderNumber = order.order_number || order.name || `#${order.id}`;
  
  // Use the order number directly as tracking number
  const trackingNumber = orderNumber.toString().replace('#', '');
  
  // Generate Code 128 style barcode with actual bars
  const generateBarcode = (text: string) => {
    // Create an array of bar widths (1 = thin, 2 = thick)
    const barPattern = [];
    
    // Start pattern
    barPattern.push(2, 1, 1, 1, 2, 1);
    
    // Generate bars based on text
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i) % 10;
      // Different patterns for each digit
      switch (char) {
        case 0: barPattern.push(2, 1, 1, 2, 1, 1); break;
        case 1: barPattern.push(1, 2, 1, 2, 1, 1); break;
        case 2: barPattern.push(1, 1, 2, 2, 1, 1); break;
        case 3: barPattern.push(2, 2, 1, 1, 1, 1); break;
        case 4: barPattern.push(1, 1, 1, 2, 2, 1); break;
        case 5: barPattern.push(2, 1, 1, 1, 1, 2); break;
        case 6: barPattern.push(1, 2, 1, 1, 1, 2); break;
        case 7: barPattern.push(1, 1, 2, 1, 1, 2); break;
        case 8: barPattern.push(1, 1, 1, 1, 2, 2); break;
        case 9: barPattern.push(2, 1, 1, 2, 1, 1); break;
      }
    }
    
    // End pattern
    barPattern.push(2, 1, 1, 1, 2, 1, 1);
    
    return barPattern;
  };

  const renderBarcode = (text: string) => {
    const bars = generateBarcode(text);
    return (
      <div className="flex items-end justify-center space-x-0" style={{ height: '50px' }}>
        {bars.map((width, index) => (
          <div
            key={index}
            className={index % 2 === 0 ? "bg-black" : "bg-white"}
            style={{
              width: `${width === 1 ? 2 : 4}px`,
              height: '50px',
              minWidth: `${width === 1 ? 2 : 4}px`
            }}
          />
        ))}
      </div>
    );
  };

  const handlePrint = async () => {
    try {
      // First update the order stage
      if (order.id) {
        console.log('Moving order to packing stage:', order.id);
        await updateOrderStage.mutateAsync({
          orderId: order.id,
          stage: 'packing'
        });
      }

      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
      
      if (!printWindow) {
        console.error('Failed to open print window - popup blocked?');
        // Fallback to current window print
        window.print();
        return;
      }

      // Get the print content
      const printContent = document.querySelector('.print-content');
      if (!printContent) {
        console.error('Print content not found');
        printWindow.close();
        return;
      }

      // Write the complete HTML document to the print window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Shipping Label - ${orderNumber}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px;
                line-height: 1.4;
                color: #000;
                background: #fff;
              }
              
              .print-content { 
                border: 2px solid #000; 
                padding: 20px; 
                background: #fff;
                max-width: 600px;
                margin: 0 auto;
              }
              
              .font-bold { font-weight: bold; }
              .text-lg { font-size: 18px; }
              .text-sm { font-size: 11px; }
              .text-xs { font-size: 10px; }
              .text-center { text-align: center; }
              .mb-1 { margin-bottom: 4px; }
              .mb-2 { margin-bottom: 8px; }
              .mb-4 { margin-bottom: 16px; }
              .mt-1 { margin-top: 4px; }
              .mt-2 { margin-top: 8px; }
              .p-2 { padding: 8px; }
              .p-3 { padding: 12px; }
              .p-4 { padding: 16px; }
              .pb-2 { padding-bottom: 8px; }
              .border { border: 1px solid #000; }
              .border-b-2 { border-bottom: 2px solid #000; }
              .border-black { border-color: #000; }
              .bg-yellow-50 { background-color: #fffbeb; }
              .bg-gray-50 { background-color: #f9fafb; }
              .bg-white { background-color: #fff; }
              .bg-gray-300 { background-color: #d1d5db; }
              .bg-black { background-color: #000; }
              .flex { display: flex; }
              .items-center { align-items: center; }
              .items-end { align-items: flex-end; }
              .justify-center { justify-content: center; }
              .justify-between { justify-content: space-between; }
              .space-x-0 > * + * { margin-left: 0; }
              
              @media print {
                body { 
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .print-content {
                  border: 2px solid #000 !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                @page {
                  margin: 0.5in;
                  size: A4;
                }
              }
            </style>
          </head>
          <body>
            ${printContent.outerHTML}
          </body>
        </html>
      `);

      printWindow.document.close();

      // Wait for the content to load, then trigger print
      printWindow.onload = function() {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          
          // Close the print window after printing
          printWindow.onafterprint = function() {
            printWindow.close();
          };
          
          // Fallback close after 3 seconds
          setTimeout(() => {
            if (!printWindow.closed) {
              printWindow.close();
            }
          }, 3000);
        }, 500);
      };

      // Call the completion handler
      if (onPrintComplete) {
        onPrintComplete(order.id);
      }
      
      // Close the preview dialog
      onClose();
      
    } catch (error) {
      console.error('Error during print process:', error);
    }
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
            <Button 
              onClick={handlePrint} 
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={updateOrderStage.isPending}
            >
              <Printer className="h-4 w-4 mr-2" />
              {updateOrderStage.isPending ? 'Processing...' : 'Print Labels'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="mt-4 print:mt-0">
          <div className="print-content border-2 border-black bg-white p-6 font-mono text-sm print:border-0">
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
                  <span>{orderNumber}</span>
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
              <div className="bg-white p-3 border border-gray-300 mb-2">
                {renderBarcode(trackingNumber)}
              </div>
              <div className="font-bold text-sm">{trackingNumber}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingLabelPreview;
