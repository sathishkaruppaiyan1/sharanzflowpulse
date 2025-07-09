
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { useNavigate } from 'react-router-dom';

const ShopifyOrdersCard = () => {
  const { orders, loading, error, refetch } = useShopifyOrders();
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'unfulfilled':
        return 'bg-orange-100 text-orange-800';
      case 'fulfilled':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5 text-green-600" />
              <CardTitle>Shopify Orders</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Recent orders from your Shopify store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-center">
            <div className="space-y-3">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />
              <p className="text-sm text-gray-600">{error}</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                Configure Shopify API
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5 text-green-600" />
            <CardTitle>Shopify Orders</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>Recent orders from your Shopify store</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center p-8">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{order.order_number}</span>
                    <Badge className={getStatusColor(order.financial_status)}>
                      {order.financial_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{order.currency} {order.total_amount}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {orders.length > 5 && (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/orders')}
              >
                View All Orders ({orders.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShopifyOrdersCard;
