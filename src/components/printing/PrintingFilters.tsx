import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
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

  const applyFilters = () => {
    let filtered = [...orders];

    // Apply filters based on current filter state
    if (filters.filterType !== 'all') {
      // Add filter type logic here
    }

    if (filters.product !== 'all') {
      // Add product filter logic here
    }

    if (filters.variation !== 'all') {
      // Add variation filter logic here
    }

    if (filters.orderDate) {
      const filterDate = new Date(filters.orderDate);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.toDateString() === filterDate.toDateString();
      });
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
            <SelectValue placeholder="Contains Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="contains">Contains Product</SelectItem>
            <SelectItem value="exact">Exact Match</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Select Product</label>
        <Select
          value={filters.product}
          onValueChange={(value) => setFilters({ ...filters, product: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="headphones">Wireless Bluetooth Headphones</SelectItem>
            <SelectItem value="phone-case">Phone Case</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Product Variation</label>
        <Select
          value={filters.variation}
          onValueChange={(value) => setFilters({ ...filters, variation: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose variation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Variations</SelectItem>
            <SelectItem value="black">Black</SelectItem>
            <SelectItem value="iphone-14-pro">iPhone 14 Pro</SelectItem>
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
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrintingFilters;
