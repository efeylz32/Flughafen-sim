// Alle Balancing-Werte an einer Stelle. Zeit läuft in Spielminuten (gm).
// 1x Geschwindigkeit: 1 Spieltag = 6 Minuten Echtzeit = 4 gm pro Sekunde.

export const TILE = 32;
/** Kartengröße in Feldern. Sie wächst mit den Hafenerweiterungsgesetzen (siehe MAP_SIZES, setGridSize). */
export let GRID_W = 36;
export let GRID_H = 28;
/** Die drei Kartengrößen. Mehr als 64 Felder je Küste lässt die Kai-Nummerierung nicht zu. */
export const MAP_SIZES: [number, number][] = [
  [36, 28],
  [48, 36],
  [60, 44],
];
/** Aktuelle Größenstufe 0..2 */
export let GRID_SIZE = 0;
/** Kartengröße umschalten. Muss vor `new Sim` passieren, weil die Felder-Arrays beim Anlegen ihre Größe bekommen. */
export function setGridSize(size: number) {
  GRID_SIZE = Math.max(0, Math.min(MAP_SIZES.length - 1, size));
  [GRID_W, GRID_H] = MAP_SIZES[GRID_SIZE];
}
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
  Hazmat = 11,
  Empty = 12,
  Solar = 13,
  Battery = 14,
  Track = 15,
  Parking = 16,
  Hill = 17,
  Customs = 18,
  Tower = 19,
}

export type Tool = 'view' | 'kai' | 'crane' | 'lcrane' | 'road' | 'yard' | 'reefer' | 'gate' | 'rail' | 'truck' | 'dredge' | 'unpack' | 'pack' | 'cold' | 'workshop' | 'road2' | 'hwy' | 'solar' | 'battery' | 'customs' | 'tower' | 'track' | 'parking' | 'rtg' | 'hazard' | 'emptyyard' | 'fill' | 'assign' | 'copy' | 'paste' | 'yarduse' | 'zone' | 'oneway' | 'overpass' | 'buyland' | 'berth' | 'demolish';
export type BuildTool = Exclude<Tool, 'view' | 'demolish' | 'assign' | 'copy' | 'paste' | 'yarduse' | 'zone' | 'oneway' | 'overpass' | 'buyland' | 'berth'>;

export const COST: Record<BuildTool, number> = {
  kai: 5_000,
  crane: 80_000,
  lcrane: 40_000,
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
  road2: 1_800,
  solar: 15_000,
  track: 3_000,
  parking: 2_000,
  battery: 40_000,
  customs: 30_000,
  tower: 60_000,
  hwy: 4_000,
  hazard: 12_000,
  emptyyard: 2_000,
  fill: 110_000,
};
/** Ab welcher Hafenstufe ein Werkzeug verfügbar ist. */
export const UNLOCK: Record<BuildTool, number> = {
  kai: 1,
  crane: 1,
  lcrane: 1,
  road: 1,
  yard: 1,
  gate: 1,
  truck: 1,
  parking: 1,
  unpack: 2,
  pack: 2,
  workshop: 2,
  road2: 2,
  emptyyard: 2,
  solar: 3,
  rail: 3,
  track: 3,
  dredge: 3,
  reefer: 4,
  cold: 4,
  hazard: 4,
  fill: 4,
  rtg: 4,
  battery: 4,
  hwy: 4,
  customs: 5,
  tower: 3,
};
/** Ab welcher Hafenstufe Systeme und Inhalte dazukommen (damit sich das Spiel über viele Stufen entfaltet) */
export const LV = {
  /** Gefahrgut und Kühlfracht an Bord, große Schiffe im Vertrag, Richtung wählen */
  cargo: 4,
  big: 4,
  spec: 4,
  /** Mega-Frachter */
  mega: 6,
  /** Zoll, Versicherung */
  customs: 5,
  insurance: 5,
  /** Wartungsfenster, Lieferaufträge */
  maint: 3,
  orders: 3,
};
/** Kranmodelle. Aufrüsten führt jeweils zum nächsten Modell. */
export type CraneModel = 'light' | 'mobile' | 'bridge' | 'super';
export const CRANE_MODELS: Record<
  CraneModel,
  { name: string; move: number; run: number; buffer: number; big: boolean; next: CraneModel | null; upCost: number; upLevel: number; color: number; text: string }
> = {
  light: { name: 'Leichtkran', move: 4.5, run: 600, buffer: 3, big: false, next: 'mobile', upCost: 50_000, upLevel: 1, color: 0xe0a526, text: 'Billig und genügsam, aber langsam' },
  mobile: { name: 'Mobilkran', move: 3, run: 1_200, buffer: 4, big: false, next: 'bridge', upCost: 120_000, upLevel: 2, color: 0xe2582c, text: 'Der Standard für kleine Liegeplätze' },
  bridge: { name: 'Containerbrücke', move: 1.5, run: 2_500, buffer: 8, big: true, next: 'super', upCost: 750_000, upLevel: 6, color: 0x2f6db0, text: 'Steht auf zwei Kai-Feldern, doppelt so schnell' },
  super: { name: 'Super-Brücke', move: 1, run: 3_800, buffer: 10, big: true, next: null, upCost: 0, upLevel: 0, color: 0x1f7a6d, text: 'Für Mega-Frachter: 60 Moves pro Stunde' },
};
/** Moves pro Stunde eines Modells (ohne Verschleiß und Verbesserungen) */
export const movesPerHour = (m: CraneModel) => Math.round(60 / CRANE_MODELS[m].move);

