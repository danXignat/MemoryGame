// ============================================================================
//  signart.js  —  DRAWS THE ROAD SIGNS (shapes + symbols) ON A CANVAS
//
//  signs.js says WHAT a sign looks like (`art: { shape, fill, border, symbol }`),
//  this file knows HOW to paint it. To invent a new picture on a sign, add a
//  function to SYMBOLS below (coordinates run from -1 to +1 inside the sign).
// ============================================================================

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- shapes
function regular(n, radius, startAngle) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = startAngle + (i * TAU) / n;
    pts.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  return pts;
}

function describe(pts, forcedCenter) {
  // centre + radius of the biggest circle that fits inside a convex polygon
  let cx = 0;
  let cy = 0;
  if (forcedCenter) {
    [cx, cy] = forcedCenter;
  }
  let inr = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const d = Math.abs((x1 - x0) * (y0 - cy) - (y1 - y0) * (x0 - cx)) / len;
    inr = Math.min(inr, d);
  }
  return { pts, cx, cy, inr };
}

function triangle(up) {
  const s = up ? 1 : -1;
  const pts = [
    [0, -1.0 * s],
    [0.98, 0.72 * s],
    [-0.98, 0.72 * s],
  ];
  // incenter of the triangle
  const [A, B, C] = pts;
  const a = Math.hypot(B[0] - C[0], B[1] - C[1]);
  const b = Math.hypot(A[0] - C[0], A[1] - C[1]);
  const c = Math.hypot(A[0] - B[0], A[1] - B[1]);
  const cx = (a * A[0] + b * B[0] + c * C[0]) / (a + b + c);
  const cy = (a * A[1] + b * B[1] + c * C[1]) / (a + b + c);
  return describe(pts, [cx, cy]);
}

const SHAPES = {
  circle: { circle: true, cx: 0, cy: 0, inr: 1 },
  octagon: describe(regular(8, 1 / Math.cos(Math.PI / 8), Math.PI / 8)),
  diamond: describe([[0, -1.12], [1.12, 0], [0, 1.12], [-1.12, 0]]),
  square: describe([[-0.88, -0.88], [0.88, -0.88], [0.88, 0.88], [-0.88, 0.88]]),
  triangleUp: triangle(true),
  triangleDown: triangle(false),
};

// How big the symbol is allowed to be inside each shape (triangles have little room)
const SYMBOL_BOX = {
  circle: { scale: 1, dy: 0 },
  octagon: { scale: 1, dy: 0 },
  diamond: { scale: 1, dy: 0 },
  square: { scale: 1, dy: 0 },
  triangleUp: { scale: 1.5, dy: 0.1 },
  triangleDown: { scale: 1.5, dy: -0.1 },
};

