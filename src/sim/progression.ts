import { LAWS, LEVELS, MAP_SIZES, MAX_LEVEL, PROJECT_IDS, TECH, TECH_IDS } from './data';
import type { Sim } from './sim';

/**
 * Fortschritt ohne Sieg: Jede Hafenstufe braucht genug umgeschlagene Container und ab Stufe 3 einen Meilenstein.
 * Das Spiel endet erst mit der Vollendung, wenn alles ausgebaut ist. Danach geht es frei weiter.
 */

export interface Milestone {
  /** Kurzer Text für die Anzeige, z. B. „3 Verträge erfüllt“ */
  text: string;
  /** Aktueller Stand und Ziel, für einen Fortschrittsbalken */
  value(s: Sim): number;
  goal: number;
}

/** Meilenstein für das Erreichen einer Stufe. Index = Zielstufe (Stufe 3 braucht MILESTONES[3]). */
export const MILESTONES: (Milestone | null)[] = [
  null,
  null,
  null,
  { text: '5 Schiffe pünktlich abgefertigt', value: (s) => s.shipsOnTime, goal: 5 },
  { text: '3 Verträge vollständig erfüllt', value: (s) => s.contractsDone, goal: 3 },
  { text: '2 große Schiffe abgefertigt', value: (s) => s.bigShipsDone, goal: 2 },
  { text: '200 Kühlcontainer umgeschlagen', value: (s) => s.reefersHandled, goal: 200 },
  { text: '1 Mega-Frachter abgefertigt', value: (s) => s.megaDone, goal: 1 },
  { text: '40 Züge beladen losgeschickt', value: (s) => s.trainsDone, goal: 40 },
  { text: '20 Lieferaufträge erfüllt', value: (s) => s.ordersDone, goal: 20 },
  { text: '10 Kräne im Hafen', value: (s) => s.cranes.length, goal: 10 },
  { text: '10 Mega-Frachter abgefertigt', value: (s) => s.megaDone, goal: 10 },
  { text: 'Ruf von 90', value: (s) => Math.round(s.rep), goal: 90 },
];

/** Ist der Meilenstein für die nächste Stufe geschafft (oder gibt es keinen)? */
export function milestoneDone(s: Sim, target = s.level + 1): boolean {
  const m = MILESTONES[target];
  return !m || m.value(s) >= m.goal;
}

export interface CompletionItem {
  label: string;
  value: number;
  goal: number;
}

/** Wie viele Super-Brücken für die Vollendung nötig sind */
export const COMPLETE_SUPER = 8;

/** Die Vollendung: alles ausgebaut. Jeder Punkt mit Stand und Ziel. */
export function completion(s: Sim): { items: CompletionItem[]; share: number; done: boolean } {
  // Akkord und Billigdiesel sind Tauschgeschäfte mit Nachteilen: die zählen nicht
  const ids = TECH_IDS.filter((id) => id !== 'akkord' && id !== 'diesel');
  const techMax = ids.reduce((n, id) => n + TECH[id].cost.length, 0);
  const techNow = ids.reduce((n, id) => n + Math.min(s.tech[id], TECH[id].cost.length), 0);
  const plots = s.owned.length;
  const owned = s.owned.reduce((n, v) => n + (v ? 1 : 0), 0);
  const items: CompletionItem[] = [
    { label: `Hafenstufe ${MAX_LEVEL}: ${LEVELS[MAX_LEVEL - 1].name}`, value: s.level, goal: MAX_LEVEL },
    { label: 'Alle Verbesserungen auf der höchsten Stufe (ohne Akkord und Billigdiesel)', value: techNow, goal: techMax },
    { label: `Größte Karte (${MAP_SIZES[LAWS.length].join(' × ')} Felder, beide Gesetze)`, value: s.size, goal: LAWS.length },
    { label: 'Alle Großprojekte gebaut', value: s.projects.length, goal: PROJECT_IDS.length },
    { label: 'Das ganze Land der größten Karte gekauft', value: s.size === LAWS.length ? owned : 0, goal: s.size === LAWS.length ? plots : MAP_SIZES[LAWS.length][0] },
    { label: `${COMPLETE_SUPER} Super-Brücken`, value: s.cranes.filter((c) => c.model === 'super').length, goal: COMPLETE_SUPER },
    { label: 'Mindestens 4 Hallen, alle auf Stufe 3', value: s.plants.filter((p) => (p.lvl ?? 1) >= 3).length, goal: Math.max(4, s.plants.length) },
    { label: '100 Mega-Frachter abgefertigt', value: s.megaDone, goal: 100 },
  ];
  for (const it of items) it.value = Math.max(0, Math.min(it.goal, it.value));
  const share = items.reduce((n, it) => n + it.value / it.goal, 0) / items.length;
  return { items, share, done: items.every((it) => it.value >= it.goal) };
}
