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
const RUNKEY = 'drpciv.theory.run.v1'; // an exam in progress, so it survives a reload or a phone call
const loadRun = () => {
  try {
    return JSON.parse(localStorage.getItem(RUNKEY)) || null;
  } catch {
    return null;
  }
};
const saveRun = (r) => {
  try {
    if (r) localStorage.setItem(RUNKEY, JSON.stringify(r));
    else localStorage.removeItem(RUNKEY);
  } catch {
    /* private mode */
  }
};
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
export function createTheory({ openModal, head, signImg, sfx, esc, celebrate = null }) {
  function open() {
    const stats = loadStats();
    const m = openModal(`
      <div class="sheet theory" role="dialog" aria-label="Chestionare">
        ${head('Chestionare auto · categoria B')}
        <div class="sheet-body">
          <p class="thintro">Ca la examenul teoretic DRPCIV: <b>${EXAM.count} de întrebări</b>, <b>${EXAM.minutes} de minute</b>. Fiecare întrebare are 3 variante și <b>unul sau mai multe</b> răspunsuri corecte. Ești admis cu <b>${EXAM.passAt}</b> răspunsuri corecte; la al ${EXAM.maxWrong + 1}-lea răspuns greșit ești respins.</p>
          ${(() => {
            const r = loadRun();
            if (!r) return '';
            const what = r.chapter ? `Testul capitolului „${(CHAPTERS.find((c) => c.id === r.chapter) || {}).title || ''}”` : r.practice ? 'Antrenamentul' : 'Examenul';
            return `<div class="thresume"><div><b>${what} început</b><small>${r.answered.length} din ${r.total} răspunse · ${Math.ceil(r.left / 60000)} min rămase</small></div><button type="button" class="btn" data-th="resume">Continuă</button><button type="button" class="btn ghost" data-th="drop">Renunță</button></div>`;
          })()}
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
      if (b.dataset.th === 'drop') {
        saveRun(null);
        b.closest('.thresume').remove();
        return;
      }
      m.close();
      if (b.dataset.th === 'book') openBook();
      else if (b.dataset.th === 'resume') run(false, { resume: loadRun() });
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
    const m = openModal(`<div class="book" role="dialog" aria-label="Cartea șoferului"><div class="bk-page" id="bkPage"></div></div>`, { dismiss: false });
    const page = m.el.querySelector('#bkPage');
    let chI = -1; // -1 = cover / contents
    let pI = 0;

    function cover() {
      const rs = readState();
      return `<div class="bk-cover">
          <div class="bk-title"><small>Car.dat</small><h2>Cartea șoferului</h2><p>Teoria pentru sala de examen, categoria B, explicată pe înțeles</p></div>
          ${(() => {
            const pos = loadStats().pos;
            if (!pos || !CHAPTERS[pos.ch]) return '';
            return `<button type="button" class="btn bk-cont" data-cont>Continuă cu „${esc(CHAPTERS[pos.ch].title)}”, pagina ${pos.p + 1}</button>`;
          })()}
          <ol class="bk-toc">${CHAPTERS.map(
            (c, i) => `<li><button type="button" data-ch="${i}"><img src="${signImg(c.sign, 64)}" alt="" /><span><b>${i + 1}. ${esc(c.title)}</b><small>${c.pages.length} pagini · ${questionsFor(c.id).length} întrebări${rs.ch[c.id] != null ? ` · test ${rs.ch[c.id]}%` : ''}</small></span>${rs.ch[c.id] >= 80 ? '<i class="bk-done" title="Lecție rezolvată">✓</i>' : rs.read[c.id] ? '<i class="bk-read" title="Citit">📖</i>' : ''}</button></li>`
          ).join('')}</ol>
          <p class="bk-progress">Lecții rezolvate: <b>${CHAPTERS.filter((c) => rs.ch[c.id] >= 80).length} din ${CHAPTERS.length}</b> · o lecție e rezolvată când treci testul ei cu cel puțin 80%.</p>
          <p class="bk-note">Am scris-o pentru joc, după Codul rutier. Înainte de examen, mai verifică o dată pe drpciv.ro.</p>
        </div>`;
    }

    function chapterPage() {
      const c = CHAPTERS[chI];
      const last = pI === c.pages.length - 1;
      return `<div class="bk-head"><button type="button" class="bk-x" data-nav="toc" aria-label="Cuprins">☰</button><span>${chI + 1}. ${esc(c.title)}</span><button type="button" class="bk-x" data-close aria-label="Închide">&times;</button></div>
        <div class="bk-body">${c.pages[pI].map((b) => blockHTML(b, { signImg, esc })).join('')}
          ${last ? `<div class="bk-end"><p>Gata capitolul. Hai să vedem ce a rămas:</p><button type="button" class="btn" data-nav="test">Testează capitolul (${questionsFor(c.id).length} întrebări)</button></div>` : ''}
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
      if (chI >= 0) {
        const st = loadStats();
        st.pos = { ch: chI, p: pI };
        saveStats(st);
      }
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
      sfx.page ? sfx.page() : sfx.tap();
      render(step);
    }

    page.addEventListener('click', (e) => {
      if (e.target.closest('[data-cont]')) {
        const pos = loadStats().pos;
        chI = pos.ch;
        pI = Math.min(pos.p, CHAPTERS[chI].pages.length - 1);
        sfx.tap();
        return render(1);
      }
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

  // one question with its answers in a shuffled order (qi = index in QUESTIONS)
  const makeItem = (qi, order) => {
    const q = QUESTIONS[qi];
    return { ...q, qi, order, a: order.map((i) => q.a[i]), ok: order.map((i, k) => (q.ok.includes(i) ? k : -1)).filter((k) => k >= 0) };
  };

  function run(practice, opts = {}) {
    const R = opts.resume || null;
    if (R) {
      practice = R.practice;
      if (R.chapter) opts = { list: questionsFor(R.chapter), chapter: R.chapter, resume: R };
    }
    const pool = opts.list || QUESTIONS;
    const total = R ? R.total : opts.list ? pool.length : EXAM.count;
    const maxWrong = opts.list ? Infinity : EXAM.maxWrong;
    const passAt = opts.list ? Math.ceil(total * 0.8) : EXAM.passAt;
    const queue = R
      ? R.queue.map((x) => makeItem(x.qi, x.order))
      : shuffle(pool)
          .slice(0, total)
          .map((q) => makeItem(QUESTIONS.indexOf(q), shuffle([0, 1, 2])));
    const answered = R ? R.answered.map((x) => ({ q: makeItem(x.qi, x.order), pick: x.pick, ok: x.ok })) : [];
    let right = R ? R.right : 0;
    let wrong = R ? R.wrong : 0;
    let pick = [];
    let reviewing = false;
    // the clock only runs while the game is on screen: a call or another app does not eat your time
    let left = R ? R.left : (opts.list ? Math.max(5, Math.ceil(total * 1.2)) : EXAM.minutes) * 60 * 1000;
    let lastTick = Date.now();
    let timer = 0;
    let over = false;
    const persist = () => {
      if (over) return;
      saveRun({ practice, chapter: opts.chapter || null, total, left, right, wrong, queue: queue.map((x) => ({ qi: x.qi, order: x.order })), answered: answered.map((x) => ({ qi: x.q.qi, order: x.q.order, pick: x.pick, ok: x.ok })) });
    };
    const onVis = () => {
      lastTick = Date.now();
      persist();
    };
    document.addEventListener('visibilitychange', onVis);

    const m = openModal(`<div class="sheet theory exam" role="dialog" aria-label="Chestionar"><div id="thBody" class="thbody"></div></div>`, {
      dismiss: false,
      onClose: () => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVis);
      },
    });
    const body = m.el.querySelector('#thBody');

    let ticks = 0;
    function clock() {
      if (over) return;
      const now = Date.now();
      if (!document.hidden) left = Math.max(0, left - (now - lastTick));
      lastTick = now;
      if (++ticks % 5 === 0) persist();
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
      const q = queue.shift();
      const ok = sameSet(pick, q.ok);
      if (ok) right++;
      else wrong++;
      answered.push({ q, pick: [...pick], ok });
      ok ? sfx.ok() : sfx.bad();
      persist();
      if (!practice) {
        if (wrong > maxWrong) return finish('wrong');
        return show();
      }
      // practice: colour the answers and explain, then "Next"
      reviewing = true;
      for (const b of body.querySelectorAll('.thopt')) {
        const i = +b.dataset.i;
        b.classList.toggle('right', q.ok.includes(i));
        b.classList.toggle('wrong', pick.includes(i) && !q.ok.includes(i));
        b.classList.toggle('nudge', pick.includes(i) && !q.ok.includes(i));
        b.classList.toggle('pulse', q.ok.includes(i));
      }
      const why = body.querySelector('.thwhy');
      why.hidden = false;
      why.innerHTML = `<b class="${ok ? 'g' : 'r'}">${ok ? 'Corect!' : `Greșit. Corect: ${q.ok.map((i) => LETTERS[i]).join(', ')}`}</b> ${esc(q.why)}`;
      body.querySelector('.thbar').outerHTML = counters();
      clock();
      body.querySelector('#thLater').hidden = true;
      body.querySelector('#thClear').hidden = true;
      const send = body.querySelector('#thSend');
      send.textContent = queue.length > 0 && wrong <= maxWrong ? 'Următoarea' : 'Vezi rezultatul';
      send.disabled = false;
    }

    function finish(reason) {
      if (over) return;
      over = true;
      clearInterval(timer);
      saveRun(null);
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
      if (opts.chapter && passed && celebrate) {
        const c = CHAPTERS.find((x) => x.id === opts.chapter);
        celebrate(null, { title: 'Felicitări!', sub: `Ai rezolvat lecția „${c ? c.title : ''}” cu ${Math.round((right / total) * 100)}%.` });
      }
      body.querySelector('#thAgain').onclick = () => {
        m.close();
        run(practice, { list: opts.list, chapter: opts.chapter });
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
        if (over || !answered.length) {
          if (!over) saveRun(null);
          return m.close();
        }
        persist();
        if (body.querySelector('.thask')) return;
        body.insertAdjacentHTML('afterbegin', `<div class="thask"><span>Ieși acum? Răspunsurile rămân salvate și continui de unde ai rămas, din „Chestionare”.</span><button type="button" class="btn ghost" id="thStay">Rămân</button><button type="button" class="btn" id="thLeave">Ies</button></div>`);
      } else if (id === 'thStay') body.querySelector('.thask').remove();
      else if (id === 'thLeave') m.close();
      else if (id === 'thLater' && queue.length > 1) {
        queue.push(queue.shift());
        persist();
        show();
      } else if (id === 'thClear') {
        pick = [];
        for (const b of body.querySelectorAll('.thopt')) b.classList.remove('on');
        body.querySelector('#thSend').disabled = true;
      } else if (id === 'thSend') {
        if (reviewing) {
          if (wrong > maxWrong) return finish('wrong');
          return show();
        }
        if (pick.length) submit();
      }
    });

    persist();
    show();
    timer = setInterval(clock, 1000);
  }

  return { open, openBook };
}
