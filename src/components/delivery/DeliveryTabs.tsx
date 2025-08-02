
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import DeliveryOrdersList from './DeliveryOrdersList';

const DeliveryTabs: React.FC = () => {
  return (
    <Tabs defaultValue="in-transit" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="in-transit" className="flex items-center space-x-2">
          <Truck className="h-4 w-4" />
          <span>In Transit</span>
        </TabsTrigger>
        <TabsTrigger value="out-for-delivery" className="flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span>Out for Delivery</span>
        </TabsTrigger>
        <TabsTrigger value="delivered" className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4" />
          <span>Delivered</span>
        </TabsTrigger>
        <TabsTrigger value="undelivered" className="flex items-center space-x-2">
          <XCircle className="h-4 w-4" />
          <span>Undelivered</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="in-transit" className="space-y-4">
        <DeliveryOrdersList 
          stages={['shipped']} 
          title="In Transit Orders"
        />
      </TabsContent>

      <TabsContent value="out-for-delivery" className="space-y-4">
        <DeliveryOrdersList 
          stages={['tracking']} 
          title="Out for Delivery Orders"
        />
      </TabsContent>

      <TabsContent value="delivered" className="space-y-4">
        <DeliveryOrdersList 
          stages={['delivered']} 
          title="Delivered Orders"
        />
      </TabsContent>

      <TabsContent value="undelivered" className="space-y-4">
        <DeliveryOrdersList 
          stages={['exception', 'returned', 'failed']} 
          title="Undelivered Orders"
        />
      </TabsContent>
    </Tabs>
  );
};

export default DeliveryTabs;
