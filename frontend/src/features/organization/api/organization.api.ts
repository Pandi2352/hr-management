import { apiClient } from '../../../utils/apiClient';
import type {
  OrganizationProfile,
  Department,
  Designation,
  LocationItem,
  CostCenter,
} from '../types/organization.types';

export const organizationApi = {
  // Profile
  getProfile: async () => {
    const res = await apiClient.get('/organization/profile');
    return res.data.data as OrganizationProfile;
  },
  updateProfile: async (data: Partial<OrganizationProfile>) => {
    const { _id, __v, status, createdAt, updatedAt, isDeleted, ...payload } = data as any;
    if (payload.supportEmail === '') {
      delete payload.supportEmail;
    }
    const res = await apiClient.patch('/organization/profile', payload);
    return res.data.data as OrganizationProfile;
  },

  // Departments
  getDepartments: async (params?: { search?: string; status?: string }) => {
    const res = await apiClient.get('/organization/departments', { params });
    return res.data.data as Department[];
  },
  createDepartment: async (data: Partial<Department>) => {
    const res = await apiClient.post('/organization/departments', data);
    return res.data.data as Department;
  },
  updateDepartment: async (id: string, data: Partial<Department>) => {
    const res = await apiClient.patch(`/organization/departments/${id}`, data);
    return res.data.data as Department;
  },
  updateDepartmentParent: async (id: string, parentId: string | null) => {
    const res = await apiClient.patch(`/organization/departments/${id}/parent`, { parentId });
    return res.data.data as Department;
  },
  toggleDepartmentStatus: async (id: string) => {
    const res = await apiClient.patch(`/organization/departments/${id}/status`);
    return res.data.data as Department;
  },
  deleteDepartment: async (id: string) => {
    const res = await apiClient.delete(`/organization/departments/${id}`);
    return res.data;
  },

  // Designations
  getDesignations: async (params?: { search?: string; status?: string }) => {
    const res = await apiClient.get('/organization/designations', { params });
    return res.data.data as Designation[];
  },
  createDesignation: async (data: Partial<Designation>) => {
    const res = await apiClient.post('/organization/designations', data);
    return res.data.data as Designation;
  },
  updateDesignation: async (id: string, data: Partial<Designation>) => {
    const res = await apiClient.patch(`/organization/designations/${id}`, data);
    return res.data.data as Designation;
  },
  toggleDesignationStatus: async (id: string) => {
    const res = await apiClient.patch(`/organization/designations/${id}/status`);
    return res.data.data as Designation;
  },

  // Locations
  getLocations: async (params?: { search?: string; status?: string }) => {
    const res = await apiClient.get('/organization/locations', { params });
    return res.data.data as LocationItem[];
  },
  createLocation: async (data: Partial<LocationItem>) => {
    const res = await apiClient.post('/organization/locations', data);
    return res.data.data as LocationItem;
  },
  updateLocation: async (id: string, data: Partial<LocationItem>) => {
    const res = await apiClient.patch(`/organization/locations/${id}`, data);
    return res.data.data as LocationItem;
  },
  toggleLocationStatus: async (id: string) => {
    const res = await apiClient.patch(`/organization/locations/${id}/status`);
    return res.data.data as LocationItem;
  },

  // Cost Centers
  getCostCenters: async (params?: { search?: string; status?: string }) => {
    const res = await apiClient.get('/organization/cost-centers', { params });
    return res.data.data as CostCenter[];
  },
  createCostCenter: async (data: Partial<CostCenter>) => {
    const res = await apiClient.post('/organization/cost-centers', data);
    return res.data.data as CostCenter;
  },
  updateCostCenter: async (id: string, data: Partial<CostCenter>) => {
    const res = await apiClient.patch(`/organization/cost-centers/${id}`, data);
    return res.data.data as CostCenter;
  },
  toggleCostCenterStatus: async (id: string) => {
    const res = await apiClient.patch(`/organization/cost-centers/${id}/status`);
    return res.data.data as CostCenter;
  },

  // Org Chart
  getOrgChart: async () => {
    const res = await apiClient.get('/employees/org-chart');
    return res.data.data as {
      roots: import('../types/organization.types').OrgChartNode[];
      totalEmployees: number;
      totalDepartments: number;
      totalDesignations: number;
    };
  },
};
