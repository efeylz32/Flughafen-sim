import { COAST_ROW, DIFFS } from './data';
import { Sim } from './sim';

/**
 * Fertiger Start-Hafen mit eingebautem Engpass: zwei Kräne, aber nur ein Gate
 * und zwei Trucks. Der Spieler soll herausfinden, wo es staut, und es beheben.
 */
export function buildDemo(sim: Sim): void {
  const k = COAST_ROW;
  sim.money = 10_000_000;
  for (let x = 6; x < 14; x++) sim.build('kai', x, k);
  sim.build('crane', 7, k);
  sim.build('crane', 11, k);
  for (let x = 6; x <= 26; x++) sim.build('road', x, k + 1);
  for (let y = k + 2; y <= k + 3; y++) for (let x = 12; x <= 19; x++) sim.build('yard', x, y);
  sim.build('gate', 24, k + 2);
  sim.build('truck', 8, k + 1);
  sim.build('truck', 9, k + 1);
  // Der Demo-Hafen kostet die Hälfte des Startgelds
  sim.money = DIFFS[sim.diff].money * 0.5;
  sim.today.building = 0;
  sim.updateMissions(true);
  sim.nextShipIn = 5;
}
