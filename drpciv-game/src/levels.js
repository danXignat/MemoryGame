// ============================================================================
//  levels.js  —  THE 15 DRIVING SCHOOL LEVELS + FREE ROAM + FINAL BOSS
//
//  Levels 1-5, Free Roam and the Final Boss are playable now.
//  Levels 6-15 are filled in with their topic, district, weather and goals
//  (`playable: false`); to build one, give it a `build()` like the ones below.
//
//  Roads are described like turtle graphics (see track()):
//     ['line', id, metres]
//     ['turn', id, 'right'|'left', degrees, radius]
//     ['junction', id, 'right'|'left', radius, armLength]   a turn with a cross street
//     ['arm', 'left'|'right'|'ahead'|'back', metres]        an extra side street
//  Signs are placed with  at: [piece id, metres from the start of that piece].
//  The city is STYLISED: district names are labels, not real street maps.
// ============================================================================

import { MAP as TRAINING } from './map.js';

const RAD = Math.PI / 180;

function track(start, headingDeg, steps) {
  let x = start[0];
  let y = start[1];
  let h = headingDeg * RAD;
  const segments = [];
  const extraRoads = [];
  const geo = {};
  let n = 0;
  const arm = (dir, len) => {
    const ang = dir === 'ahead' ? h : dir === 'back' ? h + Math.PI : dir === 'right' ? h + Math.PI / 2 : h - Math.PI / 2;
    extraRoads.push({ id: `arm${n++}`, points: [[x, y], [x + Math.cos(ang) * len, y + Math.sin(ang) * len]], lane: true });
  };
  const turn = (id, dir, deg, r) => {
    const sgn = dir === 'right' ? 1 : -1;
    const cx = x + sgn * r * -Math.sin(h);
    const cy = y + sgn * r * Math.cos(h);
    const a0 = Math.atan2(y - cy, x - cx);
    const a1 = a0 + sgn * deg * RAD;
    const ex = cx + r * Math.cos(a1);
    const ey = cy + r * Math.sin(a1);
    segments.push({ id, type: 'arc', center: [cx, cy], radius: r, from: a0 / RAD, to: a1 / RAD });
    geo[id] = { x0: x, y0: y, h0: h, x1: ex, y1: ey, h1: h + sgn * deg * RAD };
    x = ex;
    y = ey;
    h += sgn * deg * RAD;
  };
  for (const st of steps) {
    if (st[0] === 'line') {
      const [, id, len] = st;
      const x1 = x + Math.cos(h) * len;
      const y1 = y + Math.sin(h) * len;
      segments.push({ id, type: 'line', to: [x1, y1] });
      geo[id] = { x0: x, y0: y, h0: h, x1, y1, h1: h };
      x = x1;
      y = y1;
    } else if (st[0] === 'turn') turn(st[1], st[2], st[3], st[4]);
    else if (st[0] === 'junction') {
      const [, id, dir, r, a] = st;
      arm('ahead', r + a);
      turn(id, dir, 90, r);
      arm('back', r + a);
    } else if (st[0] === 'arm') arm(st[1], st[2]);
  }
  return {
    segments,
    extraRoads,
    // a spot `d` metres after piece `id`, along the new direction / straight on from its start
    after: (id, d, r = 8) => ({ x: geo[id].x1 + Math.cos(geo[id].h1) * d, y: geo[id].y1 + Math.sin(geo[id].h1) * d, r }),
    ahead: (id, d, r = 8) => ({ x: geo[id].x0 + Math.cos(geo[id].h0) * d, y: geo[id].y0 + Math.sin(geo[id].h0) * d, r }),
    corner: (id) => ({ x: geo[id].x1, y: geo[id].y1 }),
  };
}

const base = (t, start, extra) => ({ roadWidth: 8, route: { start, segments: t.segments }, extraRoads: t.extraRoads, rings: [], ...extra });

// ------------------------------------------------------------------ level maps
function level1() {
  const t = track([0, 0], 0, [['line', 'a', 150], ['turn', 'b', 'right', 90, 40], ['line', 'c', 130], ['turn', 'd', 'left', 90, 40], ['line', 'e', 140]]);
  return base(t, [0, 0], {
    signs: [
      { sign: 'speed50', at: ['a', 20] },
      { sign: 'curveRight', at: ['a', 100] },
      { sign: 'speed30', at: ['c', 20] },
      { sign: 'curveLeft', at: ['c', 90] },
    ],
    pins: [{ type: 'camera', at: ['c', 60], label: 'Speed camera' }],
  });
}

