import api from './api';

export interface AppSettings {
  currency: string;
  accent: string;
  currencies: string[];
  accents: string[];
}

export const settingsService = {
  async get(): Promise<AppSettings> {
    const res = await api.get('/settings');
    return res.data.settings;
  },
  async update(payload: { currency?: string; accent?: string }): Promise<AppSettings> {
    const res = await api.put('/settings', payload);
    return res.data.settings;
  },
};
