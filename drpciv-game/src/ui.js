// ============================================================================
//  ui.js  —  everything that is NOT the road: speed read-out, sign card,
//  feedback messages, sign library, quiz pop-ups, results, menus.
//  All the words you see on screen are in this file (and in signs.js).
// ============================================================================

import { CONFIG as C } from './config.js';
import { CATEGORIES, SIGNS, tr } from './signs.js';
import { getSignDataURL } from './signart.js';
import { sfx, vibrate, unlock, setEnabled as setSoundEnabled } from './audio.js';

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CAT_ORDER = ['warning', 'priority', 'prohibition', 'mandatory', 'information'];
const ICON_OK = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_BAD = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>';

export function createUI({ game, world, settings, saveSettings, controls }) {
  const state = game.state;
  const overlays = $('#overlays');
  const modals = [];
  const lang = () => settings.lang;
  const img = (key, px = 192) => getSignDataURL(key, SIGNS[key].art, px);

  const catPill = (key) => {
    const c = CATEGORIES[key];
    const ink = key === 'priority' ? '#2a1d00' : '#ffffff';
    return `<span class="catpill" style="background:${c.color};color:${ink}">${esc(tr(c, lang()))}</span>`;
  };

  // ---------------------------------------------------------------- modals
  function openModal(html, { center = false, dismiss = true, onClose } = {}) {
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
    return api;
  }
  const closeAll = () => [...modals].forEach((m) => m.close());
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && modals.length) modals[modals.length - 1].close();
  });

  // ------------------------------------------------------------ sign card
  const card = $('#card');
  const toast = $('#toast');
  let cardSign = null;
  let cardLastSeen = 0;
  let pinned = false;

  function renderCard(sg) {
    const d = sg.def;
    card.innerHTML = `
      <div class="cardrow">
        <img src="${img(sg.key, 192)}" alt="" />
        <div>
          <div class="pillrow">${catPill(d.category)}<span class="pin">${pinned ? 'Pinned. Tap to close' : 'Tap to keep open'}</span></div>
          <div class="nameRo">${esc(d.name.ro)}</div>
          <div class="nameEn">${esc(d.name.en)}</div>
          <p class="rule">${esc(tr(d.rule, lang()))}</p>
        </div>
      </div>`;
    card.classList.toggle('pinned', pinned);
  }
  function showCard(sg) {
    cardSign = sg;
    renderCard(sg);
    card.hidden = false;
    hideToast();
  }
  function hideCard() {
    card.hidden = true;
    cardSign = null;
    pinned = false;
    card.classList.remove('pinned');
  }
  card.addEventListener('click', () => {
    pinned = !pinned;
    if (!pinned && state.activeSign !== cardSign) hideCard();
    else if (cardSign) renderCard(cardSign);
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
    }
    if (fb.quiz) return; // the quiz window shows its own answer
    hideCard();
    toast.className = fb.ok ? 'ok' : 'bad';
    toast.innerHTML = `
      <div class="toastrow">
        <img src="${img(fb.signKey, 128)}" alt="" />
        <div>
          <div class="verdict ${fb.ok ? 'ok' : 'bad'}">${fb.ok ? ICON_OK : ICON_BAD}<span>${esc(fb.def.name.ro)}</span><span class="pts">${fb.ok ? '+' + fb.points : '0'}</span></div>
          <div class="msg">${esc(tr(fb.message, lang()))}</div>
          ${fb.ok ? '' : `<p class="rule">${esc(tr(fb.def.rule, lang()))}</p>`}
        </div>
      </div>`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, fb.ok ? 3400 : 7500);
  }

  function showInfo(title, text) {
    hideCard();
    toast.className = 'info';
    toast.innerHTML = `<div class="toastrow" style="grid-template-columns:1fr"><div><div class="verdict" style="color:var(--accent)">${esc(title)}</div><div class="msg" style="font-weight:500">${esc(text)}</div></div></div>`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 6000);
  }

  // -------------------------------------------------------------- read-outs
  const spdNum = $('#spdNum');
  const speedo = $('#speedo');
  const limit = $('#limit');
  const limNum = $('#limNum');
  const scoreBox = $('#scoreBox');
  const scoreNum = $('#scoreNum');
  const scoreOf = $('#scoreOf');
  const wrongWay = $('#wrongWay');
  let lastKmh = -1;
  let lastLimit = null;

  function updateScore() {
    const t = state.test;
    scoreBox.hidden = state.mode !== 'test';
    if (t) {
      scoreNum.textContent = t.score;
      scoreOf.textContent = `/ ${t.max}`;
    }
  }

  function update() {
    const kmh = Math.round(Math.abs(state.car.v) * 3.6);
    if (kmh !== lastKmh) {
      spdNum.textContent = kmh;
      lastKmh = kmh;
    }
    const lim = state.mode === 'test' ? state.speedLimit : null;
    if (lim !== lastLimit) {
      limit.hidden = lim == null;
      if (lim != null) limNum.textContent = lim;
      lastLimit = lim;
    }
    speedo.classList.toggle('over', lim != null && kmh > lim + C.test.speedTolerance);
    wrongWay.hidden = !(state.mode === 'test' && state.wrongWay);

    // the Learn-mode card follows the sign you are approaching
    if (state.mode === 'learn' && !modals.length) {
      const now = performance.now();
      const a = state.activeSign;
      if (a) {
        cardLastSeen = now;
        if (cardSign !== a) showCard(a);
      } else if (cardSign && !pinned && now - cardLastSeen > 4500) hideCard();
    } else if (state.mode !== 'learn' && !card.hidden) hideCard();
  }

  // ------------------------------------------------------------ sign library
  function openLibrary() {
    let filter = 'all';
    let openKey = null;
    const m = openModal(`
      <div class="sheet" role="dialog" aria-label="Road sign library">
        <div class="sheet-head"><h2 id="libTitle">Road Sign Library</h2>
          <button type="button" class="x" id="libLang" style="font-size:14px;font-weight:800"></button>
          <button type="button" class="x" data-close aria-label="Close">&times;</button></div>
        <div class="chips" id="libChips"></div>
        <div class="sheet-body" id="libBody"></div>
      </div>`);
    const chips = $('#libChips', m.el);
    const body = $('#libBody', m.el);
    const langBtn = $('#libLang', m.el);

    function render() {
      langBtn.textContent = lang().toUpperCase();
      $('#libTitle', m.el).textContent = openKey ? tr(SIGNS[openKey].name, lang()) : 'Road Sign Library';
      chips.hidden = !!openKey;
      if (openKey) return renderDetail();
      const cats = ['all', ...CAT_ORDER];
      chips.innerHTML = cats
        .map((k) => `<button type="button" class="fchip ${k === filter ? 'on' : ''}" data-f="${k}">${k === 'all' ? 'All' : esc(tr(CATEGORIES[k], lang()))}</button>`)
        .join('');
      const keys = Object.keys(SIGNS)
        .filter((k) => filter === 'all' || SIGNS[k].category === filter)
        .sort((a, b) => CAT_ORDER.indexOf(SIGNS[a].category) - CAT_ORDER.indexOf(SIGNS[b].category));
      body.innerHTML = keys.length
        ? `<div class="grid">${keys
            .map((k) => {
              const s = SIGNS[k];
              return `<button type="button" class="tile" data-k="${k}" style="--cat:${CATEGORIES[s.category].color}">
                <img src="${img(k, 192)}" alt="" /><b>${esc(s.name.ro)}</b><small>${esc(s.name.en)}</small></button>`;
            })
            .join('')}</div>`
        : '<p class="empty">No signs in this category yet.</p>';
      body.scrollTop = 0;
    }
    function renderDetail() {
      const s = SIGNS[openKey];
      const other = lang() === 'en' ? 'ro' : 'en';
      body.innerHTML = `
        <button type="button" class="btn ghost" data-back style="min-height:44px;margin-bottom:6px">&larr; All signs</button>
        <div class="detail">
          <img src="${img(openKey, 320)}" alt="${esc(s.name.en)}" />
          <div>${catPill(s.category)}</div>
          <div class="nameRo">${esc(s.name.ro)}</div>
          <div class="nameEn">${esc(s.name.en)}</div>
          <p class="rule">${esc(tr(s.rule, lang()))}</p>
          <p class="rule">${esc(tr(s.rule, other))}</p>
        </div>`;
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
      } else if (e.target.closest('#libLang')) {
        setLang(lang() === 'en' ? 'ro' : 'en');
      }
    });
    m.rerender = render;
    render();
    return m;
  }

  function setLang(l) {
    settings.lang = l;
    saveSettings();
    modals.forEach((mm) => mm.rerender && mm.rerender());
    if (cardSign && !card.hidden) renderCard(cardSign);
  }

  // -------------------------------------------------------------------- quiz
  game.on('quiz', (q) => {
    const m = openModal(
      `<div class="sheet" role="dialog" aria-label="Quiz question">
        <div class="quiz">
          <img src="${img(q.signKey, 300)}" alt="Road sign" />
          <h2>What does this sign mean?</h2>
          ${q.options
            .map((k) => `<button type="button" class="opt" data-key="${k}"><b>${esc(SIGNS[k].name.ro)}</b><small>${esc(SIGNS[k].name.en)}</small></button>`)
            .join('')}
          <div id="qres" style="width:100%"></div>
        </div>
      </div>`,
      { center: true, dismiss: false }
    );
    m.el.addEventListener('click', (e) => {
      const b = e.target.closest('.opt');
      if (b && !q.answered) {
        const res = game.answerQuiz(b.dataset.key);
        if (!res) return;
        for (const o of m.el.querySelectorAll('.opt')) {
          if (o.dataset.key === res.right) o.classList.add('right');
          else if (o === b) o.classList.add('wrong');
        }
        const right = SIGNS[res.right];
        $('#qres', m.el).innerHTML = `
          <div class="explain">
            <div class="verdict ${res.ok ? 'ok' : 'bad'}">${res.ok ? ICON_OK : ICON_BAD}<span>${res.ok ? 'Correct!' : 'Not quite'}</span><span class="pts">${res.ok ? '+' + C.test.pointsPerSign : '0'}</span></div>
            <div><b>${esc(right.name.ro)}</b>. ${esc(tr(right.rule, lang()))}</div>
          </div>
          <button type="button" class="btn block" id="qnext" style="margin-top:10px">Continue driving</button>`;
        $('#qnext', m.el).addEventListener('click', () => {
          game.closeQuiz();
          m.close();
        });
      }
    });
  });

  // ----------------------------------------------------------------- results
  game.on('finish', (sum) => openResults(sum));

  function openResults(sum) {
    const pct = sum.max ? Math.round((sum.score / sum.max) * 100) : 0;
    const verdict = pct >= 90 ? 'Excellent driving!' : pct >= 75 ? 'Good, a few signs to review' : 'Keep practising, you will get there';
    const mins = Math.floor(sum.seconds / 60);
    const secs = String(Math.round(sum.seconds % 60)).padStart(2, '0');
    const catRows = CAT_ORDER.filter((k) => sum.cats[k].total)
      .map((k) => {
        const c = sum.cats[k];
        const w = Math.round((c.correct / c.total) * 100);
        return `<div class="catrow" style="--cat:${CATEGORIES[k].color}"><span class="label">${esc(tr(CATEGORIES[k], lang()))}</span><span class="val">${c.correct}/${c.total}</span><div class="bar"><i style="width:${w}%"></i></div></div>`;
      })
      .join('');
    const wrong = sum.tasks.filter((t) => !t.ok);
    const mistakes = wrong.length
      ? wrong
          .map(
            (t) => `<div class="miss"><img src="${img(t.key, 128)}" alt="" /><div><b>${esc(t.def.name.ro)}</b><p>${t.missed ? 'Not reached. ' : ''}${esc(tr(t.def.rule, lang()))}</p></div></div>`
          )
          .join('')
      : '<p class="empty">No mistakes. Perfect lap!</p>';
    const m = openModal(
      `<div class="sheet" role="dialog" aria-label="Test results">
        <div class="sheet-head"><h2>Test finished</h2></div>
        <div class="sheet-body">
          <div class="score"><div class="big">${sum.score}<span> / ${sum.max}</span></div><div class="pct">${pct}% &middot; ${mins}:${secs} &middot; ${esc(verdict)}</div></div>
          <div class="sectionTitle">Score by category</div>
          ${catRows}
          <div class="sectionTitle">Signs to review</div>
          ${mistakes}
          <div class="stack" style="margin-top:16px">
            <button type="button" class="btn" id="again">Try again</button>
            <button type="button" class="btn ghost" id="toLearn">Back to Learn mode</button>
          </div>
        </div>
      </div>`,
      { dismiss: false }
    );
    $('#again', m.el).addEventListener('click', () => {
      m.close();
      game.restart();
    });
    $('#toLearn', m.el).addEventListener('click', () => {
      m.close();
      switchMode('learn');
    });
  }

  // ------------------------------------------------------------- menu & help
  function openMenu() {
    const m = openModal(`
      <div class="sheet" role="dialog" aria-label="Menu">
        <div class="sheet-head"><h2>Menu</h2><button type="button" class="x" data-close aria-label="Close">&times;</button></div>
        <div class="sheet-body">
          <div class="row"><span>Rule language<small>Sign names are always shown in Romanian and English</small></span>
            <div class="seg2" data-set="lang"><button type="button" data-v="en">EN</button><button type="button" data-v="ro">RO</button></div></div>
          <div class="row"><span>Camera<small>Turn with the car, or keep north at the top</small></span>
            <div class="seg2" data-set="rotate"><button type="button" data-v="1">Turning</button><button type="button" data-v="0">Fixed</button></div></div>
          <div class="row"><span>Sound &amp; vibration</span>
            <div class="seg2" data-set="sound"><button type="button" data-v="1">On</button><button type="button" data-v="0">Off</button></div></div>
          <div class="stack" style="margin-top:16px">
            <button type="button" class="btn ghost" id="mRestart">Restart from the start line</button>
            <button type="button" class="btn warn" id="mFinish" ${state.mode === 'test' ? '' : 'hidden'}>Finish the test now</button>
            <button type="button" class="btn ghost" id="mHelp">How to play</button>
          </div>
        </div>
      </div>`);
    const sync = () => {
      const vals = { lang: settings.lang, rotate: settings.rotate ? '1' : '0', sound: settings.sound ? '1' : '0' };
      for (const g of m.el.querySelectorAll('[data-set]'))
        for (const b of g.querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === vals[g.dataset.set]);
    };
    sync();
    m.el.addEventListener('click', (e) => {
      const b = e.target.closest('.seg2 button');
      if (b) {
        const key = b.parentElement.dataset.set;
        if (key === 'lang') setLang(b.dataset.v);
        if (key === 'rotate') settings.rotate = b.dataset.v === '1';
        if (key === 'sound') {
          settings.sound = b.dataset.v === '1';
          setSoundEnabled(settings.sound);
        }
        saveSettings();
        sync();
        sfx.tap();
      }
    });
    $('#mRestart', m.el).addEventListener('click', () => {
      m.close();
      game.restart();
      if (state.mode === 'test') showInfo('Test restarted', 'Drive one lap and follow every sign.');
    });
    $('#mFinish', m.el).addEventListener('click', () => {
      m.close();
      game.endTest();
    });
    $('#mHelp', m.el).addEventListener('click', () => {
      m.close();
      openHelp();
    });
  }

  function openHelp() {
    openModal(`
      <div class="sheet" role="dialog" aria-label="How to play">
        <div class="sheet-head"><h2>How to play</h2><button type="button" class="x" data-close aria-label="Close">&times;</button></div>
        <div class="sheet-body">
          <ol class="howto">
            <li><b>Steer</b> with the two arrow buttons on the left.</li>
            <li><b>Gas</b> and <b>Brake</b> are the pedals on the right. Hold Brake when stopped to reverse.</li>
            <li><b>Reset</b> puts the car back on the road if you get stuck.</li>
            <li><b>Learn mode:</b> drive anywhere. A card appears when you get close to a sign. Tap it to keep it open.</li>
            <li><b>Test mode:</b> drive one lap and obey every sign. You get a green or red message and a score by category.</li>
            <li>The <b>Signs</b> button opens the full library with filters.</li>
          </ol>
          <p class="empty" style="text-align:left;padding-bottom:0">Keyboard: arrows or WASD to drive, Space to brake, R to reset.</p>
        </div>
      </div>`);
  }

  // ---------------------------------------------------------------- welcome
  function openWelcome() {
    const keys = ['stop', 'giveWay', 'priorityRoad', 'speed50', 'roundabout'];
    const m = openModal(
      `<div class="sheet" role="dialog" aria-label="Welcome">
        <div class="welcome">
          <div class="signrow">${keys.map((k) => `<img src="${img(k, 128)}" alt="" />`).join('')}</div>
          <h1>DRPCIV Road Signs</h1>
          <p>Drive a training track and learn the Romanian road signs.</p>
          <div class="stack">
            <button type="button" class="btn big" data-go="learn">Learn mode<small>Drive freely. Signs explain themselves.</small></button>
            <button type="button" class="btn big ghost" data-go="test">Test mode<small>Follow the signs and get a score.</small></button>
          </div>
        </div>
      </div>`,
      { center: true, dismiss: false }
    );
    m.el.addEventListener('click', (e) => {
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
      switchMode(b.dataset.go);
    });
  }

  // ------------------------------------------------------------- mode switch
  const modeButtons = [...document.querySelectorAll('#modeSeg [data-mode]')];
  function syncMode() {
    for (const b of modeButtons) b.classList.toggle('on', b.dataset.mode === state.mode);
    updateScore();
  }
  function switchMode(mode) {
    hideToast();
    hideCard();
    game.setMode(mode);
    settings.mode = mode;
    saveSettings();
    syncMode();
    if (mode === 'test') showInfo('Test started', 'Drive one lap. Obey every sign and watch your speed.');
  }
  for (const b of modeButtons) {
    b.addEventListener('click', () => {
      unlock();
      if (b.dataset.mode !== state.mode) switchMode(b.dataset.mode);
    });
  }
  game.on('mode', syncMode);
  game.on('feedback', showFeedback);
  game.on('bump', (vn) => {
    sfx.bump(vn);
    if (vn > 3) vibrate(18);
  });

  $('#btnSigns').addEventListener('click', () => {
    unlock();
    openLibrary();
  });
  $('#btnMenu').addEventListener('click', () => {
    unlock();
    openMenu();
  });

  syncMode();
  return {
    update,
    isBlocking: () => modals.length > 0 || !!state.quiz,
    openWelcome,
    switchMode,
    closeAll,
  };
}
