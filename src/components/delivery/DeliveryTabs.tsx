
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import DeliveryOrdersList from './DeliveryOrdersList';

const DeliveryTabs: React.FC = () => {
  return (
    <Tabs defaultValue="in-transit" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="ready-to-ship" className="flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span>Ready to Ship</span>
        </TabsTrigger>
        <TabsTrigger value="in-transit" className="flex items-center space-x-2">
          <Truck className="h-4 w-4" />
          <span>In Transit</span>
        </TabsTrigger>
        <TabsTrigger value="delivered" className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4" />
          <span>Delivered</span>
        </TabsTrigger>
        <TabsTrigger value="undelivered" className="flex items-center space-x-2">
          <Package className="h-4 w-4" />
          <span>Issues</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ready-to-ship" className="space-y-4">
        <DeliveryOrdersList 
          stages={['tracking']} 
          title="Ready to Ship Orders"
        />
      </TabsContent>

      <TabsContent value="in-transit" className="space-y-4">
        <DeliveryOrdersList 
          stages={['shipped']} 
          title="In Transit Orders"
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
          title="Orders with Issues"
        />
      </TabsContent>
    </Tabs>
  );
};

export default DeliveryTabs;
