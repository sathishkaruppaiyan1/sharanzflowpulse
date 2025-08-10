
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Package, 
  CheckCircle, 
  Truck, 
  AlertCircle, 
  RotateCcw,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { useParcelPanelAnalytics } from '@/hooks/useParcelPanelAnalytics';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const DeliveryAnalytics: React.FC = () => {
  const { analyticsData, isLoading, isSyncing, syncAnalytics, refetch } = useParcelPanelAnalytics();

  const latestData = analyticsData?.[0];

  const statusData = latestData ? [
    { name: 'Delivered', value: latestData.delivered_orders, color: '#10B981' },
    { name: 'In Transit', value: latestData.in_transit_orders, color: '#3B82F6' },
    { name: 'Out for Delivery', value: latestData.out_for_delivery_orders, color: '#F59E0B' },
    { name: 'Exception', value: latestData.exception_orders, color: '#EF4444' },
  ] : [];

  const handleSyncAnalytics = () => {
    syncAnalytics();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!latestData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart className="mr-2 h-5 w-5" />
              Delivery Analytics
            </div>
            <Button 
              onClick={handleSyncAnalytics} 
              disabled={isSyncing}
              size="sm"
            >
              {isSyncing ? 'Syncing...' : 'Sync Analytics'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <BarChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No analytics data available</h3>
            <p className="text-sm mb-4">Sync your Parcel Panel analytics to see delivery insights.</p>
            <Button onClick={handleSyncAnalytics} disabled={isSyncing}>
              {isSyncing ? 'Syncing...' : 'Sync Analytics Data'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Sync Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Delivery Analytics</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            Last updated: {new Date(latestData.date).toLocaleDateString()}
          </Badge>
          <Button 
            onClick={handleSyncAnalytics} 
            disabled={isSyncing}
            size="sm"
            variant="outline"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {isSyncing ? 'Syncing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{latestData.total_orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold">{latestData.delivered_orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">In Transit</p>
                <p className="text-2xl font-bold">{latestData.in_transit_orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Delivery Rate</p>
                <p className="text-2xl font-bold">{latestData.delivery_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Carriers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Carriers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {latestData.top_carriers.slice(0, 5).map((carrier, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{carrier.name}</span>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={(carrier.count / latestData.total_orders) * 100} 
                      className="w-20" 
                    />
                    <span className="text-sm text-gray-600">{carrier.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {latestData.avg_delivery_time_days}
              </div>
              <p className="text-sm text-gray-600">Avg. Delivery Days</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {latestData.delivery_rate}%
              </div>
              <p className="text-sm text-gray-600">Success Rate</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {latestData.exception_orders}
              </div>
              <p className="text-sm text-gray-600">Exceptions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryAnalytics;
