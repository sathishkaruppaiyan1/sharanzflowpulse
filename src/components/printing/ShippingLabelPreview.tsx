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

  // Generate simple linear barcode (Code 128 style bars)
  const generateSimpleBarcode = (text: string) => {
    const cleanText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Create a pattern of bars based on the text
    const bars = [];
    
    // Start pattern
    bars.push(3, 1, 1, 1, 1, 1);
    
    // Generate bars for each character
    for (let i = 0; i < cleanText.length; i++) {
      const charCode = cleanText.charCodeAt(i);
      const pattern = [
        (charCode % 4) + 1,
        ((charCode + 1) % 3) + 1,
        ((charCode + 2) % 4) + 1,
        ((charCode + 3) % 3) + 1
      ];
      bars.push(...pattern);
    }
    
    // End pattern
    bars.push(3, 1, 1, 1, 1, 3);
    
    return bars;
  };

  const renderBarcode = (text: string) => {
    const cleanText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const bars = generateSimpleBarcode(cleanText);
    
    return (
      <div className="flex items-end justify-center" style={{ height: '40px', gap: '0' }}>
        {bars.map((width, index) => (
          <div
            key={index}
            className={index % 2 === 0 ? "bg-black" : ""}
            style={{
              width: `${width}px`,
              height: '40px',
              minWidth: `${width}px`
            }}
          />
        ))}
      </div>
    );
  };

  // Generate HTML barcode that matches the React component
  const generateBarcodeHTML = (text: string) => {
    const cleanText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const bars = generateSimpleBarcode(cleanText);
    
    return bars.map((width, index) => 
      `<div style="display: inline-block; ${index % 2 === 0 ? 'background-color: #000;' : ''} width: ${width}px; height: 40px; min-width: ${width}px;"></div>`
    ).join('');
  };

  const getProductDisplayName = (item: any) => {
    const name = item.title || item.name || 'Product';
    const variant = item.variant_title || item.sku || '';
    return variant ? `${name} - ${variant}` : name;
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

      // Generate barcode HTML
      const barcodeHTML = generateBarcodeHTML(trackingNumber);

      // Calculate font sizes based on content length
      const addressLength = `${shippingAddress.address1} ${customerName}`.length;
      const nameFontSize = customerName.length > 20 ? '10px' : '11px';
      const addressFontSize = addressLength > 50 ? '9px' : '10px';

      // Only add page break if it's not the last item in bulk print
      const pageBreak = isBulkPrint && !isLast ? 'page-break-after: always;' : '';

      return `
        <div style="width: 4in; height: 6in; border: 2px solid #000; padding: 8px; background: #fff; font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; line-height: 1.2; color: #000; margin: 0; box-sizing: border-box; display: flex; flex-direction: column; ${pageBreak}">
          <!-- 1. Barcode Section -->
          <div style="text-align: center; border: 2px solid #000; padding: 6px; background: #fff; margin-bottom: 6px; width: 100%; box-sizing: border-box;">
            <div style="background: #fff; padding: 4px; border: 1px solid #ccc; margin-bottom: 4px;">
              <div style="text-align: center; height: 40px; display: flex; align-items: end; justify-content: center;">
                ${barcodeHTML}
              </div>
            </div>
            <div style="font-weight: bold; font-size: 12px;">${trackingNumber}</div>
          </div>

          <!-- 2. TO Section -->
          <div style="margin-bottom: 6px; width: 100%; box-sizing: border-box;">
            <div style="font-weight: bold; margin-bottom: 4px; font-size: 12px; background: #fff; padding: 2px;">📍 TO:</div>
            <div style="border: 2px solid #000; padding: 6px; background: #fff; width: 100%; box-sizing: border-box; min-height: 100px;">
              <div style="font-weight: bold; font-size: ${nameFontSize}; word-wrap: break-word; overflow-wrap: break-word; margin-bottom: 3px;">${customerName.toUpperCase()}</div>
              <div style="font-size: ${addressFontSize}; word-wrap: break-word; overflow-wrap: break-word; margin-bottom: 2px;">${shippingAddress.address1}</div>
              ${shippingAddress.address2 ? `<div style="font-size: ${addressFontSize}; word-wrap: break-word; overflow-wrap: break-word; margin-bottom: 2px;">${shippingAddress.address2}</div>` : ''}
              <div style="font-size: ${addressFontSize}; word-wrap: break-word; margin-bottom: 2px;">${shippingAddress.city}, ${shippingAddress.province} ${shippingAddress.zip}</div>
              <div style="font-size: ${addressFontSize}; margin-bottom: 2px;">${shippingAddress.country}</div>
              <div style="font-size: ${addressFontSize};">Ph: ${shippingAddress.phone || 'N/A'}</div>
            </div>
          </div>

          <!-- 3. FROM and COURIER DETAILS - Two Columns -->
          <div style="display: flex; margin-bottom: 6px; gap: 4px; width: 100%; box-sizing: border-box;">
            <!-- FROM Section - Left Column -->
            <div style="flex: 1; width: 50%; box-sizing: border-box;">
              <div style="font-weight: bold; margin-bottom: 4px; font-size: 12px; background: #fff; padding: 2px;">FROM:</div>
              <div style="border: 2px solid #000; padding: 6px; background: #fff; width: 100%; box-sizing: border-box; font-size: 10px; height: 60px;">
                <div style="font-weight: bold; margin-bottom: 2px;">Black Lovers</div>
                <div>WhatsApp: 7990190234</div>
              </div>
            </div>

            <!-- COURIER DETAILS Section - Right Column -->
            <div style="flex: 1; width: 50%; box-sizing: border-box;">
              <div style="font-weight: bold; margin-bottom: 4px; font-size: 12px; background: #fff; padding: 2px;">COURIER DETAILS:</div>
              <div style="border: 2px solid #000; padding: 6px; background: #fff; width: 100%; box-sizing: border-box; font-size: 9px; height: 60px;">
                <div style="margin-bottom: 2px; word-wrap: break-word;">Order: <strong>${orderNumber}</strong></div>
                <div style="margin-bottom: 2px;">Weight: ${totalWeight}</div>
                <div style="word-wrap: break-word;">Items: ${totalItems} | Total: ₹${orderData.total_amount || orderData.current_total_price}</div>
              </div>
            </div>
          </div>

          <!-- 4. Products -->
          <div style="margin-bottom: 6px; flex: 1; display: flex; flex-direction: column; min-height: 0; width: 100%; box-sizing: border-box;">
            <div style="font-weight: bold; margin-bottom: 4px; font-size: 12px; background: #fff; padding: 2px;">PRODUCTS:</div>
            <div style="border: 2px solid #000; padding: 6px; flex: 1; overflow: hidden; font-size: 9px; word-wrap: break-word; overflow-wrap: break-word; width: 100%; box-sizing: border-box; background: #fff;">
              ${orderData.line_items ? orderData.line_items.map((item: any) => {
                const displayName = getProductDisplayName(item);
                const itemFontSize = displayName.length > 30 ? '8px' : '9px';
                return `<div style="margin-bottom: 3px; word-wrap: break-word; overflow-wrap: break-word; font-size: ${itemFontSize};">• ${displayName} (Qty: <strong>${item.quantity || 1}</strong>)</div>`;
              }).join('') : '<div>• Order Items</div>'}
            </div>
          </div>

          <!-- 5. Footer -->
          <div style="text-align: center; border-top: 3px solid #000; padding-top: 4px; font-weight: bold; font-size: 8px; margin-top: auto; width: 100%; box-sizing: border-box; background: #fff;">
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
                    line-height: 1.2;
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

  // Calculate responsive font sizes for preview
  const addressLength = `${shippingAddress.address1} ${customerName}`.length;
  const nameFontSize = customerName.length > 20 ? 'text-xs' : 'text-sm';
  const addressFontSize = addressLength > 50 ? 'text-xs' : 'text-sm';
  
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
                Preview shows the first label. All labels will use the same template with exact layout matching.
              </p>
            </div>
          )}
          
          <div className="print-content border-2 border-black bg-white font-sans text-sm font-bold flex flex-col" style={{ width: '4in', height: '6in', padding: '8px', boxSizing: 'border-box' }}>
            {/* 1. Barcode Section */}
            <div className="text-center border-2 border-black p-2 bg-white mb-2 w-full">
              <div className="bg-white p-1 border border-gray-300 mb-1">
                {renderBarcode(trackingNumber)}
              </div>
              <div className="font-bold text-sm">{trackingNumber}</div>
            </div>

            {/* 2. TO Section */}
            <div className="mb-2 w-full">
              <div className="flex items-center mb-1 bg-white p-1">
                <span className="mr-1 text-sm">📍</span>
                <span className="font-bold text-sm">TO:</span>
              </div>
              <div className="border-2 border-black p-2 bg-white w-full min-h-[100px]">
                <div className={`font-bold ${nameFontSize} break-words overflow-wrap-anywhere mb-1`}>
                  {customerName.toUpperCase()}
                </div>
                <div className={`${addressFontSize} break-words overflow-wrap-anywhere mb-1`}>{shippingAddress.address1}</div>
                {shippingAddress.address2 && <div className={`${addressFontSize} break-words overflow-wrap-anywhere mb-1`}>{shippingAddress.address2}</div>}
                <div className={`${addressFontSize} break-words mb-1`}>{shippingAddress.city}, {shippingAddress.province} {shippingAddress.zip}</div>
                <div className={`${addressFontSize} mb-1`}>{shippingAddress.country}</div>
                <div className={`${addressFontSize}`}>Ph: {shippingAddress.phone || 'N/A'}</div>
              </div>
            </div>

            {/* 3. FROM and COURIER DETAILS - Two Columns */}
            <div className="flex mb-2 gap-1 w-full">
              {/* FROM Section - Left Column */}
              <div className="flex-1 w-1/2">
                <div className="font-bold mb-1 text-sm bg-white p-1">FROM:</div>
                <div className="border-2 border-black p-2 bg-white text-xs w-full h-[60px]">
                  <div className="font-bold mb-1">Black Lovers</div>
                  <div>WhatsApp: 7990190234</div>
                </div>
              </div>

              {/* COURIER DETAILS Section - Right Column */}
              <div className="flex-1 w-1/2">
                <div className="font-bold mb-1 text-sm bg-white p-1">COURIER DETAILS:</div>
                <div className="border-2 border-black p-2 bg-white text-xs w-full h-[60px]">
                  <div className="mb-1 break-words">Order: <strong>{orderNumber}</strong></div>
                  <div className="mb-1">Weight: {totalWeight}</div>
                  <div className="break-words">Items: {totalItems} | Total: ₹{displayOrder.total_amount || displayOrder.current_total_price}</div>
                </div>
              </div>
            </div>

            {/* 4. Products */}
            <div className="mb-2 flex flex-col flex-1 min-h-0 w-full">
              <div className="font-bold mb-1 text-sm bg-white p-1">PRODUCTS:</div>
              <div className="border-2 border-black p-2 flex-1 overflow-hidden text-xs break-words overflow-wrap-anywhere w-full bg-white">
                {displayOrder.line_items ? displayOrder.line_items.map((item: any, index: number) => {
                  const displayName = getProductDisplayName(item);
                  const itemFontSize = displayName.length > 30 ? 'text-xs' : 'text-sm';
                  return (
                    <div key={index} className={`mb-1 break-words overflow-wrap-anywhere ${itemFontSize}`}>
                      • {displayName} (Qty: <strong>{item.quantity || 1}</strong>)
                    </div>
                  );
                }) : (
                  <div className="text-xs">• Order Items</div>
                )}
              </div>
            </div>

            {/* 5. Footer */}
            <div className="text-center border-t-2 border-black pt-1 font-bold text-xs mt-auto w-full bg-white">
              <div>PARCEL OPENING VIDEO is MUST For raising complaints</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingLabelPreview;
