
import React, { useState } from 'react';
import { Clock, Package, ArrowRight, CheckCircle, Printer, Truck, FileText, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface PrintQueueProps {
  orders: any[];
  isShopifyOrders?: boolean;
  onSelectedCountChange?: (count: number) => void;
}

const PrintQueue = ({ orders, isShopifyOrders = false, onSelectedCountChange }: PrintQueueProps) => {
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

  const isPrinting = (orderId: string) => printingOrders.has(orderId);

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="border border-gray-200 rounded-lg bg-white">
          <div className="p-4">
            <div className="flex items-start justify-between">
              {/* Left section with checkbox and order info */}
              <div className="flex items-start space-x-4">
                <Checkbox
                  checked={selectedOrders.has(order.id)}
                  onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                  className="mt-1"
                />
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-lg">#{order.order_number}</h3>
                    {isPrinting(order.id) && (
                      <Badge className="bg-blue-100 text-blue-700">
                        <Printer className="h-3 w-3 mr-1 animate-pulse" />
                        Printing...
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 font-medium">
                    {order.customer?.first_name} {order.customer?.last_name}
                  </p>
                </div>
              </div>

              {/* Right section with print button */}
              <Button 
                onClick={() => handlePrintSingle(order.id)}
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

            {/* Order details grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4 ml-6">
              {/* Products */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Products:</h4>
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">Wireless Bluetooth Headphones</p>
                  <p className="text-sm text-gray-700">Phone Case</p>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-700">Variations:</p>
                  <div className="flex space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">Black</Badge>
                    <Badge variant="outline" className="text-xs">iPhone 14 Pro</Badge>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Details:</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>750g</p>
                  <p className="font-medium">₹{order.total_amount}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Address:</h4>
                <div className="text-sm text-gray-700">
                  <p>123 MG Road, Bangalore, Karnataka</p>
                  <p>560001 India</p>
                  <div className="flex items-center mt-1">
                    <Phone className="h-3 w-3 mr-1 text-red-500" />
                    <span className="text-red-600">+91 98765 43210</span>
                  </div>
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
  );
};

export default PrintQueue;
