
import React, { useState, useEffect } from 'react';
import { X, Calendar, Package, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Order } from '@/types/database';

interface PrintingFiltersProps {
  orders: Order[];
  onFilterChange: (filteredOrders: Order[]) => void;
}

const PrintingFilters = ({ orders, onFilterChange }: PrintingFiltersProps) => {
  const [filters, setFilters] = useState({
    stage: 'all',
    dateRange: 'all',
    customer: 'all'
  });

  const applyFilters = () => {
    let filtered = [...orders];

    // Filter by stage
    if (filters.stage !== 'all') {
      filtered = filtered.filter(order => order.stage === filters.stage);
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(order => 
            new Date(order.created_at) >= filterDate
          );
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(order => 
            new Date(order.created_at) >= filterDate
          );
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(order => 
            new Date(order.created_at) >= filterDate
          );
          break;
      }
    }

    onFilterChange(filtered);
  };

  const clearFilters = () => {
    setFilters({
      stage: 'all',
      dateRange: 'all',
      customer: 'all'
    });
  };

  useEffect(() => {
    applyFilters();
  }, [filters]);

  const activeFiltersCount = Object.values(filters).filter(value => value !== 'all').length;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Package className="h-4 w-4" />
              <span>Order Stage</span>
            </label>
            <Select
              value={filters.stage}
              onValueChange={(value) => setFilters({ ...filters, stage: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="printing">Printing</SelectItem>
                <SelectItem value="packing">Packing</SelectItem>
                <SelectItem value="tracking">Tracking</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Date Range</span>
            </label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters({ ...filters, dateRange: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>Priority</span>
            </label>
            <Select
              value={filters.customer}
              onValueChange={(value) => setFilters({ ...filters, customer: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="urgent">Urgent (24h+)</SelectItem>
                <SelectItem value="recent">Recent (Today)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrintingFilters;
