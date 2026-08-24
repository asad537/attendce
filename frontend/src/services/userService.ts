import api from './api';
import {
  CreateEmployeePayload,
  CreateEmployeeResponse,
  Department,
  Designation,
  PaginatedResponse,
  Shift,
  User,
} from '../types';

export const userService = {
  async getList(params?: Record<string, unknown>): Promise<PaginatedResponse<User>> {
    const res = await api.get('/users', { params });
    const payload = res.data;

    // Keep the UI safe while older API deployments may still return { users: [] }.
    if (Array.isArray(payload?.data)) return payload;

    const users: User[] = Array.isArray(payload?.users) ? payload.users : [];
    return {
      data: users,
      meta: payload?.meta ?? {
        total: users.length,
        per_page: users.length,
        current_page: 1,
        last_page: 1,
      },
    };
  },

  async getById(id: number): Promise<User> {
    const res = await api.get(`/users/${id}`);
    return res.data.user;
  },

  /** CEO creates a new employee — backend auto-generates the password */
  async createEmployee(data: CreateEmployeePayload): Promise<CreateEmployeeResponse> {
    const res = await api.post('/users', data);
    return res.data; // { message, temporary_password, user }
  },

  async update(id: number, data: FormData | Record<string, unknown>): Promise<User> {
    const res = await api.put(`/users/${id}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return res.data.user;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};

export const departmentService = {
  async getAll(): Promise<Department[]> {
    const res = await api.get('/departments');
    return res.data.departments;
  },

  async create(data: Record<string, unknown>): Promise<Department> {
    const res = await api.post('/departments', data);
    return res.data.department;
  },

  async update(id: number, data: Record<string, unknown>): Promise<Department> {
    const res = await api.put(`/departments/${id}`, data);
    return res.data.department;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/departments/${id}`);
  },
};

export const shiftService = {
  async getAll(): Promise<Shift[]> {
    const res = await api.get('/shifts');
    return res.data.shifts;
  },

  async create(data: Record<string, unknown>): Promise<Shift> {
    const res = await api.post('/shifts', data);
    return res.data.shift;
  },

  async update(id: number, data: Record<string, unknown>): Promise<Shift> {
    const res = await api.put(`/shifts/${id}`, data);
    return res.data.shift;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/shifts/${id}`);
  },
};

export const designationService = {
  async getAll(): Promise<Designation[]> {
    const res = await api.get('/designations');
    return res.data.designations || [];
  },

  async create(data: Record<string, unknown>): Promise<Designation> {
    const res = await api.post('/designations', data);
    return res.data.designation;
  },

  async update(id: number, data: Record<string, unknown>): Promise<Designation> {
    const res = await api.put(`/designations/${id}`, data);
    return res.data.designation;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/designations/${id}`);
  },
};
