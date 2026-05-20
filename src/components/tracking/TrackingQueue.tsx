import React, { useState, useEffect } from 'react';
import { Package, Truck, MapPin, ExternalLink, Settings, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

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
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>
      </div>

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {paginatedOrders.map((order) => {
          const phoneNumber = order.customer?.phone || null;
          const isExpanded = expandedOrders[order.id] || false;
          const itemCount = order.order_items.length;

          return (
            <div key={order.id} className="hover:bg-gray-50/60 transition-colors">
              {/* Compact row */}
              <div className="flex items-center gap-3 px-3 py-2">
                {onOrderSelect && (
                  <CheckboxUI
                    checked={selectedOrderIds.has(order.id)}
                    onCheckedChange={(checked) => onOrderSelect(order.id, checked as boolean)}
                    className="data-[state=checked]:bg-blue-600"
                  />
                )}
                <button
                  type="button"
                  onClick={() => toggleExpand(order.id)}
                  className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <Package className="h-4 w-4 text-purple-600" />
                </div>

                <div className="min-w-0 flex-1 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-2 min-w-0">
                    <p className="truncate font-semibold text-sm">{order.order_number}</p>
                    <p className="truncate text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="truncate text-sm text-gray-800">
                      {order.customer?.first_name} {order.customer?.last_name}
                    </p>
                    {phoneNumber ? (
                      <p className="truncate text-xs text-green-600">📱 {phoneNumber}</p>
                    ) : (
                      <p className="truncate text-xs text-red-500">📱 No phone</p>
                    )}
                  </div>
                  <div className="col-span-4 min-w-0">
                    {order.shipping_address ? (
                      <>
                        <p className="truncate text-sm text-gray-700 inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span className="truncate">
                            {order.shipping_address.city}
                            {order.shipping_address.state ? `, ${order.shipping_address.state}` : ''}
                            {order.shipping_address.postal_code ? ` - ${order.shipping_address.postal_code}` : ''}
                          </span>
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {order.shipping_address.address_line_1}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">No address</p>
                    )}
                  </div>
                  <div className="col-span-1 min-w-0 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {itemCount}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-medium">₹{order.total_amount}</p>
                    {order.tracking_number && (
                      <p className="truncate text-xs text-green-700">{order.tracking_number}</p>
                    )}
                  </div>
                </div>

                <Dialog
                  open={openDialogs[order.id] || false}
                  onOpenChange={(open) => handleDialogChange(order.id, open)}
                >
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-sm mb-1.5">Shipping Address</h4>
                      {order.shipping_address ? (
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <p>{order.shipping_address.address_line_1}</p>
                          {order.shipping_address.address_line_2 && <p>{order.shipping_address.address_line_2}</p>}
                          <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                          <p>{order.shipping_address.country}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No address on file</p>
                      )}
                      {order.customer?.email && (
                        <p className="mt-2 text-xs text-gray-500 truncate">✉️ {order.customer.email}</p>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1.5">Items ({itemCount})</h4>
                      <div className="space-y-0.5">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between gap-2 text-xs">
                            <span className="truncate">{item.title} × {item.quantity}</span>
                            <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                              {item.packed ? 'Packed' : 'Pending'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {order.tracking_number && (
                    <div className="mt-3 space-y-3">
                      <div className="rounded-md bg-green-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="h-4 w-4 flex-shrink-0 text-green-600" />
                            <span className="truncate font-medium text-sm text-green-900">
                              Tracking: {order.tracking_number}
                            </span>
                            {order.carrier && (
                              <Badge variant="outline" className="text-green-700 border-green-300">
                                {order.carrier}
                              </Badge>
                            )}
                          </div>
                          <Button size="sm" onClick={() => handleMarkShipped(order.id)} disabled={updateOrderStageMutation.isPending}>
                            <Truck className="h-4 w-4 mr-1" />
                            Mark Shipped
                          </Button>
                        </div>
                      </div>
                      <TrackingDetailsCard orderId={order.id} orderNumber={order.order_number} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
