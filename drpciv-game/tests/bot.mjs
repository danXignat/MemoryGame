// A simulated driver, shared by the automatic tests and the browser checks.
//   const bot = makeBot(game, world, map, 'careful' | 'reckless' | 'overtaker');
//   bot.step();  // drives one physics step
import { CONFIG as C } from '../src/config.js';

export function makeBot(game, world, map, kind = 'careful') {
  const st = game.state;
  const input = { steer: 0, gas: 0, brake: 0 };
  const tmp = {};
  const arcs = map.route.segments
    .filter((sg) => sg.type === 'arc')
    .map((sg) => ({ range: world.route.segRanges[sg.id], v: Math.sqrt(3.2 * sg.radius) }));
  const extraSlow = [];
  if (world.rings.length) {
    const ring = world.route.segRanges.ring;
    extraSlow.push([ring[0] - 12, ring[1] + 22, 18 / 3.6]);
  }
  return {
    input,
    step() {
      const car = st.car;
      const s = st.prog.s;
      const v = car.v;
      const look = 7 + Math.abs(v) * 0.5;
      const p = world.route.at(Math.min(world.route.length, s + look), tmp);
      let lane = C.world.laneOffset;
      if (kind === 'overtaker') for (const ai of st.traffic) if (ai.s > s - 10 && ai.s - s < 22) lane = -2.2;
      const tx = p.x - p.dy * lane;
      const ty = p.y + p.dx * lane;
      let err = Math.atan2(ty - car.y, tx - car.x) - car.heading;
      while (err > Math.PI) err -= 2 * Math.PI;
      while (err < -Math.PI) err += 2 * Math.PI;
      input.steer = Math.max(-1, Math.min(1, err * 2.2));

      let target = (kind === 'reckless' ? 75 : 40) / 3.6;
      if (kind !== 'reckless') {
        for (const a of arcs) if (s > a.range[0] - 12 && s < a.range[1] + 4) target = Math.min(target, a.v);
        for (const [a, b, vv] of extraSlow) if (s > a && s < b) target = Math.min(target, vv);
        if (st.speedLimit) target = Math.min(target, (st.speedLimit - 4) / 3.6);
        if (st.weather === 'night' && car.lights < 2) game.cycleLights();
        if (st.test) {
          for (const task of st.test.tasks) {
            if (task.status === 'done') continue;
            if (task.type === 'signal' && s > task.line - 45 && car.signal !== task.side) game.toggleSignal(task.side);
            if (task.type === 'slow') {
              const dist = task.line - s;
              if (dist > -2 && dist < 45) {
                target = Math.min(target, Math.sqrt((task.max - 5) ** 2 / 12.96 + 6 * Math.max(0, dist - 1)));
                let hold = false;
                if (task.ped && ['wait', 'cross'].includes(task.ped.phase)) hold = true;
                if (task.conflict && st.npcs.some((n) => Math.hypot(n.x - task.conflict.x, n.y - task.conflict.y) < task.conflict.r + 28)) hold = true;
                if (hold && dist > -1) target = dist - 1.5 <= 0.2 ? 0 : Math.min(target, Math.sqrt(5 * (dist - 1.5)));
              }
            }
            if (task.type === 'stop') {
              const dist = task.line - s - 2.0;
              if (dist > -3 && dist < 60 && !(task.minV <= C.test.stopMaxKmh)) target = dist <= 0.2 ? 0 : Math.min(target, Math.sqrt(5 * dist));
            }
            if (task.type === 'pickup') {
              const dist = task.s - s - 1;
              if (dist < 30) target = dist <= 0.2 ? 0 : Math.min(target, Math.sqrt(4 * dist));
            }
            if (task.type === 'noOvertake' && task.status !== 'pending' && kind !== 'overtaker') for (const ai of st.traffic) if (ai.s > s && ai.s - s < 30) target = Math.min(target, Math.max(0, ai.v - (22 - (ai.s - s)) * 0.1));
          }
        }
        if (kind !== 'overtaker') for (const ai of st.traffic) if (ai.s > s && ai.s - s < 26 && s > world.route.length * 0.3) target = Math.min(target, Math.max(0, ai.v * 0.92 - (14 - (ai.s - s)) * 0.12));
      } else if (Math.abs(err) > 0.4) target = 25 / 3.6;

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
      game.update(C.fixedStep, input);
    },
  };
}