function level2() {
  const t = track([0, 0], 0, [
    ['line', 'a', 140], ['junction', 'b', 'right', 10, 45],
    ['line', 'c', 130], ['junction', 'd', 'left', 10, 45],
    ['line', 'e', 130], ['junction', 'f', 'right', 10, 45],
    ['line', 'g', 120],
  ]);
  return base(t, [0, 0], {
    signs: [
      { sign: 'speed50', at: ['a', 15] },
      { sign: 'turnRight', at: ['a', 100], zones: { pass: t.after('b', 12), fail: t.ahead('b', 28) } },
      { sign: 'turnLeft', at: ['c', 90], zones: { pass: t.after('d', 12), fail: t.ahead('d', 28) } },
      { sign: 'turnRight', at: ['e', 90], zones: { pass: t.after('f', 12), fail: t.ahead('f', 28) } },
    ],
    turns: [{ at: ['b', 0], side: 'right' }, { at: ['d', 0], side: 'left' }, { at: ['f', 0], side: 'right' }],
  });
}

function level3() {
  const t = track([0, 0], 0, [
    ['line', 'a', 170], ['junction', 'b', 'right', 7, 45],
    ['line', 'c', 160], ['junction', 'd', 'left', 7, 45],
    ['line', 'e', 150],
  ]);
  return base(t, [0, 0], {
    signs: [
      { sign: 'speed50', at: ['a', 15] },
      { sign: 'turnRight', at: ['a', 128], zones: { pass: t.after('b', 12), fail: t.ahead('b', 24) } },
      { sign: 'stop', at: ['a', 165] },
      { sign: 'turnLeft', at: ['c', 118], zones: { pass: t.after('d', 12), fail: t.ahead('d', 24) } },
      { sign: 'stop', at: ['c', 155] },
    ],
    turns: [{ at: ['b', 0], side: 'right', lead: 12 }, { at: ['d', 0], side: 'left', lead: 12 }],
  });
}

function level4() {
  const t = track([0, 0], -90, [['line', 'a', 150], ['turn', 'b', 'right', 90, 8], ['arm', 'back', 160], ['line', 'c', 190]]);
  const J = t.corner('b');
  return base(t, [0, 0], {
    signs: [
      { sign: 'giveWay', at: ['a', 132], test: { conflict: { x: J.x - 8, y: J.y, r: 26 } } },
      { sign: 'priorityRoad', at: ['c', 40] },
      { sign: 'speed50', at: ['c', 80] },
    ],
    turns: [{ at: ['b', 0], side: 'right', lead: 10 }],
    // cars on the main road, coming from the left, heading east
    npcs: [{ id: 'main', points: [[-230, J.y], [J.x + 260, J.y]], kmh: 32, every: 14, color: '#8c6bd6' }],
    pins: [{ type: 'hazard', at: ['c', 120], label: 'Stopped car' }],
  });
}

function level5() {
  const t = track([0, 0], 0, [['line', 'a', 170], ['turn', 'b', 'right', 90, 40], ['line', 'c', 170], ['turn', 'd', 'left', 70, 50], ['line', 'e', 130]]);
  return base(t, [0, 0], {
    signs: [
      { sign: 'speed30', at: ['a', 10] },
      { sign: 'pedestrian', at: ['a', 60] },
      { sign: 'children', at: ['c', 10] },
      { sign: 'pedestrian', at: ['c', 100] },
      { sign: 'curveLeft', at: ['c', 125] },
      { sign: 'pedestrian', at: ['e', 40] },
    ],
    peds: [{ at: ['a', 68], side: 'left' }, { at: ['c', 108], side: 'right' }, { at: ['e', 48], side: 'left' }],
  });
}

function boss() {
  const t = track([0, 0], 0, [
    ['line', 'a', 130], ['junction', 'b', 'right', 10, 45],
    ['line', 'c', 150], ['junction', 'd', 'left', 7, 45],
    ['line', 'e', 160], ['turn', 'f', 'right', 60, 60],
    ['line', 'g', 150],
  ]);
  return base(t, [0, 0], {
    signs: [
      { sign: 'speed50', at: ['a', 10] },
      { sign: 'turnRight', at: ['a', 96], zones: { pass: t.after('b', 12), fail: t.ahead('b', 28) } },
      { sign: 'pedestrian', at: ['c', 55] },
      { sign: 'turnLeft', at: ['c', 105], zones: { pass: t.after('d', 12), fail: t.ahead('d', 24) } },
      { sign: 'stop', at: ['c', 145] },
      { sign: 'speed30', at: ['e', 20] },
      { sign: 'children', at: ['e', 55] },
      { sign: 'curveRight', at: ['e', 125] },
      { sign: 'noStopping', at: ['g', 40] },
    ],
    turns: [{ at: ['b', 0], side: 'right' }, { at: ['d', 0], side: 'left', lead: 12 }],
    peds: [{ at: ['c', 63], side: 'left' }],
    mission: { pickup: { at: ['a', 60], name: 'Livada Poștei' }, dest: { name: 'Str. Sfinții Constantin și Elena 41, Sânpetru' } },
  });
}

// ------------------------------------------------------------- the level list
const T = (ro, en) => ({ ro, en });

