import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { callService, CallSignal, RosterParticipant, SignalType } from '../services/callService';
import { MessageUser } from '../services/messageService';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected' | 'ended';
type Peer = MessageUser & { role?: string };

export interface RemoteParticipant {
  id: number;
  name: string;
  avatar_url?: string | null;
  stream: MediaStream;
}

export interface CallState {
  status: CallStatus;
  peer: Peer | null;
  kind: 'voice' | 'video';
  muted: boolean;
  camOff: boolean;
  isGroup: boolean;
  error?: string | null;
}

const turnUrl = import.meta.env.VITE_TURN_URL;
const turnUsername = import.meta.env.VITE_TURN_USERNAME;
const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...(turnUrl && turnUsername && turnCredential
      ? [{ urls: [turnUrl, turnUrl.replace('?transport=udp', '?transport=tcp')], username: turnUsername, credential: turnCredential }]
      : []),
  ],
};
const randomId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const idleState: CallState = { status: 'idle', peer: null, kind: 'voice', muted: false, camOff: false, isGroup: false, error: null };

const cleanSdp = (sdpInit: any): RTCSessionDescription => {
  if (sdpInit instanceof RTCSessionDescription) return sdpInit;
  let type: RTCSdpType = 'offer';
  let sdp = '';
  if (typeof sdpInit === 'string') {
    sdp = sdpInit;
  } else if (sdpInit && typeof sdpInit === 'object') {
    type = sdpInit.type || 'offer';
    sdp = sdpInit.sdp || '';
  }
  // WebRTC RFC 4566 requires strict CRLF \r\n line endings in SDP strings.
  sdp = sdp.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
  // The transport (Laravel's TrimStrings middleware) can strip the trailing
  // newline; without it Chrome rejects the final line ("Invalid SDP line").
  if (sdp && !sdp.endsWith('\r\n')) sdp += '\r\n';
  return new RTCSessionDescription({ type, sdp });
};

interface PeerConn {
  pc: RTCPeerConnection;
  stream: MediaStream;
  remoteSet: boolean;
  pendingIce: RTCIceCandidateInit[];
  meta: { name: string; avatar_url?: string | null };
}

