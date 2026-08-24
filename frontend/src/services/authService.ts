import api from './api';
import { User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await api.post('/login', { email, password });
    return res.data;
  },

  async logout(): Promise<void> {
    await api.post('/logout');
  },

  async me(): Promise<User> {
    const res = await api.get('/me');
    return res.data.user;
  },

  async updateProfile(data: FormData | Record<string, unknown>): Promise<User> {
    const res = await api.post('/me', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return res.data.user;
  },
};
