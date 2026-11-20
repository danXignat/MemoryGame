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
<style>html,body{margin:0;height:100%;background:#0d1418;overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}</style>
</head>
<body>
${body}
</body>
</html>
`;
mkdirSync(join(root, 'app-www'), { recursive: true });
writeFileSync(join(root, 'app-www/index.html'), html);
if (existsSync(join(root, 'public/assets/logo.jpg'))) copyFileSync(join(root, 'public/assets/logo.jpg'), join(root, 'app-www/logo.jpg'));
console.log(`app-www/index.html written (${Math.round(html.length / 1024)} KB)`);
