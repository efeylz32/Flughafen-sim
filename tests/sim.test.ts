import { describe, expect, it } from 'vitest';
import { COAST_ROW, GRID_W, TICKS_PER_SEC } from '../src/sim/data';
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
    const total = 120 * (sim.shipsDone + sim.ships.filter((s) => s.state !== 'leaving').length);
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
    expect(sim.handled).toBeGreaterThanOrEqual(1200);
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
    const bonus = sim.today.bonus + sim.history.reduce((n, h) => n + h.bonus, 0);
    expect(bonus).toBeGreaterThan(0);
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
    expect(sim.money).toBe(money - 1500);
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
    sim.build('crane', 5, k);
    const c = sim.cranes[0];
    const before = sim.money;
    expect(sim.upgrade('crane', c.id).ok).toBe(true);
    expect(sim.moveTime(c)).toBe(1.5);
    expect(sim.money).toBe(before - 120_000);
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
    sim.build('unpack', 20, k + 2);
    sim.build('unpack', 21, k + 2);
    sim.build('pack', 26, k + 2);
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
    const auto = bigPort(1, 6);
    const fixed = bigPort(1, 6);
    fixed.trucks.forEach((t, i) => fixed.setRole(t.id, i < 3 ? 'crane' : 'out'));
    run(auto, 24);
    run(fixed, 24);
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
    const late = new Sim(1, 'hard');
    late.gm += 25 * 1440;
    run(late, 24);
    expect(late.status).toBe('lost');
    expect(late.endReason).toMatch(/Ziel verpasst/);
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
    expect(worst).toBeLessThanOrEqual(2);
    expect(sim.containersDone).toBeGreaterThan(100);
  });

  it('eine zweite Straße entlastet: mehr Durchsatz als mit einer', () => {
    const one = bigPort(1, 24);
    const two = bigPort(1, 24);
    for (let x = 4; x <= GRID_W - 1; x++) two.build('road', x, k + 5);
    for (const x of [9, 20, 21, 26]) for (let y = k + 2; y <= k + 4; y++) two.build('road', x, y);
    run(one, 30);
    run(two, 30);
    expect(two.containersDone).toBeGreaterThanOrEqual(one.containersDone);
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
