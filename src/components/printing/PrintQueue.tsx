
import React, { useState, useCallback } from 'react';
import { Eye, Printer, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import OrderDetails from '@/components/orders/OrderDetails';
import ShippingLabelPreview from '@/components/printing/ShippingLabelPreview';

interface PrintQueueProps {
  orders: any[];
  isShopifyOrders?: boolean;
  onSelectedCountChange?: (count: number, selectedIds: Set<string>) => void;
  selectedOrderIds?: Set<string>;
  onSelectAll?: () => void;
}

const PrintQueue = ({ 
  orders, 
  isShopifyOrders = false, 
  onSelectedCountChange,
  selectedOrderIds = new Set(),
  onSelectAll
}: PrintQueueProps) => {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set());

  const effectiveSelectedIds = selectedOrderIds.size > 0 ? selectedOrderIds : localSelectedIds;

  const getProductDisplayName = (item: any) => {
    const name = item.title || item.name || 'Product';
    const variant = item.variant_title || item.sku || '';
    return variant ? `${name} - ${variant}` : name;
  };

  const handleOrderSelect = useCallback((orderId: string, checked: boolean) => {
    const newSelectedIds = new Set(effectiveSelectedIds);
    
    if (checked) {
      newSelectedIds.add(orderId);
    } else {
      newSelectedIds.delete(orderId);
    }
    
    if (selectedOrderIds.size > 0) {
      // Using parent's state
      onSelectedCountChange?.(newSelectedIds.size, newSelectedIds);
    } else {
      // Using local state
      setLocalSelectedIds(newSelectedIds);
      onSelectedCountChange?.(newSelectedIds.size, newSelectedIds);
    }
  }, [effectiveSelectedIds, selectedOrderIds.size, onSelectedCountChange]);

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handlePrintLabel = (order: any) => {
    setSelectedOrder(order);
    setShowLabelPreview(true);
  };

  const getOrderStatus = (order: any) => {
    if (isShopifyOrders) {
      return order.fulfillment_status === 'fulfilled' ? 'Fulfilled' : 'Unfulfilled';
    }
    return order.stage || 'pending';
  };

  const getStatusBadgeColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'fulfilled':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'unfulfilled':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'printing':
        return 'bg-blue-100 text-blue-800';
      case 'packing':
        return 'bg-purple-100 text-purple-800';
      case 'tracking':
      case 'shipped':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Printer className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No orders found for printing</p>
            <p className="text-sm mt-1">Orders will appear here when they're ready for label printing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {orders.map((order) => {
          const orderNumber = order.order_number || order.name || `#${order.id}`;
          const customerName = order.customer_name || 
            `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 
            'Guest Customer';
          
          const totalItems = order.line_items ? 
            order.line_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) : 1;
          
          const orderTotal = order.total_amount || order.current_total_price;
          const isSelected = effectiveSelectedIds.has(order.id);
          const status = getOrderStatus(order);

          return (
            <Card key={order.id} className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                      className="mt-1"
                    />
                    <div>
                      <CardTitle className="text-lg">{orderNumber}</CardTitle>
                      <CardDescription>
                        Customer: {customerName}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusBadgeColor(status)}>
                      {status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Items:</span>
                      <span className="ml-2">{totalItems}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total:</span>
                      <span className="ml-2">₹{orderTotal}</span>
                    </div>
                  </div>

                  {/* Product List with Variations */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Products:</h4>
                    <div className="space-y-1">
                      {order.line_items ? order.line_items.map((item: any, index: number) => {
                        const displayName = getProductDisplayName(item);
                        return (
                          <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <div className="font-medium">{displayName}</div>
                            <div className="text-xs text-gray-500">
                              Qty: {item.quantity || 1} | Price: ₹{item.price}
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="text-sm text-gray-500">No items details available</div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewOrder(order)}
                      className="flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-1"
                      onClick={() => handlePrintLabel(order)}
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print Label</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Order Details Dialog */}
      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          open={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* Shipping Label Preview */}
      {selectedOrder && (
        <ShippingLabelPreview
          open={showLabelPreview}
          onClose={() => {
            setShowLabelPreview(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onPrintComplete={() => {
            setShowLabelPreview(false);
            setSelectedOrder(null);
            // Remove from selection after printing
            if (effectiveSelectedIds.has(selectedOrder.id)) {
              handleOrderSelect(selectedOrder.id, false);
            }
          }}
        />
      )}
    </>
  );
};

export default PrintQueue;
