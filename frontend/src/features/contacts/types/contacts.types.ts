export type ContactCategory = 'ALL' | 'EMPLOYEES' | 'EMERGENCY' | 'ORGANIZATION';

export type ContactStatus = 'ACTIVE' | 'ON_LEAVE' | 'PROBATION' | 'INACTIVE';

export interface EmergencyContactInfo {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  isPrimary: boolean;
}

export interface ContactItem {
  id: string;
  employeeId?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string;
  organizationEmail: string;
  workPhone: string;
  department: string;
  designation: string;
  location: string;
  status: ContactStatus;
  joiningDate: string;
  manager?: {
    id: string;
    name: string;
    designation: string;
    avatarUrl?: string;
  };
  // Sensitive/Personal Contacts (Protected under HR permissions)
  personalEmail?: string;
  personalPhone?: string;
  homeAddress?: string;
  emergencyContacts: EmergencyContactInfo[];
}

export interface OrganizationOfficeContact {
  id: string;
  name: string;
  department?: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  isHeadquarters?: boolean;
}

export interface ContactFilterState {
  search: string;
  category: ContactCategory;
  department: string;
  designation: string;
  location: string;
  status: string;
}

export type ContactSortField =
  | 'name'
  | 'employeeCode'
  | 'department'
  | 'designation'
  | 'location'
  | 'status';

export type SortOrder = 'asc' | 'desc';
