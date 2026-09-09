export interface OrganizationProfile {
  _id: string;
  legalName: string;
  tradeName?: string;
  registrationCode?: string;
  taxId?: string;
  corporateEmail: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  organizationType?: string;
  registrationCountry?: string;
  registrationDate?: string;
  primaryContactPerson?: string;
  supportEmail?: string;
  supportPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone: string;
  currency: string;
  fiscalYearStartMonth: string;
  workingDays?: string[];
  standardWorkingHours?: number;
  workStartTime?: string;
  workEndTime?: string;
  dateFormat?: string;
  timeFormat?: string;
  numberFormat?: string;
  employeeIdPrefix?: string;
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

export interface OrgChartNode {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string;
  initials: string;
  workEmail: string;
  phone?: string;
  departmentId?: string;
  departmentName: string;
  departmentCode: string;
  designationId?: string;
  designationTitle: string;
  designationCode: string;
  managerId?: string | null;
  status: string;
  directReportsCount: number;
  children: OrgChartNode[];
}

export interface OrgChartData {
  roots: OrgChartNode[];
  totalEmployees: number;
  totalDepartments: number;
  totalDesignations: number;
}

