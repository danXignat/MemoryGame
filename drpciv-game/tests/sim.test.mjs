// Automatic test: drives simulated cars around every playable level (no screen needed).
//   npm test
// A careful "bot" must pass each level; a reckless bot must fail. Also checks the 5 cars differ.

import { LEVELS, getMap } from '../src/levels.js';
import { buildWorld } from '../src/mapbuild.js';
import { createGame } from '../src/game.js';
import { CONFIG as C } from '../src/config.js';
import { CARS, CAR_ORDER } from '../src/cars.js';
import { makeBot } from './bot.mjs';

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${msg}`);
  if (!cond) failures++;
};

const worlds = {};
for (const l of LEVELS.filter((x) => x.playable)) {
  const w = buildWorld(getMap(l));
  worlds[l.id] = w;
  check(w.warnings.length === 0, `${l.id} map builds without warnings ${w.warnings.join(' | ')}`);
}

// ---------------------------------------------------------------- the bot
function runBot(levelId, kind, { carId = 'golf5', maxSeconds = 700, weather } = {}) {
  const level = LEVELS.find((l) => l.id === levelId);
  const world = worlds[levelId];
  const map = getMap(level);
  const game = createGame(world, { level, carId, weather });
  const st = game.state;
  game.setMode('test');
  const log = { feedback: [], bumps: 0, quiz: 0, bumpAt: [] };
  game.on('bump', (vn) => {
    log.bumps++;
    log.bumpAt.push(`s=${st.prog.s.toFixed(0)} vn=${vn.toFixed(1)}`);
  });
  game.on('feedback', (f) => log.feedback.push(f));
  game.on('quiz', () => {
    log.quiz++;
    if (kind !== 'reckless') game.answerQuiz(st.quiz.signKey);
    else game.answerQuiz(st.quiz.options.find((o) => o !== st.quiz.signKey));
    game.closeQuiz();
  });

  const bot = makeBot(game, world, map, kind);
  let t = 0;
  while (t < maxSeconds && !st.test.finished && !st.test.failedExam) {
    bot.step();
    t += C.fixedStep;
  }
  // the game ends a failed exam on the next tick; this loop never yields, so end it here
  if (st.test.failedExam && !st.test.finished) game.endTest();
  return { game, st, t, log, summary: st.test.summary };
}

// -------------------------------------------------------- every level, careful
for (const id of LEVELS.filter((l) => l.playable).map((l) => l.id)) {
  const r = runBot(id, 'careful');
  const sum = r.summary;
  console.log(`\n${id}: finished=${r.st.test.finished} time=${r.t.toFixed(0)}s correct=${sum && sum.correct}/${sum && sum.total} penalty=${sum && sum.penalty} bumps=${r.log.bumps}`);
  if (sum) for (const x of sum.tasks.filter((x) => !x.ok)) console.log(`     ✗ ${x.key}${x.missed ? ' (missed)' : ''}: ${x.message ? x.message.en : ''}`);
  check(r.st.test.finished && sum && sum.reachedFinish, `${id}: careful driver reaches the finish`);
  check(sum && sum.correct === sum.total, `${id}: careful driver gets every check right`);
  check(sum && sum.passed, `${id}: careful driver passes (penalty ${sum && sum.penalty} < ${C.exam.failAt})`);
  if (id === 'boss') check(sum && sum.passenger, 'boss: the passenger was picked up');
}

// ------------------------------------------------------------ reckless runs
for (const id of ['free', 'L3', 'L4', 'L5', 'L6', 'L8', 'L9', 'L10', 'L13', 'L14', 'L15']) {
  const r = runBot(id, 'reckless');
  const sum = r.summary;
  console.log(`\n${id} reckless: penalty=${sum.penalty} eliminated=${sum.eliminated} correct=${sum.correct}/${sum.total}`);
  check(!sum.passed, `${id}: reckless driver FAILS the exam`);
}

// ------------------------------------------------- pedestrians & give way
{
  const r = runBot('L5', 'reckless');
  check(r.summary.issues.some((i) => i.key === 'pedHit') || r.summary.tasks.some((t) => !t.ok && t.message && /pedestrian/i.test(t.message.en)), 'L5: not stopping for a pedestrian is caught');
  const r4 = runBot('L4', 'reckless');
  check(r4.summary.tasks.some((t) => t.key === 'giveWay' && !t.ok), 'L4: driving out in front of traffic fails Give Way');
}

// ------------------------------------------------------------ lane change without signal
{
  const r = runBot('L11', 'reckless');
  check(r.summary.tasks.filter((t) => t.key === 'laneChange').every((t) => !t.ok), 'L11: lane changes without signalling are not accepted');
}

// ------------------------------------------------------------ night lights
{
  const r = runBot('L1', 'reckless', { weather: 'night', maxSeconds: 200 });
  check(r.summary.issues.some((i) => i.key === 'lights'), 'night: driving without low beams is penalised');
}

// ------------------------------------------------------------ the 5 cars
console.log('\nCar comparison (0-50 km/h, 50-0 braking distance, fuel per 100 s of hard driving):');
const stats = {};
for (const id of CAR_ORDER) {
  const world = worlds.free;
  const game = createGame(world, { carId: id, level: LEVELS[0] });
  const st = game.state;
  const dt = C.fixedStep;
  // straight flat test: put the car on the long top road
  const c = st.car;
  c.x = 60; c.y = 2; c.heading = 0; c.v = 0;
  let t0 = 0;
  let t50 = null;
  const f0 = c.fuel;
  for (let i = 0; i < 120 * 12 && t50 === null; i++) {
    game.update(dt, { steer: 0, gas: 1, brake: 0 });
    t0 += dt;
    if (c.v * 3.6 >= 50) t50 = t0;
  }
  // brake from 50
  c.v = 50 / 3.6;
  c.gas = 0;
  c.brakeP = 0;
  const x0 = c.x;
  for (let i = 0; i < 120 * 6 && c.v > 0.05; i++) game.update(dt, { steer: 0, gas: 0, brake: 1 });
  const dist = c.x - x0;
  // fuel: 20 s of full throttle from rest, on the long road
  c.x = 40; c.v = 0; c.fuel = CARS[id].tankL * 0.6;
  const fa = c.fuel;
  for (let i = 0; i < 120 * 20; i++) {
    game.update(dt, { steer: 0, gas: 1, brake: 0 });
    if (c.x > 395) c.x = 40;
  }
  stats[id] = { t50, dist, fuel: fa - c.fuel };
  console.log(`  ${CARS[id].name.padEnd(22)} 0-50: ${t50 ? t50.toFixed(1) : '>12'} s   50-0: ${dist.toFixed(1)} m   fuel (20 s flat out): ${(fa - c.fuel).toFixed(2)} L`);
}
check(stats.octavia.t50 < stats.golf5.t50 && stats.octavia.t50 < stats.x5.t50 + 0.01, 'Octavia vRS accelerates faster than the Golf');
check(stats.x5.dist > stats.golf5.dist + 1.5 && stats.x5.dist > stats.civic.dist + 1.5, 'X5 needs a clearly longer braking distance');
check(stats.x5.fuel > stats.passat.fuel * 1.3, 'X5 burns clearly more fuel than the Passat when pushed');
check(stats.octavia.fuel > stats.golf5.fuel, 'Octavia vRS burns more fuel than the Golf when pushed');
check(new Set(CAR_ORDER.map((id) => stats[id].t50.toFixed(1))).size >= 4, 'the cars have clearly different acceleration');

// ------------------------------------------------------- level 1 with every car
for (const id of CAR_ORDER) {
  const r = runBot('L1', 'careful', { carId: id });
  check(r.summary && r.summary.passed && r.summary.reachedFinish, `L1 can be driven with ${CARS[id].name} (penalty ${r.summary && r.summary.penalty}, bumps ${r.log.bumps})`);
}

// ------------------------------------------------------- fuel stops the car
{
  const world = worlds.free;
  const game = createGame(world, { carId: 'passat', level: LEVELS[0], fuel: 0.0005 });
  let stalled = false;
  game.on('stall', () => (stalled = true));
  for (let i = 0; i < 120 * 20; i++) game.update(C.fixedStep, { steer: 0, gas: 1, brake: 0 });
  check(stalled && !game.state.car.engineOn, 'running out of fuel stalls the engine');
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
