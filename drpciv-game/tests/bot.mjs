// A simulated driver, shared by the automatic tests and the browser checks.
//   const bot = makeBot(game, world, map, 'careful' | 'reckless' | 'overtaker');
//   bot.step();  // drives one physics step
import { CONFIG as C } from '../src/config.js';

export function makeBot(game, world, map, kind = 'careful') {
  const st = game.state;
  const input = { steer: 0, gas: 0, brake: 0 };
  const tmp = {};
  const arcs = map.route.segments.filter((sg) => sg.type === 'arc').map((sg) => ({ range: world.route.segRanges[sg.id], v: Math.sqrt(3.2 * sg.radius) }));
  const slowZones = map.route.segments.filter((sg) => sg.roundabout).map((sg) => [world.route.segRanges[sg.id][0] - 14, world.route.segRanges[sg.id][1] + 22, 16 / 3.6]);
  let laneTarget = world.startLane ?? C.world.laneOffset;
  let refuelStage = 0;
  let hold = 0;

  const yieldTo = (n) => !(n.def.flow || n.def.exit || (n.def.feeder && !n.cleared));
  // a car waiting in a side street of this junction will pull out any moment: let it go first
  const feederReady = (cf) => !!cf && st.npcs.some((n) => n.def.feeder && n.def.leg.minor && !n.cleared && n.s > n.def.leg.stopAt - 3 && Math.hypot(n.def.leg.K[0] - cf.x, n.def.leg.K[1] - cf.y) < 22);
  function stopAt(dist) {
    return dist <= 0.2 ? 0 : Math.sqrt(4.5 * dist);
  }

  return {
    input,
    step() {
      const car = st.car;
      const s = st.prog.s;
      const v = car.v;
      let lane = laneTarget;
      let target = (kind === 'reckless' ? 75 : 40) / 3.6;

      if (kind !== 'reckless') {
        for (const a of arcs) if (s > a.range[0] - 12 && s < a.range[1] + 4) target = Math.min(target, a.v);
        for (const [a, b, vv] of slowZones) if (s > a && s < b) target = Math.min(target, vv);
        for (const z of world.stations) if (Math.hypot(car.x - z.zone.x, car.y - z.zone.y) < z.zone.r + 30) target = Math.min(target, 18 / 3.6);
        if (st.speedLimit) target = Math.min(target, (st.speedLimit - 4) / 3.6);
        if ((st.weather === 'night' || st.weather === 'fog') && car.lights < 2) game.cycleLights();
        for (const o of world.obstacles) {
          const d = o.s - s;
          if (d < 40 && d > -9) lane = -2.2;
          if (d < -12 && d > -30 && car.signal === 'left') game.toggleSignal('left');
        }
        if (st.test) {
          for (const task of st.test.tasks) {
            if (task.status === 'done') {
              if (task.type === 'lane' && car.signal === task.p.to && s > task.s && s < task.end + 25) game.toggleSignal(task.p.to);
              if (task.type === 'hazardStop' && car.hazard) game.toggleHazard();
              continue;
            }
            if (task.type === 'signal' && s > task.line - 45 && car.signal !== task.side) game.toggleSignal(task.side);
            if (task.type === 'lane' && s > task.s - 40) {
              if (car.signal !== task.p.to) game.toggleSignal(task.p.to);
              if (s > task.s - 12 && car.signalT > 1) laneTarget = task.p.to === 'left' ? 1.9 : 5.6;
              lane = laneTarget;
            }
            if (task.type === 'slow') {
              const dist = task.line - s;
              if (dist > -2 && dist < 45) {
                target = Math.min(target, Math.sqrt((task.max - 5) ** 2 / 12.96 + 6 * Math.max(0, dist - 1)));
                let wait = false;
                if (task.ped && ['wait', 'cross'].includes(task.ped.phase)) wait = true;
                if (task.conflict && st.npcs.some((n) => n.def.mapNpc && Math.hypot(n.x - task.conflict.x, n.y - task.conflict.y) < task.conflict.r + Math.max(12, task.conflict.r))) wait = true;
                if (game.conflictBusy && game.conflictBusy(task.cf, 10, 4.5)) wait = true;
                if (wait && dist > -1) target = Math.min(target, stopAt(dist - 1.5));
              }
            }
            if (task.type === 'stop') {
              const dist = task.line - s - 2.0;
              if (dist > -3 && dist < 60 && !(task.minV <= C.test.stopMaxKmh)) target = Math.min(target, stopAt(dist));
              const cf = task.p.conflict;
              if (dist > -1 && dist < 6 && ((cf && st.npcs.some((n) => n.def.mapNpc && Math.hypot(n.x - cf.x, n.y - cf.y) < cf.r + Math.max(12, cf.r))) || (game.conflictBusy && game.conflictBusy(task.cf, 10, 4.5)))) target = 0;
            }
            if (task.type === 'pickup' && task.s - s < 30) target = Math.min(target, stopAt(task.s - s - 1));
          }
          if (world.mission && world.mission.destSpot && st.pax && st.pax.phase !== 'waiting' && world.mission.destSpot.s - s < 40) target = Math.min(target, stopAt(world.mission.destSpot.s - s));
          for (const task of st.test.tasks) {
            if (task.status === 'done') continue;
            if (task.type === 'hazardStop' && task.s - s < 30) {
              if (!car.hazard && task.s - s < 25) game.toggleHazard();
              target = Math.min(target, stopAt(task.s - s - 1));
            }
            if (task.type === 'refuel' && task.s - s < 30) {
              const dist = task.s - s;
              if (refuelStage === 0) target = Math.min(target, stopAt(dist - 0.5));
              if (refuelStage === 0 && Math.abs(v) < 0.3 && st.station && st.station.inBay) {
                if (car.engineOn) game.toggleEngine();
                refuelStage = 1;
              }
              if (refuelStage === 1) {
                target = 0;
                if (!st.refueling && st.fuelAdded < task.p.litres) game.startRefuel(task.p.litres);
              }
            }
            if (task.type === 'noOvertake' && task.status !== 'pending' && kind !== 'overtaker') for (const ai of st.traffic) if (ai.s > s && ai.s - s < 30) target = Math.min(target, Math.max(0, ai.v - (22 - (ai.s - s)) * 0.1));
          }
          // after refuelling: engine back on, then go
          if (refuelStage === 1 && st.test.tasks.some((x) => x.type === 'refuel' && x.status === 'done')) {
            target = 0;
            if (!car.engineOn && car.starting <= 0) game.toggleEngine();
            if (car.engineOn) refuelStage = 2;
          }
        }
        if (kind !== 'overtaker') for (const ai of st.traffic) if (ai.s > s && ai.s - s < 26) target = Math.min(target, Math.max(0, ai.v * 0.92 - (14 - (ai.s - s)) * 0.12));
      } else if (kind === 'reckless') {
        for (const o of world.obstacles) if (o.s - s < 40 && o.s - s > -9) lane = -2.2;
      }
      if (kind === 'overtaker') for (const ai of st.traffic) if (ai.s > s - 10 && ai.s - s < 22) lane = -2.2;

      // keep a safe gap to any car in front (queues, side-street cars joining your lane)
      if (kind !== 'reckless') {
        const fx = Math.cos(car.heading);
        const fy = Math.sin(car.heading);
        for (const n of st.npcs) {
          if (!n.init) continue;
          const rx = n.x - car.x;
          const ry = n.y - car.y;
          const ahead = rx * fx + ry * fy;
          const side = Math.abs(-rx * fy + ry * fx);
          if (ahead <= 0 || ahead > 30 || side > 2.3 - (lane < 0 ? 0 : 0)) continue;
          if (Math.cos(n.heading - car.heading) < -0.2) continue;
          target = Math.min(target, Math.max(0, (ahead - 7.5) * 0.6 + Math.max(0, n.v) * 0.7));
        }
      }

      // steering: pure pursuit to a point ahead on the route, in the chosen lane
      // look closer in tight corners so the car stays in its lane instead of cutting across
      const tight = arcs.some((a) => s > a.range[0] - 4 && s < a.range[1] + 2 && a.v < 8);
      const look = tight ? 3.5 + Math.abs(v) * 0.35 : 7 + Math.abs(v) * 0.5;
      const p = world.route.at(Math.min(world.route.length, s + look), tmp);
      const tx = p.x - p.dy * lane;
      const ty = p.y + p.dx * lane;
      let err = Math.atan2(ty - car.y, tx - car.x) - car.heading;
      while (err > Math.PI) err -= 2 * Math.PI;
      while (err < -Math.PI) err += 2 * Math.PI;
      input.steer = Math.max(-1, Math.min(1, err * 2.2));
      if (kind === 'reckless' && Math.abs(err) > 0.4) target = Math.min(target, 25 / 3.6);

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
      hold = target === 0 ? hold + 1 : 0;
      game.update(C.fixedStep, input);
    },
  };
}
