
import React from 'react';
import { Settings as SettingsIcon, Bell, Shield, Globe, Printer, PackageX, Store } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFromAddress } from '@/hooks/useFromAddress';
import { useWorkflowSettings } from '@/hooks/useWorkflowSettings';

const SystemConfiguration = () => {
  const { toast } = useToast();
  const { fromAddress, setFromAddress, save: saveFromAddress, saving: savingFromAddress, loading: loadingFromAddress } = useFromAddress();
  const {
    settings: workflowSettings,
    setSettings: setWorkflowSettings,
    save: saveWorkflowSettings,
    loading: loadingWorkflowSettings,
    saving: savingWorkflowSettings,
  } = useWorkflowSettings();

  return (
    <div className="space-y-6">

      {/* ── Store / From Address ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Store className="h-5 w-5 text-indigo-600" />
            <CardTitle>Store / From Address</CardTitle>
          </div>
          <CardDescription>
            This address appears as the sender on all shipping labels and packing slips
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingFromAddress ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-9 bg-gray-100 animate-pulse rounded" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Store / Business Name *</Label>
                  <Input
                    placeholder="e.g. Black Lovers"
                    value={fromAddress.store_name}
                    onChange={e => setFromAddress(p => ({ ...p, store_name: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Address Line 1</Label>
                  <Input
                    placeholder="Street address, building no."
                    value={fromAddress.address1}
                    onChange={e => setFromAddress(p => ({ ...p, address1: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Address Line 2</Label>
                  <Input
                    placeholder="Area, landmark (optional)"
                    value={fromAddress.address2}
                    onChange={e => setFromAddress(p => ({ ...p, address2: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    placeholder="City"
                    value={fromAddress.city}
                    onChange={e => setFromAddress(p => ({ ...p, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input
                    placeholder="State"
                    value={fromAddress.state}
                    onChange={e => setFromAddress(p => ({ ...p, state: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>PIN / ZIP Code</Label>
                  <Input
                    placeholder="PIN Code"
                    value={fromAddress.zip}
                    onChange={e => setFromAddress(p => ({ ...p, zip: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input
                    placeholder="Country"
                    value={fromAddress.country}
                    onChange={e => setFromAddress(p => ({ ...p, country: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone / WhatsApp</Label>
                  <Input
                    placeholder="e.g. 9876543210"
                    value={fromAddress.phone}
                    onChange={e => setFromAddress(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email (optional)</Label>
                  <Input
                    type="email"
                    placeholder="store@example.com"
                    value={fromAddress.email}
                    onChange={e => setFromAddress(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                onClick={() => saveFromAddress(fromAddress)}
                disabled={savingFromAddress || !fromAddress.store_name.trim()}
                className="mt-2"
              >
                {savingFromAddress ? 'Saving…' : 'Save Store Address'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Label Template ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Printer className="h-5 w-5 text-blue-600" />
            <CardTitle>Shipping Label Template</CardTitle>
          </div>
          <CardDescription>
            Choose the default label template used when printing orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="label-template">Default Template</Label>
            <Select
              value={workflowSettings.labelTemplate}
              onValueChange={(value) =>
                setWorkflowSettings((prev) => ({ ...prev, labelTemplate: value }))
              }
              disabled={loadingWorkflowSettings}
            >
              <SelectTrigger id="label-template" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thermal-4x6">4×6 Thermal Label</SelectItem>
                <SelectItem value="a5-packing-slip">A5 Packing Slip</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This will be pre-selected every time you open the print dialog.
            </p>
            <Button
              onClick={() => saveWorkflowSettings(workflowSettings)}
              disabled={loadingWorkflowSettings || savingWorkflowSettings}
              className="mt-2"
            >
              {savingWorkflowSettings ? 'Saving...' : 'Save Label Settings'}
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* ── Bypass Packing Stage ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <PackageX className="h-5 w-5 text-orange-500" />
            <CardTitle>Workflow Settings</CardTitle>
          </div>
          <CardDescription>
            Control how orders move through the fulfillment pipeline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Bypass Packing Stage</Label>
              <p className="text-sm text-muted-foreground">
                After printing, orders skip Packing and go directly to Tracking
              </p>
            </div>
            <Switch
              checked={workflowSettings.bypassPacking}
              onCheckedChange={(checked) =>
                setWorkflowSettings((prev) => ({ ...prev, bypassPacking: checked }))
              }
              disabled={loadingWorkflowSettings}
            />
          </div>
          <Button
            onClick={() => saveWorkflowSettings(workflowSettings)}
            disabled={loadingWorkflowSettings || savingWorkflowSettings}
            className="mt-2"
          >
            {savingWorkflowSettings ? 'Saving...' : 'Save Workflow Settings'}
          </Button>
          {workflowSettings.bypassPacking ? (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              <span className="font-semibold">⚠ Bypass is ON</span> — Printed orders will move directly to Tracking, skipping Packing.
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
              <span className="font-semibold">Bypass is OFF</span> — Orders go through Packing stage before Tracking (default).
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Configure how you receive alerts and updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive order updates via email</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Urgent Order Alerts</Label>
              <p className="text-sm text-muted-foreground">Get notified of orders over 48h old</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Daily Summary</Label>
              <p className="text-sm text-muted-foreground">Receive daily performance reports</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-green-600" />
            <CardTitle>Regional Settings</CardTitle>
          </div>
          <CardDescription>
            Configure timezone, currency, and regional preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select defaultValue="asia/kolkata">
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asia/kolkata">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="america/new_york">America/New_York (EST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Select defaultValue="inr">
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inr">Indian Rupee (₹)</SelectItem>
                  <SelectItem value="usd">US Dollar ($)</SelectItem>
                  <SelectItem value="eur">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>
            Manage access control and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Add extra security to your account</p>
            </div>
            <Button variant="outline" size="sm">
              Enable 2FA
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Session Timeout</Label>
              <p className="text-sm text-muted-foreground">Auto logout after inactivity</p>
            </div>
            <Select defaultValue="4h">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="4h">4 hours</SelectItem>
                <SelectItem value="8h">8 hours</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="pt-4 border-t">
            <Button variant="outline" className="w-full">
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5 text-gray-600" />
            <CardTitle>Advanced Settings</CardTitle>
          </div>
          <CardDescription>
            System configuration and integration settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://your-app.com/webhook"
              type="url"
            />
            <p className="text-sm text-muted-foreground">
              Receive order updates via webhook
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Debug Mode</Label>
              <p className="text-sm text-muted-foreground">Enable detailed logging</p>
            </div>
            <Switch />
          </div>
          
          <div className="pt-4">
            <Button
              className="w-full"
              onClick={() => {
                toast({
                  title: 'Configuration Saved',
                  description: 'System settings have been saved successfully.',
                });
              }}
            >
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemConfiguration;
