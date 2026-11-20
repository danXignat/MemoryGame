// ============================================================================
//  game.js  —  THE HEART OF THE GAME
//
//   1. CAR PHYSICS      engine + gearbox + fuel, steering, brakes, curb bumps
//   2. OTHER ROAD USERS slow car, NPC traffic, walking pedestrians
//   3. EXAM RULES       what is checked at signs, turns, crossings + penalty points
//   4. THE GAME OBJECT  update(), mode switching, lights, blinkers, refuelling
//
//  No drawing and no buttons here (see render.js / ui.js), so it can be tested
//  automatically. Car numbers live in cars.js, tuning in config.js.
// ============================================================================

import { CONFIG as C } from './config.js';
import { SIGNS, CATEGORIES, visibleSignKeys } from './signs.js';
import { CARS, powerCurve, gearTopKmh } from './cars.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
const wrap = (a) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};

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
};
const MSG_REASON = {
  crosswalk: (ok, i) =>
    ok
      ? { ro: 'Corect! Ai oprit pentru pieton.', en: 'Correct! You stopped for the pedestrian.' }
      : { ro: `Nu ai acordat prioritate pietonului (${i.kmh} km/h).`, en: `You did not give way to the pedestrian (${i.kmh} km/h).` },
  yield: () => ({ ro: 'Nu ai cedat trecerea: veneau vehicule pe drumul cu prioritate.', en: 'You did not give way: vehicles were coming on the priority road.' }),
  signal: () => ({ ro: 'Corect! Ai semnalizat înainte de viraj.', en: 'Correct! You signalled before turning.' }),
  signalOff: () => ({ ro: 'Nu ai semnalizat înainte de viraj.', en: 'You did not signal before the turn.' }),
  signalWrong: () => ({ ro: 'Ai semnalizat în partea greșită.', en: 'You signalled the wrong side.' }),
  refuel: (ok, i) => (ok ? { ro: `Ai alimentat ${i.l} L. Nu uita să pornești motorul.`, en: `You put in ${i.l} L. Remember to restart the engine.` } : { ro: 'Ai trecut de benzinărie fără să alimentezi.', en: 'You passed the fuel station without refuelling.' }),
  lane: () => ({ ro: 'Corect! Ai semnalizat și ai schimbat banda.', en: 'Correct! You signalled and changed lane.' }),
  laneNoSignal: () => ({ ro: 'Ai schimbat banda fără să semnalizezi.', en: 'You changed lane without signalling.' }),
  laneMissed: () => ({ ro: 'Nu ai schimbat banda la timp.', en: 'You did not change lane in time.' }),
  hazardStop: (ok) => (ok ? { ro: 'Corect! Ai oprit cu luminile de avarie aprinse.', en: 'Correct! You stopped with the hazard lights on.' } : { ro: 'La oprirea forțată trebuie să oprești cu avariile pornite.', en: 'For the forced stop you must stop with the hazard lights on.' }),
  pickup: (ok) => (ok ? { ro: 'Pasagerul a urcat. Drum bun!', en: 'Your passenger is in. Have a good trip!' } : { ro: 'Ai trecut de locul de întâlnire fără să oprești.', en: 'You drove past the meeting point without stopping.' }),
};
const MSG_BY_KEY = {
  turnRight: (ok) => (ok ? { ro: 'Corect! Ai virat la dreapta.', en: 'Correct! You turned right.' } : { ro: 'Direcție greșită: trebuia să virezi la dreapta.', en: 'Wrong direction: you had to turn right.' }),
  turnLeft: (ok) => (ok ? { ro: 'Corect! Ai virat la stânga.', en: 'Correct! You turned left.' } : { ro: 'Direcție greșită: trebuia să virezi la stânga.', en: 'Wrong direction: you had to turn left.' }),
  noEntry: (ok) => (ok ? { ro: 'Corect! Nu ai intrat pe drumul cu acces interzis.', en: 'Correct! You did not enter the no-entry road.' } : { ro: 'Ai intrat pe un drum cu acces interzis.', en: 'You entered a no-entry road.' }),
};

const PSEUDO = (id, key, s) => ({ id, key, def: SIGNS[key], s, test: {}, zones: null });
const NPC_COLORS = ['#5f7fbf', '#8c6bd6', '#c0392b', '#2c3e50', '#7f8c8d', '#16a085', '#d35400', '#b8bcc2', '#1f6f8b'];
const pickColor = () => NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)];
const SIGNAL_SIGN = (id, s) => ({ id, key: 'signalling', def: SIGNS.signalling, s, test: {}, zones: null });

