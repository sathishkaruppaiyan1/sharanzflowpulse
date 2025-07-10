
import React, { useState } from 'react';
import { Printer, Filter } from 'lucide-react';
import Header from '@/components/layout/Header';
import PrintQueue from '@/components/printing/PrintQueue';
import PrintingStats from '@/components/printing/PrintingStats';
import PrintingFilters from '@/components/printing/PrintingFilters';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Printing = () => {
  const { orders: shopifyOrders = [], loading: isLoading, error } = useShopifyOrders();
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  React.useEffect(() => {
    // Transform Shopify orders to match our printing queue format
    const transformedOrders = shopifyOrders.map(order => ({
      id: order.id,
      order_number: order.order_number,
      customer: {
        first_name: order.customer_name.split(' ')[0] || '',
        last_name: order.customer_name.split(' ').slice(1).join(' ') || ''
      },
      total_amount: parseFloat(order.total_amount),
      currency: order.currency,
      created_at: order.created_at,
      stage: order.fulfillment_status === 'unfulfilled' ? 'pending' : 'processing',
      order_items: [
        {
          id: `${order.id}-item-1`,
          title: `Order ${order.order_number} Items`,
          quantity: 1,
          price: parseFloat(order.total_amount)
        }
      ]
    }));
    
    // Filter to show only orders that are ready to print (unfulfilled orders)
    const readyToPrintOrders = transformedOrders.filter(order => 
      order.stage === 'pending' || order.stage === 'processing'
    );
    
    setFilteredOrders(readyToPrintOrders);
  }, [shopifyOrders]);

  const handleFilterChange = (filtered: any[]) => {
    setFilteredOrders(filtered);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Printing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Printer className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading Shopify orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Printing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Shopify Orders</CardTitle>
              <CardDescription>
                Unable to load orders from Shopify. Please check your API configuration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Printing Stage" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Printer className="h-6 w-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Shopify Orders - Print Management</h2>
                  <p className="text-gray-600">
                    Fresh orders from Shopify ready to print. Select orders to print individually or in bulk.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          <PrintingStats orders={filteredOrders} />
          
          {showFilters && (
            <PrintingFilters 
              orders={shopifyOrders.map(order => ({
                id: order.id,
                order_number: order.order_number,
                customer: {
                  first_name: order.customer_name.split(' ')[0] || '',
                  last_name: order.customer_name.split(' ').slice(1).join(' ') || ''
                },
                total_amount: parseFloat(order.total_amount),
                created_at: order.created_at,
                stage: order.fulfillment_status === 'unfulfilled' ? 'pending' : 'processing',
                order_items: []
              }))} 
              onFilterChange={handleFilterChange}
            />
          )}
          
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Ready to Print ({filteredOrders.length})
            </h3>
            <PrintQueue orders={filteredOrders} isShopifyOrders={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Printing;
