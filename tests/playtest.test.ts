/**
 * Spieltest-Bot: spielt jede Schwierigkeit auf der Küstenkarte durch und berichtet,
 * wann Stufen erreicht werden, wie das Geld verläuft und welche Systeme ungenutzt bleiben.
 * Läuft nur mit `npm run playtest`, nicht bei den normalen Tests.
 */
import { it } from 'vitest';
import { COAST_ROW, DIFFS, DiffId, GRID_W, LEVELS, LV, T } from '../src/sim/data';
import { completion, milestoneDone } from '../src/sim/progression';
import { Sim } from '../src/sim/sim';
import { Bot } from './bot';

const ON = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.PLAYTEST === '1';

interface Report {
  diff: DiffId;
  status: string;
  endDay: number;
  levelDays: string;
  minMoney: number;
  endMoney: number;
  loanMax: number;
  ships: number;
  onTime: number;
  trucks: number;
  gates: number;
  cranes: number;
  contractsDone: number;
  lostToRival: number;
  broken: number;
  idleShare: number;
  spend: Record<string, number>;
  handled: number;
  perDay: number;
  extra: string;
  dayMoney: string;
  used: string;
}


function play(diff: DiffId): Report {
  const s = new Sim(42, diff, 'coast');
  s.limitLand();
  const bot = new Bot(s);
  bot.start();
  s.mission = Math.max(s.mission, 6);
  let minMoney = s.money;
  let loanMax = 0;
  const levelDay: number[] = [];
  const dayMoney: string[] = [];
  let lastDay = s.day;
  const maxDays = DIFFS[diff].goalDays + 5;
  for (let h = 0; h < maxDays * 24; h++) {
    for (let i = 0; i < 150; i++) s.tick();
    s.drainEvents();
    bot.hour();
    minMoney = Math.min(minMoney, s.money);
    loanMax = Math.max(loanMax, s.loan);
    while (levelDay.length < s.level - 1) levelDay.push(s.day);
    if (s.day !== lastDay) {
      lastDay = s.day;
      if (dayMoney.length < 8) dayMoney.push(`T${s.day - 1} ${Math.round((s.money - s.loan) / 1000)}k`);
    }
    if (s.status === 'won' || s.status === 'lost') break;
  }
  return {
    diff,
    status: s.status === 'play' ? 'läuft' : s.status === 'won' ? 'gewonnen' : `verloren (${s.endReason})`,
    endDay: s.day,
    levelDays: levelDay.map((d, i) => `${LEVELS[i + 1].name.split('-')[0]} T${d}`).join(', ') || '–',
    minMoney: Math.round(minMoney),
    endMoney: Math.round(s.money),
    loanMax,
    ships: s.shipsDone,
    onTime: s.shipsDone ? Math.round((s.shipsOnTime / s.shipsDone) * 100) : 0,
    trucks: s.trucks.length,
    gates: s.gates.length,
    cranes: s.cranes.length,
    contractsDone: s.contractsDone,
    lostToRival: s.lostToRival,
    broken: s.trucks.filter((t) => t.wear >= 1).length + s.cranes.filter((c) => c.wear >= 1).length,
    idleShare: Math.round((bot.idleSum / Math.max(1, bot.idleSamples)) * 100),
    spend: bot.spend,
    handled: s.handled,
    perDay: s.history.at(-1)?.handled ?? 0,
    dayMoney: dayMoney.join(', '),
    extra: `Zoll geprüft ${s.customsDone}, Lieferaufträge erfüllt ${s.ordersDone}, Versicherung erstattet ${Math.round(s.insuredTotal / 1000)}k, Querverkehr ${Math.round(s.crossWait / 60)} Std.`,
    used: Object.entries(bot.spend).map(([k, v]) => `${k} ${Math.round(v / 1000)}k`).join(', '),
  };
}

it.skipIf(!ON)('Spieltest', () => {
  const k2 = (n: number) => `${Math.round(n / 1000)}k`;
  for (const d of ['easy', 'normal', 'hard'] as DiffId[]) {
    const r = play(d);
    console.log(
      [
        `\n## ${DIFFS[d].name}: ${r.status}, Tag ${r.endDay}`,
        `Stufen: ${r.levelDays}`,
        `Geld: tiefster Stand ${k2(r.minMoney)}, Ende ${k2(r.endMoney)}, Kredit höchstens ${k2(r.loanMax)}`,
        `Schiffe ${r.ships}, pünktlich ${r.onTime} %, Verträge erfüllt ${r.contractsDone}, an Konkurrenz verloren ${r.lostToRival}`,
        `Container: ${r.handled}, pro Tag zuletzt ${r.perDay}`,
        `Netto (Geld − Kredit) Tagesende: ${r.dayMoney}`,
        `Ausgaben: ${r.used}`,
        r.extra,
        `Ausbau: ${r.cranes} Kräne, ${r.trucks} Trucks, ${r.gates} Gates, ausgefallen ${r.broken}, Trucks ohne Auftrag ${r.idleShare} %`,
      ].join('\n'),
    );
  }
  void T;
}, 600_000);

