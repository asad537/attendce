import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { useCall } from "../hooks/useCall";
import CallScreen, { IncomingCallCard } from "../components/call/CallScreen";
import { startRinging, stopRinging, unlockAudio } from "../lib/ringtone";

type CallApi = ReturnType<typeof useCall>;
const CallContext = createContext<CallApi | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const call = useCall(user?.id);
    const status = call.state.status;
    const peer = call.state.peer;

    // Unlock Web Audio on the first user gesture so the ringtone can play later.
    useEffect(() => {
        const unlock = () => unlockAudio();
        const opts = { once: true } as AddEventListenerOptions;
        window.addEventListener("pointerdown", unlock, opts);
        window.addEventListener("keydown", unlock, opts);
        return () => {
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
        };
    }, []);

    // Ring on incoming (loud) and outgoing (soft ringback); stop otherwise.
    useEffect(() => {
        if (status === "incoming") startRinging(true);
        else if (status === "calling") startRinging(false);
        else stopRinging();
        return () => stopRinging();
    }, [status]);

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
            {status === "incoming" && <IncomingCallCard call={call} />}
            {(status === "calling" ||
                status === "connecting" ||
                status === "connected" ||
                status === "ended") && <CallScreen call={call} />}
        </CallContext.Provider>
    );
}

export function useCallContext(): CallApi {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error("useCallContext must be used within a CallProvider");
    return ctx;
}
