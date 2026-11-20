// ============================================================================
//  gfx.js  —  ready-made pictures for the renderer (made once, then reused)
//
//  Sprites for cars and trees.
//  They are drawn with gradients and soft shadows into small hidden canvases,
//  so the game only has to copy them each frame (fast on phones).
// ============================================================================

const TAU = Math.PI * 2;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
}

// a small deterministic random generator, so the textures look the same every time
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex, f) {
  // f > 0 lighter, f < 0 darker
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (f >= 0) {
    r += (255 - r) * f;
    g += (255 - g) * f;
    b += (255 - b) * f;
  } else {
    r *= 1 + f;
    g *= 1 + f;
    b *= 1 + f;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

// ---------------------------------------------------------------------- cars
//  A car sprite seen from above, nose pointing right (+x). PPM pixels per metre.
const PPM = 40;
const carCache = new Map();

export function carSprite(color, L = 4.3, Wd = 1.8, police = false) {
  const key = `${color}|${L}|${Wd}|${police}`;
  if (carCache.has(key)) return carCache.get(key);
  const pad = 0.6;
  const cw = (L + pad * 2) * PPM;
  const ch = (Wd + pad * 2) * PPM;
  const c = canvas(cw, ch);
  const g = c.getContext('2d');
  g.translate(cw / 2, ch / 2);
  g.scale(PPM, PPM);

  const body = new Path2D();
  // slightly tapered nose and tail, rounded corners
  const hl = L / 2;
  const hw = Wd / 2 - 0.04;
  body.moveTo(-hl + 0.35, -hw);
  body.lineTo(hl - 0.55, -hw);
  body.quadraticCurveTo(hl - 0.05, -hw + 0.02, hl, -hw + 0.38);
  body.lineTo(hl, hw - 0.38);
  body.quadraticCurveTo(hl - 0.05, hw - 0.02, hl - 0.55, hw);
  body.lineTo(-hl + 0.35, hw);
  body.quadraticCurveTo(-hl, hw - 0.02, -hl, hw - 0.32);
  body.lineTo(-hl, -hw + 0.32);
  body.quadraticCurveTo(-hl, -hw + 0.02, -hl + 0.35, -hw);
  body.closePath();

  // soft shadow on the ground (sun from the top left)
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.45)';
  g.shadowBlur = 0.35 * PPM;
  g.shadowOffsetX = 0.18 * PPM;
  g.shadowOffsetY = 0.22 * PPM;
  g.fillStyle = '#000';
  g.fill(body);
  g.restore();

  // paint: darker at the sides, glossy along the middle
  const paint = g.createLinearGradient(0, -hw, 0, hw);
  paint.addColorStop(0, shade(color, -0.35));
  paint.addColorStop(0.18, shade(color, 0.05));
  paint.addColorStop(0.5, shade(color, 0.22));
  paint.addColorStop(0.82, shade(color, 0.0));
  paint.addColorStop(1, shade(color, -0.4));
  g.fillStyle = paint;
  g.fill(body);
  g.lineWidth = 0.05;
  g.strokeStyle = 'rgba(0,0,0,0.45)';
  g.stroke(body);

  // bonnet crease lines
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 0.04;
  g.beginPath();
  g.moveTo(hl - 0.15, -hw * 0.45);
  g.lineTo(L * 0.18, -hw * 0.5);
  g.moveTo(hl - 0.15, hw * 0.45);
  g.lineTo(L * 0.18, hw * 0.5);
  g.stroke();

  // glasshouse: windscreen, roof, rear window
  const glass = (x0, x1, inset0, inset1) => {
    const p = new Path2D();
    p.moveTo(x0, -hw + inset0);
    p.lineTo(x1, -hw + inset1);
    p.lineTo(x1, hw - inset1);
    p.lineTo(x0, hw - inset0);
    p.closePath();
    return p;
  };
  const glassGrad = (x0, x1) => {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, '#0f1c27');
    gr.addColorStop(0.55, '#24394a');
    gr.addColorStop(1, '#3b5568');
    return gr;
  };
  const wsF = L * 0.2; // front of windscreen
  const wsB = L * 0.03; // top of windscreen
  const rwF = -L * 0.2;
  const rwB = -L * 0.31;
  g.fillStyle = glassGrad(wsB, wsF);
  g.fill(glass(wsF, wsB, 0.3, 0.2));
  g.fillStyle = glassGrad(rwF, rwB);
  g.fill(glass(rwB, rwF, 0.28, 0.2));
  // side windows
  g.fillStyle = '#1b2b38';
  g.fillRect(rwF, -hw + 0.06, wsB - rwF, 0.15);
  g.fillRect(rwF, hw - 0.21, wsB - rwF, 0.15);
  // roof panel
  const roof = g.createLinearGradient(0, -hw, 0, hw);
  roof.addColorStop(0, shade(color, -0.15));
  roof.addColorStop(0.45, shade(color, 0.3));
  roof.addColorStop(1, shade(color, -0.2));
  g.fillStyle = roof;
  const rp = new Path2D();
  rp.roundRect ? rp.roundRect(rwF - 0.02, -hw + 0.22, wsB - rwF + 0.04, Wd - 0.52, 0.14) : rp.rect(rwF - 0.02, -hw + 0.22, wsB - rwF + 0.04, Wd - 0.52);
  g.fill(rp);
  // windscreen reflection
  g.strokeStyle = 'rgba(255,255,255,0.28)';
  g.lineWidth = 0.07;
  g.beginPath();
  g.moveTo(wsB + 0.12, -hw + 0.45);
  g.lineTo(wsF - 0.12, -hw + 0.65);
  g.stroke();
  // mirrors
  g.fillStyle = shade(color, -0.3);
  g.fillRect(wsF - 0.18, -hw - 0.14, 0.22, 0.16);
  g.fillRect(wsF - 0.18, hw - 0.02, 0.22, 0.16);
  // light housings (the game adds the glow when they are on)
  g.fillStyle = 'rgba(235,238,230,0.85)';
  g.fillRect(hl - 0.2, -hw + 0.16, 0.16, 0.42);
  g.fillRect(hl - 0.2, hw - 0.58, 0.16, 0.42);
  g.fillStyle = '#7d1712';
  g.fillRect(-hl + 0.03, -hw + 0.14, 0.15, 0.46);
  g.fillRect(-hl + 0.03, hw - 0.6, 0.15, 0.46);
  if (police) {
    g.fillStyle = '#1d4ed8';
    g.fillRect(-hl + 0.4, -hw + 0.02, L - 0.95, 0.2);
    g.fillRect(-hl + 0.4, hw - 0.22, L - 0.95, 0.2);
    g.fillStyle = '#ffffff';
    g.font = 'bold 0.32px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.save();
    g.translate(hl * 0.55, 0);
    g.rotate(-Math.PI / 2);
    g.fillStyle = 'rgba(20,40,120,0.9)';
    g.fillText('POLIȚIA', 0, 0);
    g.restore();
  }
  const out = { img: c, w: cw / PPM, h: ch / PPM };
  carCache.set(key, out);
  return out;
}

