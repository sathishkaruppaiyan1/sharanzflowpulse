import React, { useState, useEffect } from 'react';
import { Package, Truck, MapPin, ExternalLink, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Checkbox as CheckboxUI } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUpdateOrderStage } from '@/hooks/useOrders';
import { Order } from '@/types/database';
import StageChangeControls from '@/components/common/StageChangeControls';
import TrackingDetailsCard from './TrackingDetailsCard';

interface TrackingQueueProps {
  orders: Order[];
  selectedOrderIds?: Set<string>;
  onOrderSelect?: (orderId: string, checked: boolean) => void;
}

const TrackingQueue = ({ orders, selectedOrderIds = new Set(), onOrderSelect }: TrackingQueueProps) => {
  const updateOrderStageMutation = useUpdateOrderStage();
  const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const totalPages = Math.ceil(orders.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const paginatedOrders = orders.slice(startIndex, startIndex + perPage);

  useEffect(() => {
    if (orders.length === 0) { setCurrentPage(1); return; }
    const newTotalPages = Math.ceil(orders.length / perPage);
    if (currentPage > newTotalPages) setCurrentPage(Math.max(1, newTotalPages));
  }, [orders.length, perPage, currentPage]);

  const handleMarkShipped = (orderId: string) => {
    updateOrderStageMutation.mutate({ orderId, stage: 'shipped' });
  };

  const handleDialogChange = (orderId: string, open: boolean) => {
    setOpenDialogs((prev) => ({ ...prev, [orderId]: open }));
  };

  const handlePageChange = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  const allCurrentPageSelected = paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedOrderIds.has(o.id));

  const handleSelectCurrentPage = () => {
    if (onOrderSelect) {
      paginatedOrders.forEach((o) => {
        if (!selectedOrderIds.has(o.id)) onOrderSelect(o.id, true);
      });
    }
  };

  const handleUnselectCurrentPage = () => {
    if (onOrderSelect) {
      paginatedOrders.forEach((o) => {
        if (selectedOrderIds.has(o.id)) onOrderSelect(o.id, false);
      });
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Ready for Tracking</h3>
            <p className="text-gray-500">Orders will appear here once they complete packing.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {onOrderSelect && (
            <Button
              variant={allCurrentPageSelected ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={allCurrentPageSelected ? handleUnselectCurrentPage : handleSelectCurrentPage}
            >
              {allCurrentPageSelected ? `Unselect All (${paginatedOrders.length})` : `Select All (${paginatedOrders.length})`}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Showing {startIndex + 1}–{Math.min(startIndex + perPage, orders.length)} of {orders.length}
          </span>
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
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>
      </div>

      {paginatedOrders.map((order) => {
        const phoneNumber = order.customer?.phone || null;

        return (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {onOrderSelect && (
                    <CheckboxUI
                      checked={selectedOrderIds.has(order.id)}
                      onCheckedChange={(checked) => onOrderSelect(order.id, checked as boolean)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  )}
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                    <div className="text-sm text-gray-600">
                      <p>{order.customer?.first_name} {order.customer?.last_name}</p>
                      {phoneNumber ? (
                        <p className="text-green-600">📱 {phoneNumber}</p>
                      ) : (
                        <p className="text-red-500">📱 No phone number available</p>
                      )}
                      {order.customer?.email && (
                        <p className="text-gray-500">✉️ {order.customer.email}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">₹{order.total_amount}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Dialog
                    open={openDialogs[order.id] || false}
                    onOpenChange={(open) => handleDialogChange(order.id, open)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Change Order Stage</DialogTitle>
                      </DialogHeader>
                      <StageChangeControls
                        order={order}
                        currentStage={order.stage || 'tracking'}
                        onStageChange={() => handleDialogChange(order.id, false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Shipping Address</h4>
                  {order.shipping_address && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{order.shipping_address.address_line_1}</p>
                      {order.shipping_address.address_line_2 && <p>{order.shipping_address.address_line_2}</p>}
                      <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                      <p>{order.shipping_address.country}</p>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-2">Items ({order.order_items.length})</h4>
                  <div className="space-y-1">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.title} x {item.quantity}</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.packed ? 'Packed' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {order.tracking_number ? (
                <div className="space-y-4 mt-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-green-900">
                              Tracking: {order.tracking_number}
                            </span>
                            {order.carrier && (
                              <Badge variant="outline" className="text-green-700 border-green-300">
                                {order.carrier}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleMarkShipped(order.id)} disabled={updateOrderStageMutation.isPending}>
                          <Truck className="h-4 w-4 mr-1" />
                          Mark Shipped
                        </Button>
                      </div>
                    </div>
                  </div>
                  <TrackingDetailsCard orderId={order.id} orderNumber={order.order_number} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}

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
  );
};

export default TrackingQueue;
