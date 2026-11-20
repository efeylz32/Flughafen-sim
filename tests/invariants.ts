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
  // Aufträge zeigen nur auf Dinge, die es noch gibt
  const has = (kind: string, id: number) =>
    kind === 'store' ? store.has(s.kind[id]) : kind === 'crane' ? s.cranes.some((c) => c.id === id) : kind === 'gate' ? s.gates.some((g) => g.id === id) : kind === 'plant' ? s.plants.some((p) => p.id === id) : kind === 'rail' ? s.rails.some((r) => r.id === id) : false;
  for (const t of s.trucks) {
    const j = t.job;
    if (!j) continue;
    if (!has(j.srcKind, j.src) && j.stage === 0) bad.push(`Auftrag von ${j.srcKind} ${j.src}, das es nicht gibt`);
    if (!has(j.dstKind, j.dst)) bad.push(`Auftrag zu ${j.dstKind} ${j.dst}, das es nicht gibt`);
    if (j.n <= 0) bad.push('Auftrag ohne Container');
  }
  // Gebäude stehen auf ihren Feldern, Schiffe überlappen nicht
  for (const g of s.gates) for (const f of s.footprintOf(g)) if (s.kind[f] !== T.Gate) bad.push('Gate ohne Feld');
  for (const p of s.plants) for (const f of s.footprintOf(p)) if (s.kind[f] !== T.Plant) bad.push('Halle ohne Feld');
  const moored = s.ships.filter((x) => x.state === 'unloading' && x.berthX >= 0);
  for (let i = 0; i < moored.length; i++)
    for (let j = i + 1; j < moored.length; j++) {
      const a1 = moored[i];
      const b1 = moored[j];
      if (a1.berthX < b1.berthX + b1.len && b1.berthX < a1.berthX + a1.len) bad.push(`Schiffe überlappen ${a1.name}/${b1.name}`);
    }
  for (const r of ['driver', 'crane', 'gate', 'mech'] as const) {
    if (s.staff[r] < 0) bad.push(`Personal ${r} negativ`);
    if (s.sick[r].length > s.staff[r]) bad.push(`mehr Kranke als Personal (${r})`);
  }
  if (s.contracts.length > Math.max(s.maxContracts, 7)) bad.push('zu viele Verträge');
  const arr = s as unknown as Record<string, Int16Array | Uint16Array | Int32Array>;
  for (const k of ['resOut', 'resIn', 'resOutRail', 'resInExp', 'resOutExp']) {
    const a = arr[k];
    if (a && a.some((v) => v < 0)) bad.push(`${k} negativ`);
    if (a && a.length !== GRID_W * GRID_H) bad.push(`${k} falsche Länge`);
  }
  if (bad.length) throw new Error(`${step}: ${[...new Set(bad)].slice(0, 8).join('; ')}`);
}

/** Merkt sich, seit wann ein Truck denselben Auftrag hat. Meldet Trucks, die tagelang festhängen. */
export class StuckWatch {
  private since = new WeakMap<object, number>();
  check(s: Sim, step: string, maxDays = 2) {
    for (const t of s.trucks) {
      if (!t.job || t.wear >= 1 || t.build || !t.staffed) continue;
      const first = this.since.get(t.job);
      if (first === undefined) this.since.set(t.job, s.gm);
      else if (s.gm - first > maxDays * 1440) throw new Error(`${step}: Truck ${t.id} hängt seit ${Math.round((s.gm - first) / 1440)} Tagen am selben Auftrag (${t.job.srcKind}→${t.job.dstKind}, Feld ${t.tile}, Stau ${t.stuck.toFixed(0)})`);
    }
  }
}
