import React from 'react';
import { X, Clock, CheckCircle, Package, Truck, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OrderDetailsProps {
  open: boolean;
  onClose: () => void;
  order: any;
}

const OrderDetails = ({ open, onClose, order }: OrderDetailsProps) => {
  if (!order) return null;

  const trackingNumber = `BD${Math.random().toString().slice(2, 11)}IN`;

  const timelineSteps = [
    {
      id: 1,
      title: 'Order Received',
      description: 'Order has been placed',
      icon: CheckCircle,
      status: 'completed',
      timestamp: order.created_at
    },
    {
      id: 2,
      title: 'Ready for Printing',
      description: 'Payment received, ready for label printing',
      icon: Clock,
      status: order.fulfillment_status === 'unfulfilled' ? 'current' : 'completed',
      timestamp: null,
      currentStatus: order.fulfillment_status === 'unfulfilled' ? 'Current Status' : null
    },
    {
      id: 3,
      title: 'Label Printed',
      description: 'Shipping label has been printed',
      icon: Package,
      status: order.fulfillment_status === 'partial' ? 'current' : order.fulfillment_status === 'fulfilled' ? 'completed' : 'pending',
      timestamp: null
    },
    {
      id: 4,
      title: 'Order Packed',
      description: 'Order has been packed and ready for shipping',
      icon: Package,
      status: order.fulfillment_status === 'fulfilled' ? 'completed' : 'pending',
      timestamp: null
    },
    {
      id: 5,
      title: 'Order Shipped',
      description: 'Order has been shipped to customer',
      icon: Truck,
      status: order.fulfillment_status === 'fulfilled' ? 'completed' : 'pending',
      timestamp: null
    },
    {
      id: 6,
      title: 'Order Delivered',
      description: 'Order has been delivered to customer',
      icon: MapPin,
      status: 'pending',
      timestamp: null
    }
  ];

  const getStepIcon = (step: any) => {
    const Icon = step.icon;
    if (step.status === 'completed') {
      return (
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
          <CheckCircle className="h-5 w-5" />
        </div>
      );
    } else if (step.status === 'current') {
      return (
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
          <Icon className="h-5 w-5" />
        </div>
      );
    } else {
      return (
        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-500">
          <span className="text-sm font-medium">{step.id}</span>
        </div>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Order Details - #{order.order_number || order.name}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Tracking Information */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Tracking Information</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600 font-medium">Tracking Number:</span>
                <span className="font-mono text-blue-600 font-bold">{trackingNumber}</span>
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Order Timeline</h3>
            <div className="space-y-4">
              {timelineSteps.map((step, index) => (
                <div key={step.id} className="flex items-start space-x-4">
                  {getStepIcon(step)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
                      {step.currentStatus && (
                        <Badge variant="secondary" className="text-blue-600 bg-blue-100">
                          {step.currentStatus}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{step.description}</p>
                    {step.timestamp && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(step.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Information */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Order Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Created:</span>
                <div>{order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Estimated Delivery:</span>
                <div>
                  {order.created_at 
                    ? new Date(new Date(order.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
                    : 'N/A'
                  }
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Total Amount:</span>
                <div className="font-semibold">{order.currency || 'INR'} {order.total_amount || order.current_total_price || '0'}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Payment Status:</span>
                <div>
                  <Badge variant={order.financial_status === 'paid' ? 'secondary' : 'outline'}>
                    {order.financial_status || 'pending'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Shipping Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Customer</h4>
              <div className="text-sm space-y-1">
                <div>{order.customer_name || `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'Guest Customer'}</div>
                <div className="text-gray-600">{order.customer?.email || order.email || 'No email'}</div>
                <div className="text-gray-600">{order.customer?.phone || order.phone || 'No phone'}</div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Shipping Address</h4>
              <div className="text-sm space-y-1">
                {order.shipping_address ? (
                  <>
                    <div>{order.shipping_address.address1}</div>
                    {order.shipping_address.address2 && <div>{order.shipping_address.address2}</div>}
                    <div>{order.shipping_address.city}, {order.shipping_address.province}</div>
                    <div>{order.shipping_address.zip} {order.shipping_address.country}</div>
                    {order.shipping_address.phone && <div>Phone: {order.shipping_address.phone}</div>}
                  </>
                ) : (
                  <div className="text-gray-500">No shipping address available</div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Order Items</h4>
            <div className="space-y-2">
              {order.line_items ? order.line_items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div>
                    <div className="font-medium">{item.title || item.name}</div>
                    {item.variant_title && (
                      <div className="text-sm text-gray-500">{item.variant_title}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">Qty: {item.quantity || 1}</div>
                    <div className="text-sm text-gray-500">{order.currency || 'INR'} {item.price || '0'}</div>
                  </div>
                </div>
              )) : (
                <div className="text-gray-500">No items found</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetails;