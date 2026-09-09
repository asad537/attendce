import api from './api';
import { MessageUser } from './messageService';

export type SignalType = 'offer' | 'answer' | 'ice' | 'hangup' | 'reject' | 'cancel' | 'invite' | 'join' | 'leave' | 'camera' | 'mute' | 'reaction' | 'chat';

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
  // Mint a shareable link that lets an external guest join THIS call.
  async inviteGuest(call_id: string): Promise<{ path: string; token: string; expires_in: number }> {
    const res = await api.post('/guest-call/invite', { call_id });
    return res.data;
  },
};

export interface RosterParticipant {
  id: number;
  name: string;
  avatar_url?: string | null;
  kind: 'voice' | 'video';
}

// The subset of call operations useCall depends on. A guest session provides
// the same shape but talks to the token-scoped /guest-call/* endpoints.
export interface CallTransport {
  signal(payload: { call_id: string; to_user_id: number; type: SignalType; data?: unknown }): Promise<void>;
  poll(): Promise<CallSignal[]>;
  join(payload: { call_id: string; kind: 'voice' | 'video' }): Promise<RosterParticipant[]>;
  leave(call_id: string): Promise<void>;
  log(payload: { to_user_id: number; kind: 'voice' | 'video'; outcome: string; duration?: number }): Promise<void>;
}

// Build a transport for an external guest, authenticated by their scoped token.
export function makeGuestTransport(guestToken: string): CallTransport {
  return {
    async signal({ to_user_id, type, data }) {
      await api.post('/guest-call/signal', { guest_token: guestToken, to_user_id, type, data });
    },
    async poll() {
      const res = await api.get('/guest-call/poll', { params: { guest_token: guestToken } });
      return res.data.signals as CallSignal[];
    },
    async join({ kind }) {
      const res = await api.post('/guest-call/heartbeat', { guest_token: guestToken, kind });
      return res.data.participants as RosterParticipant[];
    },
    async leave() {
      await api.post('/guest-call/leave', { guest_token: guestToken }).catch(() => { /* best-effort */ });
    },
    async log() { /* guests don't write call logs */ },
  };
}

export const guestCallService = {
  async join(payload: { token: string; name: string }): Promise<{ guest: { id: number; name: string }; call_id: string; guest_token: string }> {
    const res = await api.post('/guest-call/join', payload);
    return res.data;
  },
};
