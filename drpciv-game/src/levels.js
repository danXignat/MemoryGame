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
  const rings = [];
  const stations = [];
  const geo = {};
  let n = 0;
  let lastSeg = null;
  // leg: { seg, turn, K } tells the traffic code where this street meets the route
  const arm = (dir, len, leg = null) => {
    const ang = dir === 'ahead' ? h : dir === 'back' ? h + Math.PI : dir === 'right' ? h + Math.PI / 2 : h - Math.PI / 2;
    extraRoads.push({ id: `arm${n++}`, points: [[x, y], [x + Math.cos(ang) * len, y + Math.sin(ang) * len]], lane: true, leg });
  };
  const line = (id, len) => {
    const x1 = x + Math.cos(h) * len;
    const y1 = y + Math.sin(h) * len;
    segments.push({ id, type: 'line', to: [x1, y1] });
    lastSeg = id;
    geo[id] = { x0: x, y0: y, h0: h, x1, y1, h1: h };
    x = x1;
    y = y1;
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
    lastSeg = id;
    geo[id] = { x0: x, y0: y, h0: h, x1: ex, y1: ey, h1: h + sgn * deg * RAD };
    x = ex;
    y = ey;
    h += sgn * deg * RAD;
  };
  for (const st of steps) {
    if (st[0] === 'line') line(st[1], st[2]);
    else if (st[0] === 'turn') turn(st[1], st[2], st[3], st[4]);
    else if (st[0] === 'junction') {
      const [, id, dir, r, a] = st;
      const K = [x + Math.cos(h) * r, y + Math.sin(h) * r];
      arm('ahead', r + a, { seg: id, turn: true, K });
      turn(id, dir, 90, r);
      arm('back', r + a, { seg: id, turn: true, K });
    } else if (st[0] === 'arm') arm(st[1], st[2], lastSeg ? { seg: lastSeg, turn: false, K: [x, y] } : null);
    else if (st[0] === 'roundabout') {
      // drive into a roundabout ahead and leave it after `exitDeg` degrees, counter-clockwise
      const [, id, exitDeg, R, armLen = 40] = st;
      const cx = x + Math.cos(h) * R;
      const cy = y + Math.sin(h) * R;
      const a0 = Math.atan2(y - cy, x - cx);
      const a1 = a0 - exitDeg * RAD;
      segments.push({ id, type: 'arc', center: [cx, cy], radius: R, from: a0 / RAD, to: a1 / RAD, roundabout: true });
      rings.push({ cx, cy, r: R });
      for (let k = 1; k <= 3; k++) {
        if (k * 90 === exitDeg) continue;
        const a = a0 - (k * Math.PI) / 2;
        extraRoads.push({ id: `arm${n++}`, points: [[cx + Math.cos(a) * R, cy + Math.sin(a) * R], [cx + Math.cos(a) * (R + armLen), cy + Math.sin(a) * (R + armLen)]], lane: true });
      }
      geo[id] = { x0: x, y0: y, h0: h, x1: cx + R * Math.cos(a1), y1: cy + R * Math.sin(a1), h1: a1, cx, cy, R };
      x = geo[id].x1;
      y = geo[id].y1;
      h = a1; // leave radially
    } else if (st[0] === 'station') {
      // a fuel station beside the road: jog right into the bay, then back left onto the road
      const [, id, name] = st;
      const r = 18;
      const th = 35;
      const bay = 24;
      arm('ahead', 4 * r * Math.sin(th * RAD) + bay);
      turn(id + 'a', 'right', th, r);
      turn(id + 'b', 'left', th, r);
      const bx = x + Math.cos(h) * (bay / 2);
      const by = y + Math.sin(h) * (bay / 2);
      const nx = -Math.sin(h);
      const ny = Math.cos(h);
      line(id + 'c', bay);
      turn(id + 'd', 'left', th, r);
      turn(id + 'e', 'right', th, r);
      stations.push({ name, x: bx, y: by, bay: { x: bx + nx * 2, y: by + ny * 2, r: 4 }, zone: { x: bx, y: by, r: 32 }, pump: { x: bx + nx * 7.2, y: by + ny * 7.2 } });
    }
  }
  return {
    segments,
    extraRoads,
    rings,
    stations,
    after: (id, d, r = 8) => ({ x: geo[id].x1 + Math.cos(geo[id].h1) * d, y: geo[id].y1 + Math.sin(geo[id].h1) * d, r }),
    ahead: (id, d, r = 8) => ({ x: geo[id].x0 + Math.cos(geo[id].h0) * d, y: geo[id].y0 + Math.sin(geo[id].h0) * d, r }),
    corner: (id) => ({ x: geo[id].x1, y: geo[id].y1 }),
    entry: (id) => ({ x: geo[id].x0, y: geo[id].y0 }),
    // a straight road through the end of piece `id`, along its new direction (for traffic)
    through: (id, back, fwd) => {
      const g = geo[id];
      return [[g.x1 - Math.cos(g.h1) * back, g.y1 - Math.sin(g.h1) * back], [g.x1 + Math.cos(g.h1) * fwd, g.y1 + Math.sin(g.h1) * fwd]];
    },
    // points going round a roundabout counter-clockwise (for traffic inside it)
    ringPath: (id, laps = 1) => {
      const g = geo[id];
      const pts = [];
      for (let a = 0; a <= laps * 360; a += 8) pts.push([g.cx + Math.cos((-a) * RAD) * g.R, g.cy + Math.sin((-a) * RAD) * g.R]);
      return pts;
    },
    arcLen: (id) => {
      const sg = segments.find((q) => q.id === id);
      return (Math.abs(sg.to - sg.from) * RAD) * sg.radius;
    },
  };
}

