import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Room, RoomEvent, Track, VideoPresets } from 'livekit-client';
import type { AudioCaptureOptions } from 'livekit-client';
import type { RemoteParticipant as LKRemote, Participant as LKParticipant } from 'livekit-client';
import { callService, CallSignal, CallTransport } from '../services/callService';
import { MessageUser } from '../services/messageService';
import type { useCall, CallState, CallStatus, RemoteParticipant } from './useCall';

/**
 * Calls on top of LiveKit (an SFU media server). Every participant uploads ONE
 * stream and the server fans it out, so 5–20 person calls stay smooth — unlike
 * the old browser mesh where each person uploaded a copy per peer.
 *
 * What still rides on our own HTTP signalling: ringing (invite / reject /
 * cancel / hangup), call logs and guest links. Media, mute/camera state,
 * reactions, chat, raised hands and captions all go through LiveKit.
 *
 * Returns exactly the shape of `useCall`, so CallScreen / CallContext /
 * GuestCallPage do not need to change.
 */

type Peer = MessageUser & { role?: string };
type CallApi = ReturnType<typeof useCall>;

export interface UseLiveKitCallOpts {
  transport?: CallTransport;                                   // guests inject their token-scoped transport
  getToken?: (callId: string, kind: 'voice' | 'video') => Promise<{ url: string; token: string }>;
  autoJoin?: { callId: string; kind: 'voice' | 'video'; peerName?: string };
}

const randomId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const idleState: CallState = { status: 'idle', peer: null, kind: 'voice', muted: false, camOff: false, isGroup: false, sharingScreen: false, error: null };
const CLEAN_MIC: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};
// Identities are "u<id>" for users and "g<id>" for guests.
const numericId = (identity: string) => Number(identity.replace(/^[ug]/, '')) || 0;
// A remote screen-share is shown as its own "(presenting)" tile.
const SCREEN_ID_OFFSET = 1_000_000;

type DataMsg =
  | { t: 'reaction'; emoji: string }
  | { t: 'chat'; text: string }
  | { t: 'hand'; up: boolean }
  | { t: 'caption'; text: string };