// ============================================================================
export function createGame(world, opts = {}) {
  const level = opts.level || null;
  const listeners = {};
  const on = (name, fn) => {
    (listeners[name] ||= []).push(fn);
  };
  const emit = (name, payload) => (listeners[name] || []).forEach((fn) => fn(payload));

  const state = {
    mode: 'learn', // 'learn' | 'test'
    time: 0,
    spec: CARS[opts.carId] || CARS.golf5,
    weather: opts.weather || world.weather || 'day',
    car: null,
    traffic: [],
    npcs: [],
    peds: [],
    prog: null,
    activeSign: null,
    speedLimit: null,
    shake: 0,
    wrongWay: false,
    quiz: null,
    test: null,
    station: null,
    refueling: null,
    fuelSpent: 0,
    fuelAdded: 0,
    obstacles: [],
    passenger: false,
    mood: 'happy', // passenger mood: happy | wince
    moodWhy: null, // brake | speed | rule
    moodT: 0,
    blink: 0,
  };

  let HL = 2.3;
  let HW = 0.9;
  let BODY_POINTS = [];
  let gearTop = [];
  function applySpec(spec) {
    state.spec = spec;
    HL = spec.length / 2;
    HW = spec.width / 2;
    BODY_POINTS = [[HL, HW], [HL, -HW], [-HL, HW], [-HL, -HW], [HL, 0], [-HL, 0], [0, HW], [0, -HW]];
    gearTop = gearTopKmh(spec).map((k) => k / 3.6);
  }
  applySpec(state.spec);

  const envGrip = () => (state.weather === 'rain' ? 0.85 : 1);

  // ==========================================================================
  //  1. CAR PHYSICS
  // ==========================================================================
  function makeCar(at) {
    const spec = state.spec;
    return {
      x: at.x, y: at.y, heading: at.heading,
      v: 0, // m/s, negative = reversing
      steer: 0, // front wheel angle (rad, + = right)
      gas: 0, brakeP: 0, standTimer: 0,
      contact: false, braking: false, reversing: false,
      engineOn: true, starting: 0, rpm: spec.idle, boost: 0, gear: 0, shiftT: 0,
      fuel: spec.tankL * (opts.fuel ?? level?.fuel ?? C.fuel.startFraction),
      fuelRate: 0, lowWarned: false,
      signal: null, signalT: 0, sigH: 0, hazard: false, lights: 0,
    };
  }

  function stepCar(car, input, dt) {
    const spec = state.spec;
    const grip = envGrip();
    const vmax = Math.min(spec.topKmh, C.car2.capKmh) / 3.6;
    const vrev = C.car.maxReverseKmh / 3.6;
    const av = Math.abs(car.v);

    // --- steering: limited by tyre grip, and heavier cars turn in more slowly
    const lock = Math.min(spec.maxSteer, Math.atan((spec.wheelbase * spec.gripLat * grip) / Math.max(av * av, 1)));
    const target = clamp(input.steer, -1, 1) * lock;
    const rate = lock / (Math.abs(target) > 1e-3 ? spec.steerTime : spec.steerReturn);
    car.steer = clamp(approach(car.steer, target, rate * dt), -lock, lock);

    // --- engine on/off + fuel
    if (car.starting > 0) {
      car.starting -= dt;
      if (car.starting <= 0) car.engineOn = car.fuel > 0;
    }
    if (car.engineOn && car.fuel <= 0) {
      car.engineOn = false;
      emit('stall');
      issue('fuel', C.exam.penalty.fuel, { ro: 'Ai rămas fără combustibil.', en: 'You ran out of fuel.' }, { title: { ro: 'Fără combustibil', en: 'Out of fuel' } });
    }
    const engineOn = car.engineOn;

    // --- pedals build up gradually
    const brakeOn = input.brake > 0.5;
    const gasWanted = input.gas > 0.5 && !brakeOn && engineOn;
    car.gas = approach(car.gas, gasWanted ? 1 : 0, (gasWanted ? C.car.throttleRise : C.car.throttleFall) * dt);
    if (brakeOn) car.brakeP = Math.max(car.brakeP, C.car.brakeStart);
    car.brakeP = approach(car.brakeP, brakeOn ? 1 : 0, (brakeOn ? (1 - C.car.brakeStart) / C.car.brakeBuildTime : 6) * dt);

    // --- automatic gearbox + revs
    const vf = Math.max(car.v, 0);
    car.shiftT = Math.max(0, car.shiftT - dt);
    if (car.v < -0.3) car.gear = -1;
    else if (vf < 0.3 && car.gas < 0.05) car.gear = 0;
    else {
      if (car.gear <= 0) car.gear = 1;
      if (car.gear < 6 && vf > gearTop[car.gear - 1] * 0.94) {
        car.gear++;
        car.shiftT = 0.2;
      } else if (car.gear > 1 && vf < gearTop[car.gear - 2] * 0.6) car.gear--;
    }
    const gtop = gearTop[Math.max(1, car.gear) - 1];
    let rpmF = engineOn ? clamp(vf / gtop, 0, 1) : 0;
    if (engineOn) rpmF = Math.max(rpmF, car.gas > 0.1 ? 0.28 : 0.05);
    const wantRpm = engineOn ? spec.idle + (spec.redline - spec.idle) * rpmF : 0;
    car.rpm += (wantRpm - car.rpm) * Math.min(1, 12 * dt);
    car.boost = approach(car.boost, car.gas > 0.6 && rpmF > 0.3 ? 1 : 0, dt / (car.gas > 0.6 ? 0.9 : 0.4));

    // --- engine power: each car delivers it differently
    const pm = powerCurve(spec.engineType, rpmF, car.boost);
    const powerW = spec.powerKw * 1000 * C.car2.driveEff * pm;
    const aPow = powerW / (spec.massKg * Math.max(vf, 2.5));
    const lowEnd = clamp(pm / 0.85, 0.7, 1.15); // torque at these revs: diesel/V8 strong, VTEC and turbo (before boost) weaker
    const aDrive = Math.min(aPow, spec.traction * grip * lowEnd) * car.gas * (car.shiftT > 0 ? 0.2 : 1) * (1 - Math.pow(clamp(vf / vmax, 0, 1), 4));

    const v0 = car.v;
    let a = 0;
    if (car.v > 0.15) {
      car.standTimer = 0;
      if (brakeOn) a -= spec.brake * grip * car.brakeP;
      else a += aDrive;
    } else if (car.v < -0.15) {
      car.standTimer = 0;
      if (brakeOn) a -= engineOn ? C.car.reverseAccel * clamp(1 - -car.v / vrev, 0, 1) : 0;
      else if (input.gas > 0.5) a += spec.brake * 0.7;
    } else if (brakeOn) {
      car.standTimer += dt;
      if (car.standTimer > C.car.reverseDelay && engineOn) a -= C.car.reverseAccel;
    } else {
      car.standTimer = 0;
      a += aDrive;
    }
    car.v += a * dt;

    // resistances always push towards standstill (a heavy car keeps rolling longer)
    const dragK = C.car.drag * (1450 / spec.massKg) * (spec.width / 1.74);
    let res = C.car.rolling + dragK * car.v * car.v;
    if (!brakeOn && car.gas < 0.05 && engineOn) res += C.car.engineBrake * Math.min(1, av / 3);
    const dv = res * dt;
    if (Math.abs(car.v) <= dv) car.v = 0;
    else car.v -= Math.sign(car.v) * dv;
    if (v0 > 0 && car.v < 0 && brakeOn && car.standTimer === 0) car.v = 0;
    if (v0 < 0 && car.v > 0) car.v = 0;
    car.v = clamp(car.v, -vrev, vmax);

    car.braking = brakeOn && car.v > 0.15;
    car.reversing = car.v < -0.15;

    // --- fuel: depends on the car, throttle and speed
    if (engineOn) {
      const idleLs = 0.00022 + spec.massKg * 5e-8;
      const cruise = (spec.l100 / 100000) * Math.max(car.v, 0) * (0.6 + 0.9 * car.gas * (spec.powerKw / 100));
      car.fuelRate = (idleLs + cruise) * C.fuel.scale;
      car.fuel = Math.max(0, car.fuel - car.fuelRate * dt);
      if (!car.lowWarned && car.fuel / spec.tankL < C.fuel.lowFraction) {
        car.lowWarned = true;
        emit('lowfuel');
      }
    } else car.fuelRate = 0;

    // --- movement (bicycle model)
    car.heading = wrap(car.heading + ((car.v * Math.tan(car.steer)) / spec.wheelbase) * dt);
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

      const vn = car.v * (c * wnx + s * wny);
      if (vn > 0) {
        if (!car.contact && vn > 1.2) {
          const frac = clamp(vn / Math.max(Math.abs(car.v), 0.1), 0, 1);
          car.v *= 1 - C.collision.speedLoss * frac;
          state.shake = Math.max(state.shake, clamp(vn / 9, 0.2, 1));
          emit('bump', vn);
          if (vn > 2.2) curbHit();
        }
        let tx = -wny;
        let ty = wnx;
        const dirx = car.v >= 0 ? c : -c;
        const diry = car.v >= 0 ? s : -s;
        if (dirx * tx + diry * ty < 0) {
          tx = -tx;
          ty = -ty;
        }
        let tgt = Math.atan2(ty, tx);
        if (car.v < 0) tgt += Math.PI;
        car.heading = wrap(car.heading + wrap(tgt - car.heading) * Math.min(1, C.collision.align * dt));
      }
    }
    if (touched) car.v *= Math.max(0, 1 - C.collision.scrape * dt);
    car.contact = touched;
  }

  // ==========================================================================
  //  2. OTHER ROAD USERS
  // ==========================================================================
  const spawned = new Set();

  function stepTraffic(dt) {
    // the slow car on the route (used by the No-overtaking check)
    if (state.mode === 'test' && state.test && !state.test.finished) {
      const pr = state.prog;
      for (const def of world.traffic) {
        if (!spawned.has(def.id) && pr.onRoute && pr.s >= def.s - def.spawnBefore && pr.s < def.s - 15) {
          spawned.add(def.id);
          const end = world.signs.filter((sg) => sg.test.type === 'endOvertake' && sg.s > def.s).sort((a, b) => a.s - b.s)[0];
          state.traffic.push({ id: def.id, def, s: def.s, v: def.kmh / 3.6, color: def.color, releaseS: end ? end.s : def.s + 120, x: 0, y: 0, heading: 0, init: false, width: 1.8, length: 4.2 });
        }
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
      pushOutOfTraffic(state.car, ai);
    }
    for (let i = state.traffic.length - 1; i >= 0; i--) {
      const ai = state.traffic[i];
      const far = Math.hypot(ai.x - state.car.x, ai.y - state.car.y) > 95;
      if ((ai.s > ai.releaseS + 20 && far) || ai.s >= world.route.length - 1) state.traffic.splice(i, 1);
    }

    // NPC cars with their own road (cross traffic)
    for (const def of world.npcDefs) {
      if (def.loop) continue;
      def.timer = (def.timer ?? 0) - dt;
      if (def.timer <= 0 && state.npcs.filter((n) => n.def === def).every((n) => n.s > 18)) {
        def.timer = def.every * (0.8 + Math.random() * 0.5);
        def.count = (def.count || 0) + 1;
        const police = !!def.policeEvery && def.count % def.policeEvery === 0;
        state.npcs.push({ def, s: 0, v: def.kmh / 3.6, x: 0, y: 0, heading: 0, color: police ? '#f4f6f8' : pickColor(), police, width: 1.8, length: police ? 4.6 : 4.3 });
      }
    }
    for (let i = state.npcs.length - 1; i >= 0; i--) {
      const n = state.npcs[i];
      // drive sensibly: stop for the player in their lane, keep a gap to the car ahead
      let want = n.def.kmh / 3.6;
      if (n.init) {
        const fx = Math.cos(n.heading);
        const fy = Math.sin(n.heading);
        const rx = state.car.x - n.x;
        const ry = state.car.y - n.y;
        const ahead = rx * fx + ry * fy;
        const side = Math.abs(-rx * fy + ry * fx);
        if (ahead > 0 && ahead < 24 && side < 2.8) want = 0;
        for (const o of state.npcs) {
          if (o === n || o.def !== n.def) continue;
          const gap = o.s - n.s;
          if (gap > 0 && gap < 11) want = Math.min(want, o.v * 0.8);
        }
      }
      n.v = approach(n.v, want, (want < n.v ? 6 : 2) * dt);
      n.s += n.v * dt;
      if (n.def.loop) n.s %= n.def.path.length;
      else if (n.s >= n.def.path.length) {
        state.npcs.splice(i, 1);
        continue;
      }
      const pt = n.def.path.at(n.s, tmp);
      n.x = pt.x - pt.dy * n.def.lane;
      n.y = pt.y + pt.dx * n.def.lane;
      n.heading = Math.atan2(pt.dy, pt.dx);
      n.init = true;
      if (pushOutOfTraffic(state.car, n) > 3) issue('pedHit', C.exam.penalty.pedHit, { ro: 'Ai lovit un alt vehicul.', en: 'You hit another vehicle.' }, { title: { ro: 'Accident', en: 'Crash' } });
    }

    // stopped cars (they do not move; you drive round them)
    for (const o of state.obstacles) if (pushOutOfTraffic(state.car, o) > 3) issue('pedHit', C.exam.penalty.pedHit, { ro: 'Ai lovit o mașină oprită.', en: 'You hit a stopped car.' }, { title: { ro: 'Accident', en: 'Crash' } });

    // pedestrians
    const pr = state.prog;
    for (const p of state.peds) {
      if (p.phase === 'idle' && !p.used && pr.onRoute && pr.s >= p.s - 48 && pr.s < p.s) {
        p.phase = 'wait';
        p.timer = 2.2;
      } else if (p.phase === 'wait') {
        p.timer -= dt;
        if (p.timer <= 0) {
          p.phase = 'cross';
          p.t = 0;
        }
      } else if (p.phase === 'cross') {
        p.t += (p.speed * dt) / (2 * p.reach);
        if (p.t >= 1) {
          p.t = 1;
          p.phase = 'rest';
          p.timer = 3;
          p.used = true;
        }
      } else if (p.phase === 'rest') {
        p.timer -= dt;
        if (p.timer <= 0) {
          p.phase = 'idle';
          p.side = -p.side;
          p.t = 0;
        }
      }
      if (p.used && (pr.s > p.s + 30 || pr.s < p.s - 70)) p.used = false;
      const lat = p.side * p.reach * (1 - 2 * p.t);
      p.px = p.x + p.nx * lat;
      p.py = p.y + p.ny * lat;
      if (!p.hit && (p.phase === 'cross' || p.phase === 'wait') && Math.hypot(state.car.x - p.px, state.car.y - p.py) < HW + 0.8 && Math.abs(state.car.v) > 1) {
        p.hit = true;
        issue('pedHit', C.exam.penalty.pedHit, { ro: 'Ai lovit un pieton!', en: 'You hit a pedestrian!' }, { title: { ro: 'Accident', en: 'Crash' } });
      }
    }
  }

  /** Push the player out of another car. Returns how hard they closed in (m/s). */
  function pushOutOfTraffic(car, ai) {
    const spec = state.spec;
    const offs = [-spec.length * 0.28, spec.length * 0.28];
    const aoffs = [-(ai.length || 4.2) * 0.28, (ai.length || 4.2) * 0.28];
    const R = Math.max(spec.width, ai.width || 1.8) * 0.55 + 0.15;
    let closeSpeed = 0;
    for (const a of offs) {
      for (const b of aoffs) {
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
            closeSpeed = Math.max(closeSpeed, closing);
          }
        }
      }
    }
    return closeSpeed;
  }

  // ==========================================================================
  //  3. EXAM RULES
  //     Every sign with a `test:` in signs.js becomes a "task", and so does
  //     every turn that needs a signal. Each task has a small handler below
  //     that watches the car and calls finish(ok, ...).
  // ==========================================================================
  const T = C.test;

  function checkEliminated() {
    const t = state.test;
    if (t && !t.finished && t.penalty >= C.exam.failAt) {
      t.failedExam = true;
      setTimeout(() => endTest(), 0);
    }
  }

  /** A mistake that is not tied to one sign (lights, curb, fuel ...). */
  function issue(key, pts, message, extra = {}) {
    const t = state.test;
    if (!t || t.finished || state.mode !== 'test') return;
    t.penalty += pts;
    t.log.push({ key, pts, message, title: extra.title || null, signKey: extra.signKey || null });
    state.mood = 'wince';
    state.moodWhy = 'rule';
    state.moodT = 2;
    emit('feedback', { taskId: null, issue: true, issueKey: key, signKey: extra.signKey || null, def: extra.def || null, title: extra.title || null, ok: false, points: 0, penalty: pts, totalPenalty: t.penalty, score: t.score, message, quiz: false });
    checkEliminated();
  }

  let curbCount = 0;
  function curbHit() {
    curbCount++;
    if (curbCount <= 5) issue('curb', C.exam.penalty.curb, { ro: 'Ai atins bordura.', en: 'You touched the curb.' }, { title: { ro: 'Bordură', en: 'Curb' } });
  }

  function finish(t, ok, reason, info = {}) {
    if (t.status === 'done') return;
    t.status = 'done';
    t.ok = ok;
    t.reason = reason;
    const test = state.test;
    const pen = ok ? 0 : t.p.penalty ?? C.exam.penalty[reason] ?? C.exam.penalty[t.type] ?? 5;
    test.score += ok ? T.pointsPerSign : 0;
    test.penalty += pen;
    t.penalty = pen;
    const mk = MSG_REASON[reason] || MSG_BY_KEY[t.sign.key] || MSG[t.type];
    const message = mk ? mk(ok, info) : { ro: ok ? 'Corect!' : 'Greșit.', en: ok ? 'Correct!' : 'Wrong.' };
    t.message = message;
    if (!ok) {
      state.mood = 'wince';
      state.moodWhy = 'rule';
      state.moodT = 2;
    }
    emit('feedback', { taskId: t.id, signKey: t.sign.key, def: t.sign.def, ok, points: ok ? T.pointsPerSign : 0, penalty: pen, totalPenalty: test.penalty, score: test.score, message, quiz: t.type === 'quiz' });
    if (pen) checkEliminated();
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
          const cf = t.p.conflict;
          if (low <= T.stopMaxKmh && cf && state.npcs.some((n) => Math.hypot(n.x - cf.x, n.y - cf.y) < cf.r)) finish(t, false, 'yield');
          else finish(t, low <= T.stopMaxKmh, 'stop', { kmh: low.toFixed(1) });
        }
      },
    },

    // Speed at a line must be at most maxKmh. Also: give way to cars / pedestrians.
    slow: {
      init(t) {
        t.line = t.s + (t.p.lineOffset ?? 8);
        t.max = t.p.maxKmh;
        t.conflict = t.p.conflict || null;
        t.ped = world.peds.length ? state.peds.find((pd) => Math.abs(pd.s - t.line) < 3) || null : null;
      },
      update(t, c) {
        if (!c.crossed(t.line)) return;
        if (t.ped && (t.ped.phase === 'wait' || t.ped.phase === 'cross')) {
          finish(t, c.kmh <= 3.5, 'crosswalk', { kmh: Math.round(c.kmh) });
          return;
        }
        if (t.conflict && state.npcs.some((n) => Math.hypot(n.x - t.conflict.x, n.y - t.conflict.y) < t.conflict.r)) {
          finish(t, false, 'yield');
          return;
        }
        finish(t, c.kmh <= t.max + 0.5, 'slow', { kmh: Math.round(c.kmh), max: t.max });
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

    // Must drive into the "pass" spot / must not drive into the "fail" spot (set in the map)
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
        t.ring = world.rings.slice().sort((p, q) => Math.hypot(p.cx - t.sign.x, p.cy - t.sign.y) - Math.hypot(q.cx - t.sign.x, q.cy - t.sign.y))[0];
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
            const da = wrap(a - t.prevA) * Math.sign(c.car.v);
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

    // The right blinker must be on (for a moment) before a turn
    signal: {
      init(t) {
        t.side = t.p.side;
        t.line = t.s - (t.p.lead ?? 8);
      },
      update(t, c) {
        if (!c.crossed(t.line)) return;
        const car = c.car;
        if (car.signal === t.side && car.signalT >= 0.8) finish(t, true, 'signal');
        else finish(t, false, car.signal ? 'signalWrong' : 'signalOff');
      },
    },

    // Refuel at the station on the route (engine off, at least `litres`)
    refuel: {
      init(t) {
        t.need = t.p.litres;
      },
      update(t, c) {
        if (state.fuelAdded >= t.need - 0.05) finish(t, true, 'refuel', { l: Math.round(state.fuelAdded) });
        else if (c.s > t.s + 40 && !state.refueling) finish(t, false, 'refuel', {});
      },
    },

    // Change lane inside a window, with the right signal on before crossing the lane line
    lane: {
      init(t) {
        t.end = t.s + (t.p.window ?? 80);
        t.toInner = t.p.to === 'left';
        t.prevLat = null;
      },
      update(t, c) {
        if (c.s < t.s - 30) return;
        const lat = state.prog.lateral;
        const d = t.p.divider;
        if (t.prevLat != null && c.s >= t.s - 30) {
          const crossed = t.toInner ? t.prevLat >= d && lat < d : t.prevLat <= d && lat > d;
          if (crossed) {
            const ok = c.car.signal === t.p.to && c.car.signalT >= 0.8;
            finish(t, ok, ok ? 'lane' : 'laneNoSignal');
            return;
          }
        }
        t.prevLat = lat;
        if (c.s > t.end) finish(t, false, 'laneMissed');
      },
    },

    // Forced stop: stop at the marked spot with the hazard lights on
    hazardStop: {
      init(t) {
        t.hold = 0;
        t.spot = t.p.spot;
      },
      update(t, c) {
        const near = Math.hypot(c.car.x - t.spot.x, c.car.y - t.spot.y) < 12;
        if (near && c.kmh < 3) {
          t.hold += c.dt;
          if (t.hold > 2) finish(t, c.car.hazard, 'hazardStop');
        } else t.hold = 0;
        if (c.s > t.s + 18) finish(t, false, 'hazardStop');
      },
    },

    // Stop at the meeting point and let the passenger in
    pickup: {
      init(t) {
        t.hold = 0;
        t.spot = world.mission.pickup;
      },
      update(t) {
        if (state.pax && state.pax.phase !== 'waiting' && state.pax.phase !== 'walking') finish(t, !state.pax.missed, 'pickup');
      },
    },
  };

  function startQuiz(t) {
    t.status = 'quiz';
    const all = visibleSignKeys().filter((k) => k !== t.sign.key);
    const same = all.filter((k) => SIGNS[k].category === t.sign.def.category);
    const pick = (arr) => arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
    const options = [t.sign.key];
    if (same.length) {
      const k = pick(same);
      options.push(k);
      all.splice(all.indexOf(k), 1);
    }
    while (options.length < 3 && all.length) options.push(pick(all));
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
  const closeQuiz = () => {
    state.quiz = null;
  };

  function startTest() {
    const tasks = [];
    const add = (sign, type, p, s) => {
      if (!HANDLERS[type]) {
        console.warn(`unknown test type "${type}"`);
        return;
      }
      const t = { id: sign.id, sign, type, p, s, status: 'pending', ok: null, reason: null };
      HANDLERS[type].init(t);
      tasks.push(t);
    };
    for (const sg of world.signs) {
      const type = sg.test && sg.test.type;
      if (!type || type === 'endOvertake') continue;
      add(sg, type, sg.test, sg.s);
    }
    for (const st of world.signalTasks) add(SIGNAL_SIGN(st.id, st.s), 'signal', { side: st.side, lead: st.lead }, st.s);
    if (world.mission && world.mission.pickup) add(SIGNAL_PICKUP(), 'pickup', {}, world.mission.pickup.s);
    if (world.refuel) add(PSEUDO('refuel', 'refuel', world.refuel.s), 'refuel', { litres: world.refuel.litres }, world.refuel.s);
    for (const l of world.laneTasks) add(PSEUDO(l.id, 'laneChange', l.s), 'lane', { to: l.to, window: l.window, divider: l.divider }, l.s);
    for (const h of world.hazardStops) add(PSEUDO(h.id, 'hazardStop', h.s), 'hazardStop', { spot: h }, h.s);
    tasks.sort((a, b) => a.s - b.s);
    state.test = { tasks, score: 0, penalty: 0, log: [], max: tasks.length * T.pointsPerSign, finished: false, failedExam: false, summary: null, speedTask: null, startTime: state.time, lightsT: 0, lightsCool: 0, hazardT: 0, hazardCool: 0, stationFlag: false };
    curbCount = 0;
  }
  const SIGNAL_PICKUP = () => ({ id: 'pickup', key: 'pickup', def: SIGNS.pickup, s: world.mission.pickup.s, test: {}, zones: null });

  function summarize() {
    const test = state.test;
    const cats = {};
    for (const k of Object.keys(CATEGORIES)) cats[k] = { total: 0, correct: 0 };
    for (const t of test.tasks) {
      const cat = t.sign.def.category;
      cats[cat].total += 1;
      if (t.ok) cats[cat].correct += 1;
    }
    const tasks = test.tasks.map((t) => ({ id: t.id, key: t.sign.key, def: t.sign.def, ok: !!t.ok, missed: t.reason === 'missed', penalty: t.penalty || 0, message: t.message || null }));
    return {
      score: test.score,
      max: test.max,
      penalty: test.penalty,
      failAt: C.exam.failAt,
      passed: !test.failedExam && test.penalty < C.exam.failAt,
      eliminated: test.failedExam,
      reachedFinish: !!test.reachedFinish,
      correct: tasks.filter((x) => x.ok).length,
      total: tasks.length,
      cats,
      tasks,
      issues: test.log,
      seconds: state.time - test.startTime,
      levelId: level ? level.id : null,
      boss: !!(level && level.boss),
      passenger: state.passenger || state.delivered,
      carId: state.spec.id,
      fuelSpent: state.fuelSpent,
    };
  }

  /** End the test: running checks without a problem count as passed; unreached signs count as missed. */
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

  // Speed cameras (red pins): a photo as you drive past, over the limit costs points in Test mode
  const cameras = (world.pins || [])
    .filter((p) => p.type === 'camera' && p.s != null)
    .map((p) => {
      // the limit at the camera = the last speed sign before it (50 km/h in town otherwise)
      let lim = 50;
      let at = -1;
      for (const sg of world.signs)
        if (sg.test.type === 'speed' && sg.s <= p.s && sg.s > at) {
          at = sg.s;
          lim = sg.test.kmh;
        }
      return { s: p.s, lim };
    });
  function checkCameras() {
    const pr = state.prog;
    if (!pr.onRoute || pr.jumped) return;
    for (const cam of cameras) {
      if (!(pr.prevS < cam.s && pr.s >= cam.s)) continue;
      const kmh = Math.round(Math.abs(state.car.v) * 3.6);
      const lim = cam.lim;
      const ok = kmh <= lim + C.test.speedTolerance;
      emit('camera', { kmh, lim, ok });
      if (!ok) issue('camera', C.exam.penalty.camera, { ro: `Radar: ${kmh} km/h într-o zonă de ${lim} km/h.`, en: `Speed camera: ${kmh} km/h in a ${lim} km/h zone.` }, { title: { ro: 'Radar', en: 'Speed camera' } });
    }
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
    const test = state.test;

    // lights at night / in fog
    if ((state.weather === 'night' || state.weather === 'fog') && ctx.kmh > 5 && car.lights < 2) test.lightsT += dt;
    else test.lightsT = Math.max(0, test.lightsT - dt);
    test.lightsCool -= dt;
    if (test.lightsT > 5 && test.lightsCool <= 0) {
      test.lightsCool = 25;
      issue('lights', C.exam.penalty.lights, { ro: 'Pe întuneric sau ceață trebuie să folosești faza scurtă.', en: 'In the dark or in fog you must use low beams.' }, { title: { ro: 'Faruri', en: 'Headlights' } });
    }
    // hazard lights used while driving normally
    if (car.hazard && ctx.kmh > 20) test.hazardT += dt;
    else test.hazardT = 0;
    test.hazardCool -= dt;
    if (test.hazardT > 6 && test.hazardCool <= 0) {
      test.hazardCool = 20;
      issue('hazard', C.exam.penalty.hazard, { ro: 'Avariile se folosesc doar pentru pericol sau oprire forțată.', en: 'Hazard lights are for danger or a forced stop, not normal driving.' }, { title: { ro: 'Lumini de avarie', en: 'Hazard lights' } });
    }
    // speed inside a gas station
    const st = state.station;
    if (st && st.inZone) {
      if (ctx.kmh > 25 && !test.stationFlag) {
        test.stationFlag = true;
        issue('stationSpeed', C.exam.penalty.stationSpeed, { ro: 'În benzinărie conduci încet.', en: 'Drive slowly inside a fuel station.' }, { title: { ro: 'Benzinărie', en: 'Fuel station' } });
      }
    } else test.stationFlag = false;

    if (state.wrongWay || state.quiz) return;
    for (const t of test.tasks) {
      if (t.status === 'done') continue;
      HANDLERS[t.type].update(t, ctx);
      if (state.quiz) break;
    }
    if (!(world.mission && world.mission.dest) && pr.onRoute && pr.s >= world.route.length - 0.8 && pr.vAlong > 0.5) {
      test.reachedFinish = true;
      endTest();
    }
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
      if (ps !== Infinity && bs > ps - 6) best = prev;
    }
    state.activeSign = best;
  }

  function updateBlinkersAndStation(dt) {
    const car = state.car;
    if (car.signal && !car.hazard) {
      car.signalT += dt;
      const turned = wrap(car.heading - car.sigH);
      if (((car.signal === 'right' && turned > 1.0) || (car.signal === 'left' && turned < -1.0)) && Math.abs(car.steer) < 0.06) car.signal = null;
    }
    if (car.signal || car.hazard) {
      const ph = Math.floor(state.time / 0.33) % 2;
      if (ph !== state.blink) {
        state.blink = ph;
        emit('blink', ph);
      }
    } else state.blink = 0;

    // gas station
    let info = null;
    for (const st of world.stations) {
      const dz = Math.hypot(car.x - st.zone.x, car.y - st.zone.y);
      if (dz < st.zone.r) {
        const db = Math.hypot(car.x - st.bay.x, car.y - st.bay.y);
        const inBay = db < st.bay.r + 1.5 && Math.abs(car.v) < 0.8;
        info = { name: st.name, inZone: true, inBay, canRefuel: inBay && !car.engineOn, needEngineOff: inBay && car.engineOn };
      }
    }
    state.station = info;
    const rf = state.refueling;
    if (rf) {
      if (!(info && info.canRefuel) || car.fuel >= state.spec.tankL - 0.01) state.refueling = null;
      else {
        const add = Math.min(1.6 * dt, state.spec.tankL - car.fuel, rf.left);
        car.fuel += add;
        rf.left -= add;
        state.fuelSpent += add * C.fuel.pricePerLitre;
        state.fuelAdded += add;
        if (rf.left <= 0.001) state.refueling = null;
        car.lowWarned = car.fuel / state.spec.tankL < C.fuel.lowFraction;
      }
    }
    // passenger mood
    state.moodT = Math.max(0, state.moodT - dt);
    if (state.moodT <= 0) {
      state.mood = 'happy';
      state.moodWhy = null;
    }
    if (state.passenger && car.brakeP > 0.85 && car.v > 6) {
      state.mood = 'wince';
      state.moodWhy = 'brake';
      state.moodT = 1.2;
    }
    if (state.passenger && state.mode === 'test' && state.speedLimit && Math.abs(car.v) * 3.6 > state.speedLimit + C.test.speedTolerance + 4) {
      state.mood = 'wince';
      state.moodWhy = 'speed';
      state.moodT = 1;
    }
  }

  // ---- the passenger: waits at the pick-up spot, walks to the car, gets out at home ----
  function updatePassenger(dt) {
    const m = world.mission;
    const p = state.pax;
    if (!m || !p) return;
    const car = state.car;
    const kmh = Math.abs(car.v) * 3.6;
    const side = HW + 0.7;
    const door = { x: car.x - Math.sin(car.heading) * side, y: car.y + Math.cos(car.heading) * side };
    const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));
    if (p.phase === 'waiting') {
      p.x = m.pickup.x;
      p.y = m.pickup.y;
      const near = Math.hypot(car.x - m.pickup.x, car.y - m.pickup.y) < 11;
      if (near && kmh < 3) {
        p.hold += dt;
        if (p.hold > 0.5) {
          p.phase = 'walking';
          p.t = 0;
          emit('paxWalk');
        }
      } else p.hold = 0;
      if (state.prog.s > m.pickup.s + 16) {
        // drove past: she runs after you and jumps in (it counts as a mistake)
        p.missed = true;
        p.phase = 'in';
        state.passenger = true;
        emit('boarded', { missed: true });
      }
    } else if (p.phase === 'walking') {
      if (kmh < 3) p.t += dt / 1.8;
      p.x = lerp(m.pickup.x, door.x, p.t);
      p.y = lerp(m.pickup.y, door.y, p.t);
      if (p.t >= 1) {
        p.phase = 'in';
        state.passenger = true;
        state.mood = 'happy';
        emit('boarded', { missed: false });
      }
    } else if (p.phase === 'in' && m.dest) {
      const near = Math.hypot(car.x - m.destSpot.x, car.y - m.destSpot.y) < 12;
      if (near && kmh < 3) {
        p.hold2 += dt;
        if (p.hold2 > 0.6) {
          p.phase = 'leaving';
          p.t = 0;
          p.fromX = door.x;
          p.fromY = door.y;
          state.passenger = false;
          state.delivered = true;
          emit('paxLeave');
        }
      } else p.hold2 = 0;
    } else if (p.phase === 'leaving') {
      p.t += dt / 2;
      p.x = lerp(p.fromX, m.house.x, p.t);
      p.y = lerp(p.fromY, m.house.y, p.t);
      if (p.t >= 1) {
        p.phase = 'home';
        emit('home');
        if (state.mode === 'test' && state.test && !state.test.finished) {
          state.test.reachedFinish = true;
          endTest();
        }
      }
    }
  }

  function update(dt, input) {
    state.time += dt;
    stepCar(state.car, input, dt);
    collideRoad(state.car, dt);
    stepTraffic(dt);
    updateProgress(dt);
    updateActiveSign();
    updateBlinkersAndStation(dt);
    updatePassenger(dt);
    checkCameras();
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
    state.npcs = [];
    state.peds = world.peds.map((p) => ({ ...p, side: p.startSide, phase: 'idle', timer: 0, t: 0, used: false, hit: false, px: p.x, py: p.y }));
    for (const def of world.npcDefs) {
      if (def.loop) {
        for (let i = 0; i < def.count; i++) state.npcs.push({ def, s: (def.path.length * (i + 0.5)) / def.count, v: def.kmh / 3.6, x: 0, y: 0, heading: 0, color: def.color, width: 1.8, length: 4.3 });
        continue;
      }
      def.timer = def.every;
      const gap = (def.kmh / 3.6) * def.every;
      for (let s0 = gap * 0.4; s0 < def.path.length - 20; s0 += gap) state.npcs.push({ def, s: s0, v: def.kmh / 3.6, x: 0, y: 0, heading: 0, color: def.color, width: 1.8, length: 4.3 });
    }
    state.obstacles = world.obstacles.map((o) => ({ x: o.x, y: o.y, heading: Math.atan2(o.dy, o.dx), v: 0, length: 4.4, width: 1.8, color: '#b8bcc2', hazard: true }));
    spawned.clear();
    state.quiz = null;
    state.speedLimit = null;
    state.wrongWay = false;
    state.shake = 0;
    state.activeSign = null;
    state.passenger = false;
    state.delivered = false;
    state.pax = world.mission ? { phase: 'waiting', t: 0, hold: 0, hold2: 0, x: 0, y: 0, missed: false } : null;
    state.refueling = null;
    state.fuelSpent = 0;
    state.fuelAdded = 0;
    curbCount = 0;
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
    const old = state.car;
    const loc = world.route.locate(old.x, old.y, null);
    const s = Math.max(0, loc.s - 4);
    const pt = world.route.at(s, {});
    const lane = world.startLane ?? C.world.laneOffset;
    const car = makeCar({ x: pt.x - pt.dy * lane, y: pt.y + pt.dx * lane, heading: Math.atan2(pt.dy, pt.dx) });
    for (const k of ['fuel', 'signal', 'hazard', 'lights', 'engineOn', 'lowWarned']) car[k] = old[k];
    car.signalT = old.signalT;
    state.car = car;
    state.prog.ready = false;
    state.prog.wrongTime = 0;
    updateProgress(0);
    state.prog.jumped = false;
    state.prog.prevS = state.prog.s;
  }

  // --- controls that are not steering / pedals ------------------------------------
  function toggleSignal(side) {
    const car = state.car;
    car.signal = car.signal === side ? null : side;
    car.signalT = 0;
    car.sigH = car.heading;
  }
  const toggleHazard = () => {
    state.car.hazard = !state.car.hazard;
  };
  const cycleLights = () => {
    state.car.lights = (state.car.lights + 1) % 4;
  };
  function toggleEngine() {
    const car = state.car;
    if (car.engineOn) {
      car.engineOn = false;
      car.starting = 0;
    } else if (car.fuel > 0 && car.starting <= 0) car.starting = 0.9;
    else if (car.fuel <= 0) emit('stall');
  }
  function startRefuel(litres) {
    const st = state.station;
    if (!st || !st.canRefuel) return false;
    state.refueling = { left: litres === 'full' ? state.spec.tankL : litres };
    return true;
  }
  const stopRefuel = () => {
    state.refueling = null;
  };
  function setCar(carId) {
    const old = state.car;
    const frac = old ? old.fuel / state.spec.tankL : C.fuel.startFraction;
    applySpec(CARS[carId]);
    if (old) {
      old.fuel = frac * state.spec.tankL;
      old.steer = 0;
      old.rpm = state.spec.idle;
    }
  }
  const setWeather = (w) => {
    state.weather = w;
  };

  /** What the sign you are approaching asks of you, how far away it is, and (Test) whether you are meeting it. */
  function indication() {
    const sg = state.activeSign;
    if (!sg) return null;
    const pr = state.prog;
    const car = state.car;
    const dist = pr.onRoute && pr.s <= sg.s + 2 ? Math.max(0, sg.s - pr.s) : Math.hypot(sg.x - car.x, sg.y - car.y);
    let status = 'info';
    if (state.mode === 'test' && state.test) {
      const t = state.test.tasks.find((x) => x.sign === sg);
      if (t) {
        status = 'watch';
        if (t.status === 'done') status = t.ok ? 'ok' : 'violated';
        else if (t.type === 'speed' && t.status === 'active') status = Math.abs(car.v) * 3.6 > t.limit + T.speedTolerance ? 'violated' : 'ok';
        else if (t.type === 'noStop' && t.status === 'active') status = Math.abs(car.v) * 3.6 < T.noStopKmh ? 'violated' : 'ok';
        else if (t.type === 'noOvertake' && t.status === 'active') status = 'ok';
      }
    }
    return { sign: sg, dist, status };
  }

  setMode('learn');

  return { indication, state, world, level, on, update, setMode, restart: () => setMode(state.mode), resetCar, endTest, answerQuiz, closeQuiz, toggleSignal, toggleHazard, cycleLights, toggleEngine, startRefuel, stopRefuel, setCar, setWeather };
}
