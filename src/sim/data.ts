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
  Plant = 8,
  Shop = 9,
  Rock = 10,
}

export type Tool = 'view' | 'kai' | 'crane' | 'road' | 'yard' | 'reefer' | 'gate' | 'rail' | 'truck' | 'dredge' | 'unpack' | 'pack' | 'cold' | 'workshop' | 'rtg' | 'assign' | 'zone' | 'oneway' | 'buyland' | 'demolish';
export type BuildTool = Exclude<Tool, 'view' | 'demolish' | 'assign' | 'zone' | 'oneway' | 'buyland'>;

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
  unpack: 60_000,
  pack: 90_000,
  cold: 80_000,
  workshop: 40_000,
  rtg: 60_000,
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
  unpack: 2,
  pack: 2,
  cold: 3,
  workshop: 2,
  rtg: 3,
};
export const UPGRADE = {
  /** Mobilkran zur Containerbrücke: doppelt so schnell */
  crane: { cost: 120_000, level: 2 },
  /** Truck zum fahrerlosen Fahrzeug: schneller und billiger im Betrieb */
  truck: { cost: 30_000, level: 4 },
};
export const REFUND = 0.5;

/** Größe von Gebäuden in Feldern (Breite × Höhe). Alles andere ist 1 × 1. */
export const SIZE: Partial<Record<BuildTool, [number, number]>> = {
  gate: [2, 1],
  unpack: [3, 2],
  pack: [3, 3],
  cold: [2, 2],
  workshop: [2, 2],
};
export const sizeOf = (tool: string): [number, number] => SIZE[tool as BuildTool] ?? [1, 1];

/** Laufende Kosten pro Spieltag. */
export const RUN_COST_PER_DAY = {
  // Wartung und Energie. Die Löhne kommen über das Personal dazu.
  crane: 1_200,
  craneBig: 2_500,
  truck: 150,
  agv: 250,
  gate: 400,
  rail: 2_500,
  plant: 1_800,
  shop: 300,
  yardTile: 15,
  reeferTile: 80,
  kaiTile: 10,
};

export const START_MONEY = 400_000;

export type DiffId = 'easy' | 'normal' | 'hard';
/** Schwierigkeitsgrade: Startgeld, Geduld der Schiffe, zugesagte Liegezeit, Strafen, Löhne, Krankenstand */
export const DIFFS: Record<
  DiffId,
  { name: string; text: string; money: number; patience: number; dwell: number; penalty: number; wage: number; sick: number; debtDays: number; goalDays: number; rate: number }
> = {
  easy: { name: 'Leicht', text: 'Viel Startgeld, geduldige Schiffe, milde Strafen', money: 650_000, patience: 1.5, dwell: 1.25, penalty: 0.5, wage: 0.8, sick: 0.02, debtDays: 5, goalDays: 50, rate: 0.7 },
  normal: { name: 'Normal', text: 'Knappes Startgeld, Löhne und Fristen wie geplant', money: 400_000, patience: 1, dwell: 1, penalty: 1, wage: 1, sick: 0.04, debtDays: 3, goalDays: 40, rate: 1 },
  hard: { name: 'Schwer', text: 'Wenig Startgeld, ungeduldige Schiffe, enge Fristen, hohe Löhne und Strafen', money: 250_000, patience: 0.6, dwell: 0.8, penalty: 1.6, wage: 1.3, sick: 0.07, debtDays: 2, goalDays: 32, rate: 1.4 },
};

// Kredit
export const LOAN_STEP = 100_000;
export const LOAN_LIMIT_PER_LEVEL = 250_000;
/** Zinsen pro Tag auf die offene Kreditsumme */
export const LOAN_RATE = 0.004;

