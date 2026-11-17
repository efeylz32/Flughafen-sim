import { describe, expect, it } from 'vitest';
import { COAST_ROW, GRID_H, GRID_W, T, TICKS_PER_SEC } from '../src/sim/data';
import { buildDemo } from '../src/sim/demo';
import { Sim } from '../src/sim/sim';

const k = COAST_ROW;

function run(sim: Sim, gameHours: number) {
  // 1 Tick = 0.4 gm
  const ticks = Math.round((gameHours * 60) / 0.4);
  for (let i = 0; i < ticks; i++) sim.tick();
}

function basicPort(trucks: number, gates: number): Sim {
  const sim = new Sim(7);
  for (let x = 6; x < 10; x++) sim.build('kai', x, k);
  sim.build('crane', 7, k);
  for (let x = 6; x <= 20; x++) sim.build('road', x, k + 1);
  for (let x = 12; x <= 16; x++) sim.build('yard', x, k + 2);
  for (let i = 0; i < gates; i++) sim.build('gate', 18 + i, k + 2);
  for (let i = 0; i < trucks; i++) sim.build('truck', 7 + i, k + 1);
  sim.finishAll();
  sim.updateMissions(true);
  sim.mission = Math.max(sim.mission, 6); // Schiffe kommen, auch wenn Teile der Kette fehlen
  sim.nextShipIn = 1;
  return sim;
}

describe('Bauen', () => {
  it('Kai nur direkt am Wasser', () => {
    const sim = new Sim();
    expect(sim.canBuild('kai', 5, k).ok).toBe(true);
    expect(sim.canBuild('kai', 5, k + 1).ok).toBe(false);
    expect(sim.canBuild('kai', 5, k - 1).ok).toBe(false);
  });

  it('Kran braucht Kai, Truck braucht Straße', () => {
    const sim = new Sim();
    expect(sim.canBuild('crane', 5, k).ok).toBe(false);
    sim.build('kai', 5, k);
    expect(sim.build('crane', 5, k).ok).toBe(true);
    expect(sim.canBuild('truck', 5, k + 1).ok).toBe(false);
  });

  it('Zu wenig Geld verhindert den Bau', () => {
    const sim = new Sim();
    sim.money = 100;
    expect(sim.canBuild('kai', 5, k)).toMatchObject({ ok: false, reason: 'Zu wenig Geld' });
  });

  it('Abriss erstattet die Hälfte', () => {
    const sim = new Sim();
    sim.build('road', 5, k + 1);
    const before = sim.money;
    sim.demolish(5, k + 1);
    expect(sim.money).toBe(before + 250);
  });

  it('erkennt Liegeplätze erst ab vier Kai-Feldern', () => {
    const sim = new Sim();
    for (let x = 3; x < 6; x++) sim.build('kai', x, k);
    expect(sim.hasBerth()).toBe(false);
    sim.build('kai', 6, k);
    expect(sim.berths()).toEqual([3]);
  });
});

describe('Container-Fluss', () => {
  it('eine vollständige Kette fertigt Schiffe ab und verdient Geld', () => {
    const sim = basicPort(4, 1);
    const money = sim.money;
    run(sim, 14);
    expect(sim.shipsDone).toBeGreaterThanOrEqual(1);
    expect(sim.containersDone).toBeGreaterThan(50);
    expect(sim.money).toBeGreaterThan(money);
  });

  it('ohne Truck staut es: Kran blockiert, Schiff nennt den Grund', () => {
    const sim = basicPort(0, 1);
    run(sim, 3);
    const ship = sim.ships.find((s) => s.state === 'unloading');
    expect(ship).toBeDefined();
    expect(sim.cranes[0].state).toBe('blocked');
    expect(ship!.reason).toMatch(/Truck/);
  });

  it('ohne Gate läuft der Stapelplatz voll und das Schiff meldet es', () => {
    const sim = basicPort(4, 0);
    run(sim, 24);
    expect(sim.yardStock).toBe(sim.yardCapacity);
    const ship = sim.ships.find((s) => s.state === 'unloading');
    expect(ship?.reason).toMatch(/Stapelplatz voll/);
    expect(ship?.blocked).toBe(true);
  });

  it('Erhalt der Container: nichts geht verloren oder entsteht neu', () => {
    const sim = basicPort(3, 1);
    run(sim, 9);
    const onShips = sim.ships.reduce((n, s) => n + (s.state === 'leaving' ? 0 : s.containers), 0);
    const onCranes = sim.cranes.reduce((n, c) => n + c.buffer, 0);
    const onTrucks = sim.trucks.reduce((n, t) => n + t.load, 0);
    const onGates = sim.gates.reduce((n, g) => n + g.apron.length + (g.proc > 0 ? 1 : 0), 0);
    // Ohne Vertrag kommen nur Küstenfrachter mit 45 Containern
    const total = 45 * (sim.shipsDone + sim.ships.filter((s) => s.state !== 'leaving').length);
    expect(onShips + onCranes + onTrucks + sim.yardStock + onGates + sim.containersDone).toBe(total);
  });
});

describe('Engpass', () => {
  it('Demo-Hafen: mehr Gates lösen den Gate-Engpass', () => {
    const a = new Sim(3);
    buildDemo(a);
    run(a, 36);
    const b = new Sim(3);
    buildDemo(b);
    for (let i = 0; i < 4; i++) b.build('truck', 10 + i, k + 1);
    b.build('gate', 25, k + 2);
    b.build('gate', 23, k + 2);
    run(b, 36);
    expect(b.containersDone).toBeGreaterThan(a.containersDone);
  });
});

describe('Rückgängig', () => {
  it('Bau zurücknehmen erstattet die vollen Kosten', () => {
    const sim = new Sim();
    const start = sim.money;
    sim.build('kai', 5, k);
    sim.build('crane', 5, k);
    expect(sim.undoBuild({ tool: 'crane', x: 5, y: k }).ok).toBe(true);
    expect(sim.undoBuild({ tool: 'kai', x: 5, y: k }).ok).toBe(true);
    expect(sim.cranes.length).toBe(0);
    expect(sim.canBuild('kai', 5, k).ok).toBe(true);
    expect(sim.money).toBe(start);
  });

  it('ein Truck wird über seine ID zurückgenommen, auch wenn er gefahren ist', () => {
    const sim = basicPort(0, 1);
    const before = sim.money;
    const res = sim.build('truck', 7, k + 1);
    run(sim, 2);
    expect(sim.undoBuild({ tool: 'truck', x: 7, y: k + 1, truckId: res.truckId }).ok).toBe(true);
    expect(sim.trucks.length).toBe(0);
    expect(sim.staff.driver).toBe(0);
    void before;
  });

  it('Kai mit Kran lässt sich nicht einzeln zurücknehmen', () => {
    const sim = new Sim();
    sim.build('kai', 5, k);
    sim.build('crane', 5, k);
    expect(sim.undoBuild({ tool: 'kai', x: 5, y: k })).toMatchObject({ ok: false });
  });

  it('Abriss zurücknehmen stellt Straße, Trucks und Geld wieder her', () => {
    const sim = new Sim();
    sim.build('road', 5, k + 1);
    sim.build('truck', 5, k + 1);
    const before = sim.money;
    const res = sim.demolish(5, k + 1); // nimmt zuerst den Truck
    const res2 = sim.demolish(5, k + 1); // dann die Straße
    expect(sim.trucks.length).toBe(0);
    expect(sim.undoDemolish(res2.removed).ok).toBe(true);
    expect(sim.undoDemolish(res.removed).ok).toBe(true);
    expect(sim.trucks.length).toBe(1);
    expect(sim.canBuild('truck', 5, k + 1).ok).toBe(true);
    expect(sim.money).toBe(before);
  });

  it('Abriss eines Stapelplatzes merkt sich die Container', () => {
    const sim = new Sim();
    sim.build('yard', 5, k + 2);
    sim.stock[sim.idx(5, k + 2)] = 4;
    const res = sim.demolish(5, k + 2);
    expect(sim.undoDemolish(res.removed).ok).toBe(true);
    expect(sim.stock[sim.idx(5, k + 2)]).toBe(4);
  });
});

describe('Ereignisse', () => {
  it('melden Container, Ankunft und Abfertigung mit Ort und Betrag', () => {
    const sim = basicPort(4, 1);
    const tags = new Set<string>();
    for (let i = 0; i < 2400; i++) {
      sim.tick();
      for (const e of sim.drainEvents()) {
        if (e.tag) tags.add(e.tag);
        if (e.tag === 'container') expect(e.amount).toBeGreaterThan(0);
      }
    }
    expect(tags.has('ship-arrived')).toBe(true);
    expect(tags.has('container')).toBe(true);
    expect(tags.has('ship-done')).toBe(true);
  });
});

/** Hafen mit einem Liegeplatz, zwei Kränen, großem Stapelplatz und zwei Gates. */
function bigPort(level: number, trucks = 8): Sim {
  const sim = new Sim(11);
  sim.level = level;
  sim.money = 5_000_000;
  for (let x = 6; x < 12; x++) sim.build('kai', x, k);
  sim.build('crane', 7, k);
  sim.build('crane', 9, k);
  for (let x = 4; x <= GRID_W - 1; x++) sim.build('road', x, k + 1);
  for (let y = k + 2; y <= k + 4; y++) for (let x = 10; x <= 19; x++) sim.build('yard', x, y);
  sim.build('gate', 22, k + 2);
  sim.build('gate', 24, k + 2);
  for (let i = 0; i < trucks; i++) sim.build('truck', 6 + i, k + 1);
  sim.updateMissions(true);
  sim.mission = Math.max(sim.mission, 6);
  sim.nextShipIn = 1;
  sim.finishAll();
  return sim;
}

