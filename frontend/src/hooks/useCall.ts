import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { callService, CallSignal, CallTransport, RosterParticipant, SignalType } from '../services/callService';
import { MessageUser } from '../services/messageService';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected' | 'ended';
type Peer = MessageUser & { role?: string };

export interface RemoteParticipant {
  id: number;
  name: string;
  avatar_url?: string | null;
  stream: MediaStream;
  cameraOff: boolean;
  muted: boolean;
  handUp: boolean;
}

export interface CallState {
  status: CallStatus;
  peer: Peer | null;
  kind: 'voice' | 'video';
  muted: boolean;
  camOff: boolean;
  isGroup: boolean;
  sharingScreen: boolean;
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
const idleState: CallState = { status: 'idle', peer: null, kind: 'voice', muted: false, camOff: false, isGroup: false, sharingScreen: false, error: null };
const CALL_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

// Flexible video constraints that work on all webcams (720p/1080p/480p) without OverconstrainedError
const CALL_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
  facingMode: 'user',
};

// The default WebRTC video bitrate is low, so a stream that looks fine in a
// small tile turns blocky when blown up to the main stage. Lift the encoder's
// ceiling so the spotlight view stays sharp (the encoder still adapts down on
// weak networks).
// Prefer more efficient video codecs without disrupting rtx payload associations
function preferVideoCodecs(pc: RTCPeerConnection) {
  try {
    const caps = (RTCRtpSender as unknown as { getCapabilities?: (k: string) => RTCRtpCapabilities | null }).getCapabilities?.('video');
    if (!caps?.codecs?.length) return;
    const ordered = caps.codecs.filter(c => !c.mimeType.toLowerCase().includes('av1'));
    pc.getTransceivers().forEach((t) => {
      const isVideo = t.sender.track?.kind === 'video' || t.receiver.track?.kind === 'video';
      if (!isVideo) return;
      try { t.setCodecPreferences(ordered); } catch { /* unsupported browser */ }
    });
  } catch { /* noop */ }
}

const MAX_VIDEO_BITRATE = 4_000_000; // 4 Mbps
async function boostVideoSenders(pc: RTCPeerConnection) {
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== 'video') continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      params.encodings[0].maxBitrate = MAX_VIDEO_BITRATE;
      params.encodings[0].maxFramerate = 30;
      // Never shrink the picture — drop frames under pressure instead — so the
      // spotlight stays sharp rather than going soft when blown up.
      params.encodings[0].scaleResolutionDownBy = 1;
      (params as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference = 'maintain-resolution';
      await sender.setParameters(params);
    } catch { /* setParameters can race the negotiation; ignore */ }
  }
}

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
  cameraOff: boolean;
  muted: boolean;
  handUp: boolean;
}

export interface UseCallOpts {
  transport?: CallTransport;                         // guest sessions inject their own
  autoJoin?: { callId: string; kind: 'voice' | 'video'; peerName?: string };
}