export function useLiveKitCall(meId?: number, opts: UseLiveKitCallOpts = {}): CallApi {
  const svc: CallTransport = opts.transport || callService;
  const getToken = opts.getToken || ((callId: string, kind: 'voice' | 'video') => callService.livekitToken(callId, kind));

  const [state, setState] = useState<CallState>(idleState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; from: string }[]>([]);
  const [messages, setMessages] = useState<{ id: string; from: string; text: string; mine: boolean; at: number }[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [captions, setCaptions] = useState<{ id: number; name: string; text: string; at: number }[]>([]);

  const roomRef = useRef<Room | null>(null);
  const roomIdRef = useRef('');
  const kindRef = useRef<'voice' | 'video'>('voice');
  const statusRef = useRef<CallStatus>('idle');
  const primaryPeerRef = useRef<Peer | null>(null);
  const pendingInvite = useRef<{ room: string; kind: 'voice' | 'video'; from: Peer } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const connectedAtRef = useRef(0);
  const loggedRef = useRef(false);
  const groupRef = useRef(false);
  const handsRef = useRef<Set<number>>(new Set());
  const handRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const streamCache = useRef<Map<string, { key: string; stream: MediaStream }>>(new Map());
  const meIdRef = useRef<number | undefined>(meId);

  useEffect(() => { meIdRef.current = meId; }, [meId]);
  useEffect(() => { statusRef.current = state.status; }, [state.status]);

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = undefined; } };

  // Reuse a MediaStream while its set of tracks is unchanged, so <video>/<audio>
  // elements are not re-attached on every state sync.
  const cachedStream = (cacheKey: string, tracks: (MediaStreamTrack | undefined)[]) => {
    const live = tracks.filter((t): t is MediaStreamTrack => !!t);
    const key = live.map(t => t.id).join('|');
    const hit = streamCache.current.get(cacheKey);
    if (hit && hit.key === key) return hit.stream;
    const stream = new MediaStream(live);
    streamCache.current.set(cacheKey, { key, stream });
    return stream;
  };

  // ── Sync React state from the LiveKit room ─────────────────────────────
  const sync = useCallback(() => {
    const room = roomRef.current;
    if (!room) { setParticipants([]); setRemoteStream(null); setLocalStream(null); return; }

    const list: RemoteParticipant[] = [];
    room.remoteParticipants.forEach((p: LKRemote) => {
      const id = numericId(p.identity);
      const name = p.name || 'Guest';
      const cam = p.getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack;
      const mic = p.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;
      const screen = p.getTrackPublication(Track.Source.ScreenShare)?.track?.mediaStreamTrack;
      if (screen) {
        list.unshift({
          id: id + SCREEN_ID_OFFSET, name: `${name} (presenting)`, avatar_url: null,
          stream: cachedStream(`s${id}`, [screen]), cameraOff: false, muted: true, handUp: false,
        });
      }
      list.push({
        id, name, avatar_url: null,
        stream: cachedStream(`p${id}`, [mic, cam]),
        cameraOff: !p.isCameraEnabled, muted: !p.isMicrophoneEnabled, handUp: handsRef.current.has(id),
      });
    });
    setParticipants(list);
    setRemoteStream(list[0]?.stream || null);

    const lp = room.localParticipant;
    const screen = lp.getTrackPublication(Track.Source.ScreenShare)?.track?.mediaStreamTrack;
    const cam = lp.getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack;
    const track = screen || cam;
    setLocalStream(track ? cachedStream('local', [track]) : null);
    setState(s => ({
      ...s,
      muted: !lp.isMicrophoneEnabled,
      camOff: !lp.isCameraEnabled,
      sharingScreen: lp.isScreenShareEnabled,
    }));
  }, []);

  const teardownRoom = useCallback(() => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) { room.removeAllListeners(); void room.disconnect(); }
    streamCache.current.clear();
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    recognitionRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    clearTimer();
    teardownRoom();
    roomIdRef.current = '';
    connectedAtRef.current = 0;
    loggedRef.current = false;
    groupRef.current = false;
    pendingInvite.current = null;
    handsRef.current = new Set();
    handRef.current = false;
    setParticipants([]);
    setLocalStream(null);
    setRemoteStream(null);
    setReactions([]);
    setMessages([]);
    setHandRaised(false);
    setCaptionsOn(false);
    setCaptions([]);
  }, [teardownRoom]);

  const reset = useCallback((error: string | null = null) => {
    cleanup();
    primaryPeerRef.current = null;
    setState({ ...idleState, error });
  }, [cleanup]);

  const sendSignal = useCallback((type: CallSignal['type'], data: unknown, toId: number) => {
    if (!toId || !roomIdRef.current) return;
    svc.signal({ call_id: roomIdRef.current, to_user_id: toId, type, data }).catch(() => { /* noop */ });
  }, []);

  const logCall = useCallback((outcome: 'ended' | 'missed' | 'declined' | 'cancelled') => {
    if (loggedRef.current || groupRef.current || !primaryPeerRef.current) return;
    loggedRef.current = true;
    const duration = connectedAtRef.current ? Math.floor((Date.now() - connectedAtRef.current) / 1000) : 0;
    svc.log({ to_user_id: primaryPeerRef.current.id, kind: kindRef.current, outcome, duration });
  }, []);

  const finish = useCallback(() => {
    if (!loggedRef.current && primaryPeerRef.current && !groupRef.current) {
      if (statusRef.current === 'connected') logCall('ended');
      else if (statusRef.current === 'calling') logCall('cancelled');
    }
    cleanup();
    setState(s => ({ ...s, status: 'ended' }));
    window.setTimeout(() => { primaryPeerRef.current = null; setState(idleState); }, 1200);
  }, [cleanup, logCall]);

  // ── Data channel: reactions / chat / hand / captions ────────────────────
  const pushReaction = useCallback((emoji: string, from: string) => {
    const id = randomId();
    setReactions(rs => [...rs, { id, emoji, from }].slice(-12));
    window.setTimeout(() => setReactions(rs => rs.filter(r => r.id !== id)), 4500);
  }, []);
  const pushCaption = useCallback((id: number, name: string, text: string) => {
    const at = Date.now();
    setCaptions(cs => [...cs.filter(c => c.id !== id), { id, name, text, at }].slice(-3));
    window.setTimeout(() => setCaptions(cs => cs.filter(c => !(c.id === id && c.at === at))), 6000);
  }, []);
  const sendData = useCallback((msg: DataMsg) => {
    const room = roomRef.current;
    if (!room) return;
    room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true }).catch(() => { /* noop */ });
  }, []);
  const onData = useCallback((payload: Uint8Array, participant?: LKParticipant) => {
    let msg: DataMsg | null = null;
    try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
    if (!msg || !participant) return;
    const id = numericId(participant.identity);
    const name = participant.name || 'Guest';
    if (msg.t === 'reaction') pushReaction(msg.emoji, name);
    else if (msg.t === 'chat') setMessages(m => [...m, { id: randomId(), from: name, text: msg!.text, mine: false, at: Date.now() }]);
    else if (msg.t === 'hand') {
      if (msg.up) { handsRef.current.add(id); toast(`✋ ${name} raised their hand`, { duration: 4000 }); }
      else handsRef.current.delete(id);
      sync();
    } else if (msg.t === 'caption') pushCaption(id, name, msg.text);
  }, [pushReaction, pushCaption, sync]);

  // ── Connect to the LiveKit room for the current call ────────────────────
  const connectRoom = useCallback(async (kind: 'voice' | 'video') => {
    const callId = roomIdRef.current;
    const { url, token } = await getToken(callId, kind);
    const room = new Room({
      // We attach LiveKit tracks through MediaStream objects in CallScreen.
      // adaptiveStream relies on track.attach() viewport measurements and was
      // therefore selecting a low thumbnail layer for the large spotlight.
      adaptiveStream: false,
      dynacast: true,         // pause layers nobody is watching
      audioCaptureDefaults: CLEAN_MIC,
      videoCaptureDefaults: { resolution: VideoPresets.h1080.resolution },
      publishDefaults: {
        simulcast: true,
        // Keep low layers for thumbnails, but publish a real HD layer for the
        // spotlight tile; without h720 LiveKit can only deliver a soft 360p
        // image even when the camera capture is 1080p.
        videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360, VideoPresets.h720, VideoPresets.h1080],
        videoEncoding: { maxBitrate: 5_000_000, maxFramerate: 30 },
      },
    });
    roomRef.current = room;

    room.on(RoomEvent.ParticipantConnected, () => {
      clearTimer();
      connectedAtRef.current = connectedAtRef.current || Date.now();
      setState(s => (s.status === 'connected' ? s : { ...s, status: 'connected' }));
      sync();
    });
    room.on(RoomEvent.ParticipantDisconnected, () => {
      sync();
      // A participant may leave while the remaining participants continue.
    });
    room.on(RoomEvent.TrackSubscribed, (track) => {
      // Someone turned their camera / screen on: make sure our UI shows video.
      if (track.kind === Track.Kind.Video && kindRef.current !== 'video') { kindRef.current = 'video'; setState(s => ({ ...s, kind: 'video' })); }
      sync();
    });
    room.on(RoomEvent.TrackUnsubscribed, sync);
    room.on(RoomEvent.TrackMuted, sync);
    room.on(RoomEvent.TrackUnmuted, sync);
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, sync);
    room.on(RoomEvent.DataReceived, (payload, participant) => onData(payload, participant));
    room.on(RoomEvent.Disconnected, () => { if (statusRef.current !== 'idle' && statusRef.current !== 'ended') finish(); });

    await room.connect(url, token);
    try { await room.localParticipant.setMicrophoneEnabled(true, CLEAN_MIC); } catch (err) { toast.error('Microphone access blocked. Check browser permissions.'); }
    if (kind === 'video') { try { await room.localParticipant.setCameraEnabled(true); } catch { toast.error('Camera not available — continuing with audio.'); } }

    if (room.remoteParticipants.size > 0) {
      clearTimer();
      connectedAtRef.current = connectedAtRef.current || Date.now();
      setState(s => ({ ...s, status: 'connected' }));
    }
    sync();
  }, [getToken, sync, onData, finish]);

  // ── Call lifecycle (ringing still uses our own signalling) ──────────────
  const start = useCallback(async (peer: Peer, kind: 'voice' | 'video') => {
    if (statusRef.current !== 'idle') return;
    roomIdRef.current = randomId();
    primaryPeerRef.current = peer;
    kindRef.current = kind;
    groupRef.current = false;
    setState({ status: 'calling', peer, kind, muted: false, camOff: false, isGroup: false, sharingScreen: false, error: null });
    try {
      // The room token is only issued to a party of the call, and "party" is
      // proven by the invite row — so persist the invite BEFORE asking for it.
      await svc.signal({ call_id: roomIdRef.current, to_user_id: peer.id, type: 'invite', data: { call_id: roomIdRef.current, kind } });
      await connectRoom(kind);
      timerRef.current = window.setTimeout(() => {
        if (statusRef.current === 'calling') { logCall('missed'); sendSignal('cancel', null, peer.id); finish(); }
      }, 45000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not start the call.';
      toast.error(msg);
      reset(msg);
    }
  }, [sendSignal, connectRoom, logCall, finish, reset]);

  const accept = useCallback(async () => {
    if (statusRef.current !== 'incoming' || !pendingInvite.current) return;
    const invite = pendingInvite.current;
    roomIdRef.current = invite.room;
    kindRef.current = invite.kind;
    setState(s => ({ ...s, status: 'connecting' }));
    try {
      await connectRoom(invite.kind);
    } catch (err: any) {
      if (primaryPeerRef.current) sendSignal('reject', null, primaryPeerRef.current.id);
      const msg = err?.response?.data?.message || err?.message || 'Could not join the call.';
      toast.error(msg);
      reset(msg);
    }
  }, [connectRoom, sendSignal, reset]);

  // External guest: join a known room (no invite/ring step).
  const joinRoom = useCallback(async (callId: string, kind: 'voice' | 'video', peerName = 'Meeting') => {
    if (statusRef.current !== 'idle') return;
    roomIdRef.current = callId;
    kindRef.current = kind;
    groupRef.current = true;
    const placeholder = { id: 0, name: peerName } as Peer;
    primaryPeerRef.current = placeholder;
    setState({ status: 'connecting', peer: placeholder, kind, muted: false, camOff: false, isGroup: true, sharingScreen: false, error: null });
    try { await connectRoom(kind); }
    catch (err: any) { const msg = err?.response?.data?.message || err?.message || 'Could not join the call.'; toast.error(msg); reset(msg); }
  }, [connectRoom, reset]);

  const reject = useCallback(() => {
    if (primaryPeerRef.current && pendingInvite.current) {
      roomIdRef.current = pendingInvite.current.room;
      sendSignal('reject', null, primaryPeerRef.current.id);
    }
    reset();
  }, [sendSignal, reset]);

  const hangup = useCallback(() => {
    const calling = statusRef.current === 'calling';
    // Leaving is local: the host must not terminate the shared room.
    logCall(calling ? 'cancelled' : 'ended');
    finish();
  }, [finish, logCall]);

  const addToCall = useCallback((peer: Peer) => {
    if (statusRef.current === 'idle' || !roomIdRef.current) return;
    groupRef.current = true;
    setState(s => ({ ...s, isGroup: true }));
    sendSignal('invite', { call_id: roomIdRef.current, kind: kindRef.current }, peer.id);
    toast.success(`Inviting ${peer.name}…`);
  }, [sendSignal]);

  // ── Media controls ──────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const lp = roomRef.current?.localParticipant; if (!lp) return;
    lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled, CLEAN_MIC).then(sync).catch(() => { /* noop */ });
  }, [sync]);
  const toggleCam = useCallback(() => {
    const lp = roomRef.current?.localParticipant; if (!lp) return;
    lp.setCameraEnabled(!lp.isCameraEnabled).then(sync).catch(() => toast.error('Camera not available.'));
  }, [sync]);
  const switchToVideo = useCallback(async () => {
    const lp = roomRef.current?.localParticipant; if (!lp) return;
    kindRef.current = 'video';
    setState(s => ({ ...s, kind: 'video' }));
    try { await lp.setCameraEnabled(true); } catch { toast.error('Camera not available.'); }
    sync();
  }, [sync]);
  const toggleScreenShare = useCallback(async () => {
    const lp = roomRef.current?.localParticipant; if (!lp) return;
    try {
      await lp.setScreenShareEnabled(!lp.isScreenShareEnabled, { audio: false });
      if (lp.isScreenShareEnabled && kindRef.current !== 'video') { kindRef.current = 'video'; setState(s => ({ ...s, kind: 'video' })); }
    } catch { /* user cancelled the picker */ }
    sync();
  }, [sync]);

  const sendReaction = useCallback((emoji: string) => { pushReaction(emoji, 'You'); sendData({ t: 'reaction', emoji }); }, [pushReaction, sendData]);
  const sendChat = useCallback((text: string) => {
    const t = text.trim(); if (!t) return;
    setMessages(m => [...m, { id: randomId(), from: 'You', text: t, mine: true, at: Date.now() }]);
    sendData({ t: 'chat', text: t });
  }, [sendData]);
  const toggleHand = useCallback(() => {
    const up = !handRef.current; handRef.current = up; setHandRaised(up); sendData({ t: 'hand', up });
  }, [sendData]);

  const toggleCaptions = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* noop */ } recognitionRef.current = null; setCaptionsOn(false); return; }
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { toast.error('Live captions need Chrome (speech recognition is not supported in this browser).'); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = navigator.language || 'en-US';
    let last = '';
    rec.onresult = (ev: any) => {
      const res = ev.results[ev.results.length - 1];
      const text = String(res?.[0]?.transcript || '').trim();
      if (!text || text === last) return;
      last = text;
      pushCaption(meIdRef.current ?? 0, 'You', text);
      sendData({ t: 'caption', text });
    };
    rec.onend = () => { if (recognitionRef.current === rec) { try { rec.start(); } catch { /* noop */ } } };
    rec.onerror = () => { /* onend restarts while captions stay on */ };
    recognitionRef.current = rec;
    try { rec.start(); setCaptionsOn(true); } catch { recognitionRef.current = null; toast.error('Could not start captions.'); }
  }, [pushCaption, sendData]);

  // ── Ringing signals over our own transport ──────────────────────────────
  const handleSignal = useCallback((sig: CallSignal) => {
    if (sig.type === 'invite') {
      if (statusRef.current !== 'idle') {
        svc.signal({ call_id: sig.call_id, to_user_id: sig.from.id, type: 'reject' }).catch(() => { /* noop */ });
        return;
      }
      const payload = sig.data as { call_id: string; kind?: 'voice' | 'video' };
      const callKind = payload?.kind === 'video' ? 'video' : 'voice';
      pendingInvite.current = { room: payload.call_id, kind: callKind, from: sig.from };
      primaryPeerRef.current = sig.from;
      kindRef.current = callKind;
      setState({ status: 'incoming', peer: sig.from, kind: callKind, muted: false, camOff: false, isGroup: false, sharingScreen: false, error: null });
      clearTimer();
      timerRef.current = window.setTimeout(() => { if (statusRef.current === 'incoming') reset(); }, 50000);
      return;
    }
    if (statusRef.current === 'idle') return;
    if (sig.call_id !== (roomIdRef.current || pendingInvite.current?.room)) return;   // stale room
    if (sig.type === 'call-ended') {
      // The host ends the shared room through the API; guests receive this
      // signal because LiveKit itself does not know about our host role.
      finish();
      return;
    }
    if (sig.type === 'reject' || sig.type === 'cancel' || sig.type === 'hangup' || sig.type === 'leave') {
      if (sig.type === 'reject') logCall('declined');
      else if (sig.type === 'hangup') logCall('ended');
      const stillRinging = statusRef.current === 'incoming' || statusRef.current === 'calling';
      if (stillRinging) reset();
      else if (!groupRef.current) finish();
      // In a group call the room keeps going; LiveKit's disconnect event updates the tiles.
    }
    // offer/answer/ice/camera/mute/reaction/chat/hand/caption are handled by LiveKit now.
  }, [logCall, reset, finish]);

  useEffect(() => {
    if (!meId) return;
    let active = true;
    let timeoutId: number;
    const tick = async () => {
      try { const signals = await svc.poll(); for (const sig of signals) { if (active) handleSignal(sig); } } catch { /* noop */ }
      // Keep live call controls (especially host end) responsive. Idle pages
      // stay on the lighter cadence to avoid unnecessary API traffic.
      if (active) timeoutId = window.setTimeout(tick, statusRef.current === 'idle' ? 1500 : 250);
    };
    void tick();
    return () => { active = false; clearTimeout(timeoutId); };
  }, [meId, handleSignal]);

  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    if (opts.autoJoin) void joinRoom(opts.autoJoin.callId, opts.autoJoin.kind, opts.autoJoin.peerName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const api = {
    state, localStream, remoteStream, participants, reactions, messages,
    start, accept, reject, hangup, toggleMute, toggleCam, toggleScreenShare, switchToVideo,
    sendReaction, sendChat, handRaised, toggleHand, captionsOn, toggleCaptions, captions,
    addToCall, joinRoom, getCallId: () => roomIdRef.current,
  };
  return api as unknown as CallApi;
}
