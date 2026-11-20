// Builds ONE self-contained page (dist/artifact.html) from index.html + src/*.
// Used to publish the game as a link that opens on a phone without any install.
//   npm run artifact
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

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

const out = `<title>${title}</title>
${fonts}
<style>
${css}
</style>
${body}
<script>
${js}
</script>
`;
mkdirSync(root + 'dist', { recursive: true });
writeFileSync(root + 'dist/artifact.html', out);
console.log(`dist/artifact.html written (${(out.length / 1024).toFixed(0)} KB)`);
