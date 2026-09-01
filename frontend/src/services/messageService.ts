import api from './api';
import { sidebarService } from './sidebarService';

export interface MessageUser { id: number; name: string; email: string; role?: string; designation?: string | null; avatar?: string | null; avatar_url?: string | null }
export interface MessageAttachment { url: string; name: string; mime: string; size: number; is_image: boolean }
export interface InboxMessage {
  id: number; subject: string; body: string; label?: string | null; is_draft: boolean; is_read: boolean;
  is_starred: boolean; is_deleted?: boolean; is_edited?: boolean; is_forwarded?: boolean; attachment?: MessageAttachment | null;
  parent?: { id: number; body: string; sender: MessageUser } | null;
  reactions?: Record<string, string> | null;
  sender: MessageUser; recipient?: MessageUser | null; created_at: string;
}
export interface MessageCounts { inbox: number; unread: number; starred: number; sent: number; drafts: number; spam: number; trash: number }
export interface Conversation { user: MessageUser & { role?: string }; last_message?: { id: number; body: string; subject: string; created_at: string; sent_by_me: boolean } | null; unread_count: number }

export const messageService = {
  async list(folder: string, search = ''): Promise<{ messages: InboxMessage[]; counts: MessageCounts }> {
    const response = await api.get('/messages', { params: { folder, search: search || undefined } });
    return response.data;
  },
  async recipients(): Promise<MessageUser[]> {
    const response = await api.get('/messages/recipients');
    return response.data.users;
  },
  async conversations(search = ''): Promise<Conversation[]> {
    const response = await api.get('/messages/conversations', { params: { search: search || undefined } });
    return response.data.conversations;
  },
  async thread(userId: number): Promise<{ user: MessageUser & { role?: string }; messages: InboxMessage[] }> {
    const response = await api.get(`/messages/thread/${userId}`);
    // Immediately refresh sidebar badge counts as messages are marked as read
    sidebarService.refresh();
    return response.data;
  },
  async typing(recipientId: number): Promise<void> {
    await api.post('/messages/typing', { recipient_id: recipientId });
  },
  async typingStatus(userId: number): Promise<{ typing: boolean }> {
    const response = await api.get(`/messages/typing/${userId}`);
    return response.data;
  },
  async send(payload: { recipient_id?: number; subject: string; body: string; label?: string; is_draft?: boolean; parent_id?: number; is_forwarded?: boolean; file?: File | null }): Promise<InboxMessage> {
    let resultMessage: InboxMessage;
    if (payload.file) {
      const form = new FormData();
      if (payload.recipient_id != null) form.append('recipient_id', String(payload.recipient_id));
      form.append('subject', payload.subject);
      if (payload.body) form.append('body', payload.body);
      if (payload.parent_id != null) form.append('parent_id', String(payload.parent_id));
      form.append('attachment', payload.file);
      const response = await api.post('/messages', form, { headers: { 'Content-Type': undefined } as never });
      resultMessage = response.data.message;
    } else {
      const { file: _file, ...rest } = payload;
      const response = await api.post('/messages', rest);
      resultMessage = response.data.message;
    }
    sidebarService.refresh();
    return resultMessage;
  },
  async action(id: number, action: string): Promise<InboxMessage> {
    const response = await api.patch(`/messages/${id}`, { action });
    sidebarService.refresh();
    return response.data.message;
  },
  async edit(id: number, body: string): Promise<InboxMessage> {
    const response = await api.patch(`/messages/${id}`, { action: 'edit', body });
    return response.data.message;
  },
  async react(id: number, reaction: string | null): Promise<InboxMessage> {
    const response = await api.patch(`/messages/${id}`, { action: 'react', reaction });
    return response.data.message;
  },
  async remove(id: number, scope?: 'everyone'): Promise<void> {
    await api.delete(`/messages/${id}`, { params: scope ? { scope } : undefined });
    sidebarService.refresh();
  },
};
