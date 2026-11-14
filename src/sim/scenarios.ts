import type { Sim } from './sim';

/** Feste Startsituationen mit eigenem Ziel. Der Aufbau passiert in `setupScenario` (scenario-setup.ts). */
export interface Scenario {
  id: string;
  name: string;
  text: string;
  /** Kurze Zielbeschreibung, auch für die Meldung bei Niederlage */
  goal: string;
  /** Bis zu diesem Tag (einschließlich) muss das Ziel erreicht sein */
  days: number;
  done(sim: Sim): boolean;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'marode',
    name: 'Marode übernommen',
    text: 'Du übernimmst einen heruntergewirtschafteten Hafen: 500.000 € Kredit, abgenutzte Geräte, schlechter Ruf.',
    goal: 'Kredit vollständig tilgen und Ruf auf 60 bringen',
    days: 20,
    done: (s) => s.loan === 0 && s.rep >= 60,
  },
  {
    id: 'insel',
    name: 'Insel-Express',
    text: 'Eine kleine Insel ohne Bahn, aber mit vielen Schiffen. Startgeld 300.000 €.',
    goal: 'An einem einzigen Tag 600 Container umschlagen',
    days: 15,
    done: (s) => s.today.handled >= 600 || s.history.some((h) => h.handled >= 600),
  },
  {
    id: 'kuehl',
    name: 'Kühlkette',
    text: 'Ein Handelshafen spezialisiert sich auf Kühlfracht. Kühlplätze und Kühlhalle sind schon geplant, das Geld reicht für den Ausbau.',
    goal: '150 Container Lebensmittel verkaufen',
    days: 20,
    done: (s) => s.foodDone >= 150,
  },
];
