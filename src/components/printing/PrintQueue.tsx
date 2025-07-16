
import React, { useState, useCallback } from 'react';
import { Eye, Printer, CheckSquare, Square, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    console.log('Processing item for display in PrintQueue:', item);
    const name = item.title || item.name || 'Product';
    const variant = item.variant_title || item.sku || '';
    const displayName = variant ? `${name} - ${variant}` : name;
    console.log(`Display name in PrintQueue: ${displayName}`);
    return displayName;
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

  const handlePrintLabel = (order: any) => {
    setSelectedOrder(order);
    setShowLabelPreview(true);
  };

  const getOrderStatus = (order: any) => {
    return 'Ready for Printing';
  };

  const getStatusBadgeColor = (status: string) => {
    return 'bg-blue-100 text-blue-800';
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
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={effectiveSelectedIds.size === orders.length && orders.length > 0}
                  onCheckedChange={() => onSelectAll?.()}
                />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const orderNumber = order.order_number || order.name || `#${order.id}`;
              const customerName = order.customer_name || 
                `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 
                'Guest Customer';
              
              const customerPhone = order.customer?.phone || order.shipping_address?.phone || 'N/A';
              
              const shippingAddress = order.shipping_address || {};
              const addressDisplay = `${shippingAddress.city || ''}, ${shippingAddress.province || ''}`.replace(/^,|,$/, '') || 'N/A';
              
              const totalItems = order.line_items ? 
                order.line_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) : 1;
              
              const orderTotal = order.total_amount || order.current_total_price;
              const isSelected = effectiveSelectedIds.has(order.id);
              const status = getOrderStatus(order);

              return (
                <TableRow key={order.id} className={isSelected ? 'bg-blue-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{orderNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{customerName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className={customerPhone === 'N/A' ? 'text-red-500' : 'text-green-600'}>
                        {customerPhone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">{addressDisplay}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {order.line_items ? order.line_items.slice(0, 2).map((item: any, index: number) => {
                        const displayName = getProductDisplayName(item);
                        return (
                          <div key={index} className="text-sm text-gray-600 truncate">
                            {displayName}
                          </div>
                        );
                      }) : (
                        <div className="text-sm text-gray-500">No items</div>
                      )}
                      {order.line_items && order.line_items.length > 2 && (
                        <div className="text-xs text-gray-400">
                          +{order.line_items.length - 2} more
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{totalItems}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">₹{orderTotal}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(status)}>
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handlePrintLabel(order)}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