export type Role = 'driver' | 'crane' | 'gate' | 'mech';
/** Personal: Stundenlohn und wofür die Stelle gebraucht wird */
export const ROLES: Record<Role, { name: string; plural: string; wage: number; need: string }> = {
  driver: { name: 'Fahrer', plural: 'Fahrer', wage: 22, need: 'einer pro Truck, fahrerlose Fahrzeuge brauchen keinen' },
  crane: { name: 'Kranführer', plural: 'Kranführer', wage: 60, need: 'einer pro Kran' },
  gate: { name: 'Gate-Personal', plural: 'Gate-Kräfte', wage: 30, need: 'eine Kraft pro Gate' },
  mech: { name: 'Mechaniker', plural: 'Mechaniker', wage: 35, need: 'einer pro Werkstatt' },
};

// Verschleiß (ab Stufe 2): Bei 100 % fällt das Gerät aus, vorher wird es langsamer.
export const WEAR_TRUCK_PER_GM = 0.0004;
export const WEAR_CRANE_PER_MOVE = 0.0015;
export const WEAR_SLOWDOWN = 0.4;
/** So viel Verschleiß baut eine besetzte Werkstatt pro Spielminute ab */
export const REPAIR_PER_GM = 1 / 90;

// Land: Die Karte ist in Streifen von 4 Spalten geteilt. Zu Beginn gehören dir die ersten fünf.
export const PLOT_W = 4;
export const START_PLOTS = 5;
export const PLOT_PRICE = 60_000;
export const PLOT_PRICE_STEP = 30_000;

// Karten
export type MapId = 'coast' | 'island' | 'rocks';
export const MAPS: Record<MapId, { name: string; text: string; ships: number }> = {
  coast: { name: 'Küste', text: 'Viel Platz, Bahnanschluss am rechten Rand.', ships: 1 },
  island: { name: 'Insel', text: 'Wenig Land, keine Bahn, dafür kommen Schiffe öfter.', ships: 0.8 },
  rocks: { name: 'Felsen', text: 'Felsen versperren Bauland. Sprengen kostet 8.000 € pro Feld.', ships: 1 },
};
export const ROCK_COST = 8_000;

// Konkurrenz und Ereignisse
export const RIVAL_NAME = 'Hafen Nordstadt';
export const RIVAL_START: Record<DiffId, number> = { easy: 0.55, normal: 0.68, hard: 0.8 };
export const EVENT_CHANCE = 0.35;
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
/** Portalkran: höher stapeln und schneller laden im Umkreis von einem Feld */
export const RTG_CAP = 9;
export const RTG_RADIUS = 1;
export const RTG_HANDLE = 0.5;

/** Fertigwaren und ihre Grundpreise. Der Markt schwankt täglich. */
export type ProductId = 'elec' | 'cloth' | 'food';
export const PRODUCTS: Record<ProductId, { name: string; base: number }> = {
  elec: { name: 'Elektronik', base: 1_000 },
  cloth: { name: 'Kleidung', base: 850 },
  food: { name: 'Lebensmittel', base: 750 },
};
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
/** Veredelte Ware: zwei ausgepackte Container werden zu einem Container Fertigware */
export const PREMIUM_FEE = 900;

/** Verarbeitung im Hafen: Packhalle packt Container aus, die Veredelung macht daraus Fertigware. */
export type PlantKind = 'unpack' | 'pack' | 'cold';
export const PLANTS: Record<PlantKind, { name: string; needs: number; time: number }> = {
  unpack: { name: 'Packhalle', needs: 1, time: 4 },
  pack: { name: 'Veredelung', needs: 2, time: 6 },
  cold: { name: 'Kühlhalle', needs: 1, time: 3 },
};
/** Lebensmittel aus der Kühlhalle */
export const FOOD_FEE = 750;
export const PLANT_BUF = 6;

