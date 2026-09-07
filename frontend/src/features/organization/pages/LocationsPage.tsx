import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/data-table/DataTable';
import type { Column } from '../../../components/data-table/DataTable';
import { Button, Input, SelectField, StatusBadge, Tooltip } from '../../../components/ui';
import { Drawer } from '../../../components/overlay/Drawer';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { LocationItem } from '../types/organization.types';
import { MapPin, Users, Globe, Edit2, Power } from 'lucide-react';

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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const columns: Column<LocationItem>[] = [
    {
      header: 'Location Name',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</span>
            <p className="text-xs text-slate-400">{row.address}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'City / Region',
      accessorKey: 'city',
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {row.city}{row.state ? `, ${row.state}` : ''}
        </span>
      ),
    },
    {
      header: 'Country',
      accessorKey: 'country',
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">{row.country}</span>
      ),
    },
    {
      header: 'Timezone',
      accessorKey: 'timezone',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Globe className="h-3 w-3" />
          <span>{row.timezone}</span>
        </div>
      ),
    },
    {
      header: 'Employees',
      accessorKey: 'employeeCount',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span>{row.employeeCount || 0}</span>
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

          <Tooltip content={row.status === 'ACTIVE' ? 'Deactivate Location' : 'Activate Location'} placement="top">
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Locations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage worldwide corporate branch offices, regional sites, and local timezones.
          </p>
        </div>

        <Button size="sm" onClick={handleOpenAdd}>
          + Add Location
        </Button>
      </div>

      <DataTable
        data={locations}
        columns={columns}
        searchPlaceholder="Search by name, city or country..."
        searchKey={(l) => `${l.name} ${l.city} ${l.country}`}
        isLoading={isLoading}
        onAddClick={handleOpenAdd}
        addLabel="Add Location"
        emptyTitle="No branch locations configured"
        emptyDescription="Add office sites to manage attendance geofences and regional working hours."
      />

      {/* Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingLoc ? 'Edit Office Location' : 'Add Office Location'}
        description="Configure address, postal code, and canonical office timezone"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Location Name"
            required
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="e.g. Headquarters, Bangalore Tech Park"
            error={formErrors.name}
          />

          <Input
            label="Address Line 1"
            required
            value={formData.address}
            onChange={(e) => {
              setFormData({ ...formData, address: e.target.value });
              if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: '' }));
            }}
            placeholder="Street address"
            error={formErrors.address}
          />

          <Input
            label="Address Line 2"
            value={formData.addressLine2}
            onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
            placeholder="Suite, Floor, Building unit"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              required
              value={formData.city}
              onChange={(e) => {
                setFormData({ ...formData, city: e.target.value });
                if (formErrors.city) setFormErrors((prev) => ({ ...prev, city: '' }));
              }}
              error={formErrors.city}
            />
            <Input
              label="State / Province"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Country"
              required
              value={formData.country}
              onChange={(e) => {
                setFormData({ ...formData, country: e.target.value });
                if (formErrors.country) setFormErrors((prev) => ({ ...prev, country: '' }));
              }}
              error={formErrors.country}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Postal Code
              </label>
              <Input
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              />
            </div>
          </div>

          <SelectField
            label="Timezone"
            required
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            options={COMMON_TIMEZONES.map((tz) => ({
              value: tz,
              label: tz,
            }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Latitude (Optional)
              </label>
              <Input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="e.g. 12.9716"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Longitude (Optional)
              </label>
              <Input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="e.g. 77.5946"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              {editingLoc ? 'Update Location' : 'Create Location'}
            </Button>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        isOpen={dialogOpen}
        title={targetLoc?.status === 'ACTIVE' ? 'Deactivate Location' : 'Activate Location'}
        description={`Are you sure you want to mark "${targetLoc?.name}" as ${targetLoc?.status === 'ACTIVE' ? 'inactive' : 'active'}?`}
        variant={targetLoc?.status === 'ACTIVE' ? 'danger' : 'primary'}
        confirmLabel={targetLoc?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        isLoading={isToggling}
        onConfirm={handleToggleStatus}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}
