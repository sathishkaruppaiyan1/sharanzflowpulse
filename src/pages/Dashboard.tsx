
import React from 'react';
import { useNavigate } from 'react-router-dom';
import StageCard from '@/components/dashboard/StageCard';
import Header from '@/components/layout/Header';
import { Package, Printer, PackageCheck, Truck, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  const navigate = useNavigate();

  const stageData = [
    {
      title: 'New Orders',
      count: 127,
      icon: Package,
      color: 'blue',
      description: 'Awaiting processing',
      route: '/orders'
    },
    {
      title: 'Ready to Print',
      count: 85,
      icon: Printer,
      color: 'orange',
      description: 'Labels pending',
      route: '/printing'
    },
    {
      title: 'Ready to Pack',
      count: 64,
      icon: PackageCheck,
      color: 'green',
      description: 'Items to pack',
      route: '/packing'
    },
    {
      title: 'Ready to Ship',
      count: 42,
      icon: Truck,
      color: 'purple',
      description: 'Awaiting pickup',
      route: '/tracking'
    },
    {
      title: 'In Transit',
      count: 156,
      icon: BarChart3,
      color: 'red',
      description: 'Being delivered',
      route: '/analytics'
    }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Dashboard" />
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to F3-Engine
            </h2>
            <p className="text-gray-600">
              Manage your order fulfillment process efficiently across all stages
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

          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Today's Performance</CardTitle>
                <CardDescription>Order processing metrics for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Orders Processed</span>
                    <span className="text-xl font-bold text-green-600">247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Labels Printed</span>
                    <span className="text-xl font-bold text-blue-600">198</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Packages Shipped</span>
                    <span className="text-xl font-bold text-purple-600">164</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Processing Rate</span>
                    <span className="text-xl font-bold text-orange-600">89%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current system health and integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Shopify API</span>
                    <span className="text-sm font-medium text-green-600">Connected</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">FrenchExpress</span>
                    <span className="text-sm font-medium text-green-600">Online</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Delhivery</span>
                    <span className="text-sm font-medium text-green-600">Online</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">17Track API</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">WhatsApp</span>
                    <span className="text-sm font-medium text-yellow-600">Pending</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
