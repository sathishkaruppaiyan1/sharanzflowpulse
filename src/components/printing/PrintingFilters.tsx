
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import ProductSearchSelect from './ProductSearchSelect';

interface PrintingFiltersProps {
  orders: any[];
  onFilterChange: (filteredOrders: any[]) => void;
}

const PrintingFilters = ({ orders, onFilterChange }: PrintingFiltersProps) => {
  const [filters, setFilters] = useState({
    filterType: 'contains',
    product: 'all',
    variation: 'all',
    orderDate: '',
    sortOrder: 'newest'
  });

  // Extract unique products and variations from real Shopify orders
  const { uniqueProducts, uniqueVariations, filteredVariations } = useMemo(() => {
    const products = new Set<string>();
    const allVariations = new Set<string>();
    const productVariationsMap = new Map<string, Set<string>>();

    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach((item: any) => {
          const productName = item.title || item.name;
          if (productName) {
            products.add(productName);
            
            if (item.variant_title) {
              allVariations.add(item.variant_title);
              
              // Map variations to products
              if (!productVariationsMap.has(productName)) {
                productVariationsMap.set(productName, new Set<string>());
              }
              productVariationsMap.get(productName)?.add(item.variant_title);
            }
          }
        });
      }
    });

    // Get variations for selected product
    const productSpecificVariations: string[] = filters.product !== 'all' && productVariationsMap.has(filters.product)
      ? Array.from(productVariationsMap.get(filters.product) || new Set<string>())
      : Array.from(allVariations);

    return {
      uniqueProducts: Array.from(products),
      uniqueVariations: Array.from(allVariations),
      filteredVariations: productSpecificVariations
    };
  }, [orders, filters.product]);

  const applyFilters = () => {
    console.log('Applying filters:', filters);
    let filtered = [...orders];

    // Apply product filter
    if (filters.product !== 'all') {
      console.log('Filtering by product:', filters.product);
      filtered = filtered.filter(order => {
        if (!order.line_items || !Array.isArray(order.line_items)) return false;
        
        if (filters.filterType === 'contains') {
          // Order contains this product (among possibly others)
          const hasProduct = order.line_items.some((item: any) => 
            (item.title || item.name) === filters.product
          );
          console.log(`Order ${order.id} contains product ${filters.product}:`, hasProduct);
          return hasProduct;
        } else { // only_has
          // Order ONLY has this product (no other products)
          const onlyHasProduct = order.line_items.every((item: any) => 
            (item.title || item.name) === filters.product
          );
          console.log(`Order ${order.id} only has product ${filters.product}:`, onlyHasProduct);
          return onlyHasProduct;
        }
      });
      console.log('After product filter:', filtered.length);
    }

    // Apply variation filter
    if (filters.variation !== 'all') {
      console.log('Filtering by variation:', filters.variation);
      filtered = filtered.filter(order => {
        if (!order.line_items || !Array.isArray(order.line_items)) return false;
        const hasVariation = order.line_items.some((item: any) => 
          item.variant_title === filters.variation
        );
        console.log(`Order ${order.id} has variation ${filters.variation}:`, hasVariation);
        return hasVariation;
      });
      console.log('After variation filter:', filtered.length);
    }

    // Apply date filter
    if (filters.orderDate) {
      console.log('Filtering by date:', filters.orderDate);
      const filterDate = new Date(filters.orderDate);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        const matches = orderDate.toDateString() === filterDate.toDateString();
        return matches;
      });
      console.log('After date filter:', filtered.length);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      
      if (filters.sortOrder === 'newest') {
        return dateB - dateA; // Newest first
      } else {
        return dateA - dateB; // Oldest first
      }
    });

    console.log('Final filtered orders:', filtered.length);
    onFilterChange(filtered);
  };

  const clearFilters = () => {
    const clearedFilters = {
      filterType: 'contains',
      product: 'all',
      variation: 'all',
      orderDate: '',
      sortOrder: 'newest'
    };
    setFilters(clearedFilters);
    // Apply cleared filters immediately
    let filtered = [...orders];
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Newest first (default)
    });
    onFilterChange(filtered);
  };

  // Reset variation when product changes
  useEffect(() => {
    if (filters.product !== 'all' && filters.variation !== 'all') {
      // Check if current variation is still valid for selected product
      if (!filteredVariations.includes(filters.variation)) {
        setFilters(prev => ({ ...prev, variation: 'all' }));
      }
    }
  }, [filters.product, filteredVariations, filters.variation]);

  // Initialize with all orders on mount
  useEffect(() => {
    if (orders.length > 0) {
      let filtered = [...orders];
      filtered.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // Newest first (default)
      });
      onFilterChange(filtered);
    }
  }, [orders]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
              <SelectItem value="contains">Contains Product</SelectItem>
              <SelectItem value="only_has">Only Has Product</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ProductSearchSelect
          products={uniqueProducts}
          value={filters.product}
          onValueChange={(value) => setFilters({ ...filters, product: value })}
          placeholder="Any product"
          label="Product"
        />

        <ProductSearchSelect
          products={filteredVariations}
          value={filters.variation}
          onValueChange={(value) => setFilters({ ...filters, variation: value })}
          placeholder="Any variation"
          label="Variation"
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Sort Order</label>
          <Select
            value={filters.sortOrder}
            onValueChange={(value) => setFilters({ ...filters, sortOrder: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Order Date</label>
          <Input
            type="date"
            value={filters.orderDate}
            onChange={(e) => setFilters({ ...filters, orderDate: e.target.value })}
            placeholder="dd-mm-yyyy"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Actions</label>
          <div className="flex space-x-2">
            <Button
              onClick={applyFilters}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Filter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintingFilters;
