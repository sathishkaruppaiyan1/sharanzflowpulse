
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StageCard from '@/components/dashboard/StageCard';
import ShopifyOrdersCard from '@/components/dashboard/ShopifyOrdersCard';
import Header from '@/components/layout/Header';
import { Package, Printer, PackageCheck, Truck, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrders } from '@/hooks/useOrders';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { supabase } from '@/integrations/supabase/client';

interface DashboardProps {
  userRole: string;
}

const Dashboard = ({ userRole }: DashboardProps) => {
  const navigate = useNavigate();
  const { data: orders = [] } = useOrders();
  const { orders: shopifyOrders = [] } = useShopifyOrders();
  const [realtimeData, setRealtimeData] = useState({
    newOrders: 0,
    readyToPrint: 0,
    readyToPack: 0,
    readyToShip: 0,
    inTransit: 0
  });

  useEffect(() => {
    // Calculate real-time statistics from both Shopify orders and internal orders
    const calculateStats = () => {
      // Count new orders from Shopify (unfulfilled orders)
      const newOrdersCount = shopifyOrders.filter(order => 
        (order.fulfillment_status || '') === 'unfulfilled'
      ).length;

      // Count ready to print from internal orders (pending stage)
      const readyToPrintCount = orders.filter(order => 
        order.stage === 'pending'
      ).length;

      const stats = {
        newOrders: newOrdersCount,
        readyToPrint: readyToPrintCount,
        readyToPack: orders.filter(order => order.stage === 'packing').length,
        readyToShip: orders.filter(order => order.stage === 'tracking').length,
        inTransit: orders.filter(order => order.stage === 'shipped').length
      };
      setRealtimeData(stats);
    };

    calculateStats();

    // Set up real-time subscription for orders
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          // Refetch data when orders change
          calculateStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orders, shopifyOrders]);

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
                  <span className="text-xl font-bold text-blue-600">{orders.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed Orders</span>
                  <span className="text-xl font-bold text-green-600">
                    {orders.filter(order => order.stage === 'delivered').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">In Progress</span>
                  <span className="text-xl font-bold text-orange-600">
                    {orders.filter(order => !['delivered', 'pending'].includes(order.stage || '')).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Processing Rate</span>
                  <span className="text-xl font-bold text-purple-600">
                    {orders.length > 0 ? Math.round((orders.filter(order => order.stage !== 'pending').length / orders.length) * 100) : 0}%
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
