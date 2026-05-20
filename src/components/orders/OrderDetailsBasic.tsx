
import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, User, MapPin, CreditCard, Calendar, Pencil } from 'lucide-react';

interface OrderDetailsBasicProps {
  open: boolean;
  onClose: () => void;
  order: any;
  canEditShippingAddress?: boolean;
  onSaveShippingAddress?: (address: {
    address1: string;
    address2: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  }) => Promise<void>;
}

const OrderDetailsBasic = ({
  open,
  onClose,
  order,
  canEditShippingAddress = false,
  onSaveShippingAddress,
}: OrderDetailsBasicProps) => {
  if (!order) return null;

  const displayAddress = useMemo(() => {
    const shippingAddress = order.shipping_address || {};
    return {
      name:
        shippingAddress.name ||
        order.customer_name ||
        `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() ||
        'Guest',
      address1: shippingAddress.address1 || shippingAddress.address_line_1 || '',
      address2: shippingAddress.address2 || shippingAddress.address_line_2 || '',
      city: shippingAddress.city || '',
      province: shippingAddress.province || shippingAddress.state || '',
      zip: shippingAddress.zip || shippingAddress.postal_code || '',
      country: shippingAddress.country || 'India',
      phone: shippingAddress.phone || order.customer_phone || order.customer?.phone || '',
    };
  }, [order]);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState(displayAddress);

  useEffect(() => {
    setAddressForm(displayAddress);
    setIsEditingAddress(false);
    setIsSavingAddress(false);
  }, [displayAddress, open]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'unfulfilled':
        return 'bg-orange-100 text-orange-800';
      case 'fulfilled':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddressInputChange =
    (field: keyof typeof addressForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setAddressForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSaveAddress = async () => {
    if (!onSaveShippingAddress || isSavingAddress) return;

    setIsSavingAddress(true);
    try {
      await onSaveShippingAddress({
        address1: addressForm.address1,
        address2: addressForm.address2,
        city: addressForm.city,
        province: addressForm.province,
        zip: addressForm.zip,
        country: addressForm.country,
      });
      setIsEditingAddress(false);
    } finally {
      setIsSavingAddress(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Order Details - {order.order_number}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Order Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="font-medium">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={getStatusColor(order.fulfillment_status)}>
                    {order.fulfillment_status || 'N/A'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Financial Status</p>
                  <Badge className={getStatusColor(order.financial_status)}>
                    {order.financial_status || 'N/A'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-medium">{order.currency} {order.total_amount}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Order Date: {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{order.customer_name || 'N/A'}</p>
                {order.customer_email && (
                  <p className="text-sm text-gray-600">{order.customer_email}</p>
                )}
                {order.customer_phone && (
                  <p className="text-sm text-gray-600">{order.customer_phone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.shipping_address && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>Shipping Address</span>
                  </CardTitle>
                  {canEditShippingAddress && onSaveShippingAddress && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddressForm(displayAddress);
                        setIsEditingAddress((prev) => !prev);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {isEditingAddress ? 'Cancel' : 'Edit'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingAddress ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shipping-address-1">Address Line 1</Label>
                      <Input
                        id="shipping-address-1"
                        value={addressForm.address1}
                        onChange={handleAddressInputChange('address1')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipping-address-2">Address Line 2</Label>
                      <Input
                        id="shipping-address-2"
                        value={addressForm.address2}
                        onChange={handleAddressInputChange('address2')}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="shipping-city">City</Label>
                        <Input
                          id="shipping-city"
                          value={addressForm.city}
                          onChange={handleAddressInputChange('city')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shipping-state">State</Label>
                        <Input
                          id="shipping-state"
                          value={addressForm.province}
                          onChange={handleAddressInputChange('province')}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="shipping-zip">Postal Code</Label>
                        <Input
                          id="shipping-zip"
                          value={addressForm.zip}
                          onChange={handleAddressInputChange('zip')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shipping-country">Country</Label>
                        <Input
                          id="shipping-country"
                          value={addressForm.country}
                          onChange={handleAddressInputChange('country')}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setAddressForm(displayAddress);
                          setIsEditingAddress(false);
                        }}
                        disabled={isSavingAddress}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleSaveAddress()}
                        disabled={
                          isSavingAddress ||
                          !addressForm.address1.trim() ||
                          !addressForm.city.trim() ||
                          !addressForm.country.trim()
                        }
                      >
                        {isSavingAddress ? 'Saving...' : 'Save Address'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p>{displayAddress.name}</p>
                    <p>{displayAddress.address1}</p>
                    {displayAddress.address2 && <p>{displayAddress.address2}</p>}
                    <p>
                      {displayAddress.city}, {displayAddress.province} {displayAddress.zip}
                    </p>
                    <p>{displayAddress.country}</p>
                    {displayAddress.phone && (
                      <p className="text-sm text-gray-600">Phone: {displayAddress.phone}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          {order.line_items && order.line_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Order Items</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.line_items.map((item: any, index: number) => (
                    <div key={index}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          {item.variant_title && (
                            <p className="text-sm text-gray-600">{item.variant_title}</p>
                          )}
                          {item.sku && (
                            <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Qty: {item.quantity}</p>
                          <p className="text-sm text-gray-600">
                            {order.currency} {item.price} each
                          </p>
                          <p className="font-medium">
                            {order.currency} {(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {index < order.line_items.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsBasic;
