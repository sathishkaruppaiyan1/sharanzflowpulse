
import React, { useState } from 'react';
import { Clock, Package, ArrowRight, CheckCircle, Printer, Truck, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface PrintQueueProps {
  orders: any[];
  isShopifyOrders?: boolean;
}

const PrintQueue = ({ orders, isShopifyOrders = false }: PrintQueueProps) => {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [printingOrders, setPrintingOrders] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(orders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handlePrintSingle = (orderId: string) => {
    console.log('Printing single Shopify order:', orderId);
    setPrintingOrders(prev => new Set([...prev, orderId]));
    
    // Simulate printing process
    setTimeout(() => {
      setPrintingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
      
      toast({
        title: "Order Printed Successfully",
        description: `Order ${orders.find(o => o.id === orderId)?.order_number} has been printed and moved to packing stage.`,
      });
    }, 2000);
  };

  const handlePrintBulk = () => {
    console.log('Printing bulk Shopify orders:', Array.from(selectedOrders));
    const orderIds = Array.from(selectedOrders);
    
    orderIds.forEach(orderId => {
      setPrintingOrders(prev => new Set([...prev, orderId]));
    });
    
    // Simulate bulk printing process
    setTimeout(() => {
      setPrintingOrders(new Set());
      setSelectedOrders(new Set());
      
      toast({
        title: "Bulk Print Completed",
        description: `${orderIds.length} orders have been printed and moved to packing stage.`,
      });
    }, 3000);
  };

  const handleShippingLabelSingle = (orderId: string) => {
    console.log('Generating shipping label for Shopify order:', orderId);
    const order = orders.find(o => o.id === orderId);
    toast({
      title: "Shipping Label Generated",
      description: `Shipping label created for order ${order?.order_number}`,
    });
  };

  const handleShippingLabelBulk = () => {
    console.log('Generating shipping labels for Shopify orders:', Array.from(selectedOrders));
    toast({
      title: "Bulk Shipping Labels Generated",
      description: `Shipping labels created for ${selectedOrders.size} orders`,
    });
  };

  const getOrderStageColor = (stage: string) => {
    switch (stage) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'fulfilled':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const isPrinting = (orderId: string) => printingOrders.has(orderId);

  return (
    <div className="space-y-4">
      {orders.length > 0 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={selectedOrders.size === orders.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="font-medium">
              Select All ({selectedOrders.size} of {orders.length} selected)
            </span>
          </div>
          {selectedOrders.size > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleShippingLabelBulk}
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <Truck className="h-4 w-4 mr-2" />
                Shipping Labels ({selectedOrders.size})
              </Button>
              <Button
                onClick={handlePrintBulk}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={Array.from(selectedOrders).some(id => isPrinting(id))}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Selected ({selectedOrders.size})
              </Button>
            </div>
          )}
        </div>
      )}

      {orders.map((order) => (
        <Card key={order.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedOrders.has(order.id)}
                  onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                />
                <div>
                  <CardTitle className="text-lg">{order.order_number}</CardTitle>
                  <CardDescription>
                    {order.customer?.first_name} {order.customer?.last_name}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={getOrderStageColor(order.stage || 'pending')}>
                  <Clock className="h-3 w-3 mr-1" />
                  {isShopifyOrders ? 'Ready to Print' : (order.stage || 'pending')}
                </Badge>
                {isPrinting(order.id) && (
                  <Badge className="bg-blue-100 text-blue-700">
                    <Printer className="h-3 w-3 mr-1 animate-pulse" />
                    Printing...
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Order Details</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Total:</span> {order.currency || '₹'}{order.total_amount}</p>
                  <p><span className="text-gray-500">Created:</span> {new Date(order.created_at).toLocaleDateString()}</p>
                  <p><span className="text-gray-500">Source:</span> {isShopifyOrders ? 'Shopify' : 'Local'}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Ready to Print</h4>
                <div className="text-sm bg-green-50 p-2 rounded">
                  <span className="text-green-700">
                    ✓ Order received from Shopify and ready for printing
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Package className="h-4 w-4" />
                <span>Shopify order ready for processing</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={() => handleShippingLabelSingle(order.id)}
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Label
                </Button>
                <Button 
                  onClick={() => handlePrintSingle(order.id)}
                  disabled={isPrinting(order.id)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isPrinting(order.id) ? (
                    <>
                      <Printer className="h-4 w-4 mr-2 animate-pulse" />
                      Printing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Print & Move to Packing
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
  );
};

export default PrintQueue;
