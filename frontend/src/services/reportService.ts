import api from './api';
import { AttendanceSummary, AuditLog, DailySnapshot, Holiday, PaginatedResponse } from '../types';

export interface SheetDay { day: number; weekday: string; is_weekend: boolean; is_holiday: boolean; holiday: string | null }
export interface SheetCell { day: number; code: '' | 'P' | 'A' | 'L' | 'W' | 'H' | 'WE'; late: boolean }
export interface SheetRow {
  user: { id: number; name: string; employee_id: string | null; role: string; department: string | null };
  days: SheetCell[];
  totals: { present: number; absent: number; leave: number; wfh: number; holiday: number; late: number };
  salary: number;
}
export interface AttendanceSheet { month: string; days_in_month: number; day_meta: SheetDay[]; rows: SheetRow[] }

export interface DashboardStats {
  employment_status: { total: number; breakdown: { type: string; count: number; percent: number }[] };
  team_performance: { current: number; delta: number; monthly: { name: string; value: number }[] };
  attendance_report: { rate: number; delta: number; heatmap: { time: string; mon: number; tue: number; wed: number; thu: number; fri: number }[] };
  turnover_rate: { data: { name: string; left: number; active: number }[] };
  tasks: { title: string; category: string; due_date: string | null }[];
}

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

  async getAttendanceSheet(month: string): Promise<AttendanceSheet> {
    const res = await api.get('/reports/attendance-sheet', { params: { month } });
    return res.data;
  },

  async getDashboardStats(params?: { months?: number; period?: 'this_month' | 'last_month' | 'this_week', turnover_period?: 'monthly' | 'yearly' }): Promise<DashboardStats> {
    const res = await api.get('/reports/dashboard-stats', { params });
    return res.data;
  },

  async updateSheetCell(payload: { user_id: number; date: string; status: 'present' | 'late' | 'on_leave' | 'absent' | 'work_from_home' | 'holiday' }): Promise<void> {
    await api.post('/reports/attendance-sheet/cell', payload);
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
