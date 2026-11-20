// ============================================================================
//  main.js  —  starts the game, loads levels, runs the loop (the "glue").
//  Rarely needs changes. Real work lives in game.js, render.js, ui.js.
// ============================================================================

import { CONFIG as C } from './config.js';
import { LEVELS, getLevel, getMap } from './levels.js';
import { buildWorld } from './mapbuild.js';
import { createGame } from './game.js';
import { createRenderer } from './render.js';
import { createControls } from './controls.js';
import { createUI } from './ui.js';
import { setEnabled as setSound, unlock } from './audio.js';
import { loadSettings, saveSettings as persist, addMistake } from './storage.js';
import { CARS } from './cars.js';

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

const settings = loadSettings();
if (!CARS[settings.car]) settings.car = 'golf5';
if (!LEVELS.find((l) => l.id === settings.level && l.playable)) settings.level = 'L1';
const saveSettings = () => persist(settings);
setSound(settings.sound);

// ---- build everything -----------------------------------------------------------
const canvas = document.getElementById('game');
const worlds = {};
const worldFor = (level) => (worlds[level.id] ||= buildWorld(getMap(level)));
let current = { game: null, world: null, level: null };

const renderer = createRenderer(canvas, worldFor(getLevel('L1')));
renderer.loadPassenger('./assets/passenger.png'); // optional photo; a drawn figure is used if the file is missing

const controls = createControls({
  onReset: () => current.game && current.game.resetCar(),
  onAction: (name) => ui.act(name),
});

const actions = {
  startLevel(levelId, { mode, weather } = {}) {
    const level = getLevel(levelId);
    if (!level.playable) return;
    startSession(level, { mode: mode || settings.mode, weather });
    if (levelId !== 'free' && !level.boss) {
      settings.level = levelId;
      saveSettings();
    }
  },
  changeCar(carId) {
    settings.car = carId;
    saveSettings();
    startSession(current.level, { mode: settings.mode });
  },
};
const ui = createUI({ settings, saveSettings, controls, renderer, actions });

function startSession(level, { mode = 'learn', weather } = {}) {
  const world = worldFor(level);
  world.warnings.forEach((w) => console.warn('[map]', level.id, w));
  const game = createGame(world, { level, carId: settings.car, weather: weather || level.weather, fuel: level.fuel });
  game.setMode(mode);
  renderer.setWorld(world);
  current = { game, world, level };
  ui.attach(game, world, level);
  settings.mode = mode;
  saveSettings();
  ui.closeAll();
  if (mode === 'test') ui.showInfo('Test started', 'Follow the purple route and obey every sign. 21 penalty points means failed.');
}

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
  if (!current.game) return;
  controls.tick(dt);
  if (!ui.isBlocking()) {
    acc += dt;
    const input = controls.read();
    let steps = 0;
    while (acc >= STEP && steps < 12) {
      current.game.update(STEP, input);
      acc -= STEP;
      steps++;
    }
    if (steps >= 12) acc = 0;
  } else acc = 0;
  renderer.updateCamera(current.game.state, dt, settings);
  renderer.draw(current.game.state, settings, now / 1000);
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
startSession(getLevel(settings.level), { mode: 'learn' });
if (started) {
  if (settings.mode === 'test') ui.switchMode('test');
} else ui.openWelcome((mode) => ui.switchMode(mode));

// handy for automatic tests / debugging in the browser console
window.__drpciv = { get game() { return current.game; }, get world() { return current.world; }, get level() { return current.level; }, settings, ui, renderer, controls, actions, unlock };