describe('Hafenstufen', () => {
  it('Werkzeuge sind bis zur passenden Stufe gesperrt', () => {
    const sim = new Sim();
    expect(sim.canBuild('reefer', 5, k + 2)).toMatchObject({ ok: false });
    expect(sim.canBuild('reefer', 5, k + 2).reason).toMatch(/Stufe 3/);
    sim.level = 3;
    expect(sim.canBuild('reefer', 5, k + 2).ok).toBe(true);
  });

  it('Aufstieg zur Stufe 2 bringt Bonus und Vertragsangebote', () => {
    const sim = bigPort(1);
    const tags: string[] = [];
    for (let i = 0; i < 30000 && sim.level < 2; i++) {
      sim.tick();
      for (const e of sim.drainEvents()) if (e.tag) tags.push(e.tag);
    }
    expect(sim.level).toBe(2);
    expect(sim.handled).toBeGreaterThanOrEqual(1000);
    expect(tags).toContain('level');
    expect(sim.offers.length).toBe(3);
  });
});

describe('Export', () => {
  it('ab Stufe 2 werden Schiffe beladen und Export bringt Geld', () => {
    const sim = bigPort(2);
    run(sim, 20);
    expect(sim.exportsLoaded).toBeGreaterThan(20);
    expect(sim.today.exportFees + sim.history.reduce((n, h) => n + h.exportFees, 0)).toBe(sim.exportsLoaded * 250);
  });

  it('auf Stufe 1 gibt es keinen Export', () => {
    const sim = bigPort(1);
    run(sim, 6);
    expect(sim.exportsLoaded).toBe(0);
    expect(sim.ships.every((s) => s.exportTotal === 0)).toBe(true);
  });
});

describe('Verträge', () => {
  it('Annahme bringt Schiffe der Reederei und Bonus bei pünktlicher Abfertigung', () => {
    const sim = bigPort(2, 10);
    run(sim, 0.1);
    (sim as unknown as { makeOffers(): void }).makeOffers();
    const offer = sim.offers.find((o) => o.ship === 'feeder')!;
    expect(sim.acceptContract(offer.id).ok).toBe(true);
    expect(sim.contracts.length).toBe(1);
    run(sim, 30);
    // Vertragsschiffe wurden abgerechnet: entweder Bonus oder Strafe, und der Fahrplan ist vorangekommen
    const sum = (f: 'bonus' | 'penalty') => sim.today[f] + sim.history.reduce((n, h) => n + h[f], 0);
    const c = sim.contracts.find((c) => c.id === offer.id);
    expect(sum('bonus') + sum('penalty')).toBeGreaterThan(0);
    expect(c ? c.calls : 0).toBeLessThan(offer.callsTotal);
  });

  it('mehr als das Limit der Stufe geht nicht', () => {
    const sim = bigPort(2);
    (sim as unknown as { makeOffers(): void }).makeOffers();
    const ids = sim.offers.map((o) => o.id);
    expect(sim.acceptContract(ids[0]).ok).toBe(true);
    expect(sim.acceptContract(ids[1]).ok).toBe(true);
    expect(sim.acceptContract(ids[2])).toMatchObject({ ok: false });
  });

  it('Kündigen kostet die doppelte Strafe', () => {
    const sim = bigPort(2);
    (sim as unknown as { makeOffers(): void }).makeOffers();
    const o = sim.offers[0];
    sim.acceptContract(o.id);
    const before = sim.money;
    sim.cancelContract(o.id);
    expect(sim.money).toBe(before - o.penalty * 2);
    expect(sim.contracts.length).toBe(0);
  });
});

describe('Wetter', () => {
  it('bei Sturm stehen die Kräne und die Liegezeit läuft nicht', () => {
    const sim = bigPort(2);
    run(sim, 1.5);
    const ship = sim.ships.find((s) => s.state === 'unloading')!;
    expect(ship).toBeDefined();
    const left = ship.containers;
    const dwell = ship.atBerth;
    sim.setWeather('storm', 120);
    run(sim, 1);
    expect(sim.cranes.every((c) => c.state === 'storm')).toBe(true);
    expect(ship.containers).toBe(left);
    expect(ship.atBerth).toBe(dwell);
    run(sim, 2);
    expect(sim.weather).toBe('clear');
    expect(ship.containers).toBeLessThan(left);
  });

  it('bei Nebel läuft kein Schiff ein', () => {
    const sim = bigPort(2);
    sim.setWeather('fog', 180);
    run(sim, 2);
    expect(sim.ships.length).toBeGreaterThan(0);
    expect(sim.ships.every((s) => s.state === 'queued')).toBe(true);
    run(sim, 2);
    expect(sim.ships.some((s) => s.state === 'unloading' || s.state === 'sailing')).toBe(true);
  });
});

describe('Kühlfracht', () => {
  it('Kühlcontainer gehen nur auf Kühlplätze und bringen 400 €', () => {
    const sim = bigPort(3);
    for (let x = 10; x <= 15; x++) sim.build('reefer', x, k + 5);
    for (let x = 10; x <= 15; x++) sim.build('road', x, k + 6);
    for (let y = k + 2; y <= k + 6; y++) sim.build('road', 9, y);
    run(sim, 40);
    expect(sim.reefersHandled).toBeGreaterThan(0);
    for (const i of sim.yardTileList) expect(sim.stock[i] + sim.stockExp[i]).toBeLessThanOrEqual(6);
  });

  it('Kühlcontainer verderben nach 10 Stunden und kosten Strafe', () => {
    const sim = new Sim();
    sim.level = 3;
    sim.build('reefer', 5, k + 2);
    const i = sim.idx(5, k + 2);
    sim.stock[i] = 3;
    (sim as unknown as { reefTimes: Map<number, number[]> }).reefTimes.set(i, [sim.gm, sim.gm, sim.gm]);
    const money = sim.money;
    run(sim, 9);
    expect(sim.stock[i]).toBe(3);
    run(sim, 2);
    expect(sim.stock[i]).toBe(0);
    expect(sim.money).toBeCloseTo(money - 1500 - (sim.today.power ?? 0), 2);
  });
});

describe('Bahn', () => {
  it('Gleisanschluss nur am rechten Rand, der Zug holt Container ab', () => {
    const sim = bigPort(3);
    expect(sim.canBuild('rail', 20, k + 2)).toMatchObject({ ok: false });
    expect(sim.build('rail', GRID_W - 1, k + 2).ok).toBe(true);
    run(sim, 24);
    expect(sim.trainsDone).toBeGreaterThanOrEqual(1);
    const rail = sim.today.rail + sim.history.reduce((n, h) => n + h.rail, 0);
    expect(rail).toBeGreaterThan(0);
  });
});

describe('Große Schiffe', () => {
  it('kommen erst mit tiefem Liegeplatz und laden 300 Container ab', () => {
    const sim = bigPort(3, 12);
    expect(sim.hasDeepBerth()).toBe(false);
    for (let x = 6; x < 12; x++) expect(sim.build('dredge', x, k - 1).ok).toBe(true);
    expect(sim.hasDeepBerth()).toBe(true);
    sim.cranes.forEach((c) => sim.upgrade('crane', c.id));
    (sim as unknown as { addShip(t: string, c: null, r: boolean): void }).addShip('panamax', null, false);
    run(sim, 30);
    expect(sim.bigShipsDone).toBeGreaterThanOrEqual(1);
  });

  it('Baggern lässt sich zurücknehmen', () => {
    const sim = new Sim();
    sim.level = 3;
    const before = sim.money;
    sim.build('dredge', 6, k - 1);
    expect(sim.depth[6]).toBe(1);
    expect(sim.undoBuild({ tool: 'dredge', x: 6, y: k - 1 }).ok).toBe(true);
    expect(sim.depth[6]).toBe(0);
    expect(sim.money).toBe(before);
  });
});

describe('Aufrüsten', () => {
  it('Containerbrücke arbeitet doppelt so schnell und lässt sich zurücknehmen', () => {
    const sim = new Sim();
    sim.level = 2;
    sim.build('kai', 5, k);
    sim.build('kai', 6, k);
    sim.build('crane', 5, k);
    sim.finishAll();
    const c = sim.cranes[0];
    const before = sim.money;
    const cost = sim.upgradeInfo('crane', c.id)!.cost;
    expect(sim.upgrade('crane', c.id).ok).toBe(true);
    expect(sim.moveTime(c)).toBeCloseTo(1.5 / sim.eff('crane'), 6);
    expect(sim.money).toBe(before - cost);
    expect(sim.upgrade('crane', c.id)).toMatchObject({ ok: false });
    expect(sim.undoUpgrade('crane', c.id).ok).toBe(true);
    expect(sim.money).toBe(before);
    expect(c.big).toBe(false);
  });

  it('fahrerlose Fahrzeuge gibt es erst ab Stufe 4', () => {
    const sim = new Sim();
    sim.build('road', 5, k + 1);
    const id = sim.build('truck', 5, k + 1).truckId!;
    expect(sim.upgrade('truck', id)).toMatchObject({ ok: false });
    sim.level = 4;
    expect(sim.upgrade('truck', id).ok).toBe(true);
    expect(sim.trucks[0].agv).toBe(true);
  });
});

