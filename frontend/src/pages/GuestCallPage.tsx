import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { guestCallService, makeGuestTransport } from "../services/callService";
import { useCall } from "../hooks/useCall";
import CallScreen from "../components/call/CallScreen";

// The live guest call — mounted only after a successful join, so useCall runs
// once with the guest transport + auto-join for this specific call.
function GuestCall({ guestId, callId, guestToken, kind }: { guestId: number; callId: string; guestToken: string; kind: "voice" | "video" }) {
    const transport = useMemo(() => makeGuestTransport(guestToken), [guestToken]);
    const call = useCall(guestId, { transport, autoJoin: { callId, kind, peerName: "Meeting" } });
    return <CallScreen call={call} guest />;
}

export default function GuestCallPage() {
    const { token } = useParams<{ token: string }>();
    const [name, setName] = useState("");
    const [kind, setKind] = useState<"voice" | "video">("video");
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState("");
    const [session, setSession] = useState<{ guestId: number; callId: string; guestToken: string; kind: "voice" | "video" } | null>(null);

    const join = async () => {
        if (!token || !name.trim()) return;
        setJoining(true);
        setError("");
        try {
            const res = await guestCallService.join({ token, name: name.trim() });
            setSession({ guestId: res.guest.id, callId: res.call_id, guestToken: res.guest_token, kind });
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg || "This invite link is invalid or has expired.");
            setJoining(false);
        }
    };

    if (session) return <GuestCall {...session} />;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0c241b] to-[#04120d] px-4 py-16 text-white">
            <div className="mx-auto max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
                <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500 text-2xl">🎥</div>
                    <h1 className="text-xl font-bold">Join the call</h1>
                    <p className="mt-1 text-sm text-white/60">You've been invited to a call. Enter your name to join.</p>
                </div>

                <label className="mb-1 block text-sm font-medium text-white/80">Your name</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") join(); }}
                    placeholder="e.g. Sara Khan"
                    className="mb-4 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:border-emerald-400"
                    autoFocus
                />

                <div className="mb-5 flex gap-2">
                    <button
                        onClick={() => setKind("video")}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${kind === "video" ? "border-emerald-400 bg-emerald-500/20 text-emerald-200" : "border-white/15 text-white/70"}`}
                    >
                        📹 Video
                    </button>
                    <button
                        onClick={() => setKind("voice")}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${kind === "voice" ? "border-emerald-400 bg-emerald-500/20 text-emerald-200" : "border-white/15 text-white/70"}`}
                    >
                        🎙️ Voice
                    </button>
                </div>

                {error && <p className="mb-4 rounded-lg bg-[#e94141]/90 px-3 py-2 text-center text-xs">{error}</p>}

                <button
                    onClick={join}
                    disabled={!name.trim() || joining}
                    className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                    {joining ? "Joining…" : "Join call"}
                </button>

                <p className="mt-4 text-center text-[11px] text-white/40">
                    You're joining as a guest. Your access ends when the call does.
                </p>
            </div>
        </div>
    );
}
