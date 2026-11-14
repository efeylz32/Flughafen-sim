// Alle Balancing-Werte an einer Stelle. Zeit läuft in Spielminuten (gm).
// 1x Geschwindigkeit: 1 Spieltag = 6 Minuten Echtzeit = 4 gm pro Sekunde.

export const TILE = 32;
export const GRID_W = 36;
export const GRID_H = 28;
/** Erste Landreihe. Kaimauern dürfen nur hier stehen (Wasser liegt darüber). */
export const COAST_ROW = 8;

export const TICKS_PER_SEC = 10;
/** Spielminuten pro Simulations-Tick bei 1x. */
export const TICK_GM = 0.4;
export const MIN_PER_DAY = 1440;
/** Das Spiel beginnt um 06:00 Uhr an Tag 1. */
export const START_GM = 6 * 60;

export enum T {
  Water = 0,
  Land = 1,
  Kai = 2,
  Road = 3,
  Yard = 4,
  Gate = 5,
}

export type Tool = 'view' | 'kai' | 'crane' | 'road' | 'yard' | 'gate' | 'truck' | 'demolish';
export type BuildTool = Exclude<Tool, 'view' | 'demolish'>;

export const COST: Record<BuildTool, number> = {
  kai: 5_000,
  crane: 80_000,
  road: 500,
  yard: 1_000,
  gate: 20_000,
  truck: 25_000,
};
export const REFUND = 0.5;

/** Laufende Kosten pro Spieltag. */
export const RUN_COST_PER_DAY = {
  crane: 3_000,
  truck: 600,
  gate: 1_500,
  yardTile: 15,
  kaiTile: 10,
};

export const START_MONEY = 500_000;
export const START_REP = 50;

// Kran
export const CRANE_MOVE_GM = 3; // 20 Moves pro Stunde
export const CRANE_BUFFER = 4;

// Transport
export const TRUCK_SPEED = 2; // Felder pro gm
export const TRUCK_HANDLE_GM = 0.4;
export const TRUCK_CAP = 2; // Container pro Fahrt
export const TRUCK_JAM = 0.35; // Verlangsamung pro zusätzlichem Truck auf demselben Feld

// Stapelplatz
export const YARD_CAP_PER_TILE = 6;

// Gate
export const GATE_PROCESS_GM = 2; // 30 Container pro Stunde und Gate
export const GATE_APRON_CAP = 4;

// Schiffe
export const SHIP_LEN = 4;
export const SHIP_CONTAINERS = 120;
export const SHIP_SPEED = 1.5; // Felder pro gm
export const SHIP_PATIENCE_GM = 720;
export const SHIP_DWELL_TARGET_GM = 480;

// Einnahmen
export const FEE_PER_CONTAINER = 200;
export const BERTH_FEE = 2_500;

// Ruf
export const REP_MAX = 100;
