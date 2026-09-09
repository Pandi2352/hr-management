import { apiClient } from '../../../utils/apiClient';
import type { AttendanceRecord, AttendanceSummary } from '../types/attendance.types';
import type { Regularization, Shift } from '../types/shift.types';

export const attendanceApi = {
  checkIn: async (dto?: { date?: string; time?: string; note?: string }): Promise<AttendanceRecord> => {
    const res = await apiClient.post('/attendance/check-in', dto || {});
    return res.data.data as AttendanceRecord;
  },

  checkOut: async (dto?: { date?: string; time?: string; note?: string }): Promise<AttendanceRecord> => {
    const res = await apiClient.post('/attendance/check-out', dto || {});
    return res.data.data as AttendanceRecord;
  },

  today: async (): Promise<{ date: string; record: AttendanceRecord | null }> => {
    const res = await apiClient.get('/attendance/today');
    return res.data.data;
  },

  myRecords: async (month: string): Promise<{ records: AttendanceRecord[]; summary: AttendanceSummary }> => {
    const res = await apiClient.get('/attendance/me', { params: { month } });
    return res.data.data;
  },

  teamRecords: async (params?: {
    employeeId?: string;
    from?: string;
    to?: string;
  }): Promise<AttendanceRecord[]> => {
    const res = await apiClient.get('/attendance', { params });
    return res.data.data as AttendanceRecord[];
  },

  overview: async (year?: number) => {
    const res = await apiClient.get('/attendance/overview', { params: { year } });
    return res.data.data ?? res.data;
  },

  sheet: async (month?: string, filters?: { departmentId?: string; search?: string; workType?: string }) => {
    const res = await apiClient.get('/attendance/sheet', { params: { month, ...filters } });
    return res.data.data ?? res.data;
  },

  recordManual: async (dto: {
    employeeId: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    status?: string;
    note?: string;
  }) => {
    const res = await apiClient.post('/attendance/record', dto);
    return res.data.data ?? res.data;
  },

  // --- Shifts (master) ---

  getShifts: async (status?: string): Promise<Shift[]> => {
    const res = await apiClient.get('/shifts', { params: { status } });
    return res.data.data as Shift[];
  },

  createShift: async (dto: Partial<Shift>): Promise<Shift> => {
    const res = await apiClient.post('/shifts', dto);
    return res.data.data as Shift;
  },

  updateShift: async (id: string, dto: Partial<Shift>): Promise<Shift> => {
    const res = await apiClient.patch(`/shifts/${id}`, dto);
    return res.data.data as Shift;
  },

  toggleShiftStatus: async (id: string): Promise<Shift> => {
    const res = await apiClient.patch(`/shifts/${id}/status`);
    return res.data.data as Shift;
  },

  deleteShift: async (id: string) => {
    const res = await apiClient.delete(`/shifts/${id}`);
    return res.data;
  },

  // --- Regularizations (missed-punch corrections) ---

  raiseRegularization: async (dto: {
    date: string;
    requestedCheckIn: string;
    requestedCheckOut?: string;
    reason: string;
  }) => {
    const res = await apiClient.post('/regularizations', dto);
    return res.data.data;
  },

  myRegularizations: async (status?: string): Promise<Regularization[]> => {
    const res = await apiClient.get('/regularizations/me', { params: { status } });
    return res.data.data as Regularization[];
  },

  regularizationInbox: async (): Promise<Regularization[]> => {
    const res = await apiClient.get('/regularizations/inbox');
    return res.data.data as Regularization[];
  },

  decideRegularization: async (id: string, approve: boolean, note?: string) => {
    const res = await apiClient.post(`/regularizations/${id}/${approve ? 'approve' : 'reject'}`, { note });
    return res.data.data;
  },

  cancelRegularization: async (id: string) => {
    const res = await apiClient.post(`/regularizations/${id}/cancel`);
    return res.data.data;
  },
};
