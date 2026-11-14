import { LEVELS } from './data';
import type { Sim } from './sim';

const need = (level: number) => LEVELS[level - 1].need.toLocaleString('de-DE');

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
    done: (s) => connectedTo(s, s.gates.flatMap((g) => s.footprintOf(g))),
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
  {
    title: 'Werde Regionalhafen',
    text: `Schlage insgesamt ${need(2)} Container um. Der Balken neben der Uhr zeigt den Fortschritt.`,
    done: (s) => s.level >= 2,
  },
  {
    title: 'Belade Schiffe mit 30 Export-Containern',
    text: 'Export kommt von selbst über das Gate. Deine Trucks bringen ihn zum Kran, solange Platz und Zeit ist.',
    done: (s) => s.exportsLoaded >= 30,
  },
  {
    title: 'Schließe einen Vertrag ab',
    text: 'Öffne die Verträge (Handschlag-Knopf) und nimm ein Angebot an. Pünktliche Anläufe bringen Bonus.',
    done: (s) => s.contracts.length > 0 || s.contractsDone > 0,
  },
  {
    title: 'Rüste einen Kran zur Containerbrücke auf',
    text: 'Wähle „Ansehen“, tippe einen Kran an und rüste ihn auf. Er arbeitet doppelt so schnell.',
    done: (s) => s.cranes.some((c) => c.big),
  },
  {
    title: 'Werde Handelshafen',
    text: `Schlage insgesamt ${need(3)} Container um.`,
    done: (s) => s.level >= 3,
  },
  {
    title: 'Schlage 20 Kühlcontainer um',
    text: 'Baue mindestens 2 Kühlplätze an die Straße. Dann bringen Schiffe Kühlfracht, die in 10 Stunden raus muss.',
    done: (s) => s.reefersHandled >= 20,
  },
  {
    title: 'Schicke einen Zug mit Containern los',
    text: 'Baue einen Gleisanschluss am rechten Kartenrand und verbinde ihn mit einer Straße.',
    done: (s) => s.trainsDone >= 1,
  },
  {
    title: 'Fertige ein großes Schiff ab',
    text: 'Baue 6 Kai-Felder in einer Reihe und baggere das Wasser davor aus. Große Schiffe bringen 300 Container.',
    done: (s) => s.bigShipsDone >= 1,
  },
  {
    title: 'Werde Seehafen',
    text: `Schlage insgesamt ${need(4)} Container um.`,
    done: (s) => s.level >= 4,
  },
  {
    title: 'Rüste einen Truck zum fahrerlosen Fahrzeug auf',
    text: 'Tippe einen Truck an und rüste ihn auf. Er fährt schneller und kostet weniger im Betrieb.',
    done: (s) => s.trucks.some((t) => t.agv),
  },
  {
    title: 'Werde Weltklasse-Hafen',
    text: `Schlage insgesamt ${need(5)} Container um.`,
    done: (s) => s.level >= 5,
  },
];
