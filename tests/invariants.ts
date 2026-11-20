import { GRID_H, GRID_W, MAX_LEVEL, RTG_CAP, T } from '../src/sim/data';
import type { Sim } from '../src/sim/sim';

/** Prüft, dass der Spielzustand in sich stimmig ist. Wirft mit einer Liste der Fehler. */
export function checkState(s: Sim, step: string) {
  const bad: string[] = [];
  if (!Number.isFinite(s.money)) bad.push('Geld ' + s.money);
  if (s.kind.length !== GRID_W * GRID_H) bad.push(`Kartengröße passt nicht: ${s.kind.length} statt ${GRID_W}×${GRID_H}`);
  if (s.level < 1 || s.level > MAX_LEVEL) bad.push('Stufe ' + s.level);
  if (!(s.rep >= 0 && s.rep <= 100)) bad.push('Ruf ' + s.rep);
  if (new Set(s.projects).size !== s.projects.length) bad.push('Projekt doppelt');
  const store = new Set<number>([T.Yard, T.Reefer, T.Hazmat, T.Empty]);
  for (let i = 0; i < s.kind.length; i++) {
    if (s.stockRail[i] > s.stock[i]) bad.push(`stockRail>stock @${i}`);
    if (!store.has(s.kind[i]) && s.stock[i] + s.stockExp[i] > 0) bad.push(`Ware auf Feld ohne Lager @${i}`);
    if (store.has(s.kind[i]) && s.stock[i] + s.stockExp[i] > Math.max(RTG_CAP, s.capAt(i)) + 4) bad.push(`Lager übervoll @${i}`);
  }
  for (const c of s.cranes) {
    for (const k of ['buffer', 'bufReef', 'bufHaz', 'bufRail', 'expBuf'] as const) if (c[k] < 0 || !Number.isFinite(c[k])) bad.push(`crane ${k}=${c[k]}`);
    if (c.bufRail > c.buffer) bad.push(`crane bufRail ${c.bufRail}>${c.buffer}`);
    if (s.kind[s.idx(c.x, c.y)] !== T.Kai) bad.push('Kran ohne Kai');
    if (!Number.isFinite(c.wear) || c.wear < 0 || c.wear > 1.0001) bad.push('Kran-Verschleiß ' + c.wear);
  }
  for (const p of s.plants) for (const k of ['inBuf', 'outBuf', 'inEmpty', 'emptyOut'] as const) if (p[k] < 0) bad.push(`plant ${k}=${p[k]}`);
  for (const t of s.trucks) {
    if (t.tile < 0 || t.tile >= GRID_W * GRID_H || !Number.isFinite(t.fx)) bad.push(`truck pos ${t.tile}`);
    else if (s.kind[t.tile] !== T.Road && s.kind[t.tile] !== T.Parking) bad.push(`Truck neben der Straße (${s.kind[t.tile]})`);
    if (t.load < 0) bad.push('truck load');
  }
  for (const g of s.gates) if (g.inApron < 0 || g.emptyIn < 0) bad.push('gate neg');
  for (const r of s.rails) if (r.platform < 0 || r.goods < 0 || r.emptyIn < 0) bad.push('rail neg');
  for (const sh of s.ships) if (!Number.isFinite(sh.x) || !Number.isFinite(sh.y) || sh.containers < 0 || sh.exportLeft < 0) bad.push(`Schiff kaputt ${sh.name}`);
  const arr = s as unknown as Record<string, Int16Array | Uint16Array | Int32Array>;
  for (const k of ['resOut', 'resIn', 'resOutRail', 'resInExp', 'resOutExp']) {
    const a = arr[k];
    if (a && a.some((v) => v < 0)) bad.push(`${k} negativ`);
    if (a && a.length !== GRID_W * GRID_H) bad.push(`${k} falsche Länge`);
  }
  if (bad.length) throw new Error(`${step}: ${[...new Set(bad)].slice(0, 8).join('; ')}`);
}
