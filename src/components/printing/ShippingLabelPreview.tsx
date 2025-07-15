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
    // Clean the text to make it more scannable
    const cleanText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const barPattern = [];
    
    // Start pattern
    barPattern.push(3, 1, 1, 1, 3, 1);
    
    // Generate more consistent bars based on text
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText.charCodeAt(i);
      const pattern = char % 10;
      switch (pattern) {
        case 0: barPattern.push(3, 1, 1, 3, 1, 1); break;
        case 1: barPattern.push(1, 3, 1, 3, 1, 1); break;
        case 2: barPattern.push(1, 1, 3, 3, 1, 1); break;
        case 3: barPattern.push(3, 3, 1, 1, 1, 1); break;
        case 4: barPattern.push(1, 1, 1, 3, 3, 1); break;
        case 5: barPattern.push(3, 1, 1, 1, 1, 3); break;
        case 6: barPattern.push(1, 3, 1, 1, 1, 3); break;
        case 7: barPattern.push(1, 1, 3, 1, 1, 3); break;
        case 8: barPattern.push(1, 1, 1, 1, 3, 3); break;
        case 9: barPattern.push(3, 1, 1, 3, 1, 1); break;
      }
    }
    
    // End pattern
    barPattern.push(3, 1, 1, 1, 3, 1, 1);
    
    return barPattern;
  };

  const renderBarcode = (text: string) => {
    const cleanText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const bars = generateBarcode(cleanText);
    return (
      <div className="flex items-end justify-center space-x-0" style={{ height: '60px' }}>
        {bars.map((width, index) => (
          <div
            key={index}
            className={index % 2 === 0 ? "bg-black" : "bg-white"}
            style={{
              width: `${width === 1 ? 1.5 : width === 3 ? 4.5 : 3}px`,
              height: '60px',
              minWidth: `${width === 1 ? 1.5 : width === 3 ? 4.5 : 3}px`
            }}
          />
        ))}
      </div>
    );
  };

  // Generate HTML barcode that matches the React component exactly
  const generateBarcodeHTML = (text: string) => {
    const cleanText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const bars = generateBarcode(cleanText);
    return bars.map((width, index) => 
      `<div style="display: inline-block; background-color: ${index % 2 === 0 ? '#000' : '#fff'}; width: ${width === 1 ? 1.5 : width === 3 ? 4.5 : 3}px; height: 60px; min-width: ${width === 1 ? 1.5 : width === 3 ? 4.5 : 3}px; vertical-align: bottom;"></div>`
    ).join('');
  };

  const createLabelHTML = (orderData: any, isLast: boolean = false) => {
    try {
      console.log('Creating label HTML for order:', orderData);
      
      const orderNumber = orderData.order_number || orderData.name || `#${orderData.id}`;
      const trackingNumber = orderNumber.toString().replace('#', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      
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

      // Calculate dynamic heights based on content
      const productCount = orderData.line_items ? orderData.line_items.length : 1;
      const productSectionHeight = Math.max(60, Math.min(120, productCount * 20));

      // Only add page break if it's not the last item in bulk print, or if it's a single print
      const pageBreak = isBulkPrint && !isLast ? 'page-break-after: always;' : '';

      return `
        <div style="width: 4in; height: 6in; border: 2px solid #000; padding: 8px; background: #fff; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; line-height: 1.1; color: #000; margin: 0; box-sizing: border-box; display: flex; flex-direction: column; ${pageBreak}">
          <!-- 1. Barcode Section -->
          <div style="text-align: center; border: 1px solid #000; padding: 4px; background: #f9fafb; margin-bottom: 4px; flex-shrink: 0;">
            <div style="background: #fff; padding: 4px; border: 1px solid #d1d5db; margin-bottom: 2px;">
              <div style="text-align: center; height: 50px; display: flex; align-items: end; justify-content: center;">
                ${barcodeHTML}
              </div>
            </div>
            <div style="font-weight: bold; font-size: 11px;">${trackingNumber}</div>
          </div>

          <!-- 2. TO Section -->
          <div style="margin-bottom: 4px; flex-shrink: 0;">
            <div style="font-weight: bold; margin-bottom: 2px;">📍 TO:</div>
            <div style="border: 1px solid #000; padding: 4px; background: #fffbeb;">
              <div style="font-weight: bold; font-size: 11px; word-wrap: break-word;">${customerName.toUpperCase()}</div>
              <div style="margin-top: 1px; font-size: 9px; word-wrap: break-word;">${shippingAddress.address1}</div>
              ${shippingAddress.address2 ? `<div style="font-size: 9px; word-wrap: break-word;">${shippingAddress.address2}</div>` : ''}
              <div style="font-size: 9px;">${shippingAddress.city}, ${shippingAddress.province} ${shippingAddress.zip}</div>
              <div style="font-size: 9px;">${shippingAddress.country}</div>
              <div style="font-size: 9px;">Ph: ${shippingAddress.phone || 'N/A'}</div>
            </div>
          </div>

          <!-- 3. FROM Section and Courier Details - Split Layout -->
          <div style="display: flex; margin-bottom: 4px; gap: 4px; flex-shrink: 0;">
            <!-- FROM Section - Left Side -->
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: bold; margin-bottom: 2px; font-size: 9px;">FROM:</div>
              <div style="border: 1px solid #000; padding: 4px; background: #f9fafb; height: 50px; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word; font-size: 8px;">
                <div style="font-weight: bold;">Black Lovers</div>
                <div>WhatsApp: 7990190234</div>
              </div>
            </div>
            
            <!-- Courier Details - Right Side -->
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: bold; margin-bottom: 2px; font-size: 9px;">COURIER DETAILS:</div>
              <div style="border: 1px solid #000; padding: 4px; background: #f0f9ff; height: 50px; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word; font-size: 8px;">
                <div style="margin-bottom: 1px;">Order: <strong>${orderNumber}</strong></div>
                <div style="margin-bottom: 1px;">Weight: ${totalWeight}</div>
                <div style="margin-bottom: 1px;">Items: ${totalItems}</div>
                <div>Total: ₹${orderData.total_amount || orderData.current_total_price}</div>
              </div>
            </div>
          </div>

          <!-- 4. Products - Flexible Height -->
          <div style="margin-bottom: 4px; flex: 1; display: flex; flex-direction: column;">
            <div style="font-weight: bold; margin-bottom: 2px; font-size: 9px;">PRODUCTS:</div>
            <div style="border: 1px solid #000; padding: 4px; flex: 1; overflow: hidden; font-size: 8px;">
              ${orderData.line_items ? orderData.line_items.map((item: any) => 
                `<div style="margin-bottom: 1px; word-wrap: break-word;">• ${item.title || item.name} (Qty: <strong>${item.quantity || 1}</strong>)</div>`
              ).join('') : '<div>• Order Items</div>'}
            </div>
          </div>

          <!-- 5. Footer -->
          <div style="text-align: center; border-top: 2px solid #000; padding-top: 4px; font-weight: bold; font-size: 8px; flex-shrink: 0;">
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
            margin: 0.2in;
            size: 4in 6in;
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
                    font-family: Arial, sans-serif; 
                    font-weight: bold;
                    padding: 10px;
                    background: white;
                    line-height: 1.1;
                  }
                  @media print {
                    body { 
                      padding: 0; 
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                    }
                    @page { 
                      margin: 0.2in; 
                      size: 4in 6in; 
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

      // Create orders in Supabase and move to packing stage after successful print
      try {
        console.log('Creating/syncing orders to Supabase and moving to packing stage...');
        for (const orderData of ordersToProcess) {
          if (orderData.id) {
            try {
              console.log('Syncing Shopify order to Supabase:', orderData.id);
              await supabaseOrderService.syncShopifyOrderToSupabase(orderData);
              console.log('Successfully synced and moved order to packing:', orderData.id);
            } catch (orderError) {
              console.error('Failed to sync order:', orderData.id, orderError);
              // Continue with other orders even if one fails
            }
          }
        }
        console.log('Order sync and stage updates completed');
        
        // Refresh all order queries to update the UI
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        console.log('Invalidated order queries for UI refresh');
        
      } catch (stageError) {
        console.warn('Order sync process failed (but printing succeeded):', stageError);
        toast({
          title: "Partial Success",
          description: "Labels printed successfully, but some orders may not have been moved to packing stage.",
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
        description: `${ordersToProcess.length} label(s) printed successfully and moved to packing stage!`
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
  const trackingNumber = orderNumber.toString().replace('#', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>
            Print Preview - {isBulkPrint ? `${ordersToProcess.length} Labels` : '1 Label'} (4x6 Format)
          </DialogTitle>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handlePrint} 
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={updateOrderStage.isPending}
            >
              <Printer className="h-4 w-4 mr-2" />
              {updateOrderStage.isPending ? 'Processing...' : 'Print & Move to Packing'}
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
                <strong>Bulk Print:</strong> {ordersToProcess.length} labels will be printed and orders will be automatically moved to packing stage.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Preview shows the first label. All labels will use the same template with full-width layout.
              </p>
            </div>
          )}
          
          <div className="print-content border-2 border-black bg-white font-sans text-sm font-bold flex flex-col" style={{ width: '4in', height: '6in', padding: '8px', boxSizing: 'border-box' }}>
            {/* 1. Barcode Section */}
            <div className="text-center border border-black p-2 bg-gray-50 mb-2 flex-shrink-0">
              <div className="bg-white p-2 border border-gray-300 mb-1">
                {renderBarcode(trackingNumber)}
              </div>
              <div className="font-bold text-sm">{trackingNumber}</div>
            </div>

            {/* 2. TO Section */}
            <div className="mb-2 flex-shrink-0">
              <div className="flex items-center mb-1">
                <span className="mr-2">📍</span>
                <span className="font-bold text-xs">TO:</span>
              </div>
              <div className="border border-black p-2 bg-yellow-50">
                <div className="font-bold text-sm break-words">
                  {customerName.toUpperCase()}
                </div>
                <div className="text-xs break-words">{shippingAddress.address1}</div>
                {shippingAddress.address2 && <div className="text-xs break-words">{shippingAddress.address2}</div>}
                <div className="text-xs">{shippingAddress.city}, {shippingAddress.province} {shippingAddress.zip}</div>
                <div className="text-xs">{shippingAddress.country}</div>
                <div className="text-xs">Ph: {shippingAddress.phone || 'N/A'}</div>
              </div>
            </div>

            {/* 3. FROM Section and Courier Details - Split Layout */}
            <div className="flex mb-2 gap-2 flex-shrink-0">
              {/* FROM Section - Left Side */}
              <div className="flex-1 min-w-0">
                <div className="font-bold mb-1 text-xs">FROM:</div>
                <div className="border border-black p-2 bg-gray-50 break-words overflow-wrap-anywhere text-xs" style={{ height: '50px' }}>
                  <div className="font-bold">Black Lovers</div>
                  <div>WhatsApp: 7990190234</div>
                </div>
              </div>
              
              {/* Courier Details - Right Side */}
              <div className="flex-1 min-w-0">
                <div className="font-bold mb-1 text-xs">COURIER DETAILS:</div>
                <div className="border border-black p-2 bg-blue-50 break-words overflow-wrap-anywhere text-xs" style={{ height: '50px' }}>
                  <div className="mb-0.5">Order: <strong>{orderNumber}</strong></div>
                  <div className="mb-0.5">Weight: {totalWeight}</div>
                  <div className="mb-0.5">Items: {totalItems}</div>
                  <div>Total: ₹{displayOrder.total_amount || displayOrder.current_total_price}</div>
                </div>
              </div>
            </div>

            {/* 4. Products - Flexible Height */}
            <div className="mb-2 flex flex-col flex-1">
              <div className="font-bold mb-1 text-xs">PRODUCTS:</div>
              <div className="border border-black p-2 flex-1 overflow-hidden text-xs">
                {displayOrder.line_items ? displayOrder.line_items.map((item: any, index: number) => (
                  <div key={index} className="mb-0.5 break-words">• {item.title || item.name} (Qty: <strong>{item.quantity || 1}</strong>)</div>
                )) : (
                  <div>• Order Items</div>
                )}
              </div>
            </div>

            {/* 5. Footer */}
            <div className="text-center border-t-2 border-black pt-2 font-bold text-xs flex-shrink-0">
              <div>PARCEL OPENING VIDEO is MUST For raising complaints</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingLabelPreview;