export function useCall(meId?: number) {
  const [state, setState] = useState<CallState>(idleState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);

  const peersRef = useRef<Map<number, PeerConn>>(new Map());
  const roomRef = useRef('');
  const primaryPeerRef = useRef<Peer | null>(null);      // first invited peer (state.peer + 1:1 call-log)
  const kindRef = useRef<'voice' | 'video'>('voice');
  const roleRef = useRef<'caller' | 'callee' | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingInvite = useRef<{ room: string; kind: 'voice' | 'video'; from: Peer } | null>(null);
  const statusRef = useRef<CallStatus>('idle');
  const timerRef = useRef<number | undefined>(undefined);
  const heartbeatRef = useRef<number | undefined>(undefined);
  const connectedAtRef = useRef(0);
  const loggedRef = useRef(false);
  const groupRef = useRef(false);
  const meIdRef = useRef<number | undefined>(meId);

  useEffect(() => { meIdRef.current = meId; }, [meId]);
  useEffect(() => { statusRef.current = state.status; }, [state.status]);

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = undefined; } };
  const stopHeartbeat = () => { if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = undefined; } };

  const bumpParticipants = useCallback(() => {
    const list = Array.from(peersRef.current.entries()).map(([id, e]) => ({
      id, name: e.meta.name, avatar_url: e.meta.avatar_url, stream: e.stream,
    }));
    setParticipants(list);
    setRemoteStream(list[0]?.stream || null);
  }, []);

  const cleanup = useCallback(() => {
    clearTimer();
    stopHeartbeat();
    if (roomRef.current) callService.leave(roomRef.current);
    peersRef.current.forEach(e => { try { e.pc.close(); } catch { /* noop */ } });
    peersRef.current.clear();
    localRef.current?.getTracks().forEach(t => t.stop());
    localRef.current = null;
    roomRef.current = '';
    connectedAtRef.current = 0;
    loggedRef.current = false;
    groupRef.current = false;
    roleRef.current = null;
    pendingInvite.current = null;
    setParticipants([]);
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const reset = useCallback((error: string | null = null) => {
    cleanup();
    primaryPeerRef.current = null;
    setState({ ...idleState, error });
  }, [cleanup]);

  const sendSignal = useCallback((type: SignalType, data: unknown, toId: number) => {
    if (!toId || !roomRef.current) return;
    callService.signal({ call_id: roomRef.current, to_user_id: toId, type, data }).catch(() => { /* noop */ });
  }, []);

  const logCall = useCallback((outcome: 'ended' | 'missed' | 'declined' | 'cancelled') => {
    if (loggedRef.current || groupRef.current || !primaryPeerRef.current) return;
    loggedRef.current = true;
    const duration = connectedAtRef.current ? Math.floor((Date.now() - connectedAtRef.current) / 1000) : 0;
    callService.log({ to_user_id: primaryPeerRef.current.id, kind: kindRef.current, outcome, duration });
  }, []);

  // Move to "ended" briefly, then back to idle so the UI can show a closing frame.
  const finish = useCallback(() => {
    if (!loggedRef.current && primaryPeerRef.current && !groupRef.current) {
      if (statusRef.current === 'connected') {
        logCall('ended');
      } else if (statusRef.current === 'calling') {
        logCall('cancelled');
      }
    }
    cleanup();
    setState(s => ({ ...s, status: 'ended' }));
    window.setTimeout(() => { primaryPeerRef.current = null; setState(idleState); }, 1200);
  }, [cleanup, logCall]);

  const removePeer = useCallback((id: number) => {
    const entry = peersRef.current.get(id);
    if (!entry) return;
    try { entry.pc.close(); } catch { /* noop */ }
    peersRef.current.delete(id);
    bumpParticipants();
    // A 1:1 call collapses to idle once its only peer leaves.
    if (peersRef.current.size === 0 && !groupRef.current && statusRef.current !== 'idle') {
      finish();
    }
  }, [bumpParticipants, finish]);

  const createPeer = useCallback((id: number, meta?: { name?: string; avatar_url?: string | null }): PeerConn => {
    const existing = peersRef.current.get(id);
    if (existing) return existing;
    const pc = new RTCPeerConnection(ICE);
    const stream = new MediaStream();
    const entry: PeerConn = { pc, stream, remoteSet: false, pendingIce: [], meta: { name: meta?.name || 'Guest', avatar_url: meta?.avatar_url } };
    localRef.current?.getTracks().forEach(t => pc.addTrack(t, localRef.current!));
    pc.onicecandidate = e => { if (e.candidate) sendSignal('ice', e.candidate.toJSON(), id); };
    pc.ontrack = e => { e.streams[0]?.getTracks().forEach(t => stream.addTrack(t)); bumpParticipants(); };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        clearTimer();
        connectedAtRef.current = connectedAtRef.current || Date.now();
        setState(s => (s.status === 'connected' ? s : { ...s, status: 'connected' }));
      }
      if (st === 'failed' || st === 'closed') removePeer(id);
    };
    peersRef.current.set(id, entry);
    bumpParticipants();
    return entry;
  }, [sendSignal, bumpParticipants, removePeer]);

  // Deterministic offerer avoids glare: the lower userId offers, the other answers.
  const iAmOfferer = (otherId: number) => (meIdRef.current ?? 0) < otherId;

  const connectTo = useCallback(async (r: RosterParticipant) => {
    if (peersRef.current.has(r.id)) {
      const e = peersRef.current.get(r.id)!;
      e.meta = { name: r.name, avatar_url: r.avatar_url };
      return;
    }
    const entry = createPeer(r.id, r);
    if (iAmOfferer(r.id)) {
      try {
        const offer = await entry.pc.createOffer();
        await entry.pc.setLocalDescription(offer);
        sendSignal('offer', { sdp: { type: entry.pc.localDescription?.type || 'offer', sdp: entry.pc.localDescription?.sdp }, kind: kindRef.current }, r.id);
      } catch { /* noop */ }
    }
  }, [createPeer, sendSignal]);

  const formatMediaError = (err: any, kind: 'voice' | 'video') => {
    const name = err?.name || '';
    const msg = err?.message || '';
    if (msg === 'SECURE_CONTEXT_REQUIRED' || name === 'SecurityError') {
      return 'Calls require an HTTPS connection or localhost to access your microphone.';
    }
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Microphone access blocked. Please check browser permissions AND macOS Privacy & Security -> Microphone.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No microphone found on your device. Please plug in a headset or microphone.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Microphone is busy in another app (Zoom, Teams, FaceTime, or Meet).';
    }
    return `${kind === 'video' ? 'Camera/Mic' : 'Microphone'} error (${name || 'Error'}): ${msg || 'Unable to access media device'}`;
  };

  const getMedia = useCallback(async (kind: 'voice' | 'video') => {
    const nav = navigator as any;
    if (!nav.mediaDevices?.getUserMedia && !nav.getUserMedia && !nav.webkitGetUserMedia && !nav.mozGetUserMedia) {
      throw new Error('SECURE_CONTEXT_REQUIRED');
    }
    const getUserMediaPromised = (constraints: MediaStreamConstraints): Promise<MediaStream> => {
      if (nav.mediaDevices?.getUserMedia) return nav.mediaDevices.getUserMedia(constraints);
      return new Promise((resolve, reject) => {
        const legacy = nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia;
        legacy.call(nav, constraints, resolve, reject);
      });
    };
    let stream: MediaStream | null = null;
    let lastError: any = null;
    try {
      stream = await getUserMediaPromised(kind === 'video' ? { audio: true, video: true } : { audio: true, video: false });
    } catch (err1) {
      lastError = err1;
      try { stream = await getUserMediaPromised({ audio: true }); } catch (err2) { lastError = err2 || err1; }
    }
    if (!stream) throw lastError || new Error('UNKNOWN_MEDIA_ERROR');
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const heartbeat = useCallback(async () => {
    if (!roomRef.current) return;
    try {
      const roster = await callService.join({ call_id: roomRef.current, kind: kindRef.current });
      // Roster only ADDs members; departures come via 'leave'/'hangup' or pc-close
      // (avoids racing a peer we just connected to but who hasn't heartbeat yet).
      for (const r of roster) { if (!peersRef.current.has(r.id)) await connectTo(r); }
    } catch { /* noop */ }
  }, [connectTo]);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    void heartbeat();
    heartbeatRef.current = window.setInterval(() => void heartbeat(), 2000);
  }, [heartbeat]);

  const start = useCallback(async (peer: Peer, kind: 'voice' | 'video') => {
    if (statusRef.current !== 'idle') return;
    roomRef.current = randomId();
    primaryPeerRef.current = peer;
    kindRef.current = kind;
    roleRef.current = 'caller';
    groupRef.current = false;
    setState({ status: 'calling', peer, kind, muted: false, camOff: false, isGroup: false, error: null });
    try {
      await getMedia(kind);
      startHeartbeat();
      sendSignal('invite', { call_id: roomRef.current, kind }, peer.id);
      timerRef.current = window.setTimeout(() => {
        if (statusRef.current === 'calling') { logCall('missed'); sendSignal('cancel', null, peer.id); finish(); }
      }, 45000);
    } catch (err: any) {
      console.error('Start call error:', err);
      const msg = formatMediaError(err, kind);
      toast.error(msg);
      reset(msg);
    }
  }, [getMedia, startHeartbeat, sendSignal, finish, reset, logCall]);

  const accept = useCallback(async () => {
    if (statusRef.current !== 'incoming' || !pendingInvite.current) return;
    const invite = pendingInvite.current;
    roomRef.current = invite.room;
    kindRef.current = invite.kind;
    roleRef.current = 'callee';
    setState(s => ({ ...s, status: 'connecting' }));
    try {
      await getMedia(invite.kind);
      startHeartbeat(); // roster sync connects us to everyone already in the room
      // Fast-path: tell the caller we joined so they connect without waiting.
      if (primaryPeerRef.current) sendSignal('join', null, primaryPeerRef.current.id);
    } catch (err: any) {
      console.error('Accept call error:', err);
      if (primaryPeerRef.current) sendSignal('reject', null, primaryPeerRef.current.id);
      const msg = formatMediaError(err, invite.kind);
      toast.error(msg);
      reset(msg);
    }
  }, [getMedia, startHeartbeat, sendSignal, reset]);

  const reject = useCallback(() => {
    if (primaryPeerRef.current && pendingInvite.current) {
      roomRef.current = pendingInvite.current.room;
      sendSignal('reject', null, primaryPeerRef.current.id);
    }
    reset();
  }, [sendSignal, reset]);

  const hangup = useCallback(() => {
    const calling = statusRef.current === 'calling';
    peersRef.current.forEach((_e, id) => sendSignal(calling ? 'cancel' : 'hangup', null, id));
    if (calling && primaryPeerRef.current) sendSignal('cancel', null, primaryPeerRef.current.id);
    logCall(calling ? 'cancelled' : 'ended');
    finish();
  }, [sendSignal, finish, logCall]);

  // Invite another user into the current call — turns it into a group call.
  const addToCall = useCallback((peer: Peer) => {
    if (statusRef.current === 'idle' || !roomRef.current) return;
    groupRef.current = true;
    setState(s => ({ ...s, isGroup: true }));
    sendSignal('invite', { call_id: roomRef.current, kind: kindRef.current }, peer.id);
    toast.success(`Inviting ${peer.name}…`);
  }, [sendSignal]);

  const toggleMute = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setState(s => ({ ...s, muted: !track.enabled })); }
  }, []);
  const toggleCam = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setState(s => ({ ...s, camOff: !track.enabled })); }
  }, []);

  const handleSignal = useCallback(async (sig: CallSignal) => {
    if (sig.type === 'invite') {
      if (statusRef.current !== 'idle') {
        // Busy — politely decline the new caller without disturbing the active call.
        callService.signal({ call_id: sig.call_id, to_user_id: sig.from.id, type: 'reject' }).catch(() => { /* noop */ });
        return;
      }
      const payload = sig.data as { call_id: string; kind?: 'voice' | 'video' };
      const callKind = payload?.kind === 'video' ? 'video' : 'voice';
      pendingInvite.current = { room: payload.call_id, kind: callKind, from: sig.from };
      primaryPeerRef.current = sig.from;
      kindRef.current = callKind;
      setState({ status: 'incoming', peer: sig.from, kind: callKind, muted: false, camOff: false, isGroup: false, error: null });
      // Safety net: if the cancel signal is ever missed, stop ringing anyway.
      clearTimer();
      timerRef.current = window.setTimeout(() => { if (statusRef.current === 'incoming') reset(); }, 50000);
      return;
    }
    if (statusRef.current === 'idle') return;

    if (sig.type === 'offer') {
      const raw = (sig.data as { sdp: RTCSessionDescriptionInit }).sdp || sig.data;
      const entry = createPeer(sig.from.id, sig.from as any);
      await entry.pc.setRemoteDescription(cleanSdp(raw));
      entry.remoteSet = true;
      for (const c of entry.pendingIce) { try { await entry.pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* noop */ } }
      entry.pendingIce = [];
      const answer = await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      sendSignal('answer', { sdp: { type: entry.pc.localDescription?.type || 'answer', sdp: entry.pc.localDescription?.sdp } }, sig.from.id);
    } else if (sig.type === 'answer') {
      const entry = peersRef.current.get(sig.from.id);
      if (entry) {
        const raw = (sig.data as { sdp: RTCSessionDescriptionInit }).sdp || sig.data;
        await entry.pc.setRemoteDescription(cleanSdp(raw));
        entry.remoteSet = true;
        for (const c of entry.pendingIce) { try { await entry.pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* noop */ } }
        entry.pendingIce = [];
      }
    } else if (sig.type === 'ice') {
      const candidate = sig.data as RTCIceCandidateInit;
      const entry = peersRef.current.get(sig.from.id);
      if (entry && entry.remoteSet) {
        try { await entry.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* noop */ }
      } else if (entry) {
        entry.pendingIce.push(candidate);
      }
    } else if (sig.type === 'join') {
      // A peer just joined our room — connect immediately instead of waiting
      // for the next roster heartbeat.
      await connectTo({ id: sig.from.id, name: sig.from.name, avatar_url: (sig.from as any).avatar_url, kind: kindRef.current });
    } else if (sig.type === 'reject' || sig.type === 'cancel' || sig.type === 'hangup' || sig.type === 'leave') {
      // Log first (finish() would otherwise mislabel a decline as cancelled).
      if (sig.type === 'reject') logCall('declined');
      else if (sig.type === 'hangup') logCall('ended');
      if (peersRef.current.has(sig.from.id)) {
        removePeer(sig.from.id);
      } else if (statusRef.current === 'incoming' || statusRef.current === 'calling') {
        // Still ringing with no media peer yet — the other side ended it, so
        // tear down instantly (stops the ringtone, dismisses the card).
        reset();
      }
    }
  }, [createPeer, connectTo, sendSignal, logCall, removePeer, reset]);

  useEffect(() => {
    if (!meId) return;
    let active = true;
    let timeoutId: number;
    const tick = async () => {
      try {
        const signals = await callService.poll();
        for (const sig of signals) { if (active) await handleSignal(sig); }
      } catch { /* noop */ }
      if (active) {
        // Poll fast while a call is live so connect/hangup feel instant; back
        // off to a lighter cadence when idle (just watching for invites).
        const delay = statusRef.current === 'idle' ? 1000 : 500;
        timeoutId = window.setTimeout(tick, delay);
      }
    };
    void tick();
    return () => { active = false; clearTimeout(timeoutId); };
  }, [meId, handleSignal]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { state, localStream, remoteStream, participants, start, accept, reject, hangup, toggleMute, toggleCam, addToCall };
}