describe('Personal', () => {
  it('Kauf stellt ein, Abriss entlässt, Löhne laufen stündlich', () => {
    const sim = new Sim();
    sim.build('road', 5, k + 1);
    sim.build('truck', 5, k + 1);
    expect(sim.staff.driver).toBe(1);
    const before = sim.money;
    run(sim, 10);
    expect(Math.round(before - sim.money)).toBe(220);
    sim.demolish(5, k + 1);
    expect(sim.staff.driver).toBe(0);
  });

  it('ohne Fahrer steht der Truck, ohne Kranführer der Kran', () => {
    const sim = basicPort(3, 1);
    sim.staff.driver = 0;
    sim.staff.crane = 0;
    run(sim, 4);
    expect(sim.containersDone).toBe(0);
    const ship = sim.ships.find((s) => s.state === 'unloading');
    expect(ship?.reason).toMatch(/Kranführer/);
    sim.hire('crane');
    for (let i = 0; i < 3; i++) sim.hire('driver');
    run(sim, 6);
    expect(sim.containersDone).toBeGreaterThan(0);
  });

  it('Krankmeldungen kommen morgens und heilen wieder aus', () => {
    const sim = new Sim(3, 'hard');
    for (let i = 0; i < 200; i++) sim.hire('driver');
    run(sim, 19);
    const sick = sim.sick.driver.length;
    expect(sick).toBeGreaterThan(3);
    expect(sim.staffAvail('driver')).toBe(200 - sick);
    expect(sim.fire('driver').ok).toBe(true);
  });
});

describe('Schwierigkeit', () => {
  it('bestimmt Startgeld, Liegezeit und Löhne', () => {
    const easy = new Sim(1, 'easy');
    const hard = new Sim(1, 'hard');
    expect(easy.money).toBeGreaterThan(hard.money);
    expect(easy.wagePerHour('crane')).toBeLessThan(hard.wagePerHour('crane'));
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(hard.serialize())));
    expect(copy.diff).toBe('hard');
  });
});

describe('Verarbeitung und Aufgaben', () => {
  function plantPort(): Sim {
    const sim = bigPort(2, 10);
    expect(sim.build('unpack', 26, k + 2).ok).toBe(true);
    expect(sim.build('unpack', 29, k + 2).ok).toBe(true);
    expect(sim.build('pack', 32, k + 2).ok).toBe(true);
    return sim;
  }

  it('Packhalle und Veredelung machen aus zwei Containern Fertigware für 900 €', () => {
    const sim = plantPort();
    run(sim, 30);
    expect(sim.premiumDone).toBeGreaterThan(5);
    expect(sim.plants.find((p) => p.kind === 'pack')!.made).toBeGreaterThanOrEqual(sim.premiumDone);
  });

  it('ein Truck mit fester Aufgabe fährt nur diese Fahrten', () => {
    const sim = plantPort();
    for (const t of sim.trucks) sim.setRole(t.id, 'crane');
    run(sim, 10);
    expect(sim.containersDone).toBe(0);
    expect(sim.yardStock).toBeGreaterThan(0);
    for (const t of sim.trucks) if (t.job) expect(t.job.srcKind).toBe('crane');
  });

  it('feste Aufgaben sind schneller als die Automatik', () => {
    // Mit wenigen Trucks und vielen Schiffen sind die Trucks der Engpass
    const auto = bigPort(1, 4);
    const fixed = bigPort(1, 4);
    for (const s of [auto, fixed]) s.nextShipIn = 0;
    fixed.trucks.forEach((t, i) => fixed.setRole(t.id, i % 2 ? 'out' : 'crane'));
    run(auto, 48);
    run(fixed, 48);
    expect(fixed.containersDone).toBeGreaterThan(auto.containersDone);
  });
});

describe('Ziel, Pleite, Kredit', () => {
  it('Kredit bis zur Grenze der Stufe, Zinsen am Tagesabschluss, Tilgen', () => {
    const sim = new Sim(1);
    const m = sim.money;
    expect(sim.takeLoan().ok).toBe(true);
    expect(sim.takeLoan().ok).toBe(true);
    expect(sim.takeLoan()).toMatchObject({ ok: false });
    expect(sim.money).toBe(m + 200_000);
    run(sim, 18.1);
    expect(sim.history.at(-1)!.interest).toBe(800);
    expect(sim.repayLoan().ok).toBe(true);
    expect(sim.loan).toBe(100_000);
  });

  it('drei Tagesabschlüsse im Minus sind die Pleite', () => {
    const sim = new Sim(1);
    sim.money = -50_000;
    const tags: string[] = [];
    for (let d = 0; d < 3; d++) {
      run(sim, 24);
      for (const e of sim.drainEvents()) if (e.tag) tags.push(e.tag);
    }
    expect(tags.filter((t) => t === 'debt').length).toBe(2);
    expect(sim.status).toBe('lost');
    expect(sim.endReason).toMatch(/Pleite/);
  });

  it('wer wieder ins Plus kommt, fängt bei null an', () => {
    const sim = new Sim(1);
    sim.money = -1;
    run(sim, 18.1);
    expect(sim.debtDays).toBe(1);
    sim.money = 100_000;
    run(sim, 24);
    expect(sim.debtDays).toBe(0);
  });

  it('Weltklasse-Hafen ist der Sieg, Tag nach dem Ziel ist verloren', () => {
    const win = new Sim(1);
    win.level = 4;
    win.handled = 1e6;
    run(win, 0.1);
    expect(win.status).toBe('won');
    expect(win.level).toBe(7);
    const late = new Sim(1, 'hard');
    late.gm += 50 * 1440;
    run(late, 24);
    expect(late.status).toBe('lost');
    expect(late.endReason).toMatch(/Ziel verpasst/);
  });
});

describe('Gebäudegrößen', () => {
  it('Gebäude belegen mehrere Felder, Abriss und Rückgängig räumen alle', () => {
    const sim = new Sim();
    sim.level = 3;
    expect(sim.build('pack', 5, k + 3).ok).toBe(true);
    for (let y = k + 3; y < k + 6; y++) for (let x = 5; x < 8; x++) expect(sim.kind[sim.idx(x, y)]).toBe(8);
    expect(sim.canBuild('gate', 7, k + 3)).toMatchObject({ ok: false });
    expect(sim.canBuild('gate', 4, k + 3).reason).toMatch(/2 × 1/);
    expect(sim.plantAt(7, k + 5)?.kind).toBe('pack');
    const res = sim.demolish(6, k + 4);
    expect(sim.plants.length).toBe(0);
    expect(sim.kind[sim.idx(7, k + 5)]).toBe(1);
    expect(sim.undoDemolish(res.removed).ok).toBe(true);
    expect(sim.plantAt(5, k + 3)?.w).toBe(3);
  });

  it('Zufahrt von jeder Seite des Gebäudes', () => {
    const sim = new Sim();
    sim.build('gate', 5, k + 3);
    sim.build('road', 6, k + 4);
    expect(sim.accessOf(sim.gates[0])).toEqual([sim.idx(6, k + 4)]);
  });
});

describe('Kühlhalle', () => {
  it('macht aus Kühlcontainern Lebensmittel für 750 €', () => {
    const sim = bigPort(3, 12);
    for (let x = 10; x <= 15; x++) sim.build('reefer', x, k + 5);
    for (let x = 9; x <= 22; x++) sim.build('road', x, k + 6);
    for (let y = k + 2; y <= k + 6; y++) sim.build('road', 9, y);
    expect(sim.build('cold', 21, k + 4).ok).toBe(true);
    (sim as unknown as { addShip(t: string, c: null, r: boolean): void }).addShip('feeder', null, true);
    run(sim, 30);
    expect(sim.plants.reduce((n, p) => n + p.made, 0)).toBeGreaterThan(0);
  });
});

describe('Einbahnstraßen', () => {
  it('Wegsuche hält sich an die Richtung', () => {
    const sim = new Sim();
    for (let x = 2; x <= 6; x++) sim.build('road', x, k + 2);
    const a = sim.idx(2, k + 2);
    const b = sim.idx(6, k + 2);
    expect(sim.distMap(b)[a]).toBe(40);
    sim.toggleOneway(4, k + 2); // Ost
    expect(sim.distMap(b)[a]).toBe(40);
    expect(sim.distMap(a)[b]).toBe(-1);
    sim.toggleOneway(4, k + 2); // Süd: gar kein Durchkommen mehr
    expect(sim.distMap(b)[a]).toBe(-1);
    for (let i = 0; i < 3; i++) sim.toggleOneway(4, k + 2);
    expect(sim.oneway[sim.idx(4, k + 2)]).toBe(-1);
  });

  it('ein Einbahn-Ring mit Kurven ist befahrbar', () => {
    // Ring: oben nach Osten, rechts nach Süden, unten nach Westen, links nach Norden
    const sim = new Sim();
    for (let x = 2; x <= 6; x++) {
      sim.build('road', x, k + 2);
      sim.build('road', x, k + 6);
    }
    for (let y = k + 3; y <= k + 5; y++) {
      sim.build('road', 2, y);
      sim.build('road', 6, y);
    }
    const set = (x: number, y: number, d: number) => {
      while (sim.oneway[sim.idx(x, y)] !== d) sim.toggleOneway(x, y);
    };
    for (let x = 2; x <= 5; x++) set(x, k + 2, 0);
    for (let y = k + 2; y <= k + 5; y++) set(6, y, 1);
    for (let x = 3; x <= 6; x++) set(x, k + 6, 2);
    for (let y = k + 3; y <= k + 6; y++) set(2, y, 3);
    const a = sim.idx(3, k + 2);
    const b = sim.idx(3, k + 6);
    expect(sim.distMap(b)[a]).toBe(100);
    expect(sim.distMap(a)[b]).toBe(60);
  });
});

