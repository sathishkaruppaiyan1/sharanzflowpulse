import React from 'react';
import { Package, Phone, Truck, Hash, Calendar, Download, FileSpreadsheet, FileText, MessageCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Order } from '@/types/database';
import { sendOrderShippedNotification } from '@/services/interakt/orderNotificationService';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { woocommerceService } from '@/services/woocommerceService';
import { useToast } from '@/hooks/use-toast';

interface CompletedOrdersListProps {
  orders: Order[];
}

const CompletedOrdersList = ({ orders }: CompletedOrdersListProps) => {
  const { toast } = useToast();
  const completedOrders = orders.filter(order => 
    order.stage === 'delivered' || order.stage === 'shipped'
  );

  const getCourierDisplayName = (carrier: string | null) => {
    switch (carrier) {
      case 'frenchexpress':
        return 'Franch express';
      case 'delhivery':
        return 'Delhivery';
      default:
        return 'Other';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSendWhatsApp = async (order: Order) => {
    if (!order.tracking_number || !order.carrier) {
      toast({
        title: "Missing Information",
        description: "Order must have tracking number and carrier to send WhatsApp message.",
        variant: "destructive"
      });
      return;
    }

    if (!order.customer?.phone) {
      toast({
        title: "No Phone Number",
        description: "Customer phone number is not available for this order.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`Sending WhatsApp for order ${order.order_number}...`);
      
      const success = await sendOrderShippedNotification(
        order, 
        order.tracking_number, 
        order.carrier as any
      );

      if (success) {
        toast({
          title: "WhatsApp Sent",
          description: `Order details sent to ${order.customer.phone} successfully.`,
        });
      } else {
        toast({
          title: "Failed to Send",
          description: "Failed to send WhatsApp message. Check console for details.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast({
        title: "Error",
        description: "An error occurred while sending WhatsApp message.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateStatus = async (order: Order) => {
    if (!order.tracking_number || !order.carrier) {
      toast({
        title: "Missing Information",
        description: "Order must have tracking number and carrier to update status.",
        variant: "destructive"
      });
      return;
    }

    // Try both Shopify and WooCommerce updates
    let shopifySuccess = false;
    let woocommerceSuccess = false;
    let shopifyError = '';
    let woocommerceError = '';

    // Try Shopify update if shopify_order_id exists
    if (order.shopify_order_id) {
      try {
        console.log(`Updating Shopify status for order ${order.order_number}...`);
        
        await supabaseOrderService.updateShopifyOrderFulfillment(
          order.shopify_order_id.toString(),
          order.tracking_number,
          order.carrier as any
        );
        
        shopifySuccess = true;
        console.log('Shopify update successful');
      } catch (error) {
        console.error('Error updating Shopify status:', error);
        shopifyError = error.message || 'Unknown Shopify error';
      }
    }

    // Try WooCommerce update (assuming order_number can be used as WooCommerce order ID)
    try {
      console.log(`Updating WooCommerce status for order ${order.order_number}...`);
      
      await woocommerceService.updateOrderStatus({
        woocommerce_order_id: order.order_number,
        tracking_number: order.tracking_number,
        carrier: order.carrier as any
      });
      
      woocommerceSuccess = true;
      console.log('WooCommerce update successful');
    } catch (error) {
      console.error('Error updating WooCommerce status:', error);
      woocommerceError = error.message || 'Unknown WooCommerce error';
    }

    // Show appropriate toast based on results
    if (shopifySuccess && woocommerceSuccess) {
      toast({
        title: "Status Updated",
        description: `Order ${order.order_number} updated successfully in both Shopify and WooCommerce.`,
      });
    } else if (shopifySuccess) {
      toast({
        title: "Shopify Updated",
        description: `Order ${order.order_number} updated successfully in Shopify.` + 
                     (woocommerceError ? ` WooCommerce update failed: ${woocommerceError}` : ''),
      });
    } else if (woocommerceSuccess) {
      toast({
        title: "WooCommerce Updated",
        description: `Order ${order.order_number} updated successfully in WooCommerce.` + 
                     (shopifyError ? ` Shopify update failed: ${shopifyError}` : ''),
      });
    } else {
      toast({
        title: "Update Failed",
        description: `Failed to update order ${order.order_number}. Shopify: ${shopifyError}. WooCommerce: ${woocommerceError}`,
        variant: "destructive"
      });
    }
  };

  const exportToCSV = () => {
    if (completedOrders.length === 0) {
      alert('No completed orders to export');
      return;
    }

    const headers = ['Order Number', 'Customer Phone', 'Courier Name', 'Tracking ID'];
    const csvContent = [
      headers.join(','),
      ...completedOrders.map(order => [
        order.order_number,
        order.customer?.phone || 'N/A',
        order.carrier ? (order.carrier === 'frenchexpress' ? 'Franch express' : 
                        order.carrier === 'delhivery' ? 'Delhivery' : 'Other') : 'N/A',
        order.tracking_number || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `completed_orders_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (completedOrders.length === 0) {
      alert('No completed orders to export');
      return;
    }

    // Create a simple tab-separated format that Excel can open
    const headers = ['Order Number', 'Customer Phone', 'Courier Name', 'Tracking ID'];
    const tsvContent = [
      headers.join('\t'),
      ...completedOrders.map(order => [
        order.order_number,
        order.customer?.phone || 'N/A',
        order.carrier ? (order.carrier === 'frenchexpress' ? 'Franch express' : 
                        order.carrier === 'delhivery' ? 'Delhivery' : 'Other') : 'N/A',
        order.tracking_number || 'N/A'
      ].join('\t'))
    ].join('\n');

    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `completed_orders_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (completedOrders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Orders</h3>
            <p className="text-gray-500">Completed orders will appear here once they are shipped or delivered.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Completed Orders ({completedOrders.length})</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              onClick={exportToExcel}
              variant="outline"
              size="sm"
              disabled={completedOrders.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              disabled={completedOrders.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Order Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      <span>{order.order_number}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.customer ? (
                      <div>
                        <div className="font-medium">
                          {order.customer.first_name} {order.customer.last_name}
                        </div>
                        {order.customer.email && (
                          <div className="text-sm text-gray-500">{order.customer.email}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">No customer data</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{order.customer?.phone || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-gray-400" />
                      <span>{getCourierDisplayName(order.carrier)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">
                      {order.tracking_number || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={getStageColor(order.stage || '')}
                    >
                      {order.stage === 'delivered' ? 'Delivered' : 'Shipped'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">₹{order.total_amount}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleSendWhatsApp(order)}
                        variant="outline"
                        size="sm"
                        disabled={!order.tracking_number || !order.carrier || !order.customer?.phone}
                        className="flex items-center space-x-1"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </Button>
                      <Button
                        onClick={() => handleUpdateStatus(order)}
                        variant="outline"
                        size="sm"
                        disabled={!order.tracking_number || !order.carrier}
                        className="flex items-center space-x-1"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Update Status</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompletedOrdersList;
