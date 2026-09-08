import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Users,
  Globe,
  Edit2,
  Power,
  Filter,
  X,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  Compass,
  Building,
  ArrowUpDown,
  Plus,
} from 'lucide-react';
import { DataTable, type Column } from '../../../components/data-table/DataTable';
import { Button, Input, SelectField, StatusBadge, Tooltip, SearchInput } from '../../../components/ui';
import { PageHeader } from '../../../components/common/PageHeader';
import { Drawer } from '../../../components/overlay/Drawer';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { LocationItem } from '../types/organization.types';
import { cn } from '../../../utils/cn';

type ViewMode = 'cards' | 'table';
type ScopeFilter = 'ALL' | 'ACTIVE' | 'WITH_STAFF' | 'WITHOUT_STAFF' | 'INACTIVE';

const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

export function LocationsPage() {
  const toast = useToast();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [timezoneFilter, setTimezoneFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'city' | 'country' | 'staff'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    timezone: 'Asia/Kolkata',
    latitude: '' as any,
    longitude: '' as any,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetLoc, setTargetLoc] = useState<LocationItem | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      const data = await organizationApi.getLocations();
      setLocations(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingLoc(null);
    setFormData({
      name: '',
      address: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      timezone: 'Asia/Kolkata',
      latitude: '',
      longitude: '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (loc: LocationItem) => {
    setEditingLoc(loc);
    setFormData({
      name: loc.name,
      address: loc.address,
      addressLine2: loc.addressLine2 || '',
      city: loc.city,
      state: loc.state || '',
      postalCode: loc.postalCode || '',
      country: loc.country,
      timezone: loc.timezone || 'Asia/Kolkata',
      latitude: loc.latitude ?? '',
      longitude: loc.longitude ?? '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Location name is required';
    if (!formData.address.trim()) errors.address = 'Street address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.country.trim()) errors.country = 'Country is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    try {
      setIsSubmitting(true);
      const payload: Partial<LocationItem> = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        addressLine2: formData.addressLine2?.trim(),
        city: formData.city.trim(),
        state: formData.state?.trim(),
        postalCode: formData.postalCode?.trim(),
        country: formData.country.trim(),
        timezone: formData.timezone,
        latitude: formData.latitude !== '' ? Number(formData.latitude) : undefined,
        longitude: formData.longitude !== '' ? Number(formData.longitude) : undefined,
      };

      if (editingLoc) {
        await organizationApi.updateLocation(editingLoc._id, payload);
        toast.success('Location updated successfully');
      } else {
        await organizationApi.createLocation(payload);
        toast.success('Location added successfully');
      }
      setDrawerOpen(false);
      loadLocations();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!targetLoc) return;
    try {
      setIsToggling(true);
      const updated = await organizationApi.toggleLocationStatus(targetLoc._id);
      toast.success(`Location marked as ${updated.status.toLowerCase()}`);
      setDialogOpen(false);
      loadLocations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setIsToggling(false);
    }
  };

  // Metrics computation for top 5 color cards
  const metrics = useMemo(() => {
    const total = locations.length;
    const active = locations.filter((l) => l.status === 'ACTIVE').length;
    const countries = new Set(locations.map((l) => l.country.trim())).size;
    const totalStaff = locations.reduce((acc, l) => acc + (l.employeeCount || 0), 0);
    const timezones = new Set(locations.map((l) => l.timezone || 'UTC')).size;
    return { total, active, countries, totalStaff, timezones };
  }, [locations]);

  const metricCards = [
    {
      label: 'Total Locations',
      value: metrics.total,
      icon: MapPin,
      from: 'from-emerald-500',
      to: 'to-teal-600',
      ring: 'ring-emerald-500/20',
    },
    {
      label: 'Active Branches',
      value: metrics.active,
      icon: CheckCircle2,
      from: 'from-teal-500',
      to: 'to-emerald-600',
      ring: 'ring-teal-500/20',
    },
    {
      label: 'Countries Served',
      value: metrics.countries,
      icon: Globe,
      from: 'from-indigo-500',
      to: 'to-violet-600',
      ring: 'ring-indigo-500/20',
    },
    {
      label: 'Assigned Staff',
      value: metrics.totalStaff,
      icon: Users,
      from: 'from-sky-500',
      to: 'to-blue-600',
      ring: 'ring-sky-500/20',
    },
    {
      label: 'Timezones Covered',
      value: metrics.timezones,
      icon: Clock,
      from: 'from-amber-500',
      to: 'to-orange-500',
      ring: 'ring-amber-500/20',
    },
  ];

  // Distinct countries list for filter dropdown
  const uniqueCountries = useMemo(() => {
    const set = new Set(locations.map((l) => l.country).filter(Boolean));
    return Array.from(set).sort();
  }, [locations]);

  // Distinct timezones list for filter dropdown
  const uniqueTimezones = useMemo(() => {
    const set = new Set(locations.map((l) => l.timezone).filter(Boolean));
    return Array.from(set).sort();
  }, [locations]);

  // Filtered & Sorted Locations
  const filteredLocations = useMemo(() => {
    return locations
      .filter((loc) => {
        // Scope filter
        if (scopeFilter === 'ACTIVE' && loc.status !== 'ACTIVE') return false;
        if (scopeFilter === 'INACTIVE' && loc.status !== 'INACTIVE') return false;
        if (scopeFilter === 'WITH_STAFF' && (loc.employeeCount || 0) === 0) return false;
        if (scopeFilter === 'WITHOUT_STAFF' && (loc.employeeCount || 0) > 0) return false;

        // Country filter
        if (countryFilter !== 'ALL' && loc.country !== countryFilter) return false;

        // Timezone filter
        if (timezoneFilter !== 'ALL' && loc.timezone !== timezoneFilter) return false;

        // Search filter
        if (search.trim()) {
          const query = search.toLowerCase();
          const matchName = loc.name.toLowerCase().includes(query);
          const matchCity = loc.city.toLowerCase().includes(query);
          const matchState = loc.state?.toLowerCase().includes(query);
          const matchCountry = loc.country.toLowerCase().includes(query);
          const matchAddress = loc.address.toLowerCase().includes(query);
          if (!matchName && !matchCity && !matchState && !matchCountry && !matchAddress) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortBy === 'city') {
          diff = a.city.localeCompare(b.city);
        } else if (sortBy === 'country') {
          diff = a.country.localeCompare(b.country);
        } else if (sortBy === 'staff') {
          diff = (a.employeeCount || 0) - (b.employeeCount || 0);
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [locations, scopeFilter, countryFilter, timezoneFilter, search, sortBy, sortOrder]);

  const tableColumns: Column<LocationItem>[] = [
    {
      header: 'Location Name',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</span>
            <p className="text-xs text-slate-400 line-clamp-1">{row.address}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'City / Region',
      accessorKey: 'city',
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {row.city}
          {row.state ? `, ${row.state}` : ''}
        </span>
      ),
    },
    {
      header: 'Country',
      accessorKey: 'country',
      sortable: true,
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <Globe className="h-3 w-3 text-slate-400" />
          {row.country}
        </span>
      ),
    },
    {
      header: 'Timezone',
      accessorKey: 'timezone',
      sortable: true,
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400">
          <Clock className="h-3 w-3 text-slate-400" />
          {row.timezone || 'UTC'}
        </span>
      ),
    },
    {
      header: 'Assigned Staff',
      accessorKey: 'employeeCount',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span>{row.employeeCount || 0} employees</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Tooltip content="Edit Location" placement="top">
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Edit Location"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>

          <Tooltip
            content={row.status === 'ACTIVE' ? 'Deactivate Location' : 'Activate Location'}
            placement="top"
          >
            <button
              type="button"
              onClick={() => {
                setTargetLoc(row);
                setDialogOpen(true);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
                row.status === 'ACTIVE'
                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
              aria-label={row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            >
              <Power className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* 1. Page Header */}
      <PageHeader
        title="Office Locations & Regional Branches"
        description="Maintain global offices, regional branch hubs, timezones, and geographic coordinates."
        actions={
          <Button size="sm" onClick={handleOpenAdd} className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Location
          </Button>
        }
      />

      {/* 2. Top Metric Counters (Color Cards matching UserListPage pattern, zero shadows, rounded-md) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-3.5 flex items-center gap-3 ring-1 ${card.ring}`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${card.from} ${card.to} text-white`}
            >
              <card.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
                {card.value}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Rich Colorful Filter Panel Card (matching UserListPage pattern) */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 transition-all">
        {/* Top Quick Scope Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-emerald-500" />
              Scope:
            </span>
            {[
              { label: 'All Offices', value: 'ALL' },
              { label: 'Active Only', value: 'ACTIVE' },
              { label: 'With Staff', value: 'WITH_STAFF' },
              { label: 'Unstaffed', value: 'WITHOUT_STAFF' },
              { label: 'Inactive', value: 'INACTIVE' },
            ].map((pill) => {
              const isActive = scopeFilter === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setScopeFilter(pill.value as ScopeFilter)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer border select-none ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 border border-emerald-100 dark:border-emerald-900/40 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{locations.length} branches in registry</span>
            </div>

            {/* View Mode Switcher */}
            <div className="flex rounded-md border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  viewMode === 'cards'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                )}
                title="Cards View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                )}
                title="Table View"
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SearchInput
            label="Search Office Directory"
            value={search}
            onChange={(val) => setSearch(val)}
            onClear={() => setSearch('')}
            placeholder="Search by office name, city, state, country..."
          />

          <SelectField
            label="Country"
            placeholder="All Countries"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Countries' },
              ...uniqueCountries.map((c) => ({ value: c, label: c })),
            ]}
          />

          <SelectField
            label="Timezone"
            placeholder="All Timezones"
            value={timezoneFilter}
            onChange={(e) => setTimezoneFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Timezones' },
              ...uniqueTimezones.map((tz) => ({ value: tz, label: tz })),
            ]}
          />

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SelectField
                label="Sort Order"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                options={[
                  { value: 'name', label: 'Location Name' },
                  { value: 'city', label: 'City / Region' },
                  { value: 'country', label: 'Country' },
                  { value: 'staff', label: 'Assigned Staff' },
                ]}
              />
            </div>
            <div className="pt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="h-9 px-2.5"
                title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {(!!search || scopeFilter !== 'ALL' || countryFilter !== 'ALL' || timezoneFilter !== 'ALL') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Filters:
            </span>

            {search && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                Search: "{search}"
                <X
                  className="h-3 w-3 cursor-pointer hover:text-emerald-900 dark:hover:text-emerald-100"
                  onClick={() => setSearch('')}
                />
              </span>
            )}

            {scopeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                Scope: {scopeFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-emerald-900 dark:hover:text-emerald-100"
                  onClick={() => setScopeFilter('ALL')}
                />
              </span>
            )}

            {countryFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300">
                Country: {countryFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-indigo-900 dark:hover:text-indigo-100"
                  onClick={() => setCountryFilter('ALL')}
                />
              </span>
            )}

            {timezoneFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                Timezone: {timezoneFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-amber-900 dark:hover:text-amber-100"
                  onClick={() => setTimezoneFilter('ALL')}
                />
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setScopeFilter('ALL');
                setCountryFilter('ALL');
                setTimezoneFilter('ALL');
              }}
              className="text-[11px] font-medium text-slate-500 hover:text-rose-600 underline cursor-pointer ml-auto"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* 4. Main View: Cards Grid or Table View */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-52 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse p-5 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : viewMode === 'cards' ? (
        filteredLocations.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center bg-white dark:bg-slate-900">
            <MapPin className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              No locations found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No office branches match the current search or filter criteria.
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="mt-4">
              Add Location
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filteredLocations.map((loc) => (
              <div
                key={loc._id}
                className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 flex flex-col justify-between hover:border-emerald-500/40 transition-all group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                        <Building className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {loc.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {loc.city}
                          {loc.state ? `, ${loc.state}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge status={loc.status} />
                      <Tooltip content="Edit Location" placement="top">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(loc)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                          aria-label="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip
                        content={loc.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        placement="top"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setTargetLoc(loc);
                            setDialogOpen(true);
                          }}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            loc.status === 'ACTIVE'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                          aria-label="Toggle Status"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 p-2.5 mb-3 border border-slate-100 dark:border-slate-800 text-xs">
                    <p className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{loc.address}{loc.addressLine2 ? `, ${loc.addressLine2}` : ''}</span>
                    </p>
                    <p className="text-slate-400 text-[11px] ml-5 mt-0.5">
                      {loc.postalCode ? `${loc.postalCode}, ` : ''}{loc.country}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40">
                      <Globe className="h-3 w-3" />
                      {loc.country}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
                      <Clock className="h-3 w-3" />
                      {loc.timezone || 'UTC'}
                    </span>

                    {typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800">
                        <Compass className="h-3 w-3" />
                        {loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{loc.employeeCount || 0} employees</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(loc)}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Manage Hub →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <DataTable
          data={filteredLocations}
          columns={tableColumns}
          isLoading={isLoading}
          onAddClick={handleOpenAdd}
          addLabel="Add Location"
          emptyTitle="No locations configured"
          emptyDescription="Create physical or virtual branch offices for workforce assignment."
        />
      )}

      {/* 5. Create / Edit Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingLoc ? 'Edit Office Location' : 'Create Office Location'}
        description="Provide physical address, city, country, timezone, and geolocation coordinates."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Location Name"
            placeholder="e.g. Headquarters Campus / North America Hub"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            required
          />

          <Input
            label="Street Address"
            placeholder="e.g. 100 Innovation Boulevard, Tech Park"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={formErrors.address}
            required
          />

          <Input
            label="Address Line 2 (Optional)"
            placeholder="e.g. Suite 400 / Building B"
            value={formData.addressLine2}
            onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="e.g. San Francisco"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              error={formErrors.city}
              required
            />

            <Input
              label="State / Province"
              placeholder="e.g. California"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Postal Code"
              placeholder="e.g. 94107"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            />

            <Input
              label="Country"
              placeholder="e.g. United States"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              error={formErrors.country}
              required
            />
          </div>

          <SelectField
            label="Operating Timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            options={COMMON_TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitude (Decimal)"
              type="number"
              step="any"
              placeholder="e.g. 37.7749"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
            />

            <Input
              label="Longitude (Decimal)"
              type="number"
              step="any"
              placeholder="e.g. -122.4194"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : editingLoc
                ? 'Update Location'
                : 'Create Location'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* 6. Toggle Status Dialog */}
      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleToggleStatus}
        title={
          targetLoc?.status === 'ACTIVE'
            ? 'Deactivate Office Location?'
            : 'Activate Office Location?'
        }
        message={
          targetLoc?.status === 'ACTIVE'
            ? `Deactivating "${targetLoc?.name}" will restrict new employee assignments to this branch.`
            : `Activating "${targetLoc?.name}" will allow staff allocation and regional operations.`
        }
        confirmText={
          isToggling
            ? 'Updating...'
            : targetLoc?.status === 'ACTIVE'
            ? 'Deactivate'
            : 'Activate'
        }
        variant={targetLoc?.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
}
