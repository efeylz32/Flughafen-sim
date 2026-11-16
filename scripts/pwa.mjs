// Nach dem Bauen: Dateiliste und Version in den Service Worker schreiben.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const skip = new Set(['sw.js', 'hafen-imperium.html', '_headers', '_redirects']);
const files = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (!skip.has(f)) files.push(relative(dist, p).split('\\').join('/'));
  }
};
walk(dist);
const hash = createHash('sha256');
const swPath = join(dist, 'sw.js');
hash.update(readFileSync(swPath));
for (const f of files.sort()) hash.update(f).update(readFileSync(join(dist, f)));
const version = hash.digest('hex').slice(0, 12);
const list = ['./', ...files.map((f) => `./${f}`)];
const sw = readFileSync(swPath, 'utf8').replace("'__VERSION__'", JSON.stringify(version)).replace('__FILES__', JSON.stringify(list));
writeFileSync(swPath, sw);
console.log(`Service Worker: ${list.length} Dateien, Version ${version}`);
