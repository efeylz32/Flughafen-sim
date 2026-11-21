import { GRID_W, LEVELS, T } from './data';
import { OUT, Q_MAX, qOf, qTile, sideOf } from './quay';
import { MILESTONES } from './progression';
import type { Sim } from './sim';

const need = (level: number) => LEVELS[level - 1].need.toLocaleString('de-DE');
const reach = (level: number): Mission => ({
  title: `Werde ${LEVELS[level - 1].name}`,
  text: `Schlage insgesamt ${need(level)} Container um${MILESTONES[level] ? ` und schaffe den Meilenstein: ${MILESTONES[level]!.text}` : ''}. Tippe auf die Stufe oben, um den Fortschritt zu sehen.`,
  done: (s) => s.level >= level,
});

export interface Mission {
  title: string;
  text: string;
  done(sim: Sim): boolean;
}

function craneAccess(sim: Sim): number[] {
  const out: number[] = [];
  for (const c of sim.cranes) out.push(...sim.craneAccess(c));
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
    done: (s) => s.cranes.some((c) => s.berthContaining(s.cq(c)) >= 0),
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
  reach(2),
  {
    title: 'Baue eine Werkstatt',
    text: 'Ab jetzt nutzen sich Kräne und Trucks ab und fallen irgendwann aus. Eine Werkstatt (2 × 2, Gebäude) mit Mechaniker repariert sie.',
    done: (s) => s.shops.length > 0,
  },
  {
    title: 'Gib Trucks feste Aufgaben',
    text: 'Unter Geräte: „Aufgaben“ wählen, eine Aufgabe antippen und einen Rahmen über Trucks ziehen. Feste Aufgaben fahren schneller als die Automatik.',
    done: (s) => s.trucks.filter((t) => t.role !== 'auto').length >= 3,
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
    title: 'Stelle 10 Container Fertigware her',
    text: 'Baue eine Packhalle (3 × 2) und eine Veredelung (3 × 3) an die Straße. Fertigware bringt 900 € statt 200 €.',
    done: (s) => s.premiumDone >= 10,
  },
  {
    title: 'Kaufe ein Stück Land',
    text: 'Unter Gelände: „Land kaufen“ und auf einen dunklen Streifen tippen. Jeder weitere Streifen wird teurer.',
    done: (s) => s.plotsBought >= 1,
  },
  reach(3),
  {
    title: 'Schicke einen Zug mit Containern los',
    text: 'Baue einen Bahnhof (Wege), verbinde sein Gleis mit Gleisen bis zu einem Kartenrand und leg eine Straße daneben.',
    done: (s) => s.trainsDone >= 1,
  },
  reach(4),
  {
    title: 'Schlage 20 Kühlcontainer um',
    text: 'Baue mindestens 2 Kühlplätze an die Straße. Dann bringen Schiffe Kühlfracht, die in 10 Stunden raus muss.',
    done: (s) => s.reefersHandled >= 20,
  },
  {
    title: 'Fertige ein großes Schiff ab',
    text: 'Baue 6 Kai-Felder in einer Reihe und baggere das Wasser davor aus. Nimm dann einen Vertrag mit großem Schiff an.',
    done: (s) => s.bigShipsDone >= 1,
  },
  reach(5),
  {
    title: 'Baue einen Zollhof',
    text: 'Ohne Zollhof prüft das Gate jeden achten Import-Container selbst und wird langsam.',
    done: (s) => s.customsTiles > 0,
  },
  reach(6),
  {
    title: 'Rüste einen Truck zum fahrerlosen Fahrzeug auf',
    text: 'Tippe einen Truck an und rüste ihn auf. Er fährt schneller und kostet weniger im Betrieb.',
    done: (s) => s.trucks.some((t) => t.agv),
  },
  {
    title: 'Fertige einen Mega-Frachter ab',
    text: '8 Kai-Felder in einer Reihe, davor ausgebaggert, und ein Vertrag mit Mega-Frachter.',
    done: (s) => s.megaDone >= 1,
  },
  reach(7),
];

/** Was der „Los“-Knopf der Mission öffnet: ein Werkzeug oder ein Fenster */
export const MISSION_GO: (string | null)[] = [
  'berth', 'crane', 'road', 'yard', 'gate', 'truck', 'show:ship', 'show:ship', null, 'workshop', 'assign', null, 'deals', 'show:crane', 'unpack', 'buyland',
  null, 'rail', null, 'reefer', 'dredge', null, 'customs', null, 'show:truck', 'deals', null,
];

/**
 * Wo die ersten Missionen gebaut werden sollen: Felder, die auf der Karte leuchten.
 * Nur für den Einstieg (Liegeplatz bis erster Truck), danach leer.
 */
export function missionHint(s: Sim): number[] {
  const out: number[] = [];
  const free = (i: number) => s.kind[i] === T.Land && s.owned[i % GRID_W] === 1;
  switch (s.mission) {
    case 0: {
      // Vier freie Küstenfelder nebeneinander, möglichst mitten im eigenen Land
      const owned = s.owned.reduce((a, v, x) => (v ? [...a, x] : a), [] as number[]);
      const mid = owned.length ? (owned[0] + owned[owned.length - 1]) / 2 - 1.5 : GRID_W / 2;
      let best: number[] = [];
      let bestD = Infinity;
      for (let q = 0; q < Q_MAX - 3; q++) {
        const ts = [0, 1, 2, 3].map((d) => qTile(q + d));
        if (ts.some((t) => !t)) continue;
        if (!ts.every((t) => free(s.idx(t![0], t![1])) && s.kaiSpot(t![0], t![1]))) continue;
        const d = Math.abs(ts[0]![0] - mid) + Math.abs(ts[0]![1] - ts[3]![1]) * 0;
        if (d < bestD) {
          bestD = d;
          best = ts.map((t) => s.idx(t![0], t![1]));
        }
      }
      out.push(...best);
      break;
    }
    case 1: {
      // Kai-Felder an einem Liegeplatz
      for (let i = 0; i < s.kind.length && out.length < 4; i++) {
        if (s.kind[i] !== T.Kai) continue;
        const x = i % GRID_W;
        const y = (i / GRID_W) | 0;
        if (!s.craneAt(x, y) && s.berthContaining(qOf(x, y)) >= 0) out.push(i);
      }
      break;
    }
    case 2: {
      // Das Feld direkt landeinwärts hinter dem Kran
      for (const c of s.cranes) {
        const q = s.cq(c);
        if (q < 0) continue;
        const [dx, dy] = OUT[sideOf(q)];
        const x = c.x - dx;
        const y = c.y - dy;
        if (s.inBounds(x, y) && free(s.idx(x, y))) out.push(s.idx(x, y));
      }
      break;
    }
    case 3:
    case 4: {
      // Freie Felder direkt an einer Straße, die mit einem Kran verbunden ist
      for (let i = 0; i < s.kind.length && out.length < (s.mission === 3 ? 6 : 2); i++) {
        if (!free(i)) continue;
        if (s.adjRoad(i).length) out.push(i);
      }
      break;
    }
    case 5: {
      for (let i = 0; i < s.kind.length && out.length < 3; i++) if (s.kind[i] === T.Road && s.roadTier[i] !== 2) out.push(i);
      break;
    }
  }
  return out;
}