/** Kleine Verbesserungen in Stufen. Jede Stufe kostet mehr und braucht eine Mindest-Hafenstufe. */
export type TechId = 'spreader' | 'scanner' | 'stack' | 'sales' | 'radio' | 'engine' | 'cool' | 'maint' | 'akkord' | 'diesel';
export const TECH: Record<TechId, { name: string; text: string; per: string; cost: number[]; level: number[] }> = {
  spreader: { name: 'Twin-Spreader', text: 'Kräne laden und löschen schneller.', per: '+10 % Kranmoves', cost: [30_000, 60_000, 120_000, 400_000, 2_500_000], level: [1, 2, 4, 6, 9] },
  scanner: { name: 'Gate-Scanner', text: 'Gates fertigen Container schneller ab.', per: '+20 % Gate-Tempo', cost: [25_000, 50_000, 100_000, 900_000, 2_200_000], level: [1, 2, 4, 7, 10] },
  stack: { name: 'Stapeltechnik', text: 'Höher stapeln: mehr Container pro Lagerfeld.', per: '+1 Container pro Feld', cost: [40_000, 90_000, 900_000, 2_400_000], level: [2, 4, 7, 10] },
  sales: { name: 'Vertrieb', text: 'Bessere Konditionen bei Spediteuren.', per: '+5 % auf Containergebühren', cost: [50_000, 100_000, 200_000, 1_400_000, 3_500_000], level: [2, 3, 5, 8, 11] },
  radio: { name: 'Leitstelle', text: 'Digitaler Funk: Automatik-Trucks bekommen schneller ihren nächsten Auftrag.', per: '−30 % Funkzeit', cost: [20_000, 50_000, 500_000], level: [1, 3, 6] },
  engine: { name: 'Motoren', text: 'Stärkere Zugmaschinen.', per: '+8 % Truck-Tempo', cost: [30_000, 70_000, 140_000, 900_000, 2_400_000], level: [1, 2, 4, 7, 10] },
  cool: { name: 'Kühltechnik', text: 'Bessere Aggregate an den Kühlplätzen.', per: '+30 % Haltbarkeit', cost: [30_000, 60_000, 1_200_000], level: [4, 5, 8] },
  akkord: { name: 'Akkord-Schichten', text: 'Kräne arbeiten schneller, aber die Belegschaft wird öfter krank, die Stimmung sinkt und überlastete Kräne haben eher Unfälle.', per: '+20 % Kranmoves, doppelter Krankenstand', cost: [60_000], level: [3] },
  diesel: { name: 'Billigdiesel', text: 'Trucks sind günstiger im Betrieb, verschleißen aber schneller.', per: '−40 % Truck-Betriebskosten, +30 % Verschleiß', cost: [40_000], level: [2] },
  maint: { name: 'Wartungsplan', text: 'Vorbeugende Wartung.', per: '−20 % Verschleiß', cost: [30_000, 60_000, 450_000, 2_000_000], level: [2, 4, 6, 9] },
};
export const TECH_IDS = Object.keys(TECH) as TechId[];

export const UPGRADE = {
  /** Kran zum nächsten Modell (Kosten und Stufe stehen in CRANE_MODELS) */
  crane: { cost: 120_000, level: 2 },
  /** Truck zum fahrerlosen Fahrzeug: schneller und billiger im Betrieb */
  truck: { cost: 30_000, level: 6 },
};
export const REFUND = 0.5;

/** Preissteigerung: Alles wird mit jeder Hafenstufe teurer (+15 % je Stufe) */
export const INFLATION_PER_LEVEL = 0.15;

/** Bauzeit in Spielminuten. Solange gebaut wird, arbeitet das Gerät oder Gebäude nicht. Straße, Lager und Kai sind sofort fertig. */
export const BUILD_GM: Partial<Record<BuildTool, number>> = {
  crane: 90,
  lcrane: 60,
  gate: 120,
  rtg: 120,
  workshop: 180,
  unpack: 240,
  pack: 300,
  cold: 240,
  rail: 360,
};
/** Umbau eines Krans auf das nächste Modell dauert so lange */
export const UPGRADE_GM = 150;

// Gebrauchtmarkt und Höchstzustand (wie bei einem Akku)
/**
 * Wer auf dem Gebrauchtmarkt verkauft: Spanne für Höchstzustand (cap), zusätzlichen Verschleiß
 * darüber hinaus (extra) und Preis als Anteil vom Neupreis. w = wie oft so ein Händler auftaucht.
 */
