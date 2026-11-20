// ============================================================================
//  build-app.mjs  —  makes the web page that goes inside the phone apps
//
//  1. builds the single-file game (dist/artifact.html, everything inlined)
//  2. wraps it in a full HTML page for the app WebView -> app-www/index.html
//  Then `npx cap sync` copies it into the Android and iOS projects.
// ============================================================================

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, [join(root, 'scripts/build-artifact.mjs')], { stdio: 'inherit' });

const body = readFileSync(join(root, 'dist/artifact.html'), 'utf8');
const html = `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#0d1418" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Car.dat" />
<link rel="manifest" href="manifest.webmanifest" />
<link rel="apple-touch-icon" href="apple-touch-icon.png" />
<link rel="icon" type="image/png" href="icon-192.png" />
<style>html,body{margin:0;height:100%;background:#0d1418;overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}</style>
</head>
<body>
${body}
<script>
  // installable app on the phone (Safari: Share > Add to Home Screen; Chrome: Install app)
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor) navigator.serviceWorker.register('sw.js').catch(() => {});
</script>
</body>
</html>
`;
mkdirSync(join(root, 'app-www'), { recursive: true });
writeFileSync(join(root, 'app-www/index.html'), html);
if (existsSync(join(root, 'public/assets/logo.jpg'))) copyFileSync(join(root, 'public/assets/logo.jpg'), join(root, 'app-www/logo.jpg'));
for (const f of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) copyFileSync(join(root, 'public', f), join(root, 'app-www', f));
// web app manifest: name, icon, full screen
writeFileSync(
  join(root, 'app-www/manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'Car.dat · Școala de șoferi',
      short_name: 'Car.dat',
      start_url: './',
      scope: './',
      display: 'fullscreen',
      orientation: 'any',
      background_color: '#0d1418',
      theme_color: '#0d1418',
      lang: 'ro',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    null,
    2
  )
);
// offline: keep the game and the fonts in the phone's cache
const version = Date.now().toString(36);
writeFileSync(
  join(root, 'app-www/sw.js'),
  `const CACHE = 'cardat-${version}';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
`
);
console.log(`app-www/index.html written (${Math.round(html.length / 1024)} KB)`);
