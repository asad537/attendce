import api from './api';
import { sidebarService } from './sidebarService';

export const wfhService = {
  getList: (params?: any) => api.get('/wfh', { params }).then(res => res.data),
  getPendingCount: () => api.get('/wfh/pending-count').then(res => res.data.count),
  request: (data: any) => api.post('/wfh', data).then(res => {
    sidebarService.refresh();
    return res.data.wfh;
  }),
  review: (id: number, data: { action: 'approve' | 'reject', remarks?: string }) => api.post(`/wfh/${id}/review`, data).then(res => {
    sidebarService.refresh();
    return res.data.wfh;
  }),
  cancel: (id: number) => api.post(`/wfh/${id}/cancel`).then(res => {
    sidebarService.refresh();
    return res.data;
  }),
};
