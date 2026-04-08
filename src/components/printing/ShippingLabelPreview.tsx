import React, { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUpdateOrderStage } from '@/hooks/useOrders';
import { toast } from '@/hooks/use-toast';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { useQueryClient } from '@tanstack/react-query';
import { generateTrackingBarcode, generateCode128Barcode, getPhoneNumber } from '@/lib/utils';
import { useFromAddress, defaultFromAddress } from '@/hooks/useFromAddress';
import { useWorkflowSettings } from '@/hooks/useWorkflowSettings';

type TemplateType = 'thermal-4x6' | 'a5-packing-slip';

interface AddressFields {
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}

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
  const { fromAddress } = useFromAddress();
  const { settings: workflowSettings } = useWorkflowSettings();

  const isBulkPrint = orders && orders.length > 0;
  const ordersToProcess = isBulkPrint ? orders : [order].filter(Boolean);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(
    () => (localStorage.getItem('default_label_template') as TemplateType) || 'thermal-4x6'
  );
  const [toAddress, setToAddress] = useState<AddressFields>({
    name: '', address1: '', address2: '', city: '', state: '', zip: '', country: '', phone: ''
  });
  const bypassPacking = workflowSettings.bypassPacking;

  const displayOrder = isBulkPrint ? ordersToProcess[0] : order;

  // Populate address fields from the first order when it loads
  useEffect(() => {
    setSelectedTemplate(workflowSettings.labelTemplate as TemplateType);
  }, [workflowSettings.labelTemplate]);

  useEffect(() => {
    if (open) {
      setSelectedTemplate(workflowSettings.labelTemplate as TemplateType);
    }
  }, [open, workflowSettings.labelTemplate]);

  useEffect(() => {
    if (!displayOrder) return;
    const sa = displayOrder.shipping_address || {};
    const customerName = displayOrder.customer_name ||
      `${displayOrder.customer?.first_name || ''} ${displayOrder.customer?.last_name || ''}`.trim() ||
      'Guest Customer';
    setToAddress({
      name: customerName,
      address1: sa.address1 || sa.address_line_1 || '',
      address2: sa.address2 || sa.address_line_2 || '',
      city: sa.city || '',
      state: sa.province || sa.state || '',
      zip: sa.zip || sa.postal_code || '',
      country: sa.country || 'India',
      phone: getPhoneNumber(displayOrder) || ''
    });
  }, [displayOrder?.id]);

  // Guard after all hooks
  if (!order && !orders?.length) return null;

  // ─── Helpers ────────────────────────────────────────────────────────────────

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

  const formatProductWithVariation = (item: any) => {
    const baseTitle = item.title || item.name || 'Product';
    if (item.sku && item.sku.includes('/')) {
      const variation = item.sku.split('/').slice(1).join('/');
      return `${baseTitle} - ${variation}`;
    }
    if (item.variant_title) return `${baseTitle} - ${item.variant_title}`;
    return baseTitle;
  };

  const getProductFontSize = (itemCount: number) => {
    if (itemCount <= 3) return '10px';
    if (itemCount <= 5) return '9px';
    if (itemCount <= 7) return '8px';
    if (itemCount <= 10) return '7px';
    return '6px';
  };

  const getLineHeight = (fontSize: string) => {
    const map: Record<string, string> = { '10px': '1.3', '9px': '1.2', '8px': '1.1', '7px': '1.0', '6px': '0.9' };
    return map[fontSize] || '1.0';
  };

  // ─── 4×6 Thermal Template ───────────────────────────────────────────────────

  const createThermalLabelHTML = (orderData: any, isLast: boolean = false) => {
    const orderNumber = orderData.order_number || orderData.name || `#${orderData.id}`;
    const trackingNumber = generateTrackingBarcode(orderNumber);
    const barcodeSVG = generateCode128Barcode(trackingNumber);

    const lineItems = orderData.line_items || [];
    const totalItems = lineItems.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
    const totalWeight = orderData.total_weight ? `${orderData.total_weight}g` : '750g';
    const productFontSize = getProductFontSize(lineItems.length);
    const lineHeight = getLineHeight(productFontSize);
    const pageBreak = isBulkPrint && !isLast ? 'page-break-after: always;' : '';

    // Use edited address if available (for single-order print)
    const addr = !isBulkPrint ? toAddress : (() => {
      const sa = orderData.shipping_address || {};
      const cn = orderData.customer_name ||
        `${orderData.customer?.first_name || ''} ${orderData.customer?.last_name || ''}`.trim() || 'Guest Customer';
      return {
        name: cn,
        address1: sa.address1 || sa.address_line_1 || '',
        address2: sa.address2 || sa.address_line_2 || '',
        city: sa.city || '',
        state: sa.province || sa.state || '',
        zip: sa.zip || sa.postal_code || '',
        country: sa.country || 'India',
        phone: getPhoneNumber(orderData) || 'N/A'
      };
    })();

    return `
      <div style="width:4in;height:6in;border:2px solid #000;background:#fff;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;color:#000;margin:0;box-sizing:border-box;display:flex;flex-direction:column;${pageBreak}">
        <div style="padding:10px;text-align:center;background:#fff;">
          <div style="background:#fff;border:1px solid #000;padding:8px;margin-bottom:5px;">${barcodeSVG}</div>
          <div style="font-weight:bold;font-size:14px;margin-top:5px;">${trackingNumber}</div>
        </div>
        <div style="border-bottom:2px solid #000;margin:0;"></div>
        <div style="padding:8px;">
          <div style="font-weight:bold;margin-bottom:5px;font-size:12px;">🔴 TO:</div>
          <div style="padding:8px 0;background:#fff;">
            <div style="font-weight:bold;font-size:16px;margin-bottom:3px;">${addr.name.toUpperCase()}</div>
            <div style="font-size:16px;font-weight:bold;margin-bottom:2px;">${addr.address1}</div>
            ${addr.address2 ? `<div style="font-size:16px;font-weight:bold;margin-bottom:2px;">${addr.address2}</div>` : ''}
            <div style="font-size:16px;font-weight:bold;margin-bottom:2px;">${addr.city}, ${addr.state} ${addr.zip}</div>
            <div style="font-size:16px;font-weight:bold;margin-bottom:2px;">${addr.country}</div>
            <div style="font-size:16px;font-weight:bold;">Ph: ${addr.phone}</div>
          </div>
        </div>
        <div style="border-bottom:1px solid #000;margin:0;"></div>
        <div style="padding:8px;display:flex;">
          <div style="flex:1;margin-right:5px;padding-left:4px;">
            <div style="font-weight:bold;margin-bottom:5px;font-size:12px;">FROM:</div>
            <div style="padding:6px 4px;background:#fff;font-size:10px;height:60px;">
              <div style="font-weight:bold;">${fromAddress.store_name || 'Store Name'}</div>
              ${fromAddress.address1 ? `<div>${fromAddress.address1}</div>` : ''}
              ${fromAddress.city || fromAddress.state ? `<div>${[fromAddress.city, fromAddress.state].filter(Boolean).join(', ')}</div>` : ''}
              ${fromAddress.phone ? `<div>Ph: ${fromAddress.phone}</div>` : ''}
            </div>
          </div>
          <div style="width:1px;background:#000;margin:0 5px;"></div>
          <div style="flex:1;margin-left:5px;padding-right:6px;">
            <div style="font-weight:bold;margin-bottom:5px;font-size:12px;">COURIER DETAILS:</div>
            <div style="padding:6px 4px;background:#fff;font-size:10px;height:60px;">
              <div style="margin-bottom:2px;">Order: <strong>${orderNumber}</strong></div>
              <div style="margin-bottom:2px;">Weight: ${totalWeight}</div>
              <div style="margin-bottom:2px;">Items: ${totalItems}</div>
              <div>Total: &#8377;${orderData.total_amount || orderData.current_total_price}</div>
            </div>
          </div>
        </div>
        <div style="border-bottom:1px solid #000;margin:0;"></div>
        <div style="flex:1;padding:8px;display:flex;flex-direction:column;">
          <div style="font-weight:bold;margin-bottom:5px;font-size:12px;">PRODUCTS:</div>
          <div style="padding:6px 0;flex:1;overflow:hidden;font-size:${productFontSize};line-height:${lineHeight};background:#fff;">
            ${lineItems.length > 0 ? lineItems.map((item: any) =>
              `<div style="margin-bottom:2px;word-wrap:break-word;overflow:hidden;">• ${formatProductWithVariation(item)} (Qty: ${item.quantity || 1})</div>`
            ).join('') : '<div>• Order Items</div>'}
          </div>
        </div>
        <div style="text-align:center;border-top:2px solid #000;padding:6px;font-weight:bold;font-size:10px;background:#fff;">
          PARCEL OPENING VIDEO is MUST For raising complaints
        </div>
      </div>
    `;
  };

  // ─── A5 Packing Slip Template ────────────────────────────────────────────────

  const createA5LabelHTML = (orderData: any, isLast: boolean = false) => {
    const orderNumber = orderData.order_number || orderData.name || `#${orderData.id}`;
    const trackingNumber = generateTrackingBarcode(orderNumber);
    // barWidth=2, barHeight=50 → reduced size but still readable on printed A5
    const barcodeSVG = generateCode128Barcode(trackingNumber, 2, 50);
    const orderDate = orderData.created_at
      ? new Date(orderData.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const lineItems = orderData.line_items || [];
    const totalItems = lineItems.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
    const totalWeight = orderData.total_weight ? `${orderData.total_weight / 1000}kg` : '0.5kg';
    const pageBreak = isBulkPrint && !isLast ? 'page-break-after: always;' : '';

    const addr = !isBulkPrint ? toAddress : (() => {
      const sa = orderData.shipping_address || {};
      const cn = orderData.customer_name ||
        `${orderData.customer?.first_name || ''} ${orderData.customer?.last_name || ''}`.trim() || 'Guest Customer';
      return {
        name: cn,
        address1: sa.address1 || sa.address_line_1 || '',
        address2: sa.address2 || sa.address_line_2 || '',
        city: sa.city || '',
        state: sa.province || sa.state || '',
        zip: sa.zip || sa.postal_code || '',
        country: sa.country || 'India',
        phone: getPhoneNumber(orderData) || 'N/A'
      };
    })();

    const productRows = lineItems.map((item: any, idx: number) => {
      const weight = item.grams ? `${(item.grams / 1000).toFixed(1)} kg` : `${totalWeight}`;
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;color:#555;">${idx + 1}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">
            <div style="width:40px;height:40px;background:#f5f5f5;border:1px solid #ddd;display:inline-block;"></div>
          </td>
          <td style="padding:8px;border-bottom:1px solid #eee;">
            <div style="font-size:11px;color:#555;">₹${parseFloat(item.price || '0').toFixed(2)}</div>
            <div style="font-weight:bold;font-size:12px;">${formatProductWithVariation(item)}</div>
            <div style="font-size:10px;color:#777;">
              ${item.variant_title ? `Measurements: ${item.variant_title.replace(/ \/ /g, ', ')}` : ''}
            </div>
          </td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity || 1}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${weight}</td>
        </tr>
      `;
    }).join('');

    // Logo: simple SVG circle with "Perfect Collections" text inside
    const logoSVG = `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="28" fill="white" stroke="#e91e8c" stroke-width="2.5"/>
      <text x="30" y="27" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#e91e8c">Perfect</text>
      <text x="30" y="38" text-anchor="middle" font-family="Arial" font-size="6.5" fill="#555">Collections</text>
    </svg>`;

    return `
      <div style="width:100%;min-height:210mm;background:#fff;font-family:Arial,sans-serif;color:#000;padding:8mm 10mm;box-sizing:border-box;${pageBreak}">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            ${logoSVG}
            <span style="font-size:22px;font-weight:bold;color:#222;">Packing slip</span>
          </div>
          <div style="text-align:right;font-size:12px;line-height:1.8;padding-right:2mm;">
            <div><strong>Order No.:</strong> ${orderNumber}</div>
            <div><strong>Order Date:</strong> ${orderDate}</div>
            <div><strong>Shipping Method:</strong> Standard Shipping</div>
          </div>
        </div>

        <!-- From / To -->
        <div style="display:flex;gap:16px;margin-bottom:16px;">
          <div style="flex:1;padding-left:2mm;">
            <div style="font-weight:bold;font-size:13px;margin-bottom:6px;color:#333;">From</div>
            <div style="font-size:11px;line-height:1.6;">
              <div style="font-weight:bold;font-size:12px;">${fromAddress.store_name || 'Store Name'}</div>
              ${fromAddress.address1 ? `<div>${fromAddress.address1}</div>` : ''}
              ${fromAddress.address2 ? `<div>${fromAddress.address2}</div>` : ''}
              ${fromAddress.city || fromAddress.state ? `<div>${[fromAddress.city, fromAddress.state, fromAddress.zip].filter(Boolean).join(', ')}</div>` : ''}
              ${fromAddress.phone ? `<div>Ph: ${fromAddress.phone}</div>` : ''}
              ${fromAddress.email ? `<div>${fromAddress.email}</div>` : ''}
            </div>
          </div>
          <div style="flex:2;padding-right:2mm;">
            <div style="font-weight:bold;font-size:13px;margin-bottom:6px;color:#333;">To</div>
            <div style="font-weight:bold;font-size:14px;margin-bottom:2px;">${addr.name}</div>
            <div style="font-size:14px;font-weight:bold;color:#222;line-height:1.6;">
              ${addr.address1}${addr.address2 ? '<br>' + addr.address2 : ''}
              <br>${addr.city}
              <br>${addr.state}
              <br>${addr.country}
              <br>${addr.zip}
              <br>Email: —
              <br><span style="color:#1a73e8;">Phone: ${addr.phone}</span>
            </div>
          </div>
        </div>

        <!-- Products Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="border-top:1px solid #ccc;border-bottom:1px solid #ccc;">
              <th style="padding:8px;text-align:center;font-size:11px;font-weight:bold;">S.No</th>
              <th style="padding:8px;text-align:center;font-size:11px;font-weight:bold;">Image</th>
              <th style="padding:8px;text-align:left;font-size:11px;font-weight:bold;">Product</th>
              <th style="padding:8px;text-align:center;font-size:11px;font-weight:bold;">Quantity</th>
              <th style="padding:8px;text-align:right;font-size:11px;font-weight:bold;">Total weight</th>
            </tr>
          </thead>
          <tbody>
            ${productRows || `<tr><td colspan="5" style="padding:12px;text-align:center;color:#777;">No items</td></tr>`}
          </tbody>
        </table>

        <!-- Barcode Footer -->
        <div style="text-align:center;margin-top:12px;padding-top:8px;border-top:1px solid #eee;">
          <div style="display:inline-block;max-width:80%;overflow:hidden;transform:scaleX(0.85);transform-origin:center;">${barcodeSVG}</div>
          <div style="font-size:12px;font-weight:bold;margin-top:4px;letter-spacing:2px;">${trackingNumber}</div>
        </div>
      </div>
    `;
  };

  // ─── Unified label creator ───────────────────────────────────────────────────

  const createLabelHTML = (orderData: any, isLast: boolean = false) => {
    return selectedTemplate === 'a5-packing-slip'
      ? createA5LabelHTML(orderData, isLast)
      : createThermalLabelHTML(orderData, isLast);
  };

  // ─── Print via window.open ───────────────────────────────────────────────────

  const printViaIframe = (labelsHTML: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const pageSize = selectedTemplate === 'a5-packing-slip' ? 'A5' : '4in 6in';

      const htmlDocument = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; background: white; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: ${selectedTemplate === 'a5-packing-slip' ? '8mm' : '0'}; size: ${pageSize}; }
      }
    </style>
  </head>
  <body>${labelsHTML}</body>
</html>`;

      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        reject(new Error('Popup blocked. Please allow popups for this site and try again.'));
        return;
      }

      printWindow.document.open();
      printWindow.document.write(htmlDocument);
      printWindow.document.close();

      // Wait for all resources to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
            resolve();
          }, 1000);
        }, 400);
      };

      // Fallback if onload doesn't fire
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => { printWindow.close(); resolve(); }, 1000);
        }
      }, 2000);
    });
  };

  const handlePrint = async () => {
    try {
      const labelsHTML = ordersToProcess.map((orderData, index) => {
        const isLast = index === ordersToProcess.length - 1;
        return createLabelHTML(orderData, isLast);
      }).join('');

      await printViaIframe(labelsHTML);

      // Move orders to packing or tracking stage depending on bypass setting
      const targetStage = bypassPacking ? 'tracking' : 'packing';
      try {
        for (const orderData of ordersToProcess) {
          if (orderData._originalSupabaseOrder) {
            await supabaseOrderService.updateOrderStage(orderData._originalSupabaseOrder.id, targetStage);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      } catch (stageError) {
        toast({ title: 'Partial Success', description: 'Labels printed but some orders may not have moved to packing.', variant: 'default' });
      }

      if (onPrintComplete) {
        const orderIds = isBulkPrint ? ordersToProcess.map(o => o.id) : ordersToProcess[0]?.id;
        onPrintComplete(orderIds);
      }

      toast({ title: 'Success', description: `${ordersToProcess.length} label(s) printed and moved to ${bypassPacking ? 'tracking' : 'packing'}!` });
      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      toast({ title: 'Printing Failed', description: `Error: ${error.message}`, variant: 'destructive' });
    }
  };

  // ─── Preview data ────────────────────────────────────────────────────────────

  const orderNumber = displayOrder.order_number || displayOrder.name || `#${displayOrder.id}`;
  const trackingNumber = generateTrackingBarcode(orderNumber);
  const lineItems = displayOrder.line_items || [];
  const totalItems = lineItems.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
  const totalWeight = displayOrder.total_weight ? `${displayOrder.total_weight}g` : '750g';
  const previewFontSize = getProductFontSize(lineItems.length);
  const orderDate = displayOrder.created_at
    ? new Date(displayOrder.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Print Preview</DialogTitle>
          <div className="flex items-center space-x-2">
            <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white" disabled={updateOrderStage.isPending}>
              <Printer className="h-4 w-4 mr-2" />
              {updateOrderStage.isPending ? 'Processing...' : bypassPacking ? 'Print & Skip to Tracking' : 'Print & Move to Packing'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">

          {/* Template Selector */}
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedTemplate('thermal-4x6')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                selectedTemplate === 'thermal-4x6'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="font-bold mb-0.5">4×6 Thermal Label</div>
              <div className="text-xs opacity-70">Standard shipping label with barcode</div>
            </button>
            <button
              onClick={() => setSelectedTemplate('a5-packing-slip')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                selectedTemplate === 'a5-packing-slip'
                  ? 'border-pink-500 bg-pink-50 text-pink-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="font-bold mb-0.5">A5 Packing Slip</div>
              <div className="text-xs opacity-70">A5 slip with product table</div>
            </button>
          </div>

          {/* Bulk info banner */}
          {isBulkPrint && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Bulk Print:</strong> {ordersToProcess.length} labels will be printed and moved to packing.
              </p>
              <p className="text-xs text-blue-600 mt-1">Preview shows the first label.</p>
            </div>
          )}

          {/* ── Preview ── */}
          {selectedTemplate === 'thermal-4x6' ? (
            /* 4×6 Thermal Preview */
            <div className="print-content border-2 border-black bg-white font-sans text-sm font-bold flex flex-col" style={{ width: '4in', height: '6in', boxSizing: 'border-box' }}>
              <div className="p-2 text-center bg-white">
                <div className="bg-white border border-black p-2 mb-1">{renderBarcode(trackingNumber)}</div>
                <div className="font-bold text-sm mt-1">{trackingNumber}</div>
              </div>
              <Separator className="bg-black h-0.5" />
              <div className="p-2">
                <div className="flex items-center mb-1">
                  <span className="mr-1 text-red-600">🔴</span>
                  <span className="font-bold text-xs">TO:</span>
                </div>
                <div className="py-2 bg-white">
                  <div className="font-bold break-words mb-0.5" style={{ fontSize: '16px' }}>{toAddress.name.toUpperCase()}</div>
                  <div className="font-bold break-words" style={{ fontSize: '16px' }}>{toAddress.address1}</div>
                  {toAddress.address2 && <div className="font-bold break-words" style={{ fontSize: '16px' }}>{toAddress.address2}</div>}
                  <div className="font-bold" style={{ fontSize: '16px' }}>{toAddress.city}, {toAddress.state} {toAddress.zip}</div>
                  <div className="font-bold" style={{ fontSize: '16px' }}>{toAddress.country}</div>
                  <div className="font-bold" style={{ fontSize: '16px' }}>Ph: {toAddress.phone}</div>
                </div>
              </div>
              <Separator className="bg-black h-px" />
              <div className="p-2 flex">
                <div className="flex-1 mr-1 pl-1">
                  <div className="font-bold mb-1 text-xs">FROM:</div>
                  <div className="py-1 px-1 bg-white text-xs h-16">
                    <div className="font-bold">{fromAddress.store_name || 'Store Name'}</div>
                    {fromAddress.address1 && <div>{fromAddress.address1}</div>}
                    {fromAddress.city && <div>{fromAddress.city}{fromAddress.state ? `, ${fromAddress.state}` : ''}</div>}
                    {fromAddress.phone && <div>Ph: {fromAddress.phone}</div>}
                  </div>
                </div>
                <Separator orientation="vertical" className="bg-black w-px mx-1" />
                <div className="flex-1 ml-1 pr-2">
                  <div className="font-bold mb-1 text-xs">COURIER DETAILS:</div>
                  <div className="py-1 px-1 bg-white text-xs h-16">
                    <div className="mb-0.5">Order: <strong>{orderNumber}</strong></div>
                    <div className="mb-0.5">Weight: {totalWeight}</div>
                    <div className="mb-0.5">Items: {totalItems}</div>
                    <div>Total: ₹{displayOrder.total_amount || displayOrder.current_total_price}</div>
                  </div>
                </div>
              </div>
              <Separator className="bg-black h-px" />
              <div className="flex-1 p-2 flex flex-col">
                <div className="font-bold mb-1 text-xs">PRODUCTS:</div>
                <div className="py-1 flex-1 overflow-hidden bg-white" style={{ fontSize: previewFontSize, lineHeight: getLineHeight(previewFontSize) }}>
                  {lineItems.length > 0 ? lineItems.map((item: any, index: number) => (
                    <div key={index} className="mb-0.5 break-words">• {formatProductWithVariation(item)} (Qty: {item.quantity || 1})</div>
                  )) : <div>• Order Items</div>}
                </div>
              </div>
              <div className="text-center border-t-2 border-black p-1 font-bold text-xs bg-white">
                PARCEL OPENING VIDEO is MUST For raising complaints
              </div>
            </div>
          ) : (
            /* A5 Packing Slip Preview */
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm font-sans" style={{ width: '148mm', minHeight: '210mm', padding: '8mm 10mm', boxSizing: 'border-box' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full border-2 border-pink-500 flex flex-col items-center justify-center">
                    <span className="text-pink-600 font-bold text-xs leading-tight">Perfect</span>
                    <span className="text-gray-500 text-xs leading-tight">Collections</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-800">Packing slip</span>
                </div>
                <div className="text-right text-xs space-y-1">
                  <div><strong>Order No.:</strong> {orderNumber}</div>
                  <div><strong>Order Date:</strong> {orderDate}</div>
                  <div><strong>Shipping Method:</strong> Standard Shipping</div>
                </div>
              </div>

              {/* From / To */}
              <div className="flex gap-6 mb-5">
                <div className="flex-1">
                  <div className="font-bold text-sm mb-1 text-gray-700">From</div>
                  <div className="font-bold text-sm">{fromAddress.store_name || 'Store Name'}</div>
                  {fromAddress.address1 && <div className="text-xs">{fromAddress.address1}</div>}
                  {fromAddress.address2 && <div className="text-xs">{fromAddress.address2}</div>}
                  {(fromAddress.city || fromAddress.state) && <div className="text-xs">{[fromAddress.city, fromAddress.state].filter(Boolean).join(', ')} {fromAddress.zip}</div>}
                  {fromAddress.phone && <div className="text-xs text-blue-600">Phone: {fromAddress.phone}</div>}
                  {fromAddress.email && <div className="text-xs">{fromAddress.email}</div>}
                </div>
                <div className="flex-2" style={{ flex: 2 }}>
                  <div className="font-bold text-sm mb-1 text-gray-700">To</div>
                  <div className="font-bold" style={{ fontSize: '14px' }}>{toAddress.name}</div>
                  <div className="font-bold text-gray-800 space-y-0.5 mt-1" style={{ fontSize: '14px' }}>
                    <div>{toAddress.address1}</div>
                    {toAddress.address2 && <div>{toAddress.address2}</div>}
                    <div>{toAddress.city}</div>
                    <div>{toAddress.state}</div>
                    <div>{toAddress.country}</div>
                    <div>{toAddress.zip}</div>
                    <div className="text-blue-600 font-extrabold" style={{ fontSize: '15px' }}>Phone: {toAddress.phone}</div>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <table className="w-full text-xs border-collapse mb-5">
                <thead>
                  <tr className="border-t border-b border-gray-300">
                    <th className="py-2 px-2 text-center font-bold">S.No</th>
                    <th className="py-2 px-2 text-center font-bold">Image</th>
                    <th className="py-2 px-2 text-left font-bold">Product</th>
                    <th className="py-2 px-2 text-center font-bold">Quantity</th>
                    <th className="py-2 px-2 text-right font-bold">Total weight</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length > 0 ? lineItems.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-2 text-center text-gray-500">{index + 1}</td>
                      <td className="py-2 px-2 text-center">
                        <div className="w-10 h-10 bg-gray-100 border border-gray-200 inline-block" />
                      </td>
                      <td className="py-2 px-2">
                        <div className="text-gray-500">₹{parseFloat(item.price || '0').toFixed(2)}</div>
                        <div className="font-bold">{formatProductWithVariation(item)}</div>
                        {item.variant_title && (
                          <div className="text-gray-500 text-xs">
                            Measurements: {item.variant_title.replace(/ \/ /g, ', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">{item.quantity || 1}</td>
                      <td className="py-2 px-2 text-right">
                        {item.grams ? `${(item.grams / 1000).toFixed(1)} kg` : '0.5 kg'}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="py-4 text-center text-gray-400">No items</td></tr>
                  )}
                </tbody>
              </table>

              {/* Barcode Footer */}
              <div className="text-center border-t border-gray-100 pt-3">
                <div style={{ transform: 'scaleX(0.75) scaleY(0.7)', transformOrigin: 'center' }}>
                  {renderBarcode(trackingNumber)}
                </div>
                <div className="font-bold text-xs mt-0.5">{trackingNumber}</div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingLabelPreview;
