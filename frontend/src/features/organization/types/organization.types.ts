export interface OrganizationProfile {
  _id: string;
  legalName: string;
  tradeName?: string;
  registrationCode?: string;
  taxId?: string;
  corporateEmail: string;
  phone?: string;
  website?: string;
  timezone: string;
  currency: string;
  fiscalYearStartMonth: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  _id: string;
  organizationId: string;
  name: string;
  code: string;
  parentId: string | null;
  headEmployeeId?: string | null;
  costCenterId?: string | null;
  memberCount: number;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface Designation {
  _id: string;
  organizationId: string;
  title: string;
  code: string;
  grade: number;
  assignedEmployeeCount: number;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationItem {
  _id: string;
  organizationId: string;
  name: string;
  address: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
  employeeCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface CostCenter {
  _id: string;
  organizationId: string;
  code: string;
  name: string;
  departmentId?: string | null;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}
