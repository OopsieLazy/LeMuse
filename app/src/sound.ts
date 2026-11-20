// Session cues (ADR-0025): short sine tones made on the fly with Web Audio.
// No sound files, no network, nothing stored. Quiet by design, and the
// session planner can switch them off.

let ctx: AudioContext | null = null;

/** Create the audio context on a click (browsers only allow sound after one). */
export function primeSound(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** One soft tone: `freq` Hz for `ms` milliseconds. Silent if audio is unavailable. */
export function tone(freq: number, ms: number, volume = 0.06): void {
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
  } catch {
    // Sound is a nicety; never let it break a session.
  }
}

/** The last three seconds of a pose. */
export const tick = () => tone(660, 90);
/** A new pose. */
export const change = () => tone(990, 220, 0.08);
/** The session is done. */
export const finish = () => {
  tone(784, 180, 0.07);
  window.setTimeout(() => tone(1175, 320, 0.07), 200);
};
