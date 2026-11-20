// Builds ONE self-contained page (dist/artifact.html) from index.html + src/*.
// Used to publish the game as a link that opens on a phone without any install.
//   npm run artifact
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const bundle = await build({
  entryPoints: [root + 'src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false,
});
let js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(root + 'src/style.css', 'utf8');
const html = readFileSync(root + 'index.html', 'utf8');

const title = html.match(/<title>([^<]*)<\/title>/)[1];
const fonts = [...html.matchAll(/<link[^>]+(?:fonts\.googleapis|fonts\.gstatic)[^>]*>/g)].map((m) => m[0]).join('\n');
const body = html.match(/<body>([\s\S]*?)<script type="module"/)[1].trim();

// photos from public/assets become data URIs so the single page has them too
const assets = {};
const dir = root + 'public/assets/';
if (existsSync(dir)) {
  for (const f of readdirSync(dir)) {
    const m = f.match(/^(naty|alisia|dan|dangf|logo)\.(jpe?g|png|webp)$/i);
    if (!m) continue;
    const mime = m[2].toLowerCase() === 'png' ? 'image/png' : m[2].toLowerCase() === 'webp' ? 'image/webp' : 'image/jpeg';
    assets[m[1].toLowerCase()] = `data:${mime};base64,${readFileSync(dir + f).toString('base64')}`;
  }
}
console.log('embedded photos:', Object.keys(assets).join(', ') || 'none (placeholders will be used)');
const assetScript = Object.keys(assets).length ? `<script>window.__ASSETS=${JSON.stringify(assets)};</script>\n` : '';

const out = `<title>${title}</title>
${fonts}
<style>
${css}
</style>
${body}
${assetScript}<script>
${js}
</script>
`;
mkdirSync(root + 'dist', { recursive: true });
writeFileSync(root + 'dist/artifact.html', out);
console.log(`dist/artifact.html written (${(out.length / 1024).toFixed(0)} KB)`);
