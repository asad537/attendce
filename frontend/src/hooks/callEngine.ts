import { useCall } from './useCall';
import { useLiveKitCall } from './useLiveKitCall';

/**
 * Which media engine calls use. Chosen once at build time so every page (host
 * and guest) runs the same engine:
 *   VITE_CALLS_ENGINE=livekit → LiveKit SFU (needs LIVEKIT_* on the backend)
 *   anything else             → the original browser mesh
 */
export const CALLS_ENGINE: 'mesh' | 'livekit' = import.meta.env.VITE_CALLS_ENGINE === 'livekit' ? 'livekit' : 'mesh';

type CallApi = ReturnType<typeof useCall>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useCallEngine: (meId?: number, opts?: any) => CallApi = CALLS_ENGINE === 'livekit' ? (useLiveKitCall as any) : (useCall as any);
