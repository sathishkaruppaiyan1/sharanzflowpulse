
import React, { useState, useEffect } from 'react';
import { Phone, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import ShippingLabelPreview from './ShippingLabelPreview';
import { normalizeItemForDisplay } from '@/utils/productVariationUtils';

interface PrintQueueProps {
  orders: any[];
  isShopifyOrders?: boolean;
  onSelectedCountChange?: (count: number, selectedIds: Set<string>) => void;
  selectedOrderIds?: Set<string>;
  onSelectAll?: (currentPageOrders?: any[]) => void;
  onUnselectAll?: () => void;
  itemsPerPage?: number;
}

const PrintQueue = ({ 
  orders, 
  isShopifyOrders = false, 
  onSelectedCountChange,
  selectedOrderIds = new Set(),
  onSelectAll,
  onUnselectAll,
  itemsPerPage = 10
}: PrintQueueProps) => {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(selectedOrderIds);
  const [printingOrders, setPrintingOrders] = useState<Set<string>>(new Set());
  const [previewOrder, setPreviewOrder] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Update local state when external selectedOrderIds changes
  useEffect(() => {
    setSelectedOrders(selectedOrderIds);
  }, [selectedOrderIds]);

  // Calculate pagination
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  // Handle pagination when orders change - more robust approach
  useEffect(() => {
    if (orders.length === 0) {
      setCurrentPage(1);
      return;
    }

    const newTotalPages = Math.ceil(orders.length / itemsPerPage);
    
    // Only adjust current page if it's beyond the available pages
    if (currentPage > newTotalPages) {
      setCurrentPage(Math.max(1, newTotalPages));
    }
  }, [orders.length, itemsPerPage, currentPage]);

  // Additional effect to handle when current page becomes empty
  useEffect(() => {
    if (paginatedOrders.length === 0 && orders.length > 0 && currentPage > 1) {
      // If current page is empty but we have orders, go to previous page
      setCurrentPage(prev => Math.max(1, prev - 1));
    }
  }, [paginatedOrders.length, orders.length, currentPage]);

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
    console.log('Print completed for order:', orderId);
    
    // Remove from selected orders after successful print
    const newSelected = new Set(selectedOrders);
    if (Array.isArray(orderId)) {
      orderId.forEach(id => newSelected.delete(id));
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
    onSelectedCountChange?.(newSelected.size, newSelected);

    // More prominent notification for stage movement
    toast({
      title: "🎉 Order Moved to Packing!", 
      description: "Label printed successfully. Order has been moved to packing stage and is ready for fulfillment."
    });
    console.log('Moving order to packing stage:', orderId);

    // Handle pagination after order removal with a small delay to allow state updates
    setTimeout(() => {
      const remainingOrders = orders.length;
      const newTotalPages = Math.ceil(remainingOrders / itemsPerPage);
      
      // If current page becomes invalid after order removal, adjust it
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (remainingOrders === 0) {
        setCurrentPage(1);
      }
    }, 100);
  };

  const isPrinting = (orderId: string) => printingOrders.has(orderId);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSelectCurrentPage = () => {
    onSelectAll?.(paginatedOrders);
  };

  const handleUnselectCurrentPage = () => {
    onUnselectAll?.();
  };

  return (
    <>
      <div className="space-y-2">
        {paginatedOrders.map((order) => {
          // Get product items with variations and debug logging
          const rawItems = isShopifyOrders 
            ? (order.line_items || [])
            : (order.order_items || []);
            
          console.log(`Processing order ${order.id} items:`, rawItems);
          
          const productItems = rawItems.map(item => {
            const normalized = normalizeItemForDisplay(item);
            console.log(`Normalized item for order ${order.id}:`, {
              original: item,
              normalized: normalized,
              variationText: normalized.variationText
            });
            return normalized;
          });

          return (
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

                {/* Products with Variations */}
                <div className="col-span-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Products:</h4>
                  <div className="space-y-1">
                    {productItems.map((item: any, index: number) => (
                      <div key={index} className="text-xs text-gray-900">
                        <div className="font-medium">{item.displayName}</div>
                        <div className="text-blue-600 ml-1 text-xs font-medium">
                          {item.variationText}
                        </div>
                      </div>
                    ))}
                  </div>
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
                <div className="col-span-3">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Address:</h4>
                  <div className="text-xs text-gray-900">
                    {order.shipping_address ? (
                      <>
                        <div>{order.shipping_address.address1 || order.shipping_address.address_line_1}</div>
                        {(order.shipping_address.address2 || order.shipping_address.address_line_2) && (
                          <div>{order.shipping_address.address2 || order.shipping_address.address_line_2}</div>
                        )}
                        <div>{order.shipping_address.city}, {order.shipping_address.province || order.shipping_address.state}</div>
                        <div>{order.shipping_address.zip || order.shipping_address.postal_code} {order.shipping_address.country}</div>
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
          );
        })}
        
        {orders.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <div className="text-gray-500">No orders found matching your criteria</div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(currentPage - 1)}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {/* Show current page info instead of all page numbers */}
                <PaginationItem>
                  <span className="px-3 py-2 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                </PaginationItem>
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(currentPage + 1)}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
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
