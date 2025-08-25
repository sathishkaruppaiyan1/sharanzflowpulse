import React from 'react';
import { X, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUpdateOrderStage } from '@/hooks/useOrders';
import { toast } from '@/hooks/use-toast';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { useQueryClient } from '@tanstack/react-query';
import { generateTrackingBarcode, generateCode128Barcode, getPhoneNumber } from '@/lib/utils';

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

  const renderBarcode = (text: string) => {
    const trackingNumber = generateTrackingBarcode(text);
    const barcodeSVG = generateCode128Barcode(trackingNumber);
    
    return (
      <div 
        className="flex items-center justify-center bg-white p-2 border border-gray-300" 
        style={{ height: '70px' }}
        dangerouslySetInnerHTML={{ __html: barcodeSVG }}
      />
    );
  };

  // Helper function to format product with variation for shipping label
  const formatProductWithVariation = (item: any) => {
    const baseTitle = item.title || item.name || 'Product';
    
    // Extract variation from SKU if available
    if (item.sku && item.sku.includes('/')) {
      const variation = item.sku.split('/').slice(1).join('/');
      return `${baseTitle} - ${variation}`;
    }
    
    // Fallback to variant_title if available
    if (item.variant_title) {
      return `${baseTitle} - ${item.variant_title}`;
    }
    
    return baseTitle;
  };

  // Helper function to calculate dynamic font size based on number of items
  const getProductFontSize = (itemCount: number) => {
    if (itemCount <= 3) return '10px';
    if (itemCount <= 5) return '9px';
    if (itemCount <= 7) return '8px';
    if (itemCount <= 10) return '7px';
    return '6px'; // For more than 10 items
  };

  // Helper function to get line height based on font size
  const getLineHeight = (fontSize: string) => {
    const sizeMap: { [key: string]: string } = {
      '10px': '1.3',
      '9px': '1.2',
      '8px': '1.1',
      '7px': '1.0',
      '6px': '0.9'
    };
    return sizeMap[fontSize] || '1.0';
  };

  const createLabelHTML = (orderData: any, isLast: boolean = false) => {
    try {
      console.log('Creating label HTML for order:', orderData);
      
      const orderNumber = orderData.order_number || orderData.name || `#${orderData.id}`;
      const trackingNumber = generateTrackingBarcode(orderNumber);
      
      const customerName = orderData.customer_name || 
        `${orderData.customer?.first_name || ''} ${orderData.customer?.last_name || ''}`.trim() || 
        'Guest Customer';

      const shippingAddress = orderData.shipping_address || {
        address1: 'Address not available',
        address_line_1: 'Address not available',
        city: 'City',
        province: 'State',
        state: 'State',
        zip: '000000',
        postal_code: '000000',
        country: 'India'
      };

      // Get phone number using our helper function
      const phoneNumber = getPhoneNumber(orderData) || 'N/A';

      const lineItems = orderData.line_items || [];
      const totalItems = lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
      const totalWeight = orderData.total_weight ? `${orderData.total_weight}g` : '750g';

      // Calculate dynamic font size based on number of line items
      const productFontSize = getProductFontSize(lineItems.length);
      const lineHeight = getLineHeight(productFontSize);

      // Generate Code 128 barcode SVG
      const barcodeSVG = generateCode128Barcode(trackingNumber);

      // Only add page break if it's not the last item in bulk print
      const pageBreak = isBulkPrint && !isLast ? 'page-break-after: always;' : '';

      return `
        <div style="width: 4in; height: 6in; border: 2px solid #000; background: #fff; font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #000; margin: 0; box-sizing: border-box; display: flex; flex-direction: column; ${pageBreak}">
          
          <!-- Barcode Section -->
          <div style="padding: 10px; text-align: center; background: #fff;">
            <div style="background: #fff; border: 1px solid #000; padding: 8px; margin-bottom: 5px;">
              ${barcodeSVG}
            </div>
            <div style="font-weight: bold; font-size: 14px; margin-top: 5px;">${trackingNumber}</div>
          </div>

          <!-- Separator Line -->
          <div style="border-bottom: 2px solid #000; margin: 0;"></div>

          <!-- TO Section -->
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">🔴 TO:</div>
            <div style="padding: 8px 0; background: #fff;">
              <div style="font-weight: bold; font-size: 12px; margin-bottom: 2px;">${customerName.toUpperCase()}</div>
              <div style="font-size: 10px; margin-bottom: 1px;">${shippingAddress.address1 || shippingAddress.address_line_1}</div>
              ${(shippingAddress.address2 || shippingAddress.address_line_2) ? `<div style="font-size: 10px; margin-bottom: 1px;">${shippingAddress.address2 || shippingAddress.address_line_2}</div>` : ''}
              <div style="font-size: 10px; margin-bottom: 1px;">${shippingAddress.city}, ${shippingAddress.province || shippingAddress.state} ${shippingAddress.zip || shippingAddress.postal_code}</div>
              <div style="font-size: 10px; margin-bottom: 1px;">${shippingAddress.country}</div>
              <div style="font-size: 10px;">Ph: ${phoneNumber}</div>
            </div>
          </div>

          <!-- Separator Line -->
          <div style="border-bottom: 1px solid #000; margin: 0;"></div>

          <!-- FROM and COURIER DETAILS Section -->
          <div style="padding: 8px; display: flex;">
            <div style="flex: 1; margin-right: 5px;">
              <div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">FROM:</div>
              <div style="padding: 6px 0; background: #fff; font-size: 10px; height: 60px;">
                <div style="font-weight: bold;">Black Lovers</div>
                <div>WhatsApp: 7990190234</div>
              </div>
            </div>
            
            <!-- Vertical separator between FROM and COURIER DETAILS -->
            <div style="width: 1px; background: #000; margin: 0 5px;"></div>
            
            <div style="flex: 1; margin-left: 5px;">
              <div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">COURIER DETAILS:</div>
              <div style="padding: 6px 0; background: #fff; font-size: 10px; height: 60px;">
                <div style="margin-bottom: 2px;">Order: <strong>${orderNumber}</strong></div>
                <div style="margin-bottom: 2px;">Weight: ${totalWeight}</div>
                <div style="margin-bottom: 2px;">Items: ${totalItems}</div>
                <div>Total: ₹${orderData.total_amount || orderData.current_total_price}</div>
              </div>
            </div>
          </div>

          <!-- Separator Line -->
          <div style="border-bottom: 1px solid #000; margin: 0;"></div>

          <!-- Products Section with Dynamic Font Size -->
          <div style="flex: 1; padding: 8px; display: flex; flex-direction: column;">
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">PRODUCTS:</div>
            <div style="padding: 6px 0; flex: 1; overflow: hidden; font-size: ${productFontSize}; line-height: ${lineHeight}; background: #fff;">
              ${lineItems.length > 0 ? lineItems.map((item: any) => {
                const productWithVariation = formatProductWithVariation(item);
                return `<div style="margin-bottom: 2px; word-wrap: break-word; overflow: hidden;">
                  • ${productWithVariation} (Qty: ${item.quantity || 1})
                </div>`;
              }).join('') : '<div>• Order Items</div>'}
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; border-top: 2px solid #000; padding: 6px; font-weight: bold; font-size: 10px; background: #fff;">
            PARCEL OPENING VIDEO is MUST For raising complaints
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
  const trackingNumber = generateTrackingBarcode(orderNumber);
  
  const customerName = displayOrder.customer_name || 
    `${displayOrder.customer?.first_name || ''} ${displayOrder.customer?.last_name || ''}`.trim() || 
    'Guest Customer';

  const shippingAddress = displayOrder.shipping_address || {
    address1: 'Address not available',
    address_line_1: 'Address not available',
    city: 'City',
    province: 'State',
    state: 'State',
    zip: '000000',
    postal_code: '000000',
    country: 'India'
  };

  const phoneNumber = getPhoneNumber(displayOrder) || 'N/A';

  const lineItems = displayOrder.line_items || [];
  const totalItems = lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
  const totalWeight = displayOrder.total_weight ? `${displayOrder.total_weight}g` : '750g';

  // Calculate dynamic font size for preview
  const previewFontSize = getProductFontSize(lineItems.length);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>
            Print Preview - {isBulkPrint ? `${ordersToProcess.length} Labels` : '1 Label'} (4x6 Format - Code 128)
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
                <strong>Bulk Print:</strong> {ordersToProcess.length} labels will be printed with Code 128 barcodes and orders will be automatically moved to packing stage.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Preview shows the first label. All labels will use the same template with proper Code 128 barcode format and dynamic font sizing.
              </p>
            </div>
          )}
          
          <div className="print-content border-2 border-black bg-white font-sans text-sm font-bold flex flex-col" style={{ width: '4in', height: '6in', boxSizing: 'border-box' }}>
            
            {/* Barcode Section */}
            <div className="p-2 text-center bg-white">
              <div className="bg-white border border-black p-2 mb-1">
                {renderBarcode(trackingNumber)}
              </div>
              <div className="font-bold text-sm mt-1">{trackingNumber}</div>
            </div>

            {/* Separator */}
            <Separator className="bg-black h-0.5" />

            {/* TO Section */}
            <div className="p-2">
              <div className="flex items-center mb-1">
                <span className="mr-1 text-red-600">🔴</span>
                <span className="font-bold text-xs">TO:</span>
              </div>
              <div className="py-2 bg-white">
                <div className="font-bold text-xs break-words mb-0.5">
                  {customerName.toUpperCase()}
                </div>
                <div className="text-xs break-words">{shippingAddress.address1 || shippingAddress.address_line_1}</div>
                {(shippingAddress.address2 || shippingAddress.address_line_2) && <div className="text-xs break-words">{shippingAddress.address2 || shippingAddress.address_line_2}</div>}
                <div className="text-xs">{shippingAddress.city}, {shippingAddress.province || shippingAddress.state} {shippingAddress.zip || shippingAddress.postal_code}</div>
                <div className="text-xs">{shippingAddress.country}</div>
                <div className="text-xs">Ph: {phoneNumber}</div>
              </div>
            </div>

            {/* Separator */}
            <Separator className="bg-black h-px" />

            {/* FROM and COURIER DETAILS Section */}
            <div className="p-2 flex">
              <div className="flex-1 mr-1">
                <div className="font-bold mb-1 text-xs">FROM:</div>
                <div className="py-1 bg-white text-xs h-16">
                  <div className="font-bold">Black Lovers</div>
                  <div>WhatsApp: 7990190234</div>
                </div>
              </div>
              
              {/* Vertical Separator */}
              <Separator orientation="vertical" className="bg-black w-px mx-1" />
              
              <div className="flex-1 ml-1">
                <div className="font-bold mb-1 text-xs">COURIER DETAILS:</div>
                <div className="py-1 bg-white text-xs h-16">
                  <div className="mb-0.5">Order: <strong>{orderNumber}</strong></div>
                  <div className="mb-0.5">Weight: {totalWeight}</div>
                  <div className="mb-0.5">Items: {totalItems}</div>
                  <div>Total: ₹{displayOrder.total_amount || displayOrder.current_total_price}</div>
                </div>
              </div>
            </div>

            {/* Separator */}
            <Separator className="bg-black h-px" />

            {/* Products Section with Dynamic Font Size */}
            <div className="flex-1 p-2 flex flex-col">
              <div className="font-bold mb-1 text-xs">PRODUCTS:</div>
              <div className="py-1 flex-1 overflow-hidden bg-white" style={{ fontSize: previewFontSize, lineHeight: getLineHeight(previewFontSize) }}>
                {lineItems.length > 0 ? lineItems.map((item: any, index: number) => (
                  <div key={index} className="mb-0.5 break-words">
                    <div>• {formatProductWithVariation(item)} (Qty: {item.quantity || 1})</div>
                  </div>
                )) : (
                  <div>• Order Items</div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center border-t-2 border-black p-1 font-bold text-xs bg-white">
              PARCEL OPENING VIDEO is MUST For raising complaints
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingLabelPreview;
