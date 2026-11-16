// Baut aus dist/ eine einzelne, selbstständige HTML-Datei (dist/hafen-imperium.html).
// Nützlich zum Verteilen als eine Datei, z. B. per Chat oder als Artifact.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const assets = join(dist, 'assets');
const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith('.js'));
const css = files.filter((f) => f.endsWith('.css'));
if (js.length !== 1) throw new Error(`Erwartet genau ein JS-Bundle, gefunden: ${js.join(', ')}`);

const style = css.map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const script = readFileSync(join(assets, js[0]), 'utf8').replace(/<\/script/gi, '<\\/script');

const html = `<script>window.__SINGLE_FILE__ = true</script>
<title>Hafen-Imperium</title>
<meta name="description" content="Baue einen Containerhafen und beseitige die Engpässe.">
<style>${style}</style>
<div id="app"><div id="game"></div><div id="hud"></div></div>
<script type="module">${script}</script>
`;
writeFileSync(join(dist, 'hafen-imperium.html'), html);
console.log(`dist/hafen-imperium.html: ${(html.length / 1024).toFixed(0)} KB`);
