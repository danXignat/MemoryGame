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

  // ---------------------------------------------------------- road shapes
  const roads = [{ id: 'route', segs: routeSegs, lane: true }];
  for (const road of MAP.extraRoads || []) {
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
      x: pt.x - pt.dy * side * C.world.signOffset,
      y: pt.y + pt.dx * side * C.world.signOffset,
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

  // ------------------------------------------------------ scenery (decoration)
  const rnd = mulberry32(20240611);
  const rings = (MAP.rings || []).map((r) => ({ ...r, island: Math.max(1, r.r - half - 0.7) }));
  const houses = [];
  const trees = [];
  const m = 70;
  const bx0 = minX - m;
  const bx1 = maxX + m;
  const by0 = minY - m;
  const by1 = maxY + m;
  const roofs = ['#b5543c', '#a8483a', '#c26a4a', '#8c5a4a', '#9a7b58', '#7d8793'];

  const nearRing = (x, y, pad) => rings.some((r) => Math.hypot(x - r.cx, y - r.cy) < r.r + half + pad);
  for (let attempt = 0; attempt < 900 && houses.length < 34; attempt++) {
    const w = 10 + rnd() * 8;
    const h = 8 + rnd() * 6;
    const x = bx0 + 30 + rnd() * (bx1 - bx0 - 60);
    const y = by0 + 30 + rnd() * (by1 - by0 - 60);
    const pts = [
      [x, y],
      [x - w / 2, y - h / 2],
      [x + w / 2, y - h / 2],
      [x - w / 2, y + h / 2],
      [x + w / 2, y + h / 2],
    ];
    if (pts.some(([px, py]) => queryRoad(px, py).dist < half + 7 || nearRing(px, py, 6))) continue;
    if (houses.some((o) => Math.abs(o.x - x) < (o.w + w) / 2 + 5 && Math.abs(o.y - y) < (o.h + h) / 2 + 5)) continue;
    houses.push({ x, y, w, h, roof: roofs[Math.floor(rnd() * roofs.length)] });
  }
  for (let attempt = 0; attempt < 2600 && trees.length < 420; attempt++) {
    const x = bx0 + rnd() * (bx1 - bx0);
    const y = by0 + rnd() * (by1 - by0);
    const r = 1.6 + rnd() * 1.9;
    if (queryRoad(x, y).dist < half + r + 2.2) continue;
    if (nearRing(x, y, r + 1) && !rings.some((rg) => Math.hypot(x - rg.cx, y - rg.cy) < rg.island - r)) continue;
    if (houses.some((o) => Math.abs(o.x - x) < o.w / 2 + r + 1.5 && Math.abs(o.y - y) < o.h / 2 + r + 1.5)) continue;
    if (trees.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 0.6)) continue;
    trees.push({ x, y, r, shade: rnd() });
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
    houses,
    trees,
    bounds: { minX, minY, maxX, maxY },
    route: { length, ds, N, X, Y, DX, DY, segRanges, at: routeAt, locate },
    queryRoad,
    start: (() => {
      const p = routeAt(0, {});
      return { x: p.x - p.dy * C.world.laneOffset, y: p.y + p.dx * C.world.laneOffset, heading: Math.atan2(p.dy, p.dx) };
    })(),
  };
}
