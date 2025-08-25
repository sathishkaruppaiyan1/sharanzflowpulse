
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Printer, Package, Phone, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ShopifyOrder } from '@/hooks/useShopifyOrders';
import ShippingLabelPreview from './ShippingLabelPreview';
import { useBulkUpdateOrderStage } from '@/hooks/useOrders';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PrintQueueProps {
  orders: ShopifyOrder[];
  isShopifyOrders?: boolean;
  onSelectedCountChange?: (count: number, selectedIds: Set<string>) => void;
  selectedOrderIds?: Set<string>;
  onSelectAll?: (currentPageOrders?: ShopifyOrder[]) => void;
  onUnselectAll?: () => void;
  itemsPerPage?: number;
}

const PrintQueue: React.FC<PrintQueueProps> = ({
  orders,
  isShopifyOrders = false,
  onSelectedCountChange,
  selectedOrderIds = new Set(),
  onSelectAll,
  onUnselectAll,
  itemsPerPage = 10
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null);
  const bulkUpdateStage = useBulkUpdateOrderStage();

  // Reset to page 1 when orders change significantly (like after printing)
  useEffect(() => {
    const totalPages = Math.ceil(orders.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [orders.length, itemsPerPage, currentPage]);

  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageOrders = orders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleOrderSelect = (orderId: string, isSelected: boolean) => {
    const newSelectedIds = new Set(selectedOrderIds);
    
    if (isSelected) {
      newSelectedIds.add(orderId);
    } else {
      newSelectedIds.delete(orderId);
    }
    
    onSelectedCountChange?.(newSelectedIds.size, newSelectedIds);
  };

  const handleSelectAllCurrentPage = () => {
    onSelectAll?.(currentPageOrders);
  };

  const handlePrintSingle = (order: ShopifyOrder) => {
    setSelectedOrder(order);
    setShowPreview(true);
  };

  const handlePrintComplete = async (orderIds: string | string[]) => {
    const ids = Array.isArray(orderIds) ? orderIds : [orderIds];
    
    try {
      await bulkUpdateStage.mutateAsync({ 
        orderIds: ids, 
        stage: 'packing' 
      });
      
      // Reset pagination if current page becomes empty
      const remainingOrders = orders.length - ids.length;
      const newTotalPages = Math.ceil(remainingOrders / itemsPerPage);
      
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(1);
      }
      
      toast({
        title: "Success",
        description: `${ids.length} order(s) printed and moved to packing stage`
      });
      
    } catch (error) {
      console.error('Error updating order stage:', error);
      toast({
        title: "Error", 
        description: "Failed to update order stage",
        variant: "destructive"
      });
    }
    
    setShowPreview(false);
    setSelectedOrder(null);
  };

  if (orders.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No Orders Found</h3>
          <p>No orders are currently ready for printing.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Orders List */}
      <div className="space-y-3">
        {currentPageOrders.map((order) => {
          const isSelected = selectedOrderIds.has(order.id);
          const customerName = order.customer_name || 'Guest';
          const phone = order.phone || order.shipping_address?.phone || order.customer?.phone;
          
          return (
            <Card key={order.id} className={`transition-colors ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-lg">#{order.order_number}</h4>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {order.currency} {parseFloat(order.current_total_price || order.total_amount || '0').toFixed(2)}
                        </Badge>
                        <Badge variant="secondary">
                          {order.line_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 1} items
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="font-medium">{customerName}</span>
                        {phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{phone}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(order.created_at), 'MMM dd, HH:mm')}</span>
                        </div>
                      </div>
                      
                      {order.line_items && order.line_items.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Products:</div>
                          <div className="flex flex-wrap gap-1">
                            {order.line_items.slice(0, 3).map((item, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {item.quantity}x {(item.title || item.name)?.substring(0, 30)}
                                {item.variant_title ? ` (${item.variant_title})` : ''}
                              </Badge>
                            ))}
                            {order.line_items.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{order.line_items.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handlePrintSingle(order)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Label
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Compact Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, orders.length)} of {orders.length} orders
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-1 text-sm">
              <span>Page</span>
              <span className="font-medium">{currentPage}</span>
              <span>of</span>
              <span className="font-medium">{totalPages}</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Select All Button for Current Page */}
      {currentPageOrders.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAllCurrentPage}
            className="text-blue-600 hover:text-blue-700"
          >
            Select All on This Page ({currentPageOrders.length})
          </Button>
        </div>
      )}

      {/* Single Order Preview */}
      {showPreview && selectedOrder && (
        <ShippingLabelPreview
          open={showPreview}
          onClose={() => setShowPreview(false)}
          orders={[selectedOrder]}
          onPrintComplete={handlePrintComplete}
        />
      )}
    </div>
  );
};

export default PrintQueue;
