
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import ProductSearchSelect from './ProductSearchSelect';
import { extractUniqueColors, extractUniqueSizes, getColorsForProduct, getSizesForProduct, parseVariationInfo } from '@/utils/variationUtils';

interface PrintingFiltersProps {
  orders: any[];
  onFilterChange: (filteredOrders: any[]) => void;
}

const PrintingFilters = ({ orders, onFilterChange }: PrintingFiltersProps) => {
  const [filters, setFilters] = useState({
    filterType: 'contains',
    product: 'all',
    color: 'all',
    size: 'all',
    variation: 'all', // Keep this for backward compatibility
    orderDate: '',
    sortOrder: 'newest'
  });

  // Extract unique products, colors, and sizes from orders
  const { uniqueProducts, uniqueColors, uniqueSizes, productSpecificColors, productSpecificSizes, filteredVariations } = useMemo(() => {
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

    // Get all unique colors and sizes
    const allColors = extractUniqueColors(orders);
    const allSizes = extractUniqueSizes(orders);

    // Get colors and sizes for selected product
    const productColors = filters.product !== 'all' ? getColorsForProduct(orders, filters.product) : allColors;
    const productSizes = filters.product !== 'all' ? getSizesForProduct(orders, filters.product) : allSizes;

    // Get variations for selected product (for backward compatibility)
    const productSpecificVariations: string[] = filters.product !== 'all' && productVariationsMap.has(filters.product)
      ? Array.from(productVariationsMap.get(filters.product) || new Set<string>())
      : Array.from(allVariations);

    return {
      uniqueProducts: Array.from(products),
      uniqueColors: allColors,
      uniqueSizes: allSizes,
      productSpecificColors: productColors,
      productSpecificSizes: productSizes,
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
          const hasProduct = order.line_items.some((item: any) => 
            (item.title || item.name) === filters.product
          );
          return hasProduct;
        } else { // only_has
          const onlyHasProduct = order.line_items.every((item: any) => 
            (item.title || item.name) === filters.product
          );
          return onlyHasProduct;
        }
      });
      console.log('After product filter:', filtered.length);
    }

    // Apply color filter
    if (filters.color !== 'all') {
      console.log('Filtering by color:', filters.color);
      filtered = filtered.filter(order => {
        if (!order.line_items || !Array.isArray(order.line_items)) return false;
        const hasColor = order.line_items.some((item: any) => {
          if (item.variant_title) {
            const variationInfo = parseVariationInfo(item.variant_title);
            return variationInfo.color === filters.color;
          }
          return false;
        });
        return hasColor;
      });
      console.log('After color filter:', filtered.length);
    }

    // Apply size filter
    if (filters.size !== 'all') {
      console.log('Filtering by size:', filters.size);
      filtered = filtered.filter(order => {
        if (!order.line_items || !Array.isArray(order.line_items)) return false;
        const hasSize = order.line_items.some((item: any) => {
          if (item.variant_title) {
            const variationInfo = parseVariationInfo(item.variant_title);
            return variationInfo.size === filters.size;
          }
          return false;
        });
        return hasSize;
      });
      console.log('After size filter:', filtered.length);
    }

    // Apply variation filter (for backward compatibility)
    if (filters.variation !== 'all') {
      console.log('Filtering by variation:', filters.variation);
      filtered = filtered.filter(order => {
        if (!order.line_items || !Array.isArray(order.line_items)) return false;
        const hasVariation = order.line_items.some((item: any) => 
          item.variant_title === filters.variation
        );
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

    // Apply sorting (by numeric order_number)
    filtered.sort((a, b) => {
      const an = parseInt(String(a.order_number || a.name || '').replace(/\D/g, ''), 10) || 0;
      const bn = parseInt(String(b.order_number || b.name || '').replace(/\D/g, ''), 10) || 0;
      return filters.sortOrder === 'newest' ? bn - an : an - bn;
    });

    console.log('Final filtered orders:', filtered.length);
    onFilterChange(filtered);
  };

  const clearFilters = () => {
    const clearedFilters = {
      filterType: 'contains',
      product: 'all',
      color: 'all',
      size: 'all',
      variation: 'all',
      orderDate: '',
      sortOrder: 'newest'
    };
    setFilters(clearedFilters);
    // Apply cleared filters immediately
    let filtered = [...orders];
    filtered.sort((a, b) => {
      const an = parseInt(String(a.order_number || a.name || '').replace(/\D/g, ''), 10) || 0;
      const bn = parseInt(String(b.order_number || b.name || '').replace(/\D/g, ''), 10) || 0;
      return bn - an;
    });
    onFilterChange(filtered);
  };

  // Reset color, size, and variation when product changes
  useEffect(() => {
    if (filters.product !== 'all') {
      const shouldResetColor = filters.color !== 'all' && !productSpecificColors.includes(filters.color);
      const shouldResetSize = filters.size !== 'all' && !productSpecificSizes.includes(filters.size);
      const shouldResetVariation = filters.variation !== 'all' && !filteredVariations.includes(filters.variation);
      
      if (shouldResetColor || shouldResetSize || shouldResetVariation) {
        setFilters(prev => ({ 
          ...prev, 
          color: shouldResetColor ? 'all' : prev.color,
          size: shouldResetSize ? 'all' : prev.size,
          variation: shouldResetVariation ? 'all' : prev.variation
        }));
      }
    }
  }, [filters.product, productSpecificColors, productSpecificSizes, filteredVariations, filters.color, filters.size, filters.variation]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
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

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Color</label>
          <Select
            value={filters.color}
            onValueChange={(value) => setFilters({ ...filters, color: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any color</SelectItem>
              {productSpecificColors.map(color => (
                <SelectItem key={color} value={color}>
                  {color}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Size</label>
          <Select
            value={filters.size}
            onValueChange={(value) => setFilters({ ...filters, size: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any size</SelectItem>
              {productSpecificSizes.map(size => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              <SelectItem value="newest">Order # (High to Low)</SelectItem>
              <SelectItem value="oldest">Order # (Low to High)</SelectItem>
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
