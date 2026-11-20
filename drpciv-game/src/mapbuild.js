// ============================================================================
//  mapbuild.js  —  turns the hand-written map (map.js) into real geometry:
//  road shapes, the route as a list of points, sign positions, trees, houses.
//  Pure maths, no drawing, so it also runs in the automatic tests.
//  You normally never need to edit this file.
// ============================================================================

import { CONFIG as C } from './config.js';
import { SIGNS } from './signs.js';

const TAU = Math.PI * 2;
const rad = (d) => (d * Math.PI) / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildWorld(MAP) {
  const half = MAP.roadWidth / 2;
  const warnings = [];

  // ------------------------------------------------------------------ route
  const routeSegs = [];
  const poly = [[MAP.route.start[0], MAP.route.start[1]]];
  const endIndex = {}; // route piece id -> index in `poly` where it ends
  let cur = [...MAP.route.start];

  for (const seg of MAP.route.segments) {
    if (seg.type === 'line') {
      const [x1, y1] = seg.to;
      routeSegs.push({ type: 'line', x0: cur[0], y0: cur[1], x1, y1 });
      poly.push([x1, y1]);
      cur = [x1, y1];
    } else if (seg.type === 'arc') {
      const a0 = rad(seg.from);
      const a1 = rad(seg.to);
      const [cx, cy] = seg.center;
      const r = seg.radius;
      const sx = cx + r * Math.cos(a0);
      const sy = cy + r * Math.sin(a0);
      const gap = Math.hypot(sx - cur[0], sy - cur[1]);
      if (gap > 0.05) warnings.push(`Route piece "${seg.id}" starts ${gap.toFixed(2)} m away from where the previous piece ends.`);
      routeSegs.push({ type: 'arc', cx, cy, r, a0, a1 });
      const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * r) / 0.25));
      for (let i = 1; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        poly.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      cur = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    } else {
      throw new Error(`Unknown route piece type "${seg.type}"`);
    }
    endIndex[seg.id] = poly.length - 1;
  }

  const cum = [0];
  for (let i = 1; i < poly.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  }
  const length = cum[cum.length - 1];

  const segRanges = {};
  let prevEnd = 0;
  for (const seg of MAP.route.segments) {
    const e = cum[endIndex[seg.id]];
    segRanges[seg.id] = [prevEnd, e];
    prevEnd = e;
  }

  // uniform samples roughly every metre
  const N = Math.ceil(length);
  const ds = length / N;
  const X = new Float64Array(N + 1);
  const Y = new Float64Array(N + 1);
  const DX = new Float64Array(N + 1);
  const DY = new Float64Array(N + 1);
  {
    let j = 0;
    for (let k = 0; k <= N; k++) {
      const s = k * ds;
      while (j < poly.length - 2 && cum[j + 1] < s) j++;
      const seglen = cum[j + 1] - cum[j];
      const t = seglen > 0 ? clamp((s - cum[j]) / seglen, 0, 1) : 0;
      X[k] = poly[j][0] + (poly[j + 1][0] - poly[j][0]) * t;
      Y[k] = poly[j][1] + (poly[j + 1][1] - poly[j][1]) * t;
    }
    for (let k = 0; k <= N; k++) {
      const a = Math.max(0, k - 1);
      const b = Math.min(N, k + 1);
      const dx = X[b] - X[a];
      const dy = Y[b] - Y[a];
      const l = Math.hypot(dx, dy) || 1;
      DX[k] = dx / l;
      DY[k] = dy / l;
    }
  }

  const routeAt = (s, out = {}) => {
    const f = clamp(s / ds, 0, N);
    const k = Math.min(N - 1, Math.floor(f));
    const t = f - k;
    out.x = X[k] + (X[k + 1] - X[k]) * t;
    out.y = Y[k] + (Y[k + 1] - Y[k]) * t;
    let dx = DX[k] + (DX[k + 1] - DX[k]) * t;
    let dy = DY[k] + (DY[k + 1] - DY[k]) * t;
    const l = Math.hypot(dx, dy) || 1;
    out.dx = dx / l;
    out.dy = dy / l;
    out.s = clamp(s, 0, length);
    return out;
  };

  const resolveAt = (at, label) => {
    const [id, d] = at;
    const r = segRanges[id];
    if (!r) throw new Error(`${label}: there is no route piece called "${id}"`);
    if (d < 0 || r[0] + d > r[1] + 0.01) {
      warnings.push(`${label}: ${d} m is outside route piece "${id}" (it is ${(r[1] - r[0]).toFixed(1)} m long).`);
    }
    return r[0] + d;
  };

  // ------------------------------------------------- extra side streets for traffic
  //  Long straight stretches get a few side streets so cars can come out of them
  //  (and turn into them). They are only added where nothing else is in the way.
  const allExtra = [...(MAP.extraRoads || [])];
  if (MAP.sideStreets !== false && MAP.route.segments.length > 1) {
    const avoidS = [];
    for (const sg of MAP.signs || []) avoidS.push([resolveAt(sg.at, 'sign'), 16]);
    for (const pd of MAP.peds || []) avoidS.push([resolveAt(pd.at, 'pedestrian'), 22]);
    for (const o of MAP.obstacles || []) avoidS.push([resolveAt(o.at, 'obstacle'), 40]);
    for (const o of MAP.hazardStops || []) avoidS.push([resolveAt(o.at, 'breakdown'), 40]);
    if (MAP.refuel) avoidS.push([resolveAt(MAP.refuel.at, 'refuel'), 60]);
    if (MAP.mission && MAP.mission.pickup) avoidS.push([resolveAt(MAP.mission.pickup.at, 'pickup'), 30]);
    for (const l of MAP.lanes || []) avoidS.push([resolveAt(l.at, 'lane'), (l.window ?? 80) + 30]);
    const otherLines = allExtra.map((r) => r.points);
    const segDist = (x, y, a, b) => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
    };
    const clearAt = (x, y, sv) => {
      for (let k = 0; k <= N; k += 2) if (Math.abs(k * ds - sv) > 12 && Math.hypot(X[k] - x, Y[k] - y) < half * 2 + 6) return false;
      for (const pts of otherLines) for (let i = 1; i < pts.length; i++) if (segDist(x, y, pts[i - 1], pts[i]) < half * 2 + 6) return false;
      for (const rg of MAP.rings || []) if (Math.hypot(x - rg.cx, y - rg.cy) < rg.r + half * 2 + 10) return false;
      for (const stn of MAP.stations || []) if (Math.hypot(x - stn.x, y - stn.y) < 45) return false;
      return true;
    };
    let side = 1;
    let made = 0;
    for (const sg of MAP.route.segments) {
      if (sg.type !== 'line') continue;
      const [a, b] = segRanges[sg.id];
      for (let sv = a + 45; sv < b - 40; sv += 95 + ((made * 37) % 40)) {
        if (avoidS.some(([q, r]) => Math.abs(q - sv) < r)) continue;
        if (otherLines.some((pts) => Math.hypot(pts[0][0] - routeAt(sv).x, pts[0][1] - routeAt(sv).y) < 45)) continue;
        const q = routeAt(sv, {});
        side = -side;
        for (const sd of [side, -side]) {
          const ux = -q.dy * sd;
          const uy = q.dx * sd;
          const len = 58;
          let ok = true;
          for (let d = half + 6; d <= len; d += 4) if (!clearAt(q.x + ux * d, q.y + uy * d, sv)) ok = false;
          if (!ok) continue;
          const pts = [[q.x, q.y], [q.x + ux * len, q.y + uy * len]];
          allExtra.push({ id: `side${made++}`, points: pts, lane: true, side: true, leg: { seg: sg.id, turn: false, K: [q.x, q.y], s: sv } });
          otherLines.push(pts);
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------- road shapes
  const roads = [{ id: 'route', segs: routeSegs, lane: true }];
  for (const road of allExtra) {
    const segs = [];
    for (let i = 1; i < road.points.length; i++) {
      segs.push({
        type: 'line',
        x0: road.points[i - 1][0],
        y0: road.points[i - 1][1],
        x1: road.points[i][0],
        y1: road.points[i][1],
      });
    }
    roads.push({ id: road.id, segs, lane: !!road.lane });
  }
  for (const ring of MAP.rings || []) {
    roads.push({ id: 'ring', segs: [{ type: 'arc', cx: ring.cx, cy: ring.cy, r: ring.r, a0: 0, a1: TAU }], lane: false });
  }

  // flat list of straight pieces for "how far is this point from the road"
  const SX0 = [];
  const SY0 = [];
  const SDX = [];
  const SDY = [];
  const SINV = [];
  const addPiece = (x0, y0, x1, y1) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1e-9) return;
    SX0.push(x0);
    SY0.push(y0);
    SDX.push(dx);
    SDY.push(dy);
    SINV.push(1 / l2);
  };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x, y) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  for (const road of roads) {
    for (const s of road.segs) {
      if (s.type === 'line') {
        addPiece(s.x0, s.y0, s.x1, s.y1);
        grow(s.x0, s.y0);
        grow(s.x1, s.y1);
      } else {
        const n = Math.max(4, Math.ceil((Math.abs(s.a1 - s.a0) * s.r) / 1.0));
        let px = s.cx + s.r * Math.cos(s.a0);
        let py = s.cy + s.r * Math.sin(s.a0);
        grow(px, py);
        for (let i = 1; i <= n; i++) {
          const a = s.a0 + ((s.a1 - s.a0) * i) / n;
          const nx = s.cx + s.r * Math.cos(a);
          const ny = s.cy + s.r * Math.sin(a);
          addPiece(px, py, nx, ny);
          grow(nx, ny);
          px = nx;
          py = ny;
        }
      }
    }
  }
  const NP = SX0.length;
  const Q = { dist: 0, nx: 0, ny: 0, px: 0, py: 0 }; // shared answer object (do not keep it!)

  /** Distance from (x,y) to the nearest road centre-line; Q.n = unit vector pointing away from the road. */
  const queryRoad = (x, y) => {
    let best = Infinity;
    let bx = 0;
    let by = 0;
    for (let i = 0; i < NP; i++) {
      const dx = SDX[i];
      const dy = SDY[i];
      let t = ((x - SX0[i]) * dx + (y - SY0[i]) * dy) * SINV[i];
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = SX0[i] + dx * t;
      const py = SY0[i] + dy * t;
      const d2 = (x - px) * (x - px) + (y - py) * (y - py);
      if (d2 < best) {
        best = d2;
        bx = px;
        by = py;
      }
    }
    const d = Math.sqrt(best);
    Q.dist = d;
    Q.px = bx;
    Q.py = by;
    Q.nx = d > 1e-6 ? (x - bx) / d : 0;
    Q.ny = d > 1e-6 ? (y - by) / d : 0;
    return Q;
  };

  // ---------------------------------------------------- where am I on the route?
  const L = { s: 0, k: 0, dist: 0, lateral: 0, dx: 1, dy: 0, onRoute: false };
  const nearest = (x, y, k0, win) => {
    const a = win == null ? 0 : Math.max(0, k0 - win);
    const b = win == null ? N : Math.min(N, k0 + win);
    let bk = a;
    let bd = Infinity;
    for (let k = a; k <= b; k++) {
      const d2 = (X[k] - x) * (X[k] - x) + (Y[k] - y) * (Y[k] - y);
      if (d2 < bd) {
        bd = d2;
        bk = k;
      }
    }
    return { k: bk, d: Math.sqrt(bd) };
  };
  /** Progress along the route. `hintK` = last known sample (null = search everywhere). */
  const locate = (x, y, hintK) => {
    let best = hintK == null ? nearest(x, y, 0, null) : nearest(x, y, hintK, 16);
    if (hintK != null && best.d > 9) {
      const g = nearest(x, y, 0, null);
      if (g.d <= 9) best = g; // rejoined the route somewhere else
    }
    const k = best.k;
    const rx = x - X[k];
    const ry = y - Y[k];
    const t = clamp(rx * DX[k] + ry * DY[k], -ds, ds);
    L.k = k;
    L.s = clamp(k * ds + t, 0, length);
    L.dist = best.d;
    L.lateral = rx * -DY[k] + ry * DX[k]; // + = to the right of the direction of travel
    L.dx = DX[k];
    L.dy = DY[k];
    L.onRoute = best.d <= 9;
    return L;
  };

  // ------------------------------------------------------------- the signs
  const signOff = Math.max(C.world.signOffset, half + 3.4);
  const startLane = MAP.startLane ?? C.world.laneOffset;
  const signs = (MAP.signs || []).map((p, i) => {
    const def = SIGNS[p.sign];
    if (!def) throw new Error(`map.js: unknown sign "${p.sign}" (add it to signs.js first)`);
    const label = `sign #${i + 1} (${p.sign})`;
    const s = resolveAt(p.at, label);
    const pt = routeAt(s, {});
    const side = p.side === 'left' ? -1 : 1;
    return {
      id: `${p.sign}#${i}`,
      key: p.sign,
      def,
      x: pt.x - pt.dy * side * signOff,
      y: pt.y + pt.dx * side * signOff,
      s,
      dx: pt.dx,
      dy: pt.dy,
      test: { ...(def.test || {}), ...(p.test || {}) },
      zones: p.zones || null,
      until: p.until ? resolveAt(p.until, label + ' until') : null,
    };
  });

  // painted road markings that belong to signs
  const paint = [];
  for (const sg of signs) {
    if (!sg.def.paint) continue;
    const s = sg.s + (sg.test.lineOffset ?? 0);
    const pt = routeAt(s, {});
    paint.push({ kind: sg.def.paint, s, x: pt.x, y: pt.y, dx: pt.dx, dy: pt.dy });
  }
  const fin = routeAt(length, {});
  paint.push({ kind: 'finish', s: length, x: fin.x, y: fin.y, dx: fin.dx, dy: fin.dy });

  // ----------------------------------------------------------------- traffic
  const traffic = (MAP.traffic || []).map((t, i) => ({
    id: t.id || `car${i}`,
    s: resolveAt(t.at, `traffic ${t.id}`),
    kmh: t.kmh,
    spawnBefore: t.spawnBefore ?? 100,
    color: t.color || '#2b6fd6',
  }));


  // ---------------------------------------------------- other cars with their own path
  const makePath = (points) => {
    const cumL = [0];
    for (let i = 1; i < points.length; i++) cumL.push(cumL[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    const total = cumL[cumL.length - 1];
    return {
      length: total,
      at(sv, out = {}) {
        const sc = clamp(sv, 0, total);
        let j = 0;
        while (j < points.length - 2 && cumL[j + 1] < sc) j++;
        const l = cumL[j + 1] - cumL[j] || 1;
        const t = (sc - cumL[j]) / l;
        out.x = points[j][0] + (points[j + 1][0] - points[j][0]) * t;
        out.y = points[j][1] + (points[j + 1][1] - points[j][1]) * t;
        out.dx = (points[j + 1][0] - points[j][0]) / l;
        out.dy = (points[j + 1][1] - points[j][1]) / l;
        return out;
      },
    };
  };
  const npcDefs = (MAP.npcs || []).map((n, i) => ({
    id: n.id || `npc${i}`,
    path: makePath(n.points),
    kmh: n.kmh,
    every: n.every ?? 12,
    loop: !!n.loop, // goes round and round (roundabout traffic)
    count: n.count ?? 1,
    color: n.color || '#8c6bd6',
    lane: n.lane ?? C.traffic.laneOffset,
    mapNpc: true, // counts for the "give way" checks in levels
  }));
  // also let other cars' roads be drivable & drawn
  for (const n of MAP.npcs || []) {
    if (n.road === false) continue;
    const segs = [];
    for (let i = 1; i < n.points.length; i++) segs.push({ type: 'line', x0: n.points[i - 1][0], y0: n.points[i - 1][1], x1: n.points[i][0], y1: n.points[i][1] });
    roads.push({ id: 'npc-road', segs, lane: true });
  }

  // ------------------------------------------------------------- pedestrians
  const peds = (MAP.peds || []).map((p, i) => {
    const s = resolveAt(p.at, `pedestrian ${i + 1}`);
    const pt = routeAt(s, {});
    return {
      id: p.id || `ped${i}`,
      s,
      x: pt.x,
      y: pt.y,
      dx: pt.dx,
      dy: pt.dy,
      nx: -pt.dy, // "right" of the road direction
      ny: pt.dx,
      reach: half + 2.2, // how far from the centre line the kerb waiting spots are
      startSide: p.side === 'right' ? 1 : -1,
      speed: p.speed ?? 1.4,
    };
  });

  // ------------------------------------------------------------ gas stations
  const stations = (MAP.stations || []).map((st, i) => ({ id: `station${i}`, name: st.name || 'Fuel', x: st.x, y: st.y, bay: st.bay || { x: st.x, y: st.y, r: 3.5 }, zone: st.zone || { x: st.x, y: st.y, r: 40 }, pump: st.pump || null, heading: st.heading ?? 0 }));
  for (const st of MAP.stations || []) {
    if (st.road) {
      const segs = [];
      for (let i = 1; i < st.road.length; i++) segs.push({ type: 'line', x0: st.road[i - 1][0], y0: st.road[i - 1][1], x1: st.road[i][0], y1: st.road[i][1] });
      roads.push({ id: 'station-road', segs, lane: false });
    }
  }

  // --------------------------------------------------------------- map pins
  const pins = [];
  for (const p of MAP.pins || []) {
    if (p.at) {
      const s = resolveAt(p.at, `pin ${p.type}`);
      const pt = routeAt(s, {});
      const side = p.side === 'left' ? -1 : 1;
      const po = p.offset ?? Math.max(6, half + 2);
      pins.push({ type: p.type, label: p.label || '', x: pt.x - pt.dy * side * po, y: pt.y + pt.dx * side * po, s });
    } else pins.push({ type: p.type, label: p.label || '', x: p.x, y: p.y, s: null });
  }
  for (const st of stations) pins.push({ type: 'station', label: st.name, x: st.x, y: st.y, s: null });
  for (const pd of peds) pins.push({ type: 'crosswalk', label: '', x: pd.x, y: pd.y, s: pd.s });

  // ----------------------------------------- "signal before turning" checks
  const signalTasks = (MAP.turns || []).map((t, i) => ({ id: `turn${i}`, side: t.side, s: resolveAt(t.at, `turn ${i + 1}`), lead: t.lead ?? 8 }));

  // ----------------------------------------------- turn-by-turn instructions
  const maneuvers = [];
  for (const seg of MAP.route.segments) {
    if (seg.type !== 'arc') continue;
    const sweep = Math.abs(seg.to - seg.from);
    if (sweep < 28) continue;
    const kind = seg.roundabout ? 'roundabout' : seg.to > seg.from ? 'right' : 'left';
    maneuvers.push({ s: segRanges[seg.id][0], type: kind, id: seg.id });
  }
  const mission = MAP.mission
    ? {
        ...MAP.mission,
        pickup: MAP.mission.pickup ? { ...MAP.mission.pickup, s: resolveAt(MAP.mission.pickup.at, 'pickup'), ...(() => { const q = routeAt(resolveAt(MAP.mission.pickup.at, 'pickup'), {}); return { x: q.x - q.dy * 6, y: q.y + q.dx * 6 }; })() } : null,
      }
    : null;
  if (mission && mission.pickup) pins.push({ type: 'pickup', label: mission.pickup.name, x: mission.pickup.x, y: mission.pickup.y, s: mission.pickup.s });
  if (mission && mission.dest) {
    // where you stop (beside the road, near the end) and her house behind it
    const q = routeAt(length - 6, {});
    mission.destSpot = { x: q.x - q.dy * 6.5, y: q.y + q.dx * 6.5, s: length - 6 };
    mission.house = { x: q.x - q.dy * (half + 12), y: q.y + q.dx * (half + 12), heading: Math.atan2(q.dy, q.dx) };
    pins.push({ type: 'home', label: mission.dest.name, x: mission.house.x, y: mission.house.y - 0.01, s: length });
  }


  // ------------------------------------------- level extras (lanes, obstacles, refuel ...)
  const onRoute = (at, label, lateral = 0) => {
    const s = resolveAt(at, label);
    const pt = routeAt(s, {});
    return { s, x: pt.x - pt.dy * lateral, y: pt.y + pt.dx * lateral, dx: pt.dx, dy: pt.dy };
  };
  const obstacles = (MAP.obstacles || []).map((o, i) => ({ id: `obst${i}`, ...onRoute(o.at, `obstacle ${i + 1}`, o.lane ?? startLane) }));
  for (const o of obstacles) pins.push({ type: 'hazard', label: 'Stopped car', x: o.x - o.dy * (half + 2), y: o.y + o.dx * (half + 2), s: o.s });
  const hazardStops = (MAP.hazardStops || []).map((h, i) => ({ id: `hstop${i}`, ...onRoute(h.at, `breakdown spot ${i + 1}`, startLane) }));
  for (const h of hazardStops) pins.push({ type: 'breakdown', label: 'Breakdown spot', x: h.x - h.dy * (half + 1.5), y: h.y + h.dx * (half + 1.5), s: h.s });
  const laneTasks = (MAP.lanes || []).map((l, i) => ({ id: `lane${i}`, to: l.to, window: l.window ?? 80, divider: l.divider ?? (MAP.laneDividers ? MAP.laneDividers[0] : 3.75), s: resolveAt(l.at, `lane change ${i + 1}`) }));
  const refuel = MAP.refuel ? { litres: MAP.refuel.litres ?? 10, ...onRoute(MAP.refuel.at, 'refuel') } : null;
  const laneDividers = MAP.laneDividers || [];

  // --------------------------------------------------- oncoming traffic on the route
  //  Cars drive the route the other way, in their own lane. Not through roundabouts
  //  (they would go round the wrong way), so they start after the last one.
  if (MAP.oncoming) {
    let sFrom = 0;
    for (const sg of MAP.route.segments) if (sg.roundabout) sFrom = Math.max(sFrom, segRanges[sg.id][1] + 12);
    const pts = [];
    for (let k = N; k >= 0 && k * ds >= sFrom; k -= 3) pts.push([X[k], Y[k]]);
    if (pts.length > 10) npcDefs.push({ id: 'oncoming', path: makePath(pts), kmh: MAP.oncoming.kmh ?? 36, every: MAP.oncoming.every ?? 13, color: '#5f7fbf', lane: C.traffic.laneOffset, oncoming: true, policeEvery: MAP.oncoming.policeEvery ?? 4 });
  }

  // ------------------------------------------- side streets, cars in your lane, walkers
  //  legs:   side streets that meet the route; cars come out of them, wait for you when
  //          you have priority, then join your lane (in front of you) or the other lane.
  //  flow:   cars driving the route in your direction, slower than the limit, so you can
  //          queue behind them or overtake. They turn off into a side street before any
  //          spot where the exam needs the lane (stopped car, refuel, pickup, finish...).
  const lane = C.traffic.laneOffset;
  const fwdPts = [];
  for (let k = 0; k <= N; k += 3) fwdPts.push([X[k], Y[k]]);
  if (fwdPts[fwdPts.length - 1][0] !== X[N]) fwdPts.push([X[N], Y[N]]);
  const flowDef = { id: 'flow', path: makePath(fwdPts), lane, flow: true, kmh: 35 };
  const oncDef = npcDefs.find((d) => d.oncoming) || null;
  const oncFrom = oncDef ? length - oncDef.path.length : Infinity;
  // stretches the flow cars must leave free
  const blockedS = [[length - 40, length + 1]];
  for (const o of obstacles) blockedS.push([o.s - 45, o.s + 25]);
  for (const hz of hazardStops) blockedS.push([hz.s - 45, hz.s + 25]);
  for (const l of laneTasks) blockedS.push([l.s - l.window - 30, l.s + l.window + 20]);
  if (refuel) blockedS.push([refuel.s - 60, refuel.s + 30]);
  if (mission && mission.pickup) blockedS.push([mission.pickup.s - 50, mission.pickup.s + 20]);
  if (mission && mission.destSpot) blockedS.push([mission.destSpot.s - 60, length + 1]);
  for (const stn of stations) {
    let a = Infinity;
    let b = -Infinity;
    for (let k = 0; k <= N; k += 2) if (Math.hypot(X[k] - stn.x, Y[k] - stn.y) < 40) (a = Math.min(a, k * ds)), (b = Math.max(b, k * ds));
    if (a < b) blockedS.push([a - 25, b + 15]);
  }
  for (const t of MAP.traffic || []) blockedS.push([resolveAt(t.at, 'slow car') - 30, resolveAt(t.at, 'slow car') + 260]);
  const ringS = MAP.route.segments.filter((sg) => sg.roundabout).map((sg) => segRanges[sg.id]);
  const isBlocked = (sv) => blockedS.some(([a, b]) => sv >= a && sv <= b);
  const nextBlocked = (sv) => Math.min(...blockedS.filter(([a, b]) => b >= sv).map(([a]) => Math.max(a, sv)));

  const bez = (P0, d0, P3, d3, out) => {
    const k = Math.hypot(P3[0] - P0[0], P3[1] - P0[1]) * 0.42;
    const P1 = [P0[0] + d0[0] * k, P0[1] + d0[1] * k];
    const P2 = [P3[0] - d3[0] * k, P3[1] - d3[1] * k];
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      const u = 1 - t;
      out.push([u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]]);
    }
    return out;
  };
  const laneAt = (sv, dir) => {
    const q = routeAt(Math.max(0, Math.min(length, sv)), {});
    const o = dir > 0 ? lane : -lane;
    return { p: [q.x - q.dy * o, q.y + q.dx * o], d: [q.dx * dir, q.dy * dir] };
  };
  const segPt = (x, y, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
  };
  const minorAt = (sE) => signs.some((sg) => (sg.key === 'stop' || sg.key === 'giveWay') && sg.s > sE - 45 && sg.s < sE + 3);
  const legs = [];
  for (const r of allExtra) {
    if (!r.leg || !segRanges[r.leg.seg]) continue;
    const [K0, K1] = [r.leg.K[0], r.leg.K[1]];
    const Q = r.points[r.points.length - 1];
    const len = Math.hypot(Q[0] - K0, Q[1] - K1);
    if (len < half + 14) continue;
    const u = [(Q[0] - K0) / len, (Q[1] - K1) / len];
    const range = segRanges[r.leg.seg];
    const sE = r.leg.s ?? (r.leg.turn ? range[0] : range[1]);
    const sX = r.leg.s ?? range[1];
    if (ringS.some(([a, b]) => sE > a - 25 && sE < b + 25)) continue;
    // streets the level already uses for its own cross traffic stay theirs
    const nearNpcRoad = (MAP.npcs || []).some((nd) => !nd.loop && nd.points.some((pt, i) => i > 0 && segPt(K0 + u[0] * 15, K1 + u[1] * 15, nd.points[i - 1], pt) < 8));
    if (nearNpcRoad) continue;
    const inR = [u[1] * lane, -u[0] * lane]; // right-hand lane when driving towards the route
    const outR = [-u[1] * lane, u[0] * lane]; // right-hand lane when driving away from it
    const stopD = half + 3;
    const S = [K0 + u[0] * stopD + inR[0], K1 + u[1] * stopD + inR[1]];
    const leg = { id: r.id, K: [K0, K1], Q, u, sE, sX, minor: minorAt(sE), stopAt: Math.hypot(Q[0] + inR[0] - S[0], Q[1] + inR[1] - S[1]), timer: 3 + (legs.length % 5) * 2 };
    // into your lane (ahead of the junction) or into the other lane (behind it)
    const din = [-u[0], -u[1]];
    const toFlow = laneAt(sX + 9, 1);
    const toOnc = laneAt(sE - 9, -1);
    if (!isBlocked(sX + 9)) leg.inFlow = { id: `in-${r.id}-f`, path: makePath(bez(S, din, toFlow.p, toFlow.d, [[Q[0] + inR[0], Q[1] + inR[1]], S])), lane: 0, feeder: true, leg, join: 'flow', joinS: sX + 9 };
    if (oncDef && sE - 9 > oncFrom + 8) leg.inOnc = { id: `in-${r.id}-o`, path: makePath(bez(S, din, toOnc.p, toOnc.d, [[Q[0] + inR[0], Q[1] + inR[1]], S])), lane: 0, feeder: true, leg, join: 'onc', joinS: length - (sE - 9) };
    // a car in your lane turning off into this street
    const from = laneAt(sE - 9, 1);
    const B = [K0 + u[0] * stopD + outR[0], K1 + u[1] * stopD + outR[1]];
    leg.exitS = sE - 9;
    if (!isBlocked(leg.exitS)) leg.out = { id: `out-${r.id}`, path: makePath([...bez(from.p, from.d, B, u, [from.p]), [Q[0] + outR[0], Q[1] + outR[1]]]), lane: 0, exit: true, leg };
    if (leg.inFlow || leg.inOnc || leg.out) legs.push(leg);
  }
  legs.sort((a, b) => a.exitS - b.exitS);
  /** pick where a car in your lane at s will turn off (or null if it cannot) */
  const planExit = (sv, rand = Math.random) => {
    const stop = nextBlocked(sv);
    const options = legs.filter((l) => l.out && l.exitS > sv + 12 && l.exitS < stop - 4);
    if (!options.length) return null;
    for (const l of options) if (rand() < 0.25) return l;
    return options[options.length - 1];
  };
  // posted speed limit along the route
  const speedMarks = signs.filter((sg) => sg.test.type === 'speed').map((sg) => [sg.s, sg.test.kmh]).sort((a, b) => a[0] - b[0]);
  const limitAt = (sv) => {
    let lim = 50;
    for (const [a, k] of speedMarks) if (a <= sv) lim = k;
    return lim;
  };
  const flowStops = signs.filter((sg) => sg.key === 'stop').map((sg) => sg.s + (sg.test.lineOffset ?? 4) - 2);
  const flowSlow = [
    ...signs.filter((sg) => sg.key === 'giveWay').map((sg) => [sg.s, sg.s + 14, 16]),
    ...ringS.map(([a, b]) => [a - 12, b + 6, 20]),
    ...MAP.route.segments.filter((sg) => sg.type === 'arc' && !sg.roundabout).map((sg) => [segRanges[sg.id][0] - 6, segRanges[sg.id][1], Math.min(45, Math.sqrt(3.2 * sg.radius) * 3.6)]),
  ];
  const trafficNet = { flowDef, oncDef, legs, planExit, isBlocked, limitAt, flowStops, flowSlow, ringS };

  // people walking on the pavements (decoration, they never step onto the road)
  const walkers = [];
  {
    const wr = mulberry32((MAP.seed ?? 7) + 99);
    const busy = MAP.decor && MAP.decor.style === 'city' ? 1 : 0.6;
    for (let sv = 20; sv < length - 20; sv += 14 + wr() * 22) {
      if (wr() > busy) continue;
      if (ringS.some(([a, b]) => sv > a - 20 && sv < b + 20)) continue;
      const side = wr() < 0.5 ? 1 : -1;
      walkers.push({ s: sv, s0: sv - 12 - wr() * 18, s1: sv + 12 + wr() * 18, dir: wr() < 0.5 ? 1 : -1, off: side * (half + 1.7 + wr() * 0.8), speed: 0.9 + wr() * 0.6, shirt: ['#2b4c8c', '#c0392b', '#2e8b57', '#8e44ad', '#e67e22', '#34495e', '#d35400', '#16a085'][Math.floor(wr() * 8)], hair: ['#4a2f23', '#1d1d1d', '#c9a227', '#7b3f00'][Math.floor(wr() * 4)] });
    }
  }

  // ------------------------------------------------------ scenery (decoration)
  //  Built along the route: apartment blocks in the city, houses with gardens in the
  //  suburbs, street lamps, parked cars, then trees and bushes fill the rest.
  //  MAP.decor = { style: 'city' | 'suburb' | 'mixed', zones: [[routePieceId, style], ...] }
  const rnd = mulberry32(MAP.seed ?? 20240611);
  const rings = (MAP.rings || []).map((r) => ({ ...r, island: Math.max(1, r.r - half - 0.7) }));
  const decor = { style: 'mixed', zones: [], lamps: true, ...(MAP.decor || {}) };
  const houses = []; // buildings: { x, y, w, h, angle, kind: 'house' | 'block', roof }
  const lots = []; // parking areas in front of blocks
  const parked = []; // parked cars (decoration only)
  const lamps = [];
  const trees = [];
  const bushes = [];
  const m = 70;
  const bx0 = minX - m;
  const bx1 = maxX + m;
  const by0 = minY - m;
  const by1 = maxY + m;
  const roofs = ['#b5543c', '#a8483a', '#c26a4a', '#8c5a4a', '#9a7b58', '#7d8793', '#6d7f5a'];
  const blockRoofs = ['#8d949c', '#9aa1a8', '#7f8790', '#a3a29a'];
  const carColors = ['#c0392b', '#2c3e50', '#ecf0f1', '#7f8c8d', '#2980b9', '#16a085', '#d35400', '#8e44ad', '#f1c40f'];

  // keep the Final Boss spots (pick-up, her house) free
  const keepClear = [mission && mission.house, mission && mission.pickup].filter(Boolean);
  const blocked = (x, y, pad) => keepClear.some((k) => Math.hypot(x - k.x, y - k.y) < 15 + pad);
  const nearRing = (x, y, pad) => rings.some((r) => Math.hypot(x - r.cx, y - r.cy) < r.r + half + pad);
  const styleAt = (sv) => {
    for (const [id, st] of decor.zones) if (segRanges[id] && sv >= segRanges[id][0] && sv <= segRanges[id][1]) return st;
    return decor.style;
  };
  const inRect = (o, x, y, pad) => {
    const c = Math.cos(-o.angle);
    const sn = Math.sin(-o.angle);
    const lx = (x - o.x) * c - (y - o.y) * sn;
    const ly = (x - o.x) * sn + (y - o.y) * c;
    return Math.abs(lx) < o.w / 2 + pad && Math.abs(ly) < o.h / 2 + pad;
  };
  const rectPoints = (x, y, w, h, ang) => {
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    const out = [];
    for (const [u, v] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) out.push([x + (u * w * c) / 2 - (v * h * sn) / 2, y + (u * w * sn) / 2 + (v * h * c) / 2]);
    return out;
  };
  const fits = (x, y, w, h, ang, roadPad) => {
    if (rectPoints(x, y, w, h, ang).some(([px, py]) => queryRoad(px, py).dist < half + roadPad || nearRing(px, py, 5) || blocked(px, py, 3))) return false;
    const rr = Math.hypot(w, h) / 2;
    if (houses.some((o) => Math.hypot(o.x - x, o.y - y) < (rr + Math.hypot(o.w, o.h) / 2) * 0.82)) return false;
    return true;
  };

  // buildings along both sides of the route
  const tmpP = {};
  const placeAlong = (sv, side) => {
    const st = styleAt(sv);
    const city = st === 'city' || (st === 'mixed' && rnd() < 0.45);
    const p = routeAt(sv, tmpP);
    const ang = Math.atan2(p.dy, p.dx);
    const nx = -p.dy * side;
    const ny = p.dx * side;
    if (city) {
      const w = 28 + rnd() * 14;
      const h = 11 + rnd() * 2.5;
      const off = half + 10 + h / 2;
      const x = p.x + nx * off;
      const y = p.y + ny * off;
      if (!fits(x, y, w, h, ang, 4)) return 0;
      houses.push({ x, y, w, h, angle: ang, kind: 'block', roof: blockRoofs[Math.floor(rnd() * blockRoofs.length)], floors: 4 + Math.floor(rnd() * 7) });
      // a small car park between the block and the road
      const lotOff = half + 5;
      const lot = { x: p.x + nx * lotOff, y: p.y + ny * lotOff, w: w * 0.8, h: 6, angle: ang };
      if (rectPoints(lot.x, lot.y, lot.w, lot.h, ang).every(([px, py]) => queryRoad(px, py).dist >= half + 1.2)) {
        lots.push(lot);
        const n = Math.floor(lot.w / 3);
        for (let i = 0; i < n; i++) {
          if (rnd() < 0.35) continue;
          const t = (i - (n - 1) / 2) * 3;
          parked.push({ x: lot.x + Math.cos(ang) * t, y: lot.y + Math.sin(ang) * t, heading: ang + Math.PI / 2 * (rnd() < 0.5 ? 1 : -1), length: 4.2, width: 1.8, color: carColors[Math.floor(rnd() * carColors.length)] });
        }
      }
      return w;
    }
    const w = 9 + rnd() * 4;
    const h = 8 + rnd() * 3;
    const off = half + 7.5 + h / 2;
    const x = p.x + nx * off;
    const y = p.y + ny * off;
    if (!fits(x, y, w + 4, h + 4, ang, 3)) return 0;
    houses.push({ x, y, w, h, angle: ang, kind: 'house', roof: roofs[Math.floor(rnd() * roofs.length)], garden: true });
    return w + 6;
  };
  for (const side of [1, -1]) {
    let sv = 14 + rnd() * 10;
    while (sv < length - 10) {
      const used = placeAlong(sv, side);
      sv += (used || 8) + 5 + rnd() * 8;
    }
  }

  // street lamps just outside the curb, both sides
  if (decor.lamps) {
    for (const side of [1, -1]) {
      for (let sv = 10; sv < length; sv += 32) {
        const p = routeAt(sv, tmpP);
        const x = p.x - p.dy * side * (half + 1.6);
        const y = p.y + p.dx * side * (half + 1.6);
        if (queryRoad(x, y).dist < half + 1.2 || nearRing(x, y, 1) || houses.some((o) => inRect(o, x, y, 1))) continue;
        lamps.push({ x, y, ang: Math.atan2(p.dy, p.dx) + (side > 0 ? Math.PI / 2 : -Math.PI / 2) });
      }
    }
  }

  // police car parked at police pins
  for (const pn of pins) if (pn.type === 'police') {
    const loc = routeAt(pn.s ?? 0, tmpP);
    parked.push({ x: pn.x, y: pn.y, heading: Math.atan2(loc.dy, loc.dx), length: 4.6, width: 1.85, color: '#f4f6f8', police: true });
  }

  // trees and bushes fill the rest (more where there is room)
  const free = (x, y, r) =>
    !(queryRoad(x, y).dist < half + r + 2.2 || blocked(x, y, r) || houses.some((o) => inRect(o, x, y, r + (o.garden ? 2.5 : 1.2))) || lots.some((o) => inRect(o, x, y, r + 0.5)));
  const area = (bx1 - bx0) * (by1 - by0);
  const treeMax = Math.min(900, Math.round(area / 260));
  for (let attempt = 0; attempt < treeMax * 6 && trees.length < treeMax; attempt++) {
    const x = bx0 + rnd() * (bx1 - bx0);
    const y = by0 + rnd() * (by1 - by0);
    const r = 1.5 + rnd() * 2.1;
    if (!free(x, y, r)) continue;
    if (nearRing(x, y, r + 1) && !rings.some((rg) => Math.hypot(x - rg.cx, y - rg.cy) < rg.island - r)) continue;
    if (trees.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 0.4)) continue;
    trees.push({ x, y, r, shade: rnd() });
  }
  const bushMax = Math.min(500, Math.round(area / 500));
  for (let attempt = 0; attempt < bushMax * 5 && bushes.length < bushMax; attempt++) {
    const x = bx0 + rnd() * (bx1 - bx0);
    const y = by0 + rnd() * (by1 - by0);
    const r = 0.6 + rnd() * 0.8;
    if (!free(x, y, r) || nearRing(x, y, r + 1)) continue;
    if (trees.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r)) continue;
    bushes.push({ x, y, r, flower: rnd() < 0.25 ? ['#ff8fab', '#ffd166', '#f4f1de', '#c77dff'][Math.floor(rnd() * 4)] : null });
  }

  return {
    roadWidth: MAP.roadWidth,
    half,
    warnings,
    roads,
    rings,
    signs,
    paint,
    traffic,
    npcDefs,
    trafficNet,
    walkers,
    peds,
    stations,
    pins,
    signalTasks,
    maneuvers,
    mission,
    obstacles,
    hazardStops,
    laneTasks,
    refuel,
    laneDividers,
    startLane,
    weather: MAP.weather || 'day',
    houses,
    lots,
    parked,
    lamps,
    bushes,
    trees,
    bounds: { minX, minY, maxX, maxY },
    route: { length, ds, N, X, Y, DX, DY, segRanges, at: routeAt, locate },
    queryRoad,
    start: (() => {
      const p = routeAt(0, {});
      return { x: p.x - p.dy * startLane, y: p.y + p.dx * startLane, heading: Math.atan2(p.dy, p.dx) };
    })(),
  };
}
