import api from './api';
import { AttendanceSummary, AuditLog, DailySnapshot, Holiday, PaginatedResponse } from '../types';

export const reportService = {
  async getDailySnapshot(): Promise<DailySnapshot> {
    const res = await api.get('/reports/daily-snapshot');
    return res.data;
  },

  async getAttendanceSummary(params?: Record<string, unknown>): Promise<AttendanceSummary | { team: AttendanceSummary[] } | { company: AttendanceSummary[] }> {
    const res = await api.get('/reports/attendance-summary', { params });
    return res.data;
  },

  async getLeaveSummary(params?: Record<string, unknown>): Promise<unknown[]> {
    const res = await api.get('/reports/leave-summary', { params });
    return res.data;
  },

  async downloadExport(params: Record<string, string>): Promise<void> {
    const response = await api.get('/reports/export', { params, responseType: 'blob' });
    const disposition = String(response.headers['content-disposition'] || '');
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || 'attendance.csv';
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export const notificationService = {
  async getList(unread?: boolean): Promise<{ data: import('../types').AppNotification[]; unread_count: number }> {
    const res = await api.get('/notifications', { params: unread ? { unread: 1 } : {} });
    return res.data;
  },

  async markRead(id: number): Promise<void> {
    await api.post(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.post('/notifications/read-all');
  },
};

export const holidayService = {
  async getAll(year?: number): Promise<Holiday[]> {
    const res = await api.get('/holidays', { params: year ? { year } : {} });
    return res.data.holidays;
  },

  async getUpcoming(): Promise<Holiday[]> {
    const res = await api.get('/holidays/upcoming');
    return res.data.holidays;
  },

  async create(data: Record<string, unknown>): Promise<Holiday> {
    const res = await api.post('/holidays', data);
    return res.data.holiday;
  },

  async update(id: number, data: Record<string, unknown>): Promise<Holiday> {
    const res = await api.put(`/holidays/${id}`, data);
    return res.data.holiday;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/holidays/${id}`);
  },
};

export const auditService = {
  async getList(params?: Record<string, unknown>): Promise<PaginatedResponse<AuditLog>> {
    const res = await api.get('/audit-logs', { params });
    return res.data;
  },
};