const base = (t, start, extra) => ({ roadWidth: 8, route: { start, segments: t.segments }, extraRoads: t.extraRoads, rings: t.rings, stations: t.stations, oncoming: { kmh: 36, every: 13 }, ...extra });

// ------------------------------------------------------------------ level maps
function level1() {
  const t = track([0, 0], 0, [['line', 'a', 150], ['turn', 'b', 'right', 90, 40], ['line', 'c', 130], ['turn', 'd', 'left', 90, 40], ['line', 'e', 140]]);
  return base(t, [0, 0], {
    decor: { style: 'suburb' },
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
    decor: { style: 'mixed' },
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
    decor: { style: 'city' },
    signs: [
      { sign: 'speed50', at: ['a', 15] },
      { sign: 'turnRight', at: ['a', 128], zones: { pass: t.after('b', 12), fail: t.ahead('b', 24) } },
      { sign: 'stop', at: ['a', 165], test: { conflict: { ...t.corner('b'), r: 22 } } },
      { sign: 'turnLeft', at: ['c', 118], zones: { pass: t.after('d', 12), fail: t.ahead('d', 24) } },
      { sign: 'stop', at: ['c', 155] },
    ],
    turns: [{ at: ['b', 0], side: 'right', lead: 12 }, { at: ['d', 0], side: 'left', lead: 12 }],
    npcs: [{ id: 'cross', points: t.through('b', 200, 220), kmh: 30, every: 15, road: false }],
  });
}

