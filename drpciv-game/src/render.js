// ============================================================================
//  render.js  —  DRAWS THE WORLD on the canvas (roads, route line, signs, cars,
//  pedestrians, night / fog / rain) and the little round minimap.
//  It only reads the game state, it never changes it.
// ============================================================================

import { CONFIG as C } from './config.js';
import { getSignSprite } from './signart.js';
import { portraitImage } from './portraits.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};

const COL = {
  grassA: '#5b9f4f',
  grassB: '#559948',
  island: '#6aa85a',
  curb: '#d7dadd',
  asphalt: '#3d4249',
  centerLine: 'rgba(255,255,255,0.78)',
  paint: 'rgba(255,255,255,0.92)',
  tree: ['#2f7d3a', '#3a8c43', '#27703a'],
  treeLight: 'rgba(255,255,255,0.12)',
  shadow: 'rgba(0,0,0,0.22)',
  route: '#8f5bff',
};

function buildPaths(world) {
  if (typeof Path2D === 'undefined') return [];
  return world.roads.map((road) => {
    const path = new Path2D();
    let first = true;
    for (const s of road.segs) {
      if (s.type === 'line') {
        if (first) path.moveTo(s.x0, s.y0);
        else path.lineTo(s.x0, s.y0);
        path.lineTo(s.x1, s.y1);
      } else {
        if (first) path.moveTo(s.cx + s.r * Math.cos(s.a0), s.cy + s.r * Math.sin(s.a0));
        path.arc(s.cx, s.cy, s.r, s.a0, s.a1, s.a1 < s.a0);
      }
      first = false;
    }
    return { path, lane: road.lane };
  });
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas, initialWorld) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const off = document.createElement('canvas'); // darkness layer for night
  const octx = off.getContext('2d');
  let world = initialWorld;
  let paths = buildPaths(world);
  let W = 1;
  let H = 1;
  let dpr = 1;
  let portrait = false;
  const cam = { x: 0, y: 0, angle: 0, scale: 10, ready: false };
  let anchorY = 0.5;
  let rain = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), v: 0.8 + Math.random() * 0.8 }));

  function buildLaneLines(w) {
    if (typeof Path2D === 'undefined' || !w.laneDividers || !w.laneDividers.length) return [];
    const r = w.route;
    return w.laneDividers.map((off) => {
      const p = new Path2D();
      for (let k = 0; k <= r.N; k += 2) {
        const x = r.X[k] - r.DY[k] * off;
        const y = r.Y[k] + r.DX[k] * off;
        if (k === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
      return p;
    });
  }
  let laneLines = buildLaneLines(world);

  function setWorld(w) {
    world = w;
    paths = buildPaths(w);
    laneLines = buildLaneLines(w);
    cam.ready = false;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = Math.max(1, canvas.clientWidth);
    H = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    off.width = canvas.width;
    off.height = canvas.height;
    portrait = H > W;
  }

  // -------------------------------------------------------------- camera
  function updateCamera(state, dt, settings) {
    const car = state.car;
    const K = C.camera;
    const vmax = Math.min(state.spec.topKmh, C.car2.capKmh) / 3.6;
    const meters = portrait ? K.portraitMeters : K.landscapeMeters;
    const wantScale = (H / meters) * (1 - K.zoomOutAtTopSpeed * clamp(Math.abs(car.v) / vmax, 0, 1));
    const look = clamp(car.v * K.lookAhead, -3, K.maxLookAhead);
    const tx = car.x + Math.cos(car.heading) * look;
    const ty = car.y + Math.sin(car.heading) * look;
    const wantAngle = settings.rotate ? -Math.PI / 2 - car.heading : 0;
    if (!cam.ready) {
      Object.assign(cam, { x: tx, y: ty, angle: wantAngle, scale: wantScale, ready: true });
      return;
    }
    const f = (rate) => 1 - Math.exp(-rate * Math.min(dt, 0.1));
    cam.x += (tx - cam.x) * f(K.follow);
    cam.y += (ty - cam.y) * f(K.follow);
    cam.scale += (wantScale - cam.scale) * f(3);
    cam.angle += wrap(wantAngle - cam.angle) * f(K.rotateFollow);
  }

  const applyView = (c, sx = 0, sy = 0) => {
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.translate(W / 2 + sx, H * anchorY + sy);
    c.rotate(cam.angle);
    c.scale(cam.scale, cam.scale);
    c.translate(-cam.x, -cam.y);
  };

  // ---------------------------------------------------------------- draw
  function draw(state, settings, time) {
    anchorY = settings.rotate ? (portrait ? C.camera.anchorYPortrait : C.camera.anchorYLandscape) : 0.5;
    const k = state.shake;
    const sx = (Math.random() - 0.5) * k * 10;
    const sy = (Math.random() - 0.5) * k * 10;
    const weather = state.weather;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COL.grassA;
    ctx.fillRect(0, 0, W, H);
    applyView(ctx, sx, sy);
    const R = Math.hypot(W, H) / cam.scale + 6;
    const blinkOn = state.blink === 1;

    drawGrass(R);
    drawRoads();
    drawIslands();
    drawStations(state);
    drawRoute(0.9);
    drawPaint();
    drawHouses(R, time);
    drawBushes(R);
    for (const ai of state.traffic) drawCar(ai, null, ai.color, {});
    const flash = Math.floor(time * 4) % 2;
    for (const n of state.npcs) if (n.init && n.alpha !== 0) drawCar(n, null, n.color, { police: n.police, flash });
    for (const o of state.obstacles || []) drawCar(o, null, o.color, { hazard: true, blinkOn: Math.floor(time / 0.33) % 2 === 0 });
    drawPeds(state, time);
    drawWalkers(state, time);
    drawMission(state, settings, time);
    drawBeams(state.car, state.spec);
    drawCar(state.car, state.spec, state.spec.color, { braking: state.car.braking, reversing: state.car.reversing, signal: state.car.signal, hazard: state.car.hazard, blinkOn, lights: state.car.lights, player: true, passenger: state.passenger, mood: state.mood, engineOn: state.car.engineOn });
    drawTrees(R);
    drawLamps(R);
    drawPins(R);
    drawSigns(state, R, time);

    if (weather === 'fog') drawFog(state);
    if (weather === 'night') drawNight(state, sx, sy);
    if (weather === 'rain') drawRain(time);
  }

  function drawGrass(R) {
    const G = 14;
    ctx.fillStyle = COL.grassB;
    const x0 = Math.floor((cam.x - R) / G);
    const x1 = Math.ceil((cam.x + R) / G);
    const y0 = Math.floor((cam.y - R) / G);
    const y1 = Math.ceil((cam.y + R) / G);
    for (let gx = x0; gx < x1; gx++) for (let gy = y0; gy < y1; gy++) if ((gx + gy) & 1) ctx.fillRect(gx * G, gy * G, G, G);
  }

  function drawRoads() {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = COL.curb;
    ctx.lineWidth = world.roadWidth + 1.5;
    for (const p of paths) ctx.stroke(p.path);
    ctx.strokeStyle = COL.asphalt;
    ctx.lineWidth = world.roadWidth;
    for (const p of paths) ctx.stroke(p.path);
    ctx.strokeStyle = COL.centerLine;
    ctx.lineWidth = 0.22;
    ctx.lineCap = 'butt';
    ctx.setLineDash([3, 4.5]);
    for (const p of paths) if (p.lane) ctx.stroke(p.path);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.setLineDash([2.5, 5]);
    for (const p of laneLines) ctx.stroke(p);
    ctx.setLineDash([]);
  }

  /** the glowing purple navigation line (Waze style) */
  function drawRoute(alpha) {
    if (!paths.length) return;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(143,91,255,${0.28 * alpha})`;
    ctx.lineWidth = 3.4;
    ctx.stroke(paths[0].path);
    ctx.strokeStyle = `rgba(160,120,255,${0.92 * alpha})`;
    ctx.lineWidth = 1.2;
    ctx.stroke(paths[0].path);
  }

  function drawIslands() {
    for (const r of world.rings) {
      ctx.fillStyle = COL.curb;
      ctx.beginPath();
      ctx.arc(r.cx, r.cy, r.island + 0.75, 0, TAU);
      ctx.fill();
      ctx.fillStyle = COL.island;
      ctx.beginPath();
      ctx.arc(r.cx, r.cy, r.island, 0, TAU);
      ctx.fill();
    }
  }

  function drawStations(state) {
    for (const st of world.stations) {
      if (Math.hypot(st.x - cam.x, st.y - cam.y) > 120) continue;
      ctx.fillStyle = '#2d343c';
      ctx.beginPath();
      ctx.arc(st.bay.x, st.bay.y, st.bay.r + 1.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a9d8f';
      ctx.beginPath();
      ctx.arc(st.bay.x, st.bay.y, st.bay.r, 0, TAU);
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      // pump
      const px = st.pump ? st.pump.x : st.bay.x + 2.2;
      const py = st.pump ? st.pump.y : st.bay.y - 6.2;
      ctx.fillStyle = '#5b6470';
      rr(ctx, px - 1.6, py - 1.6, 3.2, 3.2, 0.4);
      ctx.fill();
      ctx.fillStyle = '#e63946';
      rr(ctx, px - 0.75, py - 1.3, 1.5, 2.6, 0.3);
      ctx.fill();
      ctx.fillStyle = '#f1f3f5';
      ctx.fillRect(px - 0.45, py - 0.95, 0.9, 0.9);
    }
  }

  function drawPaint() {
    for (const p of world.paint) {
      if (Math.hypot(p.x - cam.x, p.y - cam.y) > 120) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.dy, p.dx));
      ctx.fillStyle = COL.paint;
      const half = world.half;
      if (p.kind === 'crosswalk') {
        for (let l = -3.3; l <= 3.4; l += 1.1) ctx.fillRect(-1.7, l - 0.3, 3.4, 0.6);
      } else if (p.kind === 'stopLine') {
        ctx.fillRect(-0.3, 0.15, 0.6, half - 0.5);
      } else if (p.kind === 'yieldLine') {
        for (let l = 0.3; l < half - 0.4; l += 1.1) {
          ctx.beginPath();
          ctx.moveTo(0.5, l);
          ctx.lineTo(-0.5, l + 0.275);
          ctx.lineTo(0.5, l + 0.55);
          ctx.closePath();
          ctx.fill();
        }
      } else if (p.kind === 'finish') {
        for (let row = 0; row < 2; row++) {
          for (let c = 0; c < 8; c++) {
            ctx.fillStyle = (row + c) & 1 ? '#f4f4f4' : '#15181b';
            ctx.fillRect(-1 + row, -half + c, 1, 1);
          }
        }
      }
      ctx.restore();
    }
  }

  function drawHouses(R, time) {
    const near = (o, pad) => Math.abs(o.x - cam.x) < R + pad && Math.abs(o.y - cam.y) < R + pad;
    // car parks in front of blocks
    for (const l of world.lots || []) {
      if (!near(l, 30)) continue;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.angle);
      ctx.fillStyle = '#4a4f57';
      ctx.fillRect(-l.w / 2, -l.h / 2, l.w, l.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      for (let x = -l.w / 2; x <= l.w / 2 + 0.01; x += 3) {
        ctx.moveTo(x - 1.5, -l.h / 2 + 0.4);
        ctx.lineTo(x - 1.5, l.h / 2 - 0.4);
      }
      ctx.stroke();
      ctx.restore();
    }
    for (const h of world.houses) {
      if (!near(h, 40)) continue;
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.angle || 0);
      if (h.kind === 'block') {
        const sh = 1.2 + (h.floors || 6) * 0.25; // taller blocks cast longer shadows
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(-h.w / 2 + sh * 0.6, -h.h / 2 + sh, h.w, h.h);
        ctx.fillStyle = h.roof;
        ctx.fillRect(-h.w / 2, -h.h / 2, h.w, h.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; // parapet
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-h.w / 2 + 0.3, -h.h / 2 + 0.3, h.w - 0.6, h.h - 0.6);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; // stairwells / lift rooms
        const n = Math.max(2, Math.round(h.w / 12));
        for (let i = 0; i < n; i++) {
          const x = -h.w / 2 + ((i + 0.5) * h.w) / n;
          ctx.fillRect(x - 1.2, -1.4, 2.4, 2.8);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(-h.w / 2 + 2, h.h / 2 - 2.6, 3, 1.6);
        ctx.fillRect(h.w / 2 - 5, -h.h / 2 + 1.2, 3, 1.6);
      } else {
        if (h.garden) {
          ctx.fillStyle = 'rgba(120,190,90,0.55)';
          ctx.fillRect(-h.w / 2 - 3, -h.h / 2 - 3, h.w + 6, h.h + 6);
          ctx.strokeStyle = '#d9c9a3'; // fence
          ctx.lineWidth = 0.18;
          ctx.strokeRect(-h.w / 2 - 3, -h.h / 2 - 3, h.w + 6, h.h + 6);
        }
        ctx.fillStyle = COL.shadow;
        ctx.fillRect(-h.w / 2 + 0.9, -h.h / 2 + 1.1, h.w, h.h);
        ctx.fillStyle = h.roof;
        ctx.fillRect(-h.w / 2, -h.h / 2, h.w, h.h);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(-h.w / 2, -0.25, h.w, 0.5); // ridge
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(-h.w / 2, -h.h / 2, h.w, h.h / 2 - 0.25);
      }
      ctx.restore();
    }
    // parked cars (police ones flash)
    const flash = Math.floor(time * 4) % 2;
    for (const c of world.parked || []) {
      if (!near(c, 10)) continue;
      drawCar(c, null, c.color, { police: c.police, flash });
    }
  }

  function drawLamps(R) {
    for (const l of world.lamps || []) {
      if (Math.abs(l.x - cam.x) > R + 4 || Math.abs(l.y - cam.y) > R + 4) continue;
      ctx.strokeStyle = '#3d434b';
      ctx.lineWidth = 0.22;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x + Math.cos(l.ang) * 1.6, l.y + Math.sin(l.ang) * 1.6);
      ctx.stroke();
      ctx.fillStyle = '#2b3036';
      ctx.beginPath();
      ctx.arc(l.x, l.y, 0.35, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(l.x + Math.cos(l.ang) * 1.6, l.y + Math.sin(l.ang) * 1.6, 0.3, 0, TAU);
      ctx.fill();
    }
  }

  function drawBushes(R) {
    for (const b of world.bushes || []) {
      if (Math.abs(b.x - cam.x) > R + 3 || Math.abs(b.y - cam.y) > R + 3) continue;
      ctx.fillStyle = '#3f8f45';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
      if (b.flower) {
        ctx.fillStyle = b.flower;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(b.x + Math.cos(i * 1.7) * b.r * 0.5, b.y + Math.sin(i * 1.7) * b.r * 0.5, 0.18, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  function drawTrees(R) {
    for (const t of world.trees) {
      if (Math.abs(t.x - cam.x) > R + 5 || Math.abs(t.y - cam.y) > R + 5) continue;
      ctx.fillStyle = COL.shadow;
      ctx.beginPath();
      ctx.arc(t.x + t.r * 0.35, t.y + t.r * 0.4, t.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = COL.tree[Math.floor(t.shade * 2.99)];
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = COL.treeLight;
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.25, t.y - t.r * 0.25, t.r * 0.58, 0, TAU);
      ctx.fill();
    }
  }

  // ---------------------------------------------------------- pedestrians
  function drawWalkers(state, time) {
    for (const w of state.walkers || []) {
      if (w.x == null || Math.hypot(w.x - cam.x, w.y - cam.y) > 80) continue;
      const swing = Math.sin(time * 8 + w.s) * 0.22;
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(w.heading + Math.PI / 2);
      ctx.fillStyle = COL.shadow;
      ctx.beginPath();
      ctx.ellipse(0.2, 0.2, 0.55, 0.8, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a2d33';
      ctx.fillRect(-0.28, -0.1 + swing, 0.2, 0.55);
      ctx.fillRect(0.08, -0.1 - swing, 0.2, 0.55);
      ctx.fillStyle = w.shirt;
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.62, 0.32, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e8b89a';
      ctx.beginPath();
      ctx.arc(0, 0, 0.27, 0, TAU);
      ctx.fill();
      ctx.fillStyle = w.hair;
      ctx.beginPath();
      ctx.arc(0, 0.05, 0.24, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPeds(state, time) {
    for (const p of state.peds) {
      if (Math.hypot(p.px - cam.x, p.py - cam.y) > 90) continue;
      const moving = p.phase === 'cross';
      ctx.save();
      ctx.translate(p.px, p.py);
      ctx.rotate(Math.atan2(-p.side * p.ny, -p.side * p.nx)); // face the way they are walking
      ctx.fillStyle = COL.shadow;
      ctx.beginPath();
      ctx.ellipse(0.2, 0.2, 0.55, 0.8, 0, 0, TAU);
      ctx.fill();
      const swing = moving ? Math.sin(time * 9) * 0.25 : 0;
      ctx.fillStyle = '#2b4c8c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.32, 0.8, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e8b89a';
      ctx.beginPath();
      ctx.arc(0.05, swing * 0.4, 0.34, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#4a2f23';
      ctx.beginPath();
      ctx.arc(-0.05, swing * 0.4, 0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
      if (p.phase === 'wait' || p.phase === 'cross') {
        ctx.save();
        ctx.translate(p.px, p.py);
        ctx.rotate(-cam.angle);
        ctx.strokeStyle = 'rgba(255,170,40,0.85)';
        ctx.lineWidth = 0.25;
        ctx.beginPath();
        ctx.arc(0, 0, 1.5 + 0.2 * Math.sin(time * 6), 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ------------------------------------------- the Final Boss: Alisia and her house
  function label(x, y, text, color = '#ffffff', dy = -34) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-cam.angle);
    ctx.scale(1 / cam.scale, 1 / cam.scale);
    ctx.font = '700 12.5px Inter, Arial, sans-serif';
    const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = 'rgba(11,19,23,0.85)';
    rr(ctx, -w / 2, dy - 11, w, 22, 9);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, dy);
    ctx.restore();
  }
  function drawAlisia(x, y, heading, time, waving) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.6, 1.6); // a bit bigger than life so her face is easy to see
    ctx.fillStyle = COL.shadow;
    ctx.beginPath();
    ctx.ellipse(0.25, 0.3, 0.75, 0.9, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.rotate(heading);
    ctx.fillStyle = '#e8548c'; // dress
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.42, 0.85, 0, 0, TAU);
    ctx.fill();
    if (waving) {
      ctx.strokeStyle = '#e8b89a';
      ctx.lineWidth = 0.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0.1, 0.6);
      ctx.lineTo(0.75 + 0.25 * Math.sin(time * 8), 1.05);
      ctx.stroke();
    }
    ctx.restore();
    // face, always upright on screen
    ctx.rotate(-cam.angle);
    const img = portraitImage('alisia');
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -0.15, 0.62, 0, TAU);
    ctx.clip();
    if (img) ctx.drawImage(img, -0.62, -0.77, 1.24, 1.24);
    else {
      ctx.fillStyle = '#3b2418';
      ctx.fillRect(-0.7, -0.9, 1.4, 1.5);
      ctx.fillStyle = '#e8b89a';
      ctx.beginPath();
      ctx.arc(0, -0.08, 0.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.arc(0, -0.15, 0.62, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  function drawMission(state, settings, time) {
    const m = world.mission;
    const p = state.pax;
    if (!m || !p) return;
    const ro = settings.lang === 'ro';
    // her house at the end of the drive
    if (m.house && Math.hypot(m.house.x - cam.x, m.house.y - cam.y) < 140) {
      ctx.save();
      ctx.translate(m.house.x, m.house.y);
      ctx.rotate(m.house.heading);
      ctx.fillStyle = COL.shadow;
      ctx.fillRect(-5.2, -3.7, 11, 8.5);
      ctx.fillStyle = '#f4ead8';
      ctx.fillRect(-5.5, -4.2, 11, 8.4);
      ctx.fillStyle = '#c4476e';
      ctx.fillRect(-5.5, -4.2, 11, 4.2);
      ctx.fillStyle = '#a63a5c';
      ctx.fillRect(-5.5, -0.2, 11, 0.4);
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(-1, -4.6, 2, 0.8); // door towards the road
      ctx.restore();
      label(m.house.x, m.house.y, 'Str. Sfinții Constantin și Elena 41', '#ffd1e3', -44);
    }
    // where to stop
    const pulse = 1 + 0.12 * Math.sin(time * 5);
    if (p.phase === 'waiting' || p.phase === 'walking') {
      ctx.strokeStyle = 'rgba(255,95,162,0.9)';
      ctx.lineWidth = 0.35;
      ctx.setLineDash([1.2, 0.9]);
      ctx.beginPath();
      ctx.arc(m.pickup.x, m.pickup.y, 4.2 * pulse, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (p.phase === 'in' && m.destSpot && Math.hypot(state.car.x - m.destSpot.x, state.car.y - m.destSpot.y) < 80) {
      ctx.strokeStyle = 'rgba(160,120,255,0.95)';
      ctx.lineWidth = 0.35;
      ctx.setLineDash([1.2, 0.9]);
      ctx.beginPath();
      ctx.arc(m.destSpot.x, m.destSpot.y, 4.6 * pulse, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      label(m.destSpot.x, m.destSpot.y, ro ? 'Oprește aici' : 'Stop here', '#e5dbff', -26);
    }
    // Alisia herself
    if (p.phase === 'waiting' || p.phase === 'walking' || p.phase === 'leaving' || p.phase === 'home') {
      if (p.phase === 'home') return;
      const towards = p.phase === 'walking' ? Math.atan2(state.car.y - p.y, state.car.x - p.x) : p.phase === 'leaving' ? Math.atan2(m.house.y - p.y, m.house.x - p.x) : Math.atan2(state.car.y - p.y, state.car.x - p.x);
      drawAlisia(p.x, p.y, towards - Math.PI / 2, time, p.phase === 'waiting');
      const txt = p.phase === 'waiting' ? (ro ? 'Alisia · oprește aici' : 'Alisia · stop here') : 'Alisia';
      if (p.phase !== 'leaving') label(p.x, p.y, txt, '#ffd1e3', -48);
    }
  }

  // ----------------------------------------------------------------- cars
  function drawBeams(car, spec) {
    if (car.lights < 1) return;
    const front = spec.length / 2 - 0.15;
    const len = car.lights === 3 ? 36 : car.lights === 2 ? 17 : 5;
    const hw = car.lights === 3 ? 7 : car.lights === 2 ? 8 : 3;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.heading);
    const g = ctx.createRadialGradient(front, 0, 1, front, 0, len);
    const a = car.lights === 3 ? 0.34 : car.lights === 2 ? 0.26 : 0.12;
    g.addColorStop(0, `rgba(255,244,190,${a})`);
    g.addColorStop(1, 'rgba(255,244,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(front, -0.8);
    ctx.lineTo(front + len, -hw);
    ctx.lineTo(front + len, hw);
    ctx.lineTo(front, 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // The car: x = forward, y = right (in its own little coordinate system)
  function drawCar(car, spec, color, o) {
    const L = spec ? spec.length : car.length || 4.3;
    const Wd = spec ? spec.width : car.width || 1.8;
    ctx.save();
    if (car.alpha != null && car.alpha < 1) ctx.globalAlpha = Math.max(0, car.alpha);
    ctx.translate(car.x, car.y);
    ctx.rotate(car.heading);

    ctx.fillStyle = COL.shadow;
    rr(ctx, -L / 2 + 0.25, -Wd / 2 + 0.3, L, Wd, 0.6);
    ctx.fill();

    ctx.fillStyle = '#16181b';
    const wl = 0.85;
    const ww = 0.34;
    const wx = L * 0.3;
    const wy = Wd / 2 - 0.02;
    const steer = o.player ? car.steer : 0;
    for (const [x, y, s] of [[wx, -wy, steer], [wx, wy, steer], [-wx, -wy, 0], [-wx, wy, 0]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s);
      ctx.fillRect(-wl / 2, -ww / 2, wl, ww);
      ctx.restore();
    }

    ctx.fillStyle = color;
    rr(ctx, -L / 2, -Wd / 2 + 0.08, L, Wd - 0.16, 0.65);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(ctx, -L / 2 + 0.2, -Wd / 2 + 0.2, L - 0.4, 0.5, 0.25);
    ctx.fill();

    const cab = L * 0.26;
    ctx.fillStyle = '#1d2a35';
    rr(ctx, 0.15, -Wd / 2 + 0.28, cab, Wd - 0.56, 0.3);
    ctx.fill();
    rr(ctx, -L / 2 + 0.7, -Wd / 2 + 0.3, 0.85, Wd - 0.6, 0.25);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    rr(ctx, -0.75, -Wd / 2 + 0.22, 0.95, Wd - 0.44, 0.2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    rr(ctx, -0.7, -Wd / 2 + 0.28, 0.8, 0.3, 0.12);
    ctx.fill();

    // people in the cabin (player's car only): driver left, passenger on the right
    if (o.player) {
      const natyImg = portraitImage('naty');
      ctx.save();
      ctx.translate(0.0, -Wd * 0.22);
      ctx.rotate(-(car.heading + cam.angle));
      if (natyImg) {
        ctx.beginPath();
        ctx.arc(0, 0, 0.36, 0, TAU);
        ctx.clip();
        ctx.drawImage(natyImg, -0.36, -0.36, 0.72, 0.72);
      } else {
        ctx.fillStyle = '#c9a98f';
        ctx.beginPath();
        ctx.arc(0, 0, 0.26, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      if (o.passenger) {
        ctx.save();
        ctx.translate(0.0, Wd * 0.22);
        ctx.rotate(-(car.heading + cam.angle)); // keep the face upright on screen
        const passengerImg = portraitImage('alisia');
        if (passengerImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, 0, 0.42, 0, TAU);
          ctx.clip();
          ctx.drawImage(passengerImg, -0.42, -0.42, 0.84, 0.84);
          ctx.restore();
        } else {
          ctx.fillStyle = '#3b2418';
          ctx.beginPath();
          ctx.arc(0, 0, 0.42, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#e8b89a';
          ctx.beginPath();
          ctx.arc(0, 0.04, 0.27, 0, TAU);
          ctx.fill();
        }
        ctx.strokeStyle = o.mood === 'wince' ? '#ff9f1c' : '#2fbf71';
        ctx.lineWidth = 0.12;
        ctx.beginPath();
        ctx.arc(0, 0, 0.46, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (o.police) {
      ctx.fillStyle = '#1d4ed8'; // blue stripe
      ctx.fillRect(-L / 2 + 0.3, -Wd / 2 + 0.08, L - 0.6, 0.28);
      ctx.fillRect(-L / 2 + 0.3, Wd / 2 - 0.36, L - 0.6, 0.28);
      ctx.fillStyle = o.flash ? '#2563ff' : '#ff2d2d'; // light bar
      ctx.fillRect(-0.45, -Wd / 2 + 0.3, 0.5, Wd / 2 - 0.3);
      ctx.fillStyle = o.flash ? '#ff2d2d' : '#2563ff';
      ctx.fillRect(-0.45, 0, 0.5, Wd / 2 - 0.3);
      ctx.fillStyle = o.flash ? 'rgba(60,110,255,0.25)' : 'rgba(255,50,50,0.25)';
      ctx.beginPath();
      ctx.arc(-0.2, 0, 2.6, 0, TAU);
      ctx.fill();
    }
    // lights
    const lit = o.lights >= 1;
    ctx.fillStyle = lit ? '#fff6c4' : '#d9dbd0';
    ctx.fillRect(L / 2 - 0.22, -Wd / 2 + 0.22, 0.2, 0.36);
    ctx.fillRect(L / 2 - 0.22, Wd / 2 - 0.58, 0.2, 0.36);
    ctx.fillStyle = o.braking ? '#ff2a1f' : lit ? '#c0261b' : '#8a1712';
    ctx.fillRect(-L / 2 + 0.02, -Wd / 2 + 0.22, 0.2, 0.4);
    ctx.fillRect(-L / 2 + 0.02, Wd / 2 - 0.62, 0.2, 0.4);
    if (o.braking) {
      ctx.fillStyle = 'rgba(255,40,30,0.28)';
      ctx.beginPath();
      ctx.arc(-L / 2 - 0.2, 0, 1.9, 0, TAU);
      ctx.fill();
    }
    if (o.reversing) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-L / 2 + 0.02, -0.18, 0.2, 0.36);
    }
    // blinkers: orange lamps on the side that is signalling (both for hazard lights)
    if (o.blinkOn && (o.signal || o.hazard)) {
      const sides = o.hazard ? [-1, 1] : [o.signal === 'left' ? -1 : 1];
      for (const sd of sides) {
        for (const x of [L / 2 - 0.2, -L / 2 + 0.2]) {
          const y = sd * (Wd / 2 - 0.12);
          ctx.fillStyle = 'rgba(255,170,0,0.38)';
          ctx.beginPath();
          ctx.arc(x, y, 0.95, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#ffb000';
          ctx.beginPath();
          ctx.arc(x, y, 0.3, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------- map pins
  function pinColor(type) {
    return { station: '#12b5a6', camera: '#e5484d', hazard: '#ff9f1c', breakdown: '#ff9f1c', roadwork: '#f08c00', police: '#3b5bdb', pickup: '#ff5fa2', home: '#8f5bff', crosswalk: '#3b82f6' }[type] || '#3b82f6';
  }
  function drawPins(R) {
    for (const p of world.pins) {
      if (p.type === 'crosswalk' || p.type === 'pickup' || p.type === 'home') continue;
      if (Math.hypot(p.x - cam.x, p.y - cam.y) > R + 10) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-cam.angle);
      ctx.fillStyle = COL.shadow;
      ctx.beginPath();
      ctx.ellipse(0.5, 0.6, 1.6, 1.0, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = pinColor(p.type);
      ctx.beginPath();
      ctx.arc(0, -2.3, 1.7, 0, TAU);
      ctx.moveTo(-1.2, -1.1);
      ctx.lineTo(0, 0);
      ctx.lineTo(1.2, -1.1);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, -2.3, 1.0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = pinColor(p.type);
      if (p.type === 'station') {
        ctx.beginPath();
        ctx.arc(0, -2.1, 0.45, 0, TAU);
        ctx.moveTo(0, -3.2);
        ctx.lineTo(0.5, -2.2);
        ctx.lineTo(-0.5, -2.2);
        ctx.fill();
      } else if (p.type === 'hazard' || p.type === 'breakdown' || p.type === 'roadwork') {
        ctx.beginPath();
        ctx.moveTo(0, -3.1);
        ctx.lineTo(0.8, -1.7);
        ctx.lineTo(-0.8, -1.7);
        ctx.fill();
      } else if (p.type === 'home') {
        ctx.beginPath();
        ctx.moveTo(-0.8, -2.1);
        ctx.lineTo(0, -3.0);
        ctx.lineTo(0.8, -2.1);
        ctx.lineTo(0.6, -1.6);
        ctx.lineTo(-0.6, -1.6);
        ctx.fill();
      } else if (p.type === 'camera') {
        ctx.fillRect(-0.62, -2.68, 1.24, 0.8);
        ctx.fillRect(-0.3, -2.86, 0.4, 0.2);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, -2.28, 0.27, 0, TAU);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, -2.3, 0.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawSigns(state, R, time) {
    const rot = -cam.angle;
    const r0 = C.world.signRadius;
    for (const sg of world.signs) {
      if (Math.hypot(sg.x - cam.x, sg.y - cam.y) > R + 6) continue;
      const active = state.activeSign === sg;
      const pulse = active ? 1 + 0.07 * Math.sin(time * 7) : 1;
      const r = r0 * pulse * (active ? 1.12 : 1);
      ctx.save();
      ctx.translate(sg.x, sg.y);
      ctx.rotate(rot);
      ctx.fillStyle = COL.shadow;
      ctx.beginPath();
      ctx.ellipse(r * 0.28, r * 0.5, r * 0.95, r * 0.95, 0, 0, TAU);
      ctx.fill();
      if (active) {
        ctx.strokeStyle = 'rgba(255,201,40,0.35)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, r * (1.42 + 0.06 * Math.sin(time * 7)), 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = '#ffc928';
        ctx.lineWidth = 0.34;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.22, 0, TAU);
        ctx.stroke();
      }
      const sprite = getSignSprite(sg.key, sg.def.art, 256);
      ctx.drawImage(sprite, -r * 1.14, -r * 1.14, r * 2.28, r * 2.28);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------- weather
  function drawFog(state) {
    const car = state.car;
    const rad = 40 + car.lights * 6;
    const g = ctx.createRadialGradient(car.x, car.y, 5, car.x, car.y, rad);
    g.addColorStop(0, 'rgba(200,207,214,0)');
    g.addColorStop(0.55, 'rgba(200,207,214,0.55)');
    g.addColorStop(1, 'rgba(200,207,214,0.96)');
    ctx.fillStyle = g;
    ctx.fillRect(cam.x - 400, cam.y - 400, 800, 800);
    drawRoute(0.5);
  }

  function drawNight(state, sx, sy) {
    const car = state.car;
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.globalCompositeOperation = 'source-over';
    octx.clearRect(0, 0, off.width, off.height);
    octx.fillStyle = 'rgba(6,10,30,0.84)';
    octx.fillRect(0, 0, off.width, off.height);
    applyView(octx, sx, sy);
    octx.globalCompositeOperation = 'destination-out';
    // soft glow around the car (parking lights / dashboard)
    let g = octx.createRadialGradient(car.x, car.y, 1, car.x, car.y, 7 + car.lights * 1.5);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    octx.fillStyle = g;
    octx.beginPath();
    octx.arc(car.x, car.y, 12, 0, TAU);
    octx.fill();
    if (car.lights >= 1) {
      const front = state.spec.length / 2;
      const len = car.lights === 3 ? 44 : car.lights === 2 ? 24 : 7;
      const hw = car.lights === 3 ? 8 : car.lights === 2 ? 10 : 3.5;
      octx.save();
      octx.translate(car.x, car.y);
      octx.rotate(car.heading);
      g = octx.createRadialGradient(front, 0, 1, front, 0, len);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      octx.fillStyle = g;
      octx.beginPath();
      octx.moveTo(front, -0.9);
      octx.lineTo(front + len, -hw);
      octx.lineTo(front + len, hw);
      octx.lineTo(front, 0.9);
      octx.closePath();
      octx.fill();
      octx.restore();
    }
    // other cars show their own lights
    for (const ai of [...state.traffic, ...state.npcs]) {
      octx.save();
      octx.translate(ai.x, ai.y);
      octx.rotate(ai.heading);
      g = octx.createRadialGradient(2, 0, 1, 2, 0, 16);
      g.addColorStop(0, 'rgba(0,0,0,0.95)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      octx.fillStyle = g;
      octx.beginPath();
      octx.moveTo(2, -1);
      octx.lineTo(16, -5);
      octx.lineTo(16, 5);
      octx.lineTo(2, 1);
      octx.fill();
      octx.restore();
    }
    // street lamps light pools of road
    for (const l of world.lamps || []) {
      const lx = l.x + Math.cos(l.ang) * 1.6;
      const ly = l.y + Math.sin(l.ang) * 1.6;
      if (Math.abs(lx - cam.x) > 90 || Math.abs(ly - cam.y) > 90) continue;
      g = octx.createRadialGradient(lx, ly, 0.5, lx, ly, 9);
      g.addColorStop(0, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      octx.fillStyle = g;
      octx.beginPath();
      octx.arc(lx, ly, 9, 0, TAU);
      octx.fill();
    }
    // the sign you are approaching stays readable
    if (state.activeSign) {
      g = octx.createRadialGradient(state.activeSign.x, state.activeSign.y, 1, state.activeSign.x, state.activeSign.y, 7);
      g.addColorStop(0, 'rgba(0,0,0,0.9)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      octx.fillStyle = g;
      octx.beginPath();
      octx.arc(state.activeSign.x, state.activeSign.y, 7, 0, TAU);
      octx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(off, 0, 0);
    // route line stays visible
    applyView(ctx, sx, sy);
    drawRoute(0.65);
  }

  function drawRain(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(28,42,66,0.2)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(210,225,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of rain) {
      const y = ((d.y + time * d.v * 0.9) % 1) * H;
      const x = d.x * W - (y * 0.12);
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 11);
    }
    ctx.stroke();
  }

  // ------------------------------------------------------------- minimap
  /** The round Waze-style map: roads, purple route, pins, other cars. Heading up. */
  function drawMinimap(mc, size, state) {
    const k = 0.78; // pixels per metre
    const car = state.car;
    const c = mc.getContext('2d');
    const d = Math.min(window.devicePixelRatio || 1, 2);
    if (mc.width !== Math.round(size * d)) {
      mc.width = Math.round(size * d);
      mc.height = Math.round(size * d);
    }
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, size, size);
    c.save();
    c.beginPath();
    c.arc(size / 2, size / 2, size / 2, 0, TAU);
    c.clip();
    c.fillStyle = state.weather === 'night' ? '#141b26' : '#1d2733';
    c.fillRect(0, 0, size, size);
    c.translate(size / 2, size * 0.62);
    c.rotate(-Math.PI / 2 - car.heading);
    c.scale(k, k);
    c.translate(-car.x, -car.y);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.strokeStyle = '#0e141c';
    c.lineWidth = world.roadWidth + 2.6;
    for (const p of paths) c.stroke(p.path);
    c.strokeStyle = '#46576d';
    c.lineWidth = world.roadWidth;
    for (const p of paths) c.stroke(p.path);
    // purple route
    if (paths.length) {
      c.strokeStyle = 'rgba(143,91,255,0.35)';
      c.lineWidth = 8 / k;
      c.stroke(paths[0].path);
      c.strokeStyle = '#a98bff';
      c.lineWidth = 4 / k;
      c.stroke(paths[0].path);
    }
    for (const r of world.rings) {
      c.fillStyle = '#1d2733';
      c.beginPath();
      c.arc(r.cx, r.cy, r.island, 0, TAU);
      c.fill();
    }
    // pins
    for (const p of world.pins) {
      c.fillStyle = pinColor(p.type);
      c.beginPath();
      c.arc(p.x, p.y, 4.2 / k, 0, TAU);
      c.fill();
      c.strokeStyle = '#fff';
      c.lineWidth = 1.4 / k;
      c.stroke();
    }
    // other road users
    c.fillStyle = '#c4a6ff';
    for (const n of [...state.npcs, ...state.traffic]) {
      c.beginPath();
      c.arc(n.x, n.y, 3 / k, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#ffb347';
    for (const p of state.peds) {
      if (p.phase === 'wait' || p.phase === 'cross') {
        c.beginPath();
        c.arc(p.px, p.py, 3 / k, 0, TAU);
        c.fill();
      }
    }
    c.restore();
    // my car (always the same spot, pointing up)
    c.save();
    c.translate(size / 2, size * 0.62);
    c.fillStyle = '#2f9bff';
    c.strokeStyle = '#fff';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(0, -8);
    c.lineTo(6, 6);
    c.lineTo(0, 3);
    c.lineTo(-6, 6);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }

  /** Screen point (CSS px) -> world point (metres), the inverse of applyView. */
  function screenToWorld(px, py) {
    const r = canvas.getBoundingClientRect();
    const dx = px - r.left - W / 2;
    const dy = py - r.top - H * anchorY;
    const c = Math.cos(-cam.angle);
    const s = Math.sin(-cam.angle);
    return { x: cam.x + (dx * c - dy * s) / cam.scale, y: cam.y + (dx * s + dy * c) / cam.scale };
  }
  /** The road sign drawn under a screen point (generous touch area), or null. */
  function signAt(px, py) {
    const p = screenToWorld(px, py);
    const reach = C.world.signRadius * 1.6 + 14 / cam.scale;
    let best = null;
    let bd = reach;
    for (const sg of world.signs) {
      const d = Math.hypot(sg.x - p.x, sg.y - p.y);
      if (d < bd) {
        bd = d;
        best = sg;
      }
    }
    return best;
  }

  /** A map pin (speed camera, police, hazard, station) under a screen point, or null. */
  function pinAt(px, py) {
    const p = screenToWorld(px, py);
    const reach = 3.5 + 14 / cam.scale;
    let best = null;
    let bd = reach;
    for (const pin of world.pins) {
      if (pin.type === 'crosswalk' || pin.type === 'pickup' || pin.type === 'home') continue;
      const d = Math.hypot(pin.x - p.x, pin.y - 2.3 - p.y);
      if (d < bd) {
        bd = d;
        best = pin;
      }
    }
    return best;
  }

  resize();
  return { resize, setWorld, screenToWorld, signAt, pinAt, updateCamera, draw, drawMinimap, cam, get portrait() { return portrait; } };
}
