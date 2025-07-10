import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useApiConfigs } from '@/hooks/useApiConfigs';
import { Package, MessageSquare, Truck } from 'lucide-react';

const ApiConfiguration = () => {
  const { apiConfigs, setApiConfigs, saveConfigs, saving } = useApiConfigs();

  const handleSave = async () => {
    await saveConfigs(apiConfigs);
  };

  return (
    <div className="space-y-6">
      {/* Shopify Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <CardTitle>Shopify Integration</CardTitle>
          </div>
          <CardDescription>
            Configure Shopify API settings for order synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={apiConfigs.shopify.enabled}
              onCheckedChange={(checked) =>
                setApiConfigs(prev => ({
                  ...prev,
                  shopify: { ...prev.shopify, enabled: checked }
                }))
              }
            />
            <Label>Enable Shopify Integration</Label>
          </div>

          {apiConfigs.shopify.enabled && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="shopify-shop-url">Shop URL</Label>
                <Input
                  id="shopify-shop-url"
                  placeholder="your-shop-name.myshopify.com"
                  value={apiConfigs.shopify.shop_url}
                  onChange={(e) =>
                    setApiConfigs(prev => ({
                      ...prev,
                      shopify: { ...prev.shopify, shop_url: e.target.value }
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="shopify-access-token">Access Token</Label>
                <Input
                  id="shopify-access-token"
                  type="password"
                  placeholder="Enter Shopify access token"
                  value={apiConfigs.shopify.access_token}
                  onChange={(e) =>
                    setApiConfigs(prev => ({
                      ...prev,
                      shopify: { ...prev.shopify, access_token: e.target.value }
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="shopify-webhook-secret">Webhook Secret</Label>
                <Input
                  id="shopify-webhook-secret"
                  type="password"
                  placeholder="Enter Shopify webhook secret"
                  value={apiConfigs.shopify.webhook_secret}
                  onChange={(e) =>
                    setApiConfigs(prev => ({
                      ...prev,
                      shopify: { ...prev.shopify, webhook_secret: e.target.value }
                    }))
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>WhatsApp Integration</CardTitle>
          </div>
          <CardDescription>
            Configure WhatsApp API settings for customer communication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={apiConfigs.whatsapp.enabled}
              onCheckedChange={(checked) =>
                setApiConfigs(prev => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, enabled: checked }
                }))
              }
            />
            <Label>Enable WhatsApp Integration</Label>
          </div>

          {apiConfigs.whatsapp.enabled && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="whatsapp-phone-number-id">Phone Number ID</Label>
                <Input
                  id="whatsapp-phone-number-id"
                  placeholder="Enter WhatsApp Phone Number ID"
                  value={apiConfigs.whatsapp.phone_number_id}
                  onChange={(e) =>
                    setApiConfigs(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, phone_number_id: e.target.value }
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="whatsapp-access-token">Access Token</Label>
                <Input
                  id="whatsapp-access-token"
                  type="password"
                  placeholder="Enter WhatsApp access token"
                  value={apiConfigs.whatsapp.access_token}
                  onChange={(e) =>
                    setApiConfigs(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, access_token: e.target.value }
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="whatsapp-verify-token">Verify Token</Label>
                <Input
                  id="whatsapp-verify-token"
                  type="password"
                  placeholder="Enter WhatsApp verify token"
                  value={apiConfigs.whatsapp.verify_token}
                  onChange={(e) =>
                    setApiConfigs(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, verify_token: e.target.value }
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="whatsapp-app-secret">App Secret</Label>
                <Input
                  id="whatsapp-app-secret"
                  type="password"
                  placeholder="Enter WhatsApp app secret"
                  value={apiConfigs.whatsapp.app_secret}
                  onChange={(e) =>
                    setApiConfigs(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, app_secret: e.target.value }
                    }))
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WATI Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>WATI (WhatsApp API)</CardTitle>
          </div>
          <CardDescription>
            Configure WATI for sending WhatsApp notifications to customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={apiConfigs.wati.enabled}
              onCheckedChange={(checked) =>
                setApiConfigs(prev => ({
                  ...prev,
                  wati: { ...prev.wati, enabled: checked }
                }))
              }
            />
            <Label>Enable WATI Integration</Label>
          </div>

          {apiConfigs.wati.enabled && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="wati-api-key">API Key</Label>
                <Input
                  id="wati-api-key"
                  type="password"
                  placeholder="Enter WATI API key"
                  value={apiConfigs.wati.api_key}
                  onChange={(e) =>
                    setApiConfigs(prev => ({
                      ...prev,
                      wati: { ...prev.wati, api_key: e.target.value }
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="wati-base-url">Base URL</Label>
                <Input
                  id="wati-base-url"
                  placeholder="https://live-server-6371.wati.io"
                  value={apiConfigs.wati.base_url}
                  onChange={(e) =>
                    setApiConfigs(prev => ({
                      ...prev,
                      wati: { ...prev.wati, base_url: e.target.value }
                    }))
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Find your base URL in your WATI dashboard
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Partners */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Truck className="h-5 w-5" />
            <CardTitle>Delivery Partners</CardTitle>
          </div>
          <CardDescription>
            Configure delivery partner API settings for shipment tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* French Express Configuration */}
          <div className="space-y-4 border p-4 rounded-md">
            <h4 className="text-sm font-medium">French Express</h4>
            <div className="flex items-center space-x-2">
              <Switch
                checked={apiConfigs.delivery.frenchexpress.enabled}
                onCheckedChange={(checked) =>
                  setApiConfigs(prev => ({
                    ...prev,
                    delivery: {
                      ...prev.delivery,
                      frenchexpress: { ...prev.delivery.frenchexpress, enabled: checked }
                    }
                  }))
                }
              />
              <Label>Enable French Express</Label>
            </div>

            {apiConfigs.delivery.frenchexpress.enabled && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="french-express-api-key">API Key</Label>
                  <Input
                    id="french-express-api-key"
                    type="password"
                    placeholder="Enter French Express API key"
                    value={apiConfigs.delivery.frenchexpress.api_key}
                    onChange={(e) =>
                      setApiConfigs(prev => ({
                        ...prev,
                        delivery: {
                          ...prev.delivery,
                          frenchexpress: { ...prev.delivery.frenchexpress, api_key: e.target.value }
                        }
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="french-express-secret-key">Secret Key</Label>
                  <Input
                    id="french-express-secret-key"
                    type="password"
                    placeholder="Enter French Express secret key"
                    value={apiConfigs.delivery.frenchexpress.secret_key}
                    onChange={(e) =>
                      setApiConfigs(prev => ({
                        ...prev,
                        delivery: {
                          ...prev.delivery,
                          frenchexpress: { ...prev.delivery.frenchexpress, secret_key: e.target.value }
                        }
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Delhivery Configuration */}
          <div className="space-y-4 border p-4 rounded-md">
            <h4 className="text-sm font-medium">Delhivery</h4>
            <div className="flex items-center space-x-2">
              <Switch
                checked={apiConfigs.delivery.delhivery.enabled}
                onCheckedChange={(checked) =>
                  setApiConfigs(prev => ({
                    ...prev,
                    delivery: {
                      ...prev.delivery,
                      delhivery: { ...prev.delivery.delhivery, enabled: checked }
                    }
                  }))
                }
              />
              <Label>Enable Delhivery</Label>
            </div>

            {apiConfigs.delivery.delhivery.enabled && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="delhivery-api-key">API Key</Label>
                  <Input
                    id="delhivery-api-key"
                    type="password"
                    placeholder="Enter Delhivery API key"
                    value={apiConfigs.delivery.delhivery.api_key}
                    onChange={(e) =>
                      setApiConfigs(prev => ({
                        ...prev,
                        delivery: {
                          ...prev.delivery,
                          delhivery: { ...prev.delivery.delhivery, api_key: e.target.value }
                        }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={apiConfigs.delivery.delhivery.staging_mode}
                    onCheckedChange={(checked) =>
                      setApiConfigs(prev => ({
                        ...prev,
                        delivery: {
                          ...prev.delivery,
                          delhivery: { ...prev.delivery.delhivery, staging_mode: checked }
                        }
                      }))
                    }
                  />
                  <Label>Staging Mode</Label>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="min-w-[120px]"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};

export default ApiConfiguration;
