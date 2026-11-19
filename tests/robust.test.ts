import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { Bot } from './bot';

function grown(days: number): Sim {
  const s = new Sim(42, 'normal', 'coast');
  s.limitLand();
  const bot = new Bot(s);
  bot.start();
  s.mission = Math.max(s.mission, 6);
  for (let h = 0; h < days * 24; h++) {
    for (let i = 0; i < 150; i++) s.tick();
    s.drainEvents();
    bot.hour();
  }
  return s;
}

describe('Speichern und Laden', () => {
  it('Ein geladener Spielstand läuft genauso weiter wie das Original', () => {
    const a = grown(12);
    const b = Sim.deserialize(JSON.parse(JSON.stringify(a.serialize())));
    const pick = (s: Sim) => ({
      money: Math.round(s.money),
      handled: s.handled,
      ships: s.ships.map((x) => `${x.id}:${x.state}:${x.containers}:${x.exportLeft}`).join(),
      cranes: s.cranes.map((c) => `${c.id}:${c.buffer}:${c.expBuf}`).join(),
      gates: s.gates.map((g) => `${g.id}:${g.apron.length}:${g.inApron}`).join(),
      weather: s.weather,
      level: s.level,
    });
    expect(a.ships.length).toBeGreaterThan(0);
    expect(pick(b)).toEqual(pick(a));
    for (let i = 0; i < 6 * 150; i++) {
      a.tick();
      b.tick();
    }
    // Danach laufen beide weiter, nur die Truckfahrten wurden neu verteilt
    expect(b.handled).toBeGreaterThan(pick(a).handled * 0.9);
    expect(Math.abs(b.handled - a.handled)).toBeLessThan(Math.max(30, a.handled * 0.02));
    expect(b.ships.length).toBeGreaterThan(0);
  }, 120_000);
});
