
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { CheckCircle, XCircle, Circle } from 'lucide-react';

const ConnectionStatus = () => {
  const { apiConfigs, loading } = useApiConfigs();

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Circle className="h-4 w-4 animate-pulse" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  const connections = [
    {
      name: 'Shopify',
      enabled: apiConfigs.shopify?.enabled && apiConfigs.shopify?.shop_url && apiConfigs.shopify?.access_token,
    },
    {
      name: 'Interakt BSP',
      enabled: apiConfigs.interakt?.enabled && apiConfigs.interakt?.api_key,
    },
    {
      name: 'TrackingMore',
      enabled: apiConfigs.trackingmore?.enabled && apiConfigs.trackingmore?.api_key,
    }
  ];

  const connectedCount = connections.filter(conn => conn.enabled).length;
  const totalCount = connections.length;

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        {connectedCount > 0 ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <span className="text-sm font-medium">
          {connectedCount}/{totalCount} Connected
        </span>
      </div>
      
      <div className="flex space-x-1">
        {connections.map((connection) => (
          <Badge
            key={connection.name}
            variant={connection.enabled ? "default" : "secondary"}
            className={`text-xs px-2 py-0 ${
              connection.enabled 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}
          >
            {connection.name}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default ConnectionStatus;
