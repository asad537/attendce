import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCall } from "../../hooks/useCall";
import { callService } from "../../services/callService";
import { MessageUser, messageService } from "../../services/messageService";

const initials = (name = "") =>
    name
        .split(" ")
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

const colors = [
    "from-[#34d399] to-[#047857]",
    "from-[#6a9f91] to-[#245b4f]",
    "from-[#d6a24e] to-[#97691d]",
    "from-[#7b8fb6] to-[#435577]",
];

function Avatar({ user, index = 0 }: { user: MessageUser; index?: number }) {
    const [failed, setFailed] = useState(false);
    const src = user.avatar_url || user.avatar;
    return src && !failed ? (
        <img
            src={src}
            alt=""
            onError={() => setFailed(true)}
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-4 ring-[#d1fae5]"
        />
    ) : (
        <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${colors[index % colors.length]} text-xs font-bold text-white ring-4 ring-[#d1fae5]`}
        >
            {initials(user.name)}
        </span>
    );
}

function VideoIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[21px] w-[21px]" aria-hidden="true">
            <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
        </svg>
    );
}
function PhoneIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[19px] w-[19px]" aria-hidden="true">
            <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.25 1.02l-2.2 2.2z" />
        </svg>
    );
}
// WhatsApp-style filled microphone (on) / microphone-with-slash (muted).
function MicIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[22px] w-[22px]" aria-hidden="true">
            <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V21h2v-3.07A7 7 0 0 0 19 11h-2z" />
        </svg>
    );
}
function MicOffIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[22px] w-[22px]" aria-hidden="true">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5a3 3 0 0 0-6 0v.18l5.98 5.99zM4.27 3L3 4.27l6 6V11a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52a5 5 0 0 1-5-5H5a7 7 0 0 0 6 6.93V21h2v-3.07c.71-.09 1.4-.29 2.02-.58L19.73 21 21 19.73 4.27 3z" />
        </svg>
    );
}

function Video({ stream, muted, mirror = false, className }: { stream: MediaStream | null; muted?: boolean; mirror?: boolean; className?: string }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current && stream) {
            ref.current.srcObject = stream;
            ref.current.play().catch(() => { /* autoplay handling */ });
        }
    }, [stream]);
    return <video ref={ref} autoPlay playsInline muted={muted} className={`${className || ""}${mirror ? " -scale-x-100" : ""}`} />;
}

// Voice calls do not render a video tile, so their incoming MediaStream still
// needs an audio output element. Without this, WebRTC receives the microphone
// track but the browser has nowhere to play it; starting screen share happens
// to create a video element and incorrectly makes the audio seem to "start".
function RemoteAudio({ stream }: { stream: MediaStream }) {
    const ref = useRef<HTMLAudioElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.srcObject = stream;
            ref.current.play().catch(() => { /* browser will retry after user interaction */ });
        }
    }, [stream]);
    return <audio ref={ref} autoPlay playsInline />;
}

// `replaceTrack(null)` does not always remove the receiver's track. Browsers
// commonly leave that track in the remote MediaStream but mark it muted, which
// makes a video element retain its last painted frame. Treat muted and ended
// tracks as camera-off so the tile immediately falls back to the avatar.
function hasRenderableVideo(stream?: MediaStream) {
    return Boolean(stream?.getVideoTracks().some((track) => track.readyState === "live" && !track.muted));
}

