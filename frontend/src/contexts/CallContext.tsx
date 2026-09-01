import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { useCall } from "../hooks/useCall";
import CallScreen from "../components/call/CallScreen";

type CallApi = ReturnType<typeof useCall>;
const CallContext = createContext<CallApi | null>(null);

// Synthesizes a phone-ring tone with the Web Audio API so no audio asset or
// autoplay-allowed <audio> element is needed. Best-effort: silently no-ops if
// the browser blocks audio (e.g. before any user gesture).
function useRingtone(active: boolean, incoming: boolean) {
    const ctxRef = useRef<AudioContext | null>(null);
    const timerRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const stop = () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = undefined;
            }
        };
        if (!active) {
            stop();
            return;
        }

        const ring = () => {
            try {
                const AC = (window.AudioContext || (window as any).webkitAudioContext);
                if (!AC) return;
                if (!ctxRef.current) ctxRef.current = new AC();
                const ctx = ctxRef.current;
                if (ctx.state === "suspended") ctx.resume().catch(() => { /* noop */ });
                // Incoming: a bright double-beep. Outgoing: a single softer beep.
                const beeps = incoming ? [0, 0.4] : [0];
                beeps.forEach((offset) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.value = incoming ? 660 : 440;
                    const t = ctx.currentTime + offset;
                    gain.gain.setValueAtTime(0.0001, t);
                    gain.gain.exponentialRampToValueAtTime(incoming ? 0.25 : 0.12, t + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.32);
                });
                if (incoming && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
            } catch { /* audio blocked */ }
        };

        ring();
        timerRef.current = window.setInterval(ring, incoming ? 2000 : 3500);
        return stop;
    }, [active, incoming]);

    useEffect(() => () => { ctxRef.current?.close().catch(() => { /* noop */ }); }, []);
}

export function CallProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const call = useCall(user?.id);
    const status = call.state.status;
    const peer = call.state.peer;

    useRingtone(status === "incoming" || status === "calling", status === "incoming");

    // Notify (toast + optional browser notification) once per incoming call.
    const notifiedRef = useRef<string | null>(null);
    useEffect(() => {
        if (status === "incoming" && peer) {
            const key = `${peer.id}-${call.state.kind}`;
            if (notifiedRef.current !== key) {
                notifiedRef.current = key;
                const label = `Incoming ${call.state.kind === "video" ? "video" : "voice"} call from ${peer.name}`;
                toast(label, { icon: "📞", duration: 6000 });
                try {
                    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                        new Notification(label);
                    }
                } catch { /* noop */ }
            }
        } else if (status === "idle") {
            notifiedRef.current = null;
        }
    }, [status, peer, call.state.kind]);

    // Ask for browser-notification permission once (non-blocking).
    useEffect(() => {
        try {
            if (typeof Notification !== "undefined" && Notification.permission === "default") {
                Notification.requestPermission().catch(() => { /* noop */ });
            }
        } catch { /* noop */ }
    }, []);

    return (
        <CallContext.Provider value={call}>
            {children}
            {status !== "idle" && <CallScreen call={call} />}
        </CallContext.Provider>
    );
}

export function useCallContext(): CallApi {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error("useCallContext must be used within a CallProvider");
    return ctx;
}
