/**
 * Chaos-Test: Ein Bot baut einen laufenden Hafen, dazwischen macht ein „Spieler“ zufällig fast alles,
 * was das Spiel erlaubt. Auf allen drei Kartengrößen. Jeden Spieltag wird der Zustand geprüft.
 */
import { describe, expect, it } from 'vitest';
import { BuildTool, COAST_ROW, GRID_H, GRID_W, LEVELS, MapId, PROJECT_IDS, setGridSize, TECH_IDS, type RuleAct, type RuleCond, type TruckRole } from '../src/sim/data';
import { Sim } from '../src/sim/sim';
import { GrowBot, helpMilestones } from './growbot';
import { StuckWatch, checkState } from './invariants';

const TOOLS: BuildTool[] = ['kai', 'crane', 'lcrane', 'road', 'road2', 'hwy', 'yard', 'reefer', 'hazard', 'emptyyard', 'gate', 'truck', 'unpack', 'pack', 'cold', 'fill', 'workshop', 'solar', 'battery', 'customs', 'track', 'parking', 'rtg', 'rail', 'dredge'];
const ROLES: TruckRole[] = ['auto', 'crane', 'out', 'export', 'plant'];
const CONDS: RuleCond[] = ['yardHigh', 'yardLow', 'shipsWait', 'night', 'day', 'reeferHigh', 'powerOut'];
const ACTS: RuleAct[] = ['role:auto', 'role:crane', 'role:out', 'role:export', 'role:plant', 'shift:on', 'shift:off'];

