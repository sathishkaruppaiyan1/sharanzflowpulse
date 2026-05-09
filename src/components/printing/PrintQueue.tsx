import React, { useState, useEffect } from 'react';
import { Phone, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
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
  onAfterPrint?: () => void;
}

const PrintQueue = ({ 
  orders, 
  isShopifyOrders = false, 
  onSelectedCountChange,
  selectedOrderIds = new Set(),
  onSelectAll,
  onUnselectAll,
  itemsPerPage: defaultItemsPerPage = 100,
  onAfterPrint
}: PrintQueueProps) => {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(selectedOrderIds);
  const [printingOrders, setPrintingOrders] = useState<Set<string>>(new Set());
  const [previewOrder, setPreviewOrder] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultItemsPerPage);

  useEffect(() => {
    setSelectedOrders(selectedOrderIds);
  }, [selectedOrderIds]);

  const totalPages = Math.ceil(orders.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  useEffect(() => {
    if (orders.length === 0) { setCurrentPage(1); return; }
    const newTotalPages = Math.ceil(orders.length / perPage);
    if (currentPage > newTotalPages) setCurrentPage(Math.max(1, newTotalPages));
  }, [orders.length, perPage, currentPage]);

  useEffect(() => {
    if (paginatedOrders.length === 0 && orders.length > 0 && currentPage > 1) {
      setCurrentPage(prev => Math.max(1, prev - 1));
    }
  }, [paginatedOrders.length, orders.length, currentPage]);

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) { newSelected.add(orderId); } else { newSelected.delete(orderId); }
    setSelectedOrders(newSelected);
    onSelectedCountChange?.(newSelected.size, newSelected);
  };

  const handlePrintSingle = (order: any) => {
    setPreviewOrder(order);
    setShowPreview(true);
  };

  const handlePrintComplete = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (Array.isArray(orderId)) { orderId.forEach(id => newSelected.delete(id)); } else { newSelected.delete(orderId); }
    setSelectedOrders(newSelected);
    onSelectedCountChange?.(newSelected.size, newSelected);
    onAfterPrint?.();
    toast({ title: "🎉 Order Moved to Packing!", description: "Label printed successfully. Order has been moved to packing stage." });
    setTimeout(() => {
      const newTotalPages = Math.ceil(orders.length / perPage);
      if (currentPage > newTotalPages && newTotalPages > 0) setCurrentPage(newTotalPages);
      else if (orders.length === 0) setCurrentPage(1);
    }, 100);
  };

  const isPrinting = (orderId: string) => printingOrders.has(orderId);
  const handlePageChange = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  // Select / unselect only the current page
  const handleSelectCurrentPage = () => {
    const newSelected = new Set(selectedOrders);
    paginatedOrders.forEach((o: any) => newSelected.add(o.id));
    setSelectedOrders(newSelected);
    onSelectedCountChange?.(newSelected.size, newSelected);
  };

  const handleUnselectCurrentPage = () => {
    const newSelected = new Set(selectedOrders);
    paginatedOrders.forEach((o: any) => newSelected.delete(o.id));
    setSelectedOrders(newSelected);
    onSelectedCountChange?.(newSelected.size, newSelected);
  };

  const allCurrentPageSelected = paginatedOrders.length > 0 && paginatedOrders.every((o: any) => selectedOrders.has(o.id));

  return (
    <>
      {/* Toolbar: per-page selector + page select/unselect */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Button
              variant={allCurrentPageSelected ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={allCurrentPageSelected ? handleUnselectCurrentPage : handleSelectCurrentPage}
            >
              {allCurrentPageSelected ? `Unselect All (${paginatedOrders.length})` : `Select All (${paginatedOrders.length})`}
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[72px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {paginatedOrders.map((order) => {
          const rawItems = isShopifyOrders ? (order.line_items || []) : (order.order_items || []);
          const productItems = rawItems.map((item: any) => normalizeItemForDisplay(item));

          return (
            <div key={order.id} className="bg-white border border-gray-200 rounded-md p-3">
              <div className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-2 flex items-start space-x-2">
                  <Checkbox
                    checked={selectedOrders.has(order.id)}
                    onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                    className="mt-0.5"
                  />
                  <div>
                    <h3 className="font-semibold text-sm">#{order.order_number || order.name}</h3>
                    <p className="text-muted-foreground text-xs">
                      {order.customer_name || `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'Guest'}
                    </p>
                  </div>
                </div>

                <div className="col-span-4">
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Products:</h4>
                  <div className="space-y-1">
                    {productItems.map((item: any, index: number) => (
                      <div key={index} className="text-xs text-foreground">
                        <div className="font-medium">{item.displayName}</div>
                        <div className="text-primary ml-1 text-xs font-medium">{item.variationText}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Details:</h4>
                  <div className="space-y-0.5 text-xs">
                    <div className="text-foreground">{order.total_weight ? `${order.total_weight}g` : '750g'}</div>
                    <div className="font-medium text-foreground">₹{order.total_amount || order.current_total_price}</div>
                    <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                </div>

                <div className="col-span-3">
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Address:</h4>
                  <div className="text-xs text-foreground">
                    {order.shipping_address ? (
                      <>
                        <div>{order.shipping_address.address1 || order.shipping_address.address_line_1}</div>
                        {(order.shipping_address.address2 || order.shipping_address.address_line_2) && (
                          <div>{order.shipping_address.address2 || order.shipping_address.address_line_2}</div>
                        )}
                        <div>{order.shipping_address.city}, {order.shipping_address.province || order.shipping_address.state}</div>
                        <div>{order.shipping_address.zip || order.shipping_address.postal_code} {order.shipping_address.country}</div>
                        {order.shipping_address.phone && (
                          <div className="flex items-center mt-0.5 text-destructive">
                            <Phone className="h-2.5 w-2.5 mr-1" />
                            <span>{order.shipping_address.phone}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-muted-foreground">Address not available</div>
                    )}
                  </div>
                </div>

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
              <div className="text-muted-foreground">No orders found matching your criteria</div>
            </CardContent>
          </Card>
        )}

        {/* Compact Pagination */}
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
                <PaginationItem>
                  <span className="px-3 py-2 text-sm text-muted-foreground">
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