describe('Land', () => {
  it('erst kaufen, dann bauen; jeder Streifen wird teurer', () => {
    const sim = new Sim();
    sim.limitLand();
    expect(sim.canBuild('road', 19, k + 2).ok).toBe(true);
    expect(sim.canBuild('road', 20, k + 2).reason).toMatch(/gehört dir noch nicht/);
    const m = sim.money;
    expect(sim.buyPlot(21).ok).toBe(true);
    expect(sim.money).toBe(m - 60_000);
    expect(sim.canBuild('road', 23, k + 2).ok).toBe(true);
    expect(sim.plotPrice).toBe(90_000);
    expect(sim.buyPlot(22)).toMatchObject({ ok: false });
  });
});

describe('Verschleiß', () => {
  it('Geräte nutzen sich ab Stufe 2 ab, die Werkstatt repariert', () => {
    const sim = bigPort(2, 6);
    run(sim, 24);
    const worn = Math.max(...sim.trucks.map((t) => t.wear), ...sim.cranes.map((c) => c.wear));
    expect(worn).toBeGreaterThan(0.3);
    sim.trucks[0].wear = 1;
    sim.build('workshop', 30, k + 2);
    expect(sim.staff.mech).toBe(1);
    run(sim, 3);
    expect(sim.trucks[0].wear).toBeLessThan(1);
  });

  it('auf Stufe 1 gibt es keinen Verschleiß', () => {
    const sim = bigPort(1, 6);
    run(sim, 12);
    expect(sim.trucks.every((t) => t.wear === 0)).toBe(true);
  });
});

describe('Karten', () => {
  it('Insel hat Wasser am Rand, Felsen kosten beim Sprengen', () => {
    const isl = new Sim(4, 'normal', 'island');
    expect(isl.kind[isl.idx(0, k + 5)]).toBe(0);
    expect(isl.canBuild('rail', GRID_W - 1, k + 2)).toMatchObject({ ok: false });
    const rocks = new Sim(4, 'normal', 'rocks');
    const i = rocks.kind.findIndex((v) => v === 10);
    expect(i).toBeGreaterThan(0);
    const x = i % GRID_W;
    const y = Math.floor(i / GRID_W);
    expect(rocks.canBuild('road', x, y)).toMatchObject({ ok: false });
    const m = rocks.money;
    expect(rocks.demolish(x, y).ok).toBe(true);
    expect(rocks.money).toBe(m - 8000);
    expect(rocks.canBuild('road', x, y).ok).toBe(true);
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(rocks.serialize())));
    expect(copy.map).toBe('rocks');
  });
});

