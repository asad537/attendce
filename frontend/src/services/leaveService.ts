import api from './api';
import { Leave, LeaveBalance, LeaveType, PaginatedResponse } from '../types';

export const leaveService = {
  async getList(params?: Record<string, unknown>): Promise<PaginatedResponse<Leave>> {
    const res = await api.get('/leaves', { params });
    return res.data;
  },

  async getById(id: number): Promise<Leave> {
    const res = await api.get(`/leaves/${id}`);
    return res.data.leave;
  },

  async request(data: FormData): Promise<Leave> {
    const res = await api.post('/leaves', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.leave;
  },

  async managerReview(id: number, action: 'approve' | 'reject', remarks?: string): Promise<Leave> {
    const res = await api.post(`/leaves/${id}/manager-review`, { action, remarks });
    return res.data.leave;
  },

  async ceoReview(id: number, action: 'approve' | 'reject', remarks?: string): Promise<Leave> {
    const res = await api.post(`/leaves/${id}/ceo-review`, { action, remarks });
    return res.data.leave;
  },

  async cancel(id: number): Promise<Leave> {
    const res = await api.post(`/leaves/${id}/cancel`);
    return res.data.leave;
  },

  async getBalances(params?: { user_id?: number; year?: number }): Promise<{ balances: LeaveBalance[]; year: number }> {
    const res = await api.get('/leaves/balances', { params });
    return res.data;
  },

  async getPendingCount(): Promise<number> {
    const res = await api.get('/leaves/pending-count');
    return res.data.count;
  },
};

export const leaveTypeService = {
  async getAll(): Promise<LeaveType[]> {
    const res = await api.get('/leave-types');
    return res.data.leave_types || [];
  },
};