function shapePath(ctx, shape, inset) {
  const sh = SHAPES[shape];
  ctx.beginPath();
  if (sh.circle) {
    ctx.arc(0, 0, Math.max(0.001, 1 - inset), 0, TAU);
    return;
  }
  const k = Math.max(0.001, (sh.inr - inset) / sh.inr);
  sh.pts.forEach(([x, y], i) => {
    const px = sh.cx + (x - sh.cx) * k;
    const py = sh.cy + (y - sh.cy) * k;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

function fillShape(ctx, shape, inset, color, round = 0.045) {
  const sh = SHAPES[shape];
  ctx.fillStyle = color;
  if (sh.circle) {
    shapePath(ctx, shape, inset);
    ctx.fill();
    return;
  }
  // slightly rounded corners: shrink a bit, then stroke with a round join
  shapePath(ctx, shape, inset + round);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = round * 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// --------------------------------------------------------------- symbols
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function miniCar(ctx, x, body, glass) {
  ctx.fillStyle = body;
  roundRect(ctx, x - 0.21, -0.5, 0.42, 1.0, 0.13);
  ctx.fill();
  ctx.fillStyle = glass;
  roundRect(ctx, x - 0.15, -0.3, 0.3, 0.2, 0.05); // windscreen
  ctx.fill();
  roundRect(ctx, x - 0.15, 0.15, 0.3, 0.14, 0.05); // rear window
  ctx.fill();
}

function arrowHead(ctx, px, py, dirX, dirY, size, color) {
  // filled triangle whose tip points along (dirX, dirY)
  const nx = -dirY;
  const ny = dirX;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(px + dirX * size, py + dirY * size);
  ctx.lineTo(px + nx * size * 0.78, py + ny * size * 0.78);
  ctx.lineTo(px - nx * size * 0.78, py - ny * size * 0.78);
  ctx.closePath();
  ctx.fill();
}

const SYMBOLS = {
  text(ctx, s) {
    ctx.save();
    ctx.scale(0.01, 0.01); // work in "100 px per unit" so the font size is sane
    ctx.fillStyle = s.color || '#111';
    ctx.font = `900 ${Math.round(s.size * 100)}px "Arial Black", Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.text, 0, (s.dy ?? 0.05) * 100, (s.maxW ?? 1.6) * 100);
    ctx.restore();
  },

  overtake(ctx, s) {
    if (s.grey) {
      miniCar(ctx, -0.3, '#7a808a', '#e6e8eb');
      miniCar(ctx, 0.3, '#7a808a', '#e6e8eb');
    } else {
      miniCar(ctx, -0.3, '#d62828', '#ffffff');
      miniCar(ctx, 0.3, '#15171a', '#8a93a0');
    }
  },

  cross(ctx, s) {
    ctx.strokeStyle = s.color || '#d62828';
    ctx.lineWidth = 0.24;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(-0.62, -0.62);
    ctx.lineTo(0.62, 0.62);
    ctx.moveTo(0.62, -0.62);
    ctx.lineTo(-0.62, 0.62);
    ctx.stroke();
  },

  bar(ctx) {
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, -0.82, -0.17, 1.64, 0.34, 0.03);
    ctx.fill();
  },

  arrowRight(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-0.78, -0.2);
    ctx.lineTo(0.08, -0.2);
    ctx.lineTo(0.08, -0.55);
    ctx.lineTo(0.86, 0);
    ctx.lineTo(0.08, 0.55);
    ctx.lineTo(0.08, 0.2);
    ctx.lineTo(-0.78, 0.2);
    ctx.closePath();
    ctx.fill();
  },

  arrowLeft(ctx) {
    ctx.save();
    ctx.scale(-1, 1);
    SYMBOLS.arrowRight(ctx);
    ctx.restore();
  },

  slash(ctx, s) {
    ctx.strokeStyle = s.color || '#d62828';
    ctx.lineWidth = 0.24;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(-0.62, 0.62);
    ctx.lineTo(0.62, -0.62);
    ctx.stroke();
  },

  curveLeft(ctx) {
    ctx.save();
    ctx.scale(-1, 1);
    SYMBOLS.curveRight(ctx);
    ctx.restore();
  },

  narrow(ctx) {
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 0.2;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 0.5, 0.75);
      ctx.lineTo(sx * 0.5, 0.15);
      ctx.lineTo(sx * 0.28, -0.1);
      ctx.lineTo(sx * 0.28, -0.75);
      ctx.stroke();
    }
  },

  arrowUp(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-0.19, 0.85);
    ctx.lineTo(-0.19, -0.05);
    ctx.lineTo(-0.55, -0.05);
    ctx.lineTo(0, -0.85);
    ctx.lineTo(0.55, -0.05);
    ctx.lineTo(0.19, -0.05);
    ctx.lineTo(0.19, 0.85);
    ctx.closePath();
    ctx.fill();
  },

  roundabout(ctx) {
    const R = 0.5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.17;
    ctx.lineCap = 'butt';
    for (let i = 0; i < 3; i++) {
      const start = -Math.PI / 2 + (i * TAU) / 3 + 0.25;
      const end = start - 1.45; // anticlockwise
      ctx.beginPath();
      ctx.arc(0, 0, R, start, end, true);
      ctx.stroke();
      // arrow head at the end, pointing anticlockwise
      const px = Math.cos(end) * R;
      const py = Math.sin(end) * R;
      const tx = Math.sin(end);
      const ty = -Math.cos(end);
      const bx = px + tx * 0.2;
      const by = py + ty * 0.2;
      arrowHead(ctx, bx - tx * 0.12, by - ty * 0.12, tx, ty, 0.24, '#ffffff');
    }
  },

  curveRight(ctx) {
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 0.2;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.38, 0.8);
    ctx.lineTo(-0.38, 0.1);
    ctx.quadraticCurveTo(-0.38, -0.5, 0.16, -0.5);
    ctx.stroke();
    arrowHead(ctx, 0.2, -0.5, 1, 0, 0.42, '#111111');
  },

  children(ctx) {
    const ink = '#111111';
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.lineCap = 'round';
    // big child (left)
    ctx.beginPath();
    ctx.arc(-0.3, -0.5, 0.15, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 0.2;
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.3);
    ctx.lineTo(-0.3, 0.14);
    ctx.stroke();
    ctx.lineWidth = 0.14;
    ctx.beginPath();
    ctx.moveTo(-0.3, 0.14);
    ctx.lineTo(-0.42, 0.66);
    ctx.moveTo(-0.3, 0.14);
    ctx.lineTo(-0.16, 0.66);
    ctx.stroke();
    // small child (right)
    ctx.beginPath();
    ctx.arc(0.34, -0.22, 0.12, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 0.17;
    ctx.beginPath();
    ctx.moveTo(0.34, -0.06);
    ctx.lineTo(0.34, 0.26);
    ctx.stroke();
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(0.34, 0.26);
    ctx.lineTo(0.25, 0.66);
    ctx.moveTo(0.34, 0.26);
    ctx.lineTo(0.45, 0.66);
    // hands joined
    ctx.moveTo(-0.3, -0.12);
    ctx.lineTo(0.34, 0.02);
    ctx.stroke();
  },

  pedestrianCrossing(ctx) {
    // white triangle with a walking figure standing on zebra stripes
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.moveTo(0, -0.86);
    ctx.lineTo(0.9, 0.72);
    ctx.lineTo(-0.9, 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const ink = '#111111';
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0.02, -0.38, 0.12, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 0.17;
    ctx.beginPath();
    ctx.moveTo(0.02, -0.22);
    ctx.lineTo(-0.02, 0.1);
    ctx.stroke();
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(-0.02, 0.1); // legs
    ctx.lineTo(-0.2, 0.36);
    ctx.moveTo(-0.02, 0.1);
    ctx.lineTo(0.14, 0.36);
    ctx.moveTo(0.02, -0.14); // arms
    ctx.lineTo(-0.2, 0.0);
    ctx.moveTo(0.02, -0.14);
    ctx.lineTo(0.22, -0.02);
    ctx.stroke();
    // zebra
    for (let i = 0; i < 4; i++) {
      const x = -0.5 + i * 0.33;
      ctx.fillRect(x - 0.08, 0.46, 0.16, 0.13);
    }
  },
};

// ------------------------------------------------------------ main drawing
/** Draw one sign centred on (0,0). `R` is its outer radius in pixels. */
export function drawSign(ctx, art, R) {
  const shapeName = art.shape;
  const sh = SHAPES[shapeName];
  const box = SYMBOL_BOX[shapeName];
  const o = art.outline ? 0.035 : 0;
  const bw = art.borderW ?? 0.08;

  ctx.save();
  ctx.scale(R, R);

  if (art.outline) fillShape(ctx, shapeName, 0, art.outline);
  fillShape(ctx, shapeName, o, art.border || '#ffffff');
  fillShape(ctx, shapeName, o + bw, art.fill || '#ffffff');

  const inner = sh.inr - o - bw;
  const sym = art.symbol;
  const clipPath = () => shapePath(ctx, shapeName, o + bw);

  if (sym && SYMBOLS[sym.type]) {
    ctx.save();
    ctx.translate(sh.cx, sh.cy + (box.dy || 0));
    const sc = inner * box.scale * (sym.scale ?? 1) * 0.93;
    ctx.scale(sc, sc);
    ctx.lineJoin = 'round';
    SYMBOLS[sym.type](ctx, sym);
    ctx.restore();
  }

  if (art.cancel) {
    // three grey diagonal stripes = "end of restriction"
    ctx.save();
    clipPath();
    ctx.clip();
    ctx.strokeStyle = '#4a4f57';
    ctx.lineCap = 'butt';
    ctx.lineWidth = 0.075;
    for (const off of [-0.3, 0, 0.3]) {
      ctx.beginPath();
      ctx.moveTo(-1.2 + off * 1.4, 1.2 + off * 0.0 - 0.0);
      ctx.lineTo(1.2 + off * 1.4, -1.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

// ----------------------------------------------------------------- caches
const spriteCache = new Map();

/** A ready-made canvas of the sign, `px` pixels square (cached). */
export function getSignSprite(key, art, px = 256) {
  const id = `${key}@${px}`;
  if (spriteCache.has(id)) return spriteCache.get(id);
  const c = document.createElement('canvas');
  c.width = px;
  c.height = px;
  const ctx = c.getContext('2d');
  ctx.translate(px / 2, px / 2);
  drawSign(ctx, art, px / 2 / 1.14);
  spriteCache.set(id, c);
  return c;
}

const urlCache = new Map();
export function getSignDataURL(key, art, px = 256) {
  const id = `${key}@${px}`;
  if (!urlCache.has(id)) urlCache.set(id, getSignSprite(key, art, px).toDataURL('image/png'));
  return urlCache.get(id);
}
