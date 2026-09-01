import api from './api';
import { MessageUser } from './messageService';

export type SignalType = 'offer' | 'answer' | 'ice' | 'hangup' | 'reject' | 'cancel' | 'invite' | 'join' | 'leave';

export interface CallSignal {
  id: number;
  call_id: string;
  type: SignalType;
  data: unknown;
  from: MessageUser & { role?: string };
  created_at: string;
}

export const callService = {
  async signal(payload: { call_id: string; to_user_id: number; type: SignalType; data?: unknown }): Promise<void> {
    await api.post('/calls/signal', payload);
  },
  async poll(): Promise<CallSignal[]> {
    const response = await api.get('/calls/poll');
    return response.data.signals;
  },
  async log(payload: { to_user_id: number; kind: 'voice' | 'video'; outcome: 'ended' | 'missed' | 'declined' | 'cancelled'; duration?: number }): Promise<void> {
    await api.post('/calls/log', payload).catch(() => { /* logging is best-effort */ });
  },
  async join(payload: { call_id: string; kind: 'voice' | 'video' }): Promise<RosterParticipant[]> {
    const response = await api.post('/calls/join', payload);
    return response.data.participants as RosterParticipant[];
  },
  async leave(call_id: string): Promise<void> {
    await api.post('/calls/leave', { call_id }).catch(() => { /* best-effort */ });
  },
};

export interface RosterParticipant {
  id: number;
  name: string;
  avatar_url?: string | null;
  kind: 'voice' | 'video';
}