// ───────────────── Langzeit: Wie lange dauert der Weg bis ganz oben? (PLAYLONG=1) ─────────────────
const LONG = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.PLAYLONG;

function playLong(diff: DiffId, days: number) {
  const k = COAST_ROW;
  const s = new Sim(7, diff, 'coast');
  s.limitLand();
  const bot = new Bot(s);
  bot.start();
  bot.craneSlots.push(19, 21, 23, 25, 27, 29, 31, 33);
  bot.gateSlots.push(18, 20, 22, 24, 26, 28, 30, 32);
  s.mission = Math.max(s.mission, 99);
  const levelDay: string[] = [];
  const money: string[] = [];
  const dredged = new Set<number>();
  let simulated = 0;
  let lastLevel = s.level;
  for (let h = 0; h < days * 24; h++) {
    for (let i = 0; i < 150; i++) s.tick();
    s.drainEvents();
    bot.hour();
    const reserve = 60_000;
    // Land nach und nach kaufen und die beiden Hauptstraßen mitziehen
    if (s.money > s.plotPrice * 3 + reserve) {
      const x = s.owned.findIndex((v) => !v);
      if (x >= 0 && s.buyPlot(x).ok) for (let xx = 1; xx < GRID_W; xx++) (bot.try('road', xx, k + 1), bot.try('road', xx, k + 7));
    }
    // Baggern vor dem Kai für große Schiffe
    if (s.level >= LV.big && s.money > 250_000 + reserve) {
      for (let x = 2; x < bot.kaiEnd && x < GRID_W - 2; x++) if (!dredged.has(x) && s.build('dredge', x, k - 1).ok) dredged.add(x);
    }
    // Große Verträge annehmen, wenn der Kai passt
    if (s.contracts.length < s.maxContracts) {
      const o = s.offers.find((o) => (o.ship === 'mega' && s.hasDeepBerth(8)) || (o.ship === 'panamax' && s.hasDeepBerth(6)));
      if (o) s.acceptContract(o.id);
    }
    // Kühlplätze und mehr Lager rechts
    if (s.level >= LV.cargo && s.reeferCapacity < 24 && s.money > 80_000 + reserve) for (let x = 20; x < 26; x++) bot.try('reefer', x, k + 2);
    if (s.stats.yard > 0.7 && s.money > 60_000 + reserve) for (let y = k + 3; y <= k + 6; y++) for (let x = 20; x < GRID_W - 1; x++) if (bot.try('yard', x, y)) break;
    if (s.stats.trucks > 0.85 && s.trucks.length < 70 && s.money > 40_000 + reserve) bot.try('truck', 2 + (s.trucks.length % 30), k + 1);
    // Ein Spieler schafft die Meilensteine irgendwann: hier vereinfacht, sobald die Container reichen
    const nx = LEVELS[s.level];
    if (nx && s.handled >= nx.need && !milestoneDone(s)) {
      const t = s.level + 1;
      if (t === 3) s.shipsOnTime = Math.max(s.shipsOnTime, 5);
      if (t === 4) s.contractsDone = Math.max(s.contractsDone, 3);
      if (t === 5) s.bigShipsDone = Math.max(s.bigShipsDone, 2);
      if (t === 6) s.reefersHandled = Math.max(s.reefersHandled, 200);
      if (t === 7 || t === 11) s.megaDone = Math.max(s.megaDone, t === 7 ? 1 : 10);
      if (t === 8) s.trainsDone = Math.max(s.trainsDone, 40);
      if (t === 9) s.ordersDone = Math.max(s.ordersDone, 20);
      if (t === 12) s.rep = Math.max(s.rep, 90);
      simulated++;
    }
    if (s.level !== lastLevel) {
      lastLevel = s.level;
      levelDay.push(`${s.level}:T${s.day}`);
    }
    if (h % (24 * 25) === 0) money.push(`T${s.day} ${Math.round((s.money - s.loan) / 1000)}k/${s.history.at(-1)?.handled ?? 0}`);
    if (s.status === 'lost') break;
  }
  const c = completion(s);
  console.log(
    `\n## Langzeit ${DIFFS[diff].name}: Tag ${s.day}, ${s.status}`,
    `\nStufen: ${levelDay.join(' ')} (Meilensteine vereinfacht: ${simulated}x)`,
    `\nNetto/Container pro Tag: ${money.join(', ')}`,
    `\nAusbau: ${s.cranes.length} Kräne (${s.cranes.filter((x) => x.model === 'super').length} Super), ${s.trucks.length} Trucks, ${s.gates.length} Gates, Land ${s.owned.filter(Boolean).length}/${s.owned.length}`,
    `\nVollendung ${Math.round(c.share * 100)} %: ${c.items.map((i) => `${i.value}/${i.goal}`).join(' ')}`,
  );
}

it.skipIf(!LONG)('Langzeit', () => {
  playLong((LONG === '1' ? 'normal' : LONG) as DiffId, 400);
}, 1_800_000);
