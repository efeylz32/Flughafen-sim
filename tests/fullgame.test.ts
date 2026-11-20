/**
 * Durchlauf über das ganze Spiel mit allen drei Karten. Prüft jeden Tag den Zustand,
 * speichert und lädt regelmäßig. Kurzfassung läuft immer, der volle Lauf mit PLAYFULL=karte,schwierigkeit.
 */
import { describe, expect, it } from 'vitest';
import { DiffId, GRID_H, GRID_W, LEVELS, MapId, setGridSize } from '../src/sim/data';
import { completion } from '../src/sim/progression';
import { Sim } from '../src/sim/sim';
import { GrowBot, helpMilestones } from './growbot';
import { StuckWatch, checkState } from './invariants';

const FULL = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.PLAYFULL;

interface Run {
  bot: GrowBot;
  report: string[];
  levels: string[];
  money: string[];
}

function playthrough(map: MapId, diff: DiffId, days: number, opts: { rich?: boolean; level?: number; saveEvery?: number } = {}): Run {
  setGridSize(0);
  const s0 = new Sim(11, diff, map);
  s0.limitLand();
  if (opts.rich) s0.money = 80_000_000;
  if (opts.level) {
    s0.level = opts.level;
    s0.handled = LEVELS[opts.level - 1].need;
  }
  const bot = new GrowBot(s0);
  bot.s.mission = 99;
  const run: Run = { bot, report: [], levels: [], money: [] };
  let last = bot.s.level;
  const saveEvery = opts.saveEvery ?? 30;
  const watch = new StuckWatch();
  for (let h = 0; h < days * 24; h++) {
    const s = bot.s;
    for (let i = 0; i < 150; i++) s.tick();
    s.drainEvents();
    bot.hour();
    helpMilestones(bot.s);
    const n = bot.maybeExpand();
    if (n) {
      checkState(n, `nach Gesetz an Tag ${n.day}`);
      run.report.push(`${bot.laws.at(-1)} → ${GRID_W}×${GRID_H}, Geld ${Math.round(n.money / 1e6)} Mio.`);
    }
    if (bot.s.level !== last) {
      last = bot.s.level;
      run.levels.push(`${last}:T${bot.s.day}`);
    }
    if (h % 24 === 0) {
      checkState(bot.s, `${map}/${diff} Tag ${bot.s.day}`);
      watch.check(bot.s, `${map}/${diff} Tag ${bot.s.day}`);
    }
    // Speichern und laden, mit dem geladenen Stand weiterspielen
    if (h % (24 * saveEvery) === 0 && h > 0) {
      const d = JSON.parse(JSON.stringify(bot.s.serialize()));
      const c = Sim.deserialize(d);
      checkState(c, `nach Laden an Tag ${c.day}`);
      if (c.size !== bot.s.size || c.level !== bot.s.level || Math.round(c.money) !== Math.round(bot.s.money)) throw new Error(`Laden verändert den Stand an Tag ${c.day}`);
      bot.s = c;
    }
    if (h % (24 * 25) === 0) run.money.push(`T${bot.s.day} ${Math.round((bot.s.money - bot.s.loan) / 1e6)}M/${bot.s.history.at(-1)?.handled ?? 0}`);
    if (h % (24 * 100) === 0 && bot.s.history.length) {
      const b = bot.s.history.at(-1)!;
      const k = (v: number | undefined) => Math.round((v ?? 0) / 1000);
      run.report.push(`T${bot.s.day} Bilanz in k€: Gebühren ${k(b.fees)} Export ${k(b.exportFees)} Bahn ${k(b.rail)} Liege ${k(b.berth)} Bonus ${k(b.bonus)} | Löhne ${k(b.wages)} Betrieb ${k(b.running)} Bau ${k(b.building)} Strafen ${k(b.penalty)} Strom ${k(b.power)} Versich ${k(b.insurance)} Zins ${k(b.interest)} Wartung ${k(b.repair)}`);
    }
    if (bot.s.status === 'lost') {
      run.report.push(`Pleite an Tag ${bot.s.day}`);
      break;
    }
    if (bot.s.completedDay) {
      run.report.push(`VOLLENDET an Tag ${bot.s.completedDay}`);
      break;
    }
  }
  return run;
}

describe('Durchlauf über alle Karten', () => {
  for (const map of ['coast', 'island', 'river', 'rocks'] as MapId[]) {
    it(`Beide Gesetze, Aufbau auf jeder Karte, Speichern und Laden (${map})`, () => {
      const r = playthrough(map, 'normal', 16, { rich: true, level: 10, saveEvery: 5 });
      try {
        expect(r.bot.laws.length).toBe(2);
        expect(r.bot.s.size).toBe(2);
        expect(r.bot.s.kind.length).toBe(60 * 44);
        // Auf der größten Karte läuft wieder ein Hafen
        expect(r.bot.s.cranes.length).toBeGreaterThan(0);
        expect(r.bot.s.history.at(-1)!.handled).toBeGreaterThan(0);
      } finally {
        setGridSize(0);
      }
    }, 240_000);
  }
});

it.skipIf(!FULL)('Ganzes Spiel', () => {
  const [map, diff, days] = (FULL ?? 'coast,normal,900').split(',');
  const r = playthrough(map as MapId, diff as DiffId, Number(days ?? 900));
  const s = r.bot.s;
  const c = completion(s);
  console.log(
    `\n## Ganzes Spiel ${map}/${diff}: Tag ${s.day}, ${s.status}`,
    `\nStufen: ${r.levels.join(' ')}`,
    `\n${r.bot.laws.join(' | ') || 'kein Gesetz'}`,
    `\n${r.report.join(' | ')}`,
    `\nNetto/Container: ${r.money.join(', ')}`,
    `\nAusbau: ${s.cranes.length} Kräne (${s.cranes.filter((x) => x.model === 'super').length} Super), ${s.trucks.length} Trucks, ${s.gates.length} Gates, ${s.plants.length} Hallen, Land ${s.owned.filter(Boolean).length}/${s.owned.length}, Projekte ${s.projects.length}`,
    `\nVollendung ${Math.round(c.share * 100)} %: ${c.items.map((i) => `${i.value}/${i.goal}`).join(' ')}`,
  );
  setGridSize(0);
}, 3_600_000);
