import { apiClient } from '../../../utils/apiClient';
import type {
  Holiday,
  HolidayCalendar,
  HolidayCalendarView,
  RestrictedHolidayOpt,
} from '../types/holidays.types';

export const holidaysApi = {
  /** Employee calendar view: holidays + entitlement + own availed flags. */
  getCalendarView: async (year: number): Promise<HolidayCalendarView> => {
    const res = await apiClient.get('/leave/holidays/calendar', { params: { year } });
    return res.data.data as HolidayCalendarView;
  },

  getHolidays: async (params?: {
    year?: number;
    type?: string;
    search?: string;
    status?: string;
  }): Promise<Holiday[]> => {
    const res = await apiClient.get('/leave/holidays', { params });
    return res.data.data as Holiday[];
  },

  createHoliday: async (dto: Partial<Holiday>): Promise<Holiday> => {
    const res = await apiClient.post('/leave/holidays', dto);
    return res.data.data as Holiday;
  },

  updateHoliday: async (id: string, dto: Partial<Holiday>): Promise<Holiday> => {
    const res = await apiClient.patch(`/leave/holidays/${id}`, dto);
    return res.data.data as Holiday;
  },

  toggleHolidayStatus: async (id: string): Promise<Holiday> => {
    const res = await apiClient.patch(`/leave/holidays/${id}/status`);
    return res.data.data as Holiday;
  },

  deleteHoliday: async (id: string) => {
    const res = await apiClient.delete(`/leave/holidays/${id}`);
    return res.data;
  },

  getCalendar: async (year: number): Promise<HolidayCalendar> => {
    const res = await apiClient.get(`/leave/holiday-calendars/${year}`);
    return res.data.data as HolidayCalendar;
  },

  updateCalendar: async (
    year: number,
    dto: { restrictedLimit?: number; note?: string },
  ): Promise<HolidayCalendar> => {
    const res = await apiClient.patch(`/leave/holiday-calendars/${year}`, dto);
    return res.data.data as HolidayCalendar;
  },

  availRestrictedHoliday: async (holidayId: string): Promise<RestrictedHolidayOpt> => {
    const res = await apiClient.post('/leave/restricted-opts', { holidayId });
    return res.data.data as RestrictedHolidayOpt;
  },

  cancelRestrictedHoliday: async (optId: string) => {
    const res = await apiClient.delete(`/leave/restricted-opts/${optId}`);
    return res.data;
  },
};