export const LEVELS = [
  { id: 'free', n: 0, district: 'Training town', title: T('Libertate pe traseu', 'Free Roam'), goal: T('Condu liber, află semnele, alimentează.', 'Drive anywhere, meet every sign, refuel at the station.'), weather: 'day', playable: true, build: () => TRAINING, fuel: 0.45 },
  { id: 'L1', n: 1, district: 'Bartolomeu', title: T('Primii metri', 'Smooth start'), goal: T('Pornire lină, volan, frână, viteză.', 'Pull away smoothly, steer, brake, and watch speed and warning signs.'), weather: 'day', playable: true, build: level1 },
  { id: 'L2', n: 2, district: 'Tractorul – Coresi', title: T('Semnalizarea', 'Signalling'), goal: T('Semnalizează înainte de viraje, urmează semnele obligatorii.', 'Signal before every turn and follow mandatory direction signs.'), weather: 'day', playable: true, build: level2 },
  { id: 'L3', n: 3, district: 'Astra', title: T('Oprire (STOP)', 'Full stop'), goal: T('Oprește complet la STOP și pornește lin.', 'Stop completely at STOP signs and pull away smoothly.'), weather: 'day', playable: true, build: level3 },
  { id: 'L4', n: 4, district: 'Triaj & Gara Brașov', title: T('Prioritatea', 'Give way'), goal: T('Cedează trecerea traficului real, drum cu prioritate.', 'Judge real traffic gaps at Give Way; meet a priority road.'), weather: 'day', playable: true, build: level4 },
  { id: 'L5', n: 5, district: 'Răcădău', title: T('Pietoni', 'Pedestrians'), goal: T('Redu viteza și acordă prioritate pietonilor.', 'Slow down and yield to pedestrians at crossings.'), weather: 'day', playable: true, build: level5 },
  { id: 'L6', n: 6, district: 'Calea București', title: T('Limite de viteză', 'Speed limits'), goal: T('Zone 30/50, radar și poliție.', 'Changing 30 / 50 zones, speed camera and police alerts.'), weather: 'day', playable: false },
  { id: 'L7', n: 7, district: 'Stupini – Rulmentul', title: T('Depășirea interzisă', 'No overtaking'), goal: T('Zone cu depășire interzisă, disciplină pe bandă.', 'No-overtaking zones and lane discipline.'), weather: 'day', playable: false },
  { id: 'L8', n: 8, district: 'Centrul Vechi', title: T('Oprire / staționare', 'No stopping, hazards, fuel'), goal: T('Oprirea/staționarea interzisă, avarii, benzinărie.', 'No stopping / parking, hazard lights, refuelling.'), weather: 'night', playable: false },
  { id: 'L9', n: 9, district: 'Sensuri giratorii', title: T('Sens giratoriu', 'Roundabouts'), goal: T('Bandă, semnalizare la intrare/ieșire, cedare.', 'Lane choice, signalling in and out, giving way.'), weather: 'rain', playable: false },
  { id: 'L10', n: 10, district: 'Astra – Noua', title: T('Intersecții combinate', 'Combined junctions'), goal: T('Mai multe reguli la rând.', 'Several signs and rules in a row.'), weather: 'day', playable: false },
  { id: 'L11', n: 11, district: 'Bulevarde cu mai multe benzi', title: T('Schimbarea benzii', 'Lane changes'), goal: T('Schimbări de bandă semnalizate.', 'Signalled lane changes on multi-lane roads.'), weather: 'day', playable: false },
  { id: 'L12', n: 12, district: 'Schei – Poiana Brașov', title: T('Curbe și drum îngustat', 'Curves and narrow road'), goal: T('Curbe periculoase, drum îngustat, lucrări.', 'Dangerous curves, narrow road, roadworks.'), weather: 'fog', playable: false },
  { id: 'L13', n: 13, district: 'Traseu prin oraș', title: T('Traseu urban lung', 'Long city route'), goal: T('Prioritate, interdicții, pietoni, alimentare.', 'Priority, prohibitions, crossings and refuelling.'), weather: 'rain', playable: false },
  { id: 'L14', n: 14, district: 'DRPCIV', title: T('Examen simulat', 'Mock exam'), goal: T('Verificări consecutive cu puncte de penalizare.', 'Consecutive checks with penalty points.'), weather: 'day', playable: false },
  { id: 'L15', n: 15, district: 'DRPCIV', title: T('Examenul final', 'Final exam'), goal: T('Traseu complet. Câștigi permisul.', 'A full route. Earn your licence.'), weather: 'night', playable: false },
  { id: 'boss', n: 16, district: 'Livada Poștei → Sânpetru', title: T('Final Boss: acasă', 'Final Boss: drive her home'), goal: T('Ia-o pe Alisia de la Livada Poștei și du-o acasă în Sânpetru.', 'Pick up your passenger at Livada Poștei and drive her home to Sânpetru.'), weather: 'day', playable: true, build: boss, fuel: 0.5, boss: true },
];

const cache = {};
export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[1];
}
export function getMap(level) {
  if (!level.build) return null;
  return (cache[level.id] ||= level.build());
}
