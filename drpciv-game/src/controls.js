// ============================================================================
//  controls.js  —  touch buttons + keyboard  ->  { steer, gas, brake }
//
//  Works with several fingers at once (steer + gas together) and lets a finger
//  slide from one button to another. Keyboard: arrows / WASD, Space = brake, R = reset.
// ============================================================================

export function createControls({ onReset }) {
  const touching = new Map(); // pointerId -> name of the button under that finger
  const keys = new Set();
  const buttons = [...document.querySelectorAll('[data-btn]')];
  let enabled = true;

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'gas', KeyW: 'gas',
    ArrowDown: 'brake', KeyS: 'brake', Space: 'brake',
  };

  const active = () => {
    const set = new Set(keys);
    if (enabled) for (const name of touching.values()) if (name) set.add(name);
    return set;
  };

  function paint() {
    const a = active();
    for (const b of buttons) b.classList.toggle('down', a.has(b.dataset.btn));
  }

  const buttonAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el && el.closest ? el.closest('[data-btn]') : null;
  };

  window.addEventListener(
    'pointerdown',
    (e) => {
      if (!enabled) return;
      const target = e.target && e.target.closest ? e.target : null;
      const b = target && target.closest('[data-btn]');
      if (b) {
        touching.set(e.pointerId, b.dataset.btn);
        e.preventDefault();
        paint();
        return;
      }
      const r = target && target.closest('[data-action="reset"]');
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
      if (!touching.has(e.pointerId)) return;
      const b = buttonAt(e.clientX, e.clientY);
      touching.set(e.pointerId, b ? b.dataset.btn : null);
      paint();
    },
    { passive: true }
  );

  const release = (e) => {
    if (touching.delete(e.pointerId)) paint();
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && !e.repeat) {
      onReset();
      return;
    }
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
    paint();
  };
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => document.hidden && clear());

  // block page zoom / long-press menus
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  return {
    /** current input, read once per physics step */
    read() {
      const a = active();
      return { steer: (a.has('right') ? 1 : 0) - (a.has('left') ? 1 : 0), gas: a.has('gas') ? 1 : 0, brake: a.has('brake') ? 1 : 0 };
    },
    clear,
    setEnabled(v) {
      enabled = v;
      if (!v) clear();
    },
  };
}
