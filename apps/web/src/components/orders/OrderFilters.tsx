import { useState } from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { X } from 'lucide-react';

interface OrderFiltersProps {
  filters: {
    status: string;
    priority: string;
    customerId: string;
    dateFrom: string;
    dateTo: string;
  };
  onChange: (filters: OrderFiltersProps['filters']) => void;
}

export function OrderFilters({ filters, onChange }: OrderFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof OrderFiltersProps['filters'], value: string) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onChange({
      status: '',
      priority: '',
      customerId: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
      </Button>

      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}

      {isExpanded && (
        <div className="flex items-center gap-4 p-4 bg-white border rounded-lg shadow-sm">
          {/* Status Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Status</label>
            <Select
              value={filters.status}
              onValueChange={(value) => updateFilter('status', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_production">In Production</SelectItem>
                <SelectItem value="quality_check">Quality Check</SelectItem>
                <SelectItem value="shipping">Shipping</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Priority</label>
            <Select
              value={filters.priority}
              onValueChange={(value) => updateFilter('priority', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2">
          {filters.status && (
            <Badge variant="secondary" className="text-xs">
              Status: {filters.status}
            </Badge>
          )}
          {filters.priority && (
            <Badge variant="secondary" className="text-xs">
              Priority: {filters.priority}
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="secondary" className="text-xs">
              From: {filters.dateFrom}
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="text-xs">
              To: {filters.dateTo}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
