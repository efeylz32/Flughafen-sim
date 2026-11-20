import type { Sim, SaveData } from './sim/sim';

/** Spielstände: drei Speicherplätze und ein Autosave. Alles liegt nur in diesem Browser. */
export type Slot = 'auto' | '1' | '2' | '3';
export const SLOTS: Slot[] = ['1', '2', '3'];
const KEY = (s: Slot) => `hafen-imperium-slot-${s}`;
const LEGACY = 'hafen-imperium-save-v1';
const SETTINGS = 'hafen-imperium-settings';

export interface Meta {
  /** Zeitpunkt des Speicherns */
  t: number;
  day: number;
  level: number;
  levelName: string;
  money: number;
  diff: string;
  map: string;
  scenario: string | null;
  status: string;
}

interface Stored {
  meta: Meta;
  data: SaveData;
}

function read(slot: Slot): Stored | null {
  try {
    const raw = localStorage.getItem(KEY(slot));
    if (raw) {
      const s = JSON.parse(raw) as Stored;
      if (s?.data && s?.meta) return s;
    }
    // Alter Spielstand aus früheren Versionen zählt als Autosave
    if (slot === 'auto') {
      const old = localStorage.getItem(LEGACY);
      if (old) {
        const data = JSON.parse(old) as SaveData;
        return { data, meta: { t: 0, day: Math.floor(data.gm / 1440) + 1, level: data.level ?? 1, levelName: `Stufe ${data.level ?? 1}`, money: data.money, diff: data.diff ?? 'normal', map: data.map ?? 'coast', scenario: data.scenario ?? null, status: data.status ?? 'play' } };
      }
    }
  } catch {
    /* kaputter Eintrag zählt als leer */
  }
  return null;
}

export function metaOf(sim: Sim): Meta {
  return { t: Date.now(), day: sim.day, level: sim.level, levelName: sim.levelName, money: Math.round(sim.money), diff: sim.sandbox ? 'Sandbox' : sim.diff, map: sim.map, scenario: sim.scenario, status: sim.status };
}

export function writeSlot(slot: Slot, sim: Sim): boolean {
  try {
    localStorage.setItem(KEY(slot), JSON.stringify({ meta: metaOf(sim), data: sim.serialize() } satisfies Stored));
    return true;
  } catch {
    return false; // privater Modus oder Speicher voll
  }
}

export function readSlot(slot: Slot): SaveData | null {
  const s = read(slot);
  return s && (s.data.v === 1 || s.data.v === 2 || s.data.v === 3) ? s.data : null;
}

export function metaOfSlot(slot: Slot): Meta | null {
  return read(slot)?.meta ?? null;
}

export function removeSlot(slot: Slot) {
  try {
    localStorage.removeItem(KEY(slot));
    if (slot === 'auto') localStorage.removeItem(LEGACY);
  } catch {
    /* egal */
  }
}

/** Der zuletzt gespeicherte Stand, egal ob Autosave oder Speicherplatz */
export function latestSlot(): Slot | null {
  let best: Slot | null = null;
  let t = -1;
  for (const s of ['auto', ...SLOTS] as Slot[]) {
    const m = metaOfSlot(s);
    if (m && m.t >= t) {
      best = s;
      t = m.t;
    }
  }
  return best;
}

export interface Settings {
  autosave: boolean;
  dayReport: boolean;
  /** Grafik: automatisch anpassen, immer scharf oder immer flüssig */
  quality: 'auto' | 'high' | 'fast';
  /** Akku sparen: höchstens 30 Bilder pro Sekunde */
  saver: boolean;
}
const DEFAULTS: Settings = { autosave: true, dayReport: true, quality: 'auto', saver: false };

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SETTINGS) ?? '{}') as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}
export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(s));
  } catch {
    /* egal */
  }
}
