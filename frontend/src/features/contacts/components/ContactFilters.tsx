import React from 'react';
import {
  Download,
  LayoutList,
  LayoutGrid,
  FilterX,
  Users,
  Building,
  HeartHandshake,
  BookUser,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SearchInput } from '../../../components/ui/SearchInput';
import { SelectField } from '../../../components/ui/SelectField';
import type { ContactCategory, ContactFilterState } from '../types/contacts.types';

interface ContactFiltersProps {
  filters: ContactFilterState;
  onFilterChange: (newFilters: Partial<ContactFilterState>) => void;
  onResetFilters: () => void;
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  onExport: () => void;
  departmentOptions: { label: string; value: string }[];
  designationOptions: { label: string; value: string }[];
  locationOptions: { label: string; value: string }[];
  totalFiltered: number;
}

export const ContactFilters: React.FC<ContactFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  viewMode,
  onViewModeChange,
  onExport,
  departmentOptions,
  designationOptions,
  locationOptions,
  totalFiltered: _totalFiltered,
}) => {
  const isFiltered =
    filters.search ||
    filters.department !== 'ALL' ||
    filters.designation !== 'ALL' ||
    filters.location !== 'ALL' ||
    filters.status !== 'ALL';

  const categoryTabs: { id: ContactCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'ALL', label: 'All Contacts', icon: BookUser },
    { id: 'EMPLOYEES', label: 'Employees', icon: Users },
    { id: 'EMERGENCY', label: 'Emergency Contacts', icon: HeartHandshake },
    { id: 'ORGANIZATION', label: 'Organization Offices', icon: Building },
  ];

  return (
    <div className="space-y-4">
      {/* Category Pills and Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categoryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = filters.category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilterChange({ category: tab.id })}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all select-none cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* View Mode & Export Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View Toggle */}
          <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Table view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Card Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-8 gap-1.5 text-xs shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Search & Filter Dropdown Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="lg:col-span-4">
          <SearchInput
            placeholder="Search by name, ID, email, phone, title..."
            value={filters.search}
            onChange={(val) => onFilterChange({ search: val })}
            onClear={() => onFilterChange({ search: '' })}
            className="h-9"
          />
        </div>

        {/* Department Filter */}
        <div className="lg:col-span-2">
          <SelectField
            placeholder="Department"
            value={filters.department}
            onChange={(e) => onFilterChange({ department: e.target.value })}
            options={departmentOptions}
            className="h-9"
          />
        </div>

        {/* Designation Filter */}
        <div className="lg:col-span-2">
          <SelectField
            placeholder="Designation"
            value={filters.designation}
            onChange={(e) => onFilterChange({ designation: e.target.value })}
            options={designationOptions}
            className="h-9"
          />
        </div>

        {/* Location Filter */}
        <div className="lg:col-span-2">
          <SelectField
            placeholder="Location"
            value={filters.location}
            onChange={(e) => onFilterChange({ location: e.target.value })}
            options={locationOptions}
            className="h-9"
          />
        </div>

        {/* Status Filter */}
        <div className="lg:col-span-2 flex items-center gap-2">
          <div className="flex-1">
            <SelectField
              placeholder="Status"
              value={filters.status}
              onChange={(e) => onFilterChange({ status: e.target.value })}
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'Active', value: 'ACTIVE' },
                { label: 'On Leave', value: 'ON_LEAVE' },
                { label: 'Probation', value: 'PROBATION' },
                { label: 'Inactive', value: 'INACTIVE' },
              ]}
              className="h-9"
            />
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-700 transition-colors"
              title="Reset all filters"
            >
              <FilterX className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