export const USED_SELLERS: { name: string; cap: [number, number]; extra: [number, number]; price: [number, number]; w: number; level?: number }[] = [
  { name: 'Leasingrückläufer', cap: [0.74, 0.88], extra: [0.02, 0.12], price: [0.58, 0.72], w: 3 },
  { name: 'Vom Nachbarhafen', cap: [0.6, 0.8], extra: [0.05, 0.25], price: [0.4, 0.56], w: 4 },
  { name: 'Aus einer Konkursmasse', cap: [0.55, 0.85], extra: [0.15, 0.4], price: [0.26, 0.42], w: 2 },
  { name: 'Bastlerware', cap: [0.32, 0.5], extra: [0.2, 0.45], price: [0.12, 0.24], w: 2 },
  { name: 'Werksüberholt', cap: [0.86, 0.95], extra: [0, 0.04], price: [0.72, 0.84], w: 1, level: 3 },
];
/** So lange steht ein Angebot, in Spielstunden */
export const USED_HOURS: [number, number] = [10, 60];
/** Wahrscheinlichkeit pro Spielstunde, dass ein neues Angebot dazukommt (wenn Platz ist) */
export const USED_NEW_PER_HOUR = 0.14;
/** So viel Höchstzustand geht je Verschleiß verloren: 1,0 Verschleiß kostet 4 % */
export const CAP_LOSS = 0.04;
export const CAP_MIN = 0.3;
/** Zufälliger Ausfall pro Stunde: CRASH_RATE × (1 − Höchstzustand)² */
export const CRASH_RATE = 0.03;
/** Generalüberholung: Anteil vom Neupreis, Höchstzustand danach, Dauer */
export const OVERHAUL = { price: 0.35, cap: 0.9, gm: 180 };

/** Größe von Gebäuden in Feldern (Breite × Höhe). Alles andere ist 1 × 1. */
export const SIZE: Partial<Record<BuildTool, [number, number]>> = {
  gate: [2, 1],
  unpack: [3, 2],
  pack: [3, 3],
  cold: [2, 2],
  workshop: [2, 2],
  fill: [3, 2],
  /** Containerbahnhof: oben das Ladegleis, unten die Ladefläche */
  rail: [4, 2],
};
export const sizeOf = (tool: string): [number, number] => SIZE[tool as BuildTool] ?? [1, 1];
/** Größe mit Drehung: gedreht sind Breite und Höhe vertauscht */
export const dimsOf = (tool: string, rot: boolean): [number, number] => {
  const [w, h] = sizeOf(tool);
  return rot ? [h, w] : [w, h];
};

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
  hazTile: 60,
  emptyTile: 10,
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
  easy: { name: 'Leicht', text: 'Viel Startgeld, geduldige Schiffe, milde Strafen', money: 520_000, patience: 1.5, dwell: 1.25, penalty: 0.5, wage: 0.8, sick: 0.02, debtDays: 5, goalDays: 80, rate: 0.7 },
  normal: { name: 'Normal', text: 'Knappes Startgeld, Löhne und Fristen wie geplant', money: 400_000, patience: 1, dwell: 1, penalty: 1, wage: 1, sick: 0.04, debtDays: 3, goalDays: 65, rate: 1 },
  hard: { name: 'Schwer', text: 'Wenig Startgeld, ungeduldige Schiffe, enge Fristen, hohe Löhne und Strafen', money: 250_000, patience: 0.6, dwell: 0.8, penalty: 1.6, wage: 1.3, sick: 0.07, debtDays: 2, goalDays: 50, rate: 1.4 },
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
export const WEAR_TRUCK_PER_GM = 0.00025;
export const WEAR_CRANE_PER_MOVE = 0.0008;
export const WEAR_SLOWDOWN = 0.4;
/** So viel Verschleiß baut eine besetzte Werkstatt pro Spielminute ab */
export const REPAIR_PER_GM = 1 / 90;

// Land: Die Karte ist in Streifen von 4 Spalten geteilt. Zu Beginn gehören dir die ersten fünf.
export const PLOT_W = 4;
export const START_PLOTS = 5;
export const PLOT_PRICE = 60_000;
export const PLOT_PRICE_STEP = 30_000;

// Karten
export type MapId = 'coast' | 'island' | 'rocks' | 'river';
export const MAPS: Record<MapId, { name: string; text: string; ships: number; bonus: number }> = {
  coast: { name: 'Küste', text: 'Viel Platz, Bahn und Straßen ins Hinterland an drei Seiten.', ships: 1, bonus: 0 },
  island: { name: 'Insel', text: 'Kai an allen vier Küsten, aber wenig Land und keine Bahn. Ab Stufe 2 kommen Schiffe öfter. 150.000 € mehr Startgeld.', ships: 0.8, bonus: 150_000 },
  rocks: { name: 'Felsen', text: 'Felsen versperren Bauland. Sprengen kostet 8.000 € pro Feld. 50.000 € mehr Startgeld.', ships: 1, bonus: 50_000 },
  river: { name: 'Fluss', text: 'Ein Fluss teilt das Land und Hügel liegen im Weg. Brücken und Tunnel kosten, verbinden aber. 100.000 € mehr Startgeld.', ships: 1, bonus: 100_000 },
};
export const ROCK_COST = 8_000;
/** Hügel abtragen */
export const HILL_COST = 12_000;
/** Straße durch einen Hügel (Tunnel) oder über Wasser (Brücke): Vielfaches des Straßenpreises */
export const TUNNEL_MUL = 6;
export const BRIDGE_MUL = 16;

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
/** Die Containerbrücke hat unter sich doppelt so viel Platz */
export const CRANE_BUFFER_BIG = 8;

