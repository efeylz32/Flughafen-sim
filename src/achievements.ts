import { LEVELS } from './sim/data';
import type { Sim } from './sim/sim';

/** Erfolge gelten pro Browser über alle Spiele hinweg. */
export interface Achievement {
  id: string;
  name: string;
  text: string;
  done(s: Sim): boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'ship1', name: 'Leinen los', text: 'Das erste Schiff abgefertigt', done: (s) => s.shipsDone >= 1 },
  { id: 'ship100', name: 'Hochbetrieb', text: '100 Schiffe in einem Spiel abgefertigt', done: (s) => s.shipsDone >= 100 },
  { id: 'lvl3', name: LEVELS[2].name, text: 'Stufe 3 erreicht', done: (s) => s.level >= 3 },
  { id: 'lvl5', name: LEVELS[4].name, text: 'Die höchste Stufe erreicht', done: (s) => s.level >= 5 },
  { id: 'day1000', name: 'Tausender', text: '1.000 Container an einem Tag umgeschlagen', done: (s) => s.today.handled >= 1000 },
  { id: 'prem100', name: 'Veredler', text: '100 Container Fertigware verkauft', done: (s) => s.premiumDone >= 100 },
  { id: 'food100', name: 'Kühlkette', text: '100 Container Lebensmittel verkauft', done: (s) => s.foodDone >= 100 },
  { id: 'train10', name: 'Auf der Schiene', text: '10 Züge beladen losgeschickt', done: (s) => s.trainsDone >= 10 },
  { id: 'big5', name: 'Tiefgang', text: '5 große Schiffe abgefertigt', done: (s) => s.bigShipsDone >= 5 },
  { id: 'agv10', name: 'Ohne Fahrer', text: '10 fahrerlose Fahrzeuge gleichzeitig', done: (s) => s.trucks.filter((t) => t.agv).length >= 10 },
  { id: 'rtg3', name: 'Stapelmeister', text: '3 Portalkräne gleichzeitig', done: (s) => s.rtgs.length >= 3 },
  { id: 'zones3', name: 'Ordnung muss sein', text: '3 verschiedene Zonen gleichzeitig genutzt', done: (s) => new Set(s.cranes.map((c) => c.zone).filter(Boolean)).size >= 3 },
  { id: 'contract10', name: 'Verlässlicher Partner', text: '10 Verträge vollständig erfüllt', done: (s) => s.contractsDone >= 10 },
  { id: 'million', name: 'Millionär', text: 'Eine Million Euro auf dem Konto', done: (s) => s.money >= 1_000_000 },
  { id: 'rep90', name: 'Bester Ruf', text: 'Ruf von 90 erreicht', done: (s) => s.rep >= 90 },
  { id: 'win_easy', name: 'Sieg: Leicht', text: 'Auf Leicht gewonnen', done: (s) => s.status === 'won' && !s.scenario && s.diff === 'easy' },
  { id: 'win_normal', name: 'Sieg: Normal', text: 'Auf Normal gewonnen', done: (s) => s.status === 'won' && !s.scenario && s.diff === 'normal' },
  { id: 'win_hard', name: 'Sieg: Schwer', text: 'Auf Schwer gewonnen', done: (s) => s.status === 'won' && !s.scenario && s.diff === 'hard' },
  { id: 'scen_all', name: 'Krisenmanager', text: 'Ein Szenario geschafft', done: (s) => s.status === 'won' && !!s.scenario },
];

const KEY_A = 'hafen-imperium-erfolge';
const KEY_B = 'hafen-imperium-bestenliste';

export interface Record {
  title: string;
  day: number;
  handled: number;
  money: number;
  date: string;
}

function read<V>(key: string, fallback: V): V {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as V) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ohne Speicher gehen Erfolge nach dem Neuladen verloren */
  }
}

export class Progress {
  unlocked: { [id: string]: string } = read(KEY_A, {});
  records: Record[] = read(KEY_B, []);

  /** Prüft alle Erfolge und liefert die neu freigeschalteten. */
  check(s: Sim): Achievement[] {
    const fresh = ACHIEVEMENTS.filter((a) => !this.unlocked[a.id] && a.done(s));
    if (!fresh.length) return [];
    const date = new Date().toISOString().slice(0, 10);
    for (const a of fresh) this.unlocked[a.id] = date;
    write(KEY_A, this.unlocked);
    return fresh;
  }

  /** Trägt einen Sieg in die Bestenliste ein (nach Tagen, dann Containern). */
  addRecord(r: Record) {
    this.records.push(r);
    this.records.sort((a, b) => a.day - b.day || b.handled - a.handled);
    this.records = this.records.slice(0, 30);
    write(KEY_B, this.records);
  }
}
