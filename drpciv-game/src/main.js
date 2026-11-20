// ============================================================================
//  main.js  —  starts the game and runs the loop (the "glue").
//  Rarely needs changes. Real work lives in game.js, render.js, ui.js.
// ============================================================================

import { CONFIG as C } from './config.js';
import { MAP } from './map.js';
import { buildWorld } from './mapbuild.js';
import { createGame } from './game.js';
import { createRenderer } from './render.js';
import { createControls } from './controls.js';
import { createUI } from './ui.js';
import { setEnabled as setSound } from './audio.js';

// If something breaks on the phone, show the message instead of a blank screen.
let fatalShown = false;
function showFatal(message) {
  if (fatalShown) return;
  fatalShown = true;
  const box = document.createElement('div');
  box.className = 'fatal';
  box.textContent = `Something went wrong:\n${message}\n\nTake a screenshot and send it to Claude.`;
  (document.getElementById('app') || document.body).appendChild(box);
}
window.addEventListener('error', (e) => showFatal(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`));
window.addEventListener('unhandledrejection', (e) => showFatal(String(e.reason && e.reason.stack ? e.reason.stack : e.reason)));

// ---- saved settings (language, sound, camera) ---------------------------------
const SETTINGS_KEY = 'drpciv.settings.v1';
const DEFAULTS = { lang: 'en', rotate: true, sound: true, mode: 'learn' };
function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch (e) {
    return { ...DEFAULTS };
  }
}
const settings = loadSettings();
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    /* storage may be blocked: the game works without it */
  }
}
setSound(settings.sound);

// ---- build everything -----------------------------------------------------------
const world = buildWorld(MAP);
world.warnings.forEach((w) => console.warn('[map]', w));
const game = createGame(world);
const canvas = document.getElementById('game');
const renderer = createRenderer(canvas, world);
const controls = createControls({ onReset: () => game.resetCar() });
const ui = createUI({ game, world, settings, saveSettings, controls });

new ResizeObserver(() => renderer.resize()).observe(canvas);
window.addEventListener('orientationchange', () => setTimeout(() => renderer.resize(), 120));

// ---- the loop ---------------------------------------------------------------------
const STEP = C.fixedStep;
let last = performance.now();
let acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!ui.isBlocking()) {
    acc += dt;
    const input = controls.read();
    let steps = 0;
    while (acc >= STEP && steps < 12) {
      game.update(STEP, input);
      acc -= STEP;
      steps++;
    }
    if (steps >= 12) acc = 0;
  } else {
    acc = 0;
  }
  renderer.updateCamera(game.state, dt, settings);
  renderer.draw(game.state, settings, now / 1000);
  ui.update();
}
requestAnimationFrame(frame);

// ---- first screen -----------------------------------------------------------------
let started = false;
try {
  started = sessionStorage.getItem('drpciv.started') === '1';
} catch (e) {
  /* ignore */
}
if (started) ui.switchMode(settings.mode === 'test' ? 'test' : 'learn');
else ui.openWelcome();

// handy for automatic tests / debugging in the browser console
window.__drpciv = { game, world, settings, ui, renderer, controls };
