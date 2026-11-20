import { COAST_ROW, setGridSize } from './data';
import { buildDemo } from './demo';
import { SCENARIOS } from './scenarios';
import { Sim } from './sim';

/** Baut die Startsituation eines Szenarios auf. */
export function setupScenario(id: string, seed: number): Sim {
  const sc = SCENARIOS.find((s) => s.id === id);
  if (!sc) throw new Error(`Unbekanntes Szenario ${id}`);
  const k = COAST_ROW;
  setGridSize(0);
  let sim: Sim;
  if (id === 'insel') {
    sim = new Sim(seed, 'normal', 'island');
    sim.money = 300_000;
    sim.limitLand();
  } else if (id === 'kuehl') {
    sim = new Sim(seed, 'normal', 'coast');
    buildDemo(sim);
    sim.level = 4;
    sim.handled = 20_000;
    sim.limitLand();
    sim.money = 900_000;
    // Viele Schiffe bringen Kühlfracht, wenn Kühlplätze da sind
    for (let x = 12; x <= 19; x++) sim.build('reefer', x, k + 5);
    for (let x = 11; x <= 20; x++) sim.build('road', x, k + 6);
    for (let y = k + 2; y <= k + 6; y++) sim.build('road', 11, y);
    sim.money = 800_000;
  } else if (id === 'sturm') {
    sim = new Sim(seed, 'normal', 'coast');
    buildDemo(sim);
    sim.level = 2;
    sim.handled = 1_500;
    sim.limitLand();
    sim.traits = ['stormy', 'union'];
    sim.money = 350_000;
  } else if (id === 'zoll') {
    sim = new Sim(seed, 'normal', 'coast');
    buildDemo(sim);
    sim.level = 5;
    sim.handled = 45_000;
    sim.limitLand();
    sim.money = 500_000;
  } else {
    sim = new Sim(seed, 'normal', 'coast');
    buildDemo(sim);
    sim.level = 2;
    sim.handled = 1_000;
    sim.limitLand();
    sim.money = 0;
    sim.takeLoan();
    sim.takeLoan();
    sim.takeLoan();
    sim.takeLoan();
    sim.takeLoan();
    sim.money = 60_000;
    sim.rep = 30;
    for (const c of sim.cranes) c.wear = 0.7;
    for (const t of sim.trucks) t.wear = 0.75;
  }
  sim.scenario = id;
  sim.today.building = 0;
  sim.updateMissions(true);
  sim.mission = Math.max(sim.mission, 6);
  sim.finishAll();
  return sim;
}

/** Tagesschlüssel wie 20261120: gleicher Hafen, gleiche Schiffe für alle an diesem Tag */
export function dailyKey(d = new Date()): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** Tägliche Herausforderung: der Demo-Hafen mit Engpass, ein Spieltag Zeit, so viele Container wie möglich */
export function setupDaily(key: string): Sim {
  const seed = Number(key) % 2_147_483_647;
  setGridSize(0);
  const sim = new Sim(seed, 'normal', 'coast');
  buildDemo(sim);
  sim.level = 2;
  sim.handled = 1_500;
  sim.limitLand();
  sim.rollTraits();
  sim.money = 250_000;
  sim.daily = key;
  sim.dailyStart = sim.handled;
  sim.dailyEnd = sim.gm + 24 * 60;
  sim.today.building = 0;
  sim.updateMissions(true);
  sim.mission = 99;
  sim.finishAll();
  return sim;
}
