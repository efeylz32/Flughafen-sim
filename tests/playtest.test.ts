/**
 * Spieltest-Bot: spielt jede Schwierigkeit auf der Küstenkarte durch und berichtet,
 * wann Stufen erreicht werden, wie das Geld verläuft und welche Systeme ungenutzt bleiben.
 * Läuft nur mit `npm run playtest`, nicht bei den normalen Tests.
 */
import { it } from 'vitest';
import { DIFFS, DiffId, LEVELS, T } from '../src/sim/data';
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
