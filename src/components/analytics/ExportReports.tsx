
import React from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/types/database';

interface ExportReportsProps {
  orders: Order[];
}

const ExportReports = ({ orders }: ExportReportsProps) => {
  const exportToCSV = () => {
    const completedOrders = orders.filter(order => order.stage === 'delivered' || order.stage === 'shipped');
    
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
        order.carrier ? (order.carrier === 'frenchexpress' ? 'French Express' : 
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
    const completedOrders = orders.filter(order => order.stage === 'delivered' || order.stage === 'shipped');
    
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
        order.carrier ? (order.carrier === 'frenchexpress' ? 'French Express' : 
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

  const completedOrdersCount = orders.filter(order => order.stage === 'delivered' || order.stage === 'shipped').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Export Reports</span>
        </CardTitle>
        <CardDescription>
          Export completed orders data to Excel or CSV format
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Completed Orders Available</p>
              <p className="text-sm text-gray-600">{completedOrdersCount} orders ready for export</p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={exportToExcel}
                variant="outline"
                size="sm"
                disabled={completedOrdersCount === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                disabled={completedOrdersCount === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">Export includes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Order Number</li>
              <li>Customer Phone Number</li>
              <li>Courier Name</li>
              <li>Tracking ID</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExportReports;