// Compact incoming-call popup (shown while ringing, before the call is picked
// up) — a small card rather than a full-screen takeover.
export function IncomingCallCard({ call }: { call: ReturnType<typeof useCall> }) {
    const { state, accept, reject } = call;
    const { peer, kind } = state;
    if (!peer || state.status !== "incoming") return null;
    const isVideo = kind === "video";
    return (
        <div className="fixed left-1/2 top-6 z-[70] w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl">
            <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                    <PhoneIcon />
                </span>
                <div className="min-w-0">
                    <p className="text-lg font-bold text-slate-900">
                        Incoming {isVideo ? "video" : "audio"} call
                    </p>
                    <p className="truncate text-sm text-slate-500">
                        {peer.name} is calling you
                    </p>
                </div>
            </div>
            <div className="mt-3 flex gap-3">
                <button
                    onClick={reject}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e94141] px-4 py-3 font-semibold text-white transition hover:bg-[#d12f2f]"
                >
                    <span className="rotate-[135deg]"><PhoneIcon /></span> Decline
                </button>
                <button
                    onClick={accept}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700"
                >
                    {isVideo ? <VideoIcon /> : <PhoneIcon />} Accept
                </button>
            </div>
        </div>
    );
}

// Google Material icon paths used by the Meet-style control bar.
const MAT = {
    mic: "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z",
    micOff: "M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z",
    cam: "M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z",
    camOff: "M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z",
    present: "M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM10 12H8l4-4 4 4h-2v4h-4v-4z",
    mood: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z",
    cc: "M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V6h14v12zM7 15h2c.55 0 1-.45 1-1v-1H8.5v.5h-1v-3h1v.5H10v-1c0-.55-.45-1-1-1H7c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1zm7 0h2c.55 0 1-.45 1-1v-1h-1.5v.5h-1v-3h1v.5H17v-1c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1z",
    moreVert: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
    callEnd: "M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .27-.11.52-.29.7l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z",
};
function Mat({ d, className = "h-6 w-6" }: { d: string; className?: string }) {
    return <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>;
}
// Outlined raised hand (Meet uses an outline here).
function HandIcon() {
    return (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 12.5V5.5a1.5 1.5 0 0 1 3 0V11" /><path d="M11 11V3.5a1.5 1.5 0 0 1 3 0V11" /><path d="M14 11V5a1.5 1.5 0 0 1 3 0v7" />
            <path d="M17 12V9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.9-2.55l-3.1-4.4a1.7 1.7 0 0 1 2.7-2.05L8 13.5" />
        </svg>
    );
}
// Meet's little blue "more options" dots inside the mic pill.
function BlueDots() {
    return (
        <svg className="h-4 w-4 text-[#8ab4f8]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="19" cy="12" r="2.2" />
        </svg>
    );
}

