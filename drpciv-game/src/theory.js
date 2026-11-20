// ============================================================================
//  theory.js  —  the theory exam screen ("Chestionare"), DRPCIV style
//
//  26 random questions, 30 minutes. 22 correct = passed; the 5th wrong answer
//  ends the exam (failed). "Răspunde mai târziu" sends the question to the end.
//  Practice mode shows the right answer and an explanation after each one.
// ============================================================================

import { EXAM, QUESTIONS } from './questions.js';
import { CHAPTERS, questionsFor, blockHTML } from './book.js';

const KEY = 'drpciv.theory.v1';
const LETTERS = ['A', 'B', 'C'];

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { best: null, passed: 0, runs: 0 };
  } catch {
    return { best: null, passed: 0, runs: 0 };
  }
}
function saveStats(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode: nothing saved */
  }
}

const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * deps: { openModal, head, signImg(key, px), sfx, esc }
 */
export function createTheory({ openModal, head, signImg, sfx, esc }) {
  function open() {
    const stats = loadStats();
    const m = openModal(`
      <div class="sheet theory" role="dialog" aria-label="Chestionare">
        ${head('Chestionare auto · categoria B')}
        <div class="sheet-body">
          <p class="thintro">Ca la examenul teoretic DRPCIV: <b>${EXAM.count} de întrebări</b>, <b>${EXAM.minutes} de minute</b>. Fiecare întrebare are 3 variante și <b>unul sau mai multe</b> răspunsuri corecte. Ești admis cu <b>${EXAM.passAt}</b> răspunsuri corecte; la al ${EXAM.maxWrong + 1}-lea răspuns greșit ești respins.</p>
          ${stats.runs ? `<p class="thstats">Cel mai bun rezultat: <b>${stats.best}/${EXAM.count}</b> · admis de ${stats.passed} ${stats.passed === 1 ? 'dată' : 'ori'} din ${stats.runs}</p>` : ''}
          <div class="stack three">
            <button type="button" class="btn big ghost bk-open" data-th="book">📖 Cartea<small>Citește teoria pe capitole</small></button>
            <button type="button" class="btn big" data-th="exam">Examen<small>Afli rezultatul la final</small></button>
            <button type="button" class="btn big ghost" data-th="practice">Antrenament<small>Vezi răspunsul corect după fiecare întrebare</small></button>
          </div>
          <p class="thnote">Întrebările sunt scrise pentru joc după Codul rutier (OUG 195/2002) și nu sunt cele din baza oficială. Pentru examen exersează și pe drpciv.ro.</p>
        </div>
      </div>`);
    m.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-th]');
      if (!b) return;
      sfx.tap();
      m.close();
      if (b.dataset.th === 'book') openBook();
      else run(b.dataset.th === 'practice');
    });
  }

  // ------------------------------------------------------------- the book
  function readState() {
    const st = loadStats();
    return { read: st.read || {}, ch: st.ch || {} };
  }
  function markRead(id) {
    const st = loadStats();
    st.read = st.read || {};
    st.read[id] = true;
    saveStats(st);
  }

  function openBook(startChapter = null) {
    const m = openModal(`<div class="book" role="dialog" aria-label="Cartea șoferului"><div class="bk-page" id="bkPage"></div></div>`, { dismiss: true });
    const page = m.el.querySelector('#bkPage');
    let chI = -1; // -1 = cover / contents
    let pI = 0;

    function cover() {
      const rs = readState();
      return `<div class="bk-cover">
          <div class="bk-title"><small>Car.dat</small><h2>Cartea șoferului</h2><p>Teoria pentru chestionarele auto, categoria B</p></div>
          <ol class="bk-toc">${CHAPTERS.map(
            (c, i) => `<li><button type="button" data-ch="${i}"><img src="${signImg(c.sign, 64)}" alt="" /><span><b>${i + 1}. ${esc(c.title)}</b><small>${c.pages.length} pagini · ${questionsFor(c.id).length} întrebări${rs.ch[c.id] != null ? ` · test ${rs.ch[c.id]}%` : ''}</small></span>${rs.read[c.id] ? '<i class="bk-done">✓</i>' : ''}</button></li>`
          ).join('')}</ol>
          <p class="bk-note">Scrisă pentru joc după Codul rutier. Verifică pe drpciv.ro informațiile importante.</p>
        </div>`;
    }

    function chapterPage() {
      const c = CHAPTERS[chI];
      const last = pI === c.pages.length - 1;
      return `<div class="bk-head"><button type="button" class="bk-x" data-nav="toc" aria-label="Cuprins">☰</button><span>${chI + 1}. ${esc(c.title)}</span><button type="button" class="bk-x" data-close aria-label="Închide">&times;</button></div>
        <div class="bk-body">${c.pages[pI].map((b) => blockHTML(b, { signImg, esc })).join('')}
          ${last ? `<div class="bk-end"><p>Ai terminat capitolul. Verifică ce ai reținut:</p><button type="button" class="btn" data-nav="test">Testează capitolul (${questionsFor(c.id).length} întrebări)</button></div>` : ''}
        </div>
        <div class="bk-foot"><button type="button" class="btn ghost" data-nav="prev">‹ Înapoi</button><span>pagina ${pI + 1} din ${c.pages.length}</span><button type="button" class="btn ghost" data-nav="next" ${last && chI === CHAPTERS.length - 1 ? 'disabled' : ''}>${last ? 'Capitolul următor ›' : 'Înainte ›'}</button></div>`;
    }

    function render(dir = 0) {
      page.innerHTML = chI < 0 ? `<div class="bk-head"><span></span><button type="button" class="bk-x" data-close aria-label="Închide">&times;</button></div>${cover()}` : chapterPage();
      page.classList.remove('flip-next', 'flip-prev');
      if (dir) {
        void page.offsetWidth;
        page.classList.add(dir > 0 ? 'flip-next' : 'flip-prev');
      }
      const body = page.querySelector('.bk-body');
      if (body) body.scrollTop = 0;
      if (chI >= 0 && pI === CHAPTERS[chI].pages.length - 1) markRead(CHAPTERS[chI].id);
    }

    function go(step) {
      if (chI < 0) return;
      const c = CHAPTERS[chI];
      if (step > 0) {
        if (pI < c.pages.length - 1) pI++;
        else if (chI < CHAPTERS.length - 1) (chI++, (pI = 0));
        else return;
      } else if (pI > 0) pI--;
      else if (chI > 0) (chI--, (pI = CHAPTERS[chI].pages.length - 1));
      else chI = -1;
      sfx.tap();
      render(step);
    }

    page.addEventListener('click', (e) => {
      const ch = e.target.closest('[data-ch]');
      if (ch) {
        chI = +ch.dataset.ch;
        pI = 0;
        sfx.tap();
        return render(1);
      }
      const nav = e.target.closest('[data-nav]')?.dataset.nav;
      if (nav === 'next') go(1);
      else if (nav === 'prev') go(-1);
      else if (nav === 'toc') {
        chI = -1;
        render(-1);
      } else if (nav === 'test') {
        const c = CHAPTERS[chI];
        sfx.tap();
        run(true, { list: questionsFor(c.id), chapter: c.id });
      }
    });
    // swipe to turn the page
    let sx = null;
    page.addEventListener('pointerdown', (e) => (sx = e.clientX));
    page.addEventListener('pointerup', (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 60 && !e.target.closest('button')) go(dx < 0 ? 1 : -1);
    });
    if (startChapter != null) {
      chI = CHAPTERS.findIndex((c) => c.id === startChapter);
      pI = 0;
    }
    render();
  }

  function run(practice, opts = {}) {
    const pool = opts.list || QUESTIONS;
    const total = opts.list ? pool.length : EXAM.count;
    const maxWrong = opts.list ? Infinity : EXAM.maxWrong;
    const passAt = opts.list ? Math.ceil(total * 0.8) : EXAM.passAt;
    const queue = shuffle(pool).slice(0, total).map((q) => {
      // shuffle the answers too, keeping track of which are correct
      const order = shuffle([0, 1, 2]);
      return { ...q, a: order.map((i) => q.a[i]), ok: order.map((i, k) => (q.ok.includes(i) ? k : -1)).filter((k) => k >= 0) };
    });
    const answered = [];
    let right = 0;
    let wrong = 0;
    let pick = [];
    let reviewing = false;
    const deadline = Date.now() + (opts.list ? Math.max(5, Math.ceil(total * 1.2)) : EXAM.minutes) * 60 * 1000;
    let timer = 0;

    const m = openModal(`<div class="sheet theory exam" role="dialog" aria-label="Chestionar"><div id="thBody" class="thbody"></div></div>`, {
      dismiss: false,
      onClose: () => clearInterval(timer),
    });
    const body = m.el.querySelector('#thBody');

    function clock() {
      const left = Math.max(0, deadline - Date.now());
      const el = body.querySelector('#thClock');
      if (el) el.textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
      if (left <= 0) finish('time');
    }

    function counters() {
      return `<div class="thbar">
        <span><small>Inițiale</small><b>${total}</b></span>
        <span><small>Rămase</small><b>${queue.length}</b></span>
        <span class="okc"><small>Corecte</small><b>${right}</b></span>
        <span class="badc"><small>Greșite</small><b>${wrong}</b></span>
        <span><small>Timp</small><b id="thClock"></b></span>
        <button type="button" class="x" id="thQuit" aria-label="Închide">&times;</button>
      </div>`;
    }

    function show() {
      if (!queue.length) return finish('done');
      const q = queue[0];
      pick = [];
      reviewing = false;
      body.innerHTML = `${counters()}
        <div class="thq">
          ${q.sign ? `<img class="thimg" src="${signImg(q.sign, 240)}" alt="Indicator" />` : ''}
          <div class="thmain">
            <h3>${esc(q.q)}</h3>
            <div class="thopts">${q.a.map((t, i) => `<button type="button" class="thopt" data-i="${i}"><i>${LETTERS[i]}</i><span>${esc(t)}</span></button>`).join('')}</div>
            <div class="thwhy" hidden></div>
          </div>
        </div>
        <div class="thactions">
          <button type="button" class="btn ghost" id="thLater">Răspunde mai târziu</button>
          <button type="button" class="btn ghost" id="thClear">Șterge răspunsul</button>
          <button type="button" class="btn" id="thSend" disabled>Trimite răspunsul</button>
        </div>`;
      clock();
    }

    function submit() {
      const q = queue[0];
      const ok = sameSet(pick, q.ok);
      if (ok) right++;
      else wrong++;
      answered.push({ q, pick: [...pick], ok });
      ok ? sfx.ok() : sfx.bad();
      if (!practice) {
        queue.shift();
        if (wrong > maxWrong) return finish('wrong');
        return show();
      }
      // practice: colour the answers and explain, then "Next"
      reviewing = true;
      for (const b of body.querySelectorAll('.thopt')) {
        const i = +b.dataset.i;
        b.classList.toggle('right', q.ok.includes(i));
        b.classList.toggle('wrong', pick.includes(i) && !q.ok.includes(i));
      }
      const why = body.querySelector('.thwhy');
      why.hidden = false;
      why.innerHTML = `<b class="${ok ? 'g' : 'r'}">${ok ? 'Corect!' : `Greșit. Corect: ${q.ok.map((i) => LETTERS[i]).join(', ')}`}</b> ${esc(q.why)}`;
      body.querySelector('.thbar').outerHTML = counters();
      clock();
      body.querySelector('#thLater').hidden = true;
      body.querySelector('#thClear').hidden = true;
      const send = body.querySelector('#thSend');
      send.textContent = queue.length > 1 && wrong <= maxWrong ? 'Următoarea' : 'Vezi rezultatul';
      send.disabled = false;
    }

    function finish(reason) {
      clearInterval(timer);
      const passed = reason !== 'wrong' && reason !== 'time' && right >= passAt;
      const stats = loadStats();
      if (opts.chapter) {
        stats.ch = stats.ch || {};
        stats.ch[opts.chapter] = Math.max(stats.ch[opts.chapter] || 0, Math.round((right / total) * 100));
      } else {
        stats.runs++;
        if (passed) stats.passed++;
        stats.best = Math.max(stats.best || 0, right);
      }
      saveStats(stats);
      passed ? sfx.ok() : sfx.bad();
      const msg = { wrong: `Ai greșit ${wrong} întrebări.`, time: 'Timpul a expirat.', done: '' }[reason];
      const mistakes = answered.filter((x) => !x.ok);
      body.innerHTML = `
        <div class="thres ${passed ? 'pass' : 'fail'}">
          <h2>${opts.chapter ? (passed ? 'BRAVO!' : 'MAI CITEȘTE') : passed ? 'ADMIS' : 'RESPINS'}</h2>
          <p><b>${right}</b> corecte · <b>${wrong}</b> greșite${msg ? ` · ${msg}` : ''}</p>
        </div>
        ${mistakes.length ? `<h4 class="thmh">Greșelile tale</h4><div class="thmist">${mistakes
          .map(
            (x) => `<div class="thmi">${x.q.sign ? `<img src="${signImg(x.q.sign, 96)}" alt="" />` : ''}<div><b>${esc(x.q.q)}</b>
              <ul>${x.q.a.map((t, i) => `<li class="${x.q.ok.includes(i) ? 'g' : x.pick.includes(i) ? 'r' : ''}">${LETTERS[i]}. ${esc(t)}</li>`).join('')}</ul>
              <small>${esc(x.q.why)}</small></div></div>`
          )
          .join('')}</div>` : ''}
        <div class="thactions">
          <button type="button" class="btn ghost" data-close>Înapoi la joc</button>
          <button type="button" class="btn" id="thAgain">Alt chestionar</button>
        </div>`;
      body.querySelector('#thAgain').onclick = () => {
        m.close();
        run(practice, opts);
      };
    }

    body.addEventListener('click', (e) => {
      const opt = e.target.closest('.thopt');
      if (opt && !reviewing) {
        const i = +opt.dataset.i;
        pick = pick.includes(i) ? pick.filter((x) => x !== i) : [...pick, i];
        opt.classList.toggle('on', pick.includes(i));
        body.querySelector('#thSend').disabled = !pick.length;
        sfx.tap();
        return;
      }
      const id = e.target.closest('button')?.id;
      if (id === 'thQuit') {
        if (answered.length && !body.querySelector('.thres') && !confirm('Ieși din chestionar? Progresul se pierde.')) return;
        m.close();
      } else if (id === 'thLater' && queue.length > 1) {
        queue.push(queue.shift());
        show();
      } else if (id === 'thClear') {
        pick = [];
        for (const b of body.querySelectorAll('.thopt')) b.classList.remove('on');
        body.querySelector('#thSend').disabled = true;
      } else if (id === 'thSend') {
        if (reviewing) {
          queue.shift();
          if (wrong > maxWrong) return finish('wrong');
          return show();
        }
        if (pick.length) submit();
      }
    });

    show();
    timer = setInterval(clock, 1000);
  }

  return { open, openBook };
}
