
import React, { useState } from 'react';
import { Clock, Package, ArrowRight, CheckCircle, Printer, Truck, FileText, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import ShippingLabelPreview from './ShippingLabelPreview';

interface PrintQueueProps {
  orders: any[];
  isShopifyOrders?: boolean;
  onSelectedCountChange?: (count: number) => void;
}

const PrintQueue = ({ orders, isShopifyOrders = false, onSelectedCountChange }: PrintQueueProps) => {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [printingOrders, setPrintingOrders] = useState<Set<string>>(new Set());
  const [previewOrder, setPreviewOrder] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
    onSelectedCountChange?.(newSelected.size);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(orders.map(order => order.id));
      setSelectedOrders(allIds);
      onSelectedCountChange?.(allIds.size);
    } else {
      setSelectedOrders(new Set());
      onSelectedCountChange?.(0);
    }
  };

  const handlePrintSingle = (order: any) => {
    console.log('Opening print preview for order:', order.id);
    setPreviewOrder(order);
    setShowPreview(true);
  };

  const isPrinting = (orderId: string) => printingOrders.has(orderId);

  return (
    <>
      <div className="space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="border border-gray-200 rounded-lg bg-white">
            <div className="p-3">
              <div className="flex items-start justify-between">
                {/* Left section with checkbox and order info */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={selectedOrders.has(order.id)}
                    onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="font-semibold text-base">#{order.order_number}</h3>
                      {isPrinting(order.id) && (
                        <Badge className="bg-blue-100 text-blue-700">
                          <Printer className="h-3 w-3 mr-1 animate-pulse" />
                          Printing...
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 font-medium text-sm">
                      {order.customer_name || `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'Guest'}
                    </p>
                  </div>
                </div>

                {/* Right section with print button */}
                <Button 
                  onClick={() => handlePrintSingle(order)}
                  disabled={isPrinting(order.id)}
                  size="sm"
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {isPrinting(order.id) ? (
                    <>
                      <Printer className="h-4 w-4 mr-2 animate-pulse" />
                      Printing...
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </>
                  )}
                </Button>
              </div>

              {/* Order details grid - compact version */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 ml-6">
                {/* Products */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-1 text-sm">Products:</h4>
                  <div className="space-y-0.5">
                    {order.line_items ? order.line_items.slice(0, 2).map((item: any, index: number) => (
                      <p key={index} className="text-xs text-gray-700">{item.title || item.name}</p>
                    )) : (
                      <>
                        <p className="text-xs text-gray-700">Order Items</p>
                      </>
                    )}
                    {order.line_items && order.line_items.length > 2 && (
                      <p className="text-xs text-gray-500">+{order.line_items.length - 2} more items</p>
                    )}
                  </div>
                  {order.line_items && order.line_items.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs font-medium text-gray-700">Variations:</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {order.line_items.slice(0, 2).map((item: any, index: number) => (
                          item.variant_title && (
                            <Badge key={index} variant="outline" className="text-xs py-0 px-1 h-5">
                              {item.variant_title}
                            </Badge>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-1 text-sm">Details:</h4>
                  <div className="space-y-0.5 text-xs text-gray-700">
                    <p>{order.total_weight ? `${order.total_weight}g` : '750g'}</p>
                    <p className="font-medium">₹{order.total_amount || order.current_total_price}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-1 text-sm">Address:</h4>
                  <div className="text-xs text-gray-700">
                    {order.shipping_address ? (
                      <>
                        <p>{order.shipping_address.address1}</p>
                        {order.shipping_address.address2 && <p>{order.shipping_address.address2}</p>}
                        <p>{order.shipping_address.city}, {order.shipping_address.province}</p>
                        <p>{order.shipping_address.zip} {order.shipping_address.country}</p>
                        {order.shipping_address.phone && (
                          <div className="flex items-center mt-0.5">
                            <Phone className="h-3 w-3 mr-1 text-red-500" />
                            <span className="text-red-600">{order.shipping_address.phone}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p>Address not available</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Empty column for spacing */}
                <div></div>
              </div>
            </div>
          </div>
        ))}
        
        {orders.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <CardTitle className="text-gray-600 mb-2">No Orders Ready to Print</CardTitle>
              <CardDescription>
                {isShopifyOrders 
                  ? "No new orders from Shopify are available for printing" 
                  : "No orders found matching your current filters"
                }
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>

      <ShippingLabelPreview 
        open={showPreview}
        onClose={() => setShowPreview(false)}
        order={previewOrder}
      />
    </>
  );
};

export default PrintQueue;
