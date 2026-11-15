import { COAST_ROW } from './data';
import { buildDemo } from './demo';
import { SCENARIOS } from './scenarios';
import { Sim } from './sim';

/** Baut die Startsituation eines Szenarios auf. */
export function setupScenario(id: string, seed: number): Sim {
  const sc = SCENARIOS.find((s) => s.id === id);
  if (!sc) throw new Error(`Unbekanntes Szenario ${id}`);
  const k = COAST_ROW;
  let sim: Sim;
  if (id === 'insel') {
    sim = new Sim(seed, 'normal', 'island');
    sim.money = 300_000;
    sim.limitLand();
  } else if (id === 'kuehl') {
    sim = new Sim(seed, 'normal', 'coast');
    buildDemo(sim);
    sim.level = 3;
    sim.handled = 4_500;
    sim.limitLand();
    sim.money = 900_000;
    // Viele Schiffe bringen Kühlfracht, wenn Kühlplätze da sind
    for (let x = 12; x <= 19; x++) sim.build('reefer', x, k + 5);
    for (let x = 11; x <= 20; x++) sim.build('road', x, k + 6);
    for (let y = k + 2; y <= k + 6; y++) sim.build('road', 11, y);
    sim.money = 800_000;
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
