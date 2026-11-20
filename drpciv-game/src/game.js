// ============================================================================
//  game.js  —  THE HEART OF THE GAME
//
//   1. CAR PHYSICS       steering, gas, progressive brake, reverse, curb bumps
//   2. TRAFFIC           the slow car you must not overtake (Test mode)
//   3. TEST-MODE RULES   what is checked at every sign + the score
//   4. THE GAME OBJECT   update() called by the main loop, mode switching, reset
//
//  No drawing and no buttons here (see render.js / ui.js), so it can be tested
//  automatically. Tune numbers in config.js; add/modify rules in section 3.
// ============================================================================

import { CONFIG as C } from './config.js';
import { SIGNS, CATEGORIES } from './signs.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
const wrap = (a) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};

const HL = C.car.length / 2;
const HW = C.car.width / 2;
// points of the car body that must stay on the asphalt
const BODY_POINTS = [
  [HL, HW], [HL, -HW], [-HL, HW], [-HL, -HW],
  [HL, 0], [-HL, 0], [0, HW], [0, -HW],
];

// ------------------------------------------------------------------ messages
// Short bilingual explanations shown after each check in Test mode.
const MSG = {
  stop: (ok, i) =>
    ok
      ? { ro: 'Corect! Ai oprit complet la STOP.', en: 'Correct! You made a full stop at the STOP sign.' }
      : { ro: `Nu ai oprit complet. Cea mai mică viteză a fost ${i.kmh} km/h.`, en: `You did not stop completely. Your lowest speed was ${i.kmh} km/h.` },
  slow: (ok, i) =>
    ok
      ? { ro: `Corect! Ai redus viteza (${i.kmh} km/h).`, en: `Correct! You slowed down (${i.kmh} km/h).` }
      : { ro: `Prea repede: ${i.kmh} km/h (maxim ${i.max} km/h).`, en: `Too fast: ${i.kmh} km/h (max ${i.max} km/h).` },
  speed: (ok, i) =>
    ok
      ? { ro: `Corect! Ai respectat limita de ${i.max} km/h.`, en: `Correct! You kept to the ${i.max} km/h limit.` }
      : { ro: `Ai depășit limita de ${i.max} km/h.`, en: `You went over the ${i.max} km/h limit.` },
  noOvertake: (ok) =>
    ok
      ? { ro: 'Corect! Nu ai depășit unde este interzis.', en: 'Correct! You did not overtake where it is forbidden.' }
      : { ro: 'Ai depășit unde depășirea este interzisă.', en: 'You overtook where overtaking is forbidden.' },
  noStop: (ok) =>
    ok
      ? { ro: 'Corect! Nu ai oprit unde oprirea este interzisă.', en: 'Correct! You did not stop where stopping is forbidden.' }
      : { ro: 'Ai oprit unde oprirea este interzisă.', en: 'You stopped where stopping is forbidden.' },
  roundabout: (ok) =>
    ok
      ? { ro: 'Corect! Ai circulat în sens invers acelor de ceasornic.', en: 'Correct! You drove counter-clockwise.' }
      : { ro: 'Ai circulat în sens greșit în sensul giratoriu.', en: 'You drove the wrong way round the roundabout.' },
  quiz: (ok, i) =>
    ok
      ? { ro: 'Corect!', en: 'Correct!' }
      : { ro: `Greșit. Răspunsul corect: „${i.right.ro}”.`, en: `Wrong. The correct answer: “${i.right.en}”.` },
  missed: () => ({ ro: 'Nu ai ajuns la acest indicator.', en: 'You did not reach this sign.' }),
};
// special wording for particular signs that use the generic "zones" rule
const MSG_BY_KEY = {
  turnRight: (ok) =>
    ok
      ? { ro: 'Corect! Ai virat la dreapta.', en: 'Correct! You turned right.' }
      : { ro: 'Direcție greșită: trebuia să virezi la dreapta.', en: 'Wrong direction: you had to turn right.' },
  noEntry: (ok) =>
    ok
      ? { ro: 'Corect! Nu ai intrat pe drumul cu acces interzis.', en: 'Correct! You did not enter the no-entry road.' }
      : { ro: 'Ai intrat pe un drum cu acces interzit.', en: 'You entered a no-entry road.' },
};

