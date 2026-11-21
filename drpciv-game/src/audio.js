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
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, 'triangle', 0.16));
    tone(1047, 0.5, 0.5, 'triangle', 0.14);
    tone(1319, 0.5, 0.5, 'sine', 0.08);
  },
  park() {
    // handbrake ratchet (three quick clicks) then a soft rising chime
    for (let i = 0; i < 3; i++) tone(2400 - i * 300, i * 0.035, 0.025, 'square', 0.05);
    [659, 880, 1175].forEach((f, i) => tone(f, 0.16 + i * 0.09, 0.28, 'sine', 0.12));
  },
  crank() {
    // starter motor: a few low pulses, then the engine catches
    for (let i = 0; i < 5; i++) tone(70 + i * 6, i * 0.11, 0.08, 'sawtooth', 0.07);
  },
  page() {
    // paper: a short burst of filtered noise that sweeps down
    if (!ac || !enabled) return;
    try {
      const t0 = ac.currentTime;
      const len = Math.floor(ac.sampleRate * 0.18);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const f = ac.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(3200, t0);
      f.frequency.exponentialRampToValueAtTime(900, t0 + 0.18);
      const g = ac.createGain();
      g.gain.value = 0.18;
      src.connect(f).connect(g).connect(ac.destination);
      src.start(t0);
    } catch (e) {
      /* ignore */
    }
  },
  click() {
    tone(1800, 0, 0.018, 'square', 0.045);
  },
  penalty() {
    tone(220, 0, 0.16, 'square', 0.09, 160);
    tone(150, 0.14, 0.24, 'square', 0.08, 110);
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

// ---------------------------------------------------------------- engine sound
//  A small synthesised engine: two detuned oscillators (pitch follows the rpm)
//  through a low-pass filter that opens up with the throttle. Louder on the gas.
let eng = null;
function makeEngine() {
  const out = ac.createGain();
  out.gain.value = 0;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  filter.Q.value = 3;
  const o1 = ac.createOscillator();
  o1.type = 'sawtooth';
  const o2 = ac.createOscillator();
  o2.type = 'square';
  const o3 = ac.createOscillator(); // low rumble
  o3.type = 'triangle';
  const g2 = ac.createGain();
  g2.gain.value = 0.5;
  const g3 = ac.createGain();
  g3.gain.value = 0.8;
  o1.connect(filter);
  o2.connect(g2).connect(filter);
  o3.connect(g3).connect(filter);
  filter.connect(out).connect(ac.destination);
  for (const o of [o1, o2, o3]) o.start();
  return { out, filter, o1, o2, o3 };
}

/** Call every frame: on, rpm, idle, redline, gas (0..1), paused. */
export function engineSound({ on, rpm, idle, redline, gas, paused }) {
  if (!ac) return;
  try {
    if (!eng) eng = makeEngine();
    const t = ac.currentTime;
    const live = enabled && on && !paused && rpm > 100;
    const r = Math.max(0, Math.min(1, (rpm - idle) / Math.max(1, redline - idle)));
    const f = 34 + (rpm / 60) * 1.6; // ~56 Hz at idle up to ~200 Hz near the redline
    eng.o1.frequency.setTargetAtTime(f, t, 0.05);
    eng.o2.frequency.setTargetAtTime(f * 1.01, t, 0.05);
    eng.o3.frequency.setTargetAtTime(f / 2, t, 0.05);
    eng.filter.frequency.setTargetAtTime(260 + 900 * gas + 700 * r, t, 0.08);
    const vol = live ? 0.035 + 0.075 * gas + 0.03 * r : 0;
    eng.out.gain.setTargetAtTime(vol, t, live ? 0.06 : 0.12);
  } catch (e) {
    /* ignore */
  }
}

// ------------------------------------------------------------------ tyre squeal
//  Band-passed noise (one buffer, made once) that rises when the tyres slide.
let sq = null;
function makeSqueal() {
  const len = ac.sampleRate;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 6;
  const g = ac.createGain();
  g.gain.value = 0;
  src.connect(bp).connect(g).connect(ac.destination);
  src.start();
  return { g, bp };
}
/** amount 0..1 (0 = silent); called every frame */
export function squealSound(amount, paused) {
  if (!ac) return;
  try {
    if (!sq) sq = makeSqueal();
    const t = ac.currentTime;
    const a = enabled && !paused ? Math.max(0, Math.min(1, amount)) : 0;
    sq.g.gain.setTargetAtTime(a * 0.05, t, a > 0 ? 0.04 : 0.09);
    sq.bp.frequency.setTargetAtTime(1500 + a * 900, t, 0.1);
  } catch (e) {
    /* ignore */
  }
}

// ---------------------------------------------------------------- park assist
//  Beeps faster as the gap shrinks; a steady tone under 30 cm. Silent when far.
let nextBeep = 0;
let steady = null;
export function parkSensor(gap, paused) {
  if (!ac || !enabled) return;
  try {
    const t = ac.currentTime;
    const on = !paused && gap < 2.5;
    if (on && gap < 0.3) {
      if (!steady) {
        steady = ac.createOscillator();
        const g = ac.createGain();
        g.gain.value = 0.05;
        steady.type = 'sine';
        steady.frequency.value = 1350;
        steady.connect(g).connect(ac.destination);
        steady.start();
      }
      return;
    }
    if (steady) {
      steady.stop();
      steady = null;
    }
    if (!on || t < nextBeep) return;
    tone(1350, 0, 0.07, 'sine', 0.06);
    nextBeep = t + 0.08 + Math.min(0.6, gap * 0.25);
  } catch (e) {
    /* ignore */
  }
}

// ------------------------------------------------------------------ rain
//  Soft low-passed noise while it rains (made once, faded in and out).
let rainNode = null;
export function rainSound(on, paused) {
  if (!ac) return;
  try {
    if (!rainNode) {
      const len = ac.sampleRate * 2;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      const g = ac.createGain();
      g.gain.value = 0;
      src.connect(lp).connect(g).connect(ac.destination);
      src.start();
      rainNode = g;
    }
    rainNode.gain.setTargetAtTime(enabled && on && !paused ? 0.035 : 0, ac.currentTime, 0.6);
  } catch (e) {
    /* ignore */
  }
}
