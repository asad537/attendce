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

export default function CallScreen({ call, guest = false }: { call: ReturnType<typeof useCall>; guest?: boolean }) {
    const {
        state,
        localStream,
        remoteStream,
        participants,
        accept,
        reject,
        hangup,
        toggleMute,
        toggleCam,
        toggleScreenShare,
        switchToVideo,
        addToCall,
        getCallId,
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
            {/* A voice call has no visible media element; render one audio sink
                per remote participant so their microphone plays immediately. */}
            {!isVideo && remotes.map((participant) => <RemoteAudio key={participant.id} stream={participant.stream} />)}
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
                                <MeetTile big name={spotlight?.name || peer.name} stream={spotlight?.stream} showVideo={isVideo && !spotlight?.cameraOff} />
                            )}
                        </div>
                        <div className="flex w-40 shrink-0 flex-col gap-2 overflow-y-auto sm:w-56">
                            <div className="aspect-video shrink-0">
                                <SelfTile muted={muted} showVideo={isVideo && !camOff} stream={localStream} />
                            </div>
                            {(presenting ? remotes : remotes.filter((r) => r.id !== spotlight?.id)).map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setSelectedRemoteId(p.id)}
                                    className="aspect-video shrink-0 overflow-hidden rounded-xl text-left outline-none ring-0 transition hover:ring-2 hover:ring-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-300"
                                    title={`Show ${p.name} on main screen`}
                                >
                                    <MeetTile name={p.name} stream={p.stream} showVideo={isVideo && !p.cameraOff} />
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
                            note={remotes.length === 0 ? (status === "calling" ? "Calling…" : "Connecting…") : undefined}
                        />
                        {status !== "ended" && (
                            <div className="absolute bottom-4 right-6 z-20 aspect-video w-40 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/40 sm:w-56">
                                <SelfTile muted={muted} showVideo={isVideo && !camOff} stream={localStream} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Control bar — Google Meet style pills */}
            <div className="flex items-center justify-center gap-3 px-4 pb-5 pt-2">
                <button
                    onClick={toggleMute}
                    className={`grid h-12 w-12 place-items-center rounded-full transition ${muted ? "bg-[#ea4335] text-white hover:bg-[#d33b2c]" : "bg-[#3c4043] text-white hover:bg-[#4a4d51]"}`}
                    title={muted ? "Turn on microphone" : "Turn off microphone"}
                >
                    {muted ? <MicOffIcon /> : <MicIcon />}
                </button>

                {isVideo ? (
                    <button
                        onClick={toggleCam}
                        className={`grid h-12 w-12 place-items-center rounded-full transition ${camOff ? "bg-[#ea4335] text-white hover:bg-[#d33b2c]" : "bg-[#3c4043] text-white hover:bg-[#4a4d51]"}`}
                        title={camOff ? "Turn on camera" : "Turn off camera"}
                    >
                        <VideoIcon />
                    </button>
                ) : (status === "connected" || status === "connecting") && (
                    <button
                        onClick={switchToVideo}
                        className="grid h-12 w-12 place-items-center rounded-full bg-[#3c4043] text-white transition hover:bg-[#4a4d51]"
                        title="Turn on camera (switch to video)"
                    >
                        <VideoIcon />
                    </button>
                )}

                {(status === "connected" || status === "connecting") && (
                    <button
                        onClick={toggleScreenShare}
                        className={`grid h-12 w-12 place-items-center rounded-full transition ${sharingScreen ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-[#3c4043] text-white hover:bg-[#4a4d51]"}`}
                        title={sharingScreen ? "Stop presenting" : "Present now"}
                    >
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM10 12H8l4-4 4 4h-2v4h-4v-4z" />
                        </svg>
                    </button>
                )}

                {!guest && <div className="relative">
                    <button
                        onClick={() => setShowAdd((v) => !v)}
                        className="grid h-12 w-12 place-items-center rounded-full bg-[#3c4043] text-2xl text-white transition hover:bg-[#4a4d51]"
                        title="Add people"
                    >
                        +
                    </button>
                    {showAdd && (
                        <div className="absolute bottom-16 left-1/2 z-20 max-h-64 w-64 -translate-x-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#2a2d30] p-1 shadow-xl">
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

                <button
                    onClick={hangup}
                    className="grid h-12 w-16 place-items-center rounded-full bg-[#ea4335] text-white shadow-lg transition hover:bg-[#d33b2c]"
                    title="Leave call"
                >
                    <span className="rotate-[135deg]"><PhoneIcon /></span>
                </button>
            </div>
        </div>
    );
}

// The local user's own tile ("You"), reused in the filmstrip and as the 1:1
// picture-in-picture. Shows a mic-muted badge like Meet.
function SelfTile({ muted, showVideo, stream }: { muted: boolean; showVideo: boolean; stream: MediaStream | null }) {
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
function MeetTile({ name, stream, showVideo, big, note }: { name: string; stream?: MediaStream; showVideo: boolean; big?: boolean; note?: string }) {
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
                <Video stream={stream!} className="h-full w-full object-cover" />
            ) : (
                <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_center,#5b4636,#241d18)]">
                    <span className={`grid place-items-center rounded-full bg-black/30 font-semibold ${big ? "h-28 w-28 text-4xl" : "h-16 w-16 text-2xl"}`}>
                        {initials(name)}
                    </span>
                </div>
            )}
            <span className="absolute bottom-3 left-4 text-sm font-medium drop-shadow">{name}</span>
            {note && <span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs">{note}</span>}
        </div>
    );
}
