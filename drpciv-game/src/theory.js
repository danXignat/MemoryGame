// ============================================================================
//  theory.js  —  the theory exam screen ("Chestionare"), DRPCIV style
//
//  26 random questions, 30 minutes. 22 correct = passed; the 5th wrong answer
//  ends the exam (failed). "Răspunde mai târziu" sends the question to the end.
//  Practice mode shows the right answer and an explanation after each one.
// ============================================================================

import { EXAM, QUESTIONS } from './questions.js';

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
          <div class="stack two">
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
      run(b.dataset.th === 'practice');
    });
  }

  function run(practice) {
    const queue = shuffle(QUESTIONS).slice(0, EXAM.count).map((q) => {
      // shuffle the answers too, keeping track of which are correct
      const order = shuffle([0, 1, 2]);
      return { ...q, a: order.map((i) => q.a[i]), ok: order.map((i, k) => (q.ok.includes(i) ? k : -1)).filter((k) => k >= 0) };
    });
    const answered = [];
    let right = 0;
    let wrong = 0;
    let pick = [];
    let reviewing = false;
    const deadline = Date.now() + EXAM.minutes * 60 * 1000;
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
        <span><small>Inițiale</small><b>${EXAM.count}</b></span>
        <span><small>Rămase</small><b>${queue.length}</b></span>
        <span class="okc"><small>Corecte</small><b>${right}</b></span>
        <span class="badc"><small>Greșite</small><b>${wrong}</b></span>
        <span><small>Timp</small><b id="thClock">30:00</b></span>
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
        if (wrong > EXAM.maxWrong) return finish('wrong');
        if (right >= EXAM.passAt && !queue.length) return finish('done');
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
      send.textContent = queue.length > 1 && wrong <= EXAM.maxWrong ? 'Următoarea' : 'Vezi rezultatul';
      send.disabled = false;
    }

    function finish(reason) {
      clearInterval(timer);
      const passed = reason !== 'wrong' && reason !== 'time' && right >= EXAM.passAt;
      const stats = loadStats();
      stats.runs++;
      if (passed) stats.passed++;
      stats.best = Math.max(stats.best || 0, right);
      saveStats(stats);
      passed ? sfx.ok() : sfx.bad();
      const msg = { wrong: `Ai greșit ${wrong} întrebări.`, time: 'Timpul a expirat.', done: '' }[reason];
      const mistakes = answered.filter((x) => !x.ok);
      body.innerHTML = `
        <div class="thres ${passed ? 'pass' : 'fail'}">
          <h2>${passed ? 'ADMIS' : 'RESPINS'}</h2>
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
        run(practice);
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
          if (wrong > EXAM.maxWrong) return finish('wrong');
          return show();
        }
        if (pick.length) submit();
      }
    });

    show();
    timer = setInterval(clock, 1000);
  }

  return { open };
}
