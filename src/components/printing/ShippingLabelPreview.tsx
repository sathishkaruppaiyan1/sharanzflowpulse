import React from 'react';
import { X, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUpdateOrderStage } from '@/hooks/useOrders';

interface ShippingLabelPreviewProps {
  open: boolean;
  onClose: () => void;
  order?: any;
  orders?: any[]; // For bulk printing
  onPrintComplete?: (orderId: string | string[]) => void;
}

const ShippingLabelPreview = ({ open, onClose, order, orders, onPrintComplete }: ShippingLabelPreviewProps) => {
  const updateOrderStage = useUpdateOrderStage();
  
  const isBulkPrint = orders && orders.length > 0;
  const ordersToProcess = isBulkPrint ? orders : [order].filter(Boolean);

  if (!order && !orders?.length) return null;

  // Generate Code 128 style barcode with actual bars
  const generateBarcode = (text: string) => {
    const barPattern = [];
    
    // Start pattern
    barPattern.push(2, 1, 1, 1, 2, 1);
    
    // Generate bars based on text
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i) % 10;
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

  const createLabelHTML = (orderData: any) => {
    const orderNumber = orderData.order_number || orderData.name || `#${orderData.id}`;
    const trackingNumber = orderNumber.toString().replace('#', '');
    
    const customerName = orderData.customer_name || 
      `${orderData.customer?.first_name || ''} ${orderData.customer?.last_name || ''}`.trim() || 
      'Guest Customer';

    const shippingAddress = orderData.shipping_address || {
      address1: 'Address not available',
      city: 'City',
      province: 'State',
      zip: '000000',
      country: 'India',
      phone: 'N/A'
    };

    const totalItems = orderData.line_items ? 
      orderData.line_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) : 1;

    const totalWeight = orderData.total_weight ? `${orderData.total_weight}g` : '750g';

    // Generate barcode HTML
    const bars = generateBarcode(trackingNumber);
    const barcodeHTML = bars.map((width, index) => 
      `<div style="display: inline-block; background-color: ${index % 2 === 0 ? '#000' : '#fff'}; width: ${width === 1 ? 2 : 4}px; height: 50px; min-width: ${width === 1 ? 2 : 4}px; vertical-align: bottom;"></div>`
    ).join('');

    return `
      <div style="border: 2px solid #000; padding: 20px; background: #fff; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; color: #000; margin-bottom: 20px; page-break-after: always;">
        <!-- Tracking Number -->
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px;">
          <div style="font-weight: bold; font-size: 18px;">TRACKING #</div>
          <div style="border: 1px solid #000; padding: 8px; margin-top: 8px; background: #f9fafb;">
            <div style="font-weight: bold; font-size: 18px;">${trackingNumber}</div>
          </div>
        </div>

        <!-- TO Section -->
        <div style="margin-bottom: 16px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="margin-right: 8px;">📍</span>
            <span style="font-weight: bold;">TO:</span>
          </div>
          <div style="border: 1px solid #000; padding: 12px; background: #fffbeb;">
            <div style="font-weight: bold; font-size: 18px;">${customerName.toUpperCase()}</div>
            <div>${shippingAddress.address1}</div>
            ${shippingAddress.address2 ? `<div>${shippingAddress.address2}</div>` : ''}
            <div>${shippingAddress.city}, ${shippingAddress.province} ${shippingAddress.zip}</div>
            <div>${shippingAddress.country}</div>
            <div>Ph: ${shippingAddress.phone || 'N/A'}</div>
          </div>
        </div>

        <!-- FROM Section -->
        <div style="margin-bottom: 16px;">
          <div style="font-weight: bold; margin-bottom: 8px;">FROM:</div>
          <div style="border: 1px solid #000; padding: 12px; background: #f9fafb;">
            <div style="font-weight: bold;">F3-ENGINE WAREHOUSE</div>
            <div>123 Fulfillment Street</div>
            <div>Mumbai, MH 400001</div>
            <div>Ph: +91-22-1234-5678</div>
          </div>
        </div>

        <!-- Package Info -->
        <div style="margin-bottom: 16px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="margin-right: 8px;">📦</span>
            <span style="font-weight: bold;">PACKAGE INFO:</span>
          </div>
          <div style="border: 1px solid #000; padding: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Order:</span>
              <span>${orderNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Weight:</span>
              <span>${totalWeight}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Items:</span>
              <span>${totalItems}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Total:</span>
              <span>₹${orderData.total_amount || orderData.current_total_price}</span>
            </div>
          </div>
        </div>

        <!-- Products -->
        <div style="margin-bottom: 16px;">
          <div style="font-weight: bold; margin-bottom: 8px;">PRODUCTS:</div>
          <div style="border: 1px solid #000; padding: 12px;">
            ${orderData.line_items ? orderData.line_items.map((item: any) => 
              `<div>• ${item.title || item.name} (Qty: ${item.quantity || 1})</div>`
            ).join('') : '<div>• Order Items</div>'}
          </div>
        </div>

        <!-- Code 128 Barcode -->
        <div style="text-align: center; border: 1px solid #000; padding: 16px; background: #f9fafb;">
          <div style="font-weight: bold; margin-bottom: 8px;">CODE 128</div>
          <div style="background: #fff; padding: 12px; border: 1px solid #d1d5db; margin-bottom: 8px;">
            <div style="text-align: center; height: 50px;">
              ${barcodeHTML}
            </div>
          </div>
          <div style="font-weight: bold; font-size: 14px;">${trackingNumber}</div>
        </div>
      </div>
    `;
  };

  const handlePrint = async () => {
    try {
      // First update all order stages
      for (const orderData of ordersToProcess) {
        if (orderData.id) {
          console.log('Moving order to packing stage:', orderData.id);
          await updateOrderStage.mutateAsync({
            orderId: orderData.id,
            stage: 'packing'
          });
        }
      }

      // Create print window
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
      
      if (!printWindow) {
        alert('Please allow popups for printing. Your browser blocked the print window.');
        return;
      }

      // Generate HTML for all labels
      const labelsHTML = ordersToProcess.map(orderData => createLabelHTML(orderData)).join('');

      // Write complete HTML document
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Shipping Labels - ${isBulkPrint ? `${ordersToProcess.length} Labels` : ordersToProcess[0]?.order_number || ordersToProcess[0]?.name}</title>
            <meta charset="UTF-8">
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
                padding: 20px;
              }
              
              @media print {
                body { 
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  padding: 0;
                }
                @page {
                  margin: 0.5in;
                  size: A4;
                }
              }
              
              @media screen {
                body {
                  background: #f5f5f5;
                }
              }
            </style>
          </head>
          <body>
            ${labelsHTML}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
              
              window.onafterprint = function() {
                window.close();
              };
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();

      // Call the completion handler
      if (onPrintComplete) {
        const orderIds = isBulkPrint 
          ? ordersToProcess.map(o => o.id) 
          : ordersToProcess[0]?.id;
        onPrintComplete(orderIds);
      }
      
      // Don't close dialog immediately, wait for print to complete
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Error during print process:', error);
      alert('Printing failed. Please try again.');
    }
  };

  const displayOrder = isBulkPrint ? ordersToProcess[0] : order;
  const orderNumber = displayOrder.order_number || displayOrder.name || `#${displayOrder.id}`;
  const trackingNumber = orderNumber.toString().replace('#', '');
  
  const customerName = displayOrder.customer_name || 
    `${displayOrder.customer?.first_name || ''} ${displayOrder.customer?.last_name || ''}`.trim() || 
    'Guest Customer';

  const shippingAddress = displayOrder.shipping_address || {
    address1: 'Address not available',
    city: 'City',
    province: 'State',
    zip: '000000',
    country: 'India',
    phone: 'N/A'
  };

  const totalItems = displayOrder.line_items ? 
    displayOrder.line_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) : 1;

  const totalWeight = displayOrder.total_weight ? `${displayOrder.total_weight}g` : '750g';
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>
            Print Preview - {isBulkPrint ? `${ordersToProcess.length} Labels` : '1 Label'}
          </DialogTitle>
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
        
        <div className="mt-4 space-y-4">
          {isBulkPrint && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Bulk Print:</strong> {ordersToProcess.length} labels will be printed.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Preview shows the first label. All labels will use the same template.
              </p>
            </div>
          )}
          
          <div className="print-content border-2 border-black bg-white p-6 font-mono text-sm">
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
                  <span>₹{displayOrder.total_amount || displayOrder.current_total_price}</span>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="mb-4">
              <div className="font-bold mb-2">PRODUCTS:</div>
              <div className="border border-black p-3">
                {displayOrder.line_items ? displayOrder.line_items.map((item: any, index: number) => (
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
