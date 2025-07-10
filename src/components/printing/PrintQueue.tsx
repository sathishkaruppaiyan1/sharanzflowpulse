
import React, { useState } from 'react';
import { Phone, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import ShippingLabelPreview from './ShippingLabelPreview';

interface PrintQueueProps {
  orders: any[];
  isShopifyOrders?: boolean;
  onSelectedCountChange?: (count: number, selectedIds: Set<string>) => void;
}

const PrintQueue = ({ orders, isShopifyOrders = false, onSelectedCountChange }: PrintQueueProps) => {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [printingOrders, setPrintingOrders] = useState<Set<string>>(new Set());
  const [previewOrder, setPreviewOrder] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
    onSelectedCountChange?.(newSelected.size, newSelected);
  };

  const handlePrintSingle = (order: any) => {
    console.log('Opening print preview for order:', order.id);
    setPreviewOrder(order);
    setShowPreview(true);
  };

  const handlePrintComplete = (orderId: string) => {
    // Move order to next stage (packing) after printing
    toast({
      title: "Success",
      description: "Label printed successfully! Order moved to packing stage."
    });
    console.log('Moving order to packing stage:', orderId);
  };

  const isPrinting = (orderId: string) => printingOrders.has(orderId);

  return (
    <>
      <div className="space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-200 rounded-md p-3">
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Checkbox and Order Info */}
              <div className="col-span-2 flex items-start space-x-2">
                <Checkbox
                  checked={selectedOrders.has(order.id)}
                  onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                  className="mt-0.5"
                />
                <div>
                  <h3 className="font-semibold text-sm">#{order.order_number || order.name}</h3>
                  <p className="text-gray-600 text-xs">
                    {order.customer_name || `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'Guest'}
                  </p>
                </div>
              </div>

              {/* Products */}
              <div className="col-span-3">
                <h4 className="text-xs font-medium text-gray-500 mb-1">Products:</h4>
                <div className="space-y-0.5">
                  {order.line_items ? order.line_items.slice(0, 2).map((item: any, index: number) => (
                    <div key={index} className="text-xs text-gray-900">
                      {item.title || item.name}
                    </div>
                  )) : (
                    <div className="text-xs text-gray-900">Order Items</div>
                  )}
                  {order.line_items && order.line_items.length > 2 && (
                    <div className="text-xs text-gray-500">+{order.line_items.length - 2} more</div>
                  )}
                </div>
                {order.line_items && order.line_items.length > 0 && (
                  <div className="mt-1">
                    <div className="text-xs text-gray-500 mb-1">Variations:</div>
                    <div className="flex flex-wrap gap-1">
                      {order.line_items.slice(0, 3).map((item: any, index: number) => (
                        item.variant_title && (
                          <Badge key={index} variant="outline" className="text-xs px-1 py-0 h-4 text-[10px]">
                            {item.variant_title}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="col-span-2">
                <h4 className="text-xs font-medium text-gray-500 mb-1">Details:</h4>
                <div className="space-y-0.5 text-xs">
                  <div className="text-gray-900">{order.total_weight ? `${order.total_weight}g` : '750g'}</div>
                  <div className="font-medium text-gray-900">₹{order.total_amount || order.current_total_price}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="col-span-4">
                <h4 className="text-xs font-medium text-gray-500 mb-1">Address:</h4>
                <div className="text-xs text-gray-900">
                  {order.shipping_address ? (
                    <>
                      <div>{order.shipping_address.address1}</div>
                      {order.shipping_address.address2 && <div>{order.shipping_address.address2}</div>}
                      <div>{order.shipping_address.city}, {order.shipping_address.province}</div>
                      <div>{order.shipping_address.zip} {order.shipping_address.country}</div>
                      {order.shipping_address.phone && (
                        <div className="flex items-center mt-0.5 text-red-600">
                          <Phone className="h-2.5 w-2.5 mr-1" />
                          <span>{order.shipping_address.phone}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-500">Address not available</div>
                  )}
                </div>
              </div>

              {/* Print Button */}
              <div className="col-span-1 flex justify-end">
                <Button 
                  onClick={() => handlePrintSingle(order)}
                  disabled={isPrinting(order.id)}
                  size="sm"
                  variant="outline"
                  className="flex items-center space-x-1 h-7 px-2"
                >
                  <Printer className="h-3 w-3" />
                  <span className="text-xs">Print</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
        
        {orders.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <div className="text-gray-500">No orders found matching your criteria</div>
            </CardContent>
          </Card>
        )}
      </div>

      <ShippingLabelPreview 
        open={showPreview}
        onClose={() => setShowPreview(false)}
        order={previewOrder}
        onPrintComplete={handlePrintComplete}
      />
    </>
  );
};

export default PrintQueue;
