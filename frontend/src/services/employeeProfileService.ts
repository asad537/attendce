import api from './api';

export interface ProfileStats {
  work_model: string | null;
  performance: { current: number; delta: number; monthly: { name: string; value: number }[] };
  hours_week: { total_minutes: number; days: { day: string; minutes: number; active: boolean }[] };
  calendar: { month: string; days: { day: number; status: 'present' | 'late' | 'leave' | 'absent' | null }[]; counts: { present: number; late: number; on_leave: number; absent: number } };
  payroll: { has_record: boolean; month: string | null; base_salary: number; allowances: number; incentives: number; deductions: number; overtime_rate: number; total: number };
}

export interface InternalNote { id: number; title: string; body: string; author: string; created_at: string }

export const employeeProfileService = {
  async getStats(userId: number, month: string): Promise<ProfileStats> {
    const res = await api.get(`/users/${userId}/profile-stats`, { params: { month } });
    return res.data;
  },
  async getNotes(userId: number): Promise<InternalNote[]> {
    const res = await api.get(`/users/${userId}/notes`);
    return res.data.notes;
  },
  async addNote(userId: number, payload: { title: string; body: string }): Promise<void> {
    await api.post(`/users/${userId}/notes`, payload);
  },
  async deleteNote(noteId: number): Promise<void> {
    await api.delete(`/notes/${noteId}`);
  },
};