// Transport
// Tempo in Feldern pro Spielminute. Angefangene Felder werden weitergefahren, daher wirken alle Boni gleichmäßig.
export const TRUCK_SPEED = 1.3;
export const AGV_SPEED = 2.5;
export const TRUCK_HANDLE_GM = 0.4;
export const TRUCK_CAP = 2; // Container pro Fahrt
/** Nach so vielen Spielminuten im Stau drängelt sich ein Truck durch, damit nichts für immer feststeckt. */
export const TRUCK_PATIENCE_GM = 10;
/** Überführung an einer Kreuzung: Preis und ab welcher Stufe */
export const OVERPASS_COST = 20_000;
/** Zoll: Anteil der Import-Container, die ab Stufe LV.customs kontrolliert werden müssen */
export const CUSTOMS_SHARE = 0.12;
/** Ohne Zollhof prüft das Gate selbst und braucht so viel länger */
export const CUSTOMS_GATE_SLOW = 3;
/** Ein Zollhof-Feld prüft so viele Container pro Stunde und nimmt so viele in die Warteschlange */
export const CUSTOMS_RATE = 8;
export const CUSTOMS_QUEUE = 8;
export const CUSTOMS_RUN = 600;
/** Wartungsfenster: Kosten, Dauer (Spielminuten), Startstunde, Verschleiß weg, wie lange das Risiko sinkt (Spielminuten) */
export const MAINT_COST = 2_500;
/** Lieferaufträge von Firmen im Hinterland */
export type OrderKind = 'road' | 'rail' | 'export' | 'goods';
export const ORDER_KINDS: Record<OrderKind, { text: string; level: number; share: number; per: number }> = {
  road: { text: 'Container per Lkw abholen', level: 3, share: 0.75, per: 11 },
  rail: { text: 'Container per Bahn abholen', level: 3, share: 0.75, per: 12 },
  export: { text: 'Export-Container aufs Schiff bringen', level: 3, share: 0.65, per: 14 },
  goods: { text: 'Ladungen Ware aus den Hallen', level: 4, share: 0.8, per: 70 },
};
export const ORDER_FIRMS = ['Elektro Weser', 'Modehaus Lindgren', 'Frischkontor Nord', 'Möbel Hansen', 'Autoteile Brandt', 'Kaffeerösterei Albers', 'Spielwaren Kühn', 'Baustoff Petersen'];
export const MAX_ORDERS = 2;
/** Hallen-Stufen: Preis als Anteil des Neupreises, Tempo, Puffer, Bauzeit (Spielminuten), ab Hafenstufe */
export const PLANT_LEVELS = [
  { cost: 0, speed: 1, buf: 0, time: 0, level: 0 },
  { cost: 0.6, speed: 1.4, buf: 2, time: 240, level: 5 },
  { cost: 1, speed: 1.8, buf: 4, time: 360, level: 7 },
] as const;
/** Versicherung: Stufen mit Tagesprämie und Erstattungsanteil bei Unfall, Verderb und Sturmschäden */
export const INSURANCE = [
  { name: 'Keine', premium: 0, share: 0 },
  { name: 'Basis', premium: 1_200, share: 0.5 },
  { name: 'Voll', premium: 3_500, share: 0.85 },
] as const;
export const MAINT_GM = 120;
export const MAINT_HOUR = 22;
export const MAINT_WEAR = 0.3;
export const MAINT_CARE_GM = 3 * 24 * 60;
export const OVERPASS_LEVEL = 3;
/** So lange wartet ein Truck höchstens auf Querverkehr an einer Kreuzung (Spielminuten) */
export const CROSS_WAIT_GM = 3;

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
/** Speditions-Lkw: höchstens so viele gleichzeitig auf dem Weg zu einem Gate */
export const HAUL_MAX_PER_GATE = 3;
/** So lange wartet ein Gate auf eine volle Ladung, bevor es einen Lkw für einen einzelnen Container holt */
export const HAUL_WAIT_GM = 10;
/** Laden und Abladen am Gate */
export const HAUL_HANDLE_GM = 1.5;
/** So weit fahren sie außerhalb der Karte, bevor sie verschwinden (Felder) */
export const HAUL_OUTSIDE = 14;
/** Höchstens so viele Container stauen sich pro Gate für die Lkw auf (sonst gehen sie ohne Bild raus) */
export const HAUL_BACKLOG = 12;
/** Farben der Speditionen */
export const HAUL_COLORS = [0xf4f6f8, 0xd9473f, 0x2f6db0, 0x2f9e6b, 0xf2b336, 0x6d5bd0];
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

