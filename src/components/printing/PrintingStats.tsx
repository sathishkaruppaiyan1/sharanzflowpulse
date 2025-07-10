
import React from 'react';
import { Printer, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/types/database';

interface PrintingStatsProps {
  orders: Order[];
}

const PrintingStats = ({ orders }: PrintingStatsProps) => {
  const pendingOrders = orders.filter(order => order.stage === 'pending');
  const printingOrders = orders.filter(order => order.stage === 'printing');
  const readyToPrintOrders = [...pendingOrders, ...printingOrders];
  
  const todaysOrders = orders.filter(order => 
    new Date(order.created_at).toDateString() === new Date().toDateString()
  );
  
  const urgentOrders = orders.filter(order => {
    const createdDate = new Date(order.created_at);
    const hoursSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreated > 24 && (order.stage === 'pending' || order.stage === 'printing');
  });

  const totalItems = orders.reduce((sum, order) => sum + (order.order_items?.length || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ready to Print</CardTitle>
          <Printer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{readyToPrintOrders.length}</div>
          <CardDescription className="text-xs text-muted-foreground">
            orders available
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todaysOrders.length}</div>
          <CardDescription className="text-xs text-muted-foreground">
            received today
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalItems}</div>
          <CardDescription className="text-xs text-muted-foreground">
            items to print
          </CardDescription>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Urgent Orders</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{urgentOrders.length}</div>
          <CardDescription className="text-xs text-muted-foreground">
            over 24h old
          </CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{orders.length}</div>
          <CardDescription className="text-xs text-muted-foreground">
            in current view
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrintingStats;