function level4() {
  const t = track([0, 0], -90, [['line', 'a', 150], ['turn', 'b', 'right', 90, 8], ['arm', 'back', 160], ['line', 'c', 190]]);
  const J = t.corner('b');
  return base(t, [0, 0], {
    decor: { style: 'city' },
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
    decor: { style: 'suburb' },
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
    decor: { style: 'city', zones: [['e', 'suburb'], ['f', 'suburb'], ['g', 'suburb']] },
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


// ------------------------------------------------------------- levels 6 - 15
function level6() {
  const t = track([0, 0], 0, [['line', 'a', 200], ['turn', 'b', 'right', 40, 80], ['line', 'c', 180], ['turn', 'd', 'left', 40, 80], ['line', 'e', 200], ['turn', 'f', 'right', 30, 100], ['line', 'g', 160]]);
  return base(t, [0, 0], {
    decor: { style: 'city' },
    signs: [
      { sign: 'speed50', at: ['a', 15] },
      { sign: 'children', at: ['c', 20] },
      { sign: 'speed30', at: ['c', 45] },
      { sign: 'speed50', at: ['e', 20] },
      { sign: 'speed30', at: ['g', 40] },
    ],
    pins: [{ type: 'camera', at: ['a', 150], label: 'Speed camera' }, { type: 'police', at: ['c', 120], label: 'Police' }, { type: 'camera', at: ['e', 150], label: 'Speed camera' }],
  });
}

function level7() {
  const t = track([0, 0], 0, [['line', 'a', 140], ['turn', 'b', 'right', 30, 120], ['line', 'c', 260], ['turn', 'd', 'left', 30, 120], ['line', 'e', 200]]);
  return base(t, [0, 0], {
    decor: { style: 'mixed' }, oncoming: false,
    signs: [
      { sign: 'speed50', at: ['a', 10] },
      { sign: 'noOvertaking', at: ['a', 60] },
      { sign: 'endNoOvertaking', at: ['c', 80] },
      { sign: 'curveLeft', at: ['c', 200] },
    ],
    traffic: [{ id: 'slowcar', at: ['a', 76], kmh: 22, spawnBefore: 74, color: '#2b6fd6' }],
  });
}

function level8() {
  const t = track([0, 0], 0, [['line', 'a', 110], ['station', 'st', 'Fuel station'], ['line', 'c', 160], ['turn', 'd', 'right', 90, 30], ['line', 'e', 200]]);
  return base(t, [0, 0], {
    decor: { style: 'city' }, oncoming: false,
    signs: [
      { sign: 'speed50', at: ['a', 10] },
      { sign: 'noParking', at: ['c', 20] },
      { sign: 'noStopping', at: ['c', 70] },
    ],
    turns: [{ at: ['sta', 0], side: 'right' }, { at: ['std', 0], side: 'left', lead: 4 }, { at: ['e', 42], side: 'left', lead: 0 }],
    refuel: { at: ['stc', 12], litres: 10 },
    obstacles: [{ at: ['e', 62] }],
    hazardStops: [{ at: ['e', 160] }],
  });
}

function level9() {
  const t = track([0, 0], 0, [['line', 'a', 140], ['roundabout', 'r1', 180, 22], ['line', 'c', 160], ['roundabout', 'r2', 90, 20], ['line', 'e', 150]]);
  const l1 = t.arcLen('r1');
  const l2 = t.arcLen('r2');
  const e1 = t.corner('a');
  const e2 = t.corner('c');
  return base(t, [0, 0], {
    decor: { style: 'mixed' },
    signs: [
      { sign: 'speed50', at: ['a', 10] },
      { sign: 'roundabout', at: ['a', 90], until: ['r1', l1] },
      { sign: 'giveWay', at: ['a', 112], test: { conflict: { x: e1.x, y: e1.y, r: 14 } } },
      { sign: 'roundabout', at: ['c', 105], until: ['r2', l2] },
      { sign: 'giveWay', at: ['c', 130], test: { conflict: { x: e2.x, y: e2.y, r: 14 } } },
    ],
    turns: [{ at: ['r1', l1 - 14], side: 'right', lead: 0 }, { at: ['r2', l2 - 10], side: 'right', lead: 0 }],
    npcs: [
      { id: 'ring1', points: t.ringPath('r1'), kmh: 20, loop: true, count: 1, road: false, color: '#8c6bd6' },
      { id: 'ring2', points: t.ringPath('r2'), kmh: 18, loop: true, count: 1, road: false, color: '#6f8ad6' },
    ],
  });
}

function level10() {
  const t = track([0, 0], 0, [
    ['line', 'a', 140], ['junction', 'b', 'right', 7, 45],
    ['line', 'c', 150], ['turn', 'd', 'left', 90, 8], ['arm', 'back', 160],
    ['line', 'e', 150], ['junction', 'f', 'left', 10, 45],
    ['line', 'g', 140],
  ]);
  const J = t.corner('d');
  return base(t, [0, 0], {
    decor: { style: 'city' },
    signs: [
      { sign: 'speed50', at: ['a', 10] },
      { sign: 'turnRight', at: ['a', 110], zones: { pass: t.after('b', 12), fail: t.ahead('b', 24) } },
      { sign: 'stop', at: ['a', 135] },
      { sign: 'pedestrian', at: ['c', 50] },
      { sign: 'giveWay', at: ['c', 132], test: { conflict: { x: J.x, y: J.y, r: 26 } } },
      { sign: 'priorityRoad', at: ['e', 30] },
      { sign: 'turnLeft', at: ['e', 100], zones: { pass: t.after('f', 12), fail: t.ahead('f', 28) } },
    ],
    turns: [{ at: ['b', 0], side: 'right', lead: 12 }, { at: ['d', 0], side: 'left', lead: 10 }, { at: ['f', 0], side: 'left' }],
    peds: [{ at: ['c', 58], side: 'left' }],
    npcs: [{ id: 'main', points: t.through('d', 220, 260), kmh: 32, every: 14, road: false, color: '#8c6bd6' }],
  });
}

function level11() {
  const t = track([0, 0], 0, [['line', 'a', 220], ['turn', 'b', 'right', 30, 150], ['line', 'c', 220], ['turn', 'd', 'left', 30, 150], ['line', 'e', 220]]);
  return base(t, [0, 0], {
    decor: { style: 'city' },
    roadWidth: 15,
    startLane: 5.6,
    laneDividers: [3.75, -3.75],
    signs: [
      { sign: 'speed50', at: ['a', 10] },
      { sign: 'noStopping', at: ['c', 150], test: { length: 60 } },
    ],
    lanes: [{ at: ['a', 70], to: 'left' }, { at: ['c', 40], to: 'right' }, { at: ['e', 50], to: 'left' }],
  });
}

function level12() {
  const t = track([0, 0], 0, [['line', 'a', 120], ['turn', 'b', 'right', 80, 32], ['line', 'c', 70], ['turn', 'd', 'left', 100, 30], ['line', 'e', 80], ['turn', 'f', 'right', 90, 28], ['line', 'g', 120]]);
  return base(t, [0, 0], {
    decor: { style: 'suburb' },
    roadWidth: 7,
    signs: [
      { sign: 'speed30', at: ['a', 10] },
      { sign: 'curveRight', at: ['a', 80] },
      { sign: 'curveLeft', at: ['c', 30] },
      { sign: 'narrowRoad', at: ['e', 15] },
      { sign: 'curveRight', at: ['e', 45] },
    ],
    pins: [{ type: 'roadwork', at: ['e', 30], label: 'Roadworks' }],
  });
}

function level13() {
  const t = track([0, 0], 0, [
    ['line', 'a', 140], ['junction', 'b', 'right', 7, 45],
    ['line', 'c', 120], ['station', 'st', 'Fuel station'],
    ['line', 'e', 150], ['turn', 'f', 'left', 90, 8], ['arm', 'back', 160],
    ['line', 'g', 160],
  ]);
  const J = t.corner('f');
  return base(t, [0, 0], {
    decor: { style: 'city' },
    signs: [
      { sign: 'speed50', at: ['a', 10] },
      { sign: 'stop', at: ['a', 135] },
      { sign: 'pedestrian', at: ['c', 40] },
      { sign: 'noStopping', at: ['e', 15] },
      { sign: 'giveWay', at: ['e', 132], test: { conflict: { x: J.x, y: J.y, r: 26 } } },
      { sign: 'priorityRoad', at: ['g', 30] },
      { sign: 'speed30', at: ['g', 70] },
    ],
    turns: [{ at: ['b', 0], side: 'right', lead: 12 }, { at: ['sta', 0], side: 'right' }, { at: ['std', 0], side: 'left', lead: 4 }, { at: ['f', 0], side: 'left', lead: 10 }],
    refuel: { at: ['stc', 12], litres: 10 },
    peds: [{ at: ['c', 48], side: 'right' }],
    npcs: [{ id: 'main', points: t.through('f', 220, 260), kmh: 32, every: 14, road: false, color: '#8c6bd6' }],
  });
}

function level14() {
  const t = track([0, 0], 0, [
    ['line', 'a', 140], ['junction', 'b', 'left', 7, 45],
    ['line', 'c', 150], ['roundabout', 'r1', 180, 22],
    ['line', 'e', 150], ['junction', 'f', 'right', 10, 45],
    ['line', 'g', 150],
  ]);
  const l1 = t.arcLen('r1');
  const e1 = t.corner('c');
  return base(t, [0, 0], {
    decor: { style: 'city' },
    signs: [
      { sign: 'speed50', at: ['a', 10] },
      { sign: 'turnLeft', at: ['a', 110], zones: { pass: t.after('b', 12), fail: t.ahead('b', 24) } },
      { sign: 'stop', at: ['a', 135] },
      { sign: 'pedestrian', at: ['c', 40] },
      { sign: 'roundabout', at: ['c', 100], until: ['r1', l1] },
      { sign: 'giveWay', at: ['c', 122], test: { conflict: { x: e1.x, y: e1.y, r: 14 } } },
      { sign: 'speed30', at: ['e', 20] },
      { sign: 'children', at: ['e', 40] },
      { sign: 'turnRight', at: ['e', 110], zones: { pass: t.after('f', 12), fail: t.ahead('f', 28) } },
      { sign: 'noStopping', at: ['g', 30] },
    ],
    turns: [{ at: ['b', 0], side: 'left', lead: 12 }, { at: ['r1', l1 - 14], side: 'right', lead: 0 }, { at: ['f', 0], side: 'right' }],
    peds: [{ at: ['c', 48], side: 'left' }],
    npcs: [{ id: 'ring1', points: t.ringPath('r1'), kmh: 20, loop: true, count: 1, road: false, color: '#8c6bd6' }],
  });
}

function level15() {
  const t = track([0, 0], 0, [
    ['line', 'a', 150], ['junction', 'b', 'right', 7, 45],
    ['line', 'c', 150], ['roundabout', 'r1', 90, 20],
    ['line', 'e', 140], ['turn', 'f', 'left', 90, 8], ['arm', 'back', 160],
    ['line', 'g', 150], ['junction', 'h', 'right', 10, 45],
    ['line', 'i', 120],
  ]);
  const l1 = t.arcLen('r1');
  const e1 = t.corner('c');
  const J = t.corner('f');
  return base(t, [0, 0], {
    decor: { style: 'mixed' },
    signs: [
      { sign: 'speed50', at: ['a', 10] },
      { sign: 'turnRight', at: ['a', 120], zones: { pass: t.after('b', 12), fail: t.ahead('b', 24) } },
      { sign: 'stop', at: ['a', 145] },
      { sign: 'pedestrian', at: ['c', 40] },
      { sign: 'roundabout', at: ['c', 100], until: ['r1', l1] },
      { sign: 'giveWay', at: ['c', 122], test: { conflict: { x: e1.x, y: e1.y, r: 14 } } },
      { sign: 'speed30', at: ['e', 20] },
      { sign: 'giveWay', at: ['e', 122], test: { conflict: { x: J.x, y: J.y, r: 26 } } },
      { sign: 'priorityRoad', at: ['g', 30] },
      { sign: 'turnRight', at: ['g', 110], zones: { pass: t.after('h', 12), fail: t.ahead('h', 28) } },
      { sign: 'noStopping', at: ['i', 20] },
    ],
    turns: [{ at: ['b', 0], side: 'right', lead: 12 }, { at: ['r1', l1 - 10], side: 'right', lead: 0 }, { at: ['f', 0], side: 'left', lead: 10 }, { at: ['h', 0], side: 'right' }],
    peds: [{ at: ['c', 48], side: 'right' }],
    npcs: [
      { id: 'ring1', points: t.ringPath('r1'), kmh: 18, loop: true, count: 1, road: false, color: '#8c6bd6' },
      { id: 'main', points: t.through('f', 220, 260), kmh: 32, every: 14, road: false, color: '#6f8ad6' },
    ],
  });
}

// ------------------------------------------------------------- the level list
const T = (ro, en) => ({ ro, en });

export const LEVELS = [
  { id: 'free', tip: T('Condu liber și citește fiecare cartonaș de semn. Benzinăria e pe pin verde.', 'Drive around and read every sign card. The fuel station is the green pin.'), n: 0, district: 'Training town', title: T('Libertate pe traseu', 'Free Roam'), goal: T('Condu liber, află semnele, alimentează.', 'Drive anywhere, meet every sign, refuel at the station.'), weather: 'day', playable: true, build: () => TRAINING, fuel: 0.45 },
  { id: 'L1', tip: T('Accelerează lin și frânează din timp înainte de curbe.', 'Pull away smoothly and brake early, before the curves.'), n: 1, district: 'Bartolomeu', title: T('Primii metri', 'Smooth start'), goal: T('Pornire lină, volan, frână, viteză.', 'Pull away smoothly, steer, brake, and watch speed and warning signs.'), weather: 'day', playable: true, build: level1 },
  { id: 'L2', tip: T('Semnalizează înainte de viraj, nu în viraj. Se oprește singur după.', 'Signal before the turn, not in it. It switches off by itself afterwards.'), n: 2, district: 'Tractorul – Coresi', title: T('Semnalizarea', 'Signalling'), goal: T('Semnalizează înainte de viraje, urmează semnele obligatorii.', 'Signal before every turn and follow mandatory direction signs.'), weather: 'day', playable: true, build: level2 },
  { id: 'L3', tip: T('La STOP oprești la linie, apoi pornești doar când e liber.', 'At STOP you stop at the line, then go only when it is clear.'), n: 3, district: 'Astra', title: T('Oprire (STOP)', 'Full stop'), goal: T('Oprește complet la STOP și pornește lin.', 'Stop completely at STOP signs and pull away smoothly.'), weather: 'day', playable: true, build: level3 },
  { id: 'L4', tip: T('Așteaptă o pauză între mașinile de pe drumul cu prioritate.', 'Wait for a gap between the cars on the priority road.'), n: 4, district: 'Triaj & Gara Brașov', title: T('Prioritatea', 'Give way'), goal: T('Cedează trecerea traficului real, drum cu prioritate.', 'Judge real traffic gaps at Give Way; meet a priority road.'), weather: 'day', playable: true, build: level4 },
  { id: 'L5', tip: T('Dacă pietonul e pe cale să traverseze, oprește.', 'If a pedestrian is about to cross, stop.'), n: 5, district: 'Răcădău', title: T('Pietoni', 'Pedestrians'), goal: T('Redu viteza și acordă prioritate pietonilor.', 'Slow down and yield to pedestrians at crossings.'), weather: 'day', playable: true, build: level5 },
  { id: 'L6', n: 6, district: 'Calea București', title: T('Limite de viteză', 'Speed limits'), goal: T('Zone 30/50, radar și poliție.', 'Changing 30 / 50 zones, speed camera and police alerts.'), weather: 'day', playable: true, build: level6, tip: T('Urmărește limita de viteză: se schimbă des aici.', 'Watch the speed limit: it changes a lot here.') },
  { id: 'L7', n: 7, district: 'Stupini – Rulmentul', title: T('Depășirea interzisă', 'No overtaking'), goal: T('Zone cu depășire interzisă, disciplină pe bandă.', 'No-overtaking zones and lane discipline.'), weather: 'day', playable: true, build: level7, tip: T('Rămâi în spatele mașinii lente până la semnul de sfârșit.', 'Stay behind the slow car until the end sign.') },
  { id: 'L8', n: 8, district: 'Centrul Vechi', title: T('Oprire / staționare', 'No stopping, hazards, fuel'), goal: T('Oprirea/staționarea interzisă, avarii, benzinărie.', 'No stopping / parking, hazard lights, refuelling.'), weather: 'night', playable: true, build: level8, fuel: 0.12, tip: T('Ai rezervor gol: alimentează la benzinărie. Ocolește mașina oprită și oprește cu avarii la locul marcat.', 'Your tank is low: refuel at the station. Pass the stopped car and stop with hazards at the marked spot.') },
  { id: 'L9', n: 9, district: 'Sensuri giratorii', title: T('Sens giratoriu', 'Roundabouts'), goal: T('Bandă, semnalizare la intrare/ieșire, cedare.', 'Lane choice, signalling in and out, giving way.'), weather: 'rain', playable: true, build: level9, tip: T('Cedează mașinilor din giratoriu și semnalizează dreapta la ieșire.', 'Give way to cars in the roundabout and signal right as you leave.') },
  { id: 'L10', n: 10, district: 'Astra – Noua', title: T('Intersecții combinate', 'Combined junctions'), goal: T('Mai multe reguli la rând.', 'Several signs and rules in a row.'), weather: 'day', playable: true, build: level10, tip: T('Multe semne la rând: citește fiecare din timp.', 'Lots of signs in a row: read each one early.') },
  { id: 'L11', n: 11, district: 'Bulevarde cu mai multe benzi', title: T('Schimbarea benzii', 'Lane changes'), goal: T('Schimbări de bandă semnalizate.', 'Signalled lane changes on multi-lane roads.'), weather: 'day', playable: true, build: level11, tip: T('Semnalizează înainte să schimbi banda, apoi treci lin.', 'Signal before changing lane, then move over smoothly.') },
  { id: 'L12', n: 12, district: 'Schei – Poiana Brașov', title: T('Curbe și drum îngustat', 'Curves and narrow road'), goal: T('Curbe periculoase, drum îngustat, lucrări.', 'Dangerous curves, narrow road, roadworks.'), weather: 'fog', playable: true, build: level12, tip: T('Ceață: aprinde faza scurtă și frânează înainte de curbe.', 'Fog: switch on low beams and brake before the curves.') },
  { id: 'L13', n: 13, district: 'Traseu prin oraș', title: T('Traseu urban lung', 'Long city route'), goal: T('Prioritate, interdicții, pietoni, alimentare.', 'Priority, prohibitions, crossings and refuelling.'), weather: 'rain', playable: true, build: level13, fuel: 0.12, tip: T('Traseu lung prin oraș. Alimentează pe drum.', 'A long city route. Refuel on the way.') },
  { id: 'L14', n: 14, district: 'DRPCIV', title: T('Examen simulat', 'Mock exam'), goal: T('Verificări consecutive cu puncte de penalizare.', 'Consecutive checks with penalty points.'), weather: 'day', playable: true, build: level14, tip: T('Examen simulat: 21 de puncte de penalizare înseamnă respins.', 'Mock exam: 21 penalty points means failed.') },
  { id: 'L15', n: 15, district: 'DRPCIV', title: T('Examenul final', 'Final exam'), goal: T('Traseu complet. Câștigi permisul.', 'A full route. Earn your licence.'), weather: 'night', playable: true, build: level15, tip: T('Examenul final, noaptea. Faza scurtă, calm, semnalizare.', 'The final exam, at night. Low beams, stay calm, signal.') },
  { id: 'boss', tip: T('Ia-o pe Alisia de la Livada Poștei și condu-o acasă fără griji.', 'Pick up Alisia at Livada Poștei and drive her home, calmly.'), n: 16, district: 'Livada Poștei → Sânpetru', title: T('Final Boss: acasă', 'Final Boss: drive her home'), goal: T('Ia-o pe Alisia de la Livada Poștei și du-o acasă în Sânpetru.', 'Pick up Alisia at Livada Poștei and drive her home to Sânpetru.'), weather: 'day', playable: true, build: boss, fuel: 0.5, boss: true },
];

const cache = {};
export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[1];
}
export function getMap(level) {
  if (!level.build) return null;
  return (cache[level.id] ||= level.build());
}