function chaos(seed: number, map: MapId, size: number, steps: number) {
  setGridSize(0);
  let s = new Sim(seed, 'normal', map);
  s.limitLand();
  s.money = 30_000_000;
  s.level = 6;
  s.handled = LEVELS[5].need;
  const bot = new GrowBot(s);
  bot.s.mission = 99;
  // Auf die gewünschte Kartengröße
  for (let i = 0; i < size; i++) {
    bot.s.level = Math.max(bot.s.level, i === 0 ? 7 : 10);
    bot.s.money = 80_000_000;
    bot.s = bot.s.expand();
    bot.setup();
  }
  s = bot.s;
  let r = seed * 7919 + size * 104729;
  const rnd = () => ((r = (r * 48271) % 2147483647) / 2147483647);
  const pick = <V>(a: readonly V[]): V => a[Math.floor(rnd() * a.length)];
  const rx = () => Math.floor(rnd() * GRID_W);
  const ry = () => COAST_ROW - 1 + Math.floor(rnd() * (GRID_H - COAST_ROW + 1));
  const undo: { tool: BuildTool; x: number; y: number; truckId?: number }[] = [];
  const log: string[] = [];
  const watch = new StuckWatch();
  for (let step = 0; step < steps; step++) {
    s = bot.s;
    const a = rnd();
    let what = '';
    try {
      if (a < 0.25) {
        const tool = pick(TOOLS);
        const x = rx();
        const y = ry();
        what = `bauen ${tool} ${x},${y}`;
        const res = s.build(tool, x, y);
        if (res.ok) undo.push({ tool, x, y, truckId: res.truckId });
      } else if (a < 0.33) {
        const x = rx();
        const y = ry();
        what = `abreißen ${x},${y}`;
        s.demolish(x, y);
      } else if (a < 0.37 && undo.length) {
        const u = undo.pop()!;
        what = `rückgängig ${u.tool} ${u.x},${u.y}`;
        s.undoBuild(u);
      } else if (a < 0.4) {
        what = 'zone';
        s.setZone(rx(), ry(), Math.floor(rnd() * 5));
      } else if (a < 0.43) {
        what = 'einbahn';
        s.toggleOneway(rx(), ry());
      } else if (a < 0.45) {
        what = 'überführung';
        s.toggleOverpass(rx(), ry());
      } else if (a < 0.47) {
        what = 'lagerzweck';
        s.setYardUse(rx(), ry(), Math.floor(rnd() * 4));
      } else if (a < 0.5 && s.trucks.length) {
        what = 'rolle';
        s.setRole(pick(s.trucks).id, pick(ROLES));
      } else if (a < 0.53) {
        const k = rnd() < 0.5 ? 'crane' : 'truck';
        const list = k === 'crane' ? s.cranes : s.trucks;
        if (list.length) {
          const id = pick<{ id: number }>(list).id;
          const b = rnd();
          what = `${k} ${b < 0.3 ? 'aufrüsten' : b < 0.6 ? 'überholen' : b < 0.8 ? 'tauschen' : 'wartung'} ${id}`;
          if (b < 0.3) s.upgrade(k, id);
          else if (b < 0.6) s.overhaul(k, id);
          else if (b < 0.8 && k === 'truck') s.replaceTruck(id);
          else if (k === 'crane') s.planMaint(id);
        }
      } else if (a < 0.55) {
        what = 'projekt/tech';
        if (rnd() < 0.5) s.startProject(pick(PROJECT_IDS));
        else s.buyTech(pick(TECH_IDS));
      } else if (a < 0.58) {
        what = 'vertrag/auftrag';
        if (s.offers.length && rnd() < 0.5) s.acceptContract(pick(s.offers).id);
        else if (s.contracts.length && rnd() < 0.3) s.cancelContract(pick(s.contracts).id);
        else if (s.orderOffers.length) s.acceptOrder(pick(s.orderOffers).id);
      } else if (a < 0.6) {
        what = 'land';
        s.buyPlot(rx());
      } else if (a < 0.62) {
        what = 'personal';
        const role = pick(['driver', 'crane', 'gate', 'mech'] as const);
        if (rnd() < 0.5) s.hire(role);
        else s.fire(role);
      } else if (a < 0.64) {
        what = 'geld/regeln';
        const b = rnd();
        if (b < 0.25) s.takeLoan();
        else if (b < 0.5) s.repayLoan();
        else if (b < 0.7) s.addRule(pick(CONDS), pick(ACTS));
        else if (b < 0.85) s.setInsurance(Math.floor(rnd() * 3));
        else s.setNightShift(rnd() < 0.5);
      } else if (a < 0.66 && s.plants.length) {
        what = 'halle';
        const p = pick(s.plants);
        if (rnd() < 0.5) s.upgradePlant(p.id);
        else s.setProduct(p.id, pick(['elec', 'cloth', 'food'] as const));
      } else if (a < 0.68 && s.ships.some((x) => x.state === 'queued')) {
        what = 'vorziehen';
        s.prioritize(pick(s.ships.filter((x) => x.state === 'queued')).id);
      } else if (a < 0.69) {
        what = 'speichern/laden';
        bot.s = Sim.deserialize(JSON.parse(JSON.stringify(s.serialize())));
      } else {
        what = 'laufen';
        for (let i = 0; i < 150; i++) bot.s.tick();
        bot.s.drainEvents();
        bot.hour();
        helpMilestones(bot.s);
      }
      if (bot.s.pending) bot.s.resolveDecision(Math.floor(rnd() * 2));
      for (let i = 0; i < 10; i++) bot.s.tick();
      bot.s.drainEvents();
      checkState(bot.s, `Karte ${size + 1}, Schritt ${step} (${what})`);
      watch.check(bot.s, `Karte ${size + 1}, Schritt ${step}`);
      log.push(what);
    } catch (e) {
      throw new Error(`${(e as Error).message}\nletzte Schritte: ${log.slice(-6).join(' | ')} | ${what}`);
    }
  }
  return bot.s;
}

describe('Chaos-Test auf allen Kartengrößen', () => {
  for (const [seed, map, size] of [
    [1, 'coast', 0],
    [2, 'island', 1],
    [3, 'river', 2],
    [4, 'rocks', 2],
  ] as [number, MapId, number][]) {
    it(`${map}, Karte ${size + 1}`, () => {
      try {
        const s = chaos(seed, map, size, 1500);
        expect(s.size).toBe(size);
      } finally {
        setGridSize(0);
      }
    }, 300_000);
  }
});
