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
  Reefer = 6,
  Rail = 7,
}

export type Tool = 'view' | 'kai' | 'crane' | 'road' | 'yard' | 'reefer' | 'gate' | 'rail' | 'truck' | 'dredge' | 'demolish';
export type BuildTool = Exclude<Tool, 'view' | 'demolish'>;

export const COST: Record<BuildTool, number> = {
  kai: 5_000,
  crane: 80_000,
  road: 500,
  yard: 1_000,
  reefer: 4_000,
  gate: 20_000,
  rail: 150_000,
  truck: 25_000,
  dredge: 15_000,
};
/** Ab welcher Hafenstufe ein Werkzeug verfügbar ist. */
export const UNLOCK: Record<BuildTool, number> = {
  kai: 1,
  crane: 1,
  road: 1,
  yard: 1,
  gate: 1,
  truck: 1,
  reefer: 3,
  rail: 3,
  dredge: 3,
};
export const UPGRADE = {
  /** Mobilkran zur Containerbrücke: doppelt so schnell */
  crane: { cost: 120_000, level: 2 },
  /** Truck zum fahrerlosen Fahrzeug: schneller und billiger im Betrieb */
  truck: { cost: 30_000, level: 4 },
};
export const REFUND = 0.5;

/** Laufende Kosten pro Spieltag. */
export const RUN_COST_PER_DAY = {
  crane: 3_000,
  craneBig: 5_500,
  truck: 600,
  agv: 250,
  gate: 1_500,
  rail: 2_500,
  yardTile: 15,
  reeferTile: 80,
  kaiTile: 10,
};

export const START_MONEY = 500_000;
export const START_REP = 50;
export const REP_MAX = 100;

// Kran
export const CRANE_MOVE_GM = 3; // Mobilkran: 20 Moves pro Stunde
export const CRANE_BIG_MOVE_GM = 1.5; // Containerbrücke: 40 Moves pro Stunde
export const CRANE_BUFFER = 4;
export const CRANE_EXP_BUFFER = 4;

// Transport
export const TRUCK_SPEED = 2; // Felder pro gm
export const AGV_SPEED = 3;
export const TRUCK_HANDLE_GM = 0.4;
export const TRUCK_CAP = 2; // Container pro Fahrt
/** Nach so vielen Spielminuten im Stau drängelt sich ein Truck durch, damit nichts für immer feststeckt. */
export const TRUCK_PATIENCE_GM = 10;

// Stapelplatz und Kühlplätze
export const YARD_CAP_PER_TILE = 6;
/** So lange hält ein Kühlcontainer auf dem Kühlplatz, bevor er verdirbt. */
export const REEFER_MAX_GM = 600;
export const REEFER_SPOIL_PENALTY = 500;

// Gate
export const GATE_PROCESS_GM = 2; // 30 Container pro Stunde und Gate
export const GATE_APRON_CAP = 4;
export const GATE_IN_CAP = 4;

// Bahn
export const RAIL_CAP = 40;
export const RAIL_INTERVAL_GM = 360;
export const RAIL_TRAVEL_GM = 20;
export const RAIL_STAY_GM = 40;

// Schiffe
export const SHIP_LEN = 4;
export const SHIP_SPEED = 1.5; // Felder pro gm
export const SHIP_PATIENCE_GM = 720;
export const SHIP_DWELL_TARGET_GM = 480;
export const SHIP_MAX_STAY_GM = 1440;

export type ShipTypeId = 'feeder' | 'panamax';
export const SHIP_TYPES: Record<ShipTypeId, { name: string; len: number; containers: number; deep: boolean; berthFee: number; dwell: number }> = {
  feeder: { name: 'Feeder', len: 4, containers: 120, deep: false, berthFee: 2_500, dwell: 480 },
  panamax: { name: 'Panamax', len: 6, containers: 300, deep: true, berthFee: 8_000, dwell: 720 },
};
/** Anteil der Ladung, den ein Schiff zusätzlich als Export mitnehmen will (ab Stufe 2). */
export const EXPORT_SHARE = 0.4;
/** Export-Container, die schon vor dem nächsten Schiff auf dem Platz bereitstehen. */
export const EXPORT_PRESTOCK = 12;
/** Anteil Kühlcontainer an der Ladung, wenn ein Schiff Kühlfracht bringt. */
export const REEFER_SHARE = 0.25;

// Einnahmen
export const FEE_PER_CONTAINER = 200;
export const REEFER_FEE = 400;
export const EXPORT_FEE = 250;

// Hafenstufen: `need` ist die Zahl der insgesamt umgeschlagenen Container
export const LEVELS = [
  { name: 'Anleger', need: 0, bonus: 0, contracts: 0 },
  { name: 'Regionalhafen', need: 400, bonus: 100_000, contracts: 2 },
  { name: 'Handelshafen', need: 2_500, bonus: 250_000, contracts: 3 },
  { name: 'Seehafen', need: 8_000, bonus: 500_000, contracts: 4 },
  { name: 'Weltklasse-Hafen', need: 20_000, bonus: 1_000_000, contracts: 5 },
];
/** Was jede Stufe neu bringt (für die Anzeige beim Aufstieg). */
export const LEVEL_NEWS: { title: string; text: string }[][] = [
  [],
  [
    { title: 'Export', text: 'Schiffe wollen jetzt auch beladen werden. Export-Container kommen über das Gate und bringen 250 € pro Stück.' },
    { title: 'Verträge', text: 'Reedereien bieten feste Anläufe mit Bonus an. Bis zu 2 Verträge gleichzeitig.' },
    { title: 'Containerbrücke', text: 'Tippe einen Kran an und rüste ihn auf. Er arbeitet dann doppelt so schnell.' },
    { title: 'Wetter', text: 'Bei Sturm stehen die Kräne still, bei Nebel ist die Einfahrt gesperrt. Es gibt eine Vorwarnung.' },
  ],
  [
    { title: 'Kühlfracht', text: 'Kühlcontainer brauchen Kühlplätze mit Strom und verderben nach 10 Stunden. Sie bringen 400 € pro Stück.' },
    { title: 'Gleisanschluss', text: 'Am rechten Kartenrand: Alle 6 Stunden holt ein Zug bis zu 40 Container auf einmal ab.' },
    { title: 'Baggern', text: 'Vertiefe das Wasser vor dem Kai. Ein tiefer Liegeplatz mit 6 Feldern nimmt große Schiffe mit 300 Containern auf.' },
    { title: 'Bis zu 3 Verträge', text: 'Auch für Kühlfracht und große Schiffe.' },
  ],
  [
    { title: 'Fahrerlose Fahrzeuge', text: 'Tippe einen Truck an und rüste ihn auf. Er fährt dann schneller und kostet weniger im Betrieb.' },
    { title: 'Bis zu 4 Verträge', text: 'Mehr Reedereien können gleichzeitig zu dir fahren.' },
  ],
  [{ title: 'Bis zu 5 Verträge', text: 'Dein Hafen spielt in der obersten Liga.' }],
];
