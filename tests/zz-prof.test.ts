import { it } from 'vitest';
import { setGridSize } from '../src/sim/data';
import { Sim } from '../src/sim/sim';
import { GrowBot } from './growbot';
it('prof', () => {
  setGridSize(0);
  const s = new Sim(3, 'normal', 'river');
  s.limitLand(); s.money = 30_000_000; s.level = 6;
  const bot = new GrowBot(s);
  const t0 = performance.now();
  let maxH = 0; let ticks = 0;
  for (let h = 0; h < 24 * 8; h++) {
    for (let i = 0; i < 150; i++) { bot.s.tick(); ticks++; maxH = Math.max(maxH, bot.s.haulers.length); }
    bot.s.drainEvents(); bot.hour();
  }
  const t1 = performance.now();
  throw new Error(`ms ${Math.round(t1 - t0)} ticks ${ticks} maxHaulers ${maxH} gates ${bot.s.gates.length} exits ${bot.s.hinterlandExits().length} trucks ${bot.s.trucks.length}`);
});
