// ============================================================================
//  ui.js  —  everything that is NOT the road: HUD read-outs, speedometer,
//  sign card, feedback toasts, pickers (car / level), sign library, quiz,
//  results, "My Mistakes" drill, fuel station panel and the Final Boss ending.
//  All the words you see on screen are in this file (and in signs.js / levels.js).
// ============================================================================

import { CONFIG as C } from './config.js';
import { CATEGORIES, SIGNS, tr, visibleSignKeys } from './signs.js';
import { getSignDataURL } from './signart.js';
import { CARS, CAR_ORDER } from './cars.js';
import { LEVELS } from './levels.js';
import { sfx, vibrate, unlock, setEnabled as setSoundEnabled } from './audio.js';
import { addMistake, forgiveMistake, topMistakes } from './storage.js';
import { PEOPLE, pimg, logoURL } from './portraits.js';
import { createTheory } from './theory.js';
import { installAutoTranslate, HELP_RO } from './i18n.js';

const $ = (sel, el = document) => el.querySelector(sel);
const PIN_INFO = {
  camera: { t: { ro: 'Radar de viteză', en: 'Speed camera' }, d: { ro: 'Te fotografiază când treci pe lângă el. Dacă depășești limita, în modul Test primești puncte de penalizare.', en: 'It takes a photo as you pass. Over the limit costs penalty points in Test mode.' } },
  police: { t: { ro: 'Poliție', en: 'Police' }, d: { ro: 'Echipaj de poliție în zonă. Respectă limita și semnalizează.', en: 'Police patrol in the area. Keep to the limit and signal.' } },
  hazard: { t: { ro: 'Mașină oprită', en: 'Stopped car' }, d: { ro: 'Mașină oprită pe bandă. Încetinește, semnalizează și ocolește-o.', en: 'A car is stopped in the lane. Slow down, signal and go round it.' } },
  breakdown: { t: { ro: 'Mașină în pană', en: 'Breakdown' }, d: { ro: 'Încetinește și ocolește cu atenție.', en: 'Slow down and pass with care.' } },
  roadwork: { t: { ro: 'Lucrări', en: 'Roadworks' }, d: { ro: 'Drum îngustat. Încetinește.', en: 'The road narrows. Slow down.' } },
  station: { t: { ro: 'Benzinărie', en: 'Fuel station' }, d: { ro: 'Intră în stație, oprește, oprește motorul și alimentează.', en: 'Pull in, stop, switch the engine off and refuel.' } },
};
const svg = (d) => `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON = {
  car: svg('M3 15v-3l2-4.5A2 2 0 0 1 6.8 6h10.4a2 2 0 0 1 1.8 1.5L21 12v3M3 15h18M3 15v2.5h3V15M18 15v2.5h3V15'),
  flag: svg('M6 21V4M6 5h12l-2.5 4L18 13H6'),
  book: svg('M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4zM9 9h5M9 13h5'),
  restart: svg('M4 12a8 8 0 1 0 2.6-5.9M3.5 3.5v5h5'),
  bookOpen: svg('M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5M12 6.5C14 5 17 4.5 21 5v13c-4-.5-7 0-9 1.5M12 6.5v13'),
  quiz: svg('M9 4h6M8 4H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M8.5 11l1.5 1.5 3-3M8.5 17h7'),
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const CAT_ORDER = ['warning', 'priority', 'prohibition', 'mandatory', 'information'];
const WEATHER = { day: 'Day', night: 'Night', rain: 'Rain', fog: 'Fog' };
const ICON_OK = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_BAD = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>';
const NAV_ICON = {
  right: '<path d="M6 20V11a5 5 0 0 1 5-5h6M13 2l5 4-5 4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  left: '<path d="M18 20V11a5 5 0 0 0-5-5H7M11 2L6 6l5 4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  roundabout: '<circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12 22v-4M20 6l-3 3M8 4l4 2" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  finish: '<path d="M6 21V4M6 5h12l-2.5 4 2.5 4H6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  pickup: '<circle cx="12" cy="7" r="3.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  home: '<path d="M3 11l9-7 9 7M5 10v10h14V10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>',
  warn: '<path d="M12 3L2 20h20z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 9v5M12 17v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  fuel: '<path d="M5 20V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M4 20h12M15 9h2.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 3 0V8l-3-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
};

export function createUI({ settings, saveSettings, controls, renderer, actions }) {
  let G = { game: null, world: null, level: null };
  const overlays = $('#overlays');
  const modals = [];
  const reorient = () => {
    try {
      checkOrientation();
    } catch {
      /* not set up yet */
    }
  };
  let rotateSkipped = (() => {
    try {
      return localStorage.getItem('drpciv.rotateSkip') === '1';
    } catch {
      return false;
    }
  })();
  const lang = () => settings.lang;
  const retranslate = installAutoTranslate(document.getElementById('app'), () => settings.lang === 'ro');
  const img = (key, px = 192) => getSignDataURL(key, SIGNS[key].art, px);
  const name = (o) => tr(o, lang());
  const st = () => G.game.state;

  const catPill = (key) => {
    const c = CATEGORIES[key];
    const ink = key === 'priority' ? '#2a1d00' : '#ffffff';
    return `<span class="catpill" style="background:${c.color};color:${ink}">${esc(tr(c, lang()))}</span>`;
  };

  // ---------------------------------------------------------------- modals
  function openModal(html, { center = true, dismiss = true, onClose } = {}) {
    controls.clear();
    const el = document.createElement('div');
    el.className = 'overlay' + (center ? ' center' : '');
    el.innerHTML = html;
    const api = {
      el,
      close() {
        const i = modals.indexOf(api);
        if (i >= 0) modals.splice(i, 1);
        el.remove();
        reorient();
        if (onClose) onClose();
      },
    };
    el.addEventListener('pointerdown', (e) => {
      if (dismiss && e.target === el) api.close();
    });
    el.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('[data-close]')) api.close();
    });
    overlays.appendChild(el);
    modals.push(api);
    reorient();
    return api;
  }
  const closeAll = () => [...modals].forEach((m) => m.close());
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && modals.length) modals[modals.length - 1].close();
  });
  const head = (title, extra = '') => `<div class="sheet-head"><h2>${title}</h2>${extra}<button type="button" class="x" data-close aria-label="Close">&times;</button></div>`;
  const theory = createTheory({ openModal, head, signImg: (key, px) => img(key, px), sfx, esc, celebrate: (then, text) => celebrate(then, text) });

  // ------------------------------------------------------------ sign card
  const card = $('#card');
  const toast = $('#toast');
  let cardSign = null;
  let cardShownAt = 0;
  let lastActive = null;
  const CARD_SECONDS = 5; // how long a sign card stays on screen

  function renderCard(sg) {
    const d = sg.def;
    const ind = d.ind;
    card.style.setProperty('--cat', CATEGORIES[d.category].color);
    card.innerHTML = `
      <div class="cardrow">
        <img src="${img(sg.key, 128)}" alt="" />
        <div class="ctext">
          <div class="chd"><b class="nameRo">${esc(d.name.ro)}</b><span class="cmeta"><b id="cardDist"></b><i class="dot" id="cardDot"></i></span></div>
          <div class="nameEn">${esc(tr(CATEGORIES[d.category], lang()))} · ${esc(d.name.en)}</div>
          ${ind ? `<div class="donow"><div class="dt"><b>${lang() === 'en' ? 'Do now' : 'Acum'}</b> ${esc(tr(ind.do, lang()))}</div></div>` : ''}
        </div>
      </div>`;
  }
  function showCard(sg) {
    cardSign = sg;
    renderCard(sg);
    card.hidden = false;
  }
  function hideCard() {
    card.hidden = true;
    cardSign = null;
  }
  card.addEventListener('click', () => {
    if (cardSign) openLibrary(cardSign.key);
  });

  // tap a road sign on the map to read its explanation
  $('#game').addEventListener('pointerdown', (e) => {
    if (!G.game || modals.length) return;
    const sg = renderer.signAt(e.clientX, e.clientY);
    if (!sg) {
      const pin = renderer.pinAt(e.clientX, e.clientY);
      if (pin && PIN_INFO[pin.type]) {
        unlock();
        sfx.tap();
        const i = PIN_INFO[pin.type];
        showInfo(tr(i.t, lang()), tr(i.d, lang()));
      }
      return;
    }
    unlock();
    sfx.tap();
    openLibrary(sg.key);
  });

  // -------------------------------------------------------- feedback toast
  let toastTimer = 0;
  function hideToast() {
    toast.hidden = true;
    clearTimeout(toastTimer);
  }
  toast.addEventListener('click', hideToast);

  function showFeedback(fb) {
    updateScore();
    if (fb.ok) {
      sfx.ok();
      vibrate(20);
    } else {
      sfx.bad();
      vibrate([40, 40, 60]);
      if (!fb.issue && fb.signKey && !SIGNS[fb.signKey].hidden) addMistake(fb.signKey);
    }
    if (fb.quiz) return;
    hideCard();
    toast.className = fb.ok ? 'ok' : 'bad';
    const noImg = !fb.signKey;
    const title = fb.def ? esc(fb.def.name.ro) : esc(fb.title ? tr(fb.title, lang()) : 'Penalty');
    const right = fb.ok ? `+${fb.points}` : fb.penalty ? `Pen +${fb.penalty}` : '0';
    toast.innerHTML = `
      <div class="toastrow ${noImg ? 'noimg' : ''}">
        ${noImg ? '' : `<img src="${img(fb.signKey, 128)}" alt="" />`}
        <div>
          <div class="verdict ${fb.ok ? 'ok' : 'bad'}">${fb.ok ? ICON_OK : ICON_BAD}<span>${title}</span><span class="pts">${right}</span></div>
          <div class="msg">${esc(tr(fb.message, lang()))}</div>
          ${fb.ok || !fb.def ? '' : `<p class="rule">${esc(tr(fb.def.rule, lang()))}</p>`}
        </div>
      </div>`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, fb.ok ? 3200 : 7000);
  }

  function showDanTip(level, mode) {
    if (!level || !level.tip) return;
    const who = level.n % 2 ? 'dan' : 'petra';
    hideCard();
    toast.className = 'info';
    toast.innerHTML = `<div class="toastrow">${pimg(who)}<div><div class="verdict" style="color:var(--accent)">${esc(PEOPLE[who].name)} ${lang() === 'en' ? 'says' : 'zice'}</div><div class="msg" style="font-weight:500">${esc(tr(level.tip, lang()))}</div>${mode === 'test' ? '<p class="rule">Test: follow the purple route. 21 penalty points means failed.</p>' : ''}</div></div>`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 7000);
  }

  function showPersonToast(who, title, text) {
    hideCard();
    toast.className = 'info';
    toast.innerHTML = `<div class="toastrow">${pimg(who)}<div><div class="verdict" style="color:var(--accent)">${esc(title)}</div><div class="msg" style="font-weight:500">${esc(text)}</div></div></div>`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 6000);
  }

  function showInfo(title, text) {
    hideCard();
    toast.className = 'info';
    toast.innerHTML = `<div class="toastrow noimg"><div><div class="verdict" style="color:var(--accent)">${esc(title)}</div><div class="msg" style="font-weight:500">${esc(text)}</div></div></div>`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5500);
  }

  // ---------------------------------------------------------------- HUD
  const E = {
    pts: $('#pts'), pen: $('#pen'), lvName: $('#lvName'), fuelPill: $('#pillFuel'), fuelFill: $('#fuelFill'), fuelTxt: $('#fuelTxt'),
    progTxt: $('#progTxt'), progK: $('#progK'), alert: $('#alertPill'), alertImg: $('#alertImg'), alertTxt: $('#alertTxt'), alertDist: $('#alertDist'), alertDot: $('#alertDot'), pax: $('#pax'), paxTxt: $('#paxTxt'),
    limit: $('#limit'), limNum: $('#limNum'), nav: $('#nav'), navIcon: $('#navIcon'), navTxt: $('#navTxt'), wrong: $('#wrongWay'),
    sigL: $('#bSigL'), sigR: $('#bSigR'), haz: $('#bHaz'), lights: $('#bLights'), lightLv: $('#lightLv'), eng: $('#bEng'),
    station: $('#station'), speedoCv: $('#speedoCv'), miniCv: $('#minimapCv'), rotate: $('#rotate'),
  };

  function updateScore() {
    const t = st().test;
    const test = st().mode === 'test' && t;
    E.pen.hidden = !test;
    E.pts.textContent = test ? t.score : 0;
    if (test) {
      E.pen.textContent = `Pen ${t.penalty}/${C.exam.failAt}`;
      E.pen.classList.toggle('bad', t.penalty >= 15);
    }
  }

  // --- circular arc speedometer + gear indicator
  const sc = E.speedoCv.getContext('2d');
  let sSize = 0;
  function drawSpeedo(s) {
    const size = E.speedoCv.clientWidth || 120;
    const d = Math.min(window.devicePixelRatio || 1, 2.5);
    if (sSize !== size) {
      sSize = size;
      E.speedoCv.width = Math.round(size * d);
      E.speedoCv.height = Math.round(size * d);
    }
    sc.setTransform(d, 0, 0, d, 0, 0);
    sc.clearRect(0, 0, size, size);
    const car = s.car;
    const kmh = Math.abs(car.v) * 3.6;
    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.45;
    const a0 = Math.PI * 0.75;
    const sweep = Math.PI * 1.5;
    const MAXK = 160;
    sc.fillStyle = 'rgba(11,19,23,0.78)';
    sc.beginPath();
    sc.arc(cx, cy, size * 0.5 - 1, 0, Math.PI * 2);
    sc.fill();
    sc.strokeStyle = 'rgba(255,255,255,0.18)';
    sc.lineWidth = 1.5;
    sc.stroke();
    sc.lineCap = 'round';
    sc.lineWidth = size * 0.065;
    sc.strokeStyle = 'rgba(255,255,255,0.12)';
    sc.beginPath();
    sc.arc(cx, cy, R, a0, a0 + sweep);
    sc.stroke();
    const over = s.mode === 'test' && s.speedLimit && kmh > s.speedLimit + C.test.speedTolerance;
    const frac = clamp(kmh / MAXK, 0, 1);
    if (frac > 0.004) {
      sc.strokeStyle = over ? '#ff5d52' : kmh > 100 ? '#ffb84d' : '#4cc9f0';
      sc.shadowColor = sc.strokeStyle;
      sc.shadowBlur = 8;
      sc.beginPath();
      sc.arc(cx, cy, R, a0, a0 + sweep * frac);
      sc.stroke();
      sc.shadowBlur = 0;
    }
    // rev arc (thin, inside)
    const spec = s.spec;
    const rf = clamp((car.rpm - spec.idle) / (spec.redline - spec.idle), 0, 1);
    sc.lineWidth = size * 0.022;
    sc.strokeStyle = 'rgba(255,255,255,0.1)';
    sc.beginPath();
    sc.arc(cx, cy, R * 0.8, a0, a0 + sweep);
    sc.stroke();
    if (car.engineOn && rf > 0.01) {
      sc.strokeStyle = rf > 0.88 ? '#ff5d52' : '#ffd166';
      sc.beginPath();
      sc.arc(cx, cy, R * 0.8, a0, a0 + sweep * rf);
      sc.stroke();
    }
    // ticks
    sc.lineCap = 'butt';
    sc.fillStyle = 'rgba(255,255,255,0.75)';
    sc.font = `600 ${Math.round(size * 0.075)}px "Barlow Condensed", Arial Narrow, sans-serif`;
    sc.textAlign = 'center';
    sc.textBaseline = 'middle';
    for (let k = 0; k <= MAXK; k += 20) {
      const a = a0 + sweep * (k / MAXK);
      const long = k % 40 === 0;
      sc.strokeStyle = 'rgba(255,255,255,0.5)';
      sc.lineWidth = long ? 1.6 : 1;
      sc.beginPath();
      sc.moveTo(cx + Math.cos(a) * (R + size * 0.055), cy + Math.sin(a) * (R + size * 0.055));
      sc.lineTo(cx + Math.cos(a) * (R + size * (long ? 0.095 : 0.075)), cy + Math.sin(a) * (R + size * (long ? 0.095 : 0.075)));
      sc.stroke();
    }
    if (s.mode === 'test' && s.speedLimit) {
      const a = a0 + sweep * clamp(s.speedLimit / MAXK, 0, 1);
      sc.strokeStyle = '#ff5d52';
      sc.lineWidth = 2.6;
      sc.beginPath();
      sc.moveTo(cx + Math.cos(a) * (R - size * 0.05), cy + Math.sin(a) * (R - size * 0.05));
      sc.lineTo(cx + Math.cos(a) * (R + size * 0.1), cy + Math.sin(a) * (R + size * 0.1));
      sc.stroke();
    }
    // numbers
    sc.fillStyle = over ? '#ff8a80' : '#ffffff';
    sc.font = `700 ${Math.round(size * 0.3)}px "Barlow Condensed", Arial Narrow, sans-serif`;
    sc.fillText(String(Math.round(kmh)), cx, cy - size * 0.03);
    sc.fillStyle = 'rgba(255,255,255,0.65)';
    sc.font = `600 ${Math.round(size * 0.085)}px Inter, Arial, sans-serif`;
    sc.fillText('km/h', cx, cy + size * 0.17);
    // gear
    const g = car.gear < 0 ? 'R' : car.gear === 0 ? 'N' : String(car.gear);
    const bw = size * 0.2;
    const bh = size * 0.15;
    sc.fillStyle = car.gear < 0 ? '#ff8a65' : car.gear === 0 ? 'rgba(255,255,255,0.18)' : '#4cc9f0';
    sc.beginPath();
    sc.roundRect ? sc.roundRect(cx - bw / 2, cy + size * 0.26, bw, bh, 6) : sc.rect(cx - bw / 2, cy + size * 0.26, bw, bh);
    sc.fill();
    sc.fillStyle = car.gear === 0 ? '#fff' : '#04141c';
    sc.font = `800 ${Math.round(size * 0.12)}px Inter, Arial, sans-serif`;
    sc.fillText(g, cx, cy + size * 0.26 + bh / 2 + 1);
  }

  // --- next-manoeuvre banner (Waze style)
  let lastNav = '';
  function updateNav(s) {
    const { world } = G;
    const pr = s.prog;
    const total = world.route.length;
    let kind = 'finish';
    let text = '';
    const m = world.maneuvers.find((x) => x.s > pr.s - 4);
    const remain = total - pr.s;
    const rounded = (v) => Math.max(10, Math.round(v / 10) * 10);
    // level tasks that are not turns: lane changes, stopped car, breakdown spot, fuel station
    const en = lang() === 'en';
    const tasks = [];
    for (const l of world.laneTasks) tasks.push({ s: l.s, kind: l.to, en: `move to the ${l.to} lane — signal ${l.to}`, ro: `treci pe banda din ${l.to === 'left' ? 'stânga' : 'dreapta'} — semnalizează` });
    for (const o of world.obstacles) tasks.push({ s: o.s - 25, kind: 'warn', en: 'stopped car — signal left and pass it', ro: 'mașină oprită — semnalizează stânga și ocolește' });
    for (const h of world.hazardStops) tasks.push({ s: h.s, kind: 'warn', en: 'breakdown spot — stop with hazard lights on', ro: 'loc de pană — oprește cu avariile pornite' });
    if (world.mission && s.pax) {
      const px = s.pax;
      if (px.phase === 'waiting') tasks.push({ s: world.mission.pickup.s, kind: 'pickup', en: 'pick up Alisia — stop at the pink circle', ro: 'ia-o pe Alisia — oprește la cercul roz' });
      if (px.phase === 'in' && world.mission.destSpot) tasks.push({ s: world.mission.destSpot.s, kind: 'home', en: "Alisia's home — stop at the purple circle", ro: 'acasă la Alisia — oprește la cercul mov' });
    }
    if (world.refuel) tasks.push({ s: world.refuel.s - 35, kind: 'fuel', en: 'fuel station — stop at the pump, engine off, refuel', ro: 'benzinărie — oprește la pompă, motorul oprit, alimentează' });
    const tk = tasks.filter((q) => q.s - pr.s > -12 && q.s - pr.s < 240).sort((p1, p2) => p1.s - p2.s)[0];
    if (s.pax && (s.pax.phase === 'walking' || s.pax.phase === 'leaving')) {
      const key = 'pax|' + s.pax.phase + lang();
      if (key !== lastNav) {
        lastNav = key;
        E.nav.hidden = false;
        E.navIcon.innerHTML = NAV_ICON.pickup;
        E.navTxt.textContent = s.pax.phase === 'walking' ? (lang() === 'en' ? 'Alisia is getting in… stay stopped' : 'Alisia urcă în mașină… rămâi oprit') : lang() === 'en' ? 'Alisia is going home…' : 'Alisia merge acasă…';
      }
      return;
    }
    if (!pr.onRoute && s.mode === 'test') {
      kind = null;
    } else if (tk && (!m || tk.s <= m.s)) {
      const dist = tk.s - pr.s;
      kind = tk.kind;
      text = dist < 15 ? (en ? tk.en[0].toUpperCase() + tk.en.slice(1) : tk.ro[0].toUpperCase() + tk.ro.slice(1)) : en ? `In ${rounded(dist)} m ${tk.en}` : `Peste ${rounded(dist)} m ${tk.ro}`;
    } else if (m && m.s - pr.s < 220) {
      const dist = m.s - pr.s;
      kind = m.type;
      const en = { right: 'turn right', left: 'turn left', roundabout: 'enter the roundabout' };
      const ro = { right: 'virează la dreapta', left: 'virează la stânga', roundabout: 'intră în sensul giratoriu' };
      const hint = m.type !== 'roundabout' && dist > 25 ? (lang() === 'en' ? ' — signal first' : ' — semnalizează') : '';
      text = dist < 22 ? (lang() === 'en' ? `${en[m.type]} now` : `${ro[m.type]} acum`) : lang() === 'en' ? `In ${rounded(dist)} m ${en[m.type]}${hint}` : `Peste ${rounded(dist)} m ${ro[m.type]}${hint}`;
    } else if (remain < 300) {
      text = lang() === 'en' ? `Finish in ${rounded(remain)} m` : `Sosire în ${rounded(remain)} m`;
      const mission = world.mission;
      if (mission && mission.dest) text = lang() === 'en' ? `${mission.dest.name.split(',')[0]} in ${rounded(remain)} m` : `${mission.dest.name.split(',')[0]} peste ${rounded(remain)} m`;
    } else kind = null;
    const key = kind + '|' + text;
    if (key === lastNav) return;
    lastNav = key;
    E.nav.hidden = !kind;
    if (kind) {
      E.navIcon.innerHTML = NAV_ICON[kind];
      E.navTxt.textContent = text;
    }
  }

  // --- gas-station panel
  let lastStationKey = '';
  function updateStation(s) {
    const info = s.station;
    const car = s.car;
    const spec = s.spec;
    const show = info && info.inBay;
    E.station.hidden = !show;
    if (!show) {
      lastStationKey = '';
      return;
    }
    const rf = s.refueling;
    const key = `${info.canRefuel}|${!!rf}|${car.fuel >= spec.tankL - 0.05}`;
    if (key !== lastStationKey) {
      lastStationKey = key;
      if (rf) E.station.innerHTML = `<div><b>Filling up…</b> <span id="stL"></span></div><div class="row2"><button class="ghost" data-st="stop">Stop</button></div>`;
      else if (info.canRefuel) {
        E.station.innerHTML = car.fuel >= spec.tankL - 0.05 ? '<div><b>Tank is full.</b> Start the engine to leave.</div>' : `<div><b>${esc(info.name)}</b> · ${C.fuel.pricePerLitre} RON / L</div><div class="row2"><button data-st="10">+10 L</button><button data-st="full">Full tank</button></div>`;
      } else E.station.innerHTML = '<div><b>Fuel bay.</b> Switch the engine off with the power button to refuel.</div>';
    }
    if (rf) {
      const el = $('#stL');
      if (el) el.textContent = `${car.fuel.toFixed(1)} / ${spec.tankL} L · ${s.fuelSpent.toFixed(0)} RON`;
      if (Math.random() < 0.1) sfx.pump();
    }
  }
  E.station.addEventListener('click', (e) => {
    const b = e.target.closest('[data-st]');
    if (!b) return;
    unlock();
    if (b.dataset.st === 'stop') G.game.stopRefuel();
    else G.game.startRefuel(b.dataset.st === 'full' ? 'full' : 10);
  });

  let frame = 0;
  function update() {
    if (!G.game) return;
    const s = st();
    const car = s.car;
    frame++;
    drawSpeedo(s);
    if (frame % 3 === 0) renderer.drawMinimap(E.miniCv, E.miniCv.clientWidth || 100, s);

    // fuel
    const frac = car.fuel / s.spec.tankL;
    E.fuelFill.style.width = `${Math.round(frac * 100)}%`;
    E.fuelTxt.textContent = `${Math.round(frac * 100)}%`;
    E.fuelPill.classList.toggle('low', frac < C.fuel.lowFraction);

    // lights, signals, engine
    const blink = s.blink === 1;
    E.sigL.classList.toggle('on', car.signal === 'left' && !car.hazard);
    E.sigR.classList.toggle('on', car.signal === 'right' && !car.hazard);
    E.haz.classList.toggle('on', car.hazard);
    E.sigL.classList.toggle('blink', blink && (car.signal === 'left' || car.hazard));
    E.sigR.classList.toggle('blink', blink && (car.signal === 'right' || car.hazard));
    E.haz.classList.toggle('blink', blink && car.hazard);
    E.lights.dataset.l = car.lights;
    E.lightLv.textContent = ['OFF', 'POS', 'LOW', 'HIGH'][car.lights];
    E.eng.classList.toggle('off', !car.engineOn && car.starting <= 0);
    E.eng.classList.toggle('starting', car.starting > 0);

    // speed limit badge
    const lim = s.mode === 'test' ? s.speedLimit : null;
    E.limit.hidden = lim == null;
    if (lim != null) {
      E.limNum.textContent = lim;
      E.limit.classList.toggle('over', Math.abs(car.v) * 3.6 > lim + C.test.speedTolerance);
    }
    E.wrong.hidden = !(s.mode === 'test' && s.wrongWay);

    // progress pill
    if (s.mode === 'test' && s.test) {
      const done = s.test.tasks.filter((t) => t.status === 'done').length;
      E.progTxt.textContent = `${done}/${s.test.tasks.length}`;
      E.progK.textContent = 'checks';
    } else {
      E.progTxt.textContent = `${Math.round(clamp(s.prog.s / G.world.route.length, 0, 1) * 100)}%`;
      E.progK.textContent = 'route';
    }

    // sign indication dock: what the sign asks, how far, and (Test) whether you are meeting it
    const a = s.activeSign;
    const ind = a ? G.game.indication() : null;
    E.alert.hidden = true;
    if (ind && !card.hidden) {
      const dEl = $('#cardDist', card);
      if (dEl) dEl.textContent = `${Math.round(ind.dist)} m`;
      const dot = $('#cardDot', card);
      if (dot) dot.className = 'dot ' + (s.mode === 'test' ? ind.status : 'hide');
    }

    // Alisia (passenger) reacts to how you drive
    E.pax.hidden = !s.passenger;
    if (s.passenger) {
      const wince = s.mood === 'wince';
      const txt = !wince ? '' : { brake: lang() === 'en' ? 'Easy on the brakes!' : 'Mai ușor la frână!', speed: lang() === 'en' ? 'Slow down!' : 'Încet, te rog!', rule: lang() === 'en' ? 'Careful!' : 'Atenție!' }[s.moodWhy] || '';
      E.pax.classList.toggle('wince', wince);
      if (E.paxTxt.textContent !== txt) E.paxTxt.textContent = txt;
    }

    updateNav(s);
    updateStation(s);
    updateScore();

    // the dock follows the sign you are approaching (Learn, and Test when indications are on)
    //   shown once per approach, for about 5 seconds (long enough to read); tap a sign on the road for more
    const wantCard = !modals.length && (s.mode === 'learn' || (s.mode === 'test' && settings.hints));
    const now = performance.now();
    if (!a) lastActive = null;
    if (wantCard && a && a !== lastActive && toast.hidden) {
      lastActive = a;
      showCard(a);
      cardShownAt = now;
    }
    if (cardSign && (!wantCard || now - cardShownAt > CARD_SECONDS * 1000)) hideCard();
  }

  function checkOrientation() {
    const portrait = window.innerHeight > window.innerWidth * 1.02;
    // The game works upright too, so it never blocks: just one friendly hint, once.
    E.rotate.hidden = true;
    if (portrait && !rotateSkipped && !modals.length && G.game) {
      rotateSkipped = true;
      try {
        localStorage.setItem('drpciv.rotateSkip', '1');
      } catch {
        /* ignore */
      }
      const en = lang() === 'en';
      showInfo(en ? 'Tip' : 'Sfat', en ? 'You can play upright, but sideways you see more of the road.' : 'Poți juca și cu telefonul vertical, dar ținut orizontal vezi mai mult din drum.');
    }
  }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 150));
  $('#rotateSkip').addEventListener('click', () => {
    rotateSkipped = true;
    try {
      localStorage.setItem('drpciv.rotateSkip', '1');
    } catch {
      /* ignore */
    }
    checkOrientation();
  });

  // ------------------------------------------------------------ sign library
  function openLibrary(startKey = null) {
    let filter = 'all';
    let query = '';
    let openKey = startKey;
    const m = openModal(`
      <div class="sheet wide" role="dialog" aria-label="Road sign library">
        ${head('<span id="libTitle">Road Sign Library</span>', '<button type="button" class="x" id="libLang" style="font-size:13px;font-weight:800"></button>')}
        <div class="searchbar" id="libSearchBar"><input id="libSearch" type="search" placeholder="Search a sign, a rule or an exam trap" autocomplete="off" /></div>
        <div class="chips" id="libChips"></div>
        <div class="sheet-body" id="libBody"></div>
      </div>`);
    const chips = $('#libChips', m.el);
    const body = $('#libBody', m.el);
    function render() {
      $('#libLang', m.el).textContent = lang().toUpperCase();
      $('#libTitle', m.el).textContent = openKey ? tr(SIGNS[openKey].name, lang()) : 'Road Sign Library';
      chips.hidden = !!openKey;
      $('#libSearchBar', m.el).hidden = !!openKey;
      if (openKey) return renderDetail();
      chips.innerHTML = ['all', ...CAT_ORDER].map((k) => `<button type="button" class="fchip ${k === filter ? 'on' : ''}" data-f="${k}">${k === 'all' ? 'All' : esc(tr(CATEGORIES[k], lang()))}</button>`).join('');
      const keys = visibleSignKeys()
        .filter((k) => filter === 'all' || SIGNS[k].category === filter)
        .filter((k) => {
          if (!query) return true;
          const sg = SIGNS[k];
          const hay = [sg.name.ro, sg.name.en, sg.rule.ro, sg.rule.en, sg.ind && sg.ind.do.en, sg.ind && sg.ind.trap.en, sg.ind && sg.ind.legal.en].join(' ').toLowerCase();
          return hay.includes(query);
        })
        .sort((a, b) => CAT_ORDER.indexOf(SIGNS[a].category) - CAT_ORDER.indexOf(SIGNS[b].category));
      body.innerHTML = keys.length ? `<div class="grid">${keys
        .map((k) => `<button type="button" class="tile" data-k="${k}" style="--cat:${CATEGORIES[SIGNS[k].category].color}"><img src="${img(k, 192)}" alt="" /><b>${esc(SIGNS[k].name.ro)}</b><small>${esc(SIGNS[k].name.en)}</small></button>`)
        .join('')}</div>` : '<p class="empty">No sign matches that search.</p>';
      body.scrollTop = 0;
    }
    function renderDetail() {
      const s = SIGNS[openKey];
      const other = lang() === 'en' ? 'ro' : 'en';
      body.innerHTML = `
        <button type="button" class="btn ghost" data-back style="min-height:40px;margin-bottom:6px">&larr; All signs</button>
        <div class="detail row">
          <img src="${img(openKey, 320)}" alt="${esc(s.name.en)}" />
          <div class="dtxt">
            <div>${catPill(s.category)}</div>
            <div class="nameRo">${esc(s.name.ro)}</div>
            <div class="nameEn">${esc(s.name.en)}</div>
            <p class="rule">${esc(tr(s.rule, lang()))}</p>
          </div>
        </div>
        ${s.ind ? `<div class="isecs">
          <div class="isec"><h4>${lang() === 'en' ? 'Do now' : 'Acum'}</h4><p>${esc(tr(s.ind.do, lang()))}</p></div>
          <div class="isec"><h4>${lang() === 'en' ? 'Legal meaning' : 'Semnificație'}</h4><p>${esc(tr(s.ind.legal, lang()))}</p></div>
          <div class="isec trap"><h4>${lang() === 'en' ? 'Common exam trap' : 'Capcană la examen'}</h4><p>${esc(tr(s.ind.trap, lang()))}</p></div>
        </div><p class="empty" style="text-align:left;padding:8px 0 0">${esc(tr(s.rule, other))}</p>
        <p class="empty" style="text-align:left;padding:4px 0 0;font-size:11px">Check the official text (OUG 195/2002, Annex 2) before relying on this for the exam.</p>` : ''}`;
      body.scrollTop = 0;
    }
    m.el.addEventListener('click', (e) => {
      const f = e.target.closest('[data-f]');
      const k = e.target.closest('[data-k]');
      if (f) {
        filter = f.dataset.f;
        sfx.tap();
        render();
      } else if (k) {
        openKey = k.dataset.k;
        sfx.tap();
        render();
      } else if (e.target.closest('[data-back]')) {
        openKey = null;
        render();
      } else if (e.target.closest('#libLang')) setLang(lang() === 'en' ? 'ro' : 'en');
    });
    $('#libSearch', m.el).addEventListener('input', (e) => {
      query = e.target.value.trim().toLowerCase();
      render();
    });
    m.rerender = render;
    render();
    return m;
  }

  function setLang(l) {
    settings.lang = l;
    saveSettings();
    retranslate();
    modals.forEach((mm) => mm.rerender && mm.rerender());
    if (cardSign && !card.hidden) renderCard(cardSign);
    lastNav = '';
  }

  // -------------------------------------------------------------------- quiz
  function onQuiz(q) {
    const m = openModal(
      `<div class="sheet quizsheet" role="dialog" aria-label="Quiz question">
        <div class="quiz">
          <img src="${img(q.signKey, 300)}" alt="Road sign" />
          <div class="qcol">
            <h2>What does this sign mean?</h2>
            ${q.options.map((k) => `<button type="button" class="opt" data-key="${k}"><b>${esc(SIGNS[k].name.ro)}</b><small>${esc(SIGNS[k].name.en)}</small></button>`).join('')}
            <div id="qres" style="width:100%"></div>
          </div>
        </div>
      </div>`,
      { dismiss: false }
    );
    m.el.addEventListener('click', (e) => {
      const b = e.target.closest('.opt');
      if (!b || q.answered) return;
      const res = G.game.answerQuiz(b.dataset.key);
      if (!res) return;
      for (const o of m.el.querySelectorAll('.opt')) {
        if (o.dataset.key === res.right) o.classList.add('right');
        else if (o === b) o.classList.add('wrong');
      }
      const right = SIGNS[res.right];
      $('#qres', m.el).innerHTML = `
        <div class="explain">
          <div class="verdict ${res.ok ? 'ok' : 'bad'}">${res.ok ? ICON_OK : ICON_BAD}<span>${res.ok ? 'Correct!' : 'Not quite'}</span><span class="pts">${res.ok ? '+' + C.test.pointsPerSign : 'Pen +' + C.exam.penalty.quiz}</span></div>
          <div><b>${esc(right.name.ro)}</b>. ${esc(tr(right.rule, lang()))}</div>
        </div>
        <button type="button" class="btn block" id="qnext" style="margin-top:8px">Continue driving</button>`;
      $('#qnext', m.el).addEventListener('click', () => {
        G.game.closeQuiz();
        m.close();
      });
    });
  }

  // ------------------------------------------------- "My Mistakes" flash drill
  function openDrill() {
    const keys = visibleSignKeys();
    const picks = topMistakes(5).map((x) => x.key).filter((k) => SIGNS[k] && !SIGNS[k].hidden);
    const pool = keys.filter((k) => !picks.includes(k)).sort(() => Math.random() - 0.5);
    const list = [...picks, ...pool].slice(0, 5);
    const hadMistakes = picks.length > 0;
    let i = 0;
    let right = 0;
    const m = openModal(`<div class="sheet quizsheet" role="dialog" aria-label="My mistakes"><div class="quiz" id="drillBody"></div></div>`, { dismiss: true });
    const body = $('#drillBody', m.el);
    function ask() {
      if (i >= list.length) {
        body.innerHTML = `<div class="qcol" style="text-align:center;grid-column:1/-1"><h2>${right} / ${list.length} correct</h2><p class="empty">${hadMistakes ? 'Signs you got right are removed from your mistakes list.' : 'No mistakes saved yet, so this was a random round. Mistakes you make in Test mode show up here.'}</p><button type="button" class="btn block" data-close>Done</button></div>`;
        return;
      }
      const key = list[i];
      const others = keys.filter((k) => k !== key).sort(() => Math.random() - 0.5);
      const same = others.filter((k) => SIGNS[k].category === SIGNS[key].category);
      const opts = [key, same[0] || others[0], others.find((k) => k !== same[0]) || others[1]].filter(Boolean).sort(() => Math.random() - 0.5);
      body.innerHTML = `<img src="${img(key, 300)}" alt="Road sign" />
        <div class="qcol"><div class="pin" style="text-align:left">${hadMistakes && picks.includes(key) ? 'From your mistakes · ' : ''}Question ${i + 1} of ${list.length}</div>
          <h2>What does this sign mean?</h2>
          ${opts.map((k) => `<button type="button" class="opt" data-key="${k}"><b>${esc(SIGNS[k].name.ro)}</b><small>${esc(SIGNS[k].name.en)}</small></button>`).join('')}
          <div id="dres" style="width:100%"></div></div>`;
      let done = false;
      body.onclick = (e) => {
        const b = e.target.closest('.opt');
        if (!b || done) return;
        done = true;
        const ok = b.dataset.key === key;
        if (ok) {
          right++;
          forgiveMistake(key);
          sfx.ok();
        } else {
          addMistake(key);
          sfx.bad();
        }
        for (const o of body.querySelectorAll('.opt')) {
          if (o.dataset.key === key) o.classList.add('right');
          else if (o === b) o.classList.add('wrong');
        }
        $('#dres', body).innerHTML = `<div class="explain"><b>${esc(SIGNS[key].name.ro)}</b>. ${esc(tr(SIGNS[key].rule, lang()))}</div><button type="button" class="btn block" id="dnext" style="margin-top:8px">${i + 1 < list.length ? 'Next' : 'See result'}</button>`;
        $('#dnext', body).onclick = () => {
          i++;
          ask();
        };
      };
    }
    ask();
  }

  // ----------------------------------------------------------------- results
  // ------------------------------------------------------- level celebration
  function celebrate(then, text, extra = null) {
    const en = text ? false : lang() === 'en'; // the theory book is in Romanian
    const colors = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#f78c6b', '#c77dff'];
    const bits = Array.from({ length: 70 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${(Math.random() * 1.2).toFixed(2)}s;animation-duration:${(2.2 + Math.random() * 1.6).toFixed(2)}s;transform:rotate(${Math.floor(Math.random() * 360)}deg)"></i>`).join('');
    const title = text ? text.title : en ? 'Congratulations!' : 'Felicitări!';
    const sub = text ? text.sub : en ? 'You completed this level!' : 'Ai completat acest nivel!';
    const m = openModal(
      `<div class="party">${bits}</div>
       <div class="sheet celebrate" role="dialog" aria-label="${esc(title)}">
         <div class="trophy">🏆</div>
         <h2>${esc(title)}</h2>
         <p>${esc(sub)}</p>
         ${extra && extra.level ? `<div class="cel-level">${esc(extra.level)}</div>` : ''}
         ${extra && extra.stats ? `<div class="cel-stats">${extra.stats.map(([k, v]) => `<div><b>${esc(v)}</b><small>${esc(k)}</small></div>`).join('')}</div>` : ''}
         ${pimg('naty', 'sm')}
         ${
           extra && extra.buttons
             ? `<div class="cel-btns">${extra.buttons.map((b, i) => `<button type="button" class="btn ${b.primary ? '' : 'ghost'}" data-b="${i}">${esc(b.label)}</button>`).join('')}</div>`
             : `<button type="button" class="btn big" data-go>${then ? (en ? 'See results' : 'Vezi rezultatul') : en ? 'Continue' : 'Continuă'}</button>`
         }
       </div>`,
      { dismiss: false }
    );
    sfx.fanfare ? sfx.fanfare() : sfx.ok();
    vibrate([60, 40, 60, 40, 120]);
    const go = m.el.querySelector('[data-go]');
    if (go)
      go.addEventListener('click', () => {
        m.close();
        if (then) then();
      });
    for (const b of m.el.querySelectorAll('[data-b]'))
      b.addEventListener('click', () => {
        m.close();
        extra.buttons[+b.dataset.b].fn();
      });
  }

  /** The end-of-level screen in Learn mode: time, next level, play again. */
  function levelDoneScreen(e) {
    const en = lang() === 'en';
    const level = G.level;
    const next = level ? LEVELS.find((l) => l.n === level.n + 1 && l.playable) : null;
    const secs = Math.max(0, Math.round(e.seconds || 0));
    const signs = (G.world.signs || []).length;
    celebrate(null, null, {
      level: level ? `${level.id === 'free' ? 'Free Roam' : (en ? 'Level ' : 'Nivelul ') + level.n} · ${tr(level.title, lang())}` : '',
      stats: [
        [en ? 'time' : 'timp', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`],
        [en ? 'signs on the way' : 'indicatoare pe traseu', String(signs)],
      ],
      buttons: [
        ...(next ? [{ label: en ? `Next: level ${next.n}` : `Nivelul ${next.n}`, primary: true, fn: () => actions.startLevel(next.id, { mode: 'learn' }) }] : []),
        { label: en ? 'Try it in Test mode' : 'Încearcă în modul Test', primary: !next, fn: () => switchMode('test') },
        { label: en ? 'Play again' : 'Joacă din nou', fn: () => restartLevel() },
      ],
    });
  }

  function onFinish(sum) {
    const level = G.level;
    if (level) {
      const prev = settings.progress[level.id] || { best: 0, passed: false };
      settings.progress[level.id] = { best: Math.max(prev.best, sum.score), passed: prev.passed || sum.passed };
      saveSettings();
    }
    if (sum.boss && sum.passed && sum.reachedFinish) return openEnding(sum);
    if (sum.passed && sum.reachedFinish && !sum._celebrated) {
      sum._celebrated = true;
      const en = lang() === 'en';
      const secs = Math.round(sum.seconds || 0);
      return celebrate(() => onFinish(sum), null, {
        level: level ? `${level.id === 'free' ? 'Free Roam' : (en ? 'Level ' : 'Nivelul ') + level.n} · ${tr(level.title, lang())}` : '',
        stats: [
          [en ? 'checks right' : 'verificări corecte', `${sum.tasks.filter((t) => t.ok).length}/${sum.tasks.length}`],
          [en ? 'penalty' : 'penalizare', `${sum.penalty}/21`],
          [en ? 'time' : 'timp', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`],
        ],
      });
    }
    const pct = sum.max ? Math.round((sum.score / sum.max) * 100) : 0;
    const mins = Math.floor(sum.seconds / 60);
    const secs = String(Math.round(sum.seconds % 60)).padStart(2, '0');
    const catRows = CAT_ORDER.filter((k) => sum.cats[k].total)
      .map((k) => {
        const c = sum.cats[k];
        return `<div class="catrow" style="--cat:${CATEGORIES[k].color}"><span class="label">${esc(tr(CATEGORIES[k], lang()))}</span><span class="val">${c.correct}/${c.total}</span><div class="bar"><i style="width:${Math.round((c.correct / c.total) * 100)}%"></i></div></div>`;
      })
      .join('');
    const wrong = sum.tasks.filter((t) => !t.ok);
    const mistakes = [
      ...wrong.map((t) => `<div class="miss"><img src="${img(t.key, 96)}" alt="" /><div><b>${esc(t.def.name.ro)}</b> <span class="pn">${t.missed ? 'not reached' : 'Pen +' + t.penalty}</span><p>${esc(t.message ? tr(t.message, lang()) : tr(t.def.rule, lang()))}</p></div></div>`),
      ...sum.issues.map((i) => `<div class="miss noimg"><div><b>${esc(i.title ? tr(i.title, lang()) : 'Penalty')}</b> <span class="pn">Pen +${i.pts}</span><p>${esc(tr(i.message, lang()))}</p></div></div>`),
    ].join('');
    const wellCount = sum.tasks.filter((t) => t.ok).length;
    const next = level ? LEVELS.find((l) => l.n === level.n + 1 && l.playable) : null;
    const verdict = sum.eliminated ? 'Exam stopped: 21 penalty points reached' : sum.passed ? (sum.reachedFinish ? 'Passed' : 'Ended early') : 'Not passed';
    const m = openModal(
      `<div class="sheet wide" role="dialog" aria-label="Level result">
        ${head(`${level ? esc(name(level.title)) : 'Test'} · result`)}
        <div class="sheet-body cols">
          <div class="c1">
            <div class="score"><div class="big ${sum.passed ? 'okc' : 'badc'}">${sum.passed ? 'PASSED' : 'FAILED'}</div><div class="pct">${esc(verdict)}</div></div>
            <div class="stats">
              <div><b>${sum.score}</b><span>points</span></div>
              <div><b class="${sum.penalty >= sum.failAt ? 'badc' : ''}">${sum.penalty}</b><span>penalty / ${sum.failAt}</span></div>
              <div><b>${wellCount}/${sum.total}</b><span>checks ok</span></div>
              <div><b>${mins}:${secs}</b><span>time</span></div>
            </div>
            <div class="stack">
              ${next && sum.passed ? '<button type="button" class="btn" id="rNext">Next level</button>' : ''}
              <button type="button" class="btn ${next && sum.passed ? 'ghost' : ''}" id="rAgain">Try again</button>
              <button type="button" class="btn ghost" id="rLevels">All levels</button>
            </div>
          </div>
          <div class="c2">
            <div class="sectionTitle" style="margin-top:0">Score by category</div>
            ${catRows}
            <div class="sectionTitle">What to review</div>
            ${mistakes || '<p class="empty">Nothing to review. Clean run!</p>'}
          </div>
        </div>
      </div>`,
      { dismiss: false }
    );
    $('#rAgain', m.el).addEventListener('click', () => {
      m.close();
      G.game.restart();
    });
    $('#rLevels', m.el).addEventListener('click', () => {
      m.close();
      openLevels();
    });
    const nx = $('#rNext', m.el);
    if (nx)
      nx.addEventListener('click', () => {
        m.close();
        actions.startLevel(next.id, { mode: 'test' });
      });
  }

  function openEnding(sum) {
    const car = CARS[sum.carId];
    const who = C.story.passenger;
    const acc = sum.total ? Math.round((sum.correct / sum.total) * 100) : 0;
    const m = openModal(
      `<div class="sheet wide ending" role="dialog" aria-label="Final Boss ending">
        <div class="sheet-body cols endcols">
          <div class="c1">
            <div class="licence">
              <div class="lhead"><span>ROMÂNIA</span><b>PERMIS DE CONDUCERE</b></div>
              <div class="lbody"><div class="lphoto">${pimg('naty')}</div>
                <div><div class="lk">Categoria</div><b>B</b><div class="lk">Autoturism</div><b>${esc(car.name)}</b><div class="lk">Penalizări</div><b>${sum.penalty} / ${sum.failAt}</b></div></div>
            </div>
          </div>
          <div class="c2">
            <h2 class="endtitle">Ai ajuns acasă.</h2>
            <div class="duo">${pimg('naty')}<span>Naty</span><i>&amp;</i>${pimg('alisia')}<span>${esc(who)}</span></div>
            <p class="endmsg">${esc(who)} a ajuns cu bine în Sânpetru, la ${esc('Str. Sfinții Constantin și Elena 41')}. Ai fost atent la semne, la viteză și la semnalizare. Drum bun mereu.</p>
            <p class="endmsg en">${esc(who)} is home safe in Sânpetru. You watched the signs, your speed and your signals the whole way.</p>
            <div class="stats">
              <div><b>${sum.score}</b><span>points</span></div>
              <div><b>${acc}%</b><span>accuracy</span></div>
              <div><b>${Math.floor(sum.seconds / 60)}:${String(Math.round(sum.seconds % 60)).padStart(2, '0')}</b><span>time</span></div>
              <div><b>${sum.fuelSpent.toFixed(0)}</b><span>RON fuel</span></div>
            </div>
            <p class="route">Livada Poștei &rarr; Sânpetru, Str. Sfinții Constantin și Elena 41 · Developed by Naty</p>
            <div class="stack"><button type="button" class="btn" id="eAgain">Drive again</button><button type="button" class="btn ghost" id="eLevels">All levels</button></div>
          </div>
        </div>
      </div>`,
      { dismiss: false }
    );
    $('#eAgain', m.el).addEventListener('click', () => {
      m.close();
      G.game.restart();
    });
    $('#eLevels', m.el).addEventListener('click', () => {
      m.close();
      openLevels();
    });
  }

  // ------------------------------------------------------------ car selector
  function openCars() {
    const bar = (n) => `<span class="sb">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
    const m = openModal(`
      <div class="sheet wide" role="dialog" aria-label="Choose a car">
        ${head('Choose your car')}
        <div class="sheet-body"><div class="cargrid">
          ${CAR_ORDER.map((id) => {
            const c = CARS[id];
            return `<button type="button" class="carcard ${settings.car === id ? 'sel' : ''}" data-car="${id}">
              <div class="chead"><b>${esc(c.name)}</b><span class="diff ${c.difficulty.toLowerCase()}">${c.difficulty}</span></div>
              <div class="csub">${esc(c.engine)} · ${c.massKg} kg</div>
              <p class="cblurb">${esc(c.blurb)}</p>
              <div class="cstats"><span>Acceleration</span>${bar(c.stats.accel)}<span>Top speed</span>${bar(c.stats.top)}<span>Handling</span>${bar(c.stats.handling)}<span>Braking</span>${bar(c.stats.braking)}<span>Fuel economy</span>${bar(c.stats.economy)}</div>
            </button>`;
          }).join('')}
        </div></div>
      </div>`);
    m.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-car]');
      if (!b) return;
      sfx.tap();
      m.close();
      actions.changeCar(b.dataset.car);
    });
  }

  // ---------------------------------------------------------- level selector
  function openLevels() {
    const done = (l) => settings.progress[l.id] && settings.progress[l.id].passed;
    const m = openModal(`
      <div class="sheet wide" role="dialog" aria-label="Choose a level">
        ${head('Driving school levels')}
        <div class="sheet-body"><div class="lvgrid">
          ${LEVELS.map((l) => {
            const tag = l.id === 'free' ? 'FREE' : l.boss ? 'BOSS' : `L${l.n}`;
            return `<button type="button" class="lvtile ${l.playable ? 'play' : 'soon'} ${G.level && G.level.id === l.id ? 'sel' : ''}" data-lv="${l.id}">
              <span class="lvtag">${tag}</span><b>${esc(name(l.title))}</b><span class="lvd">${esc(l.district)}</span>
              <span class="lvm">${WEATHER[l.weather]} · ${l.boss && !done(LEVELS.find((x) => x.id === 'L15')) ? 'Locked: pass Level 15' : l.playable ? (done(l) ? 'Passed ✓' : 'Play') : 'Coming next'}</span></button>`;
          }).join('')}
        </div>
        <p class="empty" style="text-align:left">The city is stylised: level names are Brașov districts, not real street maps. The Final Boss unlocks after Level 15.</p></div>
      </div>`);
    m.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lv]');
      if (!b) return;
      const l = LEVELS.find((x) => x.id === b.dataset.lv);
      sfx.tap();
      m.close();
      if (l.boss && !done(LEVELS.find((x) => x.id === 'L15'))) openBossLocked(l);
      else if (l.playable) actions.startLevel(l.id, { mode: l.id === 'free' ? 'learn' : settings.mode });
      else openSoon(l);
    });
  }
  function openBossLocked(l) {
    const m = openModal(`
      <div class="sheet" role="dialog" aria-label="Final Boss locked">
        ${head('Final Boss is locked')}
        <div class="sheet-body">
          <p class="rule" style="margin-bottom:12px">Pass Level 15 (the licence test) to unlock the drive from Livada Poștei to Sânpetru.</p>
          <div class="stack"><button type="button" class="btn" id="bossTry">Preview it anyway</button><button type="button" class="btn ghost" data-close>Close</button></div>
        </div>
      </div>`);
    $('#bossTry', m.el).addEventListener('click', () => {
      m.close();
      actions.startLevel(l.id, { mode: settings.mode });
    });
  }

  function openSoon(l) {
    const m = openModal(`
      <div class="sheet" role="dialog" aria-label="Level preview">
        ${head(`Level ${l.n}: ${esc(name(l.title))}`)}
        <div class="sheet-body">
          <p><b>${esc(l.district)}</b> · ${WEATHER[l.weather]}</p>
          <p class="rule" style="margin:8px 0 12px">${esc(name(l.goal))}</p>
          <p class="empty" style="text-align:left">This level is scaffolded (topic, district and conditions are set) but its map and checks are not built yet.</p>
          <div class="stack" style="margin-top:12px"><button type="button" class="btn" id="soonTry">Try ${WEATHER[l.weather].toLowerCase()} conditions in Free Roam</button><button type="button" class="btn ghost" data-close>Close</button></div>
        </div>
      </div>`);
    $('#soonTry', m.el).addEventListener('click', () => {
      m.close();
      actions.startLevel('free', { mode: 'learn', weather: l.weather });
    });
  }

  // ----------------------------------------------------------- menu & help
  function openMenu() {
    const s = st();
    const m = openModal(`
      <div class="sheet" role="dialog" aria-label="Menu">
        ${head('Meniu')}
        <div class="sheet-body">
          <div class="mtiles">
            <button type="button" class="mtile" id="mCar">${ICON.car}<span>Mașina</span></button>
            <button type="button" class="mtile" id="mLevel">${ICON.flag}<span>Nivel</span></button>
            <button type="button" class="mtile" id="mSigns">${ICON.book}<span>Semne</span></button>
            <button type="button" class="mtile" id="mTheory">${ICON.quiz}<span>Chestionare</span></button>
            <button type="button" class="mtile" id="mBook">${ICON.bookOpen}<span>Carte</span></button>
            <button type="button" class="mtile" id="mRestart">${ICON.restart}<span>Restart</span></button>
          </div>
          <div class="row"><span>Mod<small>Learn: explică semnele · Test: examen cu puncte de penalizare</small></span><div class="seg2" data-set="mode"><button type="button" data-v="learn">Learn</button><button type="button" data-v="test">Test</button></div></div>
          <div class="row"><span>Steering<small>Arrows are easier; the wheel is more realistic</small></span><div class="seg2" data-set="steering"><button type="button" data-v="arrows">Arrows</button><button type="button" data-v="wheel">Wheel</button></div></div>
          <div class="row"><span>Rule language<small>Sign names show in Romanian and English</small></span><div class="seg2" data-set="lang"><button type="button" data-v="en">EN</button><button type="button" data-v="ro">RO</button></div></div>
          <div class="row"><span>Conditions<small>Night, rain and fog need low beams (L key)</small></span><div class="seg2" data-set="weather">${Object.keys(WEATHER).map((w) => `<button type="button" data-v="${w}">${WEATHER[w]}</button>`).join('')}</div></div>
          <div class="row"><span>Test indications<small>Show what each sign asks, with live status</small></span><div class="seg2" data-set="hints"><button type="button" data-v="1">On</button><button type="button" data-v="0">Off</button></div></div>
          <div class="row"><span>Camera</span><div class="seg2" data-set="rotate"><button type="button" data-v="1">Turning</button><button type="button" data-v="0">Fixed</button></div></div>
          <div class="row"><span>Sound &amp; vibration</span><div class="seg2" data-set="sound"><button type="button" data-v="1">On</button><button type="button" data-v="0">Off</button></div></div>
          <div class="stack two" style="margin-top:12px">
            <button type="button" class="btn ghost" id="mDrill">My Mistakes drill</button>
            <button type="button" class="btn ghost" id="mHelp">How to play</button>
            <button type="button" class="btn warn" id="mFinish" ${s.mode === 'test' ? '' : 'hidden'}>Finish test now</button>
            <button type="button" class="btn" data-close>Resume</button>
          </div>
        </div>
      </div>`);
    const sync = () => {
      const vals = { mode: st().mode, steering: settings.steering, lang: settings.lang, weather: st().weather, hints: settings.hints ? '1' : '0', rotate: settings.rotate ? '1' : '0', sound: settings.sound ? '1' : '0' };
      for (const g of m.el.querySelectorAll('[data-set]')) for (const b of g.querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === vals[g.dataset.set]);
    };
    sync();
    m.el.addEventListener('click', (e) => {
      const b = e.target.closest('.seg2 button');
      if (!b) return;
      const key = b.parentElement.dataset.set;
      if (key === 'mode') {
        if (b.dataset.v !== st().mode) {
          m.close();
          switchMode(b.dataset.v);
        }
        return;
      }
      if (key === 'lang') setLang(b.dataset.v);
      if (key === 'weather') G.game.setWeather(b.dataset.v);
      if (key === 'steering') {
        settings.steering = b.dataset.v;
        applySteering();
      }
      if (key === 'hints') settings.hints = b.dataset.v === '1';
      if (key === 'rotate') settings.rotate = b.dataset.v === '1';
      if (key === 'sound') {
        settings.sound = b.dataset.v === '1';
        setSoundEnabled(settings.sound);
      }
      saveSettings();
      sync();
      sfx.tap();
    });
    const go = (id, fn) => $(id, m.el).addEventListener('click', () => (m.close(), fn()));
    go('#mCar', openCars);
    go('#mLevel', openLevels);
    go('#mSigns', () => openLibrary());
    go('#mTheory', theory.open);
    go('#mBook', () => theory.openBook());
    go('#mDrill', openDrill);
    go('#mHelp', openHelp);
    go('#mRestart', () => restartLevel());
    go('#mFinish', () => G.game.endTest());
  }

  function openHelp() {
    openModal(`
      <div class="sheet" role="dialog" aria-label="How to play">
        ${head('How to play')}
        <div class="sheet-body">${lang() === 'ro' ? HELP_RO : `
          <ol class="howto">
            <li><b>Wheel</b> (bottom left): drag it round with a finger. It springs back to centre when you let go.</li>
            <li><b>Gas</b> and <b>Brake / Reverse</b> are the pedals (bottom right). <b>Reset</b> puts the car back on the road.</li>
            <li><b>Blinkers</b> and <b>hazards</b> are the top buttons. Signal before every turn. They switch off by themselves after the turn.</li>
            <li>The <b>purple line</b> and the <b>round map</b> show your route. The banner tells you the next turn.</li>
            <li><b>Learn</b>: drive anywhere, signs explain themselves. <b>Test</b>: exam rules with penalty points, 21 = failed.</li>
            <li>At night or in fog use <b>low beams</b>. Gas stations: stop in the bay, switch the engine off, refuel.</li>
          </ol>
          <p class="empty" style="text-align:left;padding-bottom:0">Keyboard: WASD or arrows, Space brake, Q / E blinkers, H hazards, L lights, I ignition, R reset.</p>`}
        </div>
      </div>`);
  }

  function restartLevel() {
    hideToast();
    hideCard();
    G.game.restart();
    if (st().mode === 'test') showInfo('Test restarted', 'Follow the purple route and obey every sign. 21 penalty points means failed.');
  }

  function applySteering() {
    const arrows = settings.steering !== 'wheel';
    document.body.classList.toggle('steer-arrows', arrows);
    controls.clear();
  }
  applySteering();

  // ---------------------------------------------------------------- welcome
  function openWelcome(onStart) {
    const keys = ['stop', 'giveWay', 'priorityRoad', 'speed50', 'roundabout'];
    const m = openModal(
      `<div class="sheet" role="dialog" aria-label="Welcome"><div class="welcome">
        <div class="signrow">${keys.map((k) => `<img src="${img(k, 128)}" alt="" />`).join('')}</div>
        <div class="logobox"><img class="logo" src="${logoURL()}" alt="Car.dat" /></div>
        <p>A driving school with 15 levels to learn the Romanian road signs.</p>
        <div class="credit">${pimg('naty', 'sm')}<span>Developed by Naty</span></div>
        <div class="stack three">
          <button type="button" class="btn big" data-go="learn">Learn mode<small>Signs explain themselves</small></button>
          <button type="button" class="btn big ghost" data-go="test">Test mode<small>Penalty points like the exam</small></button>
          <button type="button" class="btn big ghost" data-theory>Chestionare<small>Examenul teoretic DRPCIV</small></button>
        </div></div></div>`,
      { dismiss: false }
    );
    m.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-theory]')) {
        unlock();
        sfx.tap();
        theory.open();
        return;
      }
      const b = e.target.closest('[data-go]');
      if (!b) return;
      unlock();
      sfx.tap();
      try {
        sessionStorage.setItem('drpciv.started', '1');
      } catch (err) {
        /* ignore */
      }
      m.close();
      onStart(b.dataset.go);
    });
  }

  // ------------------------------------------------------------- mode switch
  function syncMode() {
    document.body.classList.toggle('mode-test', st().mode === 'test');
    updateScore();
  }
  function switchMode(mode) {
    hideToast();
    hideCard();
    G.game.setMode(mode);
    settings.mode = mode;
    saveSettings();
    syncMode();
    if (mode === 'test') showInfo('Test started', 'Follow the purple route and obey every sign. 21 penalty points means failed.');
  }

  // ---------------------------------------------------- top buttons + keys
  function act(name) {
    if (!G.game || modals.length) return;
    unlock();
    const g = G.game;
    if (name === 'signalLeft') g.toggleSignal('left');
    else if (name === 'signalRight') g.toggleSignal('right');
    else if (name === 'hazard') g.toggleHazard();
    else if (name === 'lights') g.cycleLights();
    else if (name === 'engine') g.toggleEngine();
  }
  E.sigL.addEventListener('click', () => act('signalLeft'));
  E.sigR.addEventListener('click', () => act('signalRight'));
  E.haz.addEventListener('click', () => act('hazard'));
  E.lights.addEventListener('click', () => act('lights'));
  E.eng.addEventListener('click', () => act('engine'));
  $('#bMenu').addEventListener('click', () => (unlock(), openMenu()));
  E.alert.addEventListener('click', () => {
    if (st().activeSign) openLibrary(st().activeSign.key);
  });

  // ------------------------------------------------------------ attach a game
  function attach(game, world, level) {
    G = { game, world, level };
    lastNav = '';
    lastStationKey = '';
    E.alert.dataset.k = '';
    hideCard();
    hideToast();
    const tag = level.id === 'free' ? 'FREE' : level.boss ? 'BOSS' : `L${level.n}`;
    E.lvName.textContent = `${tag} · ${level.district}`;
    game.on('quiz', onQuiz);
    game.on('finish', onFinish);
    game.on('feedback', showFeedback);
    game.on('mode', syncMode);
    game.on('bump', (vn) => {
      sfx.bump(vn);
      if (vn > 3) vibrate(18);
    });
    game.on('blink', (ph) => sfx.tick(ph));
    game.on('boarded', (e) => {
      sfx.ok();
      showPersonToast('alisia', 'Alisia', e && e.missed ? (lang() === 'en' ? 'You drove past me! I ran after you. Next time stop at the circle.' : 'Ai trecut de mine! Am fugit după mașină. Data viitoare oprește la cerc.') : lang() === 'en' ? 'Hi Naty! Take me home to Sânpetru, please.' : 'Bună, Naty! Du-mă acasă în Sânpetru, te rog.');
    });
    game.on('paxLeave', () => showPersonToast('alisia', 'Alisia', lang() === 'en' ? 'Thanks for the safe drive! See you soon.' : 'Mersi pentru drumul liniștit! Ne vedem curând.'));
    game.on('home', () => {
      if (st().mode !== 'test') showPersonToast('alisia', 'Alisia', lang() === 'en' ? 'I am home. Try it in Test mode for the licence ending!' : 'Am ajuns acasă. Încearcă și în modul Test pentru finalul cu permisul!');
    });
    game.on('camera', (c) => {
      const app = document.getElementById('app');
      app.classList.remove('camflash');
      void app.offsetWidth;
      app.classList.add('camflash');
      if (st().mode === 'test' && !c.ok) return; // the penalty toast explains it
      const en = lang() === 'en';
      if (c.ok) showInfo(en ? 'Speed camera: OK' : 'Radar: OK', en ? `You passed at ${c.kmh} km/h (limit ${c.lim}).` : `Ai trecut cu ${c.kmh} km/h (limita ${c.lim}).`);
      else showInfo(en ? 'Speed camera: too fast!' : 'Radar: prea repede!', en ? `${c.kmh} km/h in a ${c.lim} km/h zone. In Test mode this costs penalty points.` : `${c.kmh} km/h unde limita e ${c.lim}. În modul Test primești puncte de penalizare.`);
    });
    game.on('parked', (p) => {
      const en = lang() === 'en';
      sfx.ok();
      showInfo(`${en ? 'Parked!' : 'Parcat corect!'} ${'★'.repeat(p.stars)}${'☆'.repeat(3 - p.stars)}`, en ? `${p.reverse ? 'Reverse parking' : 'Nose-in parking'}. ${p.stars === 3 ? 'Perfectly straight in the bay.' : 'Try to sit straighter in the middle of the bay.'}` : `${p.reverse ? 'Parcare cu spatele' : 'Parcare cu fața'}. ${p.stars === 3 ? 'Perfect, drept în mijlocul locului.' : 'Încearcă să stai mai drept, în mijlocul locului.'}`);
    });
    game.on('levelDone', (e) => levelDoneScreen(e));
    game.on('gaveWay', () => {
      if (st().mode !== 'learn') return;
      const en = lang() === 'en';
      showInfo(en ? 'You have priority' : 'Ai prioritate', en ? 'The car in the side street waits for you: you are on the main road.' : 'Mașina de pe strada laterală te așteaptă: tu ești pe drumul principal.');
    });
    game.on('lowfuel', () => {
      sfx.lowfuel();
      showInfo('Low fuel', 'Head for the nearest fuel station (green pin on the map).');
    });
    game.on('stall', () => {
      sfx.stall();
      showInfo('Engine stopped', st().car.fuel <= 0 ? 'Out of fuel. Switch on the hazard lights.' : 'Engine is off.');
    });
    syncMode();
    checkOrientation();
  }

  checkOrientation();
  return {
    attach,
    update,
    act,
    showInfo,
    showDanTip,
    isBlocking: () => modals.length > 0 || !!(G.game && st().quiz) || !E.rotate.hidden,
    openWelcome,
    switchMode,
    closeAll,
  };
}
