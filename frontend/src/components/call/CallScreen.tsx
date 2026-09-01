import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCall } from "../../hooks/useCall";
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

function Video({ stream, muted, className }: { stream: MediaStream | null; muted?: boolean; className?: string }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current && stream) {
            ref.current.srcObject = stream;
            ref.current.play().catch(() => { /* autoplay handling */ });
        }
    }, [stream]);
    return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

export default function CallScreen({ call }: { call: ReturnType<typeof useCall> }) {
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
        addToCall,
    } = call;
    const { peer, kind, status, muted, camOff, error } = state;
    const [seconds, setSeconds] = useState(0);
    const [showAdd, setShowAdd] = useState(false);

    // People we can add to the call (all directory users), fetched on demand.
    const { data: people = [] } = useQuery({
        queryKey: ["chat-recipients"],
        queryFn: () => messageService.recipients(),
        staleTime: 60000,
        enabled: status !== "idle",
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
    const avatar = peer.avatar_url || peer.avatar;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-b from-[#0c241b] to-[#04120d] text-white">
            {!isGroup &&
                remoteStream &&
                (hasRemoteVideo ? (
                    <Video stream={remoteStream} className="absolute inset-0 h-full w-full bg-black object-cover" />
                ) : (
                    <Video stream={remoteStream} className="hidden" />
                ))}

            {isGroup && (
                <div className="absolute inset-0 grid gap-1 bg-black p-1 pb-28 sm:grid-cols-2">
                    {participants.map((p) => (
                        <div key={p.id} className="relative flex items-center justify-center overflow-hidden rounded-xl bg-[#0c241b]">
                            {isVideo ? (
                                <Video stream={p.stream} className="h-full w-full object-cover" />
                            ) : p.avatar_url ? (
                                <img src={p.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-white/20" />
                            ) : (
                                <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-[#34d399] to-[#047857] text-2xl font-bold ring-2 ring-white/20">
                                    {initials(p.name)}
                                </span>
                            )}
                            <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs">{p.name}</span>
                        </div>
                    ))}
                    {participants.length === 0 && (
                        <div className="col-span-full grid place-items-center text-sm text-white/60">Waiting for others to join…</div>
                    )}
                </div>
            )}

            {isVideo && localStream && status !== "incoming" && (
                <Video
                    stream={localStream}
                    muted
                    className="absolute right-4 top-4 z-10 h-40 w-28 rounded-xl border-2 border-white/25 object-cover shadow-lg sm:h-48 sm:w-36"
                />
            )}

            <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-6 py-12">
                <div className="flex flex-col items-center gap-4 pt-8">
                    {!hasRemoteVideo &&
                        (avatar ? (
                            <img src={avatar} alt="" className="h-28 w-28 rounded-full object-cover ring-4 ring-white/15" />
                        ) : (
                            <span className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-[#34d399] to-[#047857] text-4xl font-bold ring-4 ring-white/15">
                                {initials(peer.name)}
                            </span>
                        ))}
                    <h2 className="text-2xl font-semibold drop-shadow">{isGroup ? "Group call" : peer.name}</h2>
                    <p className="flex items-center gap-2 text-sm text-white/80 drop-shadow">
                        {(status === "calling" || status === "connecting") && (
                            <span className="h-2 w-2 animate-ping rounded-full bg-[#34d399]" />
                        )}
                        {isVideo ? "Video call" : "Voice call"} · {label}
                    </p>
                    {error && <p className="max-w-xs rounded-lg bg-[#e94141]/90 px-3 py-2 text-center text-xs">{error}</p>}
                </div>

                {status === "incoming" ? (
                    <div className="flex items-center gap-12">
                        <button onClick={reject} className="flex flex-col items-center gap-2">
                            <span className="grid h-16 w-16 place-items-center rounded-full bg-[#e94141] shadow-lg transition hover:bg-[#d12f2f]">
                                <span className="rotate-[135deg]"><PhoneIcon /></span>
                            </span>
                            <small className="text-white/70">Decline</small>
                        </button>
                        <button onClick={accept} className="flex flex-col items-center gap-2">
                            <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 shadow-lg transition hover:bg-emerald-600">
                                {isVideo ? <VideoIcon /> : <PhoneIcon />}
                            </span>
                            <small className="text-white/70">Accept</small>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-5">
                        <button
                            onClick={toggleMute}
                            className={`grid h-14 w-14 place-items-center rounded-full text-xl transition ${muted ? "bg-white text-[#0c241b]" : "bg-white/15"}`}
                            title={muted ? "Unmute" : "Mute"}
                        >
                            {muted ? "🔇" : "🎙"}
                        </button>
                        {isVideo && (
                            <button
                                onClick={toggleCam}
                                className={`grid h-14 w-14 place-items-center rounded-full transition ${camOff ? "bg-white text-[#0c241b]" : "bg-white/15"}`}
                                title={camOff ? "Turn camera on" : "Turn camera off"}
                            >
                                <VideoIcon />
                            </button>
                        )}
                        <div className="relative">
                            <button
                                onClick={() => setShowAdd((v) => !v)}
                                className="grid h-14 w-14 place-items-center rounded-full bg-white/15 text-2xl transition"
                                title="Add someone"
                            >
                                +
                            </button>
                            {showAdd && (
                                <div className="absolute bottom-16 left-1/2 z-20 max-h-64 w-60 -translate-x-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#0c241b] p-1 shadow-xl">
                                    <p className="px-3 py-2 text-xs font-semibold text-white/50">Add to call</p>
                                    {addable.length === 0 ? (
                                        <p className="px-3 py-2 text-xs text-white/40">No one else to add.</p>
                                    ) : (
                                        addable.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    addToCall(p);
                                                    setShowAdd(false);
                                                }}
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10"
                                            >
                                                <Avatar user={p} />
                                                <span className="truncate">{p.name}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <button onClick={hangup} className="grid h-16 w-16 place-items-center rounded-full bg-[#e94141] shadow-lg transition" title="End call">
                            <span className="rotate-[135deg]"><PhoneIcon /></span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
