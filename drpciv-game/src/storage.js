// ============================================================================
//  storage.js  —  saved settings, level progress and the "My Mistakes" log.
//  Everything is kept in this browser (localStorage); the game works without it.
// ============================================================================

const SETTINGS_KEY = 'drpciv.settings.v2';
const MISTAKES_KEY = 'drpciv.mistakes.v1';

export const DEFAULTS = {
  lang: 'en',
  rotate: true,
  sound: true,
  mode: 'learn',
  hints: true, // show sign indications with live status in Test mode
  level: 'L1',
  car: 'golf5',
  progress: {}, // levelId -> { best: score, passed: bool }
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* storage may be blocked: the game works without it */
  }
}

export const loadSettings = () => ({ ...DEFAULTS, ...read(SETTINGS_KEY, {}) });
export const saveSettings = (s) => write(SETTINGS_KEY, s);

// ---- My Mistakes: how often each sign / rule went wrong -----------------------------
export const getMistakes = () => read(MISTAKES_KEY, {});
export function addMistake(key) {
  if (!key) return;
  const m = getMistakes();
  m[key] = (m[key] || 0) + 1;
  write(MISTAKES_KEY, m);
}
export function forgiveMistake(key) {
  const m = getMistakes();
  if (m[key]) {
    m[key] -= 1;
    if (m[key] <= 0) delete m[key];
    write(MISTAKES_KEY, m);
  }
}
export const topMistakes = (n = 5) =>
  Object.entries(getMistakes())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
