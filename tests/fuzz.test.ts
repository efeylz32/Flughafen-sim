/** Zufällige Bau- und Abrissfolgen: Das Spiel darf nie abstürzen und keine unmöglichen Zustände erreichen. */
import { expect, it } from 'vitest';
import { BuildTool, COAST_ROW, CRANE_BUFFER, CRANE_EXP_BUFFER, GRID_H, GRID_W, T, YARD_CAP_PER_TILE } from '../src/sim/data';
import { buildDemo } from '../src/sim/demo';
import { Sim } from '../src/sim/sim';

const TOOLS: BuildTool[] = ['road', 'road', 'road', 'yard', 'reefer', 'gate', 'truck', 'truck', 'crane', 'kai', 'unpack', 'pack', 'cold', 'workshop', 'rail', 'dredge'];

function check(s: Sim, step: number) {
  const where = `Schritt ${step}`;
  for (let i = 0; i < s.kind.length; i++) {
    if (s.kind[i] === T.Yard || s.kind[i] === T.Reefer) {
      expect(s.stock[i], where).toBeGreaterThanOrEqual(0);
      expect(s.stock[i] + s.stockExp[i], where).toBeLessThanOrEqual(YARD_CAP_PER_TILE);
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
    expect(c.buffer + c.bufReef).toBeLessThanOrEqual(CRANE_BUFFER);
    expect(c.expBuf).toBeLessThanOrEqual(CRANE_EXP_BUFFER);
    expect(c.resOut + c.resOutReef + c.resExpIn).toBeGreaterThanOrEqual(0);
  }
  for (const g of s.gates) for (const f of s.footprintOf(g)) expect(s.kind[f]).toBe(T.Gate);
  for (const p of s.plants) for (const f of s.footprintOf(p)) expect(s.kind[f]).toBe(T.Plant);
  expect(Number.isFinite(s.money)).toBe(true);

  // Reservierungen müssen genau zu den laufenden Fahrten passen, sonst blockieren Plätze für immer
  const priv = s as unknown as { resIn: Int16Array; resOut: Int16Array; resOutExp: Int16Array };
  const wantIn = new Map<number, number>();
  const wantOut = new Map<number, number>();
  for (const t of s.trucks) {
    const j = t.job;
    if (!j) continue;
    if (j.dstKind === 'store') wantIn.set(j.dst, (wantIn.get(j.dst) ?? 0) + j.n);
    if (j.stage === 0 && j.srcKind === 'store') wantOut.set(j.src * 2 + (j.cargo === 'exp' ? 1 : 0), (wantOut.get(j.src * 2 + (j.cargo === 'exp' ? 1 : 0)) ?? 0) + j.n);
  }
  for (const i of [...s.yardTileList, ...s.reeferTileList]) {
    expect(priv.resIn[i], `${where}: Platzreservierung auf Feld ${i}`).toBe(wantIn.get(i) ?? 0);
    expect(priv.resOut[i], `${where}: Abholreservierung auf Feld ${i}`).toBe(wantOut.get(i * 2) ?? 0);
    expect(priv.resOutExp[i], `${where}: Export-Reservierung auf Feld ${i}`).toBe(wantOut.get(i * 2 + 1) ?? 0);
  }
  for (const g of s.gates) {
    const n = s.trucks.reduce((a, t) => a + (t.job && t.job.dstKind === 'gate' && t.job.dst === g.id ? t.job.n : 0), 0);
    expect(g.resIn, `${where}: Gate-Reservierung`).toBe(n);
  }
}

it.each([1, 2, 3, 4, 5])('Zufallsfolge %i bleibt stabil', (seed) => {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const s = new Sim(seed);
  buildDemo(s);
  s.level = 4;
  s.money = 50_000_000;
  for (let step = 0; step < 1500; step++) {
    const x = Math.floor(rnd() * GRID_W);
    const y = COAST_ROW - 2 + Math.floor(rnd() * (GRID_H - COAST_ROW + 2));
    const roll = rnd();
    if (roll < 0.55) s.build(TOOLS[Math.floor(rnd() * TOOLS.length)], x, y);
    else if (roll < 0.75) {
      const res = s.demolish(x, y);
      if (res.ok && rnd() < 0.3) s.undoDemolish(res.removed);
    } else if (roll < 0.8 && s.trucks.length) {
      const t = s.trucks[Math.floor(rnd() * s.trucks.length)];
      s.setRole(t.id, (['auto', 'crane', 'out', 'export', 'plant'] as const)[Math.floor(rnd() * 5)]);
    } else if (roll < 0.83) s.toggleOneway(x, y);
    else if (roll < 0.85 && s.trucks.length) s.trucks[Math.floor(rnd() * s.trucks.length)].wear = 1;
    for (let i = 0; i < 6; i++) s.tick();
    if (s.pending) s.resolveDecision(Math.floor(rnd() * 2));
    if (step % 25 === 0) check(s, step);
  }
  check(s, -1);
});
