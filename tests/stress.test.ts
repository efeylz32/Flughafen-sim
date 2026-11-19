import { describe, expect, it } from 'vitest';
import { BuildTool, COAST_ROW, GRID_H, GRID_W } from '../src/sim/data';
import { Sim } from '../src/sim/sim';
import { Bot } from './bot';

const TOOLS: BuildTool[] = ['kai', 'crane', 'lcrane', 'road', 'yard', 'reefer', 'gate', 'rail', 'truck', 'unpack', 'pack', 'cold', 'workshop', 'road2', 'hwy', 'solar', 'battery', 'customs', 'track', 'parking', 'rtg', 'hazard', 'emptyyard', 'fill'];

function check(s: Sim, step: string) {
  const bad: string[] = [];
  if (!Number.isFinite(s.money)) bad.push('Geld ' + s.money);
  for (let i = 0; i < s.kind.length; i++) {
    if (s.stockRail[i] > s.stock[i]) bad.push(`stockRail>stock @${i}`);
  }
  for (const c of s.cranes) for (const k of ['buffer', 'bufReef', 'bufHaz', 'bufRail', 'expBuf'] as const) if (c[k] < 0 || !Number.isFinite(c[k])) bad.push(`crane ${k}=${c[k]}`);
  for (const c of s.cranes) if (c.bufRail > c.buffer) bad.push(`crane bufRail ${c.bufRail}>${c.buffer}`);
  for (const p of s.plants) for (const k of ['inBuf', 'outBuf', 'inEmpty', 'emptyOut'] as const) if (p[k] < 0) bad.push(`plant ${k}=${p[k]}`);
  for (const t of s.trucks) {
    if (t.tile < 0 || t.tile >= GRID_W * GRID_H || !Number.isFinite(t.fx)) bad.push(`truck pos ${t.tile}`);
    if (t.load < 0) bad.push('truck load');
  }
  for (const g of s.gates) if (g.inApron < 0 || g.emptyIn < 0) bad.push('gate neg');
  for (const r of s.rails) if (r.platform < 0 || r.goods < 0 || r.emptyIn < 0) bad.push('rail neg');
  const arr = s as unknown as Record<string, Int16Array | Uint16Array | Int32Array>;
  for (const k of ['resOut', 'resIn', 'resOutRail', 'resInExp', 'resOutExp']) {
    const a = arr[k];
    if (a && a.some((v) => v < 0)) bad.push(`${k} negativ`);
  }
  if (bad.length) throw new Error(`${step}: ${[...new Set(bad)].slice(0, 6).join('; ')}`);
}

describe('Stresstest', () => {
  for (const seed of [1, 2, 3]) {
    it(`Bauen, Abreißen, Rückgängig und Laufen ohne kaputte Zustände (Seed ${seed})`, () => {
      const s = new Sim(seed, 'normal', 'coast');
      const bot = new Bot(s);
      bot.start();
      s.level = 4;
      s.money = 50_000_000;
      let r = seed * 99991;
      const rnd = () => ((r = (r * 48271) % 2147483647) / 2147483647);
      const history: { tool: BuildTool; x: number; y: number }[] = [];
      for (let step = 0; step < 1500; step++) {
        const x = Math.floor(rnd() * GRID_W);
        const y = COAST_ROW - 1 + Math.floor(rnd() * (GRID_H - COAST_ROW));
        const a = rnd();
        let what = '';
        if (a < 0.55) {
          const tool = TOOLS[Math.floor(rnd() * TOOLS.length)];
          what = `build ${tool} ${x},${y}`;
          const res = s.build(tool, x, y);
          if (res.ok) history.push({ tool, x, y });
        } else if (a < 0.75) {
          what = `demolish ${x},${y}`;
          s.demolish(x, y);
        } else if (a < 0.82 && history.length) {
          const h = history.pop()!;
          what = `undo ${h.tool} ${h.x},${h.y}`;
          s.undoBuild({ tool: h.tool, x: h.x, y: h.y });
        } else if (a < 0.85) {
          what = 'finish';
          s.finishAll();
        } else if (a < 0.87) {
          what = 'reload';
          const c = Sim.deserialize(JSON.parse(JSON.stringify(s.serialize())));
          Object.assign(s, c);
        } else {
          what = 'run';
        }
        const n = what === 'run' ? 400 : 20;
        for (let i = 0; i < n; i++) s.tick();
        s.drainEvents();
        check(s, `Schritt ${step} (${what})`);
      }
      console.log('fuzz', seed, 'builds', history.length, 'trucks', s.trucks.length, 'cranes', s.cranes.length, 'plants', s.plants.length, 'handled', s.handled, 'money', Math.round(s.money));
      expect(s.handled).toBeGreaterThanOrEqual(0);
    }, 300_000);
  }
});
