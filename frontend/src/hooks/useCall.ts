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
  // The transport (Laravel's TrimStrings middleware) strips the SDP's trailing
  // newline; without it Chrome rejects the final line ("Invalid SDP line").
  if (sdp && !sdp.endsWith('\r\n')) sdp += '\r\n';
  return new RTCSessionDescription({ type, sdp });
};

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
  const connectedAtRef = useRef(0);
  const loggedRef = useRef(false);

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
    connectedAtRef.current = 0;
    loggedRef.current = false;
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

  // Only the caller writes the call-log message, so it is never duplicated.
  const logCall = useCallback((outcome: 'ended' | 'missed' | 'declined' | 'cancelled') => {
    if (roleRef.current !== 'caller' || loggedRef.current || !peerRef.current) return;
    loggedRef.current = true;
    const duration = connectedAtRef.current ? Math.floor((Date.now() - connectedAtRef.current) / 1000) : 0;
    callService.log({ to_user_id: peerRef.current.id, kind: kindRef.current, outcome, duration });
  }, []);

  const buildPc = useCallback(() => {
    const pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = e => { if (e.candidate) sendSignal('ice', e.candidate.toJSON()); };
    const remote = new MediaStream();
    setRemoteStream(remote);
    pc.ontrack = e => { e.streams[0]?.getTracks().forEach(t => remote.addTrack(t)); };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') { clearTimer(); connectedAtRef.current = connectedAtRef.current || Date.now(); setState(s => ({ ...s, status: 'connected' })); }
      if (st === 'failed') { logCall('ended'); finish(); }
    };
    pcRef.current = pc;
    return pc;
  }, [sendSignal, finish, logCall]);

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
      if (nav.mediaDevices?.getUserMedia) {
        return nav.mediaDevices.getUserMedia(constraints);
      }
      return new Promise((resolve, reject) => {
        const legacy = nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia;
        legacy.call(nav, constraints, resolve, reject);
      });
    };

    let stream: MediaStream | null = null;
    let lastError: any = null;

    try {
      if (kind === 'video') {
        stream = await getUserMediaPromised({ audio: true, video: true });
      } else {
        stream = await getUserMediaPromised({ audio: true, video: false });
      }
    } catch (err1) {
      lastError = err1;
      try {
        stream = await getUserMediaPromised({ audio: true });
      } catch (err2) {
        lastError = err2 || err1;
      }
    }

    if (!stream) {
      throw lastError || new Error('UNKNOWN_MEDIA_ERROR');
    }

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
      const localDesc = pc.localDescription;
      sendSignal('offer', { sdp: { type: localDesc?.type || 'offer', sdp: localDesc?.sdp }, kind }, peer.id);
      timerRef.current = window.setTimeout(() => {
        if (statusRef.current === 'calling') { logCall('missed'); sendSignal('cancel'); finish(); }
      }, 45000);
    } catch (err: any) {
      console.error('Start call error:', err);
      const msg = formatMediaError(err, kind);
      toast.error(msg);
      reset(msg);
    }
  }, [getMedia, buildPc, sendSignal, finish, reset, logCall]);

  const accept = useCallback(async () => {
    if (statusRef.current !== 'incoming') return;
    const currentKind = kindRef.current || 'voice';
    roleRef.current = 'callee';
    setState(s => ({ ...s, status: 'connecting' }));
    try {
      const stream = await getMedia(currentKind);
      const pc = buildPc();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      if (pendingOffer.current) {
        const offerSdp = cleanSdp(pendingOffer.current);
        await pc.setRemoteDescription(offerSdp);
        remoteSet.current = true;
        for (const c of pendingIce.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* noop */ }
        }
        pendingIce.current = [];
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const localDesc = pc.localDescription;
      sendSignal('answer', { sdp: { type: localDesc?.type || 'answer', sdp: localDesc?.sdp } });
    } catch (err: any) {
      sendSignal('reject');
      console.error('Accept call error:', err);
      const msg = formatMediaError(err, currentKind);
      toast.error(msg);
      reset(msg);
    }
  }, [getMedia, buildPc, sendSignal, reset]);

  const reject = useCallback(() => { sendSignal('reject'); reset(); }, [sendSignal, reset]);
  const hangup = useCallback(() => {
    const calling = statusRef.current === 'calling';
    sendSignal(calling ? 'cancel' : 'hangup');
    logCall(calling ? 'cancelled' : 'ended');
    finish();
  }, [sendSignal, finish, logCall]);

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
      const payload = sig.data as { sdp: RTCSessionDescriptionInit; kind?: 'voice' | 'video' };
      const callKind = payload?.kind === 'video' ? 'video' : 'voice';
      callIdRef.current = sig.call_id;
      peerRef.current = sig.from;
      kindRef.current = callKind;
      pendingOffer.current = payload.sdp;
      remoteSet.current = false;
      pendingIce.current = [];
      setState({ status: 'incoming', peer: sig.from, kind: callKind, muted: false, camOff: false, error: null });
    } else if (sig.type === 'answer') {
      if (pc && sig.data) {
        const rawAnswer = (sig.data as { sdp: RTCSessionDescriptionInit }).sdp || sig.data;
        const answerSdp = cleanSdp(rawAnswer);
        await pc.setRemoteDescription(answerSdp);
        remoteSet.current = true;
        for (const c of pendingIce.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* noop */ }
        }
        pendingIce.current = [];
        setState(s => (s.status === 'calling' ? { ...s, status: 'connecting' } : s));
      }
    } else if (sig.type === 'ice') {
      const candidate = sig.data as RTCIceCandidateInit;
      if (pc && remoteSet.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* noop */ }
      } else {
        pendingIce.current.push(candidate);
      }
    } else if (sig.type === 'hangup' || sig.type === 'cancel' || sig.type === 'reject') {
      if (statusRef.current !== 'idle') {
        if (sig.type === 'reject') logCall('declined');
        else if (sig.type === 'hangup') logCall('ended');
        finish();
      }
    }
  }, [finish, logCall]);

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
