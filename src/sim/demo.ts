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
  sim.finishAll();
  sim.updateMissions(true);
  sim.nextShipIn = 5;
}

/**
 * Großer, voll ausgebauter Hafen für den Hintergrund des Hauptmenüs.
 * Läuft nur zum Anschauen: Sandbox ohne Ende, Geld ist egal.
 */
export function buildShowcase(sim: Sim): void {
  const k = COAST_ROW;
  sim.sandbox = true;
  sim.status = 'free';
  sim.level = 5;
  sim.spec = 'hub';
  sim.money = 1e9;
  sim.mission = 30;
  const b = (tool: Parameters<Sim['build']>[0], x: number, y: number, rot = false) => {
    sim.rot = rot;
    sim.build(tool, x, y);
  };
  for (let x = 2; x <= 25; x++) b('kai', x, k);
  for (let x = 2; x <= 13; x++) b('dredge', x, k - 1);
  for (const x of [3, 7, 11, 15, 19]) {
    b('crane', x, k);
    const c = sim.craneAt(x, k);
    if (c) sim.setModel(c, 'bridge');
  }
  b('crane', 22, k);
  b('lcrane', 24, k);
  for (let x = 2; x <= 35; x++) {
    b('road', x, k + 1);
    b('road', x, k + 6);
  }
  for (let y = k + 2; y <= k + 5; y++) {
    b('road', 2, y);
    b('road', 34, y);
  }
  for (let y = k + 2; y <= k + 3; y++) for (let x = 4; x <= 20; x++) b('yard', x, y);
  for (let x = 4; x <= 9; x++) b('reefer', x, k + 4);
  b('hazard', 3, k + 5);
  b('hazard', 4, k + 5);
  for (let x = 14; x <= 17; x++) b('emptyyard', x, k + 5);
  for (const x of [24, 26, 28]) b('gate', x, k + 2);
  b('unpack', 22, k + 4);
  b('pack', 26, k + 3);
  b('cold', 30, k + 4);
  b('fill', 18, k + 4);
  b('workshop', 32, k + 4);
  b('rail', 35, k + 3);
  for (let x = 6; x <= 29; x++) if (x % 1 === 0 && x - 6 < 26) b('truck', x, k + 1);
  sim.rot = false;
  sim.finishAll();
  // Verträge für große Schiffe
  (sim as unknown as { makeOffers(): void }).makeOffers();
  for (const o of [...sim.offers]) sim.acceptContract(o.id);
  sim.pending = null;
  sim.nextShipIn = 1;
}