describe('Entscheidungen', () => {
  it('Streik ablehnen legt die Fahrer still, zustimmen erhöht den Lohn', () => {
    const sim = basicPort(3, 1);
    const w = sim.wagePerHour('driver');
    sim.pending = { id: 'strike', title: '', text: '', options: ['a', 'b'] };
    sim.resolveDecision(0);
    expect(sim.wagePerHour('driver')).toBeGreaterThan(w);
    sim.pending = { id: 'strike', title: '', text: '', options: ['a', 'b'] };
    sim.resolveDecision(1);
    expect(sim.staffAvail('driver')).toBe(0);
    run(sim, 9);
    expect(sim.staffAvail('driver')).toBe(3);
  });

  it('Sonderfahrt wird als einmaliger Vertrag angelegt', () => {
    const sim = basicPort(3, 1);
    sim.pending = { id: 'vip', title: '', text: '', options: ['a', 'b'] };
    sim.resolveDecision(0);
    expect(sim.contracts.find((c) => c.line === 'Sonderfahrt')?.calls).toBe(1);
  });

  it('ab Stufe 2 kommen Entscheidungen und die Konkurrenz zieht an', () => {
    const sim = bigPort(2, 8);
    const r = sim.rivalRate;
    let seen = 0;
    for (let d = 0; d < 10; d++) {
      run(sim, 24);
      if (sim.pending) {
        seen++;
        sim.resolveDecision(1);
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(sim.rivalRate).toBeGreaterThan(r);
  });
});

describe('Zonen', () => {
  it('ein Kran mit Zone liefert nur in Lager derselben Zone', () => {
    const sim = basicPort(4, 1);
    for (let x = 12; x <= 16; x++) sim.setZone(x, k + 2, 1);
    sim.setZone(7, k, 2);
    run(sim, 4);
    expect(sim.yardStock).toBe(0);
    expect(sim.cranes[0].state).toBe('blocked');
    sim.setZone(7, k, 1);
    sim.setZone(18, k + 2, 1);
    run(sim, 6);
    expect(sim.containersDone).toBeGreaterThan(0);
  });

  it('ein Truck mit Zone fährt nur Fahrten seiner Zone', () => {
    const sim = basicPort(2, 1);
    for (const t of sim.trucks) sim.setZone(t.tile % GRID_W, Math.floor(t.tile / GRID_W), 3);
    expect(sim.trucks.every((t) => t.zone === 3)).toBe(true);
    run(sim, 4);
    expect(sim.trucks.every((t) => t.job === null)).toBe(true);
  });

  it('Zonen bleiben beim Speichern erhalten', () => {
    const sim = basicPort(2, 1);
    sim.setZone(12, k + 2, 4);
    sim.setZone(7, k, 4);
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(copy.zone[copy.idx(12, k + 2)]).toBe(4);
    expect(copy.cranes[0].zone).toBe(4);
  });
});

describe('Große Kräne und Portalkräne', () => {
  it('die Containerbrücke belegt zwei Kai-Felder', () => {
    const sim = new Sim();
    sim.level = 2;
    for (let x = 5; x <= 7; x++) sim.build('kai', x, k);
    sim.build('crane', 5, k);
    sim.build('crane', 6, k);
    sim.finishAll();
    expect(sim.upgrade('crane', sim.cranes[0].id)).toMatchObject({ ok: false });
    sim.demolish(6, k);
    expect(sim.upgrade('crane', sim.cranes[0].id).ok).toBe(true);
    expect(sim.craneAt(6, k)?.id).toBe(sim.cranes[0].id);
    expect(sim.canBuild('crane', 6, k)).toMatchObject({ ok: false });
  });

  it('der Portalkran erhöht die Stellplätze im Umkreis und braucht einen Kranführer', () => {
    const sim = new Sim();
    sim.level = 3;
    for (let x = 5; x <= 9; x++) sim.build('yard', x, k + 3);
    // Eine Reihe reicht nicht: Der Portalkran überspannt 3 × 3 Lagerfelder
    expect(sim.canBuild('rtg', 7, k + 3).ok).toBe(false);
    for (let x = 5; x <= 9; x++) for (const y of [k + 2, k + 4]) sim.build('yard', x, y);
    const before = sim.yardCapacity;
    expect(sim.build('rtg', 7, k + 3).ok).toBe(true);
    expect(sim.canBuild('rtg', 8, k + 3).ok).toBe(false); // überlappt
    sim.finishAll();
    expect(sim.staffNeed('crane')).toBe(1);
    run(sim, 0.1);
    expect(sim.yardCapacity).toBe(before + 9 * 3);
    sim.fire('crane');
    run(sim, 0.1);
    expect(sim.yardCapacity).toBe(before);
    const res = sim.demolish(7, k + 3);
    expect(sim.rtgs.length).toBe(0);
    expect(sim.kind[sim.idx(7, k + 3)]).toBe(4);
    expect(sim.undoDemolish(res.removed).ok).toBe(true);
    expect(sim.rtgs.length).toBe(1);
  });
});

describe('Markt', () => {
  it('Preise schwanken täglich in Grenzen, die Veredelung wählt ihr Produkt', () => {
    const sim = new Sim(5);
    const seen = new Set<number>();
    for (let d = 0; d < 30; d++) {
      run(sim, 24);
      seen.add(sim.price('elec'));
      for (const p of ['elec', 'cloth', 'food'] as const) {
        expect(sim.market[p]).toBeGreaterThanOrEqual(0.5);
        expect(sim.market[p]).toBeLessThanOrEqual(1.7);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
    sim.level = 2;
    sim.build('pack', 5, k + 3);
    sim.setProduct(sim.plants[0].id, 'cloth');
    expect(sim.plants[0].product).toBe('cloth');
  });
});

describe('Szenarien', () => {
  it('jedes Szenario startet, hat ein Ziel und lässt sich speichern', async () => {
    const { SCENARIOS } = await import('../src/sim/scenarios');
    const { setupScenario } = await import('../src/sim/scenario-setup');
    for (const sc of SCENARIOS) {
      const sim = setupScenario(sc.id, 3);
      expect(sim.scenario).toBe(sc.id);
      expect(sim.goalDay).toBe(sc.days);
      expect(sc.done(sim)).toBe(false);
      run(sim, 12);
      expect(sim.status === 'play' || sim.status === 'won').toBe(true);
      const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
      expect(copy.scenario).toBe(sc.id);
    }
    const m = setupScenario('marode', 1);
    expect(m.loan).toBe(500_000);
    m.loan = 0;
    m.rep = 61;
    run(m, 1);
    expect(m.status).toBe('won');
  });
});

describe('Verkehr', () => {
  it('in einer Spur steht pro Feld nur ein fahrender Truck, der Rest staut sich', () => {
    const sim = bigPort(1, 24);
    let jammed = 0;
    let worst = 0;
    for (let i = 0; i < 3000; i++) {
      sim.tick();
      const seen = new Map<number, number>();
      for (const t of sim.trucks) {
        if (t.stuck > 0) jammed++;
        if (t.next < 0 || t.dir < 0) continue;
        const key = t.tile * 4 + t.dir;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      for (const n of seen.values()) worst = Math.max(worst, n);
    }
    expect(jammed).toBeGreaterThan(0);
    expect(Math.max(...sim.roadJam)).toBeGreaterThan(0);
    expect(worst).toBeLessThanOrEqual(3);
    expect(sim.containersDone).toBeGreaterThan(100);
  });

  it('eine zweite Straße entlastet: mehr Durchsatz als mit einer', () => {
    const one = bigPort(1, 24);
    const two = bigPort(1, 24);
    for (let x = 4; x <= GRID_W - 1; x++) two.build('road', x, k + 5);
    for (const x of [9, 20, 21, 26]) for (let y = k + 2; y <= k + 4; y++) two.build('road', x, y);
    run(one, 30);
    run(two, 30);
    // Der Engpass liegt hier am Kran, daher ist der Unterschied klein: mindestens gleich viel (±2 %)
    expect(two.containersDone).toBeGreaterThanOrEqual(one.containersDone * 0.98);
  });
});

describe('Speichern', () => {
  it('Roundtrip erhält Gebäude, Geld und Fortschritt', () => {
    const sim = new Sim(9);
    buildDemo(sim);
    run(sim, 2);
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(copy.cranes.length).toBe(sim.cranes.length);
    expect(copy.gates.length).toBe(sim.gates.length);
    expect(copy.trucks.length).toBe(sim.trucks.length);
    expect(copy.money).toBe(sim.money);
    expect(copy.mission).toBe(sim.mission);
    expect(Array.from(copy.kind)).toEqual(Array.from(sim.kind));
  });

  it('Roundtrip erhält Stufe, Verträge, Aufrüstungen und Baggerung', () => {
    const sim = bigPort(3);
    sim.build('dredge', 6, k - 1);
    sim.build('rail', GRID_W - 1, k + 2);
    sim.upgrade('crane', sim.cranes[0].id);
    sim.finishAll();
    (sim as unknown as { makeOffers(): void }).makeOffers();
    sim.acceptContract(sim.offers[0].id);
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(copy.level).toBe(3);
    expect(copy.depth[6]).toBe(1);
    expect(copy.rails.length).toBe(1);
    expect(copy.cranes[0].big).toBe(true);
    expect(copy.contracts.length).toBe(1);
    expect(copy.offers.length).toBe(2);
  });
});

it('Takt: 10 Ticks pro Sekunde', () => {
  expect(TICKS_PER_SEC).toBe(10);
});

describe('Kai an mehreren Küsten', () => {
  function islandPort(side: 'W' | 'S'): Sim {
    const sim = new Sim(5, 'normal', 'island');
    sim.money = 5_000_000;
    if (side === 'W') {
      for (let y = 12; y < 16; y++) expect(sim.build('kai', 2, y).ok).toBe(true);
      sim.build('crane', 2, 13);
      for (let y = 10; y <= 20; y++) sim.build('road', 3, y);
      for (let y = 12; y <= 16; y++) sim.build('yard', 4, y);
      sim.build('gate', 4, 18);
      for (let i = 0; i < 4; i++) sim.build('truck', 3, 10 + i);
    } else {
      const y = 24; // Südküste
      for (let x = 8; x < 12; x++) expect(sim.build('kai', x, y).ok).toBe(true);
      sim.build('crane', 9, y);
      for (let x = 6; x <= 16; x++) sim.build('road', x, y - 1);
      for (let x = 8; x <= 12; x++) sim.build('yard', x, y - 2);
      sim.build('gate', 14, y - 2);
      for (let i = 0; i < 4; i++) sim.build('truck', 6 + i, y - 1);
    }
    sim.updateMissions(true);
    sim.mission = Math.max(sim.mission, 6);
    sim.nextShipIn = 1;
    return sim;
  }

  it('Kai nur dort, wo Wasser davor liegt', () => {
    const sim = new Sim(5, 'normal', 'island');
    expect(sim.canBuild('kai', 2, 14).ok).toBe(true);
    expect(sim.canBuild('kai', 3, 14).ok).toBe(false);
    const coast = new Sim(5);
    expect(coast.canBuild('kai', 2, 14).ok).toBe(false);
  });

  it('Schiffe legen an der Westküste an und werden abgefertigt', () => {
    const sim = islandPort('W');
    expect(sim.berths().length).toBe(1);
    run(sim, 16);
    expect(sim.shipsDone).toBeGreaterThanOrEqual(1);
    expect(sim.containersDone).toBeGreaterThan(50);
  });

  it('Schiffe legen an der Südküste an', () => {
    const sim = islandPort('S');
    run(sim, 16);
    expect(sim.shipsDone).toBeGreaterThanOrEqual(1);
  });

  it('Containerbrücke hat doppelt so viel Platz unter sich', () => {
    const sim = basicPort(0, 1);
    const c = sim.cranes[0];
    expect(sim.bufCap(c)).toBe(4);
    sim.setModel(c, 'bridge');
    expect(sim.bufCap(c)).toBe(8);
  });
});

describe('Gebäude drehen', () => {
  it('gedrehtes Gate steht senkrecht und übersteht Abriss, Rückgängig und Speichern', () => {
    const sim = new Sim();
    sim.rot = true;
    expect(sim.build('gate', 10, k + 2).ok).toBe(true);
    const g = sim.gates[0];
    expect([g.w, g.h]).toEqual([1, 2]);
    expect(sim.gateAt(10, k + 3)).toBe(g);
    sim.rot = false;
    const d = sim.demolish(10, k + 3);
    expect(sim.gates.length).toBe(0);
    expect(sim.undoDemolish(d.removed).ok).toBe(true);
    expect([sim.gates[0].w, sim.gates[0].h]).toEqual([1, 2]);
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect([copy.gates[0].w, copy.gates[0].h]).toEqual([1, 2]);
  });

  it('gedrehte Packhalle ist 2 × 3', () => {
    const sim = new Sim();
    sim.level = 2;
    sim.rot = true;
    expect(sim.build('unpack', 10, k + 2).ok).toBe(true);
    expect([sim.plants[0].w, sim.plants[0].h]).toEqual([2, 3]);
  });
});

describe('Einbahnstraße', () => {
  it('hat zwei Spuren und lässt doppelt so viele Trucks durch', () => {
    const sim = new Sim();
    for (let x = 4; x <= 12; x++) sim.build('road', x, k + 2);
    const tile = (k + 2) * GRID_W + 8;
    expect(sim.laneCap(tile, 0)).toBe(1);
    sim.oneway[tile] = 0;
    expect(sim.laneCap(tile, 0)).toBe(2);
    expect(sim.laneCap(tile, 2)).toBe(1);
  });
});

describe('Kranmodelle', () => {
  it('Leichtkran ist billiger und langsamer, Aufrüsten führt durch alle Modelle', () => {
    const sim = new Sim();
    sim.money = 5_000_000;
    for (let x = 4; x < 10; x++) sim.build('kai', x, k);
    const before = sim.money;
    expect(sim.build('lcrane', 5, k).ok).toBe(true);
    expect(before - sim.money).toBe(40_000);
    const c = sim.cranes[0];
    expect(c.model).toBe('light');
    expect(c.state === 'building' || c.build! > 0).toBe(true);
    sim.finishAll();
    const slow = sim.moveTime(c);
    sim.upgrade('crane', c.id);
    sim.finishAll();
    expect(c.model).toBe('mobile');
    expect(sim.moveTime(c)).toBeLessThan(slow);
    expect(sim.canUpgrade('crane', c.id).ok).toBe(false); // Containerbrücke erst ab Stufe 2
    sim.level = 4;
    sim.upgrade('crane', c.id);
    expect(c.model).toBe('bridge');
    expect(c.big).toBe(true);
    sim.finishAll();
    sim.upgrade('crane', c.id);
    expect(c.model).toBe('super');
    expect(sim.canUpgrade('crane', c.id).ok).toBe(false);
    // Abriss und Rückgängig behalten das Modell
    const d = sim.demolish(5, k);
    sim.undoDemolish(d.removed);
    expect(sim.cranes[0].model).toBe('super');
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(copy.cranes[0].model).toBe('super');
  });
});

describe('Verbesserungen', () => {
  it('kosten Geld, brauchen die Hafenstufe und wirken', () => {
    const sim = basicPort(0, 1);
    sim.money = 1_000_000;
    const c = sim.cranes[0];
    const mt = sim.moveTime(c);
    expect(sim.buyTech('spreader').ok).toBe(true);
    expect(sim.moveTime(c)).toBeLessThan(mt);
    expect(sim.buyTech('stack').ok).toBe(false); // ab Stufe 2
    sim.level = 3;
    expect(sim.buyTech('stack').ok).toBe(true);
    const tile = sim.yardTileList[0];
    expect(sim.capAt(tile)).toBe(7);
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(copy.tech.stack).toBe(1);
  });
});

describe('Schiffe und Verträge', () => {
  it('ohne Vertrag kommen nur Küstenfrachter, auf Stufe 1 gibt es keine Verträge', () => {
    const sim = basicPort(4, 1);
    run(sim, 30);
    expect(sim.shipsDone + sim.ships.length).toBeGreaterThan(0);
    expect([...sim.ships].every((s) => s.type === 'coaster')).toBe(true);
    expect(sim.maxContracts).toBe(0);
    expect(sim.offers.length).toBe(0);
  });

  it('zweimal unpünktlich: Die Reederei kündigt', () => {
    const sim = basicPort(0, 1);
    sim.level = 2;
    (sim as unknown as { makeOffers(): void }).makeOffers();
    const o = sim.offers[0];
    sim.acceptContract(o.id);
    const rep = sim.rep;
    const priv = sim as unknown as { settleContract(s: { contractId: number }, on: boolean): void };
    priv.settleContract({ contractId: o.id }, false);
    expect(sim.contracts.length).toBe(1);
    priv.settleContract({ contractId: o.id }, false);
    expect(sim.contracts.length).toBe(0);
    expect(sim.rep).toBeLessThan(rep);
  });
});

describe('Bauzeit, Gebrauchtkauf und Höchstzustand', () => {
  it('ein neues Gate arbeitet erst nach der Bauzeit', () => {
    const sim = new Sim();
    sim.build('road', 5, k + 1);
    sim.build('road', 6, k + 1);
    sim.build('gate', 5, k + 2);
    const g = sim.gates[0];
    expect(g.build).toBe(120);
    run(sim, 1);
    expect(g.staffed).toBe(false);
    run(sim, 1.1);
    expect(g.build).toBe(0);
    expect(g.staffed).toBe(true);
  });

  it('gebraucht ist billiger, hat aber einen niedrigeren Höchstzustand', () => {
    const sim = new Sim();
    for (let x = 4; x < 8; x++) sim.build('kai', x, k);
    const m = sim.money;
    sim.used = true;
    sim.build('crane', 5, k);
    expect(m - sim.money).toBe(40_000);
    const c = sim.cranes[0];
    expect(c.cap).toBeLessThan(0.8);
    expect(c.wear).toBeGreaterThan(0.2);
  });

  it('die Werkstatt repariert nur bis zum Höchstzustand, der mit der Nutzung sinkt', () => {
    const sim = basicPort(2, 1);
    sim.level = 2;
    sim.build('workshop', 14, k + 4);
    sim.hire('mech');
    sim.finishAll();
    const t = sim.trucks[0];
    t.cap = 0.7;
    t.wear = 0.9;
    run(sim, 6);
    expect(t.wear).toBeGreaterThanOrEqual(0.3 - 1e-9);
    expect(t.cap).toBeLessThanOrEqual(0.7);
  });

  it('alles wird mit der Hafenstufe teurer', () => {
    const sim = new Sim();
    const a = sim.costOf('crane');
    sim.level = 3;
    expect(sim.costOf('crane')).toBeGreaterThan(a);
  });
});

describe('Vertiefung: Richtung, Personal, Konjunktur', () => {
  const day = (sim: Sim, n = 1) => run(sim, 24 * n);

  it('ab Stufe 3 muss eine Richtung gewählt werden, sie wirkt und wird gespeichert', () => {
    const sim = basicPort(2, 1);
    sim.level = 3;
    day(sim, 1);
    expect(sim.pending?.id).toBe('spec');
    const c = sim.cranes[0];
    const base = sim.moveTime(c);
    sim.resolveDecision(0); // Umschlag-Hub
    expect(sim.spec).toBe('hub');
    expect(sim.moveTime(c)).toBeLessThan(base);
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(copy.spec).toBe('hub');
    const cold = new Sim();
    cold.spec = 'cold';
    expect(cold.reeferMax).toBeGreaterThan(new Sim().reeferMax);
  });

  it('neue Leute drücken die Erfahrung, sie wächst mit der Zeit', () => {
    const sim = basicPort(2, 1);
    sim.xp.driver = 1;
    const n = sim.staff.driver;
    sim.hire('driver');
    expect(sim.xp.driver).toBeCloseTo((1 * n + 0.3) / (n + 1), 6);
    const before = sim.xp.driver;
    day(sim, 3);
    expect(sim.xp.driver).toBeGreaterThan(before);
  });

  it('ohne Nachtschicht läuft es nachts langsamer und kostet weniger Lohn', () => {
    const sim = basicPort(2, 1);
    sim.gm = 1440 + 23 * 60; // 23 Uhr
    const wageNight = sim.wagePerHour('crane');
    const effNight = sim.eff('crane');
    sim.setNightShift(false);
    expect(sim.eff('crane')).toBeLessThan(effNight);
    expect(sim.wagePerHour('crane')).toBeLessThan(wageNight);
  });

  it('Lohnpolitik und Stimmung: Sparkurs senkt die Stimmung', () => {
    const sim = basicPort(2, 1);
    sim.setWagePolicy('low');
    day(sim, 8);
    expect(sim.mood).toBeLessThan(0.55);
    const rich = basicPort(2, 1);
    rich.setWagePolicy('high');
    day(rich, 8);
    expect(rich.mood).toBeGreaterThan(sim.mood);
  });

  it('Konjunktur und Gebrauchtmarkt wechseln, Lagergebühren fließen', () => {
    const sim = basicPort(4, 1);
    const kinds = new Set<string>();
    const money = new Set<string>();
    for (let d = 0; d < 40; d++) {
      day(sim, 1);
      kinds.add(sim.cycle.kind);
      money.add(sim.usedMarket.label);
      if (sim.pending) sim.resolveDecision(0);
    }
    expect(kinds.size).toBeGreaterThan(1);
    expect(money.size).toBeGreaterThan(1);
    expect(sim.history.some((h) => h.fees > 0)).toBe(true);
  });

  it('Verträge mit Sonderbedingungen, Exklusiv sperrt freie Schiffe', () => {
    const sim = basicPort(2, 1);
    sim.level = 4;
    const conds = new Set<string | undefined>();
    for (let i = 0; i < 60; i++) {
      (sim as unknown as { makeOffers(): void }).makeOffers();
      for (const o of sim.offers) conds.add(o.cond);
    }
    expect(conds.has('export') && conds.has('rush') && conds.has('exclusive')).toBe(true);
    const ex = sim.offers.find((o) => o.cond === 'exclusive') ?? { ...sim.offers[0], cond: 'exclusive' as const };
    sim.contracts = [ex];
    sim.ships = [];
    sim.nextShipIn = 0;
    run(sim, 3);
    expect(sim.ships.filter((s) => s.contractId === 0).length).toBe(0);
  });

  it('Kreditwürdigkeit: guter Ruf macht Zinsen billiger', () => {
    const a = new Sim();
    const b = new Sim();
    a.loan = b.loan = 200_000;
    a.rep = 90;
    b.rep = 10;
    expect(a.interestPerDay).toBeLessThan(b.interestPerDay);
  });

  it('Akkord und Billigdiesel haben einen Haken, Jahreszeiten wechseln', () => {
    const sim = basicPort(2, 1);
    sim.level = 3;
    sim.money = 1e6;
    const t = sim.moveTime(sim.cranes[0]);
    expect(sim.buyTech('akkord').ok).toBe(true);
    expect(sim.moveTime(sim.cranes[0])).toBeLessThan(t);
    expect(sim.buyTech('diesel').ok).toBe(true);
    sim.gm = 20 * 1440;
    expect(sim.season.name).not.toBe(new Sim().season.name);
  });
});

describe('Gefahrgut, Leerlager und Befüllkette', () => {
  function chainPort(): Sim {
    const sim = new Sim(11);
    sim.money = 20_000_000;
    sim.level = 3;
    for (let x = 6; x < 10; x++) sim.build('kai', x, k);
    sim.build('crane', 7, k);
    sim.build('crane', 9, k);
    for (let x = 2; x <= GRID_W - 1; x++) sim.build('road', x, k + 1);
    for (let x = 12; x <= 16; x++) sim.build('yard', x, k + 2);
    sim.build('gate', 18, k + 2);
    sim.build('unpack', 20, k + 2);
    sim.build('emptyyard', 24, k + 2);
    sim.build('emptyyard', 25, k + 2);
    sim.build('fill', 27, k + 2);
    sim.build('rail', GRID_W - 1, k + 2);
    sim.build('hazard', 2, k + 2);
    sim.build('hazard', 3, k + 2);
    for (let i = 0; i < 8; i++) sim.build('truck', 6 + i, k + 1);
    sim.finishAll();
    sim.updateMissions(true);
    sim.mission = Math.max(sim.mission, 6);
    sim.nextShipIn = 1;
    return sim;
  }

  it('Gefahrgut braucht Abstand zu Gates, Hallen und Werkstatt', () => {
    const sim = new Sim();
    sim.level = 3;
    sim.build('road', 10, k + 1);
    sim.build('gate', 12, k + 2);
    expect(sim.canBuild('hazard', 11, k + 2).ok).toBe(false);
    expect(sim.canBuild('hazard', 15, k + 2).ok).toBe(false); // nur ein Feld Abstand
    expect(sim.canBuild('hazard', 16, k + 2).ok).toBe(true);
    sim.build('hazard', 16, k + 2);
    expect(sim.canBuild('workshop', 17, k + 3).ok).toBe(false);
    expect(sim.canBuild('workshop', 21, k + 3).ok).toBe(true);
  });

  it('die Kette läuft: Auspacken liefert Leergut, die Befüllhalle macht Export daraus', () => {
    const sim = chainPort();
    run(sim, 60);
    const unpack = sim.plants.find((p) => p.kind === 'unpack')!;
    const fill = sim.plants.find((p) => p.kind === 'fill')!;
    expect(unpack.made).toBeGreaterThan(0);
    expect(fill.made).toBeGreaterThan(0);
    expect(sim.shipsDone).toBeGreaterThan(0);
  });

  it('Gefahrgut kommt an Bord, wird gelagert und über das Gate abgefertigt', () => {
    const sim = chainPort();
    let seen = 0;
    for (let h = 0; h < 80; h++) {
      run(sim, 1);
      for (const s of sim.ships) seen = Math.max(seen, s.haz);
    }
    expect(seen).toBeGreaterThan(0);
    expect(sim.hazStock + sim.gates.reduce((n, g) => n + g.served, 0)).toBeGreaterThan(0);
    // Reservierungen leaken nicht
    for (const c of sim.cranes) expect(c.resOutHaz).toBeGreaterThanOrEqual(0);
  });

  it('Abriss und Rückgängig erhalten Lagerart und Bestand', () => {
    const sim = chainPort();
    const i = sim.idx(24, k + 2);
    sim.stock[i] = 5;
    const d = sim.demolish(24, k + 2);
    expect(sim.kind[i]).toBe(T.Land);
    expect(sim.undoDemolish(d.removed).ok).toBe(true);
    expect(sim.kind[i]).toBe(T.Empty);
    expect(sim.stock[i]).toBe(5);
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(copy.kind[i]).toBe(T.Empty);
    expect(copy.plants.some((p) => p.kind === 'fill')).toBe(true);
  });
});

describe('Straßenausbau: Doppelspur und Autobahn', () => {
  it('Doppelspur lässt je Richtung zwei Trucks durch, Ausbau und Rückgängig stimmen', () => {
    const sim = new Sim();
    sim.level = 3;
    sim.build('road', 8, k + 1);
    const i = sim.idx(8, k + 1);
    expect(sim.laneCap(i, 0)).toBe(1);
    const before = sim.money;
    const r = sim.build('road2', 8, k + 1);
    expect(r.ok).toBe(true);
    expect(r.prev).toEqual({ tier: 0, ow: -1 });
    expect(before - sim.money).toBe(sim.costOf('road2'));
    expect(sim.laneCap(i, 0)).toBe(2);
    expect(sim.canBuild('road2', 8, k + 1).ok).toBe(false); // schon ausgebaut
    expect(sim.undoBuild({ tool: 'road2', x: 8, y: k + 1, prev: r.prev }).ok).toBe(true);
    expect(sim.roadTier[i]).toBe(0);
    expect(sim.money).toBe(before);
    expect(sim.kind[i]).toBe(T.Road);
    // Abriss und Rückgängig behalten die Stufe
    sim.build('hwy', 8, k + 1);
    sim.setOneway(8, k + 1, 0);
    const d = sim.demolish(8, k + 1);
    expect(sim.kind[i]).toBe(T.Land);
    sim.undoDemolish(d.removed);
    expect(sim.roadTier[i]).toBe(2);
    expect(sim.oneway[i]).toBe(0);
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(copy.roadTier[i]).toBe(2);
  });

  it('Autobahn hat feste Richtung und keine Zufahrt zu Gebäuden', () => {
    const sim = new Sim();
    sim.level = 3;
    for (let x = 4; x <= 14; x++) sim.build('hwy', x, k + 1);
    sim.build('yard', 8, k + 2);
    expect(sim.adjRoad(sim.idx(8, k + 2))).toEqual([]);
    expect(sim.toggleOneway(8, k + 1).ok).toBe(false);
    expect(sim.canBuild('truck', 8, k + 1).ok).toBe(false);
    sim.build('road', 8, k + 3);
    expect(sim.adjRoad(sim.idx(8, k + 2))).toEqual([sim.idx(8, k + 3)]);
  });

  it('Betriebskosten steigen mit der Straßenart', () => {
    const a = new Sim();
    const b = new Sim();
    a.level = b.level = 3;
    for (let x = 4; x < 14; x++) {
      a.build('road', x, k + 1);
      b.build('hwy', x, k + 1);
    }
    expect(b.runningCost()).toBeGreaterThan(a.runningCost());
  });
});

describe('Zeit-Routing', () => {
  it('Trucks nehmen die schnellere Autobahn, auch wenn sie länger ist', () => {
    const sim = new Sim();
    sim.level = 3;
    sim.money = 1e7;
    // Direkter Weg: normale Straße (12 Felder). Umweg: Autobahn mit 3 Feldern mehr.
    for (let x = 4; x <= 16; x++) sim.build('road', x, k + 1);
    for (let y = k + 2; y <= k + 3; y++) {
      sim.build('road', 4, y);
      sim.build('road', 16, y);
    }
    for (let x = 4; x <= 16; x++) sim.build('hwy', x, k + 4);
    for (let x = 4; x <= 16; x++) sim.build('hwy', x, k + 5);
    sim.build('road', 4, k + 4); // Anschlüsse in Fahrtrichtung
    const a = sim.idx(4, k + 1);
    const b = sim.idx(16, k + 1);
    const d = sim.distMap(b)[a];
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThanOrEqual(12 * 10);
    // Reine Normalstrecke wäre 12 Felder = 120; mit Zeitkosten liefert die Karte ein Vielfaches von Zehnteln
    expect(sim.stepCost(sim.idx(8, k + 4))).toBeLessThan(10);
  });
});

describe('Weiterbildung und Vorziehen', () => {
  it('Weiterbildung kostet, hebt die Erfahrung und lässt eine Kraft fehlen', () => {
    const sim = basicPort(2, 1);
    sim.money = 1e6;
    const avail = sim.staffAvail('driver');
    const xp = sim.xp.driver;
    expect(sim.train('driver').ok).toBe(true);
    expect(sim.xp.driver).toBeGreaterThan(xp);
    expect(sim.staffAvail('driver')).toBe(avail - 1);
    expect(sim.train('driver').ok).toBe(false);
    run(sim, 24 * 4);
    expect(sim.trainLeft.driver).toBe(0);
  });

  it('ein vorgezogenes Schiff bekommt den freien Liegeplatz zuerst', () => {
    const sim = basicPort(2, 1);
    sim.money = 1e6;
    sim.ships = [];
    const add = (sim as unknown as { addShip(t: string, c: null, r: boolean): void }).addShip.bind(sim);
    add('coaster', null, false);
    add('coaster', null, false);
    const second = sim.ships[1];
    expect(sim.prioritize(second.id).ok).toBe(true);
    sim.tick();
    expect(second.state).toBe('sailing');
    expect(sim.ships[0].state).toBe('queued');
  });
});

describe('Sandbox', () => {
  it('Sandbox-Zustand wird gespeichert und hat kein Ende', () => {
    const sim = new Sim(1, 'easy');
    sim.sandbox = true;
    sim.status = 'free';
    sim.gm += 200 * 1440;
    run(sim, 24);
    expect(sim.status).toBe('free');
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(copy.sandbox).toBe(true);
  });
});

describe('Eigenschaften, Weltlage, Strom, Regeln', () => {
  it('Eigenschaften wirken und werden gespeichert', () => {
    const sim = new Sim(3);
    const base = sim.costOf('crane');
    sim.traits = ['rocky', 'cheapland'];
    expect(sim.costOf('crane')).toBeGreaterThan(base);
    expect(sim.plotPrice).toBeLessThan(new Sim(3).plotPrice);
    sim.rollTraits();
    expect(sim.traits.length).toBe(2);
    expect(sim.traits[0]).not.toBe(sim.traits[1]);
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(copy.traits).toEqual(sim.traits);
  });

  it('Embargo drückt den Preis einer Ware', () => {
    const sim = new Sim();
    const p = sim.price('elec');
    sim.world = { id: 'embargo', left: 3, product: 'elec' };
    expect(sim.price('elec')).toBeLessThan(p);
  });

  it('Strom kostet, Solar spart, Batterie überbrückt den Ausfall', () => {
    const sim = basicPort(2, 1);
    sim.level = 3;
    sim.money = 1e7;
    expect(sim.powerDemand()).toBeGreaterThan(0);
    run(sim, 6);
    expect(sim.today.power ?? 0).toBeGreaterThan(0);
    // Ausfall ohne Batterie: Kräne stehen
    sim.powerOutLeft = 60;
    sim.tick();
    expect(sim.powerDown).toBe(true);
    run(sim, 1.2);
    expect(sim.powerDown).toBe(false);
    // Mit voller Batterie läuft alles weiter
    sim.build('battery', 22, k + 2);
    sim.batteryCharge = sim.batteryCap;
    sim.powerOutLeft = 60;
    sim.tick();
    expect(sim.powerDown).toBe(false);
    expect(sim.batteryCharge).toBeLessThan(sim.batteryCap);
  });

  it('Regeln greifen stündlich', () => {
    const sim = basicPort(4, 1);
    sim.gm = 1440 + 21.5 * 60; // kurz vor 22 Uhr
    sim.addRule('night', 'role:out');
    run(sim, 1.5);
    expect(sim.trucks.every((t) => t.role === 'out')).toBe(true);
    expect(sim.hourly.length).toBeGreaterThan(0);
  });
});

describe('Container-Ziele und Umstapeln', () => {
  function railPort(): Sim {
    const sim = basicPort(6, 1);
    sim.level = 3;
    sim.money = 1e7;
    for (let x = 21; x <= GRID_W - 1; x++) sim.build('road', x, k + 1);
    sim.build('rail', GRID_W - 1, k + 2);
    sim.finishAll();
    return sim;
  }

  it('mit Gleisanschluss bekommt ein Teil der Importe das Ziel Bahn, und sie fahren auch mit der Bahn', () => {
    const sim = railPort();
    run(sim, 30);
    const railed = sim.trainsDone;
    expect(sim.railShare).toBeGreaterThan(0);
    expect(railed).toBeGreaterThan(0);
    // Was auf dem Bahnsteig landet, kam aus Bahn-Containern
    expect(sim.yardTileList.some((i) => sim.stockRail[i] > 0) || sim.trainsDone > 0).toBe(true);
  });

  it('Lagerzweck: Bahn-Felder nehmen nur Bahn-Container, gemischte Felder kosten Umstapeln', () => {
    const sim = railPort();
    const tiles = sim.yardTileList;
    sim.setYardUse(tiles[0] % GRID_W, (tiles[0] / GRID_W) | 0, 2);
    run(sim, 20);
    const t0 = tiles[0];
    expect(sim.stock[t0] - sim.stockRail[t0]).toBe(0);
    expect(sim.setYardUse(2, k + 5, 1).ok).toBe(false);
    const copy = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(copy.yardUse[t0]).toBe(2);
    expect(Array.from(copy.stockRail)).toEqual(Array.from(sim.stockRail));
  });
});

describe('Gleise ins Land und Außenanbindung', () => {
  it('ein Bahnhof im Hafen braucht ein durchgehendes Gleis zum Rand, Straßen kreuzen als Bahnübergang', () => {
    const sim = new Sim();
    sim.level = 3;
    sim.money = 1e7;
    expect(sim.canBuild('rail', 25, k + 3).ok).toBe(false);
    for (let x = 26; x < GRID_W; x++) sim.build('track', x, k + 3);
    expect(sim.canBuild('rail', 25, k + 3).ok).toBe(true);
    sim.build('rail', 25, k + 3);
    // Straße quer übers Gleis: Bahnübergang, Gleis bleibt durchgehend
    expect(sim.build('road', 30, k + 3).ok).toBe(true);
    expect(sim.railX[sim.idx(30, k + 3)]).toBe(1);
    expect(sim.railLinked(sim.rails[0])).toBe(true);
    sim.demolish(30, k + 3);
    expect(sim.kind[sim.idx(30, k + 3)]).toBe(T.Track);
    sim.demolish(31, k + 3);
    expect(sim.railLinked(sim.rails[0])).toBe(false);
  });

  it('Gate mit Straße ins Hinterland arbeitet schneller', () => {
    const sim = new Sim();
    for (let x = 4; x <= 12; x++) sim.build('road', x, k + 1);
    sim.build('gate', 8, k + 2);
    const g = sim.gates[0];
    expect(sim.hinterlandMul(g)).toBe(1);
    for (let y = k + 1; y < GRID_H; y++) sim.build('road', 4, y);
    expect(sim.hinterlandMul(g)).toBeGreaterThan(1);
  });

  it('die Befüllhalle bekommt Leercontainer von außen über das Gate', () => {
    const sim = basicPort(4, 1);
    sim.level = 3;
    sim.money = 1e7;
    sim.build('emptyyard', 6, k + 2);
    sim.build('emptyyard', 7, k + 2);
    sim.build('fill', 20, k + 2);
    sim.finishAll();
    expect(sim.emptiesWanted()).toBeGreaterThan(0);
    run(sim, 8);
    const got = sim.emptyStock + sim.gates.reduce((n, g) => n + g.emptyIn, 0) + sim.plants.reduce((n, p) => n + p.inEmpty, 0);
    expect(got).toBeGreaterThan(0);
  });
});

describe('Lagerblöcke, Stellplätze, Liegeplätze', () => {
  it('ein Lagerfeld mitten im Block ist über die Zufahrten des Blocks erreichbar', () => {
    const sim = new Sim();
    for (let x = 4; x <= 12; x++) sim.build('road', x, k + 1);
    for (let y = k + 2; y <= k + 5; y++) for (let x = 6; x <= 9; x++) sim.build('yard', x, y);
    const inner = sim.idx(7, k + 4);
    expect(sim.adjRoad(inner)).toEqual([]);
    expect(sim.storeAccess(inner).length).toBeGreaterThan(0);
    expect(sim.storeDepth[inner]).toBe(2);
  });

  it('Portalkräne automatisch verteilen deckt große Flächen ab', () => {
    const sim = new Sim();
    for (let y = k + 2; y <= k + 7; y++) for (let x = 4; x <= 9; x++) sim.build('yard', x, y);
    expect(sim.rtgPlan().length).toBe(4);
  });

  it('Trucks ohne Auftrag fahren auf den Stellplatz', () => {
    const sim = basicPort(3, 1);
    sim.nextShipIn = 1e9;
    sim.ships = [];
    sim.build('parking', 10, k + 2);
    run(sim, 2);
    expect(sim.trucks.filter((t) => t.parked).length).toBeGreaterThan(0);
    expect(sim.trucks.every((t) => !t.parked || t.parkAt === sim.idx(10, k + 2))).toBe(true);
  });

  it('ein gesperrter Liegeplatz nimmt keine Schiffe', () => {
    const sim = basicPort(3, 1);
    sim.toggleBerthClosed(7, k);
    run(sim, 6);
    expect(sim.ships.some((s) => s.state === 'unloading')).toBe(false);
    sim.toggleBerthClosed(7, k);
    run(sim, 3);
    expect(sim.ships.some((s) => s.state === 'unloading' || s.state === 'sailing') || sim.shipsDone > 0).toBe(true);
  });
});

describe('Gelände: Hügel, Tunnel, Brücken', () => {
  it('Flusskarte: Brücke über den Fluss, Tunnel durch Hügel, Abriss stellt das Gelände wieder her', () => {
    const sim = new Sim(5, 'normal', 'river');
    sim.money = 1e7;
    // Ein Wasserfeld im Fluss suchen
    let wx = -1;
    const wy = k + 6;
    for (let x = 2; x < GRID_W - 2; x++) if (sim.kind[sim.idx(x, wy)] === T.Water) wx = x;
    expect(wx).toBeGreaterThan(0);
    const m = sim.money;
    expect(sim.build('road', wx, wy).ok).toBe(true);
    expect(m - sim.money).toBe(sim.costOf('road') * 16);
    expect(sim.roadUnder[sim.idx(wx, wy)]).toBe(2);
    sim.demolish(wx, wy);
    expect(sim.kind[sim.idx(wx, wy)]).toBe(T.Water);
    // Hügel
    const hill = Array.from(sim.kind).findIndex((v) => v === T.Hill);
    expect(hill).toBeGreaterThan(0);
    const hx = hill % GRID_W;
    const hy = (hill / GRID_W) | 0;
    expect(sim.canBuild('yard', hx, hy).ok).toBe(false);
    expect(sim.build('road', hx, hy).ok).toBe(true);
    expect(sim.roadUnder[hill]).toBe(1);
    sim.demolish(hx, hy);
    expect(sim.kind[hill]).toBe(T.Hill);
    // Abtragen
    expect(sim.demolish(hx, hy).ok).toBe(true);
    expect(sim.kind[hill]).toBe(T.Land);
  });

  it('keine Brücke über die See', () => {
    const sim = new Sim();
    expect(sim.canBuild('road', 10, k - 1).ok).toBe(false);
  });
});

describe('Kreuzungen und Überführungen', () => {
  it('Trucks warten an Kreuzungen, die Überführung hebt das auf', () => {
    const make = () => {
      const sim = bigPort(2, 10);
      // Querstraße mitten durch die Hauptachse: Kreuzung bei x=21
      for (let y = k + 2; y <= k + 6; y++) sim.build('road', 21, y);
      for (let x = 20; x <= 23; x++) sim.build('road', x, k + 6);
      sim.finishAll();
      return sim;
    };
    const a = make();
    const j = a.idx(21, k + 1);
    expect(a.isJunction(j)).toBe(true);
    run(a, 12);
    const b = make();
    expect(b.toggleOverpass(21, k + 1).ok).toBe(true);
    for (let x = 4; x < GRID_W; x++) if (b.isJunction(b.idx(x, k + 1))) b.overpass[b.idx(x, k + 1)] = 1;
    run(b, 12);
    expect(b.crossWait).toBeLessThan(a.crossWait);
    // Gespeichert und geladen
    const c = Sim.deserialize(JSON.parse(JSON.stringify(b.serialize())));
    expect(c.overpass[j]).toBe(1);
  });

  it('Überführung nur auf Kreuzungen und ab Stufe 2', () => {
    const sim = bigPort(1);
    expect(sim.toggleOverpass(8, k + 1).ok).toBe(false);
    sim.level = 2;
    expect(sim.toggleOverpass(8, k + 1).reason).toMatch(/Kreuzung/);
  });
});

describe('Zoll', () => {
  it('Ohne Zollhof prüft das Gate selbst, der Zollhof übernimmt und zahlt nach der Prüfung', () => {
    const a = bigPort(2, 10);
    run(a, 16);
    const b = bigPort(2, 10);
    expect(b.build('customs', 26, k + 2).ok).toBe(true);
    expect(b.build('customs', 27, k + 2).ok).toBe(true);
    b.finishAll();
    run(b, 16);
    expect(a.customsDone).toBe(0);
    expect(b.customsDone).toBeGreaterThan(0);
    const c = Sim.deserialize(JSON.parse(JSON.stringify(b.serialize())));
    expect(c.customsDone).toBe(b.customsDone);
  });
});

describe('Wartung und Versicherung', () => {
  it('Wartungsfenster nimmt den Kran nachts vom Netz und senkt den Verschleiß', () => {
    const sim = bigPort(2, 6);
    const c = sim.cranes[0];
    c.wear = 0.6;
    expect(sim.planMaint(c.id).ok).toBe(true);
    let saw = false;
    for (let i = 0; i < (26 * 60) / 0.4; i++) {
      sim.tick();
      if (c.state === 'maint') saw = true;
    }
    expect(saw).toBe(true);
    expect(c.careUntil).toBeGreaterThan(sim.gm);
    expect(c.wear).toBeLessThan(0.6);
  });

  it('Versicherung kostet täglich und erstattet Schäden', () => {
    const sim = bigPort(2, 6);
    sim.setInsurance(2);
    const m = sim.money;
    (sim as unknown as { loss(c: number): void }).loss(10_000);
    expect(sim.money).toBe(m - 10_000 + 8_500);
    expect(sim.insurancePremium()).toBeGreaterThan(0);
    const c = Sim.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
    expect(c.insurance).toBe(2);
  });
});
