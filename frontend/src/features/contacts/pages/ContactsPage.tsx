import { useState, useMemo } from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { StatTile, StatTileRow } from '../../../components/ui/StatTile';
import { Pagination } from '../../../components/data-table/Pagination';
import { useToast } from '../../../components/ui/toast';
import { ContactFilters } from '../components/ContactFilters';
import { ContactTable } from '../components/ContactTable';
import { ContactCard } from '../components/ContactCard';
import { OrganizationContactsTable } from '../components/OrganizationContactsTable';
import { ContactDetailDrawer } from '../components/ContactDetailDrawer';
import {
  MOCK_CONTACTS,
  MOCK_ORGANIZATION_CONTACTS,
} from '../data/mockContactsData';
import type {
  ContactItem,
  ContactFilterState,
  ContactSortField,
  SortOrder,
  EmergencyContactInfo,
} from '../types/contacts.types';

export function ContactsPage() {
  const toast = useToast();

  // State
  const [contacts, setContacts] = useState<ContactItem[]>(MOCK_CONTACTS);
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<ContactSortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Filters State
  const [filters, setFilters] = useState<ContactFilterState>({
    search: '',
    category: 'ALL',
    department: 'ALL',
    designation: 'ALL',
    location: 'ALL',
    status: 'ALL',
  });

  const handleFilterChange = (newFilters: Partial<ContactFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'ALL',
      department: 'ALL',
      designation: 'ALL',
      location: 'ALL',
      status: 'ALL',
    });
    setCurrentPage(1);
    toast.info('Search and contact filters reset');
  };

  // Sorting
  const handleSortChange = (field: ContactSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Distinct options for filters
  const departmentOptions = useMemo(() => {
    const deps = Array.from(new Set(contacts.map((c) => c.department))).filter(Boolean);
    return [{ label: 'All Departments', value: 'ALL' }, ...deps.map((d) => ({ label: d, value: d }))];
  }, [contacts]);

  const designationOptions = useMemo(() => {
    const titles = Array.from(new Set(contacts.map((c) => c.designation))).filter(Boolean);
    return [{ label: 'All Designations', value: 'ALL' }, ...titles.map((d) => ({ label: d, value: d }))];
  }, [contacts]);

  const locationOptions = useMemo(() => {
    const locs = Array.from(new Set(contacts.map((c) => c.location))).filter(Boolean);
    return [{ label: 'All Locations', value: 'ALL' }, ...locs.map((l) => ({ label: l, value: l }))];
  }, [contacts]);

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    return contacts
      .filter((contact) => {
        // Category Filter
        if (filters.category === 'EMERGENCY' && contact.emergencyContacts.length === 0) {
          return false;
        }

        // Search across: Name, Employee ID, Email, Phone, Department, Designation, Location
        if (filters.search.trim()) {
          const query = filters.search.toLowerCase();
          const matches =
            contact.displayName.toLowerCase().includes(query) ||
            contact.employeeCode.toLowerCase().includes(query) ||
            contact.organizationEmail.toLowerCase().includes(query) ||
            contact.workPhone.toLowerCase().includes(query) ||
            contact.department.toLowerCase().includes(query) ||
            contact.designation.toLowerCase().includes(query) ||
            contact.location.toLowerCase().includes(query);
          if (!matches) return false;
        }

        // Dropdown Filters
        if (filters.department !== 'ALL' && contact.department !== filters.department) {
          return false;
        }
        if (filters.designation !== 'ALL' && contact.designation !== filters.designation) {
          return false;
        }
        if (filters.location !== 'ALL' && contact.location !== filters.location) {
          return false;
        }
        if (filters.status !== 'ALL' && contact.status !== filters.status) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = '';
        let valB = '';
        if (sortField === 'name') {
          valA = a.displayName;
          valB = b.displayName;
        } else if (sortField === 'employeeCode') {
          valA = a.employeeCode;
          valB = b.employeeCode;
        } else if (sortField === 'department') {
          valA = a.department;
          valB = b.department;
        } else if (sortField === 'designation') {
          valA = a.designation;
          valB = b.designation;
        } else if (sortField === 'location') {
          valA = a.location;
          valB = b.location;
        } else if (sortField === 'status') {
          valA = a.status;
          valB = b.status;
        }

        const cmp = valA.localeCompare(valB);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [contacts, filters, sortField, sortOrder]);

  // Paginated Contacts
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  // Stats
  const activeCount = useMemo(() => contacts.filter((c) => c.status === 'ACTIVE').length, [contacts]);
  const departmentCount = useMemo(() => new Set(contacts.map((c) => c.department)).size, [contacts]);
  const locationCount = useMemo(() => new Set(contacts.map((c) => c.location)).size, [contacts]);

  // Handlers
  const handleViewContact = (contact: ContactItem) => {
    setSelectedContact(contact);
    setIsDrawerOpen(true);
  };

  const handleAddEmergencyContact = (contactId: string, newEmergency: EmergencyContactInfo) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, emergencyContacts: [...c.emergencyContacts, newEmergency] }
          : c
      )
    );
    if (selectedContact?.id === contactId) {
      setSelectedContact((prev) =>
        prev ? { ...prev, emergencyContacts: [...prev.emergencyContacts, newEmergency] } : null
      );
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Employee Code',
      'Full Name',
      'Organization Email',
      'Work Phone',
      'Department',
      'Designation',
      'Location',
      'Status',
    ];
    const rows = filteredContacts.map((c) => [
      `"${c.employeeCode}"`,
      `"${c.displayName}"`,
      `"${c.organizationEmail}"`,
      `"${c.workPhone}"`,
      `"${c.department}"`,
      `"${c.designation}"`,
      `"${c.location}"`,
      `"${c.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PeopleOS_Contacts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      `Exported ${filteredContacts.length} contacts to CSV (Sensitive data protected)`,
      'Export Complete'
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Contacts Directory"
        description="Search and connect with team members, view communication channels, and manage organization contacts."
      />

      {/* Top Stat Tiles */}
      <StatTileRow>
        <StatTile
          label="Total Contacts"
          value={contacts.length}
          unit="Employees"
          swatch="bg-indigo-500"
        />
        <StatTile
          label="Active Staff"
          value={activeCount}
          unit="Active"
          swatch="bg-emerald-500"
        />
        <StatTile
          label="Departments"
          value={departmentCount}
          unit="Units"
          swatch="bg-violet-500"
        />
        <StatTile
          label="Global Offices"
          value={locationCount}
          unit="Locations"
          swatch="bg-amber-500"
        />
      </StatTileRow>

      {/* Filter Toolbar with Category Tabs, Search, Filters, and View Toggle */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <ContactFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCSV}
          departmentOptions={departmentOptions}
          designationOptions={designationOptions}
          locationOptions={locationOptions}
          totalFiltered={filteredContacts.length}
        />
      </div>

      {/* Main Content Area */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        {/* If category is ORGANIZATION OFFICES, show dedicated organization table */}
        {filters.category === 'ORGANIZATION' ? (
          <OrganizationContactsTable offices={MOCK_ORGANIZATION_CONTACTS} />
        ) : viewMode === 'table' ? (
          <ContactTable
            contacts={paginatedContacts}
            onViewContact={handleViewContact}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        ) : (
          <div className="p-5">
            {paginatedContacts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                No contacts match the specified criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onViewContact={handleViewContact}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination (only for employee/contact views) */}
        {filters.category !== 'ORGANIZATION' && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <Pagination
              page={currentPage}
              totalItems={filteredContacts.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        )}
      </div>

      {/* Contact Detail Slide-over Drawer */}
      <ContactDetailDrawer
        contact={selectedContact}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onAddEmergencyContact={handleAddEmergencyContact}
        isHrAdmin={true}
      />
    </div>
  );
}

export default ContactsPage;
