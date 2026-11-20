// ============================================================================
//  audio.js  —  tiny sound effects made with the browser (no sound files).
//  Sound only starts after your first tap (phone rule), see unlock().
// ============================================================================

let ac = null;
let enabled = true;

export function unlock() {
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch (e) {
    ac = null;
  }
}

export function setEnabled(v) {
  enabled = v;
}

function tone(freq, delay, dur, type = 'sine', vol = 0.14, slideTo = null) {
  if (!ac || !enabled) return;
  try {
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch (e) {
    /* ignore */
  }
}

export const sfx = {
  ok() {
    tone(660, 0, 0.12);
    tone(990, 0.1, 0.2);
  },
  bad() {
    tone(220, 0, 0.28, 'sawtooth', 0.12, 120);
  },
  bump(strength = 3) {
    tone(110, 0, 0.14, 'square', Math.min(0.2, 0.05 + strength * 0.015), 55);
  },
  tick(phase) {
    tone(phase ? 1900 : 1350, 0, 0.018, 'square', 0.035);
  },
  lowfuel() {
    tone(880, 0, 0.12, 'sine', 0.12);
    tone(660, 0.16, 0.18, 'sine', 0.12);
  },
  pump() {
    tone(240, 0, 0.05, 'triangle', 0.05);
  },
  stall() {
    tone(160, 0, 0.5, 'sawtooth', 0.1, 50);
  },
  tap() {
    tone(520, 0, 0.05, 'triangle', 0.08);
  },
};

export function vibrate(ms) {
  try {
    if (enabled && navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {
    /* ignore */
  }
}