// --------------------------------------------------------------------- trees
//  A few round crowns made of overlapping leaf clumps, lit from the top left.
const treeCache = [];
export function treeSprite(variant) {
  if (treeCache[variant]) return treeCache[variant];
  const r = rng(100 + variant * 7);
  const S = 200; // px for a crown of radius 1 (drawn at 2r)
  const c = canvas(S, S);
  const g = c.getContext('2d');
  const palettes = [
    ['#2d6e34', '#3f8a43', '#6fb35c'],
    ['#27603a', '#357d45', '#5fa462'],
    ['#3d7a2e', '#4f9338', '#88c060'],
    ['#2b5f43', '#3a7b55', '#6aa77a'],
    ['#47702b', '#5b8a33', '#9cbf5a'],
    ['#24583a', '#2f7046', '#58975e'],
  ];
  const [dark, mid, light] = palettes[variant % palettes.length];
  const cx = S / 2;
  const R = S * 0.4;
  // base crown
  g.fillStyle = dark;
  g.beginPath();
  g.arc(cx, cx, R * 0.98, 0, TAU);
  g.fill();
  // clumps
  const clumps = 9 + Math.floor(r() * 4);
  for (let i = 0; i < clumps; i++) {
    const a = r() * TAU;
    const d = R * (0.25 + r() * 0.55);
    const x = cx + Math.cos(a) * d;
    const y = cx + Math.sin(a) * d;
    const rad = R * (0.32 + r() * 0.22);
    const gr = g.createRadialGradient(x - rad * 0.35, y - rad * 0.4, rad * 0.1, x, y, rad);
    gr.addColorStop(0, light);
    gr.addColorStop(0.55, mid);
    gr.addColorStop(1, dark);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, rad, 0, TAU);
    g.fill();
  }
  // top highlight and shaded bottom right
  const hl = g.createRadialGradient(cx - R * 0.35, cx - R * 0.4, 0, cx, cx, R * 1.05);
  hl.addColorStop(0, 'rgba(255,255,220,0.22)');
  hl.addColorStop(0.5, 'rgba(255,255,220,0)');
  hl.addColorStop(0.8, 'rgba(0,0,0,0)');
  hl.addColorStop(1, 'rgba(0,30,0,0.35)');
  g.fillStyle = hl;
  g.beginPath();
  g.arc(cx, cx, R, 0, TAU);
  g.fill();
  const out = { img: c, scale: (S / 2 / R) * 1 }; // multiply by tree radius for half-size
  treeCache[variant] = out;
  return out;
}

export const shadeColor = shade;
