import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { callService, CallSignal, SignalType } from '../services/callService';
import { MessageUser } from '../services/messageService';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected' | 'ended';
type Peer = MessageUser & { role?: string };

export interface CallState {
  status: CallStatus;
  peer: Peer | null;
  kind: 'voice' | 'video';
  muted: boolean;
  camOff: boolean;
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
const idleState: CallState = { status: 'idle', peer: null, kind: 'voice', muted: false, camOff: false, error: null };

export function useCall(meId?: number) {
  const [state, setState] = useState<CallState>(idleState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef('');
  const peerRef = useRef<Peer | null>(null);
  const kindRef = useRef<'voice' | 'video'>('voice');
  const roleRef = useRef<'caller' | 'callee' | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);
  const remoteSet = useRef(false);
  const statusRef = useRef<CallStatus>('idle');
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => { statusRef.current = state.status; }, [state.status]);

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = undefined; } };

  const cleanup = useCallback(() => {
    clearTimer();
    try { pcRef.current?.getSenders().forEach(s => s.track?.stop()); } catch { /* noop */ }
    try { pcRef.current?.close(); } catch { /* noop */ }
    pcRef.current = null;
    localRef.current?.getTracks().forEach(t => t.stop());
    localRef.current = null;
    pendingIce.current = [];
    pendingOffer.current = null;
    remoteSet.current = false;
    roleRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const reset = useCallback((error: string | null = null) => {
    cleanup();
    peerRef.current = null;
    callIdRef.current = '';
    setState({ ...idleState, error });
  }, [cleanup]);

  // Move to "ended" briefly, then back to idle so the UI can show a closing frame.
  const finish = useCallback(() => {
    cleanup();
    setState(s => ({ ...s, status: 'ended' }));
    window.setTimeout(() => { peerRef.current = null; callIdRef.current = ''; setState(idleState); }, 1200);
  }, [cleanup]);

  const sendSignal = useCallback((type: SignalType, data?: unknown, toId?: number) => {
    const to = toId ?? peerRef.current?.id;
    if (!to || !callIdRef.current) return;
    callService.signal({ call_id: callIdRef.current, to_user_id: to, type, data }).catch(() => { /* noop */ });
  }, []);

  const buildPc = useCallback(() => {
    const pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = e => { if (e.candidate) sendSignal('ice', e.candidate.toJSON()); };
    const remote = new MediaStream();
    setRemoteStream(remote);
    pc.ontrack = e => { e.streams[0]?.getTracks().forEach(t => remote.addTrack(t)); };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') { clearTimer(); setState(s => ({ ...s, status: 'connected' })); }
      if (st === 'failed') finish();
    };
    pcRef.current = pc;
    return pc;
  }, [sendSignal, finish]);

  const getMedia = useCallback(async (kind: 'voice' | 'video') => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const start = useCallback(async (peer: Peer, kind: 'voice' | 'video') => {
    if (statusRef.current !== 'idle') return;
    callIdRef.current = randomId();
    peerRef.current = peer;
    kindRef.current = kind;
    roleRef.current = 'caller';
    setState({ status: 'calling', peer, kind, muted: false, camOff: false, error: null });
    try {
      const stream = await getMedia(kind);
      const pc = buildPc();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal('offer', { sdp: pc.localDescription, kind }, peer.id);
      timerRef.current = window.setTimeout(() => {
        if (statusRef.current === 'calling') { sendSignal('cancel'); finish(); }
      }, 45000);
    } catch {
      toast.error('Camera / microphone not available, or permission was denied.');
      reset();
    }
  }, [getMedia, buildPc, sendSignal, finish, reset]);

  const accept = useCallback(async () => {
    if (statusRef.current !== 'incoming') return;
    roleRef.current = 'callee';
    setState(s => ({ ...s, status: 'connecting' }));
    try {
      const stream = await getMedia(kindRef.current);
      const pc = buildPc();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      if (pendingOffer.current) {
        await pc.setRemoteDescription(pendingOffer.current);
        remoteSet.current = true;
        for (const c of pendingIce.current) { try { await pc.addIceCandidate(c); } catch { /* noop */ } }
        pendingIce.current = [];
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal('answer', { sdp: pc.localDescription });
    } catch {
      sendSignal('reject');
      toast.error('Camera / microphone not available, or permission was denied.');
      reset();
    }
  }, [getMedia, buildPc, sendSignal, reset]);

  const reject = useCallback(() => { sendSignal('reject'); reset(); }, [sendSignal, reset]);
  const hangup = useCallback(() => {
    sendSignal(statusRef.current === 'calling' ? 'cancel' : 'hangup');
    finish();
  }, [sendSignal, finish]);

  const toggleMute = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setState(s => ({ ...s, muted: !track.enabled })); }
  }, []);
  const toggleCam = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setState(s => ({ ...s, camOff: !track.enabled })); }
  }, []);

  const handleSignal = useCallback(async (sig: CallSignal) => {
    const pc = pcRef.current;
    if (sig.type === 'offer') {
      if (statusRef.current !== 'idle') {
        // Busy — politely decline the new caller without disturbing the active call.
        callService.signal({ call_id: sig.call_id, to_user_id: sig.from.id, type: 'reject' }).catch(() => { /* noop */ });
        return;
      }
      const payload = sig.data as { sdp: RTCSessionDescriptionInit; kind: 'voice' | 'video' };
      callIdRef.current = sig.call_id;
      peerRef.current = sig.from;
      kindRef.current = payload.kind;
      pendingOffer.current = payload.sdp;
      remoteSet.current = false;
      pendingIce.current = [];
      setState({ status: 'incoming', peer: sig.from, kind: payload.kind, muted: false, camOff: false, error: null });
    } else if (sig.type === 'answer') {
      if (pc && sig.data) {
        await pc.setRemoteDescription((sig.data as { sdp: RTCSessionDescriptionInit }).sdp);
        remoteSet.current = true;
        for (const c of pendingIce.current) { try { await pc.addIceCandidate(c); } catch { /* noop */ } }
        pendingIce.current = [];
        setState(s => (s.status === 'calling' ? { ...s, status: 'connecting' } : s));
      }
    } else if (sig.type === 'ice') {
      const candidate = sig.data as RTCIceCandidateInit;
      if (pc && remoteSet.current) { try { await pc.addIceCandidate(candidate); } catch { /* noop */ } }
      else pendingIce.current.push(candidate);
    } else if (sig.type === 'hangup' || sig.type === 'cancel' || sig.type === 'reject') {
      if (statusRef.current !== 'idle') finish();
    }
  }, [finish]);

  useEffect(() => {
    if (!meId) return;
    let active = true;
    const tick = async () => {
      try {
        const signals = await callService.poll();
        for (const sig of signals) { if (active) await handleSignal(sig); }
      } catch { /* noop */ }
    };
    const id = window.setInterval(tick, 1500);
    return () => { active = false; clearInterval(id); };
  }, [meId, handleSignal]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { state, localStream, remoteStream, start, accept, reject, hangup, toggleMute, toggleCam };
}
