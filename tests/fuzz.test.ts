/** Zufällige Bau- und Abrissfolgen: Das Spiel darf nie abstürzen und keine unmöglichen Zustände erreichen. */
import { expect, it } from 'vitest';
import { BuildTool, COAST_ROW, GRID_H, GRID_W, RTG_CAP, T } from '../src/sim/data';
import { buildDemo } from '../src/sim/demo';
import { Sim } from '../src/sim/sim';

const TOOLS: BuildTool[] = ['road', 'road', 'road', 'yard', 'reefer', 'gate', 'truck', 'truck', 'crane', 'kai', 'unpack', 'pack', 'cold', 'workshop', 'rail', 'dredge', 'rtg', 'hazard', 'emptyyard', 'fill', 'emptyyard', 'hazard', 'road2', 'hwy', 'hwy', 'track', 'track', 'solar', 'battery'];

function check(s: Sim, step: number) {
  const where = `Schritt ${step}`;
  for (let i = 0; i < s.kind.length; i++) {
    if (s.kind[i] === T.Yard || s.kind[i] === T.Reefer || s.kind[i] === T.Hazmat || s.kind[i] === T.Empty) {
      expect(s.stock[i], where).toBeGreaterThanOrEqual(0);
      expect(s.stock[i] + s.stockExp[i], where).toBeLessThanOrEqual(Math.max(RTG_CAP, s.capAt(i)));
    } else {
      expect(s.stock[i] + s.stockExp[i], `${where}: Ware auf Feld ohne Lager`).toBe(0);
    }
  }
  for (const t of s.trucks) {
    expect(s.kind[t.tile], `${where}: Truck neben der Straße`).toBe(T.Road);
    expect(t.load).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(t.fx) && Number.isFinite(t.fy)).toBe(true);
  }
  for (const c of s.cranes) {
    expect(s.kind[s.idx(c.x, c.y)], `${where}: Kran ohne Kai`).toBe(T.Kai);
    expect(c.buffer + c.bufReef + c.bufHaz).toBeLessThanOrEqual(s.bufCap(c));
    expect(c.expBuf).toBeLessThanOrEqual(s.bufCap(c, true));
    expect(c.resOut + c.resOutReef + c.resExpIn).toBeGreaterThanOrEqual(0);
  }
  for (const g of s.gates) for (const f of s.footprintOf(g)) expect(s.kind[f]).toBe(T.Gate);
  for (const p of s.plants) for (const f of s.footprintOf(p)) expect(s.kind[f]).toBe(T.Plant);
  expect(Number.isFinite(s.money)).toBe(true);

  // Reservierungen müssen genau zu den laufenden Fahrten passen, sonst blockieren Plätze für immer
  const priv = s as unknown as { resIn: Int16Array; resOut: Int16Array; resOutExp: Int16Array; resOutRail: Int16Array };
  const wantIn = new Map<number, number>();
  const wantOut = new Map<number, number>();
  for (const t of s.trucks) {
    const j = t.job;
    if (!j) continue;
    if (j.dstKind === 'store') wantIn.set(j.dst, (wantIn.get(j.dst) ?? 0) + j.n);
    if (j.stage === 0 && j.srcKind === 'store') {
      const key = j.src * 3 + (j.cargo === 'exp' ? 1 : j.cargo === 'rimp' ? 2 : 0);
      wantOut.set(key, (wantOut.get(key) ?? 0) + j.n);
    }
  }
  for (const i of [...s.yardTileList, ...s.reeferTileList, ...s.hazTileList, ...s.emptyTileList]) {
    expect(priv.resIn[i], `${where}: Platzreservierung auf Feld ${i}`).toBe(wantIn.get(i) ?? 0);
    expect(priv.resOut[i], `${where}: Abholreservierung auf Feld ${i}`).toBe(wantOut.get(i * 3) ?? 0);
    expect(priv.resOutExp[i], `${where}: Export-Reservierung auf Feld ${i}`).toBe(wantOut.get(i * 3 + 1) ?? 0);
    expect(priv.resOutRail[i], `${where}: Bahn-Reservierung auf Feld ${i}`).toBe(wantOut.get(i * 3 + 2) ?? 0);
    expect(s.stockRail[i]).toBeLessThanOrEqual(s.stock[i]);
  }
  // Anlagen: Reservierungen für Leergut, Ware und Gefahrgut müssen zu den Fahrten passen
  const sum = (f: (j: NonNullable<(typeof s.trucks)[number]['job']>) => boolean) => s.trucks.reduce((a, t) => a + (t.job && f(t.job) ? t.job.n : 0), 0);
  for (const p of s.plants) {
    expect(p.resIn, `${where}: Halle Eingang`).toBe(sum((j) => j.dstKind === 'plant' && j.dst === p.id && j.cargo !== 'empty'));
    expect(p.resInE, `${where}: Halle Leergut`).toBe(sum((j) => j.dstKind === 'plant' && j.dst === p.id && j.cargo === 'empty'));
    expect(p.resOut, `${where}: Halle Ausgang`).toBe(sum((j) => j.stage === 0 && j.srcKind === 'plant' && j.src === p.id && j.cargo !== 'empty'));
    expect(p.resOutE, `${where}: Halle Leerausgang`).toBe(sum((j) => j.stage === 0 && j.srcKind === 'plant' && j.src === p.id && j.cargo === 'empty'));
    expect(p.inEmpty + p.resInE).toBeLessThanOrEqual(6);
  }
  for (const r of s.rails) expect(r.resOutE, `${where}: Zug-Leergut`).toBe(sum((j) => j.stage === 0 && j.srcKind === 'rail' && j.src === r.id && j.cargo === 'empty'));
  for (const g of s.gates) expect(g.resOutE, `${where}: Gate-Leergut`).toBe(sum((j) => j.stage === 0 && j.srcKind === 'gate' && j.src === g.id && j.cargo === 'empty'));
  for (const r of s.rails) expect(r.resOutG, `${where}: Zugware`).toBe(sum((j) => j.stage === 0 && j.srcKind === 'rail' && j.src === r.id && j.cargo !== 'empty'));
  for (const c of s.cranes) {
    expect(c.resOutHaz, `${where}: Kran Gefahrgut`).toBe(sum((j) => j.stage === 0 && j.srcKind === 'crane' && j.src === c.id && j.cargo === 'haz'));
    expect(c.resOutRail, `${where}: Kran Bahn`).toBe(sum((j) => j.stage === 0 && j.srcKind === 'crane' && j.src === c.id && j.cargo === 'rimp'));
    expect(c.bufRail).toBeLessThanOrEqual(c.buffer);
    expect(c.resOutReef, `${where}: Kran Kühl`).toBe(sum((j) => j.stage === 0 && j.srcKind === 'crane' && j.src === c.id && j.cargo === 'reef'));
  }
  for (const g of s.gates) {
    const n = s.trucks.reduce((a, t) => a + (t.job && t.job.dstKind === 'gate' && t.job.dst === g.id ? t.job.n : 0), 0);
    expect(g.resIn, `${where}: Gate-Reservierung`).toBe(n);
  }
}

