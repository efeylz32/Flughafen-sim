import type { Sim } from './sim';

export interface Mission {
  title: string;
  text: string;
  done(sim: Sim): boolean;
}

function craneAccess(sim: Sim): number[] {
  const out: number[] = [];
  for (const c of sim.cranes) out.push(...sim.adjRoad(sim.idx(c.x, c.y)));
  return out;
}

function connectedTo(sim: Sim, tiles: readonly number[]): boolean {
  const acc = craneAccess(sim);
  for (const t of tiles) {
    for (const r of sim.adjRoad(t)) {
      const d = sim.distMap(r);
      if (acc.some((a) => d[a] >= 0)) return true;
    }
  }
  return false;
}

export const MISSIONS: Mission[] = [
  {
    title: 'Baue einen Liegeplatz',
    text: 'Setze 4 Kai-Felder in einer Reihe direkt ans Wasser.',
    done: (s) => s.hasBerth(),
  },
  {
    title: 'Setze einen Kran',
    text: 'Wähle den Kran und tippe auf ein Kai-Feld.',
    done: (s) => s.cranes.some((c) => s.berthContaining(c.x) >= 0),
  },
  {
    title: 'Lege eine Straße zum Kran',
    text: 'Zieh eine Straße landeinwärts, direkt unter dem Kran.',
    done: (s) => craneAccess(s).length > 0,
  },
  {
    title: 'Baue einen Stapelplatz',
    text: 'Setze Stapelplatz-Felder direkt neben die Straße.',
    done: (s) => connectedTo(s, s.yardTileList),
  },
  {
    title: 'Baue ein Gate',
    text: 'Das Gate muss ebenfalls an der Straße liegen.',
    done: (s) => connectedTo(s, s.gates.map((g) => s.idx(g.x, g.y))),
  },
  {
    title: 'Kaufe einen Truck',
    text: 'Trucks fahren Container vom Kran zum Stapelplatz und weiter zum Gate. Tippe auf die Straße.',
    done: (s) => s.trucks.length >= 1,
  },
  {
    title: 'Fertige dein erstes Schiff ab',
    text: 'Jetzt kommen Schiffe. Tippe eines an: Es sagt dir, was ihm fehlt.',
    done: (s) => s.shipsDone >= 1,
  },
  {
    title: 'Fertige 5 Schiffe pünktlich ab',
    text: 'Unter 8 Stunden am Kai. Staut es, schau in den Engpass-Überblick.',
    done: (s) => s.shipsOnTime >= 5,
  },
];
