// Automatic test: drives a simulated car around the whole track (no screen needed).
//   npm test
// A careful "bot" must score 100%; a reckless bot must fail the speed/stop/overtake rules.

import { MAP } from '../src/map.js';
import { buildWorld } from '../src/mapbuild.js';
import { createGame } from '../src/game.js';
import { CONFIG as C } from '../src/config.js';

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${msg}`);
  if (!cond) failures++;
};

const world = buildWorld(MAP);
console.log(`Route length: ${world.route.length.toFixed(1)} m, ${world.signs.length} signs, ${world.trees.length} trees, ${world.houses.length} houses`);
check(world.warnings.length === 0, `map has no warnings ${world.warnings.join(' | ')}`);

// ---------------------------------------------------------------- the bot
function runBot(kind, { maxSeconds = 600 } = {}) {
  const game = createGame(world);
  const st = game.state;
  game.setMode('test');
  let bumps = 0;
  const events = { feedback: [], quiz: 0 };
  const bumpAt = [];
  game.on('bump', (vn) => {
    bumps++;
    bumpAt.push(`s=${st.prog.s.toFixed(0)} (${st.car.x.toFixed(0)},${st.car.y.toFixed(0)}) v=${(st.car.v * 3.6).toFixed(0)}km/h vn=${vn.toFixed(1)}`);
  });
  game.on('feedback', (f) => events.feedback.push(f));
  game.on('quiz', () => {
    events.quiz++;
    if (kind !== 'reckless') game.answerQuiz(st.quiz.signKey);
    else game.answerQuiz(st.quiz.options.find((o) => o !== st.quiz.signKey));
    game.closeQuiz();
  });

  const input = { steer: 0, gas: 0, brake: 0 };
  const dt = C.fixedStep;
  const stopHold = {};
  let t = 0;
  const tmp = {};
  while (t < maxSeconds && !st.test.finished) {
    const car = st.car;
    const pr = st.prog;
    const s = pr.s;
    const v = car.v;

    // steering: pure pursuit to a point ahead on the route (right lane)
    const look = 7 + Math.abs(v) * 0.5;
    const p = world.route.at(Math.min(world.route.length, s + look), tmp);
    let lane = C.world.laneOffset;
    if (kind === 'overtaker') {
      for (const ai of st.traffic) if (ai.s > s - 10 && ai.s - s < 22) lane = -2.2; // pull out to the left lane
    }
    const tx = p.x - p.dy * lane;
    const ty = p.y + p.dx * lane;
    const desired = Math.atan2(ty - car.y, tx - car.x);
    let err = desired - car.heading;
    while (err > Math.PI) err -= 2 * Math.PI;
    while (err < -Math.PI) err += 2 * Math.PI;
    input.steer = Math.max(-1, Math.min(1, err * 2.2));

    // speed target
    let target = kind !== 'reckless' ? 40 / 3.6 : 75 / 3.6;
    if (kind !== 'reckless') {
      // slow down for tight turns (T1 junction, roundabout)
      const ring = world.route.segRanges.ring;
      if (s > ring[0] - 12 && s < ring[1] + 22) target = Math.min(target, 18 / 3.6);
      const fil = world.route.segRanges.fillet;
      if (s > fil[0] - 14 && s < fil[1] + 8) target = Math.min(target, 16 / 3.6);
      if (st.speedLimit) target = Math.min(target, (st.speedLimit - 4) / 3.6);
      for (const task of st.test.tasks) {
        if (task.status === 'done') continue;
        if (task.type === 'slow') {
          const dist = task.line - s;
          if (dist > -2 && dist < 45) target = Math.min(target, Math.sqrt((task.max - 5) ** 2 / 12.96 + 2 * 3 * Math.max(0, dist - 1)));
        }
        if (task.type === 'stop') {
          const dist = task.line - s - 2.0;
          if (dist > -3 && dist < 60) {
            if (task.minV <= C.test.stopMaxKmh) continue; // already stopped: go
            if (dist <= 0.2) {
              target = 0;
            } else target = Math.min(target, Math.sqrt(2 * 2.5 * dist));
          }
        }
        if (task.type === 'noOvertake' && task.status !== 'pending') {
          // stay behind the slow car
          if (kind !== 'overtaker') for (const ai of st.traffic) if (ai.s > s && ai.s - s < 30) target = Math.min(target, Math.max(0, ai.v - (22 - (ai.s - s)) * 0.1));
        }
      }
      // keep behind the slow car also before the zone starts
      if (kind !== 'overtaker') for (const ai of st.traffic) if (ai.s > s && ai.s - s < 26 && s > world.route.length * 0.3) target = Math.min(target, Math.max(0, ai.v * 0.92 - (14 - (ai.s - s)) * 0.12));
    } else {
      // reckless: only slows for curves a little
      target = 75 / 3.6;
      if (pr.s > 0 && Math.abs(err) > 0.4) target = 25 / 3.6;
    }
    if (v < target - 0.1) {
      input.gas = 1;
      input.brake = 0;
    } else if (v > target + 0.4) {
      input.gas = 0;
      input.brake = 1;
    } else {
      input.gas = Math.abs(v - target) < 0.2 && v > 4 ? (Math.random() < 0.5 ? 1 : 0) : 0;
      input.brake = 0;
    }
    if (target === 0 && v < 0.3) {
      input.gas = 0;
      input.brake = 0;
    }

    game.update(dt, input);
    t += dt;
  }
  return { game, st, t, bumps, events, bumpAt };
}

// ---------------------------------------------------------------- careful run
{
  const r = runBot('careful');
  const sum = r.st.test.summary;
  console.log(`\nCareful driver: finished=${r.st.test.finished} time=${r.t.toFixed(0)}s score=${sum && sum.score}/${sum && sum.max} bumps=${r.bumps}`);
  if (sum) {
    for (const t of sum.tasks) console.log(`     ${t.ok ? '✓' : '✗'} ${t.key}${t.missed ? ' (missed)' : ''}`);
    for (const [k, v] of Object.entries(sum.cats)) console.log(`     ${k}: ${v.correct}/${v.total}`);
  }
  r.bumpAt.forEach((b) => console.log('     bump at ' + b));
  check(r.st.test.finished, 'careful bot reaches the finish line');
  check(sum && sum.correct === sum.total, 'careful bot gets every sign right');
  check(r.bumps <= 2, `careful bot barely touches the curb (bumps=${r.bumps})`);
  check(r.events.quiz === 3, `3 quiz questions appeared (got ${r.events.quiz})`);
}

// ---------------------------------------------------------------- reckless run
{
  const r = runBot('reckless');
  const sum = r.st.test.summary;
  console.log(`\nReckless driver: finished=${r.st.test.finished} time=${r.t.toFixed(0)}s score=${sum && sum.score}/${sum && sum.max} bumps=${r.bumps}`);
  if (sum) for (const t of sum.tasks) console.log(`     ${t.ok ? '✓' : '✗'} ${t.key}${t.missed ? ' (missed)' : ''}`);
  const bad = (key) => sum && sum.tasks.filter((x) => x.key === key).every((x) => !x.ok);
  check(!!sum, 'reckless bot also gets a result');
  check(bad('stop'), 'reckless: STOP failed');
  check(bad('giveWay'), 'reckless: Give Way failed');
  check(bad('speed30'), 'reckless: speed 30 failed');
  check(bad('children'), 'reckless: children slow-down failed');
  check(sum && sum.score < sum.max * 0.5, 'reckless bot scores below 50%');
}

// ---------------------------------------------------------------- overtaker run
{
  const r = runBot('overtaker');
  const sum = r.st.test.summary;
  console.log(`\nOvertaking driver: finished=${r.st.test.finished} score=${sum && sum.score}/${sum && sum.max}`);
  if (sum) for (const t of sum.tasks.filter((x) => !x.ok)) console.log(`     ✗ ${t.key}${t.missed ? ' (missed)' : ''}`);
  check(sum && sum.tasks.find((x) => x.key === 'noOvertaking').ok === false, 'passing the slow car in the no-overtaking zone is detected');
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
