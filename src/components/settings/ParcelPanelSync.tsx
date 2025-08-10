
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useParcelPanelSync } from '@/hooks/useParcelPanelSync';
import { Package, Truck, Building, CheckCircle, Loader2 } from 'lucide-react';

const ParcelPanelSync: React.FC = () => {
  const { syncAllData, isSyncing, syncProgress, isConfigured } = useParcelPanelSync();

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'orders': return <Package className="h-4 w-4" />;
      case 'tracking': return <Truck className="h-4 w-4" />;
      case 'couriers': return <Building className="h-4 w-4" />;
      case 'complete': return <CheckCircle className="h-4 w-4" />;
      default: return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <span>Parcel Panel Data Sync</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          Fetch all available data from Parcel Panel including orders, tracking details, and courier information.
        </div>

        {!isConfigured && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Please configure Parcel Panel API settings first before syncing data.
            </p>
          </div>
        )}

        {syncProgress && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              {getStageIcon(syncProgress.stage)}
              <span className="text-sm font-medium">{syncProgress.status}</span>
            </div>
            <Progress value={syncProgress.progress} className="w-full" />
            <div className="text-xs text-gray-500">
              {syncProgress.progress}% complete
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-blue-500" />
            <span>All Orders</span>
          </div>
          <div className="flex items-center space-x-2">
            <Truck className="h-4 w-4 text-green-500" />
            <span>Tracking Details</span>
          </div>
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-purple-500" />
            <span>Courier Info</span>
          </div>
        </div>

        <Button
          onClick={syncAllData}
          disabled={!isConfigured || isSyncing}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing Data...
            </>
          ) : (
            <>
              <Package className="mr-2 h-4 w-4" />
              Sync All Parcel Panel Data
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500">
          This will fetch all orders, tracking details, and courier information from Parcel Panel 
          and store them in your database for offline access and analysis.
        </div>
      </CardContent>
    </Card>
  );
};

export default ParcelPanelSync;
