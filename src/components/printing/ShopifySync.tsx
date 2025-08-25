
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { useShopifyOrderSync } from '@/hooks/useShopifyOrderSync';
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { Badge } from '@/components/ui/badge';

interface ShopifySyncProps {
  onSyncComplete?: () => void;
}

export const ShopifySync: React.FC<ShopifySyncProps> = ({ onSyncComplete }) => {
  const { syncShopifyOrders, syncing } = useShopifyOrderSync();
  const { apiConfigs } = useApiConfigs();

  const isShopifyConfigured = Boolean(
    apiConfigs?.shopify?.enabled && 
    apiConfigs?.shopify?.shop_url && 
    apiConfigs?.shopify?.access_token
  );

  const handleSync = async () => {
    const result = await syncShopifyOrders();
    if (onSyncComplete) {
      onSyncComplete();
    }
  };

  if (!isShopifyConfigured) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Shopify Not Configured</Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleSync}
        disabled={syncing}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {syncing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {syncing ? 'Syncing...' : 'Sync from Shopify'}
      </Button>
      <Badge variant="outline" className="text-xs">
        Auto-sync every 5min
      </Badge>
    </div>
  );
};
