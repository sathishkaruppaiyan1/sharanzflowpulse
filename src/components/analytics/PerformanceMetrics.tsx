
import React from 'react';
import { TrendingUp, Clock, Package, Truck, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Order } from '@/types/database';

interface PerformanceMetricsProps {
  orders: Order[];
}

const PerformanceMetrics = ({ orders }: PerformanceMetricsProps) => {
  // Calculate metrics
  const totalOrders = orders.length;
  const completedOrders = orders.filter(order => order.stage === 'delivered').length;
  const avgProcessingTime = calculateAvgProcessingTime(orders);
  const todayOrders = orders.filter(order => 
    new Date(order.created_at).toDateString() === new Date().toDateString()
  ).length;

  // Stage distribution data
  const stageData = [
    { name: 'Pending', value: orders.filter(o => o.stage === 'pending').length, color: '#ef4444' },
    { name: 'Printing', value: orders.filter(o => o.stage === 'printing').length, color: '#f97316' },
    { name: 'Packing', value: orders.filter(o => o.stage === 'packing').length, color: '#eab308' },
    { name: 'Tracking', value: orders.filter(o => o.stage === 'tracking').length, color: '#8b5cf6' },
    { name: 'Shipped', value: orders.filter(o => o.stage === 'shipped').length, color: '#06b6d4' },
    { name: 'Delivered', value: orders.filter(o => o.stage === 'delivered').length, color: '#10b981' },
  ];

  // Daily orders trend (last 7 days)
  const dailyData = generateDailyTrend(orders);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <CardDescription className="text-xs text-muted-foreground">
              all time
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedOrders}</div>
            <CardDescription className="text-xs text-muted-foreground">
              {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}% completion rate
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProcessingTime}h</div>
            <CardDescription className="text-xs text-muted-foreground">
              from order to shipped
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayOrders}</div>
            <CardDescription className="text-xs text-muted-foreground">
              received today
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Stage Distribution</CardTitle>
            <CardDescription>Current orders by fulfillment stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stageData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                >
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Order Trend</CardTitle>
            <CardDescription>Orders received over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function calculateAvgProcessingTime(orders: Order[]): number {
  const shippedOrders = orders.filter(order => order.shipped_at);
  
  if (shippedOrders.length === 0) return 0;
  
  const totalHours = shippedOrders.reduce((sum, order) => {
    const created = new Date(order.created_at);
    const shipped = new Date(order.shipped_at!);
    const hours = (shipped.getTime() - created.getTime()) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);
  
  return Math.round(totalHours / shippedOrders.length);
}

function generateDailyTrend(orders: Order[]) {
  const last7Days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const dayOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate.toDateString() === date.toDateString();
    });
    
    last7Days.push({
      date: dateStr,
      orders: dayOrders.length,
    });
  }
  
  return last7Days;
}

export default PerformanceMetrics;
