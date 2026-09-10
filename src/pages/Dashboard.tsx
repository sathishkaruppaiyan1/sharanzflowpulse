
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StageCard from '@/components/dashboard/StageCard';
import ShopifyOrdersCard from '@/components/dashboard/ShopifyOrdersCard';
import Header from '@/components/layout/Header';
import { Package, Printer, PackageCheck, Truck, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStageCounts } from '@/hooks/useStageCounts';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';

interface DashboardProps {
  userRole: string;
}

const Dashboard = ({ userRole }: DashboardProps) => {
  const navigate = useNavigate();
  const { data: stageCounts } = useStageCounts();
  const { orders: shopifyOrders = [] } = useShopifyOrders();
  const [realtimeData, setRealtimeData] = useState({
    newOrders: 0,
    readyToPrint: 0,
    readyToPack: 0,
    readyToShip: 0,
    inTransit: 0
  });

  useEffect(() => {
    // Stage totals come from a single server-side aggregate (get_stage_counts).
    // This screen used to call useOrders(), which downloaded the orders table
    // with customer / address / order_items embedded just to run .filter()
    // over it in the browser — several megabytes per visit, and capped at
    // 1000 rows by PostgREST so the totals below were wrong anyway.
    const newOrdersCount = shopifyOrders.filter(
      order => (order.fulfillment_status || '') === 'unfulfilled'
    ).length;

    setRealtimeData({
      newOrders: newOrdersCount,
      readyToPrint: stageCounts?.pending ?? 0,
      readyToPack: stageCounts?.packing ?? 0,
      readyToShip: stageCounts?.tracking ?? 0,
      inTransit: stageCounts?.shipped ?? 0,
    });
  }, [stageCounts, shopifyOrders]);

  // Derived totals, all from the aggregate rather than a downloaded table.
  const totalOrders = stageCounts
    ? stageCounts.pending + stageCounts.hold + stageCounts.printing +
      stageCounts.packing + stageCounts.tracking + stageCounts.shipped +
      stageCounts.delivered
    : 0;
  const inProgressOrders = stageCounts
    ? stageCounts.hold + stageCounts.printing + stageCounts.packing +
      stageCounts.tracking + stageCounts.shipped
    : 0;
  const processingRate = totalOrders > 0
    ? Math.round(((totalOrders - (stageCounts?.pending ?? 0)) / totalOrders) * 100)
    : 0;

  const stageData = [
    {
      title: 'New Orders',
      count: realtimeData.newOrders,
      icon: Package,
      color: 'blue',
      description: 'Awaiting processing',
      route: '/orders'
    },
    {
      title: 'Ready to Print',
      count: realtimeData.readyToPrint,
      icon: Printer,
      color: 'orange',
      description: 'Labels pending',
      route: '/printing'
    },
    {
      title: 'Ready to Pack',
      count: realtimeData.readyToPack,
      icon: PackageCheck,
      color: 'green',
      description: 'Items to pack',
      route: '/packing'
    },
    {
      title: 'Ready to Ship',
      count: realtimeData.readyToShip,
      icon: Truck,
      color: 'purple',
      description: 'Awaiting pickup',
      route: '/tracking'
    },
    {
      title: 'In Transit',
      count: realtimeData.inTransit,
      icon: BarChart3,
      color: 'red',
      description: 'Being delivered',
      route: '/analytics',
      adminOnly: true,
    }
  ].filter((stage) => !stage.adminOnly || userRole === 'admin');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Dashboard" />
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Flow Pulse OFS
            </h2>
            <p className="text-gray-600">
              Real-time order fulfillment system - Manage your operations efficiently
            </p>
          </div>

          {/* Stage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
            {stageData.map((stage) => (
              <StageCard
                key={stage.title}
                title={stage.title}
                count={stage.count}
                icon={stage.icon}
                color={stage.color}
                description={stage.description}
                onViewAll={() => navigate(stage.route)}
              />
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Shopify Orders */}
            <ShopifyOrdersCard />

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current system health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Database</span>
                    <span className="text-sm font-medium text-green-600">Online</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Real-time Updates</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Order Processing</span>
                    <span className="text-sm font-medium text-green-600">Running</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Performance</CardTitle>
              <CardDescription>Real-time order processing metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Orders</span>
                  <span className="text-xl font-bold text-blue-600">{totalOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed Orders</span>
                  <span className="text-xl font-bold text-green-600">
                    {stageCounts?.delivered ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">In Progress</span>
                  <span className="text-xl font-bold text-orange-600">
                    {inProgressOrders}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Processing Rate</span>
                  <span className="text-xl font-bold text-purple-600">
                    {processingRate}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