// ============================================================================
export function createGame(world) {
  const P = C.car;
  const listeners = {};
  const on = (name, fn) => {
    (listeners[name] ||= []).push(fn);
  };
  const emit = (name, payload) => (listeners[name] || []).forEach((fn) => fn(payload));

  const state = {
    mode: 'learn', // 'learn' | 'test'
    time: 0,
    car: null,
    traffic: [],
    prog: null,
    activeSign: null,
    speedLimit: null, // current speed limit in Test mode (km/h) or null
    shake: 0,
    wrongWay: false,
    quiz: null,
    test: null,
  };

  // ==========================================================================
  //  1. CAR PHYSICS
  // ==========================================================================
  function makeCar(at) {
    return {
      x: at.x, y: at.y, heading: at.heading,
      v: 0, // speed in m/s (negative = reversing)
      steer: 0, // current front-wheel angle (radians, + = right)
      gas: 0, brakeP: 0, // pedal "pressure" 0..1
      standTimer: 0,
      contact: false,
      braking: false, reversing: false,
    };
  }

  function stepCar(car, input, dt) {
    const vmax = P.maxSpeedKmh / 3.6;
    const vrev = P.maxReverseKmh / 3.6;
    const av = Math.abs(car.v);

    // --- steering: the wheel angle is limited by tyre grip, and it takes time to turn
    const lock = Math.min(P.maxSteer, Math.atan((P.wheelbase * P.gripLat) / Math.max(av * av, 1)));
    const target = clamp(input.steer, -1, 1) * lock;
    const rate = lock / (input.steer !== 0 ? P.steerTime : P.steerReturnTime);
    car.steer = clamp(approach(car.steer, target, rate * dt), -lock, lock);

    // --- pedals build up gradually
    const brakeOn = input.brake > 0.5;
    car.gas = approach(car.gas, input.gas > 0.5 && !brakeOn ? 1 : 0, (input.gas > 0.5 ? P.throttleRise : P.throttleFall) * dt);
    if (brakeOn) car.brakeP = Math.max(car.brakeP, P.brakeStart);
    car.brakeP = approach(car.brakeP, brakeOn ? 1 : 0, (brakeOn ? (1 - P.brakeStart) / P.brakeBuildTime : 6) * dt);

    // --- forces
    const v0 = car.v;
    let a = 0;
    if (car.v > 0.15) {
      car.standTimer = 0;
      if (brakeOn) a -= P.brake * car.brakeP;
      else a += P.accel * car.gas * (1 - car.v / vmax);
    } else if (car.v < -0.15) {
      car.standTimer = 0;
      if (brakeOn) a -= P.reverseAccel * clamp(1 - -car.v / vrev, 0, 1);
      else if (input.gas > 0.5) a += P.brake * 0.7; // gas while rolling backwards = brake first
    } else if (brakeOn) {
      car.standTimer += dt; // standing still, brake held: after a short pause go into reverse
      if (car.standTimer > P.reverseDelay) a -= P.reverseAccel;
    } else {
      car.standTimer = 0;
      a += P.accel * car.gas;
    }
    car.v += a * dt;

    // resistances always push towards standstill
    let res = P.rolling + P.drag * car.v * car.v;
    if (!brakeOn && car.gas < 0.05) res += P.engineBrake * Math.min(1, Math.abs(car.v) / 3);
    const dv = res * dt;
    if (Math.abs(car.v) <= dv) car.v = 0;
    else car.v -= Math.sign(car.v) * dv;

    // don't flip direction by accident while braking / gas-braking
    if (v0 > 0 && car.v < 0 && brakeOn && car.standTimer === 0) car.v = 0;
    if (v0 < 0 && car.v > 0) car.v = 0;
    car.v = clamp(car.v, -vrev, vmax);

    car.braking = brakeOn && car.v > 0.15;
    car.reversing = car.v < -0.15;

    // --- movement (bicycle model)
    car.heading += ((car.v * Math.tan(car.steer)) / P.wheelbase) * dt;
    car.heading = wrap(car.heading);
    car.x += Math.cos(car.heading) * car.v * dt;
    car.y += Math.sin(car.heading) * car.v * dt;
  }

  /** Keep the car on the asphalt: soft push-back, slow-down and sliding along the curb. */
  function collideRoad(car, dt) {
    const limit = world.half + C.collision.margin;
    let touched = false;
    for (let pass = 0; pass < 3; pass++) {
      const c = Math.cos(car.heading);
      const s = Math.sin(car.heading);
      let worst = 0;
      let wnx = 0;
      let wny = 0;
      for (const [lx, ly] of BODY_POINTS) {
        const q = world.queryRoad(car.x + c * lx - s * ly, car.y + s * lx + c * ly);
        const pen = q.dist - limit;
        if (pen > worst) {
          worst = pen;
          wnx = q.nx;
          wny = q.ny;
        }
      }
      if (worst <= 0) break;
      touched = true;
      car.x -= wnx * (worst + 0.003);
      car.y -= wny * (worst + 0.003);

      const vn = car.v * (c * wnx + s * wny); // speed towards the wall
      if (vn > 0) {
        if (!car.contact && vn > 1.2) {
          // first touch: a gentle bump
          const frac = clamp(vn / Math.max(Math.abs(car.v), 0.1), 0, 1);
          car.v *= 1 - C.collision.speedLoss * frac;
          state.shake = Math.max(state.shake, clamp(vn / 9, 0.2, 1));
          emit('bump', vn);
        }
        // slowly turn the car so that it slides along the wall
        let tx = -wny;
        let ty = wnx;
        const dirx = car.v >= 0 ? c : -c;
        const diry = car.v >= 0 ? s : -s;
        if (dirx * tx + diry * ty < 0) {
          tx = -tx;
          ty = -ty;
        }
        let target = Math.atan2(ty, tx);
        if (car.v < 0) target += Math.PI;
        car.heading = wrap(car.heading + wrap(target - car.heading) * Math.min(1, C.collision.align * dt));
      }
    }
    if (touched) car.v *= Math.max(0, 1 - C.collision.scrape * dt);
    car.contact = touched;
  }

  // ==========================================================================
  //  2. TRAFFIC  (one slow car to practise "No overtaking")
  // ==========================================================================
  const spawned = new Set();

  function stepTraffic(dt) {
    if (state.mode !== 'test' || !state.test || state.test.finished) return;
    const pr = state.prog;
    for (const def of world.traffic) {
      if (!spawned.has(def.id) && pr.onRoute && pr.s >= def.s - def.spawnBefore && pr.s < def.s - 15) {
        spawned.add(def.id);
        const end = world.signs.filter((sg) => sg.test.type === 'endOvertake' && sg.s > def.s).sort((a, b) => a.s - b.s)[0];
        state.traffic.push({
          id: def.id, def, s: def.s, v: def.kmh / 3.6, color: def.color,
          releaseS: end ? end.s : def.s + 120,
          x: 0, y: 0, heading: 0, init: false,
        });
      }
    }
    const tmp = {};
    for (const ai of state.traffic) {
      const target = ai.s >= ai.releaseS ? C.traffic.afterZoneKmh / 3.6 : ai.def.kmh / 3.6;
      ai.v = approach(ai.v, target, C.traffic.accel * dt);
      ai.s = Math.min(world.route.length, ai.s + ai.v * dt);
      const pt = world.route.at(ai.s, tmp);
      ai.x = pt.x - pt.dy * C.traffic.laneOffset;
      ai.y = pt.y + pt.dx * C.traffic.laneOffset;
      const want = Math.atan2(pt.dy, pt.dx);
      ai.heading = ai.init ? wrap(ai.heading + clamp(wrap(want - ai.heading), -3.5 * dt, 3.5 * dt)) : want;
      ai.init = true;
      ai.ghost = false;
      // bump into the player's car (the traffic car is heavy, the player gives way)
      pushOutOfTraffic(state.car, ai);
    }
    // remove cars that are far behind / ahead and out of sight
    for (let i = state.traffic.length - 1; i >= 0; i--) {
      const ai = state.traffic[i];
      const far = Math.hypot(ai.x - state.car.x, ai.y - state.car.y) > 95;
      if ((ai.s > ai.releaseS + 20 && far) || ai.s >= world.route.length - 1) state.traffic.splice(i, 1);
    }
  }

  function pushOutOfTraffic(car, ai) {
    const offs = [-HL * 0.55, HL * 0.55];
    const R = 1.05;
    for (const a of offs) {
      for (const b of offs) {
        const ax = car.x + Math.cos(car.heading) * a;
        const ay = car.y + Math.sin(car.heading) * a;
        const bx = ai.x + Math.cos(ai.heading) * b;
        const by = ai.y + Math.sin(ai.heading) * b;
        const d = Math.hypot(ax - bx, ay - by);
        if (d < R * 2 && d > 1e-4) {
          const push = R * 2 - d;
          car.x += ((ax - bx) / d) * push;
          car.y += ((ay - by) / d) * push;
          const closing = car.v - ai.v;
          if (closing > 1.5) {
            car.v = ai.v + closing * 0.35;
            state.shake = Math.max(state.shake, 0.4);
            emit('bump', closing);
          }
        }
      }
    }
  }

  // ==========================================================================
  //  3. TEST-MODE RULES
  //     Every sign with a `test:` in signs.js becomes a "task". Each task has
  //     a small handler below that watches the car and calls finish(ok, ...).
  // ==========================================================================
  const T = C.test;

  function finish(t, ok, reason, info = {}) {
    if (t.status === 'done') return;
    t.status = 'done';
    t.ok = ok;
    t.reason = reason;
    state.test.score += ok ? T.pointsPerSign : 0;
    const mk = MSG_BY_KEY[t.sign.key] || MSG[t.type] || MSG[reason];
    emit('feedback', {
      taskId: t.id,
      signKey: t.sign.key,
      def: t.sign.def,
      ok,
      points: ok ? T.pointsPerSign : 0,
      score: state.test.score,
      message: mk ? mk(ok, info) : { ro: ok ? 'Corect!' : 'Greșit.', en: ok ? 'Correct!' : 'Wrong.' },
      quiz: t.type === 'quiz',
    });
  }

  const HANDLERS = {
    // Full stop before the stop line
    stop: {
      init(t) {
        t.line = t.s + (t.p.lineOffset ?? 4);
        t.minV = Infinity;
      },
      update(t, c) {
        const win = t.p.lookback ?? 30;
        if (c.s >= t.line - win && c.s <= t.line) t.minV = Math.min(t.minV, c.kmh);
        if (c.crossed(t.line)) {
          const low = t.minV === Infinity ? c.kmh : t.minV;
          finish(t, low <= T.stopMaxKmh, 'stop', { kmh: low.toFixed(1) });
        }
      },
    },

    // Speed at a line must be at most maxKmh (give way, crossing, curve, children)
    slow: {
      init(t) {
        t.line = t.s + (t.p.lineOffset ?? 8);
        t.max = t.p.maxKmh;
      },
      update(t, c) {
        if (c.crossed(t.line)) finish(t, c.kmh <= t.max + 0.5, 'slow', { kmh: Math.round(c.kmh), max: t.max });
      },
    },

    // Speed limit for the stretch ahead (until the next speed sign / the finish)
    speed: {
      init(t) {
        t.limit = t.p.kmh;
        t.over = 0;
        t.grace = 0;
      },
      update(t, c) {
        if (t.status === 'pending' && c.crossed(t.s)) {
          const prev = state.test.speedTask;
          if (prev && prev.status === 'active') finish(prev, true, 'speed', { max: prev.limit });
          t.status = 'active';
          t.grace = T.speedGraceSec;
          state.test.speedTask = t;
          state.speedLimit = t.limit;
        }
        if (t.status !== 'active') return;
        if (t.grace > 0) {
          t.grace -= c.dt;
          return;
        }
        if (c.kmh > t.limit + T.speedTolerance) t.over += c.dt;
        else t.over = Math.max(0, t.over - c.dt);
        if (t.over > T.speedFailSec) finish(t, false, 'speed', { max: t.limit });
      },
      finalize(t) {
        finish(t, true, 'speed', { max: t.limit });
      },
    },

    // Don't pass the slow car until the "end" sign
    noOvertake: {
      init(t) {
        t.start = t.s + (t.p.startOffset ?? 8);
        const end = world.signs.filter((x) => x.test.type === 'endOvertake' && x.s > t.s).sort((a, b) => a.s - b.s)[0];
        t.endS = end ? end.s : t.s + (t.p.length ?? 120);
        t.behind = new Set();
      },
      update(t, c) {
        if (t.status === 'pending' && c.crossed(t.start)) t.status = 'active';
        if (t.status !== 'active') return;
        for (const ai of state.traffic) {
          if (ai.s > c.s + 0.5) t.behind.add(ai.id);
          else if (t.behind.has(ai.id) && c.s > ai.s + T.overtakeMargin && c.onRoute) {
            finish(t, false, 'noOvertake');
            return;
          }
        }
        if (c.s >= t.endS) finish(t, true, 'noOvertake');
      },
      finalize(t) {
        finish(t, true, 'noOvertake');
      },
    },

    // Don't stand still on this stretch
    noStop: {
      init(t) {
        t.start = t.s + 6;
        t.end = t.s + (t.p.length ?? 70);
        t.still = 0;
      },
      update(t, c) {
        if (t.status === 'pending' && c.crossed(t.start)) t.status = 'active';
        if (t.status !== 'active') return;
        if (c.kmh < T.noStopKmh) t.still += c.dt;
        else t.still = 0;
        if (t.still > T.noStopFailSec) finish(t, false, 'noStop');
        else if (c.s >= t.end) finish(t, true, 'noStop');
      },
      finalize(t) {
        finish(t, true, 'noStop');
      },
    },

    // Must drive into the "pass" spot / must not drive into the "fail" spot (set in map.js)
    zones: {
      init(t) {
        t.zones = t.sign.zones || {};
        t.open = t.s - (t.p.openBefore ?? 10);
        t.close = t.s + (t.p.expire ?? 60);
      },
      update(t, c) {
        if (c.s < t.open) return;
        const inside = (z) => z && Math.hypot(c.car.x - z.x, c.car.y - z.y) <= z.r;
        if (inside(t.zones.fail)) finish(t, false, 'zones');
        else if (inside(t.zones.pass)) finish(t, true, 'zones');
        else if (c.s >= t.close) finish(t, !t.zones.pass, 'zones');
      },
      finalize(t) {
        finish(t, !t.zones.pass, 'zones');
      },
    },

    // Go round the roundabout counter-clockwise
    roundabout: {
      init(t) {
        t.endS = t.sign.until ?? t.s + 80;
        t.wrong = 0;
        t.prevA = null;
        t.ring = world.rings[0];
      },
      update(t, c) {
        if (t.status === 'pending' && c.crossed(t.s)) t.status = 'active';
        if (t.status !== 'active') return;
        const r = t.ring;
        const dx = c.car.x - r.cx;
        const dy = c.car.y - r.cy;
        if (r && Math.abs(Math.hypot(dx, dy) - r.r) < 6 && Math.abs(c.car.v) > 2) {
          const a = Math.atan2(dy, dx);
          if (t.prevA != null) {
            const da = wrap(a - t.prevA) * Math.sign(c.car.v); // + = clockwise on screen
            if (da > 0) t.wrong += c.dt;
            else t.wrong = Math.max(0, t.wrong - c.dt);
          }
          t.prevA = a;
        } else t.prevA = null;
        if (t.wrong > 0.8) finish(t, false, 'roundabout');
        else if (c.s >= t.endS) finish(t, true, 'roundabout');
      },
      finalize(t) {
        finish(t, true, 'roundabout');
      },
    },

    // Pop-up question: what does this sign mean?
    quiz: {
      init(t) {
        t.at = t.s + (t.p.triggerOffset ?? 0);
      },
      update(t, c) {
        if (t.status === 'pending' && c.crossed(t.at)) startQuiz(t);
      },
    },
  };

  function startQuiz(t) {
    t.status = 'quiz';
    const keys = Object.keys(SIGNS).filter((k) => k !== t.sign.key);
    const sameCat = keys.filter((k) => SIGNS[k].category === t.sign.def.category);
    const pick = (arr) => arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
    const options = [t.sign.key];
    if (sameCat.length) {
      const k = pick(sameCat);
      options.push(k);
      keys.splice(keys.indexOf(k), 1);
    }
    while (options.length < 3 && keys.length) options.push(pick(keys));
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    state.quiz = { taskId: t.id, signKey: t.sign.key, options, answered: null };
    emit('quiz', state.quiz);
  }

  function answerQuiz(key) {
    const q = state.quiz;
    if (!q || q.answered) return null;
    const t = state.test.tasks.find((x) => x.id === q.taskId);
    q.answered = key;
    const ok = key === q.signKey;
    finish(t, ok, 'quiz', { right: SIGNS[q.signKey].name });
    return { ok, right: q.signKey };
  }

  function closeQuiz() {
    state.quiz = null;
  }

  function startTest() {
    const tasks = [];
    for (const sg of world.signs) {
      const type = sg.test && sg.test.type;
      if (!type || type === 'endOvertake') continue;
      if (!HANDLERS[type]) {
        console.warn(`signs.js: unknown test type "${type}" for sign ${sg.key}`);
        continue;
      }
      const t = { id: sg.id, sign: sg, type, p: sg.test, s: sg.s, status: 'pending', ok: null, reason: null };
      HANDLERS[type].init(t);
      tasks.push(t);
    }
    state.test = { tasks, score: 0, max: tasks.length * T.pointsPerSign, finished: false, summary: null, speedTask: null, startTime: state.time };
  }

  function summarize() {
    const cats = {};
    for (const k of Object.keys(CATEGORIES)) cats[k] = { total: 0, correct: 0 };
    for (const t of state.test.tasks) {
      const cat = t.sign.def.category;
      cats[cat].total += 1;
      if (t.ok) cats[cat].correct += 1;
    }
    const tasks = state.test.tasks.map((t) => ({
      id: t.id,
      key: t.sign.key,
      def: t.sign.def,
      ok: !!t.ok,
      missed: t.reason === 'missed',
    }));
    return {
      score: state.test.score,
      max: state.test.max,
      correct: tasks.filter((x) => x.ok).length,
      total: tasks.length,
      cats,
      tasks,
      seconds: state.time - state.test.startTime,
    };
  }

  /** End the test: running checks that had no problem count as passed; unreached signs count as missed. */
  function endTest() {
    const test = state.test;
    if (!test || test.finished) return test && test.summary;
    for (const t of test.tasks) {
      if (t.status === 'done') continue;
      if (t.status === 'active' && HANDLERS[t.type].finalize) HANDLERS[t.type].finalize(t);
      else {
        t.status = 'done';
        t.ok = false;
        t.reason = 'missed';
      }
    }
    test.finished = true;
    test.summary = summarize();
    emit('finish', test.summary);
    return test.summary;
  }

  const ctx = { s: 0, prevS: 0, kmh: 0, dt: 0, onRoute: false, jumped: false, car: null, crossed: null };
  ctx.crossed = (line) => ctx.onRoute && !ctx.jumped && ctx.prevS < line && ctx.s >= line;

  function runRules(dt) {
    const pr = state.prog;
    const car = state.car;
    ctx.s = pr.s;
    ctx.prevS = pr.prevS;
    ctx.kmh = Math.abs(car.v) * 3.6;
    ctx.dt = dt;
    ctx.onRoute = pr.onRoute;
    ctx.jumped = pr.jumped;
    ctx.car = car;
    if (state.wrongWay || state.quiz) return;
    for (const t of state.test.tasks) {
      if (t.status === 'done') continue;
      HANDLERS[t.type].update(t, ctx);
      if (state.quiz) break;
    }
    // reached the finish line?
    if (pr.onRoute && pr.s >= world.route.length - 0.8 && pr.vAlong > 0.5) endTest();
  }

  // ==========================================================================
  //  4. THE GAME OBJECT
  // ==========================================================================
  function updateProgress(dt) {
    const car = state.car;
    const pr = state.prog;
    const loc = world.route.locate(car.x, car.y, pr.ready ? pr.k : null);
    pr.prevS = pr.s;
    const jumped = pr.ready && Math.abs(loc.s - pr.s) > 14;
    pr.ready = true;
    pr.s = loc.s;
    pr.k = loc.k;
    pr.lateral = loc.lateral;
    pr.dist = loc.dist;
    pr.onRoute = loc.onRoute;
    pr.dx = loc.dx;
    pr.dy = loc.dy;
    pr.jumped = jumped;
    if (jumped) pr.prevS = pr.s;
    pr.vAlong = car.v * (Math.cos(car.heading) * loc.dx + Math.sin(car.heading) * loc.dy);
    pr.wrongTime = pr.onRoute && pr.vAlong < -1.5 ? pr.wrongTime + dt : Math.max(0, pr.wrongTime - dt * 2);
    state.wrongWay = pr.wrongTime > 1.0;
  }

  function updateActiveSign() {
    const car = state.car;
    const R = C.world.signActiveRange;
    const fx = Math.cos(car.heading);
    const fy = Math.sin(car.heading);
    const score = (sg) => {
      const dx = sg.x - car.x;
      const dy = sg.y - car.y;
      const d = Math.hypot(dx, dy);
      if (d > R) return Infinity;
      const front = (dx * fx + dy * fy) / (d || 1);
      if (front < -0.15 && d > 7) return Infinity;
      return d - front * 8;
    };
    let best = null;
    let bs = Infinity;
    for (const sg of world.signs) {
      const sc = score(sg);
      if (sc < bs) {
        bs = sc;
        best = sg;
      }
    }
    const prev = state.activeSign;
    if (prev && prev !== best) {
      const ps = score(prev);
      if (ps !== Infinity && bs > ps - 6) best = prev; // stick with the current sign for a moment
    }
    state.activeSign = best;
  }

  function update(dt, input) {
    state.time += dt;
    stepCar(state.car, input, dt);
    collideRoad(state.car, dt);
    stepTraffic(dt);
    updateProgress(dt);
    updateActiveSign();
    if (state.mode === 'test' && state.test && !state.test.finished) runRules(dt);
    state.shake = Math.max(0, state.shake - dt * 2.5);
  }

  function freshProgress() {
    return { s: 0, prevS: 0, k: 0, ready: false, lateral: 0, dist: 0, onRoute: true, jumped: false, dx: 1, dy: 0, vAlong: 0, wrongTime: 0 };
  }

  function resetToStart() {
    state.car = makeCar(world.start);
    state.prog = freshProgress();
    state.traffic = [];
    spawned.clear();
    state.quiz = null;
    state.speedLimit = null;
    state.wrongWay = false;
    state.shake = 0;
    state.activeSign = null;
    updateProgress(0);
  }

  function setMode(mode) {
    state.mode = mode;
    resetToStart();
    state.test = null;
    if (mode === 'test') startTest();
    emit('mode', mode);
  }

  /** Put the car back on the road, facing the right way (a little behind where it is now). */
  function resetCar() {
    const loc = world.route.locate(state.car.x, state.car.y, null);
    const s = Math.max(0, loc.s - 4);
    const pt = world.route.at(s, {});
    const car = makeCar({
      x: pt.x - pt.dy * C.world.laneOffset,
      y: pt.y + pt.dx * C.world.laneOffset,
      heading: Math.atan2(pt.dy, pt.dx),
    });
    state.car = car;
    state.prog.ready = false;
    state.prog.wrongTime = 0;
    updateProgress(0);
    state.prog.jumped = false;
    state.prog.prevS = state.prog.s;
  }

  setMode('learn');

  return {
    state,
    world,
    on,
    update,
    setMode,
    restart: () => setMode(state.mode),
    resetCar,
    endTest,
    answerQuiz,
    closeQuiz,
  };
}