/** Feste Aufgabe eines Trucks. Automatik wählt selbst, braucht aber vor jeder Fahrt Funkzeit. */
export type TruckRole = 'auto' | 'crane' | 'out' | 'export' | 'plant';
export const ROLE_NAMES: Record<TruckRole, { name: string; text: string }> = {
  auto: { name: 'Automatik', text: 'Die Leitstelle teilt jede Fahrt neu zu. Das kostet vor jeder Fahrt Funkzeit.' },
  crane: { name: 'Kran räumen', text: 'Fährt nur entladene Container vom Kran ins Lager.' },
  out: { name: 'Ausgang', text: 'Fährt nur vom Lager und von der Veredelung zu Gate und Bahn.' },
  export: { name: 'Export', text: 'Holt Export am Gate ab und bringt ihn zum Kran.' },
  plant: { name: 'Verarbeitung', text: 'Versorgt Packhalle und Veredelung und fährt die Fertigware raus.' },
};
/** Funkzeit der Automatik vor jeder Fahrt in Spielminuten */
export const DISPATCH_GM = 0.6;

/** Zonen trennen Kreisläufe. 0 = keine Zone. */
export const ZONES = [
  { name: 'Keine', color: 0x9aa5b1 },
  { name: 'A', color: 0xf0b429 },
  { name: 'B', color: 0x27a5ad },
  { name: 'C', color: 0xd6589a },
  { name: 'D', color: 0x8d6e4a },
];
/** Trucks mit fester Aufgabe kennen ihre Strecke: Sie fahren schneller und laden zügiger. */
export const ROUTINE_SPEED = 1.25;
export const ROUTINE_HANDLE = 0.5;
export const REEFER_FEE = 400;
export const EXPORT_FEE = 250;

// Hafenstufen: `need` ist die Zahl der insgesamt umgeschlagenen Container
export const LEVELS = [
  { name: 'Anleger', need: 0, bonus: 0, contracts: 0 },
  { name: 'Regionalhafen', need: 1_000, bonus: 100_000, contracts: 2 },
  { name: 'Handelshafen', need: 4_500, bonus: 250_000, contracts: 3 },
  { name: 'Seehafen', need: 11_000, bonus: 500_000, contracts: 4 },
  { name: 'Weltklasse-Hafen', need: 24_000, bonus: 1_000_000, contracts: 5 },
];
/** Was jede Stufe neu bringt (für die Anzeige beim Aufstieg). */
export const LEVEL_NEWS: { title: string; text: string }[][] = [
  [],
  [
    { title: 'Export', text: 'Schiffe wollen jetzt auch beladen werden. Export-Container kommen über das Gate und bringen 250 € pro Stück.' },
    { title: 'Verträge', text: 'Reedereien bieten feste Anläufe mit Bonus an. Bis zu 2 Verträge gleichzeitig.' },
    { title: 'Containerbrücke', text: 'Tippe einen Kran an und rüste ihn auf. Er arbeitet dann doppelt so schnell.' },
    { title: 'Verarbeitung', text: 'Die Packhalle packt Container aus, die Veredelung macht aus zwei davon Fertigware für 900 €. Trucks fahren die Ware dazwischen.' },
    { title: 'Verschleiß und Werkstatt', text: 'Kräne und Trucks nutzen sich ab, werden langsamer und fallen bei 100 % aus. Eine Werkstatt mit Mechaniker repariert sie.' },
    { title: 'Konkurrenz und Ereignisse', text: 'Hafen Nordstadt wirbt Reedereien ab, wenn du unpünktlich bist. Ab und zu musst du Entscheidungen treffen.' },
    { title: 'Wetter', text: 'Bei Sturm stehen die Kräne still, bei Nebel ist die Einfahrt gesperrt. Es gibt eine Vorwarnung.' },
  ],
  [
    { title: 'Kühlfracht', text: 'Kühlcontainer brauchen Kühlplätze mit Strom und verderben nach 10 Stunden. Sie bringen 400 € pro Stück.' },
    { title: 'Kühlhalle', text: 'Verarbeitet Kühlcontainer vom Kühlplatz zu Lebensmitteln für 750 € statt 400 €.' },
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
