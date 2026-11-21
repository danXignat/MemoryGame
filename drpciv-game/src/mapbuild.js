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
      const off = side * (half + 1.7 + wr() * 0.8);
      // keep the whole walk on the pavement: stop where it would step onto any road
      const clearAt = (t) => {
        if (t < 0 || t > length) return false;
        const q = routeAt(t, {});
        return queryRoad(q.x - q.dy * off, q.y + q.dx * off).dist > half + 0.8;
      };
      if (!clearAt(sv)) continue;
      let w0 = sv;
      let w1 = sv;
      const want0 = sv - 12 - wr() * 18;
      const want1 = sv + 12 + wr() * 18;
      while (w0 - 1 > want0 && clearAt(w0 - 1)) w0 -= 1;
      while (w1 + 1 < want1 && clearAt(w1 + 1)) w1 += 1;
      if (w1 - w0 < 6) continue;
      walkers.push({ s: sv, s0: w0, s1: w1, dir: wr() < 0.5 ? 1 : -1, off, speed: 0.9 + wr() * 0.6, shirt: ['#2b4c8c', '#c0392b', '#2e8b57', '#8e44ad', '#e67e22', '#34495e', '#d35400', '#16a085'][Math.floor(wr() * 8)], hair: ['#4a2f23', '#1d1d1d', '#c9a227', '#7b3f00'][Math.floor(wr() * 4)] });
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
  const blockLooks = [
    { wall: '#e9d9b8', roof: '#b9a493', accent: '#c9843c' }, // sand, brown roof, ochre strip
    { wall: '#e8c7c0', roof: '#b3a2a8', accent: '#b8505a' }, // dusty pink
    { wall: '#cfdbe3', roof: '#9fb0be', accent: '#3d79a8' }, // pale blue
    { wall: '#dfe0d2', roof: '#a9b09a', accent: '#6d9a58' }, // greenish white
    { wall: '#e6e1d8', roof: '#b4b8bd', accent: '#d2a02a' }, // off-white, mustard
    { wall: '#d6c5b4', roof: '#a8917f', accent: '#8d4b36' }, // clay
  ];
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
    if (rectPoints(x, y, w, h, ang).some(([px, py]) => queryRoad(px, py).dist < half + roadPad || nearRing(px, py, 5) || blocked(px, py, 3) || (typeof solidRegion === 'function' && solidRegion(px, py)))) return false;
    const rr = Math.hypot(w, h) / 2;
    if (houses.some((o) => Math.hypot(o.x - x, o.y - y) < (rr + Math.hypot(o.w, o.h) / 2) * 0.82)) return false;
    return true;
  };

  // ------------------------------------------------- Brașov geography of the district
  //  MAP.geo = { regions: [{ type, side, depth, name, letters }], rail: { side, name },
  //              landmarks: [{ kind, name, at (0..1 along the route), side (1 right / -1 left) }] }
  //  Regions sit just outside the area the route covers, on one side (n / s / e / w),
  //  so the road never runs through a lake or a mountain.
  const geo = MAP.geo || {};
  const regions = [];
  const geoLabels = [];
  const railLines = [];
  const pointInPoly = (x, y, pts) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) inside = !inside;
    }
    return inside;
  };
  const sideBand = (side, gap, depth, wobble, span = 1) => {
    // a band along one side of the route area with a wavy inner edge
    const pts = [];
    const n = 28;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const hw = ((maxX - minX) / 2 + 60) * span;
    const hh = ((maxY - minY) / 2 + 60) * span;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const wv = Math.sin(t * 9.1 + gap) * wobble + Math.sin(t * 23.7) * wobble * 0.4;
      if (side === 's') pts.push([cx - hw + 2 * hw * t, maxY + gap + wv]);
      if (side === 'n') pts.push([cx - hw + 2 * hw * t, minY - gap - wv]);
      if (side === 'e') pts.push([maxX + gap + wv, cy - hh + 2 * hh * t]);
      if (side === 'w') pts.push([minX - gap - wv, cy - hh + 2 * hh * t]);
    }
    const outer = pts.slice().reverse().map(([x, y]) => (side === 's' ? [x, y + depth] : side === 'n' ? [x, y - depth] : side === 'e' ? [x + depth, y] : [x - depth, y]));
    return [...pts, ...outer];
  };
  // a blob region (lake, park) beside the route
  const blob = (x, y, rx, ry, seed) => {
    const pts = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const k = 1 + Math.sin(a * 3 + seed) * 0.12 + Math.sin(a * 5 + seed * 2) * 0.07;
      pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
    }
    return pts;
  };
  const sideCenter = (side, gap) => {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return side === 's' ? [cx, maxY + gap] : side === 'n' ? [cx, minY - gap] : side === 'e' ? [maxX + gap, cy] : [minX - gap, cy];
  };
  for (const r of geo.regions || []) {
    const gap = r.gap ?? 16;
    const depth = r.depth ?? 70;
    let pts;
    if (r.type === 'lake' || r.type === 'park') {
      // right beside the route, where it comes closest to that side, without touching any road
      const dir = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[r.side] || [0, 1];
      let bestK = 0;
      let bestV = -Infinity;
      for (let k = 0; k <= N; k += 4) {
        const v = X[k] * dir[0] + Y[k] * dir[1];
        if (v > bestV) (bestV = v), (bestK = k);
      }
      let rx = r.rx ?? 70;
      let ry = r.ry ?? 35;
      for (let tries = 0; tries < 8; tries++) {
        const cx = X[bestK] + dir[0] * (half + 12 + (dir[1] ? ry : rx));
        const cy = Y[bestK] + dir[1] * (half + 12 + (dir[1] ? ry : rx));
        pts = blob(cx, cy, rx, ry, regions.length + 1);
        if (pts.every(([x, y]) => queryRoad(x, y).dist > half + 5)) break;
        rx *= 0.85;
        ry *= 0.85;
      }
    } else pts = sideBand(r.side, gap, depth, r.type === 'mountain' ? 6 : 3, r.span ?? 1);
    const reg = { type: r.type, pts, name: r.name || null, letters: r.letters || null, side: r.side };
    let sx = 0;
    let sy = 0;
    for (const [x, y] of pts) (sx += x), (sy += y);
    reg.cx = sx / pts.length;
    reg.cy = sy / pts.length;
    // the label sits on the part closest to the road, where you can see it
    const [lx, ly] = r.type === 'lake' || r.type === 'park' ? [reg.cx, reg.cy] : sideCenter(r.side, gap + 22);
    reg.lx = lx;
    reg.ly = ly;
    regions.push(reg);
    if (reg.name) {
      const lab = { x: lx, y: ly, text: reg.name, kind: r.type };
      if (r.type !== 'lake' && r.type !== 'park') {
        const horiz = r.side === 'n' || r.side === 's';
        const inner = r.side === 's' ? maxY + gap + 16 : r.side === 'n' ? minY - gap - 16 : r.side === 'e' ? maxX + gap + 16 : minX - gap - 16;
        lab.line = { horiz, at: inner, min: horiz ? minX - 40 : minY - 40, max: horiz ? maxX + 40 : maxY + 40 };
      }
      geoLabels.push(lab);
    }
  }
  if (geo.rail) {
    const side = geo.rail.side;
    const gap = geo.rail.gap ?? 22;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const horiz = side === 'n' || side === 's';
    const len = horiz ? maxX - minX + 160 : maxY - minY + 160;
    for (let k = 0; k < (geo.rail.tracks ?? 3); k++) {
      const off = gap + k * 4.5;
      const a = horiz ? [cx - len / 2, side === 's' ? maxY + off : minY - off] : [side === 'e' ? maxX + off : minX - off, cy - len / 2];
      const b = horiz ? [cx + len / 2, a[1]] : [a[0], cy + len / 2];
      railLines.push({ a, b });
    }
    const first = railLines[0];
    const last = railLines[railLines.length - 1];
    const pad = 3;
    const ballast = horiz
      ? [[first.a[0], first.a[1] - pad * Math.sign(last.a[1] - first.a[1] || 1)], [first.b[0], first.b[1] - pad * Math.sign(last.a[1] - first.a[1] || 1)], [last.b[0], last.b[1] + pad * Math.sign(last.a[1] - first.a[1] || 1)], [last.a[0], last.a[1] + pad * Math.sign(last.a[1] - first.a[1] || 1)]]
      : [[first.a[0] - pad * Math.sign(last.a[0] - first.a[0] || 1), first.a[1]], [first.b[0] - pad * Math.sign(last.a[0] - first.a[0] || 1), first.b[1]], [last.b[0] + pad * Math.sign(last.a[0] - first.a[0] || 1), last.b[1]], [last.a[0] + pad * Math.sign(last.a[0] - first.a[0] || 1), last.a[1]]];
    regions.push({ type: 'rail', pts: ballast, cx: (first.a[0] + last.b[0]) / 2, cy: (first.a[1] + last.b[1]) / 2 });
    if (geo.rail.name) {
      const [lx, ly] = sideCenter(side, gap - 6);
      geoLabels.push({ x: lx, y: ly, text: geo.rail.name, kind: 'rail' });
    }
  }
  const inRegion = (x, y, types) => regions.some((r) => (!types || types.includes(r.type)) && pointInPoly(x, y, r.pts));
  const solidRegion = (x, y) => inRegion(x, y, ['lake', 'rail', 'mountain', 'forest', 'field', 'plaza', 'park']);

  // landmarks: special buildings placed beside the route
  const LANDMARK = {
    blackchurch: { w: 44, h: 20, kind: 'church', wall: '#8a7f74', roof: '#5b5855', height: 16, tower: { w: 9, h: 9, height: 42, at: -0.5 }, label: 'Biserica Neagră' },
    church: { w: 20, h: 10, kind: 'church', wall: '#f1ebe0', roof: '#5a5f66', height: 8, tower: { w: 5, h: 5, height: 24, at: -0.5 } },
    townhall: { w: 22, h: 14, kind: 'house', wall: '#efc76a', roof: '#a8483a', height: 9, tower: { w: 5, h: 5, height: 26, at: 0 } },
    mall: { w: 70, h: 34, kind: 'block', wall: '#dfe4ea', roof: '#b7bec7', floors: 3, sign: 'CORESI' },
    factory: { w: 56, h: 30, kind: 'factory', wall: '#c9c2b4', roof: '#9aa0a6', height: 10 },
    station: { w: 60, h: 14, kind: 'block', wall: '#e9dfc9', roof: '#8c5a4a', floors: 2, sign: 'GARA BRAȘOV' },
    drpciv: { w: 34, h: 18, kind: 'block', wall: '#e3e7ec', roof: '#7f8790', floors: 3, sign: 'DRPCIV' },
    school: { w: 26, h: 12, kind: 'house', wall: '#e7dcc3', roof: '#7a4a3a', height: 8, tower: { w: 4, h: 4, height: 18, at: 0.4 } },
  };
  const landmarkAt = (lm) => {
    const spec = { ...LANDMARK[lm.kind] };
    if (!spec.w) return;
    // try spots near the wished place, both sides if needed
    for (let tries = 0; tries < 40; tries++) {
      const f = Math.min(0.95, Math.max(0.05, (lm.at ?? 0.5) + (tries % 2 ? 1 : -1) * Math.ceil(tries / 2) * 0.025));
      const side = tries > 20 ? -(lm.side ?? 1) : lm.side ?? 1;
      const p = routeAt(length * f, {});
      const ang = Math.atan2(p.dy, p.dx);
      const nx = -p.dy * side;
      const ny = p.dx * side;
      const off = half + 9 + spec.h / 2;
      const x = p.x + nx * off;
      const y = p.y + ny * off;
      if (!fits(x, y, spec.w + 2, spec.h + 2, ang, 5)) continue;
      const h = { x, y, w: spec.w, h: spec.h, angle: ang, kind: spec.kind, roof: spec.roof, wall: spec.wall, height: spec.height, floors: spec.floors, sign: spec.sign || null, landmark: true };
      houses.push(h);
      if (spec.tower) {
        const t = spec.tower;
        const u = (t.at * spec.w) / 2;
        houses.push({ x: x + Math.cos(ang) * u, y: y + Math.sin(ang) * u, w: t.w, h: t.h, angle: ang, kind: 'tower', roof: spec.roof, wall: spec.wall, height: t.height, landmark: true });
      }
      // the label slides along the side of the building that faces the road
      geoLabels.push({ x, y, text: lm.name || spec.label || '', kind: 'landmark', rect: { x: x - nx * (spec.h / 2 - 1), y: y - ny * (spec.h / 2 - 1), w: spec.w, angle: ang } });
      return;
    }
  };
  for (const lm of geo.landmarks || []) landmarkAt(lm);

  // buildings along both sides of the route
  const tmpP = {};
  const facades = ['#e8c27a', '#d98e73', '#9fc5a8', '#e6d3a3', '#c9a0c9', '#f0e2c0', '#b8d0e0', '#e5a96b'];
  const placeAlong = (sv, side) => {
    const st = styleAt(sv);
    if (st === 'forest') return 0;
    if (st === 'oldtown') {
      // old centre: two- and three-storey houses wall to wall, right on the pavement
      const p = routeAt(sv, tmpP);
      const ang = Math.atan2(p.dy, p.dx);
      const nx = -p.dy * side;
      const ny = p.dx * side;
      const w = 7 + rnd() * 4;
      const h = 9 + rnd() * 3;
      const off = half + 2.8 + h / 2;
      const x = p.x + nx * off;
      const y = p.y + ny * off;
      if (!fits(x, y, w, h, ang, 2.3)) return 0;
      houses.push({ x, y, w, h, angle: ang, kind: 'house', roof: ['#b5543c', '#a8483a', '#c26a4a', '#9c4434'][Math.floor(rnd() * 4)], wall: facades[Math.floor(rnd() * facades.length)], height: 6 + Math.floor(rnd() * 3) * 2.6 });
      return w - 0.2;
    }
    if (st === 'industrial') {
      const p = routeAt(sv, tmpP);
      const ang = Math.atan2(p.dy, p.dx);
      const nx = -p.dy * side;
      const ny = p.dx * side;
      const w = 34 + rnd() * 18;
      const h = 20 + rnd() * 8;
      const off = half + 12 + h / 2;
      const x = p.x + nx * off;
      const y = p.y + ny * off;
      if (!fits(x, y, w, h, ang, 6)) return 0;
      houses.push({ x, y, w, h, angle: ang, kind: 'factory', roof: '#9aa0a6', wall: '#c9c2b4', height: 8 + rnd() * 3 });
      return w + 4;
    }
    if (st === 'village') {
      // village houses close to the street, long gardens and a strip of field behind
      const p = routeAt(sv, tmpP);
      const ang = Math.atan2(p.dy, p.dx);
      const nx = -p.dy * side;
      const ny = p.dx * side;
      const w = 9 + rnd() * 3;
      const h = 7 + rnd() * 2;
      const off = half + 6 + h / 2;
      const x = p.x + nx * off;
      const y = p.y + ny * off;
      if (!fits(x, y, w + 4, h + 4, ang, 3)) return 0;
      houses.push({ x, y, w, h, angle: ang, kind: 'house', roof: roofs[Math.floor(rnd() * roofs.length)], wall: ['#f3ead6', '#e9dcc0', '#dbe6d0', '#f1e1c6'][Math.floor(rnd() * 4)], garden: true });
      const fx = x + nx * (h / 2 + 16);
      const fy = y + ny * (h / 2 + 16);
      const fpts = rectPoints(fx, fy, w + 4, 24, ang).slice(1, 5);
      if (fpts.every(([px, py]) => queryRoad(px, py).dist > half + 4)) regions.push({ type: 'field', pts: [fpts[0], fpts[1], fpts[3], fpts[2]], cx: fx, cy: fy, ang, crop: rnd() });
      return w + 6;
    }
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
      // Romanian apartment blocks: pastel render, a coloured stairwell strip, balconies on some
      const look = blockLooks[Math.floor(rnd() * blockLooks.length)];
      houses.push({ x, y, w, h, angle: ang, kind: 'block', roof: look.roof, wall: look.wall, accent: look.accent, balconies: rnd() < 0.6, floors: 4 + Math.floor(rnd() * 7) });
      // a small car park between the block and the road
      const lotOff = half + 5;
      const lot = { x: p.x + nx * lotOff, y: p.y + ny * lotOff, w: w * 0.8, h: 6, angle: ang };
      if (rectPoints(lot.x, lot.y, lot.w, lot.h, ang).every(([px, py]) => queryRoad(px, py).dist >= half + 1.2) && !signs.some((sg) => inRect({ ...lot, h: lot.h + 4 }, sg.x, sg.y, 2.5))) {
        lots.push(lot);
        // you can drive in: the lot plus the strip to the road edge, and park in the free bays
        lot.nx = nx;
        lot.ny = ny;
        lot.drive = { x: lot.x - nx * 1.6, y: lot.y - ny * 1.6, w: lot.w + 1, h: lot.h + 3.4, angle: ang };
        lot.bays = [];
        const n = Math.floor(lot.w / 3);
        for (let i = 0; i < n; i++) {
          const t = (i - (n - 1) / 2) * 3;
          const bay = { x: lot.x + Math.cos(ang) * t, y: lot.y + Math.sin(ang) * t, angle: ang + Math.PI / 2, free: true };
          lot.bays.push(bay);
          if (rnd() < 0.35) continue;
          bay.free = false;
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
    !(queryRoad(x, y).dist < half + r + 2.2 || blocked(x, y, r) || solidRegion(x, y) || houses.some((o) => inRect(o, x, y, r + (o.garden ? 2.5 : 1.2))) || lots.some((o) => inRect(o, x, y, r + 0.5)));
  // forests and mountains are full of trees; lakes, rails, squares and fields have none
  for (const r of regions) {
    if (r.type !== 'forest' && r.type !== 'mountain' && r.type !== 'park') continue;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of r.pts) (x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y));
    const step = r.type === 'park' ? 11 : 6.5;
    for (let y = y0; y < y1; y += step)
      for (let x = x0; x < x1; x += step) {
        const tx = x + rnd() * step * 0.8;
        const ty = y + rnd() * step * 0.8;
        if (!pointInPoly(tx, ty, r.pts)) continue;
        if (queryRoad(tx, ty).dist < half + 5) continue;
        if (r.letters && Math.hypot(tx - r.lx, ty - r.ly) < 26) continue; // keep the BRAȘOV letters visible
        trees.push({ x: tx, y: ty, r: 2.2 + rnd() * 1.6, shade: r.type === 'mountain' ? 0.5 + rnd() * 0.5 : rnd() });
      }
  }
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
    regions,
    geoLabels,
    railLines,
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
