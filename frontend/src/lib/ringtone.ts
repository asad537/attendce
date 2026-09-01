// A tiny Web-Audio ringtone. Browsers only allow audio after a user gesture,
// so unlockAudio() is wired to the first click/keypress anywhere in the app;
// by the time a call arrives the context is already running and can ring.

let ctx: AudioContext | null = null;
let timer: number | undefined;

export function unlockAudio(): void {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => { /* noop */ });
  } catch { /* audio unavailable */ }
}

function beep(incoming: boolean): void {
  if (!ctx || ctx.state !== 'running') return;
  const offsets = incoming ? [0, 0.4] : [0];
  offsets.forEach((o) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = incoming ? 660 : 440;
    const t = ctx!.currentTime + o;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(incoming ? 0.3 : 0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(gain);
    gain.connect(ctx!.destination);
    osc.start(t);
    osc.stop(t + 0.34);
  });
  if (incoming && 'vibrate' in navigator) {
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* noop */ }
  }
}

export function startRinging(incoming: boolean): void {
  stopRinging();
  unlockAudio();
  beep(incoming);
  timer = window.setInterval(() => beep(incoming), incoming ? 2000 : 3500);
}

export function stopRinging(): void {
  if (timer) { clearInterval(timer); timer = undefined; }
}
