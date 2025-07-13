import React from 'react';
import { Truck, Package } from 'lucide-react';
import Header from '@/components/layout/Header';
import MobileSidebar from '@/components/layout/MobileSidebar';
import TrackingQueue from '@/components/tracking/TrackingQueue';
import TrackingStats from '@/components/tracking/TrackingStats';
import { useOrdersByStage } from '@/hooks/useOrders';

interface TrackingProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user: { email: string; role: string; name: string };
  onLogout: () => void;
}

const Tracking = ({ onMenuClick, isMobileMenuOpen, setIsMobileMenuOpen, user, onLogout }: TrackingProps) => {
  const { data: trackingOrders = [], isLoading } = useOrdersByStage('tracking');
  const { data: shippedOrders = [] } = useOrdersByStage('shipped');
  
  // Combine tracking and shipped orders for stats
  const allTrackingRelatedOrders = [...trackingOrders, ...shippedOrders];

  if (isLoading) {
    return (
      <>
        <MobileSidebar 
          user={user}
          onLogout={onLogout}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex flex-col h-full">
          <Header title="Tracking" showSearch={false} onMenuClick={onMenuClick} />
          <div className="flex-1 p-6 bg-gray-50">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Truck className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-500">Loading tracking data...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MobileSidebar 
        user={user}
        onLogout={onLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex flex-col h-full">
        <Header title="Tracking" showSearch={false} onMenuClick={onMenuClick} />
        <div className="flex-1 p-3 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6">
            
            {/* Tracking Statistics */}
            <TrackingStats orders={allTrackingRelatedOrders} />

            {/* Main Tracking Content */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Tracking Queue ({trackingOrders.length})
                </h2>
              </div>
              
              <TrackingQueue orders={trackingOrders} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Tracking;