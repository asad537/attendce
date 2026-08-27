import api from './api';

export interface PayrollRow {
  id?: number | null; month: string; user: { id: number; name: string; employee_id?: string; department?: string; designation?: string };
  base_salary: number; allowances: number; incentives: number; deductions: number; overtime_rate: number;
  overtime_hours: number; overtime_pay: number; total: number; status: 'draft' | 'unpaid' | 'paid'; paid_at?: string | null;
}
export interface PayrollData {
  rows: PayrollRow[];
  summary: { salary: number; allowances: number; incentives: number; deductions: number; overtime: number; total: number };
  trend: { month: string; salary: number; allowances: number; incentives: number }[];
}

export const payrollService = {
  async get(month: string): Promise<PayrollData> { const response = await api.get('/payroll', { params: { month } }); return response.data; },
  async update(userId: number, payload: { month: string; base_salary: number; allowances: number; incentives: number; deductions: number; overtime_rate: number; status: string }): Promise<void> { await api.put(`/payroll/${userId}`, payload); },
};
