import api from './api';
import { MessageUser } from './messageService';

export type SignalType = 'offer' | 'answer' | 'ice' | 'hangup' | 'reject' | 'cancel';

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
};
