import api from './api';

export interface Resignation {
  id: number;
  user: { id: number; name: string; employee_id: string | null; role: string; department: string | null };
  last_working_day: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  reviewer: string | null;
  reviewed_at: string | null;
  remarks: string | null;
  created_at: string;
}

export const resignationService = {
  async list(): Promise<Resignation[]> {
    const res = await api.get('/resignations');
    return res.data.resignations;
  },
  async submit(payload: { last_working_day: string; reason: string }): Promise<void> {
    await api.post('/resignations', payload);
  },
  async review(id: number, action: 'approve' | 'reject', remarks?: string): Promise<void> {
    await api.post(`/resignations/${id}/review`, { action, remarks });
  },
  async withdraw(id: number): Promise<void> {
    await api.post(`/resignations/${id}/withdraw`);
  },
};
