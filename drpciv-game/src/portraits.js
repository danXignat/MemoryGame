// ============================================================================
//  portraits.js  —  the four people in the game and their photos.
//
//  Put the photos in  public/assets/  with these file names (jpeg, jpg, png or webp):
//      naty.jpeg      Naty      the player / developer (driver avatar)
//      alisia.jpeg    Alisia    Naty's girlfriend, the right-seat passenger
//      dan.jpeg       Dan       the friend who gives tips
//      petra.jpeg     Petra     Dan's wife
//  Until a photo is found, a drawn placeholder (coloured circle + initial) is used.
// ============================================================================

export const PEOPLE = {
  naty: { id: 'naty', name: 'Naty', role: { en: 'Driver and developer', ro: 'Șofer și dezvoltator' }, color: '#2f7bf6', initial: 'N' },
  alisia: { id: 'alisia', name: 'Alisia', role: { en: "Naty's girlfriend", ro: 'Prietena lui Naty' }, color: '#e8548c', initial: 'A' },
  dan: { id: 'dan', name: 'Dan', role: { en: 'Friend', ro: 'Prietenul' }, color: '#25a86f', initial: 'D' },
  petra: { id: 'petra', name: 'Petra', role: { en: "Dan's wife", ro: 'Soția lui Dan' }, color: '#e8a02a', initial: 'P' },
};

const EXT = ['jpeg', 'jpg', 'png', 'webp'];
const urls = {};
const images = {}; // real photos only (HTMLImageElement) for drawing on the canvas

function placeholder(p) {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 160;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 160, 160);
  grd.addColorStop(0, p.color);
  grd.addColorStop(1, '#10202c');
  g.fillStyle = grd;
  g.fillRect(0, 0, 160, 160);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.font = '700 84px "Barlow Condensed", Arial Narrow, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(p.initial, 80, 88);
  return c.toDataURL('image/png');
}

function tryLoad(id, list, i = 0) {
  if (i >= list.length) return;
  const im = new Image();
  im.onload = () => {
    images[id] = im;
    urls[id] = list[i];
    refresh();
  };
  im.onerror = () => tryLoad(id, list, i + 1);
  im.src = list[i];
}

/** Point every <img data-portrait="id"> at the current picture. */
export function refresh(root = document) {
  root.querySelectorAll('img[data-portrait]').forEach((el) => {
    const u = urls[el.dataset.portrait];
    if (u && el.getAttribute('src') !== u) el.src = u;
  });
}

export function initPortraits() {
  for (const p of Object.values(PEOPLE)) {
    urls[p.id] = placeholder(p);
    const embedded = window.__ASSETS && window.__ASSETS[p.id];
    tryLoad(p.id, [...(embedded ? [embedded] : []), ...EXT.map((e) => `./assets/${p.id}.${e}`)]);
  }
  refresh();
}

export const portraitURL = (id) => urls[id] || '';
/** The real photo as an image, or null while only the placeholder exists. */
export const portraitImage = (id) => images[id] || null;
/** Markup for a round portrait. */
export const pimg = (id, cls = '') => `<img class="pf ${cls}" data-portrait="${id}" src="${portraitURL(id)}" alt="${PEOPLE[id].name}" />`;

/** The Car.dat logo (public/assets/logo.jpg, or embedded in the single-page build). */
export const logoURL = () => (window.__ASSETS && window.__ASSETS.logo) || './assets/logo.jpg';
