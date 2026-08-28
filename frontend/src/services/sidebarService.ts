import api from './api';

export interface SidebarCounts {
  unread_messages: number;
  my_tickets: number;
  leave_approvals: number;
  my_leaves: number;
  wfh_approvals: number;
  my_wfh: number;
  pending_resignations: number;
}

export const sidebarService = {
  async getCounts(): Promise<SidebarCounts> {
    const res = await api.get<SidebarCounts>('/sidebar/counts');
    return res.data;
  },
  refresh(): void {
    window.dispatchEvent(new CustomEvent('sidebar-counts-update'));
  },
};