export type ShipTypeId = 'coaster' | 'feeder' | 'panamax' | 'mega';
export const SHIP_TYPES: Record<ShipTypeId, { name: string; len: number; containers: number; deep: boolean; berthFee: number; dwell: number }> = {
  /** Freie Schiffe ohne Vertrag: klein, selten, bringen wenig */
  coaster: { name: 'Küstenfrachter', len: 4, containers: 45, deep: false, berthFee: 400, dwell: 300 },
  feeder: { name: 'Feeder', len: 4, containers: 120, deep: false, berthFee: 2_500, dwell: 480 },
  panamax: { name: 'Panamax', len: 6, containers: 300, deep: true, berthFee: 8_000, dwell: 720 },
  /** Ab Stufe 5: braucht 8 Kai-Felder, ausgebaggert */
  mega: { name: 'Mega-Frachter', len: 8, containers: 500, deep: true, berthFee: 16_000, dwell: 960 },
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
export type PlantKind = 'unpack' | 'pack' | 'cold' | 'fill';
export const PLANTS: Record<PlantKind, { name: string; needs: number; time: number }> = {
  unpack: { name: 'Packhalle', needs: 1, time: 4 },
  pack: { name: 'Veredelung', needs: 2, time: 6 },
  cold: { name: 'Kühlhalle', needs: 1, time: 3 },
  /** Leerer Container plus Ware ergibt einen Export-Container */
  fill: { name: 'Befüllhalle', needs: 1, time: 5 },
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
/** Ab dieser Füllung des Stapelplatzes helfen Trucks mit fester Aufgabe beim Räumen, wenn sie für ihre Rolle nichts zu tun haben */
export const YARD_HELP = 0.8;
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

// Hafenstufen: `need` ist die Zahl der insgesamt umgeschlagenen Container. Dazu kommt ab Stufe 3 je ein
// Meilenstein (siehe progression.ts). Es gibt keinen Sieg: Am Ende steht die Vollendung, wenn alles ausgebaut ist.
export const LEVELS = [
  { name: 'Anleger', need: 0, bonus: 0, contracts: 0 },
  { name: 'Regionalhafen', need: 1_500, bonus: 30_000, contracts: 2 },
  { name: 'Küstenhafen', need: 7_000, bonus: 50_000, contracts: 2 },
  { name: 'Handelshafen', need: 20_000, bonus: 80_000, contracts: 3 },
  { name: 'Seehafen', need: 45_000, bonus: 110_000, contracts: 3 },
  { name: 'Großhafen', need: 90_000, bonus: 150_000, contracts: 4 },
  { name: 'Containerdrehkreuz', need: 160_000, bonus: 200_000, contracts: 4 },
  { name: 'Mega-Hub', need: 260_000, bonus: 250_000, contracts: 5 },
  { name: 'Kontinentalhafen', need: 400_000, bonus: 300_000, contracts: 5 },
  { name: 'Welthafen', need: 580_000, bonus: 350_000, contracts: 6 },
  { name: 'Weltmarktführer', need: 800_000, bonus: 400_000, contracts: 6 },
  { name: 'Port Empire', need: 1_100_000, bonus: 500_000, contracts: 7 },
];
export const MAX_LEVEL = LEVELS.length;
/** Was jede Stufe neu bringt (für die Anzeige beim Aufstieg). Index = Stufe − 1. */
export const LEVEL_NEWS: { title: string; text: string }[][] = [
  [],
  [
    { title: 'Export', text: 'Schiffe wollen jetzt auch beladen werden. Export-Container kommen über das Gate und bringen 250 € pro Stück.' },
    { title: 'Verträge', text: 'Bis zu 2 Daueraufträge gleichzeitig. Nur über Verträge kommen größere Schiffe.' },
    { title: 'Containerbrücke', text: 'Tippe einen Kran an und rüste ihn auf. Er arbeitet dann doppelt so schnell.' },
    { title: 'Verarbeitung', text: 'Die Packhalle packt Container aus, die Veredelung macht aus zwei davon Fertigware. Leere Container kommen ins Leerlager.' },
    { title: 'Verschleiß und Werkstatt', text: 'Kräne und Trucks nutzen sich ab und fallen irgendwann aus. Eine Werkstatt mit Mechaniker repariert sie.' },
    { title: 'Konkurrenz, Wetter, Ereignisse', text: 'Hafen Nordstadt wirbt Reedereien ab, wenn du unpünktlich bist. Stürme legen Kräne lahm, ab und zu musst du entscheiden.' },
  ],
  [
    { title: 'Strom', text: 'Solarfelder liefern Strom für Kräne und Hallen. Bei Stromausfall hilft später eine Batterie.' },
    { title: 'Bahn', text: 'Containerbahnhof und Gleise bis zum Kartenrand: Ein Zug holt viele Container auf einmal ab.' },
    { title: 'Baggern', text: 'Vertiefe das Wasser vor dem Kai. So passen später große Schiffe an den Liegeplatz.' },
    { title: 'Lieferaufträge und Wartung', text: 'Firmen bestellen feste Mengen. Kräne lassen sich nachts warten, dann fallen sie seltener aus.' },
    { title: 'Überführungen', text: 'An Kreuzungen warten Trucks auf Querverkehr. Eine Überführung hebt das auf.' },
  ],
  [
    { title: 'Kühlfracht und Gefahrgut', text: 'Kühlcontainer brauchen Kühlplätze und verderben nach 10 Stunden. Gefahrgut braucht eigene Flächen mit Abstand.' },
    { title: 'Große Schiffe', text: 'Verträge mit großen Schiffen (300 Container). Sie brauchen 6 Kai-Felder, davor ausgebaggert.' },
    { title: 'Portalkran, Befüllhalle, Kühlhalle', text: 'Portalkräne stapeln höher. Die Befüllhalle macht aus Leergut Export, die Kühlhalle Lebensmittel.' },
    { title: 'Autobahn und Batterie', text: 'Breite Hauptachsen und Strom-Speicher für Ausfälle.' },
    { title: 'Richtung wählen', text: 'Umschlag-Hub, Logistik-Hafen oder Kühlhafen: Jede Richtung hat Stärken und Schwächen.' },
  ],
  [
    { title: 'Zoll', text: 'Ein Teil der Import-Container muss durch den Zoll. Ohne Zollhof prüft das Gate selbst und braucht dreimal so lange.' },
    { title: 'Versicherung', text: 'In der Bilanz: deckt Unfälle, Sturmschäden und verdorbene Ware zum Teil ab.' },
    { title: 'Hallen ausbauen', text: 'Hallen lassen sich auf Stufe 2 ausbauen: schneller, mehr Puffer.' },
  ],
  [
    { title: 'Mega-Frachter', text: '500 Container auf einmal. Sie brauchen 8 Kai-Felder in einer Reihe, davor ausgebaggert.' },
    { title: 'Super-Brücke', text: 'Containerbrücken lassen sich ein letztes Mal aufrüsten: 60 Moves pro Stunde.' },
    { title: 'Fahrerlose Fahrzeuge', text: 'Trucks lassen sich aufrüsten: schneller, billiger im Betrieb, ohne Fahrer.' },
  ],
  [{ title: 'Hallen Stufe 3', text: 'Die letzte Ausbaustufe für Hallen.' }, { title: 'Mehr Verbesserungen', text: 'Neue Stufen für Stapeltechnik und Leitstelle.' }],
  [{ title: 'Bis zu 5 Verträge', text: 'Mehr Reedereien gleichzeitig.' }],
  [{ title: 'Neue Verbesserungsstufen', text: 'Spreader, Wartung und Kühltechnik lassen sich weiter ausbauen.' }],
  [{ title: 'Bis zu 6 Verträge', text: 'Dein Hafen spielt weltweit ganz oben mit.' }],
  [{ title: 'Letzte Verbesserungen', text: 'Vertrieb, Stapeltechnik und Gate-Scanner auf die höchste Stufe.' }],
  [{ title: 'Port Empire', text: 'Die höchste Stufe. Jetzt fehlt nur noch die Vollendung: alles ausbauen.' }],
];

/** Spezialisierung ab Stufe 3: Eine Richtung wählen, die anderen sind damit zu. */
export type SpecId = 'hub' | 'logi' | 'cold';
export const SPECS: Record<SpecId, { name: string; text: string; pros: string; cons: string }> = {
  hub: { name: 'Umschlag-Hub', text: 'Schnelle Schiffe, schnelle Kräne.', pros: 'Kräne +15 % Tempo, Liegegebühren +20 %', cons: 'Veredelung und Hallen 30 % langsamer' },
  logi: { name: 'Logistik-Hafen', text: 'Verarbeitung und Landverkehr.', pros: 'Hallen 25 % schneller, Gates +15 % Tempo, Fertigware +10 % Preis', cons: 'Kräne 5 % langsamer' },
  cold: { name: 'Kühlhafen', text: 'Kühlfracht und Lebensmittel.', pros: 'Kühlcontainer halten 50 % länger, Kühlgebühr +25 %, Lebensmittel +15 %, mehr Kühlfracht an Bord', cons: 'Liegegebühren −10 %' },
};

/** Schichtbetrieb und Löhne */
export type WagePolicy = 'low' | 'normal' | 'high';
export const WAGE_POLICY: Record<WagePolicy, { name: string; mul: number; mood: number }> = {
  low: { name: 'Sparkurs', mul: 0.85, mood: -0.2 },
  normal: { name: 'Tarif', mul: 1, mood: 0 },
  high: { name: 'Übertarif', mul: 1.2, mood: 0.2 },
};
/** Nachtschicht: Zuschlag auf den Lohn. Ohne Nachtschicht läuft zwischen 22 und 6 Uhr alles mit halber Kraft. */
export const NIGHT_WAGE = 1.2;
export const NIGHT_SLOW = 0.5;

/** Konjunktur und Jahreszeiten */
export type CycleKind = 'boom' | 'normal' | 'crisis';
export const CYCLES: Record<CycleKind, { name: string; ships: number; fee: number; used: number }> = {
  boom: { name: 'Boom', ships: 0.75, fee: 1.1, used: 1.25 },
  normal: { name: 'Normale Lage', ships: 1, fee: 1, used: 1 },
  crisis: { name: 'Krise', ships: 1.4, fee: 0.9, used: 0.75 },
};
export const SEASON_DAYS = 15;
export const SEASONS = [
  { name: 'Frühling', text: 'Kleidung gefragt' },
  { name: 'Sommer', text: 'viel Kühlfracht' },
  { name: 'Herbst', text: 'Elektronik vor Weihnachten gefragt' },
  { name: 'Winter', text: 'mehr Stürme, Lebensmittel gefragt' },
];
/** Lagergebühr pro Container und Tag, die ein Spediteur zahlt */
export const STORAGE_FEE = 6;

// Gefahrgut, Leercontainer und die Befüllkette
export const HAZ_FEE = 700;
/** Gefahrgut-Anteil an der Ladung (ab Stufe 3, wenn es eine Gefahrgutfläche gibt) */
export const HAZ_SHARE = 0.12;
/** Leere Container gehen für wenig Geld zurück an die Reederei */
export const EMPTY_FEE = 90;
/** Zusatzerlös, wenn die Befüllhalle aus Leergut und Ware einen Export-Container macht */
export const FILL_FEE = 150;
export const CAP_HAZ = 4;
export const CAP_EMPTY = 12;
/** Gefahrgut braucht so viele Felder Abstand zu Gates, Hallen und Werkstatt */
export const HAZ_DIST = 2;
/** Ladungen Ware, die ein Zug bringt */
export const RAIL_GOODS = 12;
export const RAIL_GOODS_MAX = 24;

/** Straßenarten: 0 Straße, 1 Doppelspur, 2 Autobahn */
export const ROAD_NAMES = ['Straße', 'Doppelspur', 'Autobahn'];
/** Truck-Tempo auf dem Feld */
export const ROAD_SPEED = [1, 1, 2];
/** Fahrzeuge je Richtung und Feld (Einbahn gibt +1) */
export const ROAD_LANES = [1, 2, 2];
/** Betrieb pro Feld und Tag */
export const ROAD_RUN = [0, 6, 20];
/** Entfernungen werden in Zehnteln eines Feldes gerechnet, damit schnelle Straßen Bruchteile kosten */
export const DIST_UNIT = 10;
/** Kran-Zugänge: Jeder Truck, der schon zu einem Zugang will, macht ihn um so viel „weiter“ (Zehntel Feld) */
export const CRANE_ACC_BUSY = 25;
/** Stau in der Wegsuche: ab dieser Wartezeit auf einem Feld (Spielminuten, abklingend) gilt es als länger */
export const JAM_PEN_FROM = 1.5;
/** Aufschlag pro Minute Stau in Zehnteln eines Feldes, höchstens so viel (30 = drei Felder Umweg) */
export const JAM_PEN_K = 2.5;
export const JAM_PEN_MAX = 30;
/** So oft wird der Stau in die Wege eingerechnet (Ticks, 25 = 10 Spielminuten) */
export const JAM_REFRESH_TICKS = 25;

// ───────── Hafen-Eigenschaften: zwei zufällige Besonderheiten pro neuem Spiel ─────────
export type TraitId = 'rocky' | 'stormy' | 'union' | 'freezone' | 'deepwater' | 'railhub' | 'coldregion' | 'cheapland';
export const TRAITS: Record<TraitId, { name: string; text: string }> = {
  rocky: { name: 'Fester Baugrund', text: 'Bauen kostet 15 % mehr' },
  stormy: { name: 'Sturmküste', text: 'Deutlich mehr Stürme und Nebel' },
  union: { name: 'Starke Gewerkschaft', text: 'Löhne +15 %, dafür bessere Stimmung' },
  freezone: { name: 'Freihandelszone', text: 'Gebühren +10 %, aber öfter Kontrollen' },
  deepwater: { name: 'Tiefes Fahrwasser', text: 'Baggern kostet 60 % weniger' },
  railhub: { name: 'Bahnknoten', text: 'Züge kommen alle 4 statt 6 Stunden' },
  coldregion: { name: 'Kühlregion', text: 'Mehr Schiffe mit Kühlfracht' },
  cheapland: { name: 'Günstiges Hinterland', text: 'Land kostet 40 % weniger' },
};

// ───────── Weltereignisse: Handel und Politik ─────────
export type WorldId = 'embargo' | 'portstrike' | 'tariff' | 'newroute' | 'canal';
export const WORLD: Record<WorldId, { name: string; text: string; days: [number, number]; ships: number; fee: number }> = {
  embargo: { name: 'Embargo', text: 'Eine Ware ist mit einem Embargo belegt: Ihr Preis bricht ein', days: [4, 7], ships: 1, fee: 1 },
  portstrike: { name: 'Streik im Nachbarhafen', text: 'Reedereien weichen zu dir aus: deutlich mehr Schiffe', days: [3, 5], ships: 0.6, fee: 1 },
  tariff: { name: 'Neuer Zoll', text: 'Neue Zölle drücken die Containergebühren um 10 %', days: [5, 8], ships: 1, fee: 0.9 },
  newroute: { name: 'Neue Handelsroute', text: 'Eine neue Route bringt mehr Schiffe', days: [6, 10], ships: 0.8, fee: 1 },
  canal: { name: 'Kanal gesperrt', text: 'Ein wichtiger Kanal ist blockiert: weniger Schiffe', days: [3, 6], ships: 1.5, fee: 1 },
};

// ───────── Strom ─────────
/** Strompreis aus dem Netz in Euro pro kWh */
export const POWER_PRICE = 0.3;
/** Leistung einer Solarfläche bei Sonne in kW */
export const SOLAR_KW = 30;
/** Speicher einer Batterie in kWh */
export const BATTERY_KWH = 400;
/** Verbrauch in kW */
export const POWER_KW = { light: 30, mobile: 50, bridge: 120, super: 160, rtg: 40, reeferTile: 8, plant: 40, cold: 60, gate: 5, shop: 10 };

// ───────── Regeln für den Leitstand ─────────
export type RuleCond = 'yardHigh' | 'yardLow' | 'shipsWait' | 'night' | 'day' | 'reeferHigh' | 'powerOut';
export type RuleAct = 'role:auto' | 'role:crane' | 'role:out' | 'role:export' | 'role:plant' | 'shift:on' | 'shift:off';
export const RULE_CONDS: Record<RuleCond, string> = {
  yardHigh: 'Stapelplatz über 80 % voll',
  yardLow: 'Stapelplatz unter 30 % voll',
  shipsWait: 'Zwei oder mehr Schiffe warten',
  night: 'Es ist Nacht (22 bis 6 Uhr)',
  day: 'Es ist Tag',
  reeferHigh: 'Kühlplätze über 70 % voll',
  powerOut: 'Stromausfall',
};
export const RULE_ACTS: Record<RuleAct, string> = {
  'role:auto': 'alle Trucks auf Automatik',
  'role:crane': 'alle Trucks auf „Kran räumen“',
  'role:out': 'alle Trucks auf „Ausgang“',
  'role:export': 'alle Trucks auf „Export“',
  'role:plant': 'alle Trucks auf „Verarbeitung“',
  'shift:on': 'Nachtschicht einschalten',
  'shift:off': 'Nachtschicht ausschalten',
};
export const MAX_RULES = 6;

/** Lagerzwecke für Stapelfelder */
export const YARD_USES = [
  { name: 'Gemischt', color: 0x9aa5b1 },
  { name: 'Straße', color: 0x2f9e6b },
  { name: 'Bahn', color: 0x9c6b3c },
  { name: 'Export', color: 0x2f6db0 },
];

/** Leercontainer, die von außen (Gate oder Zug) kommen, kosten Miete */
export const EMPTY_IN_COST = 40;
/** So viele Leercontainer bringt ein Zug höchstens */
export const RAIL_EMPTIES = 10;

/** Stellplätze pro Parkplatz-Feld */
export const PARK_SLOTS = 3;

/** Hafenerweiterungsgesetze: neue, größere Karte vom selben Typ. Index = Zielgröße − 1. */
export const LAWS = [
  { name: 'Hafenerweiterungsgesetz I', level: 7, cost: 5_000_000 },
  { name: 'Hafenerweiterungsgesetz II', level: 10, cost: 20_000_000 },
];
/** Land wird auf größeren Karten teurer (Faktor je Größenstufe) */
export const PLOT_MUL = [1, 4, 12];

/** Großprojekte: einmalig, sehr teuer, dauerhafte Vorteile. Bauzeit in Spieltagen. */
export type ProjectId = 'bahnhof' | 'cruise' | 'control' | 'canal' | 'logistics' | 'tower' | 'freezone';
export const PROJECTS: Record<ProjectId, { name: string; text: string; cost: number; level: number; days: number }> = {
  bahnhof: { name: 'Hafenbahnhof', text: 'Züge nehmen 50 % mehr Container mit und kommen öfter.', cost: 3_000_000, level: 5, days: 3 },
  cruise: { name: 'Kreuzfahrt-Terminal', text: 'Touristen bringen jeden Tag 40.000 € und etwas Ruf.', cost: 5_000_000, level: 6, days: 4 },
  control: { name: 'Automatische Leitzentrale', text: 'Trucks bekommen ihren nächsten Auftrag sofort und fahren 10 % schneller.', cost: 8_000_000, level: 7, days: 5 },
  canal: { name: 'Tiefwasserkanal', text: 'Alle Liegeplätze gelten als ausgebaggert. Große Schiffe brauchen nur noch genug Kai.', cost: 12_000_000, level: 8, days: 6 },
  logistics: { name: 'Logistikpark', text: 'Export bringt 25 % mehr, Lieferaufträge zahlen 30 % mehr.', cost: 15_000_000, level: 9, days: 6 },
  tower: { name: 'Hafen-Wahrzeichen', text: 'Ein Turm, den jeder kennt: Ruf steigt täglich, Gebühren +5 %.', cost: 25_000_000, level: 10, days: 8 },
  freezone: { name: 'Freihandelszone', text: 'Containergebühren +10 %.', cost: 40_000_000, level: 11, days: 10 },
};
export const PROJECT_IDS = Object.keys(PROJECTS) as ProjectId[];
