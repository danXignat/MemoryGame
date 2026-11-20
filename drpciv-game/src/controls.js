// ============================================================================
//  controls.js  —  steering wheel (drag to turn), pedals, keyboard
//                  ->  { steer, gas, brake }
//
//  The wheel follows your finger around its centre and springs back when you
//  let go. Several fingers work at once (wheel + pedal). Keyboard:
//    A/D or arrows  steer     W / Up  gas     S / Down / Space  brake
//    Q / E  left / right blinker    H  hazard lights    L  lights    I  ignition    R  reset
// ============================================================================

const FULL_LOCK_DEG = 150; // wheel angle that means "full steering"
const MAX_DEG = 200;

export function createControls({ onReset, onAction }) {
  const wheelEl = document.getElementById('wheel');
  const wheelImg = document.getElementById('wheelImg');
  const touching = new Map(); // pointerId -> pedal name under that finger
  const keys = new Set();
  const pedals = [...document.querySelectorAll('[data-btn]')];
  let enabled = true;
  let wheelDeg = 0;
  let drag = null; // { id, last }

  const KEYMAP = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', Space: 'brake', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  const ACTIONS = { KeyQ: 'signalLeft', KeyE: 'signalRight', KeyH: 'hazard', KeyL: 'lights', KeyI: 'engine' };

  const pressed = () => {
    const set = new Set(keys);
    if (enabled) for (const n of touching.values()) if (n) set.add(n);
    return set;
  };
  function paint() {
    const a = pressed();
    for (const b of pedals) b.classList.toggle('down', a.has(b.dataset.btn));
    wheelEl.classList.toggle('grab', !!drag);
  }
  const showWheel = () => {
    wheelImg.style.transform = `rotate(${wheelDeg.toFixed(1)}deg)`;
  };

  const angleOf = (e) => {
    const r = wheelEl.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  };
  const wrapPi = (a) => {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  };
  const pedalAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el && el.closest ? el.closest('[data-btn]') : null;
  };

  window.addEventListener(
    'pointerdown',
    (e) => {
      if (!enabled || !e.target || !e.target.closest) return;
      if (e.target.closest('#wheel') && !drag) {
        drag = { id: e.pointerId, last: angleOf(e) };
        e.preventDefault();
        paint();
        return;
      }
      const b = e.target.closest('[data-btn]');
      if (b) {
        touching.set(e.pointerId, b.dataset.btn);
        e.preventDefault();
        paint();
        return;
      }
      const r = e.target.closest('[data-action="reset"]');
      if (r) {
        e.preventDefault();
        r.classList.add('down');
        setTimeout(() => r.classList.remove('down'), 140);
        onReset();
      }
    },
    { passive: false }
  );
  window.addEventListener(
    'pointermove',
    (e) => {
      if (drag && e.pointerId === drag.id) {
        const a = angleOf(e);
        wheelDeg = Math.max(-MAX_DEG, Math.min(MAX_DEG, wheelDeg + (wrapPi(a - drag.last) * 180) / Math.PI));
        drag.last = a;
        showWheel();
        return;
      }
      if (touching.has(e.pointerId)) {
        const b = pedalAt(e.clientX, e.clientY);
        touching.set(e.pointerId, b ? b.dataset.btn : null);
        paint();
      }
    },
    { passive: true }
  );
  const release = (e) => {
    if (drag && e.pointerId === drag.id) {
      drag = null;
      paint();
    }
    if (touching.delete(e.pointerId)) paint();
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === 'KeyR' && !e.repeat) return void onReset();
    if (ACTIONS[e.code] && !e.repeat) return void onAction(ACTIONS[e.code]);
    if (KEYMAP[e.code]) {
      keys.add(KEYMAP[e.code]);
      e.preventDefault();
      paint();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (KEYMAP[e.code]) {
      keys.delete(KEYMAP[e.code]);
      paint();
    }
  });

  const clear = () => {
    touching.clear();
    keys.clear();
    drag = null;
    paint();
  };
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => document.hidden && clear());

  // block page zoom / long-press menus
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  return {
    /** call every frame: moves the wheel back to centre when nobody holds it */
    tick(dt) {
      if (!drag) {
        const a = pressed();
        const want = (a.has('right') ? 1 : 0) - (a.has('left') ? 1 : 0);
        if (want) wheelDeg += Math.max(-1, Math.min(1, (want * 170 - wheelDeg) / 30)) * 480 * dt;
        else wheelDeg *= Math.exp(-7 * dt);
        if (Math.abs(wheelDeg) < 0.2) wheelDeg = 0;
        showWheel();
      }
    },
    /** current input, read once per physics step */
    read() {
      const a = pressed();
      const dz = Math.abs(wheelDeg) < 2 ? 0 : wheelDeg;
      return { steer: Math.max(-1, Math.min(1, dz / FULL_LOCK_DEG)), gas: a.has('gas') ? 1 : 0, brake: a.has('brake') ? 1 : 0 };
    },
    clear,
    setEnabled(v) {
      enabled = v;
      if (!v) clear();
    },
  };
}