it.each([1, 2, 3, 4, 5, 6, 7])('Zufallsfolge %i bleibt stabil', (seed) => {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  // Folgen 6 und 7 spielen auf der Insel mit Kai an allen Küsten
  const island = seed >= 6;
  const s = new Sim(seed, 'normal', island ? 'island' : 'coast');
  if (!island) buildDemo(s);
  s.level = 4;
  s.money = 50_000_000;
  for (let step = 0; step < 1500; step++) {
    const x = Math.floor(rnd() * GRID_W);
    const y = island ? Math.floor(rnd() * GRID_H) : COAST_ROW - 2 + Math.floor(rnd() * (GRID_H - COAST_ROW + 2));
    const roll = rnd();
    if (rnd() < 0.1) s.rot = !s.rot;
    if (island && step === 0) s.mission = 30;
    if (roll < 0.55) s.build(TOOLS[Math.floor(rnd() * TOOLS.length)], x, y);
    else if (roll < 0.75) {
      const res = s.demolish(x, y);
      if (res.ok && rnd() < 0.3) s.undoDemolish(res.removed);
    } else if (roll < 0.8 && s.trucks.length) {
      const t = s.trucks[Math.floor(rnd() * s.trucks.length)];
      s.setRole(t.id, (['auto', 'crane', 'out', 'export', 'plant'] as const)[Math.floor(rnd() * 5)]);
    } else if (roll < 0.82) s.toggleOneway(x, y);
    else if (roll < 0.83) s.setYardUse(x, y, Math.floor(rnd() * 4));
    else if (roll < 0.85 && s.trucks.length) s.trucks[Math.floor(rnd() * s.trucks.length)].wear = 1;
    for (let i = 0; i < 6; i++) s.tick();
    if (s.pending) s.resolveDecision(Math.floor(rnd() * 2));
    if (step % 25 === 0) check(s, step);
  }
  check(s, -1);
});