export default function CallScreen({ call, guest = false }: { call: ReturnType<typeof useCall>; guest?: boolean }) {
    const {
        state,
        localStream,
        remoteStream,
        participants,
        reactions,
        messages,
        accept,
        reject,
        hangup,
        toggleMute,
        toggleCam,
        toggleScreenShare,
        switchToVideo,
        sendReaction,
        sendChat,
        addToCall,
        getCallId,
        handRaised,
        toggleHand,
        captionsOn,
        toggleCaptions,
        captions,
    } = call;

    const copyGuestLink = async () => {
        try {
            const callId = getCallId();
            if (!callId) { toast.error("Call is not ready yet."); return; }
            const { path } = await callService.inviteGuest(callId);
            const url = window.location.origin + path;
            try { await navigator.clipboard.writeText(url); toast.success("Guest link copied — valid for 1 hour."); }
            catch { toast.success("Guest link ready:\n" + url); }
        } catch {
            toast.error("Could not create a guest link.");
        }
        setShowAdd(false);
    };
    const { peer, kind, status, muted, camOff, sharingScreen, error } = state;
    const [seconds, setSeconds] = useState(0);
    const [showAdd, setShowAdd] = useState(false);
    const [, setRemoteMediaVersion] = useState(0);
    const [selectedRemoteId, setSelectedRemoteId] = useState<number | null>(null);
    const [showEmoji, setShowEmoji] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatText, setChatText] = useState("");
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const chatAtBottomRef = useRef(true);   // only auto-scroll when already at the bottom
    // Badge = messages from OTHERS that arrived while the chat was closed.
    // Opening the chat clears it (it used to show the total, so it never reset).
    const [unreadChat, setUnreadChat] = useState(0);
    const seenChatCountRef = useRef(0);
    useEffect(() => {
        const fresh = messages.slice(seenChatCountRef.current);
        seenChatCountRef.current = messages.length;
        if (showChat || fresh.length === 0) return;
        const incoming = fresh.filter((m) => !m.mine).length;
        if (incoming) setUnreadChat((n) => n + incoming);
    }, [messages, showChat]);
    useEffect(() => { if (showChat) setUnreadChat(0); }, [showChat]);
    const [showReady, setShowReady] = useState(!guest);   // Meet-style "meeting's ready" card
    const [readyLink, setReadyLink] = useState("");

    // Fetch this call's shareable guest link once, for the "meeting's ready" card.
    useEffect(() => {
        if (guest || readyLink) return;
        if (state.status !== "connected" && state.status !== "connecting" && state.status !== "calling") return;
        const id = getCallId();
        if (!id) return;
        let cancelled = false;
        callService.inviteGuest(id)
            .then(({ path }) => { if (!cancelled) setReadyLink(window.location.origin + path); })
            .catch(() => { /* retry on a later status tick */ });
        return () => { cancelled = true; };
    }, [guest, readyLink, state.status, getCallId]);

    // Keep the chat pinned to the newest message only while the user is already
    // at the bottom — scrolling up to read history is never yanked back down.
    useEffect(() => {
        const el = chatBodyRef.current;
        if (el && chatAtBottomRef.current) el.scrollTop = el.scrollHeight;
    }, [messages.length, showChat]);

    const REACTION_EMOJIS = ["💖", "👍", "🎉", "👏", "😂", "😮", "😢", "🤔", "👎"];
    const copyReadyLink = async () => {
        if (!readyLink) return;
        try { await navigator.clipboard.writeText(readyLink); toast.success("Meeting link copied."); }
        catch { toast.success(readyLink); }
    };
    const submitChat = () => { const t = chatText.trim(); if (!t) return; sendChat(t); setChatText(""); };

    // People we can add to the call (all directory users), fetched on demand.
    const { data: people = [] } = useQuery({
        queryKey: ["chat-recipients"],
        queryFn: () => messageService.recipients(),
        staleTime: 60000,
        enabled: !guest && status !== "idle",   // guests can't reach the directory
    });

    const inCall = participants.map((p) => p.id);
    const addable = people.filter((p) => p.id !== peer?.id && !inCall.includes(p.id));
    const isGroup = state.isGroup || participants.length > 1;

    useEffect(() => {
        if (status !== "connected") {
            setSeconds(0);
            return;
        }
        const id = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [status]);

    // Remote tracks change state without React state changing. Subscribe to
    // those events so camera-off is reflected immediately instead of keeping a
    // frozen last frame on the other participant's screen.
    useEffect(() => {
        const refresh = () => setRemoteMediaVersion((version) => version + 1);
        const cleanups: Array<() => void> = [];

        participants.forEach(({ stream }) => {
            const tracks = stream.getVideoTracks();
            stream.addEventListener("addtrack", refresh);
            stream.addEventListener("removetrack", refresh);
            cleanups.push(() => {
                stream.removeEventListener("addtrack", refresh);
                stream.removeEventListener("removetrack", refresh);
            });
            tracks.forEach((track) => {
                track.addEventListener("mute", refresh);
                track.addEventListener("unmute", refresh);
                track.addEventListener("ended", refresh);
                cleanups.push(() => {
                    track.removeEventListener("mute", refresh);
                    track.removeEventListener("unmute", refresh);
                    track.removeEventListener("ended", refresh);
                });
            });
        });

        return () => cleanups.forEach((cleanup) => cleanup());
    }, [participants]);

    if (!peer) return null;
    const isVideo = kind === "video";
    const hasRemoteVideo = isVideo && status === "connected";
    const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    const label =
        status === "incoming"
            ? `Incoming ${isVideo ? "video" : "voice"} call…`
            : status === "calling"
              ? "Calling…"
              : status === "connecting"
                ? "Connecting…"
                : status === "connected"
                  ? mmss
                  : "Call ended";
    const clock = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const rawCode = getCallId ? getCallId() : "";
    const code = rawCode ? rawCode.slice(0, 12) : "call";
    const remotes = participants;
    const totalCount = participants.length + 1;
    const presenting = sharingScreen;                          // local user is sharing their screen
    const filmstripMode = remotes.length >= 2 || presenting;   // spotlight + right filmstrip
    // Spotlight whoever is actually sending video (a screen-share or live camera)
    // so a remote presenter fills the stage rather than a camera-off avatar.
    const automaticSpotlight = remotes.find((r) => !r.cameraOff && hasRenderableVideo(r.stream)) || remotes[0];
    // A participant selected from the right rail remains on the main stage
    // until another tile is selected or they leave the call.
    const spotlight = remotes.find((r) => r.id === selectedRemoteId) || automaticSpotlight;
    void hasRemoteVideo; void mmss; void label; // (kept for signature; Meet layout derives its own)

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#202124] text-white">
            {/* Keep exactly one audio sink per remote participant. Video
                elements are always muted, preventing duplicate playback/echo
                and ensuring audio continues when their camera is turned off. */}
            {remotes.map((participant) => <RemoteAudio key={participant.id} stream={participant.stream} />)}

            {/* Floating emoji reactions (Google Meet style). */}
            <style>{`@keyframes call-float{0%{opacity:0;transform:translateY(24px) scale(.6)}15%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-160px) scale(1)}}`}</style>
            <div className="pointer-events-none absolute bottom-28 left-1/2 z-40 flex -translate-x-1/2 items-end gap-4">
                {reactions.map((r) => (
                    <div key={r.id} className="flex flex-col items-center" style={{ animation: "call-float 4.5s ease-out forwards" }}>
                        <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
                        <span className="mt-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px]">{r.from}</span>
                    </div>
                ))}
            </div>

            {/* "Your meeting's ready" — share the guest link (host only). */}
            {!guest && showReady && status !== "ended" && (
                <div className="absolute bottom-24 left-4 z-40 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-5 text-gray-900 shadow-2xl">
                    <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold">Your meeting's ready</h3>
                        <button onClick={() => setShowReady(false)} className="text-gray-400 hover:text-gray-600" title="Close">✕</button>
                    </div>
                    {!guest && (
                        <button onClick={() => { setShowReady(false); setShowAdd(true); }} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1666cc]">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                            Add others
                        </button>
                    )}
                    <p className="mt-4 text-sm text-gray-600">Or share this meeting link with others you want in the meeting</p>
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2.5">
                        <span className="flex-1 truncate text-sm text-gray-800">{readyLink || "Generating link…"}</span>
                        <button onClick={copyReadyLink} disabled={!readyLink} className="shrink-0 text-gray-500 hover:text-gray-800 disabled:opacity-40" title="Copy link">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                    </div>
                    <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#1a73e8]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" /></svg>
                        <span>Anyone with this link can join as a guest of this call. The link expires in 1 hour.</span>
                    </div>
                </div>
            )}

            {/* Chat button (bottom-right, Google Meet style). */}
            {(status === "connected" || status === "connecting") && (
                <button
                    onClick={() => setShowChat((v) => !v)}
                    className="absolute bottom-6 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#3c4043] text-white shadow-lg transition hover:bg-[#4a4d51]"
                    title="Chat with everyone"
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    {unreadChat > 0 && !showChat && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#ea4335] px-1 text-[10px] font-bold">{unreadChat}</span>}
                </button>
            )}

            {/* Chat side panel — Google Meet dark style. */}
            {showChat && (
                <div className="absolute right-0 top-0 z-50 flex h-full w-[380px] max-w-[92vw] flex-col bg-[#1c1c1e] p-3 text-white shadow-2xl">
                    <header className="flex items-center justify-between px-2 py-2">
                        <h3 className="text-xl font-medium">In-call messages</h3>
                        <button onClick={() => setShowChat(false)} className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10" title="Close">✕</button>
                    </header>

                    <div className="mt-1 rounded-2xl bg-white/[0.06] px-4 py-3 text-center text-sm text-white/70">
                        <p className="flex items-center justify-center gap-2 font-medium text-white/85">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            Messages aren't saved
                        </p>
                        <p className="mt-1 text-xs">Messages can only be seen by people in the call while it's on, and are deleted when the call ends.</p>
                    </div>

                    <div
                        ref={chatBodyRef}
                        onScroll={(e) => {
                            const el = e.currentTarget;
                            chatAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
                        }}
                        className="mt-2 flex-1 space-y-4 overflow-y-auto px-2 py-2 [overflow-anchor:none]"
                    >
                        {messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <svg className="h-16 w-16 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                <p className="mt-4 text-sm text-white/50">No chat messages yet</p>
                            </div>
                        ) : (
                            messages.map((m) => (
                                <div key={m.id} className="text-sm">
                                    <p className={`mb-0.5 text-xs font-medium ${m.mine ? "text-right text-white/50" : "text-white/60"}`}>{m.mine ? "You" : m.from}</p>
                                    <div className={m.mine ? "flex justify-end" : "flex justify-start"}>
                                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${m.mine ? "bg-[#8ab4f8] text-[#202124]" : "bg-white/[0.08] text-white"}`}>{m.text}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-2 flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-1.5">
                        <input
                            value={chatText}
                            onChange={(e) => setChatText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") submitChat(); }}
                            placeholder="Send a message"
                            className="flex-1 bg-transparent py-1.5 text-sm text-white placeholder-white/40 outline-none"
                        />
                        <button onClick={submitChat} disabled={!chatText.trim()} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#8ab4f8] transition hover:bg-white/10 disabled:opacity-40" title="Send">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
                        </button>
                    </div>
                </div>
            )}
            {/* Top bar: clock · meeting code + participant count */}
            <div className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex items-center gap-2 text-white/85">
                    <span className="tabular-nums">{clock}</span>
                    <span className="text-white/30">|</span>
                    <span className="font-medium tracking-wide">{code}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {totalCount}
                </div>
            </div>

            {/* Stage */}
            <div className="relative min-h-0 flex-1 px-3 pb-1">
                {error && <div className="absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-lg bg-[#e94141]/90 px-3 py-2 text-center text-xs">{error}</div>}

                {filmstripMode ? (
                    /* Spotlight + right filmstrip (group call / someone presenting). */
                    <div className="flex h-full w-full gap-2">
                        <div className="min-w-0 flex-1">
                            {presenting && !selectedRemoteId ? (
                                <MeetTile big name="You (Presenting)" stream={localStream || undefined} showVideo />
                            ) : (
                                <MeetTile big name={spotlight?.name || peer.name} stream={spotlight?.stream} showVideo={isVideo && !spotlight?.cameraOff} muted={spotlight?.muted} handUp={spotlight?.handUp} />
                            )}
                        </div>
                        <div className="flex w-40 shrink-0 flex-col gap-2 overflow-y-auto sm:w-56">
                            <div className="aspect-video shrink-0">
                                <SelfTile muted={muted} showVideo={isVideo && !camOff} stream={localStream} handUp={handRaised} />
                            </div>
                            {(presenting && !selectedRemoteId ? remotes : remotes.filter((r) => r.id !== spotlight?.id)).map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setSelectedRemoteId(p.id)}
                                    className="aspect-video shrink-0 overflow-hidden rounded-xl text-left outline-none ring-0 transition hover:ring-2 hover:ring-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-300"
                                    title={`Show ${p.name} on main screen`}
                                >
                                    <MeetTile name={p.name} stream={p.stream} showVideo={isVideo && !p.cameraOff} muted={p.muted} handUp={p.handUp} />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* 1:1 — big main tile + picture-in-picture self view. */
                    <>
                        <MeetTile
                            big
                            name={spotlight?.name || peer.name}
                            stream={spotlight?.stream}
                            showVideo={isVideo && !spotlight?.cameraOff}
                            muted={spotlight?.muted} handUp={spotlight?.handUp}
                            note={remotes.length === 0 ? (status === "calling" ? "Calling…" : "Connecting…") : undefined}
                        />
                        {status !== "ended" && (
                            <div className="absolute bottom-4 right-6 z-20 aspect-video w-40 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/40 sm:w-56">
                                <SelfTile muted={muted} showVideo={isVideo && !camOff} stream={localStream} handUp={handRaised} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Live captions — one line per recent speaker, above the bar. */}
            {captions.length > 0 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-[104px] z-30 flex flex-col items-center gap-1 px-4">
                    {captions.map((c) => (
                        <div key={c.id} className="max-w-[720px] rounded-lg bg-black/70 px-4 py-2 text-center text-[15px] leading-snug text-white shadow">
                            <span className="mr-2 font-semibold text-white/60">{c.name}:</span>{c.text}
                        </div>
                    ))}
                </div>
            )}

            {/* Control bar — exact Google Meet look: dark strip, big rounded
                container, mic/camera as circles inside pills (blue dots / chevron),
                squircle buttons, pink off-states, blue active states, red Leave. */}
            <div className="flex items-center justify-center bg-[#1a1a1a] px-4 py-3">
                <div className="flex items-center gap-2 rounded-[32px] bg-[#242526] px-3 py-2">

                    {/* Mic pill: [ • • • | mic ] */}
                    <div className="flex items-center rounded-full bg-[#3c4043]">
                        <span className="grid h-14 w-11 place-items-center select-none" aria-hidden="true"><BlueDots /></span>
                        <button
                            onClick={toggleMute}
                            className={`grid h-14 w-14 place-items-center transition rounded-full ${muted ? "bg-[#f9dedc] text-[#b3261e] hover:bg-[#f5cfcc]" : "bg-[#3c4043] text-white hover:bg-[#4a4d51]"}`}
                            title={muted ? "Turn on microphone" : "Turn off microphone"}
                        >
                            <Mat d={muted ? MAT.micOff : MAT.mic} />
                        </button>
                    </div>

                    {/* Camera pill: [ ^ | camera ] */}
                    {isVideo ? (
                        <div className="flex items-center rounded-full bg-[#3c4043]">
                            <span className="grid h-14 w-11 place-items-center text-white/70 select-none" aria-hidden="true">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M5 15l7-7 7 7" /></svg>
                            </span>
                            <button
                                onClick={toggleCam}
                                className={`grid h-14 w-14 place-items-center transition rounded-full ${camOff ? "bg-[#f9dedc] text-[#b3261e] hover:bg-[#f5cfcc]" : "bg-[#3c4043] text-white hover:bg-[#4a4d51]"}`}
                                title={camOff ? "Turn on camera" : "Turn off camera"}
                            >
                                <Mat d={camOff ? MAT.camOff : MAT.cam} />
                            </button>
                        </div>
                    ) : (status === "connected" || status === "connecting") && (
                        <button onClick={switchToVideo} className={`grid h-14 w-14 place-items-center transition rounded-[24px] bg-[#3c4043] text-white hover:bg-[#4a4d51]`} title="Turn on camera (switch to video)">
                            <Mat d={MAT.cam} />
                        </button>
                    )}

                    {/* Present now */}
                    {(status === "connected" || status === "connecting") && (
                        <button
                            onClick={toggleScreenShare}
                            className={`grid h-14 w-14 place-items-center transition rounded-[24px] ${sharingScreen ? "bg-[#a8c7fa] text-[#062e6f] hover:bg-[#9bbcf0]" : "bg-[#3c4043] text-white hover:bg-[#4a4d51]"}`}
                            title={sharingScreen ? "Stop presenting" : "Present now"}
                        >
                            <Mat d={MAT.present} />
                        </button>
                    )}

                    {/* Reactions */}
                    {(status === "connected" || status === "connecting") && (
                        <div className="relative">
                            <button
                                onClick={() => setShowEmoji((v) => !v)}
                                className={`grid h-14 w-14 place-items-center transition rounded-[24px] ${showEmoji ? "bg-[#a8c7fa] text-[#062e6f] hover:bg-[#9bbcf0]" : "bg-[#3c4043] text-white hover:bg-[#4a4d51]"}`}
                                title="Send a reaction"
                            >
                                <Mat d={MAT.mood} />
                            </button>
                            {showEmoji && (
                                <div className="absolute bottom-[72px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#2a2d30] px-3 py-2 shadow-xl">
                                    {REACTION_EMOJIS.map((e) => (
                                        <button key={e} onClick={() => { sendReaction(e); setShowEmoji(false); }} className="grid h-9 w-9 place-items-center rounded-full text-xl transition hover:bg-white/10">{e}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Live captions (CC) */}
                    {(status === "connected" || status === "connecting") && (
                        <button
                            onClick={toggleCaptions}
                            className={`grid h-14 w-14 place-items-center transition rounded-[24px] ${captionsOn ? "bg-[#a8c7fa] text-[#062e6f] hover:bg-[#9bbcf0]" : "bg-[#3c4043] text-white hover:bg-[#4a4d51]"}`}
                            title={captionsOn ? "Turn off captions" : "Turn on captions"}
                        >
                            <Mat d={MAT.cc} />
                        </button>
                    )}

                    {/* Raise hand */}
                    {(status === "connected" || status === "connecting") && (
                        <button
                            onClick={toggleHand}
                            className={`grid h-14 w-14 place-items-center transition rounded-[24px] ${handRaised ? "bg-[#a8c7fa] text-[#062e6f] hover:bg-[#9bbcf0]" : "bg-[#3c4043] text-white hover:bg-[#4a4d51]"}`}
                            title={handRaised ? "Lower hand" : "Raise hand"}
                        >
                            <HandIcon />
                        </button>
                    )}

                    {/* More (⋮) — add people / guest link */}
                    {!guest && <div className="relative">
                        <button
                            onClick={() => setShowAdd((v) => !v)}
                            className={`grid h-14 w-14 place-items-center transition rounded-[24px] ${showAdd ? "bg-[#a8c7fa] text-[#062e6f] hover:bg-[#9bbcf0]" : "bg-[#3c4043] text-white hover:bg-[#4a4d51]"}`}
                            title="More — add people"
                        >
                            <Mat d={MAT.moreVert} />
                        </button>
                        {showAdd && (
                            <div className="absolute bottom-[72px] left-1/2 z-20 max-h-64 w-64 -translate-x-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#2a2d30] p-1 shadow-xl">
                                <button
                                    onClick={copyGuestLink}
                                    className="mb-1 flex w-full items-center gap-2 rounded-xl bg-emerald-600/20 px-3 py-2 text-left text-sm font-medium text-emerald-300 hover:bg-emerald-600/30"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                                    Invite guest (copy link)
                                </button>
                                <p className="px-3 py-2 text-xs font-semibold text-white/50">Add to call</p>
                                {addable.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-white/40">No one else to add.</p>
                                ) : (
                                    addable.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => { addToCall(p); setShowAdd(false); }}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10"
                                        >
                                            <Avatar user={p} />
                                            <span className="truncate">{p.name}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>}

                    {/* Leave call — Meet red capsule with the call_end handset */}
                    <button
                        onClick={hangup}
                        className="ml-2 grid h-14 w-[140px] place-items-center rounded-full bg-[#ea4335] text-white transition hover:bg-[#d33b2c]"
                        title="Leave call"
                    >
                        <Mat d={MAT.callEnd} className="h-7 w-7" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// The local user's own tile ("You"), reused in the filmstrip and as the 1:1
// picture-in-picture. Shows a mic-muted badge like Meet.
function SelfTile({ muted, showVideo, stream, handUp = false }: { muted: boolean; showVideo: boolean; stream: MediaStream | null; handUp?: boolean }) {
    return (
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#3c4043]">
            {showVideo && stream ? (
                <Video stream={stream} muted mirror className="h-full w-full object-cover" />
            ) : (
                <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_center,#3f4b57,#242a30)]">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-white/15 text-sm font-semibold">You</span>
                </div>
            )}
            <span className="absolute bottom-1.5 left-2 text-xs font-medium drop-shadow">You</span>
            {handUp && <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#a8c7fa] text-base shadow" title="Hand raised">✋</span>}
            {muted && (
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#ea4335]">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-.11 1.23l1.53 1.53A8.9 8.9 0 0021 11h-2zM4.27 3L3 4.27l6 6V11a3 3 0 003 3c.23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.42-2.31.42a5 5 0 01-5-5H5a7 7 0 007 7c1.28 0 2.49-.35 3.53-.95L19.73 21 21 19.73 4.27 3zM12 4a3 3 0 013 3v3.18l1.98 1.98A5 5 0 0017 7a5 5 0 00-5-5 4.94 4.94 0 00-2.02.44L12 4z" /></svg>
                </span>
            )}
        </div>
    );
}

// A single Google-Meet style tile: live video, or a themed avatar when the
// camera is off / not yet connected.
function MeetTile({ name, stream, showVideo, muted = false, handUp = false, big, note }: { name: string; stream?: MediaStream; showVideo: boolean; muted?: boolean; handUp?: boolean; big?: boolean; note?: string }) {
    const [mediaVersion, setMediaVersion] = useState(0);

    // A remote camera can be disabled while its MediaStream still contains a
    // muted receiver track. Listening here guarantees this tile unmounts the
    // video element and cannot keep displaying the previous frame.
    useEffect(() => {
        if (!stream) return;
        const refresh = () => setMediaVersion((version) => version + 1);
        const tracks = stream.getVideoTracks();
        stream.addEventListener("addtrack", refresh);
        stream.addEventListener("removetrack", refresh);
        tracks.forEach((track) => {
            track.addEventListener("mute", refresh);
            track.addEventListener("unmute", refresh);
            track.addEventListener("ended", refresh);
        });
        return () => {
            stream.removeEventListener("addtrack", refresh);
            stream.removeEventListener("removetrack", refresh);
            tracks.forEach((track) => {
                track.removeEventListener("mute", refresh);
                track.removeEventListener("unmute", refresh);
                track.removeEventListener("ended", refresh);
            });
        };
    }, [stream]);

    void mediaVersion;
    const hasVideo = showVideo && hasRenderableVideo(stream);
    return (
        <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#3c4043]">
            {hasVideo ? (
                // The big spotlight uses object-contain so a shared screen (or
                // any non-matching aspect) is shown in full instead of cropped
                // top/bottom; small tiles fill with object-cover.
                <Video stream={stream!} muted className={`h-full w-full ${big ? "object-contain" : "object-cover"}`} />
            ) : (
                <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_center,#5b4636,#241d18)]">
                    <span className={`grid place-items-center rounded-full bg-black/30 font-semibold ${big ? "h-28 w-28 text-4xl" : "h-16 w-16 text-2xl"}`}>
                        {initials(name)}
                    </span>
                </div>
            )}
            <span className="absolute bottom-3 left-4 text-sm font-medium drop-shadow">{name}</span>
            {muted && (
                <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-[#ea4335]" title="Microphone muted">
                    <MicOffIcon />
                </span>
            )}
            {handUp && (
                <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#a8c7fa] text-lg shadow" title="Hand raised">✋</span>
            )}
            {note && <span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs">{note}</span>}
        </div>
    );
}
