import { apiClient } from '../../../utils/apiClient';
import type { AttendanceRecord, AttendanceSummary } from '../types/attendance.types';

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
};
