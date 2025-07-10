
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface PrintingFiltersProps {
  orders: any[];
  onFilterChange: (filteredOrders: any[]) => void;
}

const PrintingFilters = ({ orders, onFilterChange }: PrintingFiltersProps) => {
  const [filters, setFilters] = useState({
    filterType: 'all',
    product: 'all',
    variation: 'all',
    orderDate: ''
  });

  // Extract unique products and variations from real Shopify orders
  const { uniqueProducts, uniqueVariations } = useMemo(() => {
    const products = new Set<string>();
    const variations = new Set<string>();

    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach((item: any) => {
          if (item.title || item.name) {
            products.add(item.title || item.name);
          }
          if (item.variant_title) {
            variations.add(item.variant_title);
          }
        });
      }
    });

    return {
      uniqueProducts: Array.from(products),
      uniqueVariations: Array.from(variations)
    };
  }, [orders]);

  const applyFilters = () => {
    let filtered = [...orders];

    // Apply product filter with "contains" logic
    if (filters.product !== 'all') {
      filtered = filtered.filter(order => {
        if (!order.line_items) return false;
        // Check if ANY item in the order contains the selected product
        return order.line_items.some((item: any) => 
          (item.title || item.name) === filters.product
        );
      });
    }

    // Apply variation filter with "contains" logic
    if (filters.variation !== 'all') {
      filtered = filtered.filter(order => {
        if (!order.line_items) return false;
        // Check if ANY item in the order has the selected variation
        return order.line_items.some((item: any) => 
          item.variant_title === filters.variation
        );
      });
    }

    // Apply date filter
    if (filters.orderDate) {
      const filterDate = new Date(filters.orderDate);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.toDateString() === filterDate.toDateString();
      });
    }

    // Apply filter type (priority/urgency filters)
    if (filters.filterType === 'urgent') {
      filtered = filtered.filter(order => {
        const createdDate = new Date(order.created_at);
        const hoursSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
        return hoursSinceCreated > 24;
      });
    } else if (filters.filterType === 'today') {
      const today = new Date().toDateString();
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.toDateString() === today;
      });
    } else if (filters.filterType === 'contains') {
      // This is handled by the product filter above
    }

    onFilterChange(filtered);
  };

  const clearFilters = () => {
    setFilters({
      filterType: 'all',
      product: 'all',
      variation: 'all',
      orderDate: ''
    });
  };

  useEffect(() => {
    applyFilters();
  }, [filters, orders]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Filter Type</label>
        <Select
          value={filters.filterType}
          onValueChange={(value) => setFilters({ ...filters, filterType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Orders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="urgent">Urgent Orders (24h+)</SelectItem>
            <SelectItem value="today">Today's Orders</SelectItem>
            <SelectItem value="contains">Contains Product</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Contains Product</label>
        <Select
          value={filters.product}
          onValueChange={(value) => setFilters({ ...filters, product: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Product</SelectItem>
            {uniqueProducts.map(product => (
              <SelectItem key={product} value={product}>{product}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Only Has Variation</label>
        <Select
          value={filters.variation}
          onValueChange={(value) => setFilters({ ...filters, variation: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any variation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Variation</SelectItem>
            {uniqueVariations.map(variation => (
              <SelectItem key={variation} value={variation}>{variation}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Order Date</label>
        <div className="flex space-x-2">
          <Input
            type="date"
            value={filters.orderDate}
            onChange={(e) => setFilters({ ...filters, orderDate: e.target.value })}
            placeholder="dd-mm-yyyy"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="whitespace-nowrap"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrintingFilters;
