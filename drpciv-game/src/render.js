// ============================================================================
//  render.js  —  DRAWS THE WORLD on the canvas (grass, roads, signs, cars)
//  It only reads the game state, it never changes it.
//  Colours of the scenery are in the COL table just below.
// ============================================================================

import { CONFIG as C } from './config.js';
import { getSignSprite } from './signart.js';

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
};

function buildPaths(world) {
  if (typeof Path2D === 'undefined') return [];
  return world.roads.map((road) => {
    const path = new Path2D();
    let first = true;
    for (const s of road.segs) {
      if (s.type === 'line') {
        if (first) path.moveTo(s.x0, s.y0);
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

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas, world) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const paths = buildPaths(world);
  const half = world.half;
  let W = 1;
  let H = 1;
  let dpr = 1;
  let portrait = true;
  const cam = { x: world.start.x, y: world.start.y, angle: -Math.PI / 2 - world.start.heading, scale: 10, ready: false };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = Math.max(1, canvas.clientWidth);
    H = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    portrait = H >= W;
  }

  // -------------------------------------------------------------- camera
  function updateCamera(state, dt, settings) {
    const car = state.car;
    const K = C.camera;
    const vmax = C.car.maxSpeedKmh / 3.6;
    const meters = portrait ? K.portraitMeters : K.landscapeMeters;
    const wantScale = (H / meters) * (1 - K.zoomOutAtTopSpeed * clamp(Math.abs(car.v) / vmax, 0, 1));
    const look = clamp(car.v * K.lookAhead, -3, K.maxLookAhead);
    const tx = car.x + Math.cos(car.heading) * look;
    const ty = car.y + Math.sin(car.heading) * look;
    const wantAngle = settings.rotate ? -Math.PI / 2 - car.heading : 0;
    if (!cam.ready) {
      cam.x = tx;
      cam.y = ty;
      cam.angle = wantAngle;
      cam.scale = wantScale;
      cam.ready = true;
      return;
    }
    const f = (rate) => 1 - Math.exp(-rate * Math.min(dt, 0.1));
    cam.x += (tx - cam.x) * f(K.follow);
    cam.y += (ty - cam.y) * f(K.follow);
    cam.scale += (wantScale - cam.scale) * f(3);
    cam.angle += wrap(wantAngle - cam.angle) * f(K.rotateFollow);
  }

  // ---------------------------------------------------------------- draw
  function draw(state, settings, time) {
    const anchorY = settings.rotate ? (portrait ? C.camera.anchorYPortrait : C.camera.anchorYLandscape) : 0.5;
    const k = state.shake;
    const sx = (Math.random() - 0.5) * k * 10;
    const sy = (Math.random() - 0.5) * k * 10;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COL.grassA;
    ctx.fillRect(0, 0, W, H);

    ctx.translate(W / 2 + sx, H * anchorY + sy);
    ctx.rotate(cam.angle);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-cam.x, -cam.y);

    const R = Math.hypot(W, H) / cam.scale + 6; // radius that surely covers the screen

    drawGrass(R);
    drawRoads();
    drawIslands();
    drawPaint();
    drawHouses(R);
    drawTraffic(state);
    drawCar(state.car, '#e0382f', state.car.braking, state.car.reversing, true);
    drawTrees(R);
    drawSigns(state, R, time);
  }

  function drawGrass(R) {
    const G = 14;
    ctx.fillStyle = COL.grassB;
    const x0 = Math.floor((cam.x - R) / G);
    const x1 = Math.ceil((cam.x + R) / G);
    const y0 = Math.floor((cam.y - R) / G);
    const y1 = Math.ceil((cam.y + R) / G);
    for (let gx = x0; gx < x1; gx++) {
      for (let gy = y0; gy < y1; gy++) {
        if ((gx + gy) & 1) ctx.fillRect(gx * G, gy * G, G, G);
      }
    }
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
    ctx.setLineDash([]);
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

  function drawPaint() {
    for (const p of world.paint) {
      if (Math.hypot(p.x - cam.x, p.y - cam.y) > 120) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.dy, p.dx));
      ctx.fillStyle = COL.paint;
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

  function drawHouses(R) {
    for (const h of world.houses) {
      if (Math.hypot(h.x - cam.x, h.y - cam.y) > R + 12) continue;
      const x = h.x - h.w / 2;
      const y = h.y - h.h / 2;
      ctx.fillStyle = COL.shadow;
      ctx.fillRect(x + 1.1, y + 1.3, h.w, h.h);
      ctx.fillStyle = h.roof;
      ctx.fillRect(x, y, h.w, h.h);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(x, y + h.h / 2 - 0.25, h.w, 0.5); // roof ridge
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x, y, h.w, h.h / 2 - 0.25);
    }
  }

  function drawTrees(R) {
    for (const t of world.trees) {
      if (Math.abs(t.x - cam.x) > R + 5 || Math.abs(t.y - cam.y) > R + 5) continue;
      if (Math.hypot(t.x - cam.x, t.y - cam.y) > R + 5) continue;
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

  function drawTraffic(state) {
    for (const ai of state.traffic) drawCar(ai, ai.color, false, false, false);
  }

  // The car: x = forward, y = right (in its own little coordinate system)
  function drawCar(car, color, braking, reversing, player) {
    const L = C.car.length;
    const Wd = C.car.width;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.heading);

    ctx.fillStyle = COL.shadow;
    roundRectPath(ctx, -L / 2 + 0.25, -Wd / 2 + 0.3, L, Wd, 0.6);
    ctx.fill();

    // wheels (front pair turns with the steering)
    ctx.fillStyle = '#16181b';
    const wl = 0.85;
    const ww = 0.34;
    const wx = L * 0.3;
    const wy = Wd / 2 - 0.02;
    const steer = player ? car.steer : 0;
    for (const [x, y, s] of [[wx, -wy, steer], [wx, wy, steer], [-wx, -wy, 0], [-wx, wy, 0]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s);
      ctx.fillRect(-wl / 2, -ww / 2, wl, ww);
      ctx.restore();
    }

    // body
    ctx.fillStyle = color;
    roundRectPath(ctx, -L / 2, -Wd / 2 + 0.08, L, Wd - 0.16, 0.65);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRectPath(ctx, -L / 2 + 0.2, -Wd / 2 + 0.2, L - 0.4, 0.5, 0.25);
    ctx.fill();

    // glass + roof
    ctx.fillStyle = '#1d2a35';
    roundRectPath(ctx, 0.15, -Wd / 2 + 0.28, 1.15, Wd - 0.56, 0.3); // windscreen
    ctx.fill();
    roundRectPath(ctx, -1.55, -Wd / 2 + 0.3, 0.85, Wd - 0.6, 0.25); // rear window
    ctx.fill();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    roundRectPath(ctx, -0.75, -Wd / 2 + 0.22, 0.95, Wd - 0.44, 0.2); // roof
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRectPath(ctx, -0.7, -Wd / 2 + 0.28, 0.8, 0.3, 0.12);
    ctx.fill();

    // lights
    ctx.fillStyle = '#fff6c4';
    ctx.fillRect(L / 2 - 0.22, -Wd / 2 + 0.22, 0.2, 0.36);
    ctx.fillRect(L / 2 - 0.22, Wd / 2 - 0.58, 0.2, 0.36);
    ctx.fillStyle = braking ? '#ff2a1f' : '#8a1712';
    ctx.fillRect(-L / 2 + 0.02, -Wd / 2 + 0.22, 0.2, 0.4);
    ctx.fillRect(-L / 2 + 0.02, Wd / 2 - 0.62, 0.2, 0.4);
    if (braking) {
      ctx.fillStyle = 'rgba(255,40,30,0.28)';
      ctx.beginPath();
      ctx.arc(-L / 2 - 0.2, 0, 1.9, 0, TAU);
      ctx.fill();
    }
    if (reversing) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-L / 2 + 0.02, -0.18, 0.2, 0.36);
    }
    ctx.restore();
  }

  function drawSigns(state, R, time) {
    const rot = -cam.angle; // keep signs upright on screen
    const r0 = C.world.signRadius;
    for (const sg of world.signs) {
      if (Math.hypot(sg.x - cam.x, sg.y - cam.y) > R + 6) continue;
      const active = state.activeSign === sg;
      const pulse = active ? 1 + 0.07 * Math.sin(time * 7) : 1;
      const r = r0 * pulse * (active ? 1.12 : 1);
      ctx.save();
      ctx.translate(sg.x, sg.y);
      ctx.rotate(rot);

      // pole base + shadow
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

  resize();
  return { resize, updateCamera, draw, cam, get portrait() { return portrait; } };
}
