
import React, { useState, useEffect } from 'react';
import { Package, Clock, Users, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Order } from '@/types/database';
import { normalizeItemForDisplay } from '@/utils/productVariationUtils';
import { toast } from 'sonner';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import ShippingLabelPreview from './ShippingLabelPreview';

interface PrintQueueProps {
  orders: any[];
  isShopifyOrders?: boolean;
  onSelectedCountChange?: (count: number, selectedIds: Set<string>) => void;
  selectedOrderIds?: Set<string>;
  onSelectAll?: (currentPageOrders?: any[]) => void;
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
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [orderToProcess, setOrderToProcess] = useState<any>(null);

  // Use external selection state if provided, otherwise use internal state
  const effectiveSelectedOrders = selectedOrderIds.size > 0 ? selectedOrderIds : selectedOrders;

  // Calculate pagination
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageOrders = orders.slice(startIndex, endIndex);

  useEffect(() => {
    if (onSelectedCountChange) {
      onSelectedCountChange(effectiveSelectedOrders.size, effectiveSelectedOrders);
    }
  }, [effectiveSelectedOrders, onSelectedCountChange]);

  const handleSelectOrder = (orderId: string) => {
    if (selectedOrderIds.size > 0) {
      // External selection management
      const newSelected = new Set(selectedOrderIds);
      if (newSelected.has(orderId)) {
        newSelected.delete(orderId);
      } else {
        newSelected.add(orderId);
      }
      onSelectedCountChange?.(newSelected.size, newSelected);
    } else {
      // Internal selection management
      const newSelected = new Set(selectedOrders);
      if (newSelected.has(orderId)) {
        newSelected.delete(orderId);
      } else {
        newSelected.add(orderId);
      }
      setSelectedOrders(newSelected);
    }
  };

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(currentPageOrders);
    } else {
      const allCurrentIds = new Set(currentPageOrders.map(order => order.id));
      setSelectedOrders(allCurrentIds);
    }
  };

  const handleUnselectAll = () => {
    if (onUnselectAll) {
      onUnselectAll();
    } else {
      setSelectedOrders(new Set());
    }
  };

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return 'No phone';
    return phone.replace(/(\+\d{2})(\d{10})/, '$1 $2').replace(/(\d{5})(\d{5})/, '$1 $2');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrintLabel = async (order: any) => {
    try {
      // Check if it's a Shopify order that needs to be synced first
      if (isShopifyOrders && !order._isSupabaseOrder) {
        console.log('Syncing Shopify order to Supabase before printing:', order.id);
        
        // Transform Shopify order to the expected format
        const shopifyOrderData = {
          id: order.id,
          name: order.order_number,
          order_number: order.order_number,
          customer: order.customer,
          shipping_address: order.shipping_address,
          line_items: order.line_items,
          current_total_price: order.current_total_price,
          currency: order.currency,
          created_at: order.created_at
        };

        const orderId = await supabaseOrderService.syncShopifyOrderToSupabase(shopifyOrderData);
        console.log('Successfully synced order, new ID:', orderId);
        
        // Update the order stage to packing and set printed_at
        await supabaseOrderService.updateOrderStage(orderId, 'packing');
        
        toast.success(`Order ${order.order_number} synced and ready for packing!`);
      } else {
        // For orders already in Supabase, just update the stage
        await supabaseOrderService.updateOrderStage(order.id, 'packing');
        toast.success(`Order ${order.order_number} moved to packing stage!`);
      }
      
      // Remove the order from selected orders
      if (selectedOrderIds.size > 0) {
        const newSelected = new Set(selectedOrderIds);
        newSelected.delete(order.id);
        onSelectedCountChange?.(newSelected.size, newSelected);
      } else {
        const newSelected = new Set(selectedOrders);
        newSelected.delete(order.id);
        setSelectedOrders(newSelected);
      }
      
    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('Failed to process order. Please try again.');
    }
  };

  const handlePrintLabelPreview = (order: any) => {
    setOrderToProcess(order);
    setShowLabelPreview(true);
  };

  const handlePrintComplete = async (orderId: string | string[]) => {
    const ids = Array.isArray(orderId) ? orderId : [orderId];
    
    for (const id of ids) {
      const order = currentPageOrders.find(o => o.id === id);
      if (order) {
        await handlePrintLabel(order);
      }
    }
    
    setShowLabelPreview(false);
    setOrderToProcess(null);
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders to print</h3>
        <p className="text-gray-500">All orders have been processed or there are no matching orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">
            {effectiveSelectedOrders.size} of {currentPageOrders.length} selected
          </span>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-blue-600 border-blue-200 hover:bg-blue-100"
            >
              Select All ({currentPageOrders.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnselectAll}
              className="text-gray-600 border-gray-200 hover:bg-gray-100"
            >
              Unselect All
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages} • {orders.length} total orders
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {currentPageOrders.map((order) => {
          const isSelected = effectiveSelectedOrders.has(order.id);
          const isExpanded = expandedOrders.has(order.id);
          
          // Normalize items for consistent display
          const normalizedItems = order.line_items ? 
            order.line_items.map(normalizeItemForDisplay) : 
            (order.order_items || []).map(normalizeItemForDisplay);

          return (
            <Card key={order.id} className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectOrder(order.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {order.order_number || order.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {order._isSupabaseOrder ? 'Supabase' : 'Shopify'}
                        </Badge>
                        {order.shopify_order_id && (
                          <Badge variant="secondary" className="text-xs">
                            #{order.shopify_order_id}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{order.customer_name || `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'No customer'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                        <div className="font-medium">
                          ₹{order.current_total_price || order.total_amount || '0'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(order.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePrintLabelPreview(order)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print Label
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Phone Number */}
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">Customer Phone</div>
                  <div className="text-lg font-mono text-gray-900">
                    {formatPhoneNumber(order.shipping_address?.phone || order.customer?.phone)}
                  </div>
                </div>

                {/* Products Section - Now shows all products without truncation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Products ({normalizedItems.length})</h4>
                  </div>
                  
                  {/* Expanded width container for all products */}
                  <div className="bg-white border rounded-lg p-3 min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {normalizedItems.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3 min-w-0">
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900 text-sm leading-tight">
                              {item.displayName}
                            </div>
                            {item.variationText && item.variationText !== 'Standard variant' && (
                              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                {item.variationText}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Qty: {item.quantity}</span>
                              <span>₹{item.price}</span>
                            </div>
                            {item.sku && (
                              <div className="text-xs text-gray-400 font-mono">
                                SKU: {item.sku}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Shipping Address</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>{order.shipping_address?.address1}</div>
                        {order.shipping_address?.address2 && <div>{order.shipping_address.address2}</div>}
                        <div>
                          {order.shipping_address?.city}, {order.shipping_address?.province} {order.shipping_address?.zip}
                        </div>
                        <div>{order.shipping_address?.country}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Label Preview Modal */}
      {showLabelPreview && orderToProcess && (
        <ShippingLabelPreview
          open={showLabelPreview}
          onClose={() => setShowLabelPreview(false)}
          orders={[orderToProcess]}
          onPrintComplete={handlePrintComplete}
        />
      )}
    </div>
  );
};

export default PrintQueue;
