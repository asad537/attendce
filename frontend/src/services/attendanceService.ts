import api from './api';
import { Attendance, PaginatedResponse, TeamMemberStatus } from '../types';

export const attendanceService = {
  async getList(params?: Record<string, unknown>): Promise<PaginatedResponse<Attendance>> {
    const res = await api.get('/attendance', { params });
    return res.data;
  },

  async getToday(): Promise<{ attendance: Attendance | null; current_status: string }> {
    const res = await api.get('/attendance/today');
    return res.data;
  },

  async checkIn(data: { work_mode?: string; note?: string; check_in_lat?: number; check_in_lng?: number }): Promise<Attendance> {
    const res = await api.post('/attendance/check-in', data);
    return res.data.attendance;
  },

  async checkOut(data?: { note?: string }): Promise<Attendance> {
    const res = await api.post('/attendance/check-out', data || {});
    return res.data.attendance;
  },

  async getTeamStatus(): Promise<TeamMemberStatus[]> {
    const res = await api.get('/attendance/team-status');
    return res.data.team;
  },

  async getById(id: number): Promise<Attendance> {
    const res = await api.get(`/attendance/${id}`);
    return res.data.attendance;
  },
};

export const breakService = {
  async startBreak(type: string = 'short', note?: string): Promise<void> {
    await api.post('/breaks/start', { type, note });
  },

  async endBreak(): Promise<void> {
    await api.post('/breaks/end');
  },
};