export function useCall(meId?: number, opts: UseCallOpts = {}) {
  const svc: CallTransport = opts.transport || callService;
  const [state, setState] = useState<CallState>(idleState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; from: string }[]>([]);
  const [messages, setMessages] = useState<{ id: string; from: string; text: string; mine: boolean; at: number }[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const handRef = useRef(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [captions, setCaptions] = useState<{ id: number; name: string; text: string; at: number }[]>([]);
  const recognitionRef = useRef<any>(null);   // browser SpeechRecognition while captions are on

  const peersRef = useRef<Map<number, PeerConn>>(new Map());
  const roomRef = useRef('');
  const primaryPeerRef = useRef<Peer | null>(null);      // first invited peer (state.peer + 1:1 call-log)
  const kindRef = useRef<'voice' | 'video'>('voice');
  const roleRef = useRef<'caller' | 'callee' | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);   // active screen-share track
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);   // camera track parked while sharing
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
      id, name: e.meta.name, avatar_url: e.meta.avatar_url, stream: e.stream, cameraOff: e.cameraOff, muted: e.muted, handUp: e.handUp,
    }));
    setParticipants(list);
    setRemoteStream(list[0]?.stream || null);
  }, []);

  // A floating emoji reaction that fades itself out after a few seconds.
  const pushReaction = useCallback((emoji: string, from: string) => {
    const id = randomId();
    setReactions(rs => [...rs, { id, emoji, from }].slice(-12));
    window.setTimeout(() => setReactions(rs => rs.filter(r => r.id !== id)), 4500);
  }, []);

  const cleanup = useCallback(() => {
    clearTimer();
    stopHeartbeat();
    if (roomRef.current) svc.leave(roomRef.current);
    peersRef.current.forEach(e => { try { e.pc.close(); } catch { /* noop */ } });
    peersRef.current.clear();
    try { screenTrackRef.current?.stop(); } catch { /* noop */ }
    try { cameraTrackRef.current?.stop(); } catch { /* noop */ }
    screenTrackRef.current = null;
    cameraTrackRef.current = null;
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
    setReactions([]);
    setMessages([]);
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    recognitionRef.current = null;
    handRef.current = false;
    setHandRaised(false);
    setCaptionsOn(false);
    setCaptions([]);
  }, []);

  const reset = useCallback((error: string | null = null) => {
    cleanup();
    primaryPeerRef.current = null;
    setState({ ...idleState, error });
  }, [cleanup]);

  const sendSignal = useCallback((type: SignalType, data: unknown, toId: number) => {
    if (!toId || !roomRef.current) return;
    svc.signal({ call_id: roomRef.current, to_user_id: toId, type, data }).catch(() => { /* noop */ });
  }, []);

  const logCall = useCallback((outcome: 'ended' | 'missed' | 'declined' | 'cancelled') => {
    if (loggedRef.current || groupRef.current || !primaryPeerRef.current) return;
    loggedRef.current = true;
    const duration = connectedAtRef.current ? Math.floor((Date.now() - connectedAtRef.current) / 1000) : 0;
    svc.log({ to_user_id: primaryPeerRef.current.id, kind: kindRef.current, outcome, duration });
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
    const entry: PeerConn = { pc, stream, remoteSet: false, pendingIce: [], meta: { name: meta?.name || 'Guest', avatar_url: meta?.avatar_url }, cameraOff: false, muted: false, handUp: false };
    localRef.current?.getTracks().forEach(t => pc.addTrack(t, localRef.current!));
    preferVideoCodecs(pc);   // before any offer/answer is built
    pc.onicecandidate = e => { if (e.candidate) sendSignal('ice', e.candidate.toJSON(), id); };
    pc.ontrack = e => {
      // Play remote frames the moment they arrive instead of buffering them —
      // this is most of the perceived delay on a shared screen.
      try {
        const r = e.receiver as RTCRtpReceiver & { playoutDelayHint?: number; jitterBufferTarget?: number };
        r.playoutDelayHint = 0;
        r.jitterBufferTarget = 0;
      } catch { /* noop */ }
      if (e.track) stream.addTrack(e.track);
      if (e.streams[0]) {
        e.streams[0].getTracks().forEach(t => stream.addTrack(t));
      }
      entry.stream = new MediaStream(stream.getTracks());
      bumpParticipants();
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        clearTimer();
        connectedAtRef.current = connectedAtRef.current || Date.now();
        setState(s => (s.status === 'connected' ? s : { ...s, status: 'connected' }));
        void boostVideoSenders(pc);   // keep the spotlight view sharp
      }
      if (st === 'disconnected') {
        // A browser/tab close has no chance to send a hangup signal. Give a
        // brief grace period for a Wi-Fi hiccup, then end the abandoned peer.
        window.setTimeout(() => {
          if (pc.connectionState === 'disconnected') removePeer(id);
        }, 3000);
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
    if (kind === 'video') {
      try {
        stream = await getUserMediaPromised({ audio: CALL_AUDIO_CONSTRAINTS, video: CALL_VIDEO_CONSTRAINTS });
      } catch (err1) {
        lastError = err1;
        try {
          stream = await getUserMediaPromised({ audio: CALL_AUDIO_CONSTRAINTS, video: true });
        } catch (err2) {
          lastError = err2;
        }
      }
    }
    if (!stream) {
      try {
        stream = await getUserMediaPromised({ audio: CALL_AUDIO_CONSTRAINTS, video: false });
      } catch (err3) {
        try { stream = await getUserMediaPromised({ audio: true }); } catch (err4) { lastError = err4 || err3 || lastError; }
      }
    }
    if (!stream) throw lastError || new Error('UNKNOWN_MEDIA_ERROR');
    // Hint the encoder to keep the picture sharp rather than smooth.
    const vt = stream.getVideoTracks()[0];
    if (vt) vt.contentHint = 'detail';
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const heartbeat = useCallback(async () => {
    if (!roomRef.current) return;
    try {
      const roster = await svc.join({ call_id: roomRef.current, kind: kindRef.current });
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
    setState({ status: 'calling', peer, kind, muted: false, camOff: false, isGroup: false, sharingScreen: false, error: null });
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

  // Proactively join a known room (used by an external guest who opened a link
  // rather than receiving an invite). Roster heartbeat wires up everyone.
  const joinRoom = useCallback(async (callId: string, kind: 'voice' | 'video', peerName = 'Meeting') => {
    if (statusRef.current !== 'idle') return;
    roomRef.current = callId;
    kindRef.current = kind;
    roleRef.current = 'callee';
    groupRef.current = true;
    const placeholder = { id: 0, name: peerName } as Peer;
    primaryPeerRef.current = placeholder;
    setState({ status: 'connecting', peer: placeholder, kind, muted: false, camOff: false, isGroup: true, sharingScreen: false, error: null });
    try {
      await getMedia(kind);
      startHeartbeat();
    } catch (err: any) {
      const msg = formatMediaError(err, kind);
      toast.error(msg);
      reset(msg);
    }
  }, [getMedia, startHeartbeat, reset]);

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
    if (track) {
      track.enabled = !track.enabled;
      const nextMuted = !track.enabled;
      setState(s => ({ ...s, muted: nextMuted }));
      // Audio tracks can remain technically live while muted, so tell every
      // participant explicitly to show the same mute status on this tile.
      peersRef.current.forEach((_entry, id) => sendSignal('mute', { muted: nextMuted }, id));
    }
  }, [sendSignal]);
  const toggleCam = useCallback(async () => {
    // `track.enabled = false` only sends a black frame; browsers keep the
    // physical camera reserved, leaving the camera light on. Release the track
    // completely and obtain a fresh one when the user turns it back on.
    const parkedCamera = screenTrackRef.current ? cameraTrackRef.current : null;
    const track = parkedCamera || localRef.current?.getVideoTracks()[0];

    if (track) {
      if (screenTrackRef.current) {
        // While presenting, the camera is parked outside localStream.
        try { track.stop(); } catch { /* noop */ }
        cameraTrackRef.current = null;
      } else {
        for (const entry of peersRef.current.values()) {
          const sender = entry.pc.getSenders().find(s => s.track === track);
          if (sender) { try { await sender.replaceTrack(null); } catch { /* noop */ } }
        }
        try { localRef.current?.removeTrack(track); } catch { /* noop */ }
        try { track.stop(); } catch { /* noop */ }
        if (localRef.current) setLocalStream(new MediaStream(localRef.current.getTracks()));
      }
      setState(s => ({ ...s, camOff: true }));
      // WebRTC can take a moment to emit a remote track mute event. Send the
      // UI state as well, so the other tile hides its last frame immediately.
      peersRef.current.forEach((_entry, id) => sendSignal('camera', { off: true }, id));
      return;
    }

    let camera: MediaStream;
    try {
      camera = await navigator.mediaDevices.getUserMedia({ video: CALL_VIDEO_CONSTRAINTS });
    } catch (err: any) {
      toast.error(formatMediaError(err, 'video'));
      return;
    }
    const nextTrack = camera.getVideoTracks()[0];
    if (!nextTrack) return;

    if (screenTrackRef.current) {
      // Keep presenting, but retain the fresh camera for when sharing ends.
      cameraTrackRef.current = nextTrack;
    } else if (localRef.current) {
      localRef.current.addTrack(nextTrack);
      for (const [id, entry] of peersRef.current) {
        const sender = entry.pc.getSenders().find(s => s.track?.kind === 'video')
          || entry.pc.getTransceivers().find(t => !t.sender.track && t.receiver.track?.kind === 'video')?.sender;
        try {
          if (sender) {
            await sender.replaceTrack(nextTrack);
          } else {
            entry.pc.addTrack(nextTrack, localRef.current);
            const offer = await entry.pc.createOffer();
            await entry.pc.setLocalDescription(offer);
            sendSignal('offer', { sdp: { type: entry.pc.localDescription?.type || 'offer', sdp: entry.pc.localDescription?.sdp }, kind: 'video' }, id);
          }
        } catch { /* noop */ }
      }
      setLocalStream(new MediaStream(localRef.current.getTracks()));
    }
    setState(s => ({ ...s, camOff: false }));
    peersRef.current.forEach((_entry, id) => sendSignal('camera', { off: false }, id));
  }, [sendSignal]);

  // Swap the outgoing video track back to the camera (or nothing) and drop the
  // screen track. Uses replaceTrack, so no SDP renegotiation is needed.
  const stopScreenShare = useCallback(() => {
    const screen = screenTrackRef.current;
    const cam = cameraTrackRef.current;
    peersRef.current.forEach(e => {
      const sender = e.pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) { try { sender.replaceTrack(cam || null); } catch { /* noop */ } }
    });
    if (localRef.current) {
      if (screen) { try { localRef.current.removeTrack(screen); } catch { /* noop */ } }
      if (cam) { try { localRef.current.addTrack(cam); } catch { /* noop */ } }
      setLocalStream(new MediaStream(localRef.current.getTracks()));
    }
    try { screen?.stop(); } catch { /* noop */ }
    screenTrackRef.current = null;
    cameraTrackRef.current = null;
    setState(s => ({ ...s, sharingScreen: false }));
  }, []);

  // Share the screen with everyone in the call. In a video call we swap the
  // camera track (replaceTrack, no renegotiation). In a voice call there is no
  // video sender yet, so we add the screen track and renegotiate that peer —
  // and upgrade the UI to video so the screen is actually shown.
  const toggleScreenShare = useCallback(async () => {
    if (screenTrackRef.current) { stopScreenShare(); return; }
    if (statusRef.current !== 'connected' && statusRef.current !== 'connecting') return;
    const md = navigator.mediaDevices as any;
    if (!md?.getDisplayMedia) { toast.error('Screen sharing is not supported in this browser.'); return; }
    let screenTrack: MediaStreamTrack | null = null;
    try {
      // Ask for 30fps — the browser default for screen capture is often 5-15fps, which reads as lag.
      const display: MediaStream = await md.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 30 } }, audio: false });
      screenTrack = display.getVideoTracks()[0] || null;
    } catch { return; /* user cancelled the picker */ }
    if (!screenTrack) return;

    cameraTrackRef.current = localRef.current?.getVideoTracks()[0] || null;

    // Video calls already have a sender to swap; voice calls need a new track
    // added + a renegotiation offer to that peer.
    const toRenegotiate: Array<[number, PeerConn]> = [];
    peersRef.current.forEach((e, id) => {
      const sender = e.pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) { try { sender.replaceTrack(screenTrack!); } catch { /* noop */ } }
      else { try { e.pc.addTrack(screenTrack!, localRef.current || new MediaStream([screenTrack!])); toRenegotiate.push([id, e]); } catch { /* noop */ } }
    });

    screenTrackRef.current = screenTrack;
    // Show the shared screen in our own local tile and switch the UI to video.
    if (localRef.current) {
      if (cameraTrackRef.current) { try { localRef.current.removeTrack(cameraTrackRef.current); } catch { /* noop */ } }
      try { localRef.current.addTrack(screenTrack); } catch { /* noop */ }
      setLocalStream(new MediaStream(localRef.current.getTracks()));
    }
    kindRef.current = 'video';
    setState(s => ({ ...s, sharingScreen: true, kind: 'video' }));

    // Renegotiate the voice peers we just added a video track to.
    for (const [id, e] of toRenegotiate) {
      try {
        preferVideoCodecs(e.pc);
        const offer = await e.pc.createOffer();
        await e.pc.setLocalDescription(offer);
        sendSignal('offer', { sdp: { type: e.pc.localDescription?.type || 'offer', sdp: e.pc.localDescription?.sdp }, kind: 'video' }, id);
        void boostVideoSenders(e.pc);
      } catch { /* noop */ }
    }

    // The browser's own "Stop sharing" bar ends the track — revert cleanly.
    screenTrack.onended = () => stopScreenShare();
  }, [stopScreenShare, sendSignal]);

  // Upgrade an ongoing voice call to video: turn the camera on and renegotiate
  // with every peer (we add a video track, so we send a fresh offer). The peer
  // learns it's now a video call from the offer's `kind` and shows our video.
  const switchToVideo = useCallback(async () => {
    if (kindRef.current === 'video') return;
    if (statusRef.current !== 'connected' && statusRef.current !== 'connecting') return;
    let camTrack: MediaStreamTrack | null = null;
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: CALL_VIDEO_CONSTRAINTS });
      camTrack = cam.getVideoTracks()[0] || null;
    } catch (err: any) {
      toast.error(formatMediaError(err, 'video'));
      return;
    }
    if (!camTrack) return;

    if (localRef.current) {
      try { localRef.current.addTrack(camTrack); } catch { /* noop */ }
      setLocalStream(new MediaStream(localRef.current.getTracks()));
    }
    kindRef.current = 'video';
    setState(s => ({ ...s, kind: 'video', camOff: false }));

    // Add the track to each peer and renegotiate — we are the offerer here.
    for (const [id, entry] of peersRef.current) {
      try {
        entry.pc.addTrack(camTrack, localRef.current!);
        preferVideoCodecs(entry.pc);
        const offer = await entry.pc.createOffer();
        await entry.pc.setLocalDescription(offer);
        sendSignal('offer', { sdp: { type: entry.pc.localDescription?.type || 'offer', sdp: entry.pc.localDescription?.sdp }, kind: 'video' }, id);
        void boostVideoSenders(entry.pc);
      } catch { /* noop */ }
    }
  }, [sendSignal]);

  // Broadcast an emoji reaction to everyone (and float it on our own screen).
  // A live caption line per speaker; each line fades out on its own.
  const pushCaption = useCallback((id: number, name: string, text: string) => {
    const at = Date.now();
    setCaptions(cs => [...cs.filter(c => c.id !== id), { id, name, text, at }].slice(-3));
    window.setTimeout(() => setCaptions(cs => cs.filter(c => !(c.id === id && c.at === at))), 6000);
  }, []);

  // Raise / lower hand — everyone in the call sees it on your tile.
  const toggleHand = useCallback(() => {
    const up = !handRef.current;
    handRef.current = up;
    setHandRaised(up);
    peersRef.current.forEach((_e, id) => sendSignal('hand', { up }, id));
  }, [sendSignal]);

  const stopRecognition = useCallback(() => {
    const r = recognitionRef.current;
    recognitionRef.current = null;
    try { r?.stop(); } catch { /* noop */ }
  }, []);

  // Live captions via the browser's own speech recognition (free, on-device in
  // Chrome). Each participant transcribes their own mic and broadcasts the text.
  const toggleCaptions = useCallback(() => {
    if (recognitionRef.current) { stopRecognition(); setCaptionsOn(false); return; }
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { toast.error('Live captions need Chrome (speech recognition is not supported in this browser).'); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    let last = '';
    rec.onresult = (ev: any) => {
      const res = ev.results[ev.results.length - 1];
      const text = String(res?.[0]?.transcript || '').trim();
      if (!text || text === last) return;
      last = text;
      pushCaption(meIdRef.current ?? 0, 'You', text);
      peersRef.current.forEach((_e, id) => sendSignal('caption', { text, final: Boolean(res.isFinal) }, id));
    };
    rec.onend = () => { if (recognitionRef.current === rec) { try { rec.start(); } catch { /* noop */ } } };
    rec.onerror = () => { /* onend restarts while captions stay on */ };
    recognitionRef.current = rec;
    try { rec.start(); setCaptionsOn(true); }
    catch { recognitionRef.current = null; toast.error('Could not start captions.'); }
  }, [pushCaption, sendSignal, stopRecognition]);

  const sendReaction = useCallback((emoji: string) => {
    pushReaction(emoji, 'You');
    peersRef.current.forEach((_e, id) => sendSignal('reaction', { emoji }, id));
  }, [pushReaction, sendSignal]);

  // Send an in-call chat message to everyone.
  const sendChat = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setMessages(m => [...m, { id: randomId(), from: 'You', text: t, mine: true, at: Date.now() }]);
    peersRef.current.forEach((_e, id) => sendSignal('chat', { text: t }, id));
  }, [sendSignal]);

  const handleSignal = useCallback(async (sig: CallSignal) => {
    if (sig.type === 'invite') {
      if (statusRef.current !== 'idle') {
        // Busy — politely decline the new caller without disturbing the active call.
        svc.signal({ call_id: sig.call_id, to_user_id: sig.from.id, type: 'reject' }).catch(() => { /* noop */ });
        return;
      }
      const payload = sig.data as { call_id: string; kind?: 'voice' | 'video' };
      const callKind = payload?.kind === 'video' ? 'video' : 'voice';
      pendingInvite.current = { room: payload.call_id, kind: callKind, from: sig.from };
      primaryPeerRef.current = sig.from;
      kindRef.current = callKind;
      setState({ status: 'incoming', peer: sig.from, kind: callKind, muted: false, camOff: false, isGroup: false, sharingScreen: false, error: null });
      // Safety net: if the cancel signal is ever missed, stop ringing anyway.
      clearTimer();
      timerRef.current = window.setTimeout(() => { if (statusRef.current === 'incoming') reset(); }, 50000);
      return;
    }
    if (statusRef.current === 'idle') return;

    if (sig.type === 'camera' || sig.type === 'mute') {
      const entry = peersRef.current.get(sig.from.id);
      if (entry) {
        if (sig.type === 'camera') entry.cameraOff = Boolean((sig.data as { off?: boolean } | null)?.off);
        else entry.muted = Boolean((sig.data as { muted?: boolean } | null)?.muted);
        bumpParticipants();
      }
    } else if (sig.type === 'hand') {
      const entry = peersRef.current.get(sig.from.id);
      if (entry) {
        entry.handUp = Boolean((sig.data as { up?: boolean } | null)?.up);
        bumpParticipants();
        if (entry.handUp) toast(`✋ ${sig.from.name} raised their hand`, { duration: 4000 });
      }
    } else if (sig.type === 'caption') {
      const text = (sig.data as { text?: string } | null)?.text;
      if (text) pushCaption(sig.from.id, sig.from.name, text);
    } else if (sig.type === 'reaction') {
      const emoji = (sig.data as { emoji?: string } | null)?.emoji;
      if (emoji) pushReaction(emoji, sig.from.name);
    } else if (sig.type === 'chat') {
      const text = (sig.data as { text?: string } | null)?.text;
      if (text) setMessages(m => [...m, { id: randomId(), from: sig.from.name, text, mine: false, at: Date.now() }]);
    } else if (sig.type === 'offer') {
      const data = sig.data as { sdp: RTCSessionDescriptionInit; kind?: 'voice' | 'video' };
      // A renegotiation offer carrying kind:'video' means the other side turned
      // their camera on — upgrade our UI so their video is shown.
      if (data?.kind === 'video' && kindRef.current !== 'video') {
        kindRef.current = 'video';
        setState(s => ({ ...s, kind: 'video' }));
      }
      const raw = data?.sdp || sig.data;
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
  }, [createPeer, connectTo, sendSignal, logCall, removePeer, reset, bumpParticipants, pushReaction, pushCaption]);

  useEffect(() => {
    if (!meId) return;
    let active = true;
    let timeoutId: number;
    const tick = async () => {
      try {
        const signals = await svc.poll();
        for (const sig of signals) { if (active) await handleSignal(sig); }
      } catch { /* noop */ }
      if (active) {
        // Poll fast while a call is live so connect/hangup feel instant; back
        // off to a lighter cadence when idle (just watching for invites).
        const delay = statusRef.current === 'idle' ? 1000 : 250;
        timeoutId = window.setTimeout(tick, delay);
      }
    };
    void tick();
    return () => { active = false; clearTimeout(timeoutId); };
  }, [meId, handleSignal]);

  useEffect(() => () => cleanup(), [cleanup]);

  // A guest session auto-joins its call once, on mount.
  useEffect(() => {
    if (opts.autoJoin) void joinRoom(opts.autoJoin.callId, opts.autoJoin.kind, opts.autoJoin.peerName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, localStream, remoteStream, participants, reactions, messages, start, accept, reject, hangup, toggleMute, toggleCam, toggleScreenShare, switchToVideo, sendReaction, sendChat, handRaised, toggleHand, captionsOn, toggleCaptions, captions, addToCall, joinRoom, getCallId: () => roomRef.current };
}
