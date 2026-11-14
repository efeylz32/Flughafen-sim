import { describe, expect, it } from 'vitest';
import { COAST_ROW, TICKS_PER_SEC } from '../src/sim/data';
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
  });

  it('Erhalt der Container: nichts geht verloren oder entsteht neu', () => {
    const sim = basicPort(3, 1);
    run(sim, 9);
    const onShips = sim.ships.reduce((n, s) => n + s.containers, 0);
    const onCranes = sim.cranes.reduce((n, c) => n + c.buffer, 0);
    const onTrucks = sim.trucks.reduce((n, t) => n + t.load, 0);
    const onGates = sim.gates.reduce((n, g) => n + g.apron + (g.proc > 0 ? 1 : 0), 0);
    const total = sim.ships.length ? 120 * (sim.shipsDone + sim.ships.length) : 120 * sim.shipsDone;
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
});

it('Takt: 10 Ticks pro Sekunde', () => {
  expect(TICKS_PER_SEC).toBe(10);
});
