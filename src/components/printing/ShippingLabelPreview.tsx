import React from 'react';
import { X, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUpdateOrderStage } from '@/hooks/useOrders';
import { toast } from '@/hooks/use-toast';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { useQueryClient } from '@tanstack/react-query';

interface ShippingLabelPreviewProps {
  open: boolean;
  onClose: () => void;
  order?: any;
  orders?: any[]; // For bulk printing
  onPrintComplete?: (orderId: string | string[]) => void;
}

const ShippingLabelPreview = ({ open, onClose, order, orders, onPrintComplete }: ShippingLabelPreviewProps) => {
  const updateOrderStage = useUpdateOrderStage();
  const queryClient = useQueryClient();
  
  const isBulkPrint = orders && orders.length > 0;
  const ordersToProcess = isBulkPrint ? orders : [order].filter(Boolean);

  if (!order && !orders?.length) return null;

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

  // Generate HTML barcode that matches the React component exactly
  const generateBarcodeHTML = (text: string) => {
    const bars = generateBarcode(text);
    return bars.map((width, index) => 
      `<div style="display: inline-block; background-color: ${index % 2 === 0 ? '#000' : '#fff'}; width: ${width === 1 ? 2 : 4}px; height: 50px; min-width: ${width === 1 ? 2 : 4}px; vertical-align: bottom;"></div>`
    ).join('');
  };

  const createLabelHTML = (orderData: any, isLast: boolean = false) => {
    try {
      console.log('Creating label HTML for order:', orderData);
      
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

      // Generate exact same barcode as in preview
      const barcodeHTML = generateBarcodeHTML(trackingNumber);

      // Only add page break if it's not the last item in bulk print, or if it's a single print
      const pageBreak = isBulkPrint && !isLast ? 'page-break-after: always;' : '';

      return `
        <div style="border: 2px solid #000; padding: 16px; background: #fff; font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.3; color: #000; margin-bottom: 15px; max-width: 600px; ${pageBreak}">
          <!-- 1. Barcode Section -->
          <div style="text-align: center; border: 1px solid #000; padding: 12px; background: #f9fafb; margin-bottom: 12px;">
            <div style="background: #fff; padding: 8px; border: 1px solid #d1d5db; margin-bottom: 6px;">
              <div style="text-align: center; height: 50px; display: flex; align-items: end; justify-content: center;">
                ${barcodeHTML}
              </div>
            </div>
            <div style="font-weight: bold; font-size: 12px;">${trackingNumber}</div>
          </div>

          <!-- 2. TO Section -->
          <div style="margin-bottom: 12px;">
            <div style="font-weight: bold; margin-bottom: 6px;">📍 TO:</div>
            <div style="border: 1px solid #000; padding: 10px; background: #fffbeb;">
              <div style="font-weight: bold; font-size: 14px;">${customerName.toUpperCase()}</div>
              <div style="margin-top: 2px;">${shippingAddress.address1}</div>
              ${shippingAddress.address2 ? `<div>${shippingAddress.address2}</div>` : ''}
              <div>${shippingAddress.city}, ${shippingAddress.province} ${shippingAddress.zip}</div>
              <div>${shippingAddress.country}</div>
              <div>Ph: ${shippingAddress.phone || 'N/A'}</div>
            </div>
          </div>

          <!-- 3. FROM Section and Courier Details - Split Layout -->
          <div style="display: flex; margin-bottom: 12px; gap: 8px;">
            <!-- FROM Section - Left Side -->
            <div style="flex: 1;">
              <div style="font-weight: bold; margin-bottom: 6px;">FROM:</div>
              <div style="border: 1px solid #000; padding: 10px; background: #f9fafb; height: 100%;">
                <div style="font-weight: bold;">Black Lovers</div>
                <div>WhatsApp: 7990190234</div>
              </div>
            </div>
            
            <!-- Courier Details - Right Side -->
            <div style="flex: 1;">
              <div style="font-weight: bold; margin-bottom: 6px;">COURIER DETAILS:</div>
              <div style="border: 1px solid #000; padding: 10px; background: #f0f9ff; height: 100%;">
                <div>Order: <strong>${orderNumber}</strong></div>
                <div>Weight: ${totalWeight}</div>
                <div>Items: ${totalItems}</div>
                <div>Total: ₹${orderData.total_amount || orderData.current_total_price}</div>
              </div>
            </div>
          </div>

          <!-- 4. Products -->
          <div style="margin-bottom: 12px;">
            <div style="font-weight: bold; margin-bottom: 6px;">PRODUCTS:</div>
            <div style="border: 1px solid #000; padding: 10px;">
              ${orderData.line_items ? orderData.line_items.map((item: any) => 
                `<div style="margin-bottom: 2px;">• ${item.title || item.name} (Qty: <strong>${item.quantity || 1}</strong>)</div>`
              ).join('') : '<div>• Order Items</div>'}
            </div>
          </div>

          <!-- 5. Footer -->
          <div style="text-align: center; border-top: 2px solid #000; padding-top: 8px; font-weight: bold; font-size: 10px;">
            <div>PARCEL OPENING VIDEO is MUST For raising complaints</div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error creating label HTML:', error);
      throw error;
    }
  };

  const printWithCurrentWindow = (labelsHTML: string) => {
    try {
      console.log('Using fallback print method with current window');
      
      // Create a temporary div for printing
      const printDiv = document.createElement('div');
      printDiv.innerHTML = labelsHTML;
      printDiv.style.display = 'none';
      document.body.appendChild(printDiv);

      // Add print styles
      const printStyles = document.createElement('style');
      printStyles.innerHTML = `
        @media print {
          body * { visibility: hidden; }
          #print-content, #print-content * { visibility: visible; }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 0.3in;
            size: A4;
          }
        }
      `;
      printDiv.id = 'print-content';
      document.head.appendChild(printStyles);

      // Print and cleanup
      window.print();
      
      setTimeout(() => {
        document.body.removeChild(printDiv);
        document.head.removeChild(printStyles);
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Fallback print method failed:', error);
      return false;
    }
  };

  const handlePrint = async () => {
    try {
      console.log('Starting print process...');
      console.log('Orders to process:', ordersToProcess);

      // Generate HTML for all labels
      const labelsHTML = ordersToProcess.map((orderData, index) => {
        try {
          const isLast = index === ordersToProcess.length - 1;
          return createLabelHTML(orderData, isLast);
        } catch (error) {
          console.error('Error creating HTML for order:', orderData.id, error);
          throw error;
        }
      }).join('');

      console.log('Generated labels HTML, length:', labelsHTML.length);

      // Try popup window approach first
      let printSuccess = false;
      
      try {
        const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        
        if (printWindow) {
          console.log('Print window opened successfully');
          
          // Write complete HTML document
          const htmlDocument = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Shipping Labels - ${isBulkPrint ? `${ordersToProcess.length} Labels` : ordersToProcess[0]?.order_number}</title>
                <meta charset="UTF-8">
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body { 
                    font-family: 'Courier New', monospace; 
                    padding: 15px;
                    background: white;
                    line-height: 1.3;
                  }
                  @media print {
                    body { 
                      padding: 0; 
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                    }
                    @page { 
                      margin: 0.3in; 
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
                  console.log('Print window loaded');
                  window.onload = function() {
                    setTimeout(function() {
                      console.log('Triggering print');
                      window.print();
                    }, 1000);
                  };
                  window.onafterprint = function() {
                    console.log('Print completed, closing window');
                    setTimeout(function() { window.close(); }, 500);
                  };
                </script>
              </body>
            </html>
          `;

          printWindow.document.write(htmlDocument);
          printWindow.document.close();
          printSuccess = true;
          
        } else {
          console.log('Popup blocked, trying fallback method');
          printSuccess = printWithCurrentWindow(labelsHTML);
        }
      } catch (error) {
        console.log('Popup method failed, trying fallback:', error);
        printSuccess = printWithCurrentWindow(labelsHTML);
      }

      if (!printSuccess) {
        throw new Error('Both print methods failed');
      }

      console.log('Print initiated successfully');

      // Sync Shopify orders to Supabase and update order stages
      try {
        console.log('Syncing orders to Supabase and updating stages...');
        for (const orderData of ordersToProcess) {
          if (orderData.id) {
            try {
              console.log('Syncing Shopify order to Supabase:', orderData.id);
              // First, sync the Shopify order to Supabase using the correct method name
              const supabaseOrderId = await supabaseOrderService.syncShopifyOrderToSupabase(orderData);
              
              console.log('Successfully synced and updated order:', orderData.id);
            } catch (orderError) {
              console.error('Failed to sync/update order:', orderData.id, orderError);
              // Continue with other orders even if one fails
            }
          }
        }
        console.log('Order sync and stage updates completed');
        
        // Refresh all order queries to update the UI
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        console.log('Invalidated order queries for UI refresh');
        
      } catch (stageError) {
        console.warn('Order stage update process failed (but printing succeeded):', stageError);
        toast({
          title: "Partial Success",
          description: "Labels printed successfully, but some order stages may not have been updated.",
          variant: "default"
        });
      }

      // Call completion handler
      if (onPrintComplete) {
        const orderIds = isBulkPrint 
          ? ordersToProcess.map(o => o.id) 
          : ordersToProcess[0]?.id;
        onPrintComplete(orderIds);
      }

      toast({
        title: "Success",
        description: `${ordersToProcess.length} label(s) printed successfully!`
      });
      
      // Close dialog after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Complete print process failed:', error);
      toast({
        title: "Printing Failed",
        description: `Error: ${error.message}. Please check your browser's popup settings and try again.`,
        variant: "destructive"
      });
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
            {/* 1. Barcode Section */}
            <div className="text-center border border-black p-4 bg-gray-50 mb-4">
              <div className="bg-white p-3 border border-gray-300 mb-2">
                {renderBarcode(trackingNumber)}
              </div>
              <div className="font-bold text-sm">{trackingNumber}</div>
            </div>

            {/* 2. TO Section */}
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

            {/* 3. FROM Section and Courier Details - Split Layout */}
            <div className="flex mb-4 gap-2">
              {/* FROM Section - Left Side */}
              <div className="flex-1">
                <div className="font-bold mb-2">FROM:</div>
                <div className="border border-black p-3 bg-gray-50 h-full">
                  <div className="font-bold">Black Lovers</div>
                  <div>WhatsApp: 7990190234</div>
                </div>
              </div>
              
              {/* Courier Details - Right Side */}
              <div className="flex-1">
                <div className="font-bold mb-2">COURIER DETAILS:</div>
                <div className="border border-black p-3 bg-blue-50 h-full">
                  <div>Order: <strong>{orderNumber}</strong></div>
                  <div>Weight: {totalWeight}</div>
                  <div>Items: {totalItems}</div>
                  <div>Total: ₹{displayOrder.total_amount || displayOrder.current_total_price}</div>
                </div>
              </div>
            </div>

            {/* 4. Products */}
            <div className="mb-4">
              <div className="font-bold mb-2">PRODUCTS:</div>
              <div className="border border-black p-3">
                {displayOrder.line_items ? displayOrder.line_items.map((item: any, index: number) => (
                  <div key={index}>• {item.title || item.name} (Qty: <strong>{item.quantity || 1}</strong>)</div>
                )) : (
                  <div>• Order Items</div>
                )}
              </div>
            </div>

            {/* 5. Footer */}
            <div className="text-center border-t-2 border-black pt-2 font-bold text-xs">
              <div>PARCEL OPENING VIDEO is MUST For raising complaints</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingLabelPreview;
