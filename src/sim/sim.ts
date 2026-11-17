import {
  AGV_SPEED,
  BuildTool,
  COAST_ROW,
  COST,
  CRANE_EXP_BUFFER,
  CRANE_MOVE_GM,
  DIFFS,
  DISPATCH_GM,
  DiffId,
  EVENT_CHANCE,
  EXPORT_FEE,
  MAPS,
  MapId,
  PLOT_PRICE,
  PLOT_PRICE_STEP,
  PLOT_W,
  REPAIR_PER_GM,
  RIVAL_NAME,
  RIVAL_START,
  ROCK_COST,
  START_PLOTS,
  WEAR_CRANE_PER_MOVE,
  WEAR_SLOWDOWN,
  WEAR_TRUCK_PER_GM,
  PRODUCTS,
  ProductId,
  RTG_CAP,
  RTG_HANDLE,
  RTG_RADIUS,
  ZONES,
  EXPORT_PRESTOCK,
  EXPORT_SHARE,
  FEE_PER_CONTAINER,
  GATE_APRON_CAP,
  GATE_IN_CAP,
  GATE_PROCESS_GM,
  GRID_H,
  GRID_W,
  LEVELS,
  HILL_COST,
  TUNNEL_MUL,
  BRIDGE_MUL,
  PARK_SLOTS,
  EMPTY_IN_COST,
  RAIL_EMPTIES,
  TRAITS,
  TraitId,
  WORLD,
  WorldId,
  POWER_PRICE,
  SOLAR_KW,
  BATTERY_KWH,
  POWER_KW,
  RuleCond,
  RuleAct,
  RULE_CONDS,
  RULE_ACTS,
  MAX_RULES,
  ROAD_SPEED,
  DIST_UNIT,
  ROAD_LANES,
  ROAD_RUN,
  HAZ_FEE,
  HAZ_SHARE,
  EMPTY_FEE,
  FILL_FEE,
  CAP_HAZ,
  CAP_EMPTY,
  HAZ_DIST,
  RAIL_GOODS,
  RAIL_GOODS_MAX,
  SPECS,
  SpecId,
  WAGE_POLICY,
  WagePolicy,
  NIGHT_WAGE,
  NIGHT_SLOW,
  CYCLES,
  CycleKind,
  SEASON_DAYS,
  SEASONS,
  STORAGE_FEE,
  INFLATION_PER_LEVEL,
  BUILD_GM,
  UPGRADE_GM,
  CAP_LOSS,
  CAP_MIN,
  CRASH_RATE,
  OVERHAUL,
  CRANE_MODELS,
  CraneModel,
  TECH,
  TechId,
  GOAL_LEVEL,
  LOAN_LIMIT_PER_LEVEL,
  LOAN_RATE,
  LOAN_STEP,
  MIN_PER_DAY,
  PLANTS,
  PLANT_BUF,
  PlantKind,
  RAIL_CAP,
  RAIL_INTERVAL_GM,
  RAIL_STAY_GM,
  RAIL_TRAVEL_GM,
  REEFER_FEE,
  REEFER_MAX_GM,
  REEFER_SHARE,
  REEFER_SPOIL_PENALTY,
  REFUND,
  REP_MAX,
  ROLES,
  Role,
  ROUTINE_HANDLE,
  ROUTINE_SPEED,
  RUN_COST_PER_DAY,
  sizeOf,
  dimsOf,
  SHIP_LEN,
  SHIP_MAX_STAY_GM,
  SHIP_PATIENCE_GM,
  SHIP_SPEED,
  SHIP_TYPES,
  ShipTypeId,
  START_GM,
  START_REP,
  T,
  TICK_GM,
  TRUCK_CAP,
  TRUCK_HANDLE_GM,
  TRUCK_PATIENCE_GM,
  TruckRole,
  TRUCK_SPEED,
  UNLOCK,
  UPGRADE,
  YARD_CAP_PER_TILE,
} from './data';
import { approach, berthPose, departure, OUT, qOf, qOfWater, qTile, Q_MAX, sideOf, isVertical } from './quay';
import { MISSIONS } from './missions';
import { SCENARIOS } from './scenarios';

/** Import, Kühlfracht (Import) oder Export */
export type Cargo = 'imp' | 'rimp' | 'reef' | 'haz' | 'empty' | 'exp' | 'ware' | 'prem' | 'food';

export interface Shop {
  id: number;
  /** Restliche Bauzeit in Spielminuten (0 = fertig) */
  build?: number;
  buildMax?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  staffed: boolean;
  /** Gerät in Reparatur */
  target: { kind: 'crane' | 'truck'; id: number } | null;
}

export interface Decision {
  id: 'strike' | 'customs' | 'vip' | 'parts' | 'press' | 'spec';
  title: string;
  text: string;
  options: string[];
}

export interface Rtg {
  id: number;
  build?: number;
  buildMax?: number;
  x: number;
  y: number;
  staffed: boolean;
}

export interface Plant {
  id: number;
  /** Leere Container: Eingang der Befüllhalle, Ausgang der Packhalle */
  inEmpty: number;
  emptyOut: number;
  resInE: number;
  resOutE: number;
  build?: number;
  buildMax?: number;
  /** Was die Veredelung herstellt */
  product: ProductId;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlantKind;
  inBuf: number;
  outBuf: number;
  resIn: number;
  resOut: number;
  proc: number;
  made: number;
  zone: number;
}

export interface Crane {
  id: number;
  /** Restliche Bau- oder Umbauzeit in Spielminuten */
  build?: number;
  buildMax?: number;
  /** Höchstzustand 0..1 wie bei einem Akku: Die Werkstatt repariert nur bis hierhin */
  cap: number;
  /** Was der Kran gekostet hat (für Erstattung) */
  paid: number;
  x: number;
  y: number;
  /** Kaiposition (siehe quay.ts) */
  q: number;
  /** Steht auf zwei Kai-Feldern (Containerbrücke oder Super-Brücke) */
  big: boolean;
  model: CraneModel;
  /** Entladene Container am Kran, die auf einen Truck warten */
  buffer: number;
  bufReef: number;
  /** Davon mit Ziel Bahn (Teil von buffer) */
  bufRail: number;
  resOutRail: number;
  bufHaz: number;
  resOutHaz: number;
  resOut: number;
  resOutReef: number;
  /** Export-Container am Kran, die aufs Schiff sollen */
  expBuf: number;
  resExpIn: number;
  cd: number;
  state: 'idle' | 'working' | 'blocked' | 'storm' | 'broken' | 'building' | 'power';
  /** Moves in der laufenden Stunde (für den Leitstand) */
  moves?: number;
  /** Verschleiß 0..1, bei 1 ausgefallen */
  wear: number;
  /** Letzter Zug war ein Beladen (für abwechselndes Ent- und Beladen) */
  lastLoad: boolean;
  zone: number;
  /** Ein Kranführer ist im Dienst */
  staffed: boolean;
}

export interface Gate {
  id: number;
  /** Leercontainer von außen, die auf einen Truck ins Leerlager warten */
  emptyIn: number;
  resOutE: number;
  /** Die laufende Annahme ist ein Leercontainer */
  procEmpty?: boolean;
  build?: number;
  buildMax?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Wartende Container nach draußen, je Eintrag die Gebühr */
  apron: number[];
  resIn: number;
  /** Angekommene Export-Container, die auf einen Truck warten */
  inApron: number;
  resOut: number;
  proc: number;
  procIn: boolean;
  procFee: number;
  lastIn: boolean;
  served: number;
  staffed: boolean;
  zone: number;
}

export interface Rail {
  id: number;
  build?: number;
  buildMax?: number;
  x: number;
  y: number;
  platform: number;
  value: number;
  resIn: number;
  state: 'away' | 'arriving' | 'loading' | 'leaving';
  timer: number;
  zone: number;
  /** Container, die der letzte Zug mitgenommen hat (für die Darstellung) */
  lastLoad: number;
  /** Ware, die ein Zug gebracht hat und die auf Trucks wartet */
  goods: number;
  resOutG: number;
  /** Leercontainer, die ein Zug gebracht hat */
  emptyIn: number;
  resOutE: number;
}

export interface Job {
  cargo: Cargo;
  stage: 0 | 1;
  srcKind: 'crane' | 'store' | 'gate' | 'plant' | 'rail';
  /** Kran-ID, Lagerfeld oder Gate-ID */
  src: number;
  dstKind: 'store' | 'gate' | 'rail' | 'crane' | 'plant';
  dst: number;
  /** Zielfeld (Straße) für Stufe 0 und Stufe 1 */
  tgt: [number, number];
  /** Anzahl Container auf dieser Fahrt */
  n: number;
}

export interface Truck {
  id: number;
  /** Parkplatz-Feld, zu dem der Truck ohne Auftrag fährt (-1 keins), Zufahrt und ob er dort steht */
  parkAt?: number;
  parkTgt?: number;
  parked?: boolean;
  idleFor?: number;
  /** In der Werkstatt zur Generalüberholung (Spielminuten) */
  build?: number;
  buildMax?: number;
  cap: number;
  paid: number;
  tile: number;
  next: number;
  prog: number;
  fx: number;
  fy: number;
  px: number;
  py: number;
  wait: number;
  /** Anzahl geladener Container */
  load: number;
  cargo: Cargo;
  /** Fahrerloses Fahrzeug */
  agv: boolean;
  job: Job | null;
  /** Blickrichtung in Radiant für die Darstellung */
  angle: number;
  /** Fahrtrichtung der belegten Spur: 0 Ost, 1 Süd, 2 West, 3 Nord, -1 noch keine */
  dir: number;
  /** Spielminuten, die der Truck gerade im Stau steht */
  stuck: number;
  /** Spur auf Einbahnstraßen: 0 rechts, 1 links */
  slot: number;
  /** Ein Fahrer ist im Dienst (fahrerlose Fahrzeuge brauchen keinen) */
  staffed: boolean;
  role: TruckRole;
  wear: number;
  zone: number;
}

export type ShipState = 'queued' | 'sailing' | 'unloading' | 'leaving';

export interface Ship {
  id: number;
  name: string;
  line: string;
  color: number;
  type: ShipTypeId;
  len: number;
  state: ShipState;
  x: number;
  y: number;
  px: number;
  py: number;
  /** Liegeplatz als Kaiposition q (siehe quay.ts), -1 ohne */
  berthX: number;
  /** Blickrichtung in Radiant: 0 nach rechts, π/2 nach unten */
  rot: number;
  /** Nächster Wegpunkt beim Einlaufen */
  wp: number;
  /** Normale Import-Container an Bord */
  containers: number;
  /** Kühlcontainer an Bord */
  reefers: number;
  /** Gefahrgut-Container an Bord */
  haz: number;
  /** Import-Ladung bei Ankunft */
  total: number;
  exportLeft: number;
  exportTotal: number;
  loaded: number;
  queuedFor: number;
  atBerth: number;
  /** Zugesagte Liegezeit in Spielminuten */
  dwellTarget: number;
  /** 0 = ohne Vertrag */
  contractId: number;
  reason: string;
  /** Das Schiff kommt nicht voran und braucht die Aufmerksamkeit des Spielers. */
  blocked: boolean;
  /** Vorgezogen: bekommt den nächsten freien Liegeplatz */
  vip?: boolean;
}

export interface Contract {
  id: number;
  line: string;
  prefix: string;
  color: number;
  ship: ShipTypeId;
  reefer: boolean;
  /** Abstand der Anläufe in Spielminuten */
  interval: number;
  calls: number;
  callsTotal: number;
  /** Zugesagte Liegezeit in Spielminuten */
  dwell: number;
  bonus: number;
  penalty: number;
  /** Spielminuten bis zum nächsten Anlauf */
  next: number;
  /** Sonderbedingung: Export muss mitgeladen werden, knappe Liegezeit oder Exklusivität (keine freien Schiffe) */
  cond?: 'export' | 'rush' | 'exclusive';
  /** Verpasste Anläufe in Folge. Beim zweiten kündigt die Reederei. */
  missed?: number;
}

export type Weather = 'clear' | 'storm' | 'fog';

/** Spielstand: läuft, gewonnen, verloren oder ohne Wertung weitergespielt */
export type GameStatus = 'play' | 'won' | 'lost' | 'free';

export type EventTag =
  | 'container'
  | 'export'
  | 'train'
  | 'train-arrive'
  | 'ship-arrived'
  | 'ship-done'
  | 'ship-late'
  | 'ship-cancel'
  | 'mission'
  | 'day'
  | 'level'
  | 'weather-warn'
  | 'weather-start'
  | 'weather-end'
  | 'spoil'
  | 'contract'
  | 'won'
  | 'lost'
  | 'debt'
  | 'decision'
  | 'broken'
  | 'built';

export interface GameEvent {
  /** Text für eine Meldung. Fehlt er, ist das Ereignis nur für Ton und Effekte da. */
  text?: string;
  kind: 'info' | 'good' | 'bad';
  tag?: EventTag;
  /** Ort in Feldern und Betrag in Euro, falls vorhanden. */
  x?: number;
  y?: number;
  amount?: number;
}

export interface DayBook {
  fees: number;
  exportFees: number;
  rail: number;
  berth: number;
  bonus: number;
  penalty: number;
  running: number;
  wages: number;
  interest: number;
  building: number;
  /** Wie viele Ticks welche Stufe heute der Engpass war, und der höchste Stauanteil */
  bn: { crane: number; trucks: number; yard: number; gate: number };
  jamPeak: number;
  /** Stromkosten aus dem Netz */
  power?: number;
  /** Umgeschlagene Container, abgefertigte und pünktliche Schiffe */
  handled: number;
  ships: number;
  onTime: number;
}

export interface Stats {
  crane: number;
  trucks: number;
  yard: number;
  gate: number;
}

export interface BuildCheck {
  ok: boolean;
  reason?: string;
  cost: number;
}

export interface BuildResult extends BuildCheck {
  /** Zustand des Feldes vor einem Straßenausbau (Rückgängig stellt ihn wieder her) */
  prev?: { tier: number; ow: number };
  /** ID des neuen Trucks, damit ein Kauf rückgängig gemacht werden kann. */
  truckId?: number;
}

/** Ein abgerissenes Objekt mit allem, was zum Wiederherstellen nötig ist. */
export interface Removed {
  tool: BuildTool;
  x: number;
  y: number;
  refund: number;
  stock?: number;
  stockExp?: number;
  stockRail?: number;
  use?: number;
  served?: number;
  platform?: number;
  value?: number;
  /** Kran war Containerbrücke, Truck war fahrerlos */
  upgraded?: boolean;
  /** Gebäude war gedreht */
  rot?: boolean;
  /** Straßenart und Einbahnrichtung für Rückgängig */
  tier?: number;
  ow?: number;
  model?: CraneModel;
  paid?: number;
  cap?: number;
  wear?: number;
}

export interface DemolishResult extends BuildCheck {
  removed: Removed[];
}

export interface SaveData {
  v: 1 | 2;
  kind: number[];
  stock: number[];
  stockExp?: number[];
  stockRail?: number[];
  yardUse?: number[];
  depth?: number[];
  cranes: { x: number; y: number; big?: boolean; model?: CraneModel; wear?: number }[];
  shops?: { x: number; y: number }[];
  zone?: number[];
  rtgs?: { x: number; y: number }[];
  market?: Record<ProductId, number>;
  marketPrev?: Record<ProductId, number>;
  products?: ProductId[];
  foodDone?: number;
  scenario?: string | null;
  devs?: { cranes: number[][]; trucks: number[][]; gates: number[]; plants: number[]; rails: number[]; rtgs: number[]; shops: number[] };
  zones?: { cranes: number[]; gates: number[]; plants: number[]; rails: number[]; trucks: number[] };
  oneway?: number[];
  roadTier?: number[];
  roadUnder?: number[];
  closedQ?: number[];
  railX?: number[];
  owned?: number[];
  plotsBought?: number;
  map?: MapId;
  rivalRate?: number;
  lostToRival?: number;
  wageBoost?: Record<Role, number>;
  strikeLeft?: number;
  pending?: Decision | null;
  gates: { x: number; y: number; served: number; rot?: boolean }[];
  rails?: { x: number; y: number; platform: number; value: number }[];
  trucks: { tile: number; agv?: boolean; role?: TruckRole; wear?: number }[];
  plants?: { x: number; y: number; kind: PlantKind; rot?: boolean }[];
  premiumDone?: number;
  money: number;
  rep: number;
  gm: number;
  mission: number;
  level?: number;
  handled?: number;
  exportsLoaded?: number;
  reefersHandled?: number;
  trainsDone?: number;
  bigShipsDone?: number;
  spec?: SpecId | null;
  nightShift?: boolean;
  wagePolicy?: WagePolicy;
  mood?: number;
  xp?: Record<Role, number>;
  cycle?: { kind: CycleKind; left: number };
  usedMarket?: { factor: number; lo: number; hi: number; label: string };
  nextInspect?: number;
  sandbox?: boolean;
  traits?: TraitId[];
  world?: { id: WorldId; left: number; product?: ProductId } | null;
  batteryCharge?: number;
  rules?: { cond: RuleCond; act: RuleAct; on: boolean }[];
  trainLeft?: Record<Role, number>;
  tech?: Partial<Record<TechId, number>>;
  megaDone?: number;
  shipsDone: number;
  shipsOnTime: number;
  containersDone: number;
  seed: number;
  nextShipIn: number;
  contracts?: Contract[];
  offers?: Contract[];
  contractsDone?: number;
  loan?: number;
  debtDays?: number;
  status?: GameStatus;
  endReason?: string;
  diff?: DiffId;
  staff?: Record<Role, number>;
  sick?: Record<Role, number[]>;
  today: Partial<DayBook>;
  history: Partial<DayBook>[];
}

const SHIP_COLORS = [0xd9534f, 0x3b82c4, 0x2f9e6b, 0xe0a030, 0x7a5cc7, 0x2a9d9d];
const SHIP_PREFIX = ['NV', 'KM', 'OR', 'TL'];
const LINES: { line: string; prefix: string; color: number }[] = [
  { line: 'Nordkap Linie', prefix: 'NK', color: 0x3b82c4 },
  { line: 'Kormoran Reederei', prefix: 'KR', color: 0x2f9e6b },
  { line: 'Orca Shipping', prefix: 'OS', color: 0x37474f },
  { line: 'Tidewater Lines', prefix: 'TW', color: 0xd9534f },
  { line: 'Hansa Feeder', prefix: 'HF', color: 0xe0a030 },
  { line: 'Albatros Cargo', prefix: 'AC', color: 0x7a5cc7 },
];
/** Etwas mit Position und optionaler Größe in Feldern */
type Box = { x: number; y: number; w?: number; h?: number };
const covers = (e: Box, x: number, y: number) => x >= e.x && y >= e.y && x < e.x + (e.w ?? 1) && y < e.y + (e.h ?? 1);

const UNLOADING = 'Wird entladen.';
const LOADING = 'Wird beladen.';
const emptyBook = (): DayBook => ({ fees: 0, exportFees: 0, rail: 0, berth: 0, bonus: 0, penalty: 0, running: 0, wages: 0, interest: 0, building: 0, handled: 0, ships: 0, onTime: 0, bn: { crane: 0, trucks: 0, yard: 0, gate: 0 }, jamPeak: 0, power: 0 });
const TILE_OF: Partial<Record<BuildTool, T>> = { kai: T.Kai, road: T.Road, yard: T.Yard, road2: T.Road, hwy: T.Road, solar: T.Solar, battery: T.Battery, track: T.Track, parking: T.Parking, reefer: T.Reefer, hazard: T.Hazmat, emptyyard: T.Empty, fill: T.Plant, gate: T.Gate, rail: T.Rail, unpack: T.Plant, pack: T.Plant, cold: T.Plant, workshop: T.Shop };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const eur = (n: number) => `${Math.round(n).toLocaleString('de-DE')} €`;

export class Sim {
  readonly w = GRID_W;
  readonly h = GRID_H;
  kind = new Uint8Array(GRID_W * GRID_H);
  /** Import-Container auf Stapelplatz-Feldern, Kühlcontainer auf Kühlplätzen */
  stock = new Uint16Array(GRID_W * GRID_H);
  /** Export-Container auf Stapelplatz-Feldern */
  stockExp = new Uint16Array(GRID_W * GRID_H);
  private resIn = new Int16Array(GRID_W * GRID_H);
  private resOut = new Int16Array(GRID_W * GRID_H);
  private resOutExp = new Int16Array(GRID_W * GRID_H);
  /** Import-Container mit Ziel Bahn (Teil von stock) und ihre Abholreservierungen */
  stockRail = new Uint16Array(GRID_W * GRID_H);
  private resOutRail = new Int16Array(GRID_W * GRID_H);
  /** Zweck eines Stapelfelds: 0 gemischt, 1 Straße, 2 Bahn, 3 Export */
  yardUse = new Uint8Array(GRID_W * GRID_H);
  /** Ankunftszeiten der Kühlcontainer je Kühlplatz (älteste zuerst) */
  private reefTimes = new Map<number, number[]>();
  /** Zone je Lagerfeld (0 = keine) */
  zone = new Uint8Array(GRID_W * GRID_H);
  /** Ausgebaggerte Spalten vor dem Kai (1 = tief) */
  /** Ausgebaggert vor der Kaiposition q (siehe quay.ts) */
  depth = new Uint8Array(Q_MAX);

  cranes: Crane[] = [];
  gates: Gate[] = [];
  rails: Rail[] = [];
  plants: Plant[] = [];
  shops: Shop[] = [];
  rtgs: Rtg[] = [];
  /** Preisfaktor je Ware, 1 = Grundpreis */
  market: Record<ProductId, number> = { elec: 1, cloth: 1, food: 1 };
  marketPrev: Record<ProductId, number> = { elec: 1, cloth: 1, food: 1 };
  foodDone = 0;
  /** Laufendes Szenario oder null für ein freies Spiel */
  scenario: string | null = null;
  /** Einbahnstraßen: erlaubte Fahrtrichtung je Feld (0 Ost, 1 Süd, 2 West, 3 Nord), -1 = beide Richtungen */
  oneway = new Int8Array(GRID_W * GRID_H).fill(-1);
  /** Straßenart je Feld: 0 Straße, 1 Doppelspur, 2 Autobahn */
  roadTier = new Uint8Array(GRID_W * GRID_H);
  /** Bahnübergang: Straße über einem Gleis */
  railX = new Uint8Array(GRID_W * GRID_H);
  /** Unter der Straße: 0 Land, 1 Hügel (Tunnel), 2 Wasser (Brücke) */
  roadUnder = new Uint8Array(GRID_W * GRID_H);
  /** Gekaufte Spalten (1 = gehört dir) */
  owned = new Uint8Array(GRID_W).fill(1);
  plotsBought = 0;
  rivalRate = 0.68;
  lostToRival = 0;
  wageBoost: Record<Role, number> = { driver: 1, crane: 1, gate: 1, mech: 1 };
  /** Spielminuten, die die Fahrer noch streiken */
  strikeLeft = 0;
  pending: Decision | null = null;
  private brokeNote = -999;
  premiumDone = 0;
  loan = 0;
  /** Tagesabschlüsse in Folge mit negativem Kontostand */
  debtDays = 0;
  status: GameStatus = 'play';
  endReason = '';
  trucks: Truck[] = [];
  ships: Ship[] = [];
  contracts: Contract[] = [];
  offers: Contract[] = [];

  money: number;
  /** Angestellte je Aufgabe */
  staff: Record<Role, number> = { driver: 0, crane: 0, gate: 0, mech: 0 };
  /** Krankmeldungen je Aufgabe: verbleibende Tage */
  sick: Record<Role, number[]> = { driver: [], crane: [], gate: [], mech: [] };
  rep = START_REP;
  gm = START_GM;
  tickCount = 0;
  mission = 0;
  /** Hafenstufe ab 1 */
  level = 1;
  /** Insgesamt umgeschlagene Container (Import raus, Export aufs Schiff) */
  handled = 0;
  shipsDone = 0;
  shipsOnTime = 0;
  bigShipsDone = 0;
  megaDone = 0;
  containersDone = 0;
  exportsLoaded = 0;
  reefersHandled = 0;
  trainsDone = 0;
  contractsDone = 0;
  nextShipIn = 20;

  weather: Weather = 'clear';
  weatherLeft = 0;
  forecast: { kind: Exclude<Weather, 'clear'>; in: number; dur: number; warned: boolean } | null = null;

  today: DayBook = emptyBook();
  history: DayBook[] = [];
  stats: Stats = { crane: 0, trucks: 0, yard: 0, gate: 0 };
  /** Anteil der Trucks, die im Stau stehen (geglättet) */
  jamShare = 0;
  events: GameEvent[] = [];
  /** Wird bei jeder Bauänderung erhöht, damit der Renderer neu zeichnet. */
  version = 0;
  /** Nächster Kran oder Truck wird gebraucht gekauft. Nur Bedienung, wird nicht gespeichert. */
  used = false;
  private firstOffers = false;
  /** Gekaufte Verbesserungen: Stufe je Verbesserung */
  tech: Record<TechId, number> = { spreader: 0, scanner: 0, stack: 0, sales: 0, radio: 0, engine: 0, cool: 0, maint: 0, akkord: 0, diesel: 0 };
  /** Gewählte Spezialisierung (ab Stufe 3) */
  spec: SpecId | null = null;
  /** Nachtschicht an: rund um die Uhr volle Leistung, dafür Lohnzuschlag */
  nightShift = true;
  wagePolicy: WagePolicy = 'normal';
  /** Stimmung der Belegschaft 0..1 */
  mood = 0.6;
  /** Erfahrung je Rolle 0..1: wächst mit der Zeit, neue Leute verdünnen sie */
  xp: Record<Role, number> = { driver: 0.4, crane: 0.4, gate: 0.4, mech: 0.4 };
  cycle: { kind: CycleKind; left: number } = { kind: 'normal', left: 6 };
  /** Heutiges Gebrauchtangebot: Preisfaktor und Spanne des Höchstzustands */
  usedMarket = { factor: 0.5, lo: 0.5, hi: 0.75, label: 'Durchschnittliche Ware' };
  nextInspect = 12;
  /** Sandbox: frei bauen, keine Frist, keine Pleite */
  sandbox = false;
  /** Wie oft umgestapelt werden musste (Leitstand) */
  restacks = 0;
  /** Zwei Besonderheiten dieses Hafens */
  traits: TraitId[] = [];
  /** Laufendes Weltereignis */
  world: { id: WorldId; left: number; product?: ProductId } | null = null;
  /** Ladung aller Batterien in kWh */
  batteryCharge = 0;
  /** Spielminuten, die ein Stromausfall noch dauert */
  powerOutLeft = 0;
  /** Bei Stromausfall und leerer Batterie stehen Kräne und Hallen */
  powerDown = false;
  /** Regeln für den Leitstand */
  rules: { cond: RuleCond; act: RuleAct; on: boolean }[] = [];
  /** Stündliche Messwerte der letzten 48 Stunden (nicht gespeichert) */
  hourly: { yard: number; wait: number; idle: number; jam: number; kw: number; solar: number; done: number }[] = [];
  /** Moves pro Stunde je Kran und Abfertigungen je Gate (letzte 24 Stunden) */
  craneHist = new Map<number, number[]>();
  gateHist = new Map<number, number[]>();
  private gateLast = new Map<number, number>();
  private doneLast = 0;
  /** Tage, die eine Weiterbildung noch läuft (eine Kraft fehlt) */
  trainLeft: Record<Role, number> = { driver: 0, crane: 0, gate: 0, mech: 0 };
  /** Gebäude beim nächsten Bauen gedreht (Breite und Höhe getauscht). Nur Bedienung, wird nicht gespeichert. */
  rot = false;

  private nextId = 1;
  private seed: number;
  private distCache = new Map<number, Int16Array>();
  private yardTiles: number[] = [];
  private reeferTiles: number[] = [];
  private hazTiles: number[] = [];
  private emptyTiles: number[] = [];
  /** Belegte Fahrspuren: je Straßenfeld eine Spur pro Fahrtrichtung, darauf passt ein Truck */
  private lane = new Uint8Array(GRID_W * GRID_H * 4);
  /** Wie stark sich der Verkehr auf einem Feld zuletzt gestaut hat (klingt von selbst ab) */
  roadJam = new Float32Array(GRID_W * GRID_H);
  private lastDay: number;
  private exportNeed = 0;
  private spoilNote = 0;

  constructor(
    seed = 1234,
    readonly diff: DiffId = 'normal',
    readonly map: MapId = 'coast',
  ) {
    this.seed = seed >>> 0;
    this.money = DIFFS[diff].money + MAPS[map].bonus;
    this.rivalRate = RIVAL_START[diff];
    this.lastDay = Math.floor(this.gm / MIN_PER_DAY);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        let k = y < COAST_ROW ? T.Water : T.Land;
        if (map === 'island' && (x < 2 || x >= GRID_W - 2 || y >= GRID_H - 3)) k = T.Water;
        this.kind[y * GRID_W + x] = k;
      }
    }
    // Hügel (eigene Höhenebene): an der Küste weit hinten, am Fluss überall verteilt
    if (map === 'coast' || map === 'river') {
      const h = (a: number, b: number) => {
        let v = (a * 374761393 + b * 668265263 + this.seed * 2246822519) >>> 0;
        v = Math.imul(v ^ (v >>> 13), 1274126177) >>> 0;
        return (v ^ (v >>> 16)) / 4294967296;
      };
      const count = map === 'river' ? 5 : 3;
      for (let n = 0; n < count; n++) {
        const cx = 3 + Math.floor(h(n, 1) * (GRID_W - 6));
        const cy = (map === 'river' ? COAST_ROW + 5 : GRID_H - 8) + Math.floor(h(n, 2) * (map === 'river' ? GRID_H - COAST_ROW - 8 : 5));
        const r = 1.6 + h(n, 3) * 1.6;
        for (let y = Math.floor(cy - r); y <= cy + r; y++) {
          for (let x = Math.floor(cx - r); x <= cx + r; x++) {
            if (!this.inBounds(x, y) || y <= COAST_ROW + 3 || Math.hypot(x - cx, y - cy) > r) continue;
            this.kind[y * GRID_W + x] = T.Hill;
          }
        }
      }
    }
    // Fluss: zwei Felder breit von der See nach Süden durchs Land
    if (map === 'river') {
      for (let y = COAST_ROW; y < GRID_H; y++) {
        const wob = Math.round(Math.sin(y * 0.55 + (this.seed % 7)) * 1.2);
        for (const x of [17 + wob, 18 + wob]) this.kind[y * GRID_W + x] = T.Water;
      }
    }
    if (map === 'rocks') {
      // Felsbrocken in Gruppen, die erste Reihe am Wasser bleibt frei
      for (let n = 0; n < 26; n++) {
        const cx = Math.floor(this.rnd() * GRID_W);
        const cy = COAST_ROW + 2 + Math.floor(this.rnd() * (GRID_H - COAST_ROW - 2));
        const r = 1 + this.rnd() * 1.6;
        for (let y = Math.floor(cy - r); y <= cy + r; y++) {
          for (let x = Math.floor(cx - r); x <= cx + r; x++) {
            if (!this.inBounds(x, y) || y <= COAST_ROW + 1 || Math.hypot(x - cx, y - cy) > r || this.rnd() < 0.25) continue;
            this.kind[y * GRID_W + x] = T.Rock;
          }
        }
      }
    }
  }

  /** Gibt nur die ersten Landstreifen frei. Streifen mit Bebauung bleiben in Besitz. */
  limitLand() {
    for (let p = START_PLOTS; p * PLOT_W < GRID_W; p++) {
      let used = false;
      for (let x = p * PLOT_W; x < Math.min(GRID_W, (p + 1) * PLOT_W); x++) {
        for (let y = COAST_ROW; y < GRID_H; y++) {
          const k = this.kind[this.idx(x, y)];
          if (k !== T.Land && k !== T.Water && k !== T.Rock && k !== T.Hill) used = true;
        }
      }
      if (used) continue;
      for (let x = p * PLOT_W; x < Math.min(GRID_W, (p + 1) * PLOT_W); x++) this.owned[x] = 0;
    }
    this.version++;
  }

  get plotPrice(): number {
    return Math.round((PLOT_PRICE + this.plotsBought * PLOT_PRICE_STEP) * (this.traits.includes('cheapland') ? 0.6 : 1));
  }
  buyPlot(x: number): BuildCheck {
    const cost = this.plotPrice;
    if (x < 0 || x >= GRID_W) return { ok: false, reason: 'Außerhalb der Karte', cost };
    if (this.owned[x]) return { ok: false, reason: 'Dieses Land gehört dir schon', cost };
    if (this.money < cost) return { ok: false, reason: 'Zu wenig Geld', cost };
    const p = Math.floor(x / PLOT_W);
    for (let c = p * PLOT_W; c < Math.min(GRID_W, (p + 1) * PLOT_W); c++) this.owned[c] = 1;
    this.money -= cost;
    this.today.building += cost;
    this.plotsBought++;
    this.touch();
    return { ok: true, cost };
  }

  /** Gibt einem Lagerfeld oder dem Gerät/Gebäude auf dem Feld eine Zone. */
  setZone(x: number, y: number, z: number): BuildCheck {
    const fail: BuildCheck = { ok: false, reason: 'Zonen gibt es für Lagerflächen, Kräne, Gates, Hallen, Gleise und Trucks', cost: 0 };
    if (!this.inBounds(x, y)) return fail;
    const i = this.idx(x, y);
    const k = this.kind[i];
    const t = this.truckAtTile(i);
    const ent = this.craneAt(x, y) ?? this.gateAt(x, y) ?? this.plantAt(x, y) ?? this.railAt(x, y) ?? t;
    if (k === T.Yard || k === T.Reefer || k === T.Hazmat || k === T.Empty) {
      if (this.zone[i] === z) return { ok: true, cost: 0 };
      this.zone[i] = z;
    } else if (ent) {
      if (ent.zone === z) return { ok: true, cost: 0 };
      ent.zone = z;
    } else return fail;
    this.touch();
    // Laufende Fahrten, die jetzt nicht mehr passen, werden neu vergeben
    for (const tr of this.trucks) if (tr.job && tr.job.stage === 0 && !this.jobZoneOk(tr, tr.job)) this.cancelJob(tr);
    return { ok: true, cost: 0 };
  }

  /** Übersicht je Zone: was dazugehört und was dem Kreislauf fehlt */
  zoneReport(): { z: number; cranes: number; trucks: number; yard: number; reefer: number; gates: number; rails: number; plants: number; problems: string[] }[] {
    const used = new Set<number>();
    for (const e of [...this.cranes, ...this.gates, ...this.plants, ...this.rails, ...this.trucks]) if (e.zone) used.add(e.zone);
    for (const i of [...this.yardTiles, ...this.reeferTiles, ...this.hazTiles, ...this.emptyTiles]) if (this.zone[i]) used.add(this.zone[i]);
    if (used.size === 0) return [];
    const free = this.trucks.filter((t) => t.zone === 0).length;
    const out = [];
    for (const z of [...used, 0].sort((a, b) => (a || 9) - (b || 9))) {
      const r = {
        z,
        cranes: this.cranes.filter((c) => c.zone === z).length,
        trucks: this.trucks.filter((t) => t.zone === z).length,
        yard: [...this.yardTiles, ...this.hazTiles, ...this.emptyTiles].filter((i) => this.zone[i] === z).length,
        reefer: this.reeferTiles.filter((i) => this.zone[i] === z).length,
        gates: this.gates.filter((g) => g.zone === z).length,
        rails: this.rails.filter((q) => q.zone === z).length,
        plants: this.plants.filter((p) => p.zone === z).length,
        problems: [] as string[],
      };
      const any = r.cranes + r.yard + r.reefer + r.gates + r.rails + r.plants > 0;
      if (!any && z === 0) continue;
      if (any && (z === 0 ? r.trucks : r.trucks + free) === 0) r.problems.push(z === 0 ? 'Kein Truck ohne Zone: Trucks mit Zone fahren nur in ihrer Zone.' : 'Kein Truck fährt hier.');
      if (r.cranes > 0 && r.yard + r.reefer === 0) r.problems.push('Kräne, aber kein Lager: entladene Container kommen nicht weg.');
      if (r.yard + r.reefer > 0 && r.gates + r.rails === 0) r.problems.push('Kein Ausgang: Male ein Gate oder die Bahn in dieser Zone an.');
      if (r.gates > 0 && r.yard + r.reefer === 0 && r.plants === 0) r.problems.push('Gate ohne Lager in derselben Zone.');
      if (r.yard + r.reefer > 0 && r.cranes === 0 && r.plants === 0) r.problems.push('Lager ohne Kran: Hier kommt nichts an.');
      if (!any && r.trucks > 0) r.problems.push('Trucks ohne Aufgabe: In dieser Zone steht nichts.');
      out.push(r);
    }
    return out;
  }
  /** Setzt alle Zonen zurück */
  clearZones() {
    this.zone.fill(0);
    for (const e of [...this.cranes, ...this.gates, ...this.plants, ...this.rails, ...this.trucks]) e.zone = 0;
    this.invalidateJobs();
    this.version++;
  }

  private zoneOf(kind: Job['srcKind'] | Job['dstKind'], id: number): number {
    if (kind === 'store') return this.zone[id];
    const e = kind === 'crane' ? this.cranes.find((c) => c.id === id) : kind === 'gate' ? this.gates.find((g) => g.id === id) : kind === 'plant' ? this.plants.find((p) => p.id === id) : this.rails.find((r) => r.id === id);
    return e?.zone ?? 0;
  }
  private jobZoneOk(t: Truck, j: Job): boolean {
    const a = this.zoneOf(j.srcKind, j.src);
    const b = this.zoneOf(j.dstKind, j.dst);
    return a === b && (t.zone === 0 || t.zone === a);
  }

  /** Schaltet eine Straße weiter: beide Richtungen, Ost, Süd, West, Nord. */
  toggleOneway(x: number, y: number): BuildCheck {
    if (!this.inBounds(x, y) || this.kind[this.idx(x, y)] !== T.Road) return { ok: false, reason: 'Einbahnstraße geht nur auf einer Straße', cost: 0 };
    const i = this.idx(x, y);
    if (this.roadTier[i] === 2) return { ok: false, reason: 'Die Autobahn hat eine feste Richtung', cost: 0 };
    this.oneway[i] = this.oneway[i] >= 3 ? -1 : this.oneway[i] + 1;
    this.touch();
    return { ok: true, cost: 0 };
  }

  /** Setzt eine Einbahnrichtung direkt (0 Ost, 1 Süd, 2 West, 3 Nord) */
  setOneway(x: number, y: number, dir: number) {
    if (this.inBounds(x, y) && this.kind[this.idx(x, y)] === T.Road) {
      this.oneway[this.idx(x, y)] = dir;
      this.touch();
    }
  }

  // ───────────────────────── Hilfen ─────────────────────────

  idx(x: number, y: number): number {
    return y * GRID_W + x;
  }
  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;
  }
  private rnd(): number {
    // mulberry32
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  private pick<V>(list: readonly V[]): V {
    return list[Math.floor(this.rnd() * list.length)];
  }
  private emit(text: string | undefined, kind: GameEvent['kind'] = 'info', extra: Partial<GameEvent> = {}) {
    this.events.push({ text, kind, ...extra });
  }
  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
  get day(): number {
    return Math.floor(this.gm / MIN_PER_DAY) + 1;
  }
  get clock(): string {
    return this.clockAt(this.gm);
  }
  clockAt(gm: number): string {
    const m = Math.floor(((gm % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }
  get yardCapacity(): number {
    return this.yardTiles.reduce((n, i) => n + this.capAt(i), 0);
  }
  /** Stellplätze auf einem Lagerfeld: mehr, wenn ein besetzter Portalkran in der Nähe steht */
  capAt(i: number): number {
    const k = this.kind[i];
    if (k === T.Hazmat) return CAP_HAZ;
    if (k === T.Empty) return CAP_EMPTY + this.tech.stack;
    return (this.rtgCovers(i) ? RTG_CAP : YARD_CAP_PER_TILE) + this.tech.stack;
  }
  rtgCovers(i: number): boolean {
    const x = i % GRID_W;
    const y = (i / GRID_W) | 0;
    return this.rtgs.some((r) => r.staffed && !r.build && Math.abs(r.x - x) <= RTG_RADIUS && Math.abs(r.y - y) <= RTG_RADIUS);
  }
  rtgAt(x: number, y: number): Rtg | undefined {
    return this.rtgs.find((r) => r.x === x && r.y === y);
  }
  /** Aktueller Verkaufspreis einer Ware */
  price(p: ProductId): number {
    let m = this.market[p];
    const si = this.season.index;
    if (p === 'cloth' && si === 0) m *= 1.15;
    if (p === 'elec' && si === 2) m *= 1.2;
    if (p === 'food' && si === 3) m *= 1.1;
    if (this.spec === 'logi' && p !== 'food') m *= 1.1;
    if (this.spec === 'cold' && p === 'food') m *= 1.15;
    if (this.world?.id === 'embargo' && this.world.product === p) m *= 0.6;
    return Math.round((PRODUCTS[p].base * m) / 10) * 10;
  }
  /** Alle Container auf dem Stapelplatz (Import und Export) */
  get yardStock(): number {
    let s = 0;
    for (const i of this.yardTiles) s += this.stock[i] + this.stockExp[i];
    return s;
  }
  get reeferCapacity(): number {
    return this.reeferTiles.reduce((n, i) => n + this.capAt(i), 0);
  }
  get reeferStock(): number {
    let s = 0;
    for (const i of this.reeferTiles) s += this.stock[i];
    return s;
  }
  get yardTileList(): readonly number[] {
    return this.yardTiles;
  }
  get reeferTileList(): readonly number[] {
    return this.reeferTiles;
  }
  get hazTileList(): readonly number[] {
    return this.hazTiles;
  }
  get emptyTileList(): readonly number[] {
    return this.emptyTiles;
  }
  get hazCapacity(): number {
    return this.hazTiles.reduce((n, i) => n + this.capAt(i), 0);
  }
  get hazStock(): number {
    return this.hazTiles.reduce((n, i) => n + this.stock[i], 0);
  }
  get emptyCapacity(): number {
    return this.emptyTiles.reduce((n, i) => n + this.capAt(i), 0);
  }
  get emptyStock(): number {
    return this.emptyTiles.reduce((n, i) => n + this.stock[i], 0);
  }
  /** Lagerart zu einer Ware */
  static storeOf(c: Cargo): T {
    return c === 'reef' ? T.Reefer : c === 'haz' ? T.Hazmat : c === 'empty' ? T.Empty : T.Yard;
  }
  get levelName(): string {
    return LEVELS[this.level - 1].name;
  }
  get maxContracts(): number {
    return LEVELS[this.level - 1].contracts;
  }
  /** Fortschritt zur nächsten Stufe (0..1), 1 auf der höchsten Stufe */
  get levelProgress(): number {
    const next = LEVELS[this.level];
    if (!next) return 1;
    const base = LEVELS[this.level - 1].need;
    return Math.min(1, Math.max(0, (this.handled - base) / (next.need - base)));
  }
  moveTime(c: Crane): number {
    const spec = this.spec === 'hub' ? 1.15 : this.spec === 'logi' ? 0.95 : 1;
    return CRANE_MODELS[c.model].move / (1 + 0.1 * this.tech.spreader) / (this.tech.akkord ? 1.2 : 1) / spec / this.eff('crane') / (1 - WEAR_SLOWDOWN * Math.min(1, c.wear));
  }
  /** Ältester Kühlcontainer auf einem Kühlplatz: verbleibende Spielminuten, oder null */
  reeferTimeLeft(tile: number): number | null {
    const q = this.reefTimes.get(tile);
    return q && q.length ? this.reeferMax - (this.gm - q[0]) : null;
  }

  /** Straßenfelder, die direkt (4er-Nachbarschaft) an Feld `i` grenzen. */
  adjRoad(i: number): number[] {
    const x = i % GRID_W;
    const y = (i / GRID_W) | 0;
    const out: number[] = [];
    // Autobahnen haben keine Zufahrt zu Gebäuden: Wer lädt, hält auf einer normalen Straße
    const ok = (n: number) => this.kind[n] === T.Road && this.roadTier[n] < 2;
    if (x > 0 && ok(i - 1)) out.push(i - 1);
    if (x < GRID_W - 1 && ok(i + 1)) out.push(i + 1);
    if (y > 0 && ok(i - GRID_W)) out.push(i - GRID_W);
    if (y < GRID_H - 1 && ok(i + GRID_W)) out.push(i + GRID_W);
    return out;
  }

  /** Abstandskarte (in Feldern) über das Straßennetz zum Zielfeld. -1 = nicht erreichbar. */
  /** Brücken nur über Wasser im Land: nicht in der See und nicht im Fahrwasser an den Inselküsten */
  bridgeable(x: number, y: number): boolean {
    return this.kind[this.idx(x, y)] === T.Water && y > COAST_ROW && x >= 2 && x <= GRID_W - 3 && y <= GRID_H - 4;
  }
  /** Liegt ab (x, y) bis zum rechten Kartenrand durchgehend Gleis (oder ein Bahnübergang)? */
  trackToEdge(x: number, y: number): boolean {
    for (let xx = x; xx < GRID_W; xx++) {
      const i = this.idx(xx, y);
      if (this.kind[i] !== T.Track && !(this.kind[i] === T.Road && this.railX[i])) return false;
    }
    return true;
  }
  /** Ist der Gleisanschluss mit dem Netz verbunden? */
  railLinked(r: Rail): boolean {
    return r.x === GRID_W - 1 || this.trackToEdge(r.x + 1, r.y);
  }
  /** Wie viele Leercontainer von außen gebraucht werden (für die Befüllhalle) */
  emptiesWanted(): number {
    if (!this.emptyCapacity || !this.plants.some((p) => p.kind === 'fill' && !p.build)) return 0;
    let incoming = 0;
    for (const g of this.gates) incoming += g.emptyIn;
    for (const r of this.rails) incoming += r.emptyIn;
    return Math.max(0, Math.floor(this.emptyCapacity * 0.5) - this.emptyStock - incoming);
  }
  /** Straßenfelder am unteren oder linken Kartenrand: Anschluss ans Hinterland */
  hinterlandExits(): number[] {
    const out: number[] = [];
    for (let x = 0; x < GRID_W; x++) {
      const i = this.idx(x, GRID_H - 1);
      if (this.kind[i] === T.Road) out.push(i);
    }
    for (let y = COAST_ROW; y < GRID_H - 1; y++) {
      const i = this.idx(0, y);
      if (this.kind[i] === T.Road) out.push(i);
    }
    return out;
  }
  private hlCache: { v: number; m: Map<number, number> } = { v: -1, m: new Map() };
  /** Tempo eines Gates: mit Straße ins Hinterland +30 %, mit Autobahn-Anschluss +50 % */
  hinterlandMul(g: Gate): number {
    if (this.hlCache.v !== this.version) this.hlCache = { v: this.version, m: new Map() };
    const hit = this.hlCache.m.get(g.id);
    if (hit !== undefined) return hit;
    let m = 1;
    const acc = this.accessOf(g);
    for (const e of this.hinterlandExits()) {
      const d = this.distMap(e);
      if (acc.some((a) => d[a] >= 0)) m = Math.max(m, this.roadTier[e] === 2 ? 1.5 : 1.3);
    }
    this.hlCache.m.set(g.id, m);
    return m;
  }

  /** Anteil der Import-Container, die mit der Bahn weiter sollen */
  get railShare(): number {
    return this.rails.some((r) => !r.build && this.railLinked(r)) ? 0.35 : 0;
  }
  /** Lagerzweck setzen (0 gemischt, 1 Straße, 2 Bahn, 3 Export) */
  setYardUse(x: number, y: number, use: number): BuildCheck {
    if (!this.inBounds(x, y) || this.kind[this.idx(x, y)] !== T.Yard) return { ok: false, reason: 'Lagerzweck gibt es nur auf Stapelplätzen', cost: 0 };
    this.yardUse[this.idx(x, y)] = use;
    this.version++;
    return { ok: true, cost: 0 };
  }
  /** Container auf einem Feld, die beim Abholen von `cargo` im Weg stehen */
  private othersOn(tile: number, cargo: Cargo): number {
    const imp = this.stock[tile] - this.stockRail[tile];
    if (cargo === 'imp') return this.stockRail[tile] + this.stockExp[tile];
    if (cargo === 'rimp') return imp + this.stockExp[tile];
    if (cargo === 'exp') return this.stock[tile];
    return 0;
  }

  /** Kosten, ein Feld zu befahren, in Zehnteln einer Normalstraße: Autobahnen sind schneller. */
  stepCost(tile: number): number {
    return Math.round(DIST_UNIT / ROAD_SPEED[this.roadTier[tile]]);
  }

  /** Fahrzeit-Karte über das Straßennetz zum Zielfeld (Dijkstra, in Zehnteln eines Feldes). -1 = nicht erreichbar. */
  distMap(target: number): Int16Array {
    let d = this.distCache.get(target);
    if (d) return d;
    d = new Int16Array(GRID_W * GRID_H).fill(-1);
    if (this.kind[target] === T.Road) {
      // Kleiner Binärhaufen aus [Kosten, Feld]
      const heap: number[] = [];
      const push = (cost: number, node: number) => {
        let k = heap.length;
        heap.push(cost * 4096 + node);
        while (k > 0) {
          const p = (k - 1) >> 1;
          if (heap[p] <= heap[k]) break;
          [heap[p], heap[k]] = [heap[k], heap[p]];
          k = p;
        }
      };
      const pop = (): number => {
        const top = heap[0];
        const last = heap.pop()!;
        if (heap.length) {
          heap[0] = last;
          let k = 0;
          for (;;) {
            const l = 2 * k + 1;
            const r = l + 1;
            let m = k;
            if (l < heap.length && heap[l] < heap[m]) m = l;
            if (r < heap.length && heap[r] < heap[m]) m = r;
            if (m === k) break;
            [heap[m], heap[k]] = [heap[k], heap[m]];
            k = m;
          }
        }
        return top;
      };
      d[target] = 0;
      push(0, target);
      const done = new Uint8Array(d.length);
      while (heap.length) {
        const top = pop();
        const c = top % 4096;
        const cost = (top - c) / 4096;
        if (done[c]) continue;
        done[c] = 1;
        const cx = c % GRID_W;
        const cy = (c / GRID_W) | 0;
        // Von n nach c wird in Richtung dir gefahren: n westlich von c heißt Fahrt nach Osten usw.
        const cand = [cx > 0 ? c - 1 : -1, cx < GRID_W - 1 ? c + 1 : -1, cy > 0 ? c - GRID_W : -1, cy < GRID_H - 1 ? c + GRID_W : -1];
        const dirs = [0, 2, 1, 3];
        for (let ci = 0; ci < 4; ci++) {
          const n = cand[ci];
          if (n < 0 || done[n] || !this.canStep(n, c, dirs[ci])) continue;
          const nc = cost + this.stepCost(c);
          if (d[n] < 0 || nc < d[n]) {
            d[n] = nc;
            push(nc, n);
          }
        }
      }
    }
    this.distCache.set(target, d);
    return d;
  }

  /** Darf ein Truck von Feld n nach Feld c fahren (Richtung dir)? Beachtet Einbahnen. */
  canStep(n: number, c: number, dir: number): boolean {
    const ow = this.oneway;
    return this.kind[n] === T.Road && this.kind[c] === T.Road && (ow[n] < 0 || ow[n] === dir) && (ow[c] < 0 || ow[c] !== (dir + 2) % 4);
  }

  private touch() {
    this.version++;
    this.distCache.clear();
    this.storeAccCache = null;
    this.yardTiles = [];
    this.reeferTiles = [];
    this.hazTiles = [];
    this.emptyTiles = [];
    for (let i = 0; i < this.kind.length; i++) {
      if (this.kind[i] === T.Yard) this.yardTiles.push(i);
      else if (this.kind[i] === T.Reefer) this.reeferTiles.push(i);
      else if (this.kind[i] === T.Hazmat) this.hazTiles.push(i);
      else if (this.kind[i] === T.Empty) this.emptyTiles.push(i);
    }
  }

  /** Kran auf dem Feld. Eine Containerbrücke steht auf zwei Kai-Feldern. */
  craneAt(x: number, y: number): Crane | undefined {
    return this.cranes.find((c) => (c.x === x && c.y === y) || (c.big && this.sameTile(qTile(this.cq(c) + 1), x, y)));
  }
  private sameTile(t: [number, number] | null, x: number, y: number): boolean {
    return !!t && t[0] === x && t[1] === y;
  }
  /** Platz unter dem Kran für entladene (bzw. Export-) Container */
  bufCap(c: Crane, exp = false): number {
    const b = CRANE_MODELS[c.model].buffer;
    return exp && !c.big ? Math.min(b, CRANE_EXP_BUFFER) : b;
  }
  /** Kaiposition eines Krans */
  cq(c: { x: number; y: number; q?: number }): number {
    return c.q ?? qOf(c.x, c.y);
  }
  /** Zweites Feld, das eine Containerbrücke braucht, wenn sie frei ist */
  bridgeRoom(c: Crane): boolean {
    const t = qTile(this.cq(c) + 1);
    return !!t && this.isKai(this.cq(c) + 1) && !this.craneAt(t[0], t[1]);
  }
  /** Größe eines Schiffs in Feldern (liegt waagerecht oder senkrecht) */
  shipBox(s: Ship): { x: number; y: number; w: number; h: number } {
    const vert = Math.abs(Math.sin(s.rot)) > 0.5;
    return vert ? { x: s.x, y: s.y, w: 2, h: s.len } : { x: s.x, y: s.y, w: s.len, h: 2 };
  }
  gateAt(x: number, y: number): Gate | undefined {
    return this.gates.find((g) => covers(g, x, y));
  }
  plantAt(x: number, y: number): Plant | undefined {
    return this.plants.find((p) => covers(p, x, y));
  }
  shopAt(x: number, y: number): Shop | undefined {
    return this.shops.find((p) => covers(p, x, y));
  }
  /** Alle Felder eines Gebäudes */
  footprintOf(e: Box): number[] {
    const out: number[] = [];
    for (let y = e.y; y < e.y + (e.h ?? 1); y++) for (let x = e.x; x < e.x + (e.w ?? 1); x++) out.push(this.idx(x, y));
    return out;
  }
  /** Straßenfelder rund um ein Gebäude */
  accessOf(e: Box): number[] {
    const set = new Set<number>();
    for (const i of this.footprintOf(e)) for (const r of this.adjRoad(i)) set.add(r);
    return [...set];
  }
  setRole(id: number, role: TruckRole) {
    const t = this.trucks.find((t) => t.id === id);
    if (t) t.role = role;
  }
  railAt(x: number, y: number): Rail | undefined {
    return this.rails.find((r) => r.x === x && r.y === y);
  }
  truckAtTile(tile: number): Truck | undefined {
    return this.trucks.find((t) => t.tile === tile);
  }
  /** Liegt an Kaiposition q eine Kaimauer? */
  isKai(q: number): boolean {
    const t = qTile(q);
    return !!t && this.kind[this.idx(t[0], t[1])] === T.Kai;
  }

  /** x-Anfang aller kleinen Liegeplätze (4 Kai-Felder in Folge), ohne Überlappung, von links. */
  private berthCache: { v: number; list: number[]; deep: number } = { v: -1, list: [], deep: 0 };
  berths(): number[] {
    if (this.berthCache.v === this.version) return this.berthCache.list;
    const out: number[] = [];
    let x = 0;
    while (x <= Q_MAX - SHIP_LEN) {
      let ok = true;
      for (let k = 0; k < SHIP_LEN; k++) {
        if (!this.isKai(x + k)) {
          ok = false;
          x += k + 1;
          break;
        }
      }
      if (ok) {
        out.push(x);
        x += SHIP_LEN;
      }
    }
    this.berthCache = { v: this.version, list: out, deep: this.findDeep() };
    return out;
  }
  hasBerth(): boolean {
    return this.berths().length > 0;
  }
  /** Gibt es einen ausgebaggerten Liegeplatz für große Schiffe (6 Kai-Felder, Mega-Frachter 8)? */
  hasDeepBerth(len = SHIP_TYPES.panamax.len): boolean {
    this.berths();
    return this.berthCache.deep >= len;
  }
  /** Längste ausgebaggerte Kaistrecke */
  private findDeep(): number {
    let best = 0;
    let run = 0;
    for (let x = 0; x < Q_MAX; x++) {
      run = this.isKai(x) && this.depth[x] ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  }
  berthContaining(x: number): number {
    for (const b of this.berths()) if (x >= b && x < b + SHIP_LEN) return b;
    return -1;
  }
  cranesAtBerth(b: number, len = SHIP_LEN): Crane[] {
    return this.cranes.filter((c) => {
      const q = this.cq(c);
      return q >= b && q < b + len;
    });
  }
  shipAtBerth(x: number): Ship | undefined {
    return this.ships.find((s) => s.state === 'unloading' && x >= s.berthX && x < s.berthX + s.len);
  }

  private nearBerth(s: Ship): boolean {
    const p = berthPose(s.berthX);
    return Math.hypot(s.x - p.x, s.y - p.y) < s.len + 0.5;
  }

  /** Sucht einen freien Liegeplatz für ein Schiff. Liefert den x-Anfang oder -1. */
  private findBerth(len: number, deep: boolean): number {
    const occ = this.ships
      .filter((s) => s.state === 'sailing' || s.state === 'unloading' || (s.state === 'leaving' && s.berthX >= 0 && this.nearBerth(s)))
      .map((s) => [s.berthX, s.berthX + s.len] as const);
    let best = -1;
    let bestScore = -Infinity;
    for (let x = 0; x <= Q_MAX - len; x++) {
      let ok = true;
      let deepTiles = 0;
      for (let k = 0; k < len && ok; k++) {
        if (!this.isKai(x + k) || this.closedQ[x + k]) ok = false;
        else if (this.depth[x + k]) deepTiles++;
        else if (deep) ok = false;
      }
      if (!ok || occ.some(([a, b]) => a < x + len && b > x)) continue;
      // Bündig am Rand oder an einem Nachbarschiff liegen, damit keine Lücken entstehen
      const flushL = !this.isKai(x - 1) || occ.some(([, b]) => b === x);
      const flushR = !this.isKai(x + len) || occ.some(([a]) => a === x + len);
      const score = this.cranesAtBerth(x, len).length * 10 + (flushL ? 3 : 0) + (flushR ? 2 : 0) - (deep ? 0 : deepTiles);
      if (score > bestScore) {
        bestScore = score;
        best = x;
      }
    }
    return best;
  }

  // ───────────────────────── Bauen ─────────────────────────

  canBuild(tool: BuildTool, x: number, y: number): BuildCheck {
    let cost = Math.round((this.costOf(tool) * (this.used && Sim.usable(tool) ? this.usedMarket.factor : 1)) / 100) * 100;
    if (!this.inBounds(x, y)) return { ok: false, reason: 'Außerhalb der Karte', cost };
    if (this.level < UNLOCK[tool]) return { ok: false, reason: `Erst ab Stufe ${UNLOCK[tool]} (${LEVELS[UNLOCK[tool] - 1].name})`, cost };
    const i = this.idx(x, y);
    const k = this.kind[i];
    if (!this.owned[x]) return { ok: false, reason: `Das Land gehört dir noch nicht. Kaufe es mit „Land kaufen“ (${eur(this.plotPrice)}).`, cost };
    if (k === T.Rock) return { ok: false, reason: `Hier liegt ein Felsen. Sprenge ihn mit „Abriss“ (${eur(ROCK_COST)}).`, cost };
    if (k === T.Hill && tool !== 'road') return { ok: false, reason: `Hier ist ein Hügel. Eine Straße geht als Tunnel durch, sonst mit „Abriss“ abtragen (${eur(HILL_COST)}).`, cost };
    const [sw, sh] = dimsOf(tool, this.rot);
    if (sw > 1 || sh > 1) {
      for (let yy = y; yy < y + sh; yy++) {
        for (let xx = x; xx < x + sw; xx++) {
          if (!this.inBounds(xx, yy)) return { ok: false, reason: `Braucht ${sw} × ${sh} Felder, das passt hier nicht auf die Karte`, cost };
          if (!this.owned[xx]) return { ok: false, reason: `Braucht ${sw} × ${sh} Felder, ein Teil davon gehört dir noch nicht`, cost };
          if (this.kind[this.idx(xx, yy)] !== T.Land) return { ok: false, reason: `Braucht ${sw} × ${sh} freie Felder`, cost };
        }
      }
    }
    let reason: string | undefined;
    switch (tool) {
      case 'kai':
        if (k === T.Water) reason = 'Kai steht an Land, direkt am Wasser';
        else if (k !== T.Land || !this.kaiSpot(x, y)) reason = 'Kai nur direkt am Wasser, in der ersten Reihe an der Küste';
        break;
      case 'crane':
      case 'lcrane':
        if (k !== T.Kai) reason = 'Kran braucht ein Kai-Feld';
        else if (this.craneAt(x, y)) reason = 'Hier steht schon ein Kran';
        break;
      case 'yard':
      case 'reefer':
      case 'emptyyard':
      case 'hazard':
      case 'solar':
      case 'battery':
      case 'track':
      case 'parking':
      case 'gate':
      case 'unpack':
      case 'pack':
      case 'cold':
      case 'fill':
      case 'workshop':
        if (k !== T.Land) reason = k === T.Water ? 'Nicht auf dem Wasser' : 'Das Feld ist belegt';
        else if (tool === 'hazard' && this.nearBuildings(x, y, 1, 1)) reason = `Gefahrgut braucht ${HAZ_DIST} Felder Abstand zu Gates, Hallen und Werkstatt`;
        else if ((tool === 'gate' || tool === 'unpack' || tool === 'pack' || tool === 'cold' || tool === 'fill' || tool === 'workshop') && this.nearHaz(x, y, sw, sh)) reason = `Zu nah an einer Gefahrgutfläche (${HAZ_DIST} Felder Abstand)`;
        break;
      case 'rail':
        if (k !== T.Land) reason = k === T.Water ? 'Nicht auf dem Wasser' : 'Das Feld ist belegt';
        else if (x !== GRID_W - 1 && !this.trackToEdge(x + 1, y)) reason = 'Der Gleisanschluss braucht ein durchgehendes Gleis bis zum rechten Kartenrand (Werkzeug „Gleis“)';
        break;
      case 'rtg':
        // Der Portalkran überspannt 3 × 3 Felder: alle müssen Lager sein
        if (!this.rtgFits(x, y)) reason = 'Der Portalkran überspannt 3 × 3 Felder, alle müssen Lagerfläche sein (keine Straße, kein Rand)';
        else if (this.rtgs.some((r) => Math.abs(r.x - x) <= 2 && Math.abs(r.y - y) <= 2)) reason = 'Zu nah an einem anderen Portalkran';
        break;
      case 'road':
        // Straße über ein Gleis wird zum Bahnübergang, durch einen Hügel zum Tunnel, über Wasser zur Brücke
        if (k === T.Hill) cost = this.costOf('road') * TUNNEL_MUL;
        else if (k === T.Water) {
          if (!this.bridgeable(x, y)) reason = 'Brücken nur über Flüsse und Kanäle im Land, nicht über das Fahrwasser der Schiffe';
          else cost = this.costOf('road') * BRIDGE_MUL;
        } else if (k !== T.Land && k !== T.Track) reason = 'Das Feld ist belegt';
        break;
      case 'road2':
      case 'hwy': {
        const want = tool === 'road2' ? 1 : 2;
        if (k === T.Road) {
          if (this.roadTier[i] >= want) reason = this.roadTier[i] === want ? 'Hier ist die Straße schon so ausgebaut' : 'Hier liegt schon eine bessere Straße';
        } else if (k !== T.Land) reason = k === T.Water ? 'Nicht auf dem Wasser' : 'Das Feld ist belegt';
        break;
      }
      case 'truck':
        if (k !== T.Road) reason = 'Truck braucht eine Straße';
        else if (this.roadTier[i] === 2) reason = 'Auf der Autobahn kann kein Truck starten';
        break;
      case 'dredge':
        if (k !== T.Water || qOfWater(x, y) < 0) reason = 'Baggern nur im Wasser direkt vor der Küste';
        else if (this.depth[qOfWater(x, y)]) reason = 'Hier ist schon gebaggert';
        break;
    }
    if (!reason && this.money < cost) reason = 'Zu wenig Geld';
    return { ok: !reason, reason, cost };
  }

  /** Darf an diesem Landfeld ein Kai stehen? Davor muss offenes Wasser liegen. */
  kaiSpot(x: number, y: number): boolean {
    const q = qOf(x, y);
    if (q < 0) return false;
    const [dx, dy] = OUT[sideOf(q)];
    return this.inBounds(x + dx, y + dy) && this.kind[this.idx(x + dx, y + dy)] === T.Water;
  }

  /** Liegt ein Gebäude (Gate, Halle, Werkstatt) in der Nähe dieses Rechtecks? */
  private nearBuildings(x: number, y: number, w: number, h: number): boolean {
    const near = (e: { x: number; y: number; w: number; h: number }) => e.x < x + w + HAZ_DIST && e.x + e.w > x - HAZ_DIST && e.y < y + h + HAZ_DIST && e.y + e.h > y - HAZ_DIST;
    return this.gates.some(near) || this.plants.some(near) || this.shops.some(near);
  }
  /** Liegt Gefahrgut in der Nähe dieses Rechtecks? */
  private nearHaz(x: number, y: number, w: number, h: number): boolean {
    return this.hazTiles.some((i) => {
      const hx = i % GRID_W;
      const hy = (i / GRID_W) | 0;
      return hx < x + w + HAZ_DIST && hx + 1 > x - HAZ_DIST && hy < y + h + HAZ_DIST && hy + 1 > y - HAZ_DIST;
    });
  }

  /** Setzt ein Objekt ohne Prüfung und ohne Kosten. Liefert bei Trucks die neue ID. */
  private place(tool: BuildTool, x: number, y: number, rot = this.rot): number | undefined {
    const [bw, bh] = dimsOf(tool, rot);
    const i = this.idx(x, y);
    switch (tool) {
      case 'solar':
      case 'battery':
      case 'track':
      case 'parking':
        this.kind[i] = TILE_OF[tool]!;
        return undefined;
      case 'kai':
      case 'road':
        if (tool === 'road') {
          this.railX[i] = this.kind[i] === T.Track ? 1 : 0;
          this.roadUnder[i] = this.kind[i] === T.Hill ? 1 : this.kind[i] === T.Water ? 2 : 0;
        }
        this.kind[i] = TILE_OF[tool]!;
        this.roadTier[i] = 0;
        return undefined;
      case 'road2':
      case 'hwy':
        this.kind[i] = T.Road;
        this.roadTier[i] = tool === 'road2' ? 1 : 2;
        return undefined;
      case 'yard':
      case 'reefer':
      case 'hazard':
      case 'emptyyard':
        this.kind[i] = TILE_OF[tool]!;
        this.stock[i] = 0;
        this.stockExp[i] = 0;
        this.stockRail[i] = 0;
        this.resOutRail[i] = 0;
        this.yardUse[i] = 0;
        this.resIn[i] = 0;
        this.resOut[i] = 0;
        this.resOutExp[i] = 0;
        this.reefTimes.delete(i);
        this.zone[i] = 0;
        return undefined;
      case 'crane':
      case 'lcrane':
        this.cranes.push({
          id: this.nextId++,
          x,
          y,
          q: qOf(x, y),
          big: false,
          model: tool === 'lcrane' ? 'light' : 'mobile',
          cap: 1,
          paid: COST[tool],
          buffer: 0,
          bufReef: 0,
          bufRail: 0,
          resOutRail: 0,
          bufHaz: 0,
          resOutHaz: 0,
          resOut: 0,
          resOutReef: 0,
          expBuf: 0,
          resExpIn: 0,
          cd: CRANE_MOVE_GM,
          state: 'idle',
          lastLoad: false,
          staffed: true,
          wear: 0,
          zone: 0,
        });
        this.addStaff('crane');
        return undefined;
      case 'gate':
        for (const f of this.footprintOf({ x, y, w: bw, h: bh })) this.kind[f] = T.Gate;
        this.gates.push({ id: this.nextId++, emptyIn: 0, resOutE: 0, x, y, w: bw, h: bh, apron: [], resIn: 0, inApron: 0, resOut: 0, proc: 0, procIn: false, procFee: 0, lastIn: false, served: 0, staffed: true, zone: 0 });
        this.addStaff('gate');
        return undefined;
      case 'rail':
        this.kind[i] = T.Rail;
        this.rails.push({ id: this.nextId++, x, y, platform: 0, value: 0, resIn: 0, state: 'away', timer: 60, lastLoad: 0, zone: 0, goods: 0, resOutG: 0, emptyIn: 0, resOutE: 0 });
        return undefined;
      case 'dredge':
        this.depth[qOfWater(x, y)] = 1;
        return undefined;
      case 'rtg':
        this.rtgs.push({ id: this.nextId++, x, y, staffed: true });
        this.addStaff('crane');
        return undefined;
      case 'workshop':
        for (const f of this.footprintOf({ x, y, w: 2, h: 2 })) this.kind[f] = T.Shop;
        this.shops.push({ id: this.nextId++, x, y, w: 2, h: 2, staffed: true, target: null });
        this.addStaff('mech');
        return undefined;
      case 'unpack':
      case 'pack':
      case 'cold':
      case 'fill':
        for (const f of this.footprintOf({ x, y, w: bw, h: bh })) this.kind[f] = T.Plant;
        this.plants.push({ id: this.nextId++, x, y, w: bw, h: bh, kind: tool, product: 'elec', inEmpty: 0, emptyOut: 0, resInE: 0, resOutE: 0, inBuf: 0, outBuf: 0, resIn: 0, resOut: 0, proc: 0, made: 0, zone: 0 });
        return undefined;
      case 'truck': {
        const id = this.nextId++;
        this.trucks.push({ id, tile: i, next: -1, prog: 0, fx: x, fy: y, px: x, py: y, wait: 0, load: 0, cargo: 'imp', agv: false, job: null, angle: 0, dir: -1, stuck: 0, slot: 0, staffed: true, role: 'auto', wear: 0, zone: 0, cap: 1, paid: COST.truck });
        this.addStaff('driver');
        return id;
      }
    }
  }

  build(tool: BuildTool, x: number, y: number): BuildResult {
    const chk = this.canBuild(tool, x, y);
    if (!chk.ok) return chk;
    this.money -= chk.cost;
    this.today.building += chk.cost;
    const pi = this.idx(x, y);
    const prev = (tool === 'road2' || tool === 'hwy') && this.kind[pi] === T.Road ? { tier: this.roadTier[pi], ow: this.oneway[pi] } : undefined;
    const truckId = this.place(tool, x, y);
    // Kran oder Truck: Kaufpreis merken, gebraucht mit niedrigerem Höchstzustand
    const dev = tool === 'truck' ? this.trucks.find((t) => t.id === truckId) : tool === 'crane' || tool === 'lcrane' ? this.craneAt(x, y) : undefined;
    if (dev) {
      dev.paid = chk.cost;
      if (this.used && Sim.usable(tool)) {
        dev.cap = this.usedMarket.lo + this.rnd() * (this.usedMarket.hi - this.usedMarket.lo);
        dev.wear = 1 - dev.cap + 0.05;
      }
    }
    // Bauzeit: Gebäude und Geräte arbeiten erst, wenn sie fertig sind
    const bt = BUILD_GM[tool];
    if (bt) {
      const e = tool === 'crane' || tool === 'lcrane' ? this.craneAt(x, y) : tool === 'gate' ? this.gateAt(x, y) : tool === 'rail' ? this.railAt(x, y) : tool === 'rtg' ? this.rtgAt(x, y) : tool === 'workshop' ? this.shopAt(x, y) : this.plantAt(x, y);
      if (e) e.build = e.buildMax = bt;
    }
    this.touch();
    return { ...chk, truckId, prev };
  }

  canDemolish(x: number, y: number): BuildCheck {
    if (!this.inBounds(x, y)) return { ok: false, reason: 'Außerhalb der Karte', cost: 0 };
    const i = this.idx(x, y);
    const k = this.kind[i];
    if (k === T.Rock && !this.owned[x]) return { ok: false, reason: 'Das Land gehört dir nicht', cost: 0 };
    if (k === T.Hill) {
      if (!this.owned[x]) return { ok: false, reason: 'Das Land gehört dir nicht', cost: 0 };
      return this.money >= HILL_COST ? { ok: true, cost: HILL_COST } : { ok: false, reason: `Abtragen kostet ${eur(HILL_COST)}`, cost: HILL_COST };
    }
    if (k === T.Rock) {
      return this.money >= ROCK_COST ? { ok: true, cost: ROCK_COST } : { ok: false, reason: `Sprengen kostet ${eur(ROCK_COST)}`, cost: ROCK_COST };
    }
    if (!this.owned[x]) return { ok: false, reason: 'Das Land gehört dir nicht', cost: 0 };
    if (k === T.Water || k === T.Land) {
      return this.truckAtTile(i) ? { ok: true, cost: 0 } : { ok: false, reason: 'Hier ist nichts', cost: 0 };
    }
    if (k === T.Kai && !this.craneAt(x, y) && this.shipUsesKai(qOf(x, y))) {
      return { ok: false, reason: 'Ein Schiff liegt am Kai', cost: 0 };
    }
    return { ok: true, cost: 0 };
  }

  private shipUsesKai(x: number): boolean {
    return this.ships.some((s) => (s.state === 'sailing' || s.state === 'unloading') && s.berthX <= x && x < s.berthX + s.len);
  }

  /** Entfernt, was auf dem Feld steht (Truck vor Kran vor Feld). `factor` ist der erstattete Anteil der Baukosten. */
  demolish(x: number, y: number, factor = REFUND): DemolishResult {
    const chk = this.canDemolish(x, y);
    if (!chk.ok) return { ...chk, removed: [] };
    const i = this.idx(x, y);
    const removed: Removed[] = [];
    if (this.kind[i] === T.Rock || this.kind[i] === T.Hill) {
      const c = this.kind[i] === T.Hill ? HILL_COST : ROCK_COST;
      this.kind[i] = T.Land;
      this.money -= c;
      this.today.building += c;
      this.touch();
      return { ...chk, removed };
    }
    const truck = this.truckAtTile(i);
    const crane = this.craneAt(x, y);
    if (truck) this.takeTruck(truck, factor, removed);
    else if (crane) this.takeCrane(crane, factor, removed);
    else if (this.rtgAt(x, y)) this.takeRtg(this.rtgAt(x, y)!, factor, removed);
    else this.takeTile(i, factor, removed);
    this.touch();
    this.invalidateJobs();
    return { ...chk, removed };
  }

  private give(amount: number, factor: number): number {
    const r = Math.round(amount * factor);
    this.money += r;
    this.today.building -= r;
    return r;
  }

  private takeTruck(t: Truck, factor: number, out: Removed[]) {
    if (t.job) this.cancelJob(t);
    this.trucks = this.trucks.filter((x) => x !== t);
    if (!t.agv) this.staff.driver = Math.max(0, this.staff.driver - 1);
    out.push({
      tool: 'truck',
      x: t.tile % GRID_W,
      y: (t.tile / GRID_W) | 0,
      refund: this.give(t.paid, factor),
      upgraded: t.agv,
      paid: t.paid,
      cap: t.cap,
      wear: t.wear,
    });
  }

  private takeRtg(r: Rtg, factor: number, out: Removed[]) {
    this.rtgs = this.rtgs.filter((q) => q !== r);
    this.staff.crane = Math.max(0, this.staff.crane - 1);
    out.push({ tool: 'rtg', x: r.x, y: r.y, refund: this.give(this.costOf('rtg'), factor) });
  }

  private takeCrane(c: Crane, factor: number, out: Removed[]) {
    this.cranes = this.cranes.filter((x) => x !== c);
    this.staff.crane = Math.max(0, this.staff.crane - 1);
    out.push({ tool: 'crane', x: c.x, y: c.y, refund: this.give(c.paid, factor), upgraded: c.big, model: c.model, paid: c.paid, cap: c.cap, wear: c.wear });
  }

  private takeTile(i: number, factor: number, out: Removed[]) {
    const x = i % GRID_W;
    const y = (i / GRID_W) | 0;
    switch (this.kind[i]) {
      case T.Kai:
        out.push({ tool: 'kai', x, y, refund: this.give(this.costOf('kai'), factor) });
        break;
      case T.Road:
        // Trucks auf diesem Feld oder auf dem Weg dorthin gehen mit
        for (const tr of [...this.trucks]) {
          if (tr.tile === i || tr.next === i) this.takeTruck(tr, factor, out);
        }
        out.push({ tool: 'road', x, y, refund: this.give(this.costOf(this.roadTier[i] === 2 ? 'hwy' : this.roadTier[i] === 1 ? 'road2' : 'road'), factor), tier: this.roadTier[i], ow: this.oneway[i] });
        this.roadTier[i] = 0;
        this.oneway[i] = -1;
        // Tunnel und Brücke: darunter liegt wieder Hügel oder Wasser
        if (this.roadUnder[i]) {
          this.kind[i] = this.roadUnder[i] === 1 ? T.Hill : T.Water;
          this.roadUnder[i] = 0;
          return;
        }
        // Ein Bahnübergang wird wieder zum Gleis
        if (this.railX[i]) {
          this.railX[i] = 0;
          this.kind[i] = T.Track;
          return;
        }
        break;
      case T.Yard:
      case T.Reefer:
      case T.Hazmat:
      case T.Empty: {
        const rt = this.rtgAt(x, y);
        if (rt) this.takeRtg(rt, factor, out);
        const tool: BuildTool = this.kind[i] === T.Yard ? 'yard' : this.kind[i] === T.Reefer ? 'reefer' : this.kind[i] === T.Hazmat ? 'hazard' : 'emptyyard';
        out.push({ tool, x, y, refund: this.give(this.costOf(tool), factor), stock: this.stock[i], stockExp: this.stockExp[i], stockRail: this.stockRail[i], use: this.yardUse[i] });
        this.stock[i] = 0;
        this.stockExp[i] = 0;
        this.stockRail[i] = 0;
        this.resOutRail[i] = 0;
        this.yardUse[i] = 0;
        this.resIn[i] = 0;
        this.resOut[i] = 0;
        this.resOutExp[i] = 0;
        this.reefTimes.delete(i);
        this.zone[i] = 0;
        break;
      }
      case T.Solar:
      case T.Battery:
      case T.Track:
      case T.Parking: {
        const tool: BuildTool = this.kind[i] === T.Solar ? 'solar' : this.kind[i] === T.Battery ? 'battery' : this.kind[i] === T.Parking ? 'parking' : 'track';
        out.push({ tool, x, y, refund: this.give(this.costOf(tool), factor) });
        break;
      }
      case T.Gate: {
        const g = this.gateAt(x, y);
        if (!g) return;
        out.push({ tool: 'gate', x: g.x, y: g.y, refund: this.give(this.costOf('gate'), factor), served: g.served, rot: g.h > g.w });
        this.gates = this.gates.filter((q) => q !== g);
        this.staff.gate = Math.max(0, this.staff.gate - 1);
        for (const f of this.footprintOf(g)) this.kind[f] = T.Land;
        break;
      }
      case T.Shop: {
        const sh = this.shopAt(x, y);
        if (!sh) return;
        out.push({ tool: 'workshop', x: sh.x, y: sh.y, refund: this.give(this.costOf('workshop'), factor) });
        this.shops = this.shops.filter((q) => q !== sh);
        this.staff.mech = Math.max(0, this.staff.mech - 1);
        for (const f of this.footprintOf(sh)) this.kind[f] = T.Land;
        break;
      }
      case T.Plant: {
        const p = this.plantAt(x, y);
        if (!p) return;
        out.push({ tool: p.kind, x: p.x, y: p.y, refund: this.give(this.costOf(p.kind), factor), rot: p.w !== sizeOf(p.kind)[0] });
        this.plants = this.plants.filter((q) => q !== p);
        for (const f of this.footprintOf(p)) this.kind[f] = T.Land;
        break;
      }
      case T.Rail: {
        const r = this.railAt(x, y);
        out.push({ tool: 'rail', x, y, refund: this.give(this.costOf('rail'), factor), platform: r?.platform ?? 0, value: r?.value ?? 0 });
        this.rails = this.rails.filter((q) => q !== r);
        break;
      }
      default:
        return;
    }
    this.kind[i] = T.Land;
  }

  /** Macht einen Bau rückgängig. Die Baukosten werden voll erstattet. */
  undoBuild(a: { tool: BuildTool; x: number; y: number; truckId?: number; prev?: { tier: number; ow: number } }): DemolishResult {
    const fail = (reason: string): DemolishResult => ({ ok: false, reason, cost: 0, removed: [] });
    const removed: Removed[] = [];
    if (a.tool === 'truck') {
      const t = this.trucks.find((t) => t.id === a.truckId);
      if (!t) return fail('Der Truck existiert nicht mehr');
      this.takeTruck(t, 1, removed);
    } else if (a.tool === 'crane' || a.tool === 'lcrane') {
      const c = this.craneAt(a.x, a.y);
      if (!c) return fail('Der Kran existiert nicht mehr');
      this.takeCrane(c, 1, removed);
    } else if ((a.tool === 'road2' || a.tool === 'hwy') && a.prev) {
      const i = this.idx(a.x, a.y);
      if (this.kind[i] !== T.Road) return fail('Das Feld wurde inzwischen geändert');
      this.roadTier[i] = a.prev.tier;
      this.oneway[i] = a.prev.ow;
      removed.push({ tool: a.tool, x: a.x, y: a.y, refund: this.give(this.costOf(a.tool), 1) });
    } else if (a.tool === 'rtg') {
      const r = this.rtgAt(a.x, a.y);
      if (!r) return fail('Der Portalkran existiert nicht mehr');
      this.takeRtg(r, 1, removed);
    } else if (a.tool === 'dredge') {
      const dq = qOfWater(a.x, a.y);
      if (dq < 0 || !this.depth[dq]) return fail('Hier ist nicht mehr gebaggert');
      if (this.ships.some((s) => SHIP_TYPES[s.type].deep && (s.state === 'sailing' || s.state === 'unloading') && s.berthX <= dq && dq < s.berthX + s.len)) {
        return fail('Ein großes Schiff liegt dort');
      }
      this.depth[dq] = 0;
      removed.push({ tool: 'dredge', x: a.x, y: a.y, refund: this.give(this.costOf('dredge'), 1) });
    } else {
      const i = this.idx(a.x, a.y);
      if (this.kind[i] !== TILE_OF[a.tool]) return fail('Das Feld wurde inzwischen geändert');
      if ((a.tool === 'unpack' || a.tool === 'pack' || a.tool === 'cold') && this.plantAt(a.x, a.y)?.kind !== a.tool) return fail('Das Feld wurde inzwischen geändert');
      if (a.tool === 'kai') {
        if (this.craneAt(a.x, a.y)) return fail('Auf dem Kai steht ein Kran');
        if (this.shipUsesKai(qOf(a.x, a.y))) return fail('Ein Schiff liegt am Kai');
      }
      this.takeTile(i, 1, removed);
    }
    this.touch();
    this.invalidateJobs();
    return { ok: true, cost: 0, removed };
  }

  /** Macht einen Abriss rückgängig: baut alles wieder auf und zieht die Erstattung wieder ab. */
  undoDemolish(removed: Removed[]): BuildCheck {
    const total = removed.reduce((n, r) => n + r.refund, 0);
    const fail = (reason: string): BuildCheck => ({ ok: false, reason, cost: total });
    if (this.money < total) return fail('Zu wenig Geld');
    // In umgekehrter Reihenfolge: erst das Feld, dann was darauf stand
    const order = [...removed].reverse();
    const willBe = new Map<number, T>();
    for (const r of order) {
      const i = this.idx(r.x, r.y);
      const k = willBe.get(i) ?? this.kind[i];
      if (r.tool === 'truck') {
        if (k !== T.Road) return fail('Die Straße fehlt inzwischen');
      } else if (r.tool === 'crane' || r.tool === 'lcrane') {
        if (k !== T.Kai || this.craneAt(r.x, r.y)) return fail('Der Platz am Kai ist belegt');
      } else if (r.tool === 'rtg') {
        if ((k !== T.Yard && k !== T.Reefer) || this.rtgAt(r.x, r.y)) return fail('Der Platz ist belegt');
      } else if (r.tool !== 'dredge') {
        const [w, h] = dimsOf(r.tool, !!r.rot);
        for (const f of this.footprintOf({ x: r.x, y: r.y, w, h })) {
          if ((willBe.get(f) ?? this.kind[f]) !== T.Land) return fail('Das Feld ist inzwischen belegt');
          willBe.set(f, TILE_OF[r.tool]!);
        }
        void k;
      }
    }
    for (const r of order) {
      const id = this.place(r.tool, r.x, r.y, !!r.rot);
      const i = this.idx(r.x, r.y);
      if (r.tool === 'yard' || r.tool === 'reefer' || r.tool === 'hazard' || r.tool === 'emptyyard') {
        this.stock[i] = r.stock ?? 0;
        this.stockExp[i] = r.stockExp ?? 0;
        this.stockRail[i] = r.stockRail ?? 0;
        this.yardUse[i] = r.use ?? 0;
        if (r.tool === 'reefer' && r.stock) this.reefTimes.set(i, new Array(r.stock).fill(this.gm));
      } else if (r.tool === 'gate') {
        const g = this.gateAt(r.x, r.y);
        if (g) g.served = r.served ?? 0;
      } else if (r.tool === 'rail') {
        const rl = this.railAt(r.x, r.y);
        if (rl) {
          rl.platform = r.platform ?? 0;
          rl.value = r.value ?? 0;
        }
      } else if (r.tool === 'crane' && (r.model || r.upgraded)) {
        const c = this.craneAt(r.x, r.y);
        if (c) {
          this.setModel(c, r.model ?? 'bridge');
          c.paid = r.paid ?? c.paid;
          c.cap = r.cap ?? 1;
          c.wear = r.wear ?? 0;
        }
      } else if (r.tool === 'road') {
        this.roadTier[i] = r.tier ?? 0;
        this.oneway[i] = r.ow ?? -1;
      } else if (r.tool === 'truck') {
        const t = this.trucks.find((t) => t.id === id);
        if (t) {
          t.agv = !!r.upgraded;
          t.paid = r.paid ?? t.paid;
          t.cap = r.cap ?? 1;
          t.wear = r.wear ?? 0;
        }
      }
    }
    this.money -= total;
    this.today.building += total;
    this.touch();
    return { ok: true, cost: total };
  }

  // ───────────────────────── Aufrüsten ─────────────────────────

  /** Was ein Kran insgesamt gekostet hat (Kauf plus Aufrüstungen) */
  craneValue(m: CraneModel): number {
    if (m === 'light') return COST.lcrane;
    let v = COST.crane;
    for (let k: CraneModel = 'mobile'; k !== m && CRANE_MODELS[k].next; k = CRANE_MODELS[k].next!) v += CRANE_MODELS[k].upCost;
    return v;
  }
  setModel(c: Crane, m: CraneModel) {
    c.model = m;
    c.big = CRANE_MODELS[m].big;
    this.version++;
  }
  techCost(id: TechId): number {
    const t = TECH[id];
    const n = Math.min(this.tech[id], t.cost.length - 1);
    return Math.round((t.cost[n] * this.inflation) / 1000) * 1000;
  }
  canBuyTech(id: TechId): BuildCheck {
    const t = TECH[id];
    const n = this.tech[id];
    if (n >= t.cost.length) return { ok: false, reason: 'Schon voll ausgebaut', cost: 0 };
    const cost = this.techCost(id);
    if (this.level < t.level[n]) return { ok: false, reason: `Erst ab Stufe ${t.level[n]} (${LEVELS[t.level[n] - 1].name})`, cost };
    if (this.money < cost) return { ok: false, reason: 'Zu wenig Geld', cost };
    return { ok: true, cost };
  }
  buyTech(id: TechId): BuildCheck {
    const chk = this.canBuyTech(id);
    if (!chk.ok) return chk;
    this.money -= chk.cost;
    this.today.building += chk.cost;
    this.tech[id]++;
    this.version++;
    this.emit(`${TECH[id].name} Stufe ${this.tech[id]}: ${TECH[id].per}`, 'good');
    return chk;
  }
  /** Haltbarkeit der Kühlcontainer in Spielminuten */
  get reeferMax(): number {
    return REEFER_MAX_GM * (1 + 0.3 * this.tech.cool) * (this.spec === 'cold' ? 1.5 : 1);
  }
  /** Verschleiß wächst, der Höchstzustand sinkt dabei langsam mit (wie ein Akku) */
  private addWear(o: { wear: number; cap: number }, d: number) {
    o.wear = Math.min(1, o.wear + d);
    o.cap = Math.max(CAP_MIN, o.cap - d * CAP_LOSS);
  }
  private get wearMul(): number {
    return 1 - 0.2 * this.tech.maint;
  }

  /** Preisfaktor: Mit jeder Hafenstufe wird alles teurer */
  get inflation(): number {
    return 1 + INFLATION_PER_LEVEL * (Math.min(this.level, 7) - 1);
  }
  /** Heutiger Neupreis */
  costOf(tool: BuildTool): number {
    const t = this.traits;
    const mul = (t.includes('rocky') ? 1.15 : 1) * (tool === 'dredge' && t.includes('deepwater') ? 0.4 : 1);
    return Math.round((COST[tool] * this.inflation * mul) / 100) * 100;
  }
  /** Gibt es dieses Werkzeug auch gebraucht? */
  static usable(tool: string): boolean {
    return tool === 'crane' || tool === 'lcrane' || tool === 'truck';
  }
  /** Generalüberholung: kostet einen Teil vom Neupreis, hebt den Höchstzustand, dauert eine Weile */
  overhaulCost(kind: 'crane' | 'truck', id: number): number {
    const c = kind === 'crane' ? this.cranes.find((c) => c.id === id) : undefined;
    const base = c ? this.costOf(c.model === 'light' ? 'lcrane' : 'crane') + (c.model === 'light' ? 0 : this.craneValue(c.model) - COST.crane) : this.costOf('truck');
    return Math.round((base * OVERHAUL.price) / 1000) * 1000;
  }
  canOverhaul(kind: 'crane' | 'truck', id: number): BuildCheck {
    const cost = this.overhaulCost(kind, id);
    const o = kind === 'crane' ? this.cranes.find((c) => c.id === id) : this.trucks.find((t) => t.id === id);
    if (!o) return { ok: false, reason: 'Existiert nicht mehr', cost };
    if (o.build) return { ok: false, reason: 'Wird gerade bearbeitet', cost };
    if (o.cap >= OVERHAUL.cap) return { ok: false, reason: 'Noch in gutem Zustand', cost };
    if (kind === 'truck' && (o as Truck).job) return { ok: false, reason: 'Der Truck ist gerade unterwegs', cost };
    if (this.money < cost) return { ok: false, reason: 'Zu wenig Geld', cost };
    return { ok: true, cost };
  }
  overhaul(kind: 'crane' | 'truck', id: number): BuildCheck {
    const chk = this.canOverhaul(kind, id);
    if (!chk.ok) return chk;
    const o = (kind === 'crane' ? this.cranes.find((c) => c.id === id) : this.trucks.find((t) => t.id === id))!;
    this.money -= chk.cost;
    this.today.building += chk.cost;
    o.cap = OVERHAUL.cap;
    o.wear = 1 - OVERHAUL.cap;
    o.build = o.buildMax = OVERHAUL.gm;
    o.paid += chk.cost;
    this.version++;
    return chk;
  }

  /** Kosten und Mindeststufe der nächsten Aufrüstung */
  upgradeInfo(kind: 'crane' | 'truck', id: number): { cost: number; level: number; label: string } | null {
    if (kind === 'truck') return { cost: Math.round(UPGRADE.truck.cost * this.inflation), level: UPGRADE.truck.level, label: 'Fahrerlos aufrüsten' };
    const c = this.cranes.find((c) => c.id === id);
    const m = c ? CRANE_MODELS[c.model] : null;
    if (!m || !m.next) return null;
    return { cost: Math.round((m.upCost * this.inflation) / 1000) * 1000, level: m.upLevel, label: `Zur ${CRANE_MODELS[m.next].name} aufrüsten` };
  }

  canUpgrade(kind: 'crane' | 'truck', id: number): BuildCheck {
    const u = this.upgradeInfo(kind, id) ?? { cost: 0, level: 99, label: '' };
    const fail = (reason: string): BuildCheck => ({ ok: false, reason, cost: u.cost });
    if (kind === 'crane') {
      const c = this.cranes.find((c) => c.id === id);
      if (!c) return fail('Der Kran existiert nicht mehr');
      if (c.build) return fail('Der Kran wird gerade gebaut oder umgebaut');
      const next = CRANE_MODELS[c.model].next;
      if (!next) return fail('Ist schon das größte Modell');
      if (this.level < u.level) return fail(`Erst ab Stufe ${u.level} (${LEVELS[u.level - 1].name})`);
      if (CRANE_MODELS[next].big && !c.big && !this.bridgeRoom(c)) return fail('Die Containerbrücke steht auf zwei Feldern: Rechts (bzw. unten) daneben muss ein freies Kai-Feld sein');
    } else {
      if (this.level < u.level) return fail(`Erst ab Stufe ${u.level} (${LEVELS[u.level - 1].name})`);
      const t = this.trucks.find((t) => t.id === id);
      if (!t) return fail('Der Truck existiert nicht mehr');
      if (t.agv) return fail('Fährt schon fahrerlos');
    }
    if (this.money < u.cost) return fail('Zu wenig Geld');
    return { ok: true, cost: u.cost };
  }

  upgrade(kind: 'crane' | 'truck', id: number): BuildCheck {
    const chk = this.canUpgrade(kind, id);
    if (!chk.ok) return chk;
    this.money -= chk.cost;
    this.today.building += chk.cost;
    if (kind === 'crane') {
      const c = this.cranes.find((c) => c.id === id)!;
      this.setModel(c, CRANE_MODELS[c.model].next!);
      c.build = c.buildMax = UPGRADE_GM;
      c.paid += chk.cost;
    } else {
      const t = this.trucks.find((t) => t.id === id)!;
      t.agv = true;
      t.paid += chk.cost;
    }
    this.version++;
    return chk;
  }

  undoUpgrade(kind: 'crane' | 'truck', id: number): BuildCheck {
    let cost = UPGRADE.truck.cost;
    if (kind === 'crane') {
      const c = this.cranes.find((c) => c.id === id);
      const prev = c ? (Object.keys(CRANE_MODELS) as CraneModel[]).find((m) => CRANE_MODELS[m].next === c.model) : undefined;
      if (!c || !prev) return { ok: false, reason: 'Das Objekt existiert nicht mehr', cost: 0 };
      cost = Math.round((CRANE_MODELS[prev].upCost * this.inflation) / 1000) * 1000;
      this.setModel(c, prev);
      c.build = 0;
      c.paid -= cost;
    } else {
      const t = this.trucks.find((t) => t.id === id && t.agv);
      if (!t) return { ok: false, reason: 'Das Objekt existiert nicht mehr', cost };
      cost = Math.round(cost * this.inflation);
      t.agv = false;
      t.paid -= cost;
    }
    this.give(cost, 1);
    this.version++;
    return { ok: true, cost };
  }

  // ───────────────────────── Lager und Jobs ─────────────────────────

  private freeAt(i: number): number {
    return this.capAt(i) - this.stock[i] - this.stockExp[i] - this.resIn[i];
  }
  private tilesOf(kind: T): number[] {
    return kind === T.Reefer ? this.reeferTiles : kind === T.Hazmat ? this.hazTiles : kind === T.Empty ? this.emptyTiles : this.yardTiles;
  }
  private hasFreeStore(kind: T, zone = 0): boolean {
    return this.tilesOf(kind).some((i) => this.zone[i] === zone && this.freeAt(i) > 0);
  }

  /** Nächstgelegenes Lagerfeld mit freiem Platz ab Straßenfeld `from`. */
  private findSlot(kind: T, from: number, zone: number, cargo?: Cargo): { tile: number; access: number; d: number; free: number } | null {
    // Stapelplatz: zuerst Felder mit passendem Zweck, dann gemischte. Felder mit anderem Zweck bleiben frei.
    if (kind === T.Yard && cargo) {
      const want = cargo === 'rimp' ? 2 : cargo === 'exp' ? 3 : 1;
      return this.findSlotUse(from, zone, want) ?? this.findSlotUse(from, zone, 0);
    }
    return this.findSlotUse(from, zone, -1, kind);
  }
  private findSlotUse(from: number, zone: number, use: number, kind: T = T.Yard): { tile: number; access: number; d: number; free: number } | null {
    let best: { tile: number; access: number; d: number; free: number } | null = null;
    for (const y of this.tilesOf(kind)) {
      if (this.zone[y] !== zone) continue;
      if (use >= 0 && this.yardUse[y] !== use) continue;
      const free = this.freeAt(y);
      if (free <= 0) continue;
      for (const a of this.storeAccess(y)) {
        const d = this.distMap(a)[from];
        if (d >= 0 && (!best || d < best.d)) best = { tile: y, access: a, d, free };
      }
    }
    return best;
  }

  /** Nächstgelegenes Lagerfeld, das Container der gewünschten Art abgeben kann. */
  private findSource(kind: T, cargo: Cargo, from: number, zone: number): { tile: number; access: number; d: number; avail: number } | null {
    let best: { tile: number; access: number; d: number; avail: number } | null = null;
    for (const y of this.tilesOf(kind)) {
      if (this.zone[y] !== zone) continue;
      const avail =
        cargo === 'exp'
          ? this.stockExp[y] - this.resOutExp[y]
          : cargo === 'rimp'
            ? this.stockRail[y] - this.resOutRail[y]
            : cargo === 'imp' && kind === T.Yard
              ? this.stock[y] - this.stockRail[y] - this.resOut[y]
              : this.stock[y] - this.resOut[y];
      if (avail <= 0) continue;
      for (const a of this.storeAccess(y)) {
        const d = this.distMap(a)[from];
        if (d >= 0 && (!best || d < best.d)) best = { tile: y, access: a, d, avail };
      }
    }
    return best;
  }

  /** Nächstes Straßenfeld neben Feld `i`, vom Straßenfeld `from` aus gesehen. */
  private nearestAccess(i: number | Box, from: number): { access: number; d: number } | null {
    let best: { access: number; d: number } | null = null;
    for (const a of typeof i === 'number' ? this.adjRoad(i) : this.accessOf(i)) {
      const d = this.distMap(a)[from];
      if (d >= 0 && (!best || d < best.d)) best = { access: a, d };
    }
    return best;
  }

  private srcRes(j: Job, d: number) {
    if (j.srcKind === 'crane') {
      const c = this.cranes.find((c) => c.id === j.src);
      if (!c) return;
      if (j.cargo === 'reef') c.resOutReef = Math.max(0, c.resOutReef + d);
      else if (j.cargo === 'rimp') c.resOutRail = Math.max(0, c.resOutRail + d);
      else if (j.cargo === 'haz') c.resOutHaz = Math.max(0, c.resOutHaz + d);
      else c.resOut = Math.max(0, c.resOut + d);
    } else if (j.srcKind === 'store') {
      if (j.cargo === 'exp') this.resOutExp[j.src] = Math.max(0, this.resOutExp[j.src] + d);
      else if (j.cargo === 'rimp') this.resOutRail[j.src] = Math.max(0, this.resOutRail[j.src] + d);
      else this.resOut[j.src] = Math.max(0, this.resOut[j.src] + d);
    } else if (j.srcKind === 'plant') {
      const p = this.plants.find((p) => p.id === j.src);
      if (p) {
        if (j.cargo === 'empty') p.resOutE = Math.max(0, p.resOutE + d);
        else p.resOut = Math.max(0, p.resOut + d);
      }
    } else if (j.srcKind === 'rail') {
      const r = this.rails.find((r) => r.id === j.src);
      if (r && j.cargo === 'empty') r.resOutE = Math.max(0, r.resOutE + d);
      else if (r) r.resOutG = Math.max(0, r.resOutG + d);
    } else {
      const g = this.gates.find((g) => g.id === j.src);
      if (g && j.cargo === 'empty') g.resOutE = Math.max(0, g.resOutE + d);
      else if (g) g.resOut = Math.max(0, g.resOut + d);
    }
  }

  private dstRes(j: Job, d: number) {
    if (j.dstKind === 'store') this.resIn[j.dst] = Math.max(0, this.resIn[j.dst] + d);
    else if (j.dstKind === 'gate') {
      const g = this.gates.find((g) => g.id === j.dst);
      if (g) g.resIn = Math.max(0, g.resIn + d);
    } else if (j.dstKind === 'rail') {
      const r = this.rails.find((r) => r.id === j.dst);
      if (r) r.resIn = Math.max(0, r.resIn + d);
    } else if (j.dstKind === 'plant') {
      const p = this.plants.find((p) => p.id === j.dst);
      if (p) {
        if (j.cargo === 'empty') p.resInE = Math.max(0, p.resInE + d);
        else p.resIn = Math.max(0, p.resIn + d);
      }
    } else {
      const c = this.cranes.find((c) => c.id === j.dst);
      if (c) c.resExpIn = Math.max(0, c.resExpIn + d);
    }
  }

  private cancelJob(t: Truck) {
    const j = t.job;
    if (!j) return;
    if (j.stage === 0) this.srcRes(j, -j.n);
    this.dstRes(j, -j.n);
    t.job = null;
    t.load = 0;
    t.next = -1;
    t.prog = 0;
    t.stuck = 0;
  }

  private jobValid(j: Job): boolean {
    if (this.kind[j.tgt[0]] !== T.Road || this.kind[j.tgt[1]] !== T.Road) return false;
    const storeKind = Sim.storeOf(j.cargo);
    if (j.stage === 0) {
      if (j.srcKind === 'crane' && !this.cranes.some((c) => c.id === j.src)) return false;
      if (j.srcKind === 'store' && this.kind[j.src] !== storeKind) return false;
      if (j.srcKind === 'gate' && !this.gates.some((g) => g.id === j.src)) return false;
      if (j.srcKind === 'plant' && !this.plants.some((p) => p.id === j.src)) return false;
      if (j.srcKind === 'rail' && !this.rails.some((r) => r.id === j.src)) return false;
    }
    if (j.dstKind === 'store') return this.kind[j.dst] === storeKind;
    if (j.dstKind === 'gate') return this.gates.some((g) => g.id === j.dst);
    if (j.dstKind === 'rail') return this.rails.some((r) => r.id === j.dst);
    if (j.dstKind === 'plant') return this.plants.some((p) => p.id === j.dst);
    return this.cranes.some((c) => c.id === j.dst);
  }

  private invalidateJobs() {
    for (const t of this.trucks) {
      if (t.job && !this.jobValid(t.job)) this.cancelJob(t);
    }
  }

  private assignJob(t: Truck) {
    let bestScore = 0;
    let best: Job | null = null;
    // Jede Fahrt gehört zu einer Aufgabe. Trucks mit fester Aufgabe nehmen nur die passenden.
    const offer = (tag: string, weight: number, dist: number, job: Job) => {
      if (job.n <= 0 || (t.role !== 'auto' && !tag.includes(t.role))) return;
      const score = weight / (1 + dist / (15 * DIST_UNIT));
      if (score > bestScore) {
        bestScore = score;
        best = job;
      }
    };
    const cap = this.yardCapacity;
    const fill = cap ? this.yardStock / cap : 0;
    const press = fill > 0.8 ? 1.4 : 1;
    // Trucks mit Zone fahren nur innerhalb ihrer Zone, Fahrten verbinden nur gleiche Zonen
    const zOk = (z: number) => t.zone === 0 || t.zone === z;

    for (const c of this.cranes) {
      if (!zOk(c.zone) || c.build) continue;
      const ci = this.idx(c.x, c.y);
      const ship = this.shipAtBerth(this.cq(c));
      // 1. Entladene Container vom Kran wegfahren
      const more = ship !== undefined && ship.containers + ship.reefers + ship.haz > 0;
      const full = c.buffer + c.bufReef + c.bufHaz >= this.bufCap(c);
      for (const cargo of ['imp', 'rimp', 'reef', 'haz'] as const) {
        const avail = cargo === 'imp' ? c.buffer - c.bufRail - c.resOut : cargo === 'rimp' ? c.bufRail - c.resOutRail : cargo === 'reef' ? c.bufReef - c.resOutReef : c.bufHaz - c.resOutHaz;
        if (avail <= 0) continue;
        // Volle Fahrt abwarten, außer der Kran liefert nichts mehr nach
        if (avail < TRUCK_CAP && more && !full) continue;
        const acc = this.nearestAccess(ci, t.tile);
        if (!acc) continue;
        const slot = this.findSlot(Sim.storeOf(cargo), acc.access, c.zone, cargo);
        if (!slot) continue;
        offer('crane', full ? 3 : 2, acc.d + slot.d, {
          cargo,
          stage: 0,
          srcKind: 'crane',
          src: c.id,
          dstKind: 'store',
          dst: slot.tile,
          tgt: [acc.access, slot.access],
          n: Math.min(TRUCK_CAP, avail, slot.free),
        });
      }
      // 2. Export-Container zum Kran bringen, wenn dort ein Schiff beladen werden will
      if (ship && ship.exportLeft > 0) {
        let onTheWay = 0;
        for (const q of this.cranesAtBerth(ship.berthX, ship.len)) onTheWay += q.expBuf + q.resExpIn;
        const need = ship.exportLeft - onTheWay;
        const room = this.bufCap(c, true) - c.expBuf - c.resExpIn;
        if (need > 0 && room > 0) {
          const src = this.findSource(T.Yard, 'exp', t.tile, c.zone);
          const acc = src ? this.nearestAccess(ci, src.access) : null;
          if (src && acc) {
            offer('export', 2.6, src.d + acc.d, {
              cargo: 'exp',
              stage: 0,
              srcKind: 'store',
              src: src.tile,
              dstKind: 'crane',
              dst: c.id,
              tgt: [src.access, acc.access],
              n: Math.min(TRUCK_CAP, src.avail, room, need),
            });
          }
        }
      }
    }

    for (const g of this.gates) {
      if (!zOk(g.zone) || g.build) continue;
      // 3. Import-Container vom Lager zum Gate
      const room = GATE_APRON_CAP - g.apron.length - g.resIn;
      if (room > 0) {
        const starving = g.apron.length + g.resIn === 0;
        const gateCargo: Cargo[] = this.railShare > 0 ? ['imp', 'reef', 'haz'] : ['imp', 'rimp', 'reef', 'haz'];
        for (const cargo of gateCargo) {
          const src = this.findSource(Sim.storeOf(cargo), cargo, t.tile, g.zone);
          const acc = src ? this.nearestAccess(g, src.access) : null;
          if (!src || !acc) continue;
          offer('out', (starving ? 2.4 : 1.2) * (cargo === 'imp' ? press : 1.3), src.d + acc.d, {
            cargo,
            stage: 0,
            srcKind: 'store',
            src: src.tile,
            dstKind: 'gate',
            dst: g.id,
            tgt: [src.access, acc.access],
            n: Math.min(TRUCK_CAP, src.avail, room),
          });
        }
      }
      // 3b. Überzählige Leercontainer zurück an die Reederei, wenn das Leerlager voll läuft
      if (room > 0 && this.emptyCapacity > 0 && this.emptyStock / this.emptyCapacity > 0.6) {
        const src = this.findSource(T.Empty, 'empty', t.tile, g.zone);
        const acc = src ? this.nearestAccess(g, src.access) : null;
        if (src && acc) {
          offer('out', 0.9, src.d + acc.d, { cargo: 'empty', stage: 0, srcKind: 'store', src: src.tile, dstKind: 'gate', dst: g.id, tgt: [src.access, acc.access], n: Math.min(TRUCK_CAP, src.avail, room) });
        }
      }
      // 3c. Leercontainer von außen ins Leerlager
      const ein = g.emptyIn - g.resOutE;
      if (ein > 0) {
        const acc = this.nearestAccess(g, t.tile);
        const slot = acc ? this.findSlot(T.Empty, acc.access, g.zone) : null;
        if (acc && slot) offer('export', 1.2, acc.d + slot.d, { cargo: 'empty', stage: 0, srcKind: 'gate', src: g.id, dstKind: 'store', dst: slot.tile, tgt: [acc.access, slot.access], n: Math.min(TRUCK_CAP, ein, slot.free) });
      }
      // 4. Angekommene Export-Container vom Gate auf den Stapelplatz
      const waiting = g.inApron - g.resOut;
      if (waiting > 0) {
        const acc = this.nearestAccess(g, t.tile);
        const slot = acc ? this.findSlot(T.Yard, acc.access, g.zone, 'exp') : null;
        if (acc && slot) {
          offer('export', waiting >= TRUCK_CAP ? 1.8 : 1.3, acc.d + slot.d, {
            cargo: 'exp',
            stage: 0,
            srcKind: 'gate',
            src: g.id,
            dstKind: 'store',
            dst: slot.tile,
            tgt: [acc.access, slot.access],
            n: Math.min(TRUCK_CAP, waiting, slot.free),
          });
        }
      }
    }

    // 6. Verarbeitung: Lager → Packhalle → Veredelung → Ausgang
    for (const p of this.plants) {
      if (!zOk(p.zone) || p.build) continue;
      const room = PLANT_BUF - p.inBuf - p.resIn;
      const hungry = p.inBuf + p.resIn < PLANTS[p.kind].needs;
      if (room > 0 && p.kind === 'unpack') {
        const src = this.findSource(T.Yard, 'imp', t.tile, p.zone);
        const acc = src ? this.nearestAccess(p, src.access) : null;
        if (src && acc) {
          offer('plant', hungry ? 1.9 : 1.3, src.d + acc.d, {
            cargo: 'imp',
            stage: 0,
            srcKind: 'store',
            src: src.tile,
            dstKind: 'plant',
            dst: p.id,
            tgt: [src.access, acc.access],
            n: Math.min(TRUCK_CAP, src.avail, room),
          });
        }
      }
      if (room > 0 && p.kind === 'cold') {
        const src = this.findSource(T.Reefer, 'reef', t.tile, p.zone);
        const acc = src ? this.nearestAccess(p, src.access) : null;
        if (src && acc) {
          offer('plant', hungry ? 2.2 : 1.5, src.d + acc.d, {
            cargo: 'reef',
            stage: 0,
            srcKind: 'store',
            src: src.tile,
            dstKind: 'plant',
            dst: p.id,
            tgt: [src.access, acc.access],
            n: Math.min(TRUCK_CAP, src.avail, room),
          });
        }
      }
      if (room > 0 && p.kind === 'pack') {
        for (const q of this.plants) {
          const avail = q.outBuf - q.resOut;
          if (q.kind !== 'unpack' || avail <= 0 || q.zone !== p.zone) continue;
          const a1 = this.nearestAccess(q, t.tile);
          const a2 = a1 ? this.nearestAccess(p, a1.access) : null;
          if (!a1 || !a2) continue;
          offer('plant', hungry ? 2.1 : 1.5, a1.d + a2.d, {
            cargo: 'ware',
            stage: 0,
            srcKind: 'plant',
            src: q.id,
            dstKind: 'plant',
            dst: p.id,
            tgt: [a1.access, a2.access],
            n: Math.min(TRUCK_CAP, avail, room),
          });
        }
      }
      // Befüllhalle: Leergut aus dem Leerlager und Ware (aus der Packhalle oder vom Zug)
      if (p.kind === 'fill') {
        const roomE = PLANT_BUF - p.inEmpty - p.resInE;
        if (roomE > 0) {
          const src = this.findSource(T.Empty, 'empty', t.tile, p.zone);
          const acc = src ? this.nearestAccess(p, src.access) : null;
          if (src && acc) {
            offer('plant', p.inEmpty + p.resInE === 0 ? 2.1 : 1.4, src.d + acc.d, { cargo: 'empty', stage: 0, srcKind: 'store', src: src.tile, dstKind: 'plant', dst: p.id, tgt: [src.access, acc.access], n: Math.min(TRUCK_CAP, src.avail, roomE) });
          }
        }
        if (room > 0) {
          for (const q of this.plants) {
            const avail = q.outBuf - q.resOut;
            if (q.kind !== 'unpack' || avail <= 0 || q.zone !== p.zone || q.build) continue;
            const a1 = this.nearestAccess(q, t.tile);
            const a2 = a1 ? this.nearestAccess(p, a1.access) : null;
            if (a1 && a2) offer('plant', hungry ? 2 : 1.4, a1.d + a2.d, { cargo: 'ware', stage: 0, srcKind: 'plant', src: q.id, dstKind: 'plant', dst: p.id, tgt: [a1.access, a2.access], n: Math.min(TRUCK_CAP, avail, room) });
          }
          for (const r of this.rails) {
            const avail = r.goods - r.resOutG;
            if (avail <= 0 || r.zone !== p.zone || r.build) continue;
            const a1 = this.nearestAccess(r, t.tile);
            const a2 = a1 ? this.nearestAccess(p, a1.access) : null;
            if (a1 && a2) offer('plant', hungry ? 2.3 : 1.6, a1.d + a2.d, { cargo: 'ware', stage: 0, srcKind: 'rail', src: r.id, dstKind: 'plant', dst: p.id, tgt: [a1.access, a2.access], n: Math.min(TRUCK_CAP, avail, room) });
          }
        }
        // Fertige Export-Container auf den Stapelplatz
        const made = p.outBuf - p.resOut;
        if (made > 0) {
          const a1 = this.nearestAccess(p, t.tile);
          const slot = a1 ? this.findSlot(T.Yard, a1.access, p.zone, 'exp') : null;
          if (a1 && slot) offer('plant out', 2, a1.d + slot.d, { cargo: 'exp', stage: 0, srcKind: 'plant', src: p.id, dstKind: 'store', dst: slot.tile, tgt: [a1.access, slot.access], n: Math.min(TRUCK_CAP, made, slot.free) });
        }
        continue;
      }
      // Leere Container aus der Packhalle ins Leerlager
      if (p.kind === 'unpack') {
        const e = p.emptyOut - p.resOutE;
        if (e > 0) {
          const a1 = this.nearestAccess(p, t.tile);
          const slot = a1 ? this.findSlot(T.Empty, a1.access, p.zone) : null;
          if (a1 && slot) offer('plant out', 1.5, a1.d + slot.d, { cargo: 'empty', stage: 0, srcKind: 'plant', src: p.id, dstKind: 'store', dst: slot.tile, tgt: [a1.access, slot.access], n: Math.min(TRUCK_CAP, e, slot.free) });
        }
      }
      const done = p.kind !== 'unpack' ? p.outBuf - p.resOut : 0;
      const sold: Cargo = p.kind === 'cold' ? 'food' : 'prem';
      if (done > 0) {
        const a1 = this.nearestAccess(p, t.tile);
        if (!a1) continue;
        for (const g of this.gates) {
          if (g.zone !== p.zone || g.build) continue;
          const gr = GATE_APRON_CAP - g.apron.length - g.resIn;
          const a2 = gr > 0 ? this.nearestAccess(g, a1.access) : null;
          if (a2) {
            offer('plant out', 2.2, a1.d + a2.d, { cargo: sold, stage: 0, srcKind: 'plant', src: p.id, dstKind: 'gate', dst: g.id, tgt: [a1.access, a2.access], n: Math.min(TRUCK_CAP, done, gr) });
          }
        }
        for (const r of this.rails) {
          if (r.zone !== p.zone || r.build) continue;
          const rr = RAIL_CAP - r.platform - r.resIn;
          const a2 = rr > 0 ? this.nearestAccess(r, a1.access) : null;
          if (a2) {
            offer('plant out', 1.8, a1.d + a2.d, { cargo: sold, stage: 0, srcKind: 'plant', src: p.id, dstKind: 'rail', dst: r.id, tgt: [a1.access, a2.access], n: Math.min(TRUCK_CAP, done, rr) });
          }
        }
      }
    }

    // 5b. Leercontainer vom Zug ins Leerlager
    for (const r of this.rails) {
      const e = r.emptyIn - r.resOutE;
      if (!zOk(r.zone) || r.build || e <= 0) continue;
      const acc = this.nearestAccess(r, t.tile);
      const slot = acc ? this.findSlot(T.Empty, acc.access, r.zone) : null;
      if (acc && slot) offer('plant', 1.3, acc.d + slot.d, { cargo: 'empty', stage: 0, srcKind: 'rail', src: r.id, dstKind: 'store', dst: slot.tile, tgt: [acc.access, slot.access], n: Math.min(TRUCK_CAP, e, slot.free) });
    }

    // 5. Import-Container vom Lager zum Gleisanschluss
    for (const r of this.rails) {
      if (!zOk(r.zone) || r.build || !this.railLinked(r)) continue;
      const room = RAIL_CAP - r.platform - r.resIn;
      if (room <= 0) continue;
      // Die Bahn nimmt, was für die Bahn bestimmt ist. Gibt es kein Gate, auch normale Importe.
      const railCargo: Cargo[] = this.gates.length ? ['rimp', 'reef', 'haz'] : ['rimp', 'imp', 'reef', 'haz'];
      // Überzählige Leercontainer fahren mit dem Zug zurück
      if (this.emptyCapacity > 0 && this.emptyStock / this.emptyCapacity > 0.7) railCargo.push('empty');
      for (const cargo of railCargo) {
        const src = this.findSource(Sim.storeOf(cargo), cargo, t.tile, r.zone);
        const acc = src ? this.nearestAccess(r, src.access) : null;
        if (!src || !acc) continue;
        offer('out', 1.5 * (cargo === 'imp' ? press : 1.3), src.d + acc.d, {
          cargo,
          stage: 0,
          srcKind: 'store',
          src: src.tile,
          dstKind: 'rail',
          dst: r.id,
          tgt: [src.access, acc.access],
          n: Math.min(TRUCK_CAP, src.avail, room),
        });
      }
    }

    const job = best as Job | null;
    if (!job) return;
    this.srcRes(job, job.n);
    this.dstRes(job, job.n);
    t.job = job;
  }

  /** Aufnehmen am Startpunkt. Liefert false, wenn die Ware nicht mehr da ist. */
  private pickUp(t: Truck, j: Job): boolean {
    if (j.srcKind === 'crane') {
      const c = this.cranes.find((c) => c.id === j.src);
      if (!c) return false;
      if (j.cargo === 'reef') {
        if (c.bufReef < j.n) return false;
        c.bufReef -= j.n;
      } else if (j.cargo === 'haz') {
        if (c.bufHaz < j.n) return false;
        c.bufHaz -= j.n;
      } else if (j.cargo === 'rimp') {
        if (c.bufRail < j.n) return false;
        c.bufRail -= j.n;
        c.buffer -= j.n;
      } else {
        if (c.buffer - c.bufRail < j.n) return false;
        c.buffer -= j.n;
      }
    } else if (j.srcKind === 'store') {
      if (j.cargo === 'exp') {
        if (this.stockExp[j.src] < j.n) return false;
        this.stockExp[j.src] -= j.n;
      } else if (j.cargo === 'rimp') {
        if (this.stockRail[j.src] < j.n) return false;
        this.stockRail[j.src] -= j.n;
        this.stock[j.src] -= j.n;
      } else {
        if (this.stock[j.src] - (j.cargo === 'imp' ? this.stockRail[j.src] : 0) < j.n) return false;
        this.stock[j.src] -= j.n;
        if (j.cargo === 'reef') this.reefTimes.get(j.src)?.splice(0, j.n);
      }
    } else if (j.srcKind === 'plant') {
      const p = this.plants.find((p) => p.id === j.src);
      if (!p) return false;
      if (j.cargo === 'empty') {
        if (p.emptyOut < j.n) return false;
        p.emptyOut -= j.n;
      } else {
        if (p.outBuf < j.n) return false;
        p.outBuf -= j.n;
      }
    } else if (j.srcKind === 'rail') {
      const r = this.rails.find((r) => r.id === j.src);
      if (!r) return false;
      if (j.cargo === 'empty') {
        if (r.emptyIn < j.n) return false;
        r.emptyIn -= j.n;
      } else {
        if (r.goods < j.n) return false;
        r.goods -= j.n;
      }
    } else {
      const g = this.gates.find((g) => g.id === j.src);
      if (!g) return false;
      if (j.cargo === 'empty') {
        if (g.emptyIn < j.n) return false;
        g.emptyIn -= j.n;
      } else {
        if (g.inApron < j.n) return false;
        g.inApron -= j.n;
      }
    }
    this.srcRes(j, -j.n);
    t.load = j.n;
    t.cargo = j.cargo;
    j.stage = 1;
    return true;
  }

  private dropOff(t: Truck, j: Job): boolean {
    let fee = j.cargo === 'reef' ? REEFER_FEE : j.cargo === 'haz' ? HAZ_FEE : j.cargo === 'empty' ? EMPTY_FEE : FEE_PER_CONTAINER;
    if (j.cargo === 'prem') fee = this.price(this.plants.find((p) => p.id === j.src)?.product ?? 'elec');
    if (j.cargo === 'food') fee = this.price('food');
    // Auf Stufe 1 zahlen Spediteure einem kleinen Anleger weniger
    if (this.level < 2 && (j.cargo === 'imp' || j.cargo === 'rimp' || j.cargo === 'reef' || j.cargo === 'haz')) fee *= 0.6;
    fee = Math.round(fee * (1 + 0.05 * this.tech.sales) * (this.traits.includes('freezone') ? 1.1 : 1) * (this.world ? WORLD[this.world.id].fee : 1) * CYCLES[this.cycle.kind].fee * (j.cargo === 'reef' && this.spec === 'cold' ? 1.25 : 1));
    if (j.dstKind === 'gate' || j.dstKind === 'rail') {
      if (j.cargo === 'prem') this.premiumDone += j.n;
      if (j.cargo === 'food') this.foodDone += j.n;
    }
    if (j.dstKind === 'store') {
      if (j.cargo === 'exp') this.stockExp[j.dst] += j.n;
      else if (j.cargo === 'rimp') {
        this.stock[j.dst] += j.n;
        this.stockRail[j.dst] += j.n;
      } else {
        this.stock[j.dst] += j.n;
        if (j.cargo === 'reef') {
          const q = this.reefTimes.get(j.dst) ?? [];
          for (let k = 0; k < j.n; k++) q.push(this.gm);
          this.reefTimes.set(j.dst, q);
        }
      }
    } else if (j.dstKind === 'gate') {
      const g = this.gates.find((g) => g.id === j.dst);
      if (!g) return false;
      for (let k = 0; k < j.n; k++) g.apron.push(j.cargo === 'reef' ? fee + 100000 : j.cargo === 'haz' ? fee + 200000 : j.cargo === 'empty' ? fee + 300000 : fee);
    } else if (j.dstKind === 'rail') {
      const r = this.rails.find((r) => r.id === j.dst);
      if (!r) return false;
      r.platform += j.n;
      r.value += j.n * fee;
    } else if (j.dstKind === 'plant') {
      const p = this.plants.find((p) => p.id === j.dst);
      if (!p) return false;
      if (j.cargo === 'empty') p.inEmpty += j.n;
      else p.inBuf += j.n;
    } else {
      const c = this.cranes.find((c) => c.id === j.dst);
      if (!c) return false;
      c.expBuf += j.n;
    }
    this.dstRes(j, -j.n);
    t.load = 0;
    t.job = null;
    return true;
  }

  /** Wie viele Trucks gleichzeitig in diese Richtung über das Feld fahren können */
  laneCap(tile: number, dir: number): number {
    return ROAD_LANES[this.roadTier[tile]] + (this.oneway[tile] === dir ? 1 : 0);
  }

  private stepTruck(t: Truck, dt: number) {
    const j = t.job!;
    const tgt = j.tgt[j.stage];

    if (t.tile === tgt && t.next < 0) {
      t.wait = TRUCK_HANDLE_GM * (t.role === 'auto' ? 1 : ROUTINE_HANDLE);
      const storeTile = j.stage === 0 ? (j.srcKind === 'store' ? j.src : -1) : j.dstKind === 'store' ? j.dst : -1;
      if (storeTile >= 0 && this.rtgCovers(storeTile)) t.wait *= RTG_HANDLE;
      // Hohe Stapel: Wer unten steht, muss erst freigeräumt werden (Abholen vom Lager)
      // Umstapeln: Container anderer Art liegen im Weg (gemischte Felder), hohe Stapel dauern etwas länger
      else if (storeTile >= 0 && j.stage === 0) {
        const others = this.othersOn(storeTile, j.cargo);
        const fill = (this.stock[storeTile] + this.stockExp[storeTile]) / this.capAt(storeTile);
        t.wait *= 1 + 0.35 * Math.min(4, others) + 0.2 * Math.min(1, fill);
        if (others > 0) this.restacks++;
      }
      // Feld tief in einem großen Lagerblock: Ohne Portalkran dauert das Umsetzen länger
      if (storeTile >= 0 && this.storeDepth[storeTile] > 0) t.wait += this.storeDepth[storeTile] * 0.3 * (this.rtgCovers(storeTile) ? 0.3 : 1);
      const ok = j.stage === 0 ? this.pickUp(t, j) : this.dropOff(t, j);
      if (!ok) this.cancelJob(t);
      return;
    }
    if (this.driveTo(t, tgt, dt) === 'lost') this.cancelJob(t);
  }

  /** Ein Schritt Richtung Zielfeld: Weg suchen, Spur prüfen, fahren. 'lost' heißt: kein Weg. */
  private driveTo(t: Truck, tgt: number, dt: number): 'ok' | 'lost' {
    if (t.next < 0) {
      const d = this.distMap(tgt);
      const here = d[t.tile];
      if (here < 0) return 'lost';
      const x = t.tile % GRID_W;
      const y = (t.tile / GRID_W) | 0;
      // Nachbarn in der Reihenfolge Ost, Süd, West, Nord (entspricht der Spurrichtung)
      const cand = [x < GRID_W - 1 ? t.tile + 1 : -1, y < GRID_H - 1 ? t.tile + GRID_W : -1, x > 0 ? t.tile - 1 : -1, y > 0 ? t.tile - GRID_W : -1];
      let pick = -1;
      let pickDir = -1;
      for (let dir = 0; dir < 4; dir++) {
        const n = cand[dir];
        if (n < 0 || d[n] < 0 || d[n] + this.stepCost(n) !== here || !this.canStep(t.tile, n, dir)) continue;
        // Unter gleich kurzen Wegen den nehmen, dessen Spur frei ist
        const free = this.lane[n * 4 + dir] < this.laneCap(n, dir);
        if (pick < 0 || free) {
          pick = n;
          pickDir = dir;
          if (free) break;
        }
      }
      if (pick < 0) return 'lost';
      t.angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][pickDir];
      // Die Spur im nächsten Feld ist belegt: warten. Das ist der Stau.
      if (this.lane[pick * 4 + pickDir] >= this.laneCap(pick, pickDir) && t.stuck < TRUCK_PATIENCE_GM) {
        t.stuck += dt;
        this.roadJam[t.tile] += dt;
        return 'ok';
      }
      // Auf Einbahnstraßen gibt es zwei Spuren: der zweite Truck nimmt die linke
      t.slot = 0;
      if (this.oneway[pick] === pickDir && this.lane[pick * 4 + pickDir] > 0) {
        const taken = this.trucks.some((o) => o !== t && o.slot === 0 && (o.next === pick || (o.tile === pick && o.dir === pickDir)));
        t.slot = taken ? 1 : 0;
      }
      this.lane[pick * 4 + pickDir]++;
      t.next = pick;
      t.prog = 0;
      t.stuck = 0;
    }

    t.prog += (t.agv ? AGV_SPEED : TRUCK_SPEED) * ROAD_SPEED[this.roadTier[t.next]] * (t.agv ? 1 : this.eff('driver')) * (1 + 0.08 * this.tech.engine) * (t.role === 'auto' ? 1 : ROUTINE_SPEED) * (1 - WEAR_SLOWDOWN * t.wear) * dt;
    if (this.level >= 2) {
      this.addWear(t, WEAR_TRUCK_PER_GM * this.wearMul * (this.tech.diesel ? 1.3 : 1) * dt);
      if (t.wear >= 1) this.noteBroken('Ein Truck', { x: t.px, y: t.py });
    }
    const nx = t.next % GRID_W;
    const ny = (t.next / GRID_W) | 0;
    const cx = t.tile % GRID_W;
    const cy = (t.tile / GRID_W) | 0;
    t.angle = Math.atan2(ny - cy, nx - cx);
    if (t.prog >= 1) {
      if (t.dir >= 0 && this.lane[t.tile * 4 + t.dir] > 0) this.lane[t.tile * 4 + t.dir]--;
      t.dir = ny > cy ? 1 : ny < cy ? 3 : nx > cx ? 0 : 2;
      t.tile = t.next;
      t.next = -1;
      t.prog = 0;
      t.fx = nx;
      t.fy = ny;
    } else {
      t.fx = cx + (nx - cx) * t.prog;
      t.fy = cy + (ny - cy) * t.prog;
    }
    return 'ok';
  }

  /** Ohne Auftrag: nach kurzer Zeit zum nächsten freien Stellplatz fahren und dort warten */
  private idleTruck(t: Truck, dt: number) {
    t.idleFor = (t.idleFor ?? 0) + dt;
    if (t.parkAt !== undefined && t.parkAt >= 0 && this.kind[t.parkAt] !== T.Parking) {
      t.parkAt = -1;
      t.parked = false;
    }
    if (t.parked && t.next < 0) return;
    if (t.parkAt === undefined || t.parkAt < 0) {
      if (t.idleFor < 3 || t.next >= 0) return;
      let best: { p: number; a: number; d: number } | null = null;
      for (const p of this.parkTiles) {
        const used = this.trucks.reduce((n, o) => n + (o !== t && o.parkAt === p ? 1 : 0), 0);
        if (used >= PARK_SLOTS || this.zone[p] !== t.zone && t.zone !== 0) continue;
        for (const a of this.adjRoad(p)) {
          const d = this.distMap(a)[t.tile];
          if (d >= 0 && (!best || d < best.d)) best = { p, a, d };
        }
      }
      if (!best) return;
      t.parkAt = best.p;
      t.parkTgt = best.a;
      t.parked = false;
    }
    if (t.tile === t.parkTgt && t.next < 0) {
      t.parked = true;
      return;
    }
    if (this.driveTo(t, t.parkTgt!, dt) === 'lost') t.parkAt = -1;
  }
  get parkTiles(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.kind.length; i++) if (this.kind[i] === T.Parking) out.push(i);
    return out;
  }

  // ───────────────────────── Große Lagerblöcke ─────────────────────────

  private storeAccCache: Map<number, number[]> | null = null;
  /** Tiefe eines Lagerfelds im Block: 0 = direkt an der Straße */
  storeDepth = new Uint8Array(GRID_W * GRID_H);
  /** Zufahrten eines Lagerfelds: eigene Straßen, sonst die des ganzen zusammenhängenden Blocks */
  storeAccess(i: number): number[] {
    if (!this.storeAccCache) this.buildStoreBlocks();
    return this.storeAccCache!.get(i) ?? this.adjRoad(i);
  }
  private buildStoreBlocks() {
    const map = new Map<number, number[]>();
    this.storeDepth.fill(0);
    const isStore = (k: number) => k === T.Yard || k === T.Reefer || k === T.Hazmat || k === T.Empty;
    const seen = new Uint8Array(this.kind.length);
    for (let s0 = 0; s0 < this.kind.length; s0++) {
      if (seen[s0] || !isStore(this.kind[s0])) continue;
      const kind = this.kind[s0];
      // Block sammeln (gleiche Lagerart, 4er-Nachbarschaft)
      const block: number[] = [s0];
      seen[s0] = 1;
      for (let qi = 0; qi < block.length; qi++) {
        const c = block[qi];
        const cx = c % GRID_W;
        const cy = (c / GRID_W) | 0;
        for (const n of [cx > 0 ? c - 1 : -1, cx < GRID_W - 1 ? c + 1 : -1, cy > 0 ? c - GRID_W : -1, cy < GRID_H - 1 ? c + GRID_W : -1]) {
          if (n >= 0 && !seen[n] && this.kind[n] === kind) {
            seen[n] = 1;
            block.push(n);
          }
        }
      }
      const acc = new Set<number>();
      const depth = new Map<number, number>();
      const q: number[] = [];
      for (const c of block) {
        const own = this.adjRoad(c);
        for (const a of own) acc.add(a);
        if (own.length) {
          depth.set(c, 0);
          q.push(c);
          map.set(c, own);
        }
      }
      for (let qi = 0; qi < q.length; qi++) {
        const c = q[qi];
        const cx = c % GRID_W;
        const cy = (c / GRID_W) | 0;
        for (const n of [cx > 0 ? c - 1 : -1, cx < GRID_W - 1 ? c + 1 : -1, cy > 0 ? c - GRID_W : -1, cy < GRID_H - 1 ? c + GRID_W : -1]) {
          if (n >= 0 && this.kind[n] === kind && !depth.has(n)) {
            depth.set(n, depth.get(c)! + 1);
            q.push(n);
          }
        }
      }
      const all = [...acc];
      for (const c of block) {
        if (!map.has(c)) map.set(c, all);
        this.storeDepth[c] = Math.min(255, depth.get(c) ?? 0);
      }
    }
    this.storeAccCache = map;
  }

  // ───────────────────────── Portalkran ─────────────────────────

  /** Liegen alle 3 × 3 Felder um (x, y) auf Lagerfläche? */
  rtgFits(x: number, y: number): boolean {
    for (let yy = y - 1; yy <= y + 1; yy++) {
      for (let xx = x - 1; xx <= x + 1; xx++) {
        if (!this.inBounds(xx, yy)) return false;
        const k = this.kind[this.idx(xx, yy)];
        if (k !== T.Yard && k !== T.Reefer && k !== T.Hazmat && k !== T.Empty) return false;
      }
    }
    return true;
  }
  /** Plan: Portalkräne so verteilen, dass möglichst viel Lagerfläche abgedeckt ist */
  rtgPlan(): { x: number; y: number }[] {
    const taken = this.rtgs.map((r) => ({ x: r.x, y: r.y }));
    const plan: { x: number; y: number }[] = [];
    for (let y = 1; y < GRID_H - 1; y++) {
      for (let x = 1; x < GRID_W - 1; x++) {
        if (!this.rtgFits(x, y)) continue;
        if ([...taken, ...plan].some((r) => Math.abs(r.x - x) <= 2 && Math.abs(r.y - y) <= 2)) continue;
        plan.push({ x, y });
      }
    }
    return plan;
  }

  // ───────────────────────── Liegeplätze sperren ─────────────────────────

  /** Gesperrte Kaipositionen: Dort legt kein neues Schiff an */
  closedQ = new Uint8Array(Q_MAX);
  /** Sperrt oder öffnet die ganze zusammenhängende Kaikante an diesem Feld */
  toggleBerthClosed(x: number, y: number): BuildCheck {
    const q = qOf(x, y);
    if (q < 0 || !this.isKai(q)) return { ok: false, reason: 'Nur an einer Kaimauer', cost: 0 };
    const close = !this.closedQ[q];
    let a = q;
    while (this.isKai(a - 1)) a--;
    for (let k = a; this.isKai(k); k++) this.closedQ[k] = close ? 1 : 0;
    this.version++;
    this.emit(close ? 'Liegeplatz gesperrt: Hier legt kein neues Schiff mehr an.' : 'Liegeplatz wieder offen.', 'info');
    return { ok: true, cost: 0 };
  }

  // ───────────────────────── Tick ─────────────────────────

  tick() {
    const dt = TICK_GM;
    this.tickCount++;
    this.gm += dt;
    for (const t of this.trucks) {
      t.px = t.fx;
      t.py = t.fy;
    }
    for (const s of this.ships) {
      s.px = s.x;
      s.py = s.y;
    }

    this.updateConstruction(dt);
    if (this.tickCount % 150 === 0) {
      this.rollBreakdowns();
      this.hourTick();
    }
    this.updatePower(dt);
    this.updateWeather(dt);
    this.updateStaff(dt);
    this.spawnShips(dt);
    this.updateShips(dt);
    this.updateCranes(dt);
    this.updateTrucks(dt);
    this.updateGates(dt);
    this.updateRails(dt);
    this.updatePlants(dt);
    this.updateReefers();
    this.updateStats();
    this.updateLevel();
    this.checkScenario();
    this.updateMissions();
    this.rollDay();
  }

  // ───────────────────────── Personal ─────────────────────────

  /** So viele Leute braucht der jetzige Ausbau. */
  staffNeed(role: Role): number {
    if (role === 'driver') return this.trucks.filter((t) => !t.agv).length;
    if (role === 'mech') return this.shops.length;
    return role === 'crane' ? this.cranes.length + this.rtgs.length : this.gates.length;
  }
  /** Angestellt und nicht krank */
  staffAvail(role: Role): number {
    if (role === 'driver' && this.strikeLeft > 0) return 0;
    return Math.max(0, this.staff[role] - this.sick[role].length - (this.trainLeft[role] > 0 ? 1 : 0));
  }
  wagePerHour(role: Role): number {
    // Größere Häfen zahlen Tariflohn: +8 % je Stufe
    const night = (this.nightShift && this.isNight ? NIGHT_WAGE : 1) * (this.traits.includes('union') ? 1.15 : 1);
    return Math.round(ROLES[role].wage * DIFFS[this.diff].wage * this.wageBoost[role] * (1 + 0.08 * (Math.min(this.level, 7) - 1)) * WAGE_POLICY[this.wagePolicy].mul * night);
  }
  /** Ein wartendes Schiff vorziehen: kostet Lotsengebühr, die anderen Wartenden werden ungeduldiger */
  prioritize(id: number): BuildCheck {
    const cost = Math.round((3_000 * this.inflation) / 500) * 500;
    const s = this.ships.find((x) => x.id === id);
    if (!s || s.state !== 'queued') return { ok: false, reason: 'Nur wartende Schiffe lassen sich vorziehen', cost };
    if (s.vip) return { ok: false, reason: 'Das Schiff ist schon vorgezogen', cost };
    if (this.money < cost) return { ok: false, reason: 'Zu wenig Geld', cost };
    this.money -= cost;
    this.today.building += cost;
    s.vip = true;
    s.queuedFor = Math.max(0, s.queuedFor - 60);
    for (const o of this.ships) if (o !== s && o.state === 'queued') o.queuedFor += 45;
    this.emit(`${s.name} wird vorgezogen (Lotsengebühr ${eur(cost)}). Die anderen Wartenden werden ungeduldiger.`, 'info');
    return { ok: true, cost };
  }

  // ───────────────────────── Warum steht das? ─────────────────────────

  craneWhy(c: Crane): string {
    if (c.build) return 'Im Bau oder Umbau.';
    if (c.wear >= 1) return 'Ausgefallen: Eine Werkstatt mit Mechaniker repariert ihn.';
    if (c.state === 'power') return 'Stromausfall: Batterien würden überbrücken.';
    if (c.state === 'storm') return 'Sturm: Alle Kräne stehen still.';
    if (!c.staffed) return 'Kein Kranführer im Dienst: Stelle im Personal jemanden ein.';
    const q = this.cq(c);
    if (this.berthContaining(q) < 0) return 'Steht an keinem Liegeplatz: Dafür braucht es 4 Kai-Felder in einer Reihe.';
    if (this.closedQ[q]) return 'Der Liegeplatz ist gesperrt.';
    if (c.state === 'blocked') {
      const kind = c.bufHaz ? T.Hazmat : c.bufReef ? T.Reefer : T.Yard;
      if (!this.hasFreeStore(kind, c.zone)) return 'Puffer voll und das passende Lager ist voll. Baue Lager oder mehr Ausgänge.';
      if (this.trucks.every((t) => t.job || t.wear >= 1 || !t.staffed)) return 'Puffer voll: Kein freier Truck holt ab. Kaufe Trucks oder gib welchen die Rolle „Kran räumen“.';
      return 'Puffer voll: Trucks sind unterwegs, aber zu langsam. Prüfe Wege und Staus.';
    }
    if (c.state === 'working') return 'Arbeitet am Schiff.';
    return 'Wartet auf ein Schiff.';
  }
  gateWhy(g: Gate): string {
    if (g.build) return 'Im Bau.';
    if (!g.staffed) return 'Kein Gate-Personal im Dienst: Stelle im Personal jemanden ein.';
    if (!this.accessOf(g).length) return 'Keine Straße am Gate: Trucks kommen nicht hin.';
    if (g.proc > 0) return g.procIn ? 'Nimmt gerade etwas von außen an.' : 'Fertigt gerade einen Container ab.';
    const road = this.yardTiles.filter((i) => this.zone[i] === g.zone).reduce((n, i) => n + this.stock[i] - this.stockRail[i], 0);
    if (!g.apron.length && !road) return 'Kein Container im Lager, der über die Straße raus soll.';
    if (!g.apron.length) return 'Wartet auf Trucks: Container liegen im Lager, aber kein Truck bringt sie.';
    return 'Bereit.';
  }
  plantWhy(p: Plant): string {
    if (p.build) return 'Im Bau.';
    if (this.powerDown) return 'Stromausfall: Die Halle steht.';
    if (p.proc > 0) return 'Arbeitet.';
    if (p.outBuf >= PLANT_BUF) return 'Ausgang voll: Es fehlt ein Truck, der abholt (Rolle „Verarbeitung“ hilft).';
    if (p.kind === 'fill') {
      if (p.inEmpty < 1) return this.emptyTiles.length ? 'Kein Leergut: Das Leerlager ist leer oder kein Truck bringt welches.' : 'Kein Leergut: Baue ein Leerlager.';
      if (p.inBuf < 1) return 'Keine Ware: Sie kommt aus der Packhalle oder mit dem Zug.';
    }
    if (p.kind === 'unpack' && p.inBuf < 1) return 'Kein Import-Container im Lager oder kein Truck bringt einen.';
    if (p.kind === 'pack' && p.inBuf < 2) return 'Braucht 2 Ladungen ausgepackte Ware aus der Packhalle.';
    if (p.kind === 'cold' && p.inBuf < 1) return 'Keine Kühlcontainer auf den Kühlplätzen.';
    return 'Bereit.';
  }
  truckWhy(t: Truck): string {
    if (t.build) return 'In der Generalüberholung.';
    if (t.wear >= 1) return 'Ausgefallen: Eine Werkstatt mit Mechaniker repariert ihn.';
    if (!t.staffed) return this.strikeLeft > 0 ? 'Streik: Die Fahrer arbeiten nicht.' : 'Kein Fahrer im Dienst: Stelle im Personal jemanden ein.';
    if (t.stuck > 0) return 'Steht im Stau.';
    if (t.job) return '';
    if (t.parked) return 'Wartet auf dem Stellplatz auf einen Auftrag.';
    if (t.role !== 'auto') return 'Für seine feste Rolle gibt es gerade keine Fahrt.';
    return 'Kein Auftrag: Gerade ist nichts zu fahren.';
  }

  /** Truck gegen einen neuen tauschen: Der alte wird in Zahlung gegeben (je nach Zustand) */
  replaceCost(id: number): number {
    const t = this.trucks.find((x) => x.id === id);
    if (!t) return 0;
    return Math.max(0, this.costOf('truck') - Math.round(t.paid * 0.35 * t.cap * (1 - t.wear * 0.5)));
  }
  replaceTruck(id: number): BuildCheck {
    const t = this.trucks.find((x) => x.id === id);
    const cost = this.replaceCost(id);
    if (!t) return { ok: false, reason: 'Der Truck existiert nicht mehr', cost };
    if (t.job) return { ok: false, reason: 'Der Truck ist gerade unterwegs', cost };
    if (this.money < cost) return { ok: false, reason: 'Zu wenig Geld', cost };
    this.money -= cost;
    this.today.building += cost;
    t.cap = 1;
    t.wear = 0;
    t.agv = false;
    t.build = 0;
    t.paid = this.costOf('truck');
    this.version++;
    return { ok: true, cost };
  }

  /** Was der Hafen pro Tag schaffen könnte, wenn genug Schiffe kommen (grobe Schätzung je Stufe) */
  potential(): { crane: number; out: number; trucks: number; best: number; limit: string; fee: number } {
    const crane = Math.round(this.cranes.filter((c) => !c.build).reduce((n, c) => n + (60 / this.moveTime({ ...c, wear: Math.min(c.wear, 1 - c.cap) })) * 24, 0));
    const gates = this.gates.filter((g) => !g.build).reduce((n, g) => n + (60 / (GATE_PROCESS_GM / (1 + 0.2 * this.tech.scanner) / this.hinterlandMul(g))) * 24, 0);
    const rails = this.rails.filter((r) => !r.build && this.railLinked(r)).length * RAIL_CAP * (1440 / (RAIL_INTERVAL_GM * (this.traits.includes('railhub') ? 0.67 : 1)));
    const out = Math.round(gates + rails);
    // Ein Truck schafft je Fahrt 2 Container, eine Fahrt dauert grob 10 Spielminuten
    const trucks = Math.round(this.trucks.filter((t) => t.staffed && t.wear < 1).length * TRUCK_CAP * (1440 / 10) / 2);
    const best = Math.min(crane, out, trucks);
    const limit = best === crane ? 'Kräne' : best === out ? 'Gates und Bahn' : 'Trucks';
    const hist = this.history.slice(-7);
    const handled = hist.reduce((n, h) => n + h.handled, 0);
    const fees = hist.reduce((n, h) => n + h.fees + h.rail + h.exportFees, 0);
    return { crane, out, trucks, best, limit, fee: handled ? fees / handled : FEE_PER_CONTAINER };
  }

  /** Weiterbildung: Die Belegschaft einer Rolle wird erfahrener, einer fehlt dafür ein paar Tage */
  trainCost(_role?: Role): number {
    return Math.round((9_000 * this.inflation) / 500) * 500;
  }
  canTrain(role: Role): BuildCheck {
    const cost = this.trainCost(role);
    if (this.staff[role] <= 0) return { ok: false, reason: 'Niemand angestellt', cost };
    if (this.trainLeft[role] > 0) return { ok: false, reason: `Läuft noch ${this.trainLeft[role]} Tage`, cost };
    if (this.xp[role] >= 0.98) return { ok: false, reason: 'Schon voll ausgebildet', cost };
    if (this.money < cost) return { ok: false, reason: 'Zu wenig Geld', cost };
    return { ok: true, cost };
  }
  train(role: Role): BuildCheck {
    const chk = this.canTrain(role);
    if (!chk.ok) return chk;
    this.money -= chk.cost;
    this.today.building += chk.cost;
    this.xp[role] = Math.min(1, this.xp[role] + 0.2);
    this.trainLeft[role] = 3;
    this.emit(`${ROLES[role].name}: Weiterbildung läuft 3 Tage. Eine Kraft fehlt solange.`, 'info');
    return chk;
  }

  /** Neue Leute fangen mit wenig Erfahrung an und verdünnen den Schnitt der Belegschaft */
  private addStaff(role: Role) {
    const n = this.staff[role];
    this.xp[role] = (this.xp[role] * n + 0.3) / (n + 1);
    this.staff[role]++;
  }
  hire(role: Role) {
    this.addStaff(role);
  }
  /** Stunde des Tages 0..24 */
  get hour(): number {
    return (this.gm % MIN_PER_DAY) / 60;
  }
  get isNight(): boolean {
    return this.hour >= 22 || this.hour < 6;
  }
  /** Leistung einer Belegschaft: Erfahrung, Stimmung und Nachtbetrieb */
  eff(role: Role): number {
    const xp = 0.85 + 0.3 * this.xp[role];
    const mood = 0.95 + 0.1 * this.mood;
    return xp * mood * (this.isNight && !this.nightShift ? NIGHT_SLOW : 1);
  }
  get season(): { index: number; name: string; text: string } {
    const i = Math.floor((this.day - 1) / SEASON_DAYS) % 4;
    return { index: i, ...SEASONS[i] };
  }
  get cycleInfo() {
    return { ...CYCLES[this.cycle.kind], kind: this.cycle.kind, left: this.cycle.left };
  }
  /** Zinsfaktor: Guter Ruf und Pünktlichkeit machen Kredit billiger */
  get rateMul(): number {
    return clamp(1.7 - this.rep / 100 - (this.myRate ?? 0.5) * 0.4, 0.7, 1.6);
  }
  fire(role: Role): BuildCheck {
    if (this.staff[role] <= 0) return { ok: false, reason: 'Niemand angestellt', cost: 0 };
    this.staff[role]--;
    // Wer krank ist und entlassen wird, zählt nicht mehr als krank
    if (this.sick[role].length > this.staff[role]) this.sick[role].pop();
    return { ok: true, cost: 0 };
  }

  /** Stellt alle Baustellen sofort fertig (Demo-Hafen, Szenarien, Tests) */
  finishAll() {
    for (const e of [...this.cranes, ...this.gates, ...this.plants, ...this.rails, ...this.rtgs, ...this.shops, ...this.trucks]) e.build = 0;
    this.version++;
  }

  /** Baustellen und Umbauten laufen weiter. Fertige melden sich. */
  private updateConstruction(dt: number) {
    const step = (e: { build?: number; x?: number; y?: number }, name: string) => {
      if (!e.build) return;
      e.build = Math.max(0, e.build - dt);
      if (e.build === 0) {
        this.version++;
        if (name) this.emit(`${name} ist fertig.`, 'good', { tag: 'built', x: e.x, y: e.y });
      }
    };
    for (const c of this.cranes) step(c, CRANE_MODELS[c.model].name);
    for (const g of this.gates) step(g, 'Gate');
    for (const p of this.plants) step(p, PLANTS[p.kind].name);
    for (const r of this.rails) step(r, 'Gleisanschluss');
    for (const r of this.rtgs) step(r, 'Portalkran');
    for (const sh of this.shops) step(sh, 'Werkstatt');
    for (const t of this.trucks) step(t, '');
  }

  // ───────────────────────── Strom ─────────────────────────

  /** Verbrauch des Hafens in kW */
  powerDemand(): number {
    const K = POWER_KW;
    let kw = 0;
    for (const c of this.cranes) if (!c.build) kw += K[c.model];
    kw += this.rtgs.length * K.rtg + this.reeferTiles.length * K.reeferTile + this.gates.length * K.gate + this.shops.length * K.shop;
    for (const p of this.plants) kw += p.kind === 'cold' ? K.cold : K.plant;
    return kw;
  }
  get solarTiles(): number {
    let n = 0;
    for (let i = 0; i < this.kind.length; i++) if (this.kind[i] === T.Solar) n++;
    return n;
  }
  get batteryCap(): number {
    let n = 0;
    for (let i = 0; i < this.kind.length; i++) if (this.kind[i] === T.Battery) n++;
    return n * BATTERY_KWH;
  }
  /** Leistung der Solarflächen gerade jetzt (Sonne zwischen 6 und 20 Uhr) */
  solarNow(): number {
    const h = this.hour;
    if (h < 6 || h > 20) return 0;
    const sun = Math.sin(((h - 6) / 14) * Math.PI);
    return this.solarTiles * SOLAR_KW * sun * (this.weather === 'clear' ? 1 : 0.3);
  }
  /** Stromausfall: Batterien überbrücken, sonst stehen Kräne und Hallen, Kühlcontainer verderben schneller */
  private updatePower(dt: number) {
    if (this.powerOutLeft <= 0) {
      this.powerDown = false;
      return;
    }
    this.powerOutLeft -= dt;
    const need = Math.max(0, this.powerDemand() - this.solarNow()) * (dt / 60);
    if (this.batteryCharge >= need) {
      this.batteryCharge -= need;
      this.powerDown = false;
    } else {
      this.batteryCharge = 0;
      this.powerDown = true;
      for (const i of this.reeferTiles) {
        const q = this.reefTimes.get(i);
        if (q) for (let k = 0; k < q.length; k++) q[k] -= dt;
      }
    }
    if (this.powerOutLeft <= 0) {
      this.powerDown = false;
      this.emit('Der Strom ist wieder da.', 'good');
    }
  }

  /** Stündlich: Strom abrechnen, Messwerte sammeln, Regeln ausführen */
  private hourTick() {
    const kw = this.powerDemand();
    const solar = this.solarNow();
    const net = kw - solar;
    if (net < 0) this.batteryCharge = Math.min(this.batteryCap, this.batteryCharge - net);
    else if (this.powerOutLeft <= 0) {
      const cost = net * POWER_PRICE;
      this.money -= cost;
      this.today.power = (this.today.power ?? 0) + cost;
    }
    // Akkus laden auch nachts etwas aus dem Netz nach, damit sie beim Ausfall helfen
    if (this.batteryCharge < this.batteryCap) {
      const add = Math.min(this.batteryCap - this.batteryCharge, this.batteryCap * 0.05);
      this.batteryCharge += add;
      this.money -= add * POWER_PRICE;
      this.today.power = (this.today.power ?? 0) + add * POWER_PRICE;
    }
    // Stromausfall würfeln (ab Stufe 2, bei Sturm öfter)
    if (this.level >= 2 && this.powerOutLeft <= 0 && this.rnd() < 0.008 * (this.weather === 'storm' ? 3 : 1)) {
      this.powerOutLeft = 90 + this.rnd() * 90;
      this.emit(this.batteryCap > 0 ? 'Stromausfall! Die Batterien übernehmen.' : 'Stromausfall! Kräne und Hallen stehen, Kühlcontainer verderben schneller. Batterien würden überbrücken.', 'bad', { tag: 'broken' });
    }
    // Messwerte
    const cap = this.yardCapacity;
    const tr = this.trucks.length || 1;
    this.hourly.push({
      yard: cap ? this.yardStock / cap : 0,
      wait: this.ships.filter((x) => x.state === 'queued').length,
      idle: this.trucks.filter((t) => !t.job && t.wait <= 0).length / tr,
      jam: this.trucks.filter((t) => t.stuck > 0).length / tr,
      kw,
      solar,
      done: this.containersDone - this.doneLast,
    });
    this.doneLast = this.containersDone;
    if (this.hourly.length > 48) this.hourly.shift();
    for (const c of this.cranes) {
      const h = this.craneHist.get(c.id) ?? [];
      h.push(c.moves ?? 0);
      if (h.length > 24) h.shift();
      this.craneHist.set(c.id, h);
      c.moves = 0;
    }
    for (const g of this.gates) {
      const h = this.gateHist.get(g.id) ?? [];
      h.push(g.served - (this.gateLast.get(g.id) ?? g.served));
      if (h.length > 24) h.shift();
      this.gateHist.set(g.id, h);
      this.gateLast.set(g.id, g.served);
    }
    this.applyRules();
  }

  // ───────────────────────── Regeln ─────────────────────────

  ruleTrue(c: RuleCond): boolean {
    switch (c) {
      case 'yardHigh':
        return this.yardCapacity > 0 && this.yardStock / this.yardCapacity > 0.8;
      case 'yardLow':
        return this.yardCapacity > 0 && this.yardStock / this.yardCapacity < 0.3;
      case 'shipsWait':
        return this.ships.filter((x) => x.state === 'queued').length >= 2;
      case 'night':
        return this.isNight;
      case 'day':
        return !this.isNight;
      case 'reeferHigh':
        return this.reeferCapacity > 0 && this.reeferStock / this.reeferCapacity > 0.7;
      case 'powerOut':
        return this.powerOutLeft > 0;
    }
  }
  private applyRules() {
    for (const r of this.rules) {
      if (!r.on || !this.ruleTrue(r.cond)) continue;
      if (r.act.startsWith('role:')) {
        const role = r.act.slice(5) as TruckRole;
        if (this.trucks.every((t) => t.role === role)) continue;
        for (const t of this.trucks) t.role = role;
      } else {
        const on = r.act === 'shift:on';
        if (this.nightShift === on) continue;
        this.nightShift = on;
      }
      this.emit(`Regel: ${RULE_CONDS[r.cond]} → ${RULE_ACTS[r.act]}`, 'info');
    }
  }
  addRule(cond: RuleCond, act: RuleAct): BuildCheck {
    if (this.rules.length >= MAX_RULES) return { ok: false, reason: `Höchstens ${MAX_RULES} Regeln`, cost: 0 };
    this.rules.push({ cond, act, on: true });
    return { ok: true, cost: 0 };
  }

  /** Zwei zufällige Besonderheiten für einen neuen Hafen */
  rollTraits() {
    const ids = Object.keys(TRAITS) as TraitId[];
    const a = this.pick(ids);
    let b = this.pick(ids);
    while (b === a) b = this.pick(ids);
    this.traits = [a, b];
  }

  /** Stündlich: Alte Geräte fallen öfter einfach aus (ab Stufe 2, wenn es Werkstätten gibt) */
  private rollBreakdowns() {
    if (this.level < 2) return;
    for (const o of [...this.cranes, ...this.trucks]) {
      if (o.build || o.wear >= 1) continue;
      if (this.rnd() < CRASH_RATE * (1 - o.cap) ** 2) {
        o.wear = 1;
        this.noteBroken('model' in o ? 'Ein Kran' : 'Ein Truck', 'model' in o ? o : { x: o.px, y: o.py });
      }
      // Unfall: Ein alter oder überlasteter Kran lässt einen Container fallen
      if ('model' in o && o.state === 'working') {
        const risk = (o.cap < 0.55 ? (0.55 - o.cap) * 0.12 : 0) + (this.tech.akkord ? 0.004 : 0) + (o.wear > 0.8 ? 0.01 : 0);
        if (this.rnd() < risk) {
          const cost = Math.round((12_000 * this.inflation) / 500) * 500;
          this.money -= cost;
          this.today.penalty += cost;
          this.rep = Math.max(0, this.rep - 3);
          this.mood = Math.max(0, this.mood - 0.1);
          o.build = o.buildMax = 180;
          this.emit(`Unfall am Kran: Ein Container ist abgestürzt. Der Bereich ist 3 Stunden gesperrt. −${eur(cost)}, Ruf −3`, 'bad', { tag: 'broken', x: o.x, y: o.y });
        }
      }
    }
  }

  /** Verteilt die anwesenden Leute und zahlt den Lohn. Kranke bekommen weiter Lohn. */
  private updateStaff(dt: number) {
    let n = this.staffAvail('driver');
    for (const t of this.trucks) t.staffed = !t.build && (t.agv || n-- > 0);
    n = this.staffAvail('crane');
    for (const c of this.cranes) c.staffed = !c.build && n-- > 0;
    for (const r of this.rtgs) r.staffed = !r.build && n-- > 0;
    n = this.staffAvail('gate');
    for (const g of this.gates) g.staffed = !g.build && n-- > 0;
    n = this.staffAvail('mech');
    for (const s of this.shops) s.staffed = !s.build && n-- > 0;
    if (this.strikeLeft > 0) {
      this.strikeLeft -= dt;
      if (this.strikeLeft <= 0) this.emit('Der Streik ist vorbei. Die Fahrer arbeiten wieder.', 'good');
    }
    this.updateShops(dt);
    let perHour = 0;
    for (const r of Object.keys(ROLES) as Role[]) perHour += this.staff[r] * this.wagePerHour(r);
    const pay = (perHour * dt) / 60;
    this.money -= pay;
    this.today.wages += pay;
  }

  private noteBroken(what: string, at?: { x: number; y: number }) {
    if (this.gm - this.brokeNote < 120) return;
    this.brokeNote = this.gm;
    this.emit(
      `${what} ist ausgefallen. ${this.shops.length ? 'Die Werkstatt kümmert sich darum.' : 'Baue eine Werkstatt mit Mechaniker.'}`,
      'bad',
      { tag: 'broken', x: at ? Math.floor(at.x) : undefined, y: at ? Math.floor(at.y) : undefined },
    );
  }

  /** Jede besetzte Werkstatt repariert das am stärksten abgenutzte Gerät. */
  private updateShops(dt: number) {
    const busy = new Set(this.shops.map((s) => (s.target ? `${s.target.kind}${s.target.id}` : '')));
    for (const s of this.shops) {
      if (!s.staffed) continue;
      let obj: { wear: number; cap: number } | undefined = s.target
        ? s.target.kind === 'crane'
          ? this.cranes.find((c) => c.id === s.target!.id)
          : this.trucks.find((t) => t.id === s.target!.id)
        : undefined;
      // Repariert wird nur bis zum Höchstzustand
      const over = (o: { wear: number; cap: number }) => o.wear - (1 - o.cap);
      if (!obj || over(obj) <= 0.02) {
        s.target = null;
        let best: { kind: 'crane' | 'truck'; id: number; wear: number } | null = null;
        for (const c of this.cranes) if (over(c) > 0.3 && !c.build && !busy.has(`crane${c.id}`) && (!best || over(c) > best.wear)) best = { kind: 'crane', id: c.id, wear: over(c) };
        for (const t of this.trucks) if (over(t) > 0.3 && !t.build && !busy.has(`truck${t.id}`) && (!best || over(t) > best.wear)) best = { kind: 'truck', id: t.id, wear: over(t) };
        if (!best) continue;
        s.target = { kind: best.kind, id: best.id };
        busy.add(`${best.kind}${best.id}`);
        obj = best.kind === 'crane' ? this.cranes.find((c) => c.id === best!.id) : this.trucks.find((t) => t.id === best!.id);
      }
      if (obj) obj.wear = Math.max(1 - obj.cap, obj.wear - REPAIR_PER_GM * dt);
    }
  }

  /** Jeden Morgen: Kranke werden gesund, neue melden sich krank. */
  private rollSickness() {
    const p = DIFFS[this.diff].sick * (this.tech.akkord ? 2 : 1) * (this.mood < 0.4 ? 1.3 : 1);
    for (const r of Object.keys(ROLES) as Role[]) {
      this.sick[r] = this.sick[r].map((d) => d - 1).filter((d) => d > 0);
      let fresh = 0;
      for (let i = this.sick[r].length; i < this.staff[r]; i++) {
        if (this.rnd() < p) {
          this.sick[r].push(1 + Math.floor(this.rnd() * 2));
          fresh++;
        }
      }
      if (fresh) {
        const short = this.staffAvail(r) < this.staffNeed(r);
        this.emit(`${fresh} ${ROLES[r].plural} krank gemeldet.${short ? ' Es fehlen Leute: Stelle im Personal Ersatz ein.' : ''}`, short ? 'bad' : 'info', { tag: 'spoil' });
      }
    }
  }

  // ───────────────────────── Wetter ─────────────────────────

  private updateWeather(dt: number) {
    if (this.weather !== 'clear') {
      this.weatherLeft -= dt;
      if (this.weatherLeft <= 0) {
        const was = this.weather;
        this.weather = 'clear';
        this.emit(was === 'storm' ? 'Der Sturm ist vorbei. Die Kräne arbeiten wieder.' : 'Der Nebel hat sich gelichtet. Die Einfahrt ist frei.', 'good', { tag: 'weather-end' });
      }
      return;
    }
    const f = this.forecast;
    if (!f) return;
    f.in -= dt;
    if (!f.warned && f.in <= 120) {
      f.warned = true;
      const at = this.clockAt(this.gm + f.in);
      this.emit(
        f.kind === 'storm' ? `Sturmwarnung: Ab ${at} Uhr stehen die Kräne still.` : `Nebelwarnung: Ab ${at} Uhr ist die Einfahrt gesperrt.`,
        'info',
        { tag: 'weather-warn' },
      );
    }
    if (f.in <= 0) {
      this.weather = f.kind;
      this.weatherLeft = f.dur;
      this.forecast = null;
      this.emit(f.kind === 'storm' ? 'Sturm! Die Kräne stehen still.' : 'Nebel! Kein Schiff kann einlaufen.', 'bad', { tag: 'weather-start' });
    }
  }

  /** Löst sofort Wetter aus (für Tests und zum Ausprobieren). */
  setWeather(kind: Weather, dur = 180) {
    this.weather = kind;
    this.weatherLeft = kind === 'clear' ? 0 : dur;
    this.forecast = null;
  }

  private planWeather() {
    if (this.level < 2 || this.forecast || this.weather !== 'clear' || this.rnd() > (this.season.index === 3 ? 0.75 : 0.55) + (this.traits.includes('stormy') ? 0.2 : 0)) return;
    const kind = this.rnd() < 0.5 ? 'storm' : 'fog';
    this.forecast = { kind, in: 180 + this.rnd() * 900, dur: kind === 'storm' ? 120 + this.rnd() * 120 : 120 + this.rnd() * 90, warned: false };
  }

  // ───────────────────────── Schiffe ─────────────────────────

  private addShip(type: ShipTypeId, c: Contract | null, reefer: boolean) {
    const st = SHIP_TYPES[type];
    const n = 100 + Math.floor(this.rnd() * 900);
    const reefers = reefer ? Math.round(st.containers * Math.min(0.5, REEFER_SHARE * (this.spec === 'cold' ? 1.4 : 1))) : 0;
    // Gefahrgut kommt nur, wenn es eine Fläche dafür gibt
    const haz = this.level >= 3 && this.hazCapacity >= 4 && this.rnd() < 0.5 ? Math.round(st.containers * HAZ_SHARE) : 0;
    const exp = this.level >= 2 ? Math.round(st.containers * EXPORT_SHARE) : 0;
    this.ships.push({
      id: this.nextId++,
      name: `${c ? c.prefix : this.pick(SHIP_PREFIX)}${n}`,
      line: c ? c.line : 'Freie Fahrt',
      color: c ? c.color : this.pick(SHIP_COLORS),
      type,
      len: st.len,
      state: 'queued',
      x: -st.len - 2,
      y: 2.5,
      px: -st.len - 2,
      py: 2.5,
      berthX: -1,
      rot: 0,
      wp: 0,
      containers: st.containers - reefers - haz,
      reefers,
      haz,
      total: st.containers,
      exportLeft: exp,
      exportTotal: exp,
      loaded: 0,
      queuedFor: 0,
      atBerth: 0,
      // Export verlängert die Liegezeit: Beladen dauert genauso lange wie Entladen
      dwellTarget: Math.round((c ? c.dwell : st.dwell * DIFFS[this.diff].dwell) * (1 + (exp / st.containers) * 0.5)),
      contractId: c ? c.id : 0,
      reason: '',
      blocked: false,
    });
  }

  private spawnShips(dt: number) {
    if (this.mission < 6 || !this.hasBerth() || this.cranes.length === 0) return;
    // Erste Vertragsangebote, sobald Schiffe kommen
    if (!this.offers.length && !this.contracts.length && !this.contractsDone && !this.firstOffers) {
      this.firstOffers = true;
      this.makeOffers();
    }
    const queued = this.ships.filter((s) => s.state === 'queued').length;

    // Vertragsschiffe kommen nach Fahrplan
    for (const c of this.contracts) {
      c.next -= dt;
      if (c.next > 0 || c.calls <= 0) continue;
      if (queued >= 5) {
        c.next = 20;
        continue;
      }
      c.next = c.interval;
      this.addShip(c.ship, c, c.reefer);
    }

    // Freie Schiffe ohne Vertrag
    this.nextShipIn -= dt;
    if (this.nextShipIn > 0) return;
    if (queued >= 3) {
      this.nextShipIn = 30;
      return;
    }
    // Ohne Vertrag kommen nur Küstenfrachter. Große Schiffe gibt es nur über Verträge.
    // Exklusivverträge schließen freie Schiffe aus.
    if (this.contracts.some((c) => c.cond === 'exclusive')) {
      this.nextShipIn = 60;
      return;
    }
    const reefer = this.level >= 3 && this.reeferCapacity >= 12 && this.rnd() < (this.season.index === 1 ? 0.5 : 0.3) * (this.spec === 'cold' ? 1.5 : 1) * (this.traits.includes('coldregion') ? 1.5 : 1);
    this.addShip('coaster', null, reefer);
    // Ist die Konkurrenz pünktlicher als du, kommen weniger freie Schiffe
    const mine = this.myRate;
    const rival = this.level >= 2 && mine !== null ? 1 + Math.max(0, this.rivalRate - mine) : 1;
    const base = (Math.min(300, Math.max(120, 300 - this.rep * 1.5)) + this.contracts.length * 90) * (this.level >= 2 ? MAPS[this.map].ships : 1.3) * rival * CYCLES[this.cycle.kind].ships * (this.world ? WORLD[this.world.id].ships : 1);
    this.nextShipIn = base * (0.8 + this.rnd() * 0.4);
  }

  private moveToward(s: Ship, tx: number, ty: number, step: number): boolean {
    const dx = tx - s.x;
    const dy = ty - s.y;
    const d = Math.hypot(dx, dy);
    if (d <= step) {
      if (d > 1e-6) s.rot = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : Math.PI) : dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
      s.x = tx;
      s.y = ty;
      return true;
    }
    s.x += (dx / d) * step;
    s.y += (dy / d) * step;
    s.rot = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : Math.PI) : dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
    return false;
  }

  private updateShips(dt: number) {
    const fog = this.weather === 'fog';
    if (!fog) {
      // Vorgezogene Schiffe zuerst, sonst in der Reihenfolge der Ankunft
      const order = [...this.ships].sort((a, b) => Number(!!b.vip) - Number(!!a.vip));
      for (const s of order) {
        if (s.state !== 'queued') continue;
        const b = this.findBerth(s.len, SHIP_TYPES[s.type].deep);
        if (b < 0) continue;
        s.berthX = b;
        s.wp = 0;
        s.state = 'sailing';
      }
    }
    let qx = 1;
    for (const s of [...this.ships]) {
      const step = SHIP_SPEED * dt;
      switch (s.state) {
        case 'queued': {
          this.moveToward(s, qx, 2.5, step);
          qx += s.len + 2;
          if (fog) {
            s.reason = 'Nebel: Die Einfahrt ist gesperrt.';
            s.blocked = false;
            break;
          }
          s.queuedFor += dt;
          s.blocked = s.queuedFor > 60;
          if (SHIP_TYPES[s.type].deep && !this.hasDeepBerth(s.len)) {
            s.reason = `Braucht einen tiefen Liegeplatz: ${s.len} Kai-Felder in einer Reihe, davor ausgebaggert.`;
          } else if (this.hasBerth()) {
            s.reason = 'Wartet auf einen freien Liegeplatz. Baue einen weiteren Liegeplatz.';
          } else {
            s.reason = 'Kein Liegeplatz: Baue 4 Kai-Felder in einer Reihe.';
          }
          if (s.queuedFor > SHIP_PATIENCE_GM * DIFFS[this.diff].patience) {
            this.rep = Math.max(0, this.rep - 3);
            this.emit(`${s.name} hat den Anlauf abgesagt (zu lange gewartet). Ruf −3`, 'bad', { tag: 'ship-cancel' });
            this.settleContract(s, false);
            s.state = 'leaving';
            s.berthX = -100; // belegt keinen Liegeplatz
          }
          break;
        }
        case 'sailing': {
          const path = approach(s.berthX);
          const [tx, ty] = path[Math.min(s.wp, path.length - 1)];
          if (this.moveToward(s, tx, ty, step) && ++s.wp >= path.length) {
            // Am Liegeplatz längs zur Kaimauer drehen
            if (isVertical(sideOf(s.berthX))) s.rot = Math.abs(Math.sin(s.rot)) > 0.5 ? s.rot : Math.PI / 2;
            else s.rot = Math.abs(Math.sin(s.rot)) > 0.5 ? 0 : s.rot;
            s.state = 'unloading';
            s.atBerth = 0;
            this.emit(undefined, 'info', { tag: 'ship-arrived', x: s.x, y: s.y });
          }
          s.reason = 'Läuft in den Hafen ein.';
          s.blocked = false;
          break;
        }
        case 'unloading': {
          // Bei Sturm läuft die Liegezeit nicht weiter
          if (this.weather !== 'storm') s.atBerth += dt;
          const r = this.berthStatus(s);
          s.reason = r.text;
          s.blocked = r.blocked;
          const imports = s.containers + s.reefers + s.haz;
          if (imports <= 0 && (s.exportLeft <= 0 || s.atBerth >= s.dwellTarget)) this.finishShip(s);
          else if (s.atBerth > SHIP_MAX_STAY_GM) this.finishShip(s);
          break;
        }
        case 'leaving':
          {
            const [tx, ty] = departure(s.berthX, s.x, s.y);
            if (this.moveToward(s, tx, ty, step)) this.ships = this.ships.filter((x) => x !== s);
          }
          s.reason = 'Läuft aus.';
          s.blocked = false;
          break;
      }
    }
  }

  private berthStatus(s: Ship): { text: string; blocked: boolean } {
    const bad = (text: string) => ({ text, blocked: true });
    if (this.powerDown) return { text: 'Stromausfall: Die Kräne stehen. Batterien hätten überbrückt.', blocked: true };
    if (this.weather === 'storm') return { text: 'Sturm: Die Kräne stehen still. Die Liegezeit läuft nicht weiter.', blocked: false };
    const cr = this.cranesAtBerth(s.berthX, s.len);
    if (cr.length === 0) return bad('Kein Kran am Liegeplatz. Setze einen Kran auf eines der Kai-Felder am Schiff.');
    if (cr.every((c) => c.build)) return { text: 'Der Kran wird noch gebaut.', blocked: false };
    if (cr.every((c) => !c.staffed)) return bad('Kein Kranführer im Dienst. Stelle im Personal jemanden ein.');
    const imports = s.containers + s.reefers + s.haz;
    if (imports > 0 && cr.every((c) => c.state === 'blocked')) {
      if (this.trucks.length === 0) return bad('Es gibt keinen Truck. Kaufe einen Truck.');
      const zoned = cr.find((c) => c.zone && c.buffer + c.bufReef + c.bufHaz > 0 && !this.tilesOf(c.bufReef ? T.Reefer : T.Yard).some((i) => this.zone[i] === c.zone));
      if (zoned) return bad(`Der Kran gehört zu Zone ${ZONES[zoned.zone].name}, aber es gibt dort kein passendes Lager. Male Lagerflächen in Zone ${ZONES[zoned.zone].name} an.`);
      if (cr.some((c) => c.bufHaz > 0 && !this.hasFreeStore(T.Hazmat, c.zone))) {
        return bad(this.hazTiles.length ? 'Gefahrgutfläche voll. Baue mehr Gefahrgutflächen oder mehr Ausgänge.' : 'Gefahrgut braucht eine eigene Fläche mit Abstand zu Gates, Hallen und Werkstatt. Baue eine Gefahrgutfläche an die Straße.');
      }
      if (cr.some((c) => c.bufReef > 0 && !this.hasFreeStore(T.Reefer, c.zone))) {
        return bad(
          this.reeferTiles.length
            ? 'Kühlplätze voll. Baue mehr Kühlplätze oder mehr Ausgänge.'
            : 'Kühlcontainer brauchen Kühlplätze mit Strom. Baue Kühlplätze an die Straße.',
        );
      }
      const cap = this.yardCapacity;
      if (cap === 0) return bad('Es gibt keinen Stapelplatz. Baue einen Stapelplatz an die Straße.');
      if (cr.some((c) => c.buffer > 0 && !this.hasFreeStore(T.Yard, c.zone))) {
        return bad('Stapelplatz voll. Baue mehr Stapelplatz oder mehr Gates, damit Container abfließen.');
      }
      if (this.trucks.some((t) => !t.staffed && !t.build)) return bad('Es fehlen Fahrer: Trucks stehen still. Stelle im Personal jemanden ein.');
      if (this.trucks.every((t) => t.job !== null || t.wait > 0)) return bad('Alle Trucks sind unterwegs. Kaufe mehr Trucks oder kürze die Wege.');
      return bad('Wartet auf einen Truck am Kran. Prüfe, ob eine Straße Kran und Stapelplatz verbindet.');
    }
    if (imports <= 0 && s.exportLeft > 0) {
      const ready = cr.some((c) => c.expBuf > 0);
      return { text: ready ? LOADING : 'Wartet auf Export-Container. Sie kommen über das Gate und brauchen freie Trucks.', blocked: false };
    }
    return { text: UNLOADING, blocked: false };
  }

  /** Verbucht einen Anlauf im Vertrag: Bonus bei Pünktlichkeit, sonst Vertragsstrafe. */
  private settleContract(s: Ship, onTime: boolean) {
    const c = this.contracts.find((c) => c.id === s.contractId);
    if (!c) return;
    if (onTime) {
      this.money += c.bonus;
      this.today.bonus += c.bonus;
      c.missed = 0;
    } else {
      this.money -= c.penalty;
      this.today.penalty += c.penalty;
      c.missed = (c.missed ?? 0) + 1;
      if (c.missed >= 2) {
        // Zweimal in Folge unpünktlich: Die Reederei kündigt
        this.contracts = this.contracts.filter((x) => x !== c);
        this.rep = Math.max(0, this.rep - 5);
        this.emit(`${c.line} kündigt den Vertrag: zweimal in Folge unpünktlich. Strafe −${eur(c.penalty)}, Ruf −5`, 'bad', { tag: 'ship-late' });
        return;
      }
      this.emit(`Vertragsstrafe von ${c.line}: −${eur(c.penalty)}. Beim nächsten Verstoß kündigt die Reederei.`, 'bad');
    }
    c.calls--;
    if (c.calls <= 0) {
      this.contracts = this.contracts.filter((x) => x !== c);
      this.contractsDone++;
      this.rep = Math.min(REP_MAX, this.rep + 2);
      this.emit(`Vertrag mit ${c.line} erfüllt. Ruf +2`, 'good', { tag: 'contract' });
    }
  }

  private finishShip(s: Ship) {
    const st = SHIP_TYPES[s.type];
    const bf = Math.round(st.berthFee * (this.spec === 'hub' ? 1.2 : this.spec === 'cold' ? 0.9 : 1) * CYCLES[this.cycle.kind].fee);
    const imports = s.containers + s.reefers + s.haz;
    const cc = this.contracts.find((x) => x.id === s.contractId);
    const onTime = imports <= 0 && s.atBerth <= s.dwellTarget + 1 && !(cc?.cond === 'export' && s.exportLeft > 0);
    this.shipsDone++;
    this.today.ships++;
    if (st.deep && imports <= 0) this.bigShipsDone++;
    if (s.type === 'mega' && imports <= 0) this.megaDone++;
    const c = this.contracts.find((c) => c.id === s.contractId);
    const bonus = onTime && c ? c.bonus : 0;
    if (imports <= 0) {
      this.money += bf;
      this.today.berth += bf;
    }
    if (onTime) {
      this.shipsOnTime++;
      this.today.onTime++;
      this.rep = Math.min(REP_MAX, this.rep + 1);
      const extra = bonus ? ` und ${eur(bonus)} Vertragsbonus` : '';
      this.emit(`${s.name} abgefertigt: +${eur(bf)} Liegegebühr${extra}, Ruf +1`, 'good', {
        tag: 'ship-done',
        x: this.shipBox(s).x + this.shipBox(s).w / 2,
        y: this.shipBox(s).y,
        amount: bf + bonus,
      });
    } else if (imports > 0) {
      this.rep = Math.max(0, this.rep - 3);
      this.emit(`${s.name} ist mit ${imports} Containern an Bord wieder ausgelaufen. Ruf −3`, 'bad', { tag: 'ship-late', x: this.shipBox(s).x, y: this.shipBox(s).y });
    } else {
      this.rep = Math.max(0, this.rep - 1);
      this.emit(`${s.name} hat zu lange gelegen (${Math.round(s.atBerth / 60)} h statt ${Math.round(s.dwellTarget / 60)} h). Ruf −1`, 'bad', {
        tag: 'ship-late',
        x: this.shipBox(s).x,
        y: this.shipBox(s).y,
      });
    }
    this.settleContract(s, onTime);
    s.state = 'leaving';
  }

  // ───────────────────────── Anlagen ─────────────────────────

  private updateCranes(dt: number) {
    const storm = this.weather === 'storm';
    for (const c of this.cranes) {
      const mt = this.moveTime(c);
      const ship = this.shipAtBerth(this.cq(c));
      if (storm) {
        c.state = 'storm';
        continue;
      }
      if (c.build) {
        c.state = 'building';
        continue;
      }
      if (this.powerDown) {
        c.state = 'power';
        continue;
      }
      if (c.wear >= 1) {
        c.state = 'broken';
        continue;
      }
      if (!ship || !c.staffed) {
        c.state = 'idle';
        c.cd = mt;
        continue;
      }
      const imports = ship.containers + ship.reefers + ship.haz;
      const canUnload = imports > 0 && c.buffer + c.bufReef + c.bufHaz < this.bufCap(c);
      const canLoad = ship.exportLeft > 0 && c.expBuf > 0;
      if (canUnload || canLoad) {
        c.state = 'working';
        c.cd = Math.min(c.cd, mt) - dt;
        if (c.cd <= 0) {
          c.cd += mt;
          c.moves = (c.moves ?? 0) + 1;
          if (this.level >= 2) this.addWear(c, WEAR_CRANE_PER_MOVE * this.wearMul);
          if (c.wear >= 1) this.noteBroken('Ein Kran', c);
          // Abwechselnd ent- und beladen, wenn beides geht
          const load = canLoad && (!canUnload || !c.lastLoad);
          c.lastLoad = load;
          if (load) {
            c.expBuf--;
            ship.exportLeft--;
            ship.loaded++;
            this.exportsLoaded++;
            this.handled++, this.today.handled++;
            const ef = Math.round(EXPORT_FEE * (1 + 0.05 * this.tech.sales));
            this.money += ef;
            this.today.exportFees += ef;
            this.emit(undefined, 'good', { tag: 'export', x: c.x, y: c.y - 1, amount: ef });
          } else if (ship.reefers > 0 && this.rnd() < ship.reefers / imports) {
            ship.reefers--;
            c.bufReef++;
          } else if (ship.haz > 0 && this.rnd() < ship.haz / imports) {
            ship.haz--;
            c.bufHaz++;
          } else if (ship.containers > 0) {
            ship.containers--;
            c.buffer++;
            // Ziel festlegen: Ein Teil der Container soll mit der Bahn weiter
            if (this.railShare > 0 && this.rnd() < this.railShare) c.bufRail++;
          } else if (ship.reefers > 0) {
            ship.reefers--;
            c.bufReef++;
          } else {
            ship.haz--;
            c.bufHaz++;
          }
        }
      } else if (imports > 0) {
        c.state = 'blocked';
        c.cd = Math.max(c.cd, 0);
      } else {
        c.state = 'idle';
        c.cd = mt;
      }
    }
  }

  private updateTrucks(dt: number) {
    // Spuren neu belegen: Wer arbeitet oder fährt, steht in seiner Spur. Wer frei hat, parkt am Rand.
    this.lane.fill(0);
    for (const t of this.trucks) {
      if (!t.job && t.wait <= 0 && t.next < 0) continue;
      if (t.dir >= 0) this.lane[t.tile * 4 + t.dir]++;
      if (t.next >= 0) {
        const d = t.next - t.tile;
        this.lane[t.next * 4 + (d === 1 ? 0 : d === GRID_W ? 1 : d === -1 ? 2 : 3)]++;
      }
    }
    if (this.tickCount % 5 === 0) for (let i = 0; i < this.roadJam.length; i++) this.roadJam[i] *= 0.93;
    for (const t of this.trucks) {
      // Ausgefallen: bleibt stehen, wo er ist, bis die Werkstatt kommt. In der Überholung ebenso.
      if (t.wear >= 1 || t.build) continue;
      if (t.wait > 0) {
        t.wait -= dt;
        continue;
      }
      if (!t.job) {
        t.stuck = 0;
        // Ohne Fahrer bleibt der Truck stehen
        if (!t.staffed) continue;
        if (t.next < 0) this.assignJob(t);
        if (!t.job) {
          this.idleTruck(t, dt);
          continue;
        }
        t.parkAt = -1;
        t.parked = false;
        t.idleFor = 0;
        // Die Leitstelle braucht Funkzeit. Trucks mit fester Aufgabe fahren sofort los.
        if (t.role === 'auto') {
          t.wait = DISPATCH_GM * (1 - 0.3 * this.tech.radio);
          continue;
        }
      }
      this.stepTruck(t, dt);
    }
  }

  /** Wie viele Export-Container noch von draußen angeliefert werden sollen. */
  private computeExportNeed(): number {
    if (this.level < 2) return 0;
    let demand = EXPORT_PRESTOCK;
    for (const s of this.ships) if (s.state !== 'leaving') demand += s.exportLeft;
    let have = 0;
    let free = 0;
    for (const i of this.yardTiles) {
      have += this.stockExp[i];
      free += Math.max(0, this.freeAt(i));
    }
    for (const g of this.gates) have += g.inApron + (g.proc > 0 && g.procIn ? 1 : 0);
    for (const t of this.trucks) if (t.load > 0 && t.cargo === 'exp') have += t.load;
    for (const c of this.cranes) have += c.expBuf;
    // Der Stapelplatz soll nicht mit Export volllaufen
    return Math.min(demand - have, free - 6);
  }

  private updateGates(dt: number) {
    this.exportNeed = this.computeExportNeed();
    for (const g of this.gates) {
      if (g.proc > 0) {
        g.proc -= dt;
        if (g.proc <= 0) {
          g.proc = 0;
          if (g.procIn && g.procEmpty) {
            g.emptyIn++;
            this.money -= EMPTY_IN_COST;
            this.today.penalty += EMPTY_IN_COST;
          } else if (g.procIn) {
            g.inApron++;
          } else {
            const type = Math.floor(g.procFee / 100000);
            const fee = g.procFee - type * 100000;
            if (type === 3) {
              // Leere Container zurück an die Reederei: zählt nicht als Umschlag
              this.money += fee;
              this.today.fees += fee;
              this.emit(undefined, 'good', { tag: 'container', x: g.x, y: g.y, amount: fee });
            } else {
              g.served++;
              this.containersDone++;
              this.handled++, this.today.handled++;
              if (type === 1) this.reefersHandled++;
              this.money += fee;
              this.today.fees += fee;
              this.emit(undefined, 'good', { tag: 'container', x: g.x, y: g.y, amount: fee });
            }
          }
        }
      }
      if (g.proc > 0 || !g.staffed) continue;
      const wantOut = g.apron.length > 0;
      const wantIn = this.exportNeed > 0 && g.inApron < GATE_IN_CAP;
      g.procEmpty = false;
      if (!wantOut && !wantIn) {
        // Nichts los: Leercontainer von außen annehmen, wenn die Befüllhalle welche braucht
        if (this.emptiesWanted() > 0 && g.emptyIn < GATE_IN_CAP) {
          g.procIn = true;
          g.procEmpty = true;
          g.proc = (GATE_PROCESS_GM / (1 + 0.2 * this.tech.scanner) / this.eff('gate')) / this.hinterlandMul(g);
        }
        continue;
      }
      // Abwechselnd rein und raus, wenn beides ansteht
      const takeIn = wantIn && (!wantOut || !g.lastIn);
      g.lastIn = takeIn;
      g.procIn = takeIn;
      g.proc = GATE_PROCESS_GM / (1 + 0.2 * this.tech.scanner) / (this.spec === 'logi' ? 1.15 : 1) / this.eff('gate') / this.hinterlandMul(g);
      if (takeIn) this.exportNeed--;
      else g.procFee = g.apron.shift()!;
    }
  }

  private updateRails(dt: number) {
    for (const r of this.rails) {
      if (r.build || !this.railLinked(r)) continue;
      r.timer -= dt;
      if (r.timer > 0) continue;
      switch (r.state) {
        case 'away':
          r.state = 'arriving';
          r.timer = RAIL_TRAVEL_GM;
          this.emit(undefined, 'info', { tag: 'train-arrive' });
          break;
        case 'arriving':
          r.state = 'loading';
          r.timer = RAIL_STAY_GM;
          // Der Zug bringt Leercontainer, wenn das Leerlager welche braucht
          {
            const want = Math.min(RAIL_EMPTIES, this.emptiesWanted(), 2 * RAIL_EMPTIES - r.emptyIn);
            if (want > 0) {
              r.emptyIn += want;
              this.money -= want * EMPTY_IN_COST;
              this.today.penalty += want * EMPTY_IN_COST;
            }
          }
          // Der Zug bringt Ware, wenn es eine Befüllhalle gibt, die sie braucht
          if (this.plants.some((p) => p.kind === 'fill' && p.zone === r.zone)) {
            const add = Math.min(RAIL_GOODS, RAIL_GOODS_MAX - r.goods);
            if (add > 0) {
              r.goods += add;
              this.emit(`Der Zug bringt ${add} Ladungen Ware für die Befüllhalle.`, 'info', { tag: 'train-arrive' });
            }
          }
          break;
        case 'loading': {
          const n = r.platform;
          if (n > 0) {
            this.money += r.value;
            this.today.rail += r.value;
            this.handled += n;
            this.today.handled += n;
            this.containersDone += n;
            this.trainsDone++;
            this.emit(`Zug abgefahren: ${n} Container, +${eur(r.value)}`, 'good', { tag: 'train', x: r.x, y: r.y, amount: r.value });
          }
          r.lastLoad = n;
          r.platform = 0;
          r.value = 0;
          r.state = 'leaving';
          r.timer = RAIL_TRAVEL_GM;
          break;
        }
        case 'leaving':
          r.state = 'away';
          r.timer = RAIL_INTERVAL_GM * (this.traits.includes('railhub') ? 0.67 : 1) - 2 * RAIL_TRAVEL_GM - RAIL_STAY_GM;
          break;
      }
    }
  }

  private updatePlants(dt: number) {
    for (const p of this.plants) {
      if (p.build || this.powerDown) continue;
      const cfg = PLANTS[p.kind];
      if (p.proc > 0) {
        p.proc -= dt;
        if (p.proc > 0) continue;
        p.proc = 0;
        p.outBuf++;
        p.made++;
        // Beim Auspacken bleibt ein leerer Container übrig, wenn es ein Leerlager gibt
        if (p.kind === 'unpack' && this.emptyTiles.length > 0 && p.emptyOut + p.resOutE < PLANT_BUF) p.emptyOut++;
        // Die Befüllhalle verkauft die Ware, die in den Export-Container ging
        if (p.kind === 'fill') {
          this.money += FILL_FEE;
          this.today.fees += FILL_FEE;
        }
      }
      const ready = p.kind === 'fill' ? p.inBuf >= 1 && p.inEmpty >= 1 : p.inBuf >= cfg.needs;
      if (ready && p.outBuf < PLANT_BUF) {
        if (p.kind === 'fill') {
          p.inBuf--;
          p.inEmpty--;
        } else p.inBuf -= cfg.needs;
        p.proc = cfg.time * (this.spec === 'hub' ? 1.3 : this.spec === 'logi' ? 0.75 : 1);
      }
    }
  }

  /** Kühlcontainer, die zu lange stehen, verderben. */
  private updateReefers() {
    if (this.tickCount % 10 !== 0) return;
    let spoiled = 0;
    for (const i of this.reeferTiles) {
      const q = this.reefTimes.get(i);
      if (!q) continue;
      // Reservierte Container sind schon so gut wie abgeholt
      while (q.length > this.resOut[i] && this.gm - q[0] > this.reeferMax && this.stock[i] > 0) {
        q.shift();
        this.stock[i]--;
        spoiled++;
      }
    }
    if (!spoiled) return;
    const cost = spoiled * REEFER_SPOIL_PENALTY;
    this.money -= cost;
    this.today.penalty += cost;
    if (this.gm - this.spoilNote > 60) {
      this.spoilNote = this.gm;
      this.emit(`Kühlcontainer verdorben: −${eur(cost)}. Kühlfracht muss in 10 Stunden raus.`, 'bad', { tag: 'spoil' });
    }
  }

  private updateStats() {
    const a = 0.03;
    const ema = (cur: number, x: number) => cur + (x - cur) * a;
    // Kran: Anteil arbeitender Kräne unter denen, die ein Schiff zu entladen haben
    const busy = this.cranes.filter((c) => c.state === 'working' || c.state === 'blocked');
    const working = busy.filter((c) => c.state === 'working').length;
    this.stats.crane = ema(this.stats.crane, busy.length ? working / busy.length : 0);
    // Trucks im Stau zählen nicht als ausgelastet: Sie warten auf etwas anderes (Gate, Kreuzung)
    const busyT = this.trucks.filter((t) => (t.job !== null || t.wait > 0) && t.stuck <= 0).length;
    this.stats.trucks = ema(this.stats.trucks, this.trucks.length ? busyT / this.trucks.length : 0);
    const jammed = this.trucks.filter((t) => t.stuck > 0).length;
    this.jamShare = ema(this.jamShare, this.trucks.length ? jammed / this.trucks.length : 0);
    const cap = this.yardCapacity;
    this.stats.yard = cap ? this.yardStock / cap : 0;
    const bnNow = this.tickCount % 10 === 0 ? this.bottleneck() : null;
    if (bnNow) this.today.bn[bnNow]++;
    this.today.jamPeak = Math.max(this.today.jamPeak, this.jamShare);
    const busyG = this.gates.filter((g) => g.proc > 0).length;
    this.stats.gate = ema(this.stats.gate, this.gates.length ? busyG / this.gates.length : 0);
  }

  /** Auslastungsstufe mit dem größten Druck, oder null wenn nichts auffällt. */
  bottleneck(): 'crane' | 'trucks' | 'yard' | 'gate' | null {
    if (this.weather === 'storm') return null;
    if (this.ships.every((s) => s.state === 'queued' || s.state === 'leaving') && this.stats.crane < 0.05) return null;
    const order: ('gate' | 'trucks' | 'yard' | 'crane')[] = ['gate', 'trucks', 'yard', 'crane'];
    let best: 'crane' | 'trucks' | 'yard' | 'gate' | null = null;
    let bestV = 0.85;
    for (const k of order) {
      if (this.stats[k] >= bestV) {
        best = k;
        bestV = this.stats[k];
      }
    }
    return best;
  }

  // ───────────────────────── Stufen, Verträge, Tage ─────────────────────────

  private updateLevel() {
    const next = LEVELS[this.level];
    if (!next || this.handled < next.need) return;
    this.level++;
    this.money += next.bonus;
    this.today.bonus += next.bonus;
    this.version++;
    this.makeOffers();
    this.emit(`Neue Stufe: ${next.name}. Bonus +${eur(next.bonus)}`, 'good', { tag: 'level', amount: next.bonus });
    if (this.level === GOAL_LEVEL && this.status === 'play' && !this.scenario) {
      this.status = 'won';
      this.endReason = `Weltklasse-Hafen an Tag ${this.day}, Ziel war Tag ${this.goalDay}.`;
      this.emit(undefined, 'good', { tag: 'won' });
    }
  }

  // ───────────────────────── Markt ─────────────────────────

  setProduct(plantId: number, p: ProductId) {
    const pl = this.plants.find((q) => q.id === plantId);
    if (pl && pl.kind === 'pack' && p !== 'food') pl.product = p;
  }

  /** Preise schwanken jeden Tag und kehren langsam zum Grundpreis zurück. Manchmal gibt es einen Boom oder Einbruch. */
  private updateMarket() {
    this.marketPrev = { ...this.market };
    for (const p of Object.keys(this.market) as ProductId[]) {
      let m = this.market[p];
      m += (this.rnd() - 0.5) * 0.24 + (1 - m) * 0.2;
      if (this.rnd() < 0.08) {
        const up = this.rnd() < 0.5;
        m *= up ? 1.4 : 0.65;
        this.emit(`${up ? 'Nachfrage-Boom' : 'Preiseinbruch'} bei ${PRODUCTS[p].name}: jetzt ${eur(Math.round((PRODUCTS[p].base * clamp(m, 0.5, 1.7)) / 10) * 10)}`, up ? 'good' : 'bad');
      }
      this.market[p] = clamp(m, 0.5, 1.7);
    }
  }

  // ───────────────────────── Szenarien ─────────────────────────

  private checkScenario() {
    if (!this.scenario || this.status !== 'play' || this.tickCount % 50 !== 0) return;
    const sc = SCENARIOS.find((s) => s.id === this.scenario);
    if (!sc || !sc.done(this)) return;
    this.status = 'won';
    this.endReason = `Szenario „${sc.name}“ an Tag ${this.day} geschafft.`;
    this.emit(undefined, 'good', { tag: 'won' });
  }

  // ───────────────────────── Konkurrenz und Entscheidungen ─────────────────────────

  /** Pünktlichkeit gestern (0..1), oder null ohne Schiffe */
  get myRate(): number | null {
    const y = this.history.at(-1);
    return y && y.ships ? y.onTime / y.ships : null;
  }

  /** Hafen Nordstadt wird langsam besser und wirbt Reedereien ab, wenn du schlechter bist. */
  private updateRival() {
    if (this.level < 2) return;
    this.rivalRate = Math.min(0.95, this.rivalRate + 0.004);
    const mine = this.myRate;
    if (mine === null || mine >= this.rivalRate - 0.1 || !this.contracts.length) return;
    if (this.rnd() > 0.5) return;
    const c = this.pick(this.contracts);
    this.contracts = this.contracts.filter((x) => x !== c);
    this.lostToRival++;
    this.rep = Math.max(0, this.rep - 2);
    this.emit(`${c.line} wechselt zu ${RIVAL_NAME}: Dort werden ${Math.round(this.rivalRate * 100)} % der Schiffe pünktlich abgefertigt, bei dir ${Math.round(mine * 100)} %.`, 'bad', { tag: 'contract' });
  }

  private rollDecision() {
    if (this.level < 2 || this.pending || this.status === 'lost' || (this.level >= 3 && !this.spec) || this.rnd() > EVENT_CHANCE) return;
    const pen = DIFFS[this.diff].penalty;
    const list: Decision[] = [
      {
        id: 'strike',
        title: 'Die Fahrer drohen mit Streik',
        text: 'Sie fordern 10 % mehr Lohn. Lehnst du ab, legen sie 8 Stunden lang die Arbeit nieder. Fahrerlose Fahrzeuge fahren weiter.',
        options: ['10 % mehr Lohn zahlen', 'Ablehnen'],
      },
      {
        id: 'customs',
        title: 'Verdacht beim Zoll',
        text: `Ein Container könnte Schmuggelware enthalten. Eine Prüfung kostet 8.000 €. Winkst du ihn durch und es war Schmuggel, zahlst du ${eur(40_000 * pen)} Strafe und verlierst Ruf.`,
        options: ['Prüfen lassen (8.000 €)', 'Durchwinken'],
      },
      {
        id: 'vip',
        title: 'Anfrage für eine Sonderfahrt',
        text: `Eine Reederei will ein Schiff mit 120 Containern in höchstens 6 Stunden abgefertigt haben. Pünktlich gibt es 25.000 €, sonst ${eur(15_000 * pen)} Strafe.`,
        options: ['Annehmen', 'Ablehnen'],
      },
      {
        id: 'press',
        title: 'Ein Fernsehteam will berichten',
        text: 'Eine Führung durch den Hafen kostet 5.000 € für Absperrung und Personal und bringt dir Ruf.',
        options: ['Führung geben (5.000 €)', 'Ablehnen'],
      },
    ];
    if (this.cranes.some((c) => c.model === 'mobile' && this.bridgeRoom(c))) {
      list.push({
        id: 'parts',
        title: 'Gebrauchte Teile für eine Containerbrücke',
        text: 'Ein Händler bietet Teile an, mit denen ein Mobilkran zur Containerbrücke wird. Halber Preis: 60.000 €.',
        options: ['Kaufen (60.000 €)', 'Ablehnen'],
      });
    }
    this.pending = this.pick(list);
    this.emit(undefined, 'info', { tag: 'decision' });
  }

  /** Setzt die Wahl des Spielers um (0 = erste Möglichkeit). */
  resolveDecision(choice: number) {
    const d = this.pending;
    if (!d) return;
    this.pending = null;
    const pay = (n: number) => {
      this.money -= n;
      this.today.penalty += n;
    };
    switch (d.id) {
      case 'spec': {
        const k = (Object.keys(SPECS) as SpecId[])[choice] ?? 'hub';
        this.spec = k;
        this.version++;
        this.emit(`Neue Richtung: ${SPECS[k].name}. ${SPECS[k].pros}.`, 'good', { tag: 'level' });
        break;
      }
      case 'strike':
        if (choice === 0) {
          this.wageBoost.driver *= 1.1;
          this.emit('Die Fahrer bekommen 10 % mehr Lohn.', 'info');
        } else {
          this.strikeLeft = 480;
          this.emit('Streik! Die Fahrer arbeiten 8 Stunden lang nicht.', 'bad');
        }
        break;
      case 'customs':
        if (choice === 0) {
          pay(8_000);
          this.rep = Math.min(REP_MAX, this.rep + 2);
          this.emit('Der Container war sauber. Der Zoll lobt die Zusammenarbeit. Ruf +2', 'good');
        } else if (this.rnd() < 0.35) {
          const fine = Math.round(40_000 * DIFFS[this.diff].penalty);
          pay(fine);
          this.rep = Math.max(0, this.rep - 6);
          this.emit(`Es war Schmuggel. Strafe −${eur(fine)}, Ruf −6`, 'bad');
        } else {
          this.emit('Glück gehabt: Der Container war sauber.', 'info');
        }
        break;
      case 'vip': {
        if (choice !== 0) break;
        const pen = DIFFS[this.diff].penalty;
        const c: Contract = {
          id: this.nextId++,
          line: 'Sonderfahrt',
          prefix: 'SF',
          color: 0xf4c430,
          ship: 'feeder',
          reefer: false,
          interval: 99_999,
          calls: 1,
          callsTotal: 1,
          dwell: 360,
          bonus: 25_000,
          penalty: Math.round(15_000 * pen),
          next: 20,
        };
        this.contracts.push(c);
        this.emit('Die Sonderfahrt kommt in etwa 20 Minuten.', 'info');
        break;
      }
      case 'press':
        if (choice === 0) {
          pay(5_000);
          this.rep = Math.min(REP_MAX, this.rep + 5);
          this.emit('Der Bericht läuft heute Abend. Ruf +5', 'good');
        }
        break;
      case 'parts': {
        if (choice !== 0) break;
        const c = this.cranes.find((c) => c.model === 'mobile' && this.bridgeRoom(c));
        if (!c || this.money < 60_000) {
          this.emit('Das Geschäft kam nicht zustande.', 'info');
          break;
        }
        this.money -= 60_000;
        this.today.building += 60_000;
        this.setModel(c, 'bridge');
        this.version++;
        this.emit('Ein Mobilkran ist jetzt eine Containerbrücke.', 'good');
        break;
      }
    }
  }

  // ───────────────────────── Ziel, Pleite, Kredit ─────────────────────────

  /** Bis zu diesem Tag (einschließlich) muss der Weltklasse-Hafen stehen. */
  get goalDay(): number {
    const sc = this.scenario ? SCENARIOS.find((s) => s.id === this.scenario) : null;
    return sc ? sc.days : DIFFS[this.diff].goalDays;
  }
  get debtLimit(): number {
    return DIFFS[this.diff].debtDays;
  }
  get loanLimit(): number {
    return LOAN_LIMIT_PER_LEVEL * this.level;
  }
  get interestPerDay(): number {
    return Math.round(this.loan * LOAN_RATE * DIFFS[this.diff].rate * this.rateMul);
  }
  takeLoan(): BuildCheck {
    if (this.loan + LOAN_STEP > this.loanLimit) {
      return { ok: false, reason: `Mehr Kredit gibt es erst auf der nächsten Stufe (Grenze ${eur(this.loanLimit)})`, cost: 0 };
    }
    this.loan += LOAN_STEP;
    this.money += LOAN_STEP;
    return { ok: true, cost: 0 };
  }
  repayLoan(): BuildCheck {
    const amt = Math.min(LOAN_STEP, this.loan);
    if (amt <= 0) return { ok: false, reason: 'Kein Kredit offen', cost: 0 };
    if (this.money < amt) return { ok: false, reason: 'Zu wenig Geld zum Tilgen', cost: amt };
    this.loan -= amt;
    this.money -= amt;
    return { ok: true, cost: amt };
  }
  /** Nach Sieg oder Niederlage ohne Wertung weiterspielen. */
  continueFree() {
    this.status = 'free';
  }

  private lose(reason: string) {
    this.status = 'lost';
    this.endReason = reason;
    this.emit(undefined, 'bad', { tag: 'lost' });
  }

  private checkEnd() {
    if (this.status !== 'play') return;
    if (this.money < 0) {
      this.debtDays++;
      const left = this.debtLimit - this.debtDays;
      if (left <= 0) return this.lose(`Pleite: Das Konto war ${this.debtLimit} Tage in Folge im Minus.`);
      this.emit(
        `Konto im Minus! Noch ${left} ${left === 1 ? 'Tagesabschluss' : 'Tagesabschlüsse'} bis zur Pleite. Nimm einen Kredit auf oder spare.`,
        'bad',
        { tag: 'debt' },
      );
    } else {
      this.debtDays = 0;
    }
    if (this.day > this.goalDay) {
      const sc = this.scenario ? SCENARIOS.find((s) => s.id === this.scenario) : null;
      this.lose(sc ? `Ziel verpasst: ${sc.goal} bis Tag ${this.goalDay}.` : `Ziel verpasst: Der Weltklasse-Hafen sollte bis Tag ${this.goalDay} stehen.`);
    }
  }

  private makeOffer(): Contract {
    const l = this.pick(LINES);
    const roll = this.rnd();
    const big = this.level >= 3 && roll < 0.3;
    const reefer = this.level >= 3 && !big && roll > 0.65;
    const ship: ShipTypeId = big && this.level >= 4 && this.rnd() < 0.4 ? 'mega' : big ? 'panamax' : 'feeder';
    const interval = big ? this.pick([480, 600, 720]) : this.pick([240, 300, 360, 480]);
    const dwell = Math.round((big ? this.pick([600, 720]) : this.pick([360, 420, 480])) * DIFFS[this.diff].dwell);
    // Daueraufträge: viele Anläufe nach festem Fahrplan
    const calls = 6 + Math.floor(this.rnd() * 9);
    const tight = (SHIP_TYPES[ship].dwell - dwell) / 60;
    const raw = (big ? 12_000 : 2_500) + tight * 1_500 + this.rnd() * (big ? 8_000 : 2_000) + (reefer ? 2_000 : 0);
    let bonus = Math.round(raw / 500) * 500;
    // Sonderbedingungen mit höherem Bonus: Export mitladen, knappe Frist oder exklusiv
    const cr = this.rnd();
    const cond: Contract['cond'] = this.level < 2 ? undefined : cr < 0.22 ? 'export' : cr < 0.4 ? 'rush' : cr < 0.52 ? 'exclusive' : undefined;
    let dwellF = dwell;
    if (cond === 'export') bonus = Math.round((bonus * 1.4) / 500) * 500;
    if (cond === 'rush') {
      bonus = Math.round((bonus * 1.5) / 500) * 500;
      dwellF = Math.round(dwell * 0.8);
    }
    if (cond === 'exclusive') bonus = Math.round((bonus * 1.6) / 500) * 500;
    return {
      id: this.nextId++,
      line: l.line,
      prefix: l.prefix,
      color: l.color,
      ship,
      reefer,
      interval,
      calls,
      callsTotal: calls,
      dwell: dwellF,
      cond,
      bonus,
      penalty: Math.round((bonus * 0.8 * DIFFS[this.diff].penalty) / 500) * 500,
      next: 30 + this.rnd() * 30,
    };
  }

  private makeOffers() {
    this.offers = [];
    if (this.maxContracts === 0) return;
    const taken = new Set(this.contracts.map((c) => c.line));
    for (let tries = 0; tries < 12 && this.offers.length < 3; tries++) {
      const o = this.makeOffer();
      if (taken.has(o.line)) continue;
      taken.add(o.line);
      this.offers.push(o);
    }
  }

  acceptContract(id: number): BuildCheck {
    const o = this.offers.find((o) => o.id === id);
    if (!o) return { ok: false, reason: 'Das Angebot gibt es nicht mehr', cost: 0 };
    if (this.contracts.length >= this.maxContracts) {
      return { ok: false, reason: `Auf Stufe ${this.level} sind höchstens ${this.maxContracts} Verträge möglich`, cost: 0 };
    }
    this.offers = this.offers.filter((x) => x !== o);
    this.contracts.push(o);
    this.emit(`Vertrag mit ${o.line} geschlossen: ${o.calls} Anläufe.`, 'good', { tag: 'contract' });
    return { ok: true, cost: 0 };
  }

  /** Kündigt einen Vertrag gegen die doppelte Vertragsstrafe. */
  cancelContract(id: number): BuildCheck {
    const c = this.contracts.find((c) => c.id === id);
    if (!c) return { ok: false, reason: 'Den Vertrag gibt es nicht mehr', cost: 0 };
    const cost = c.penalty * 2;
    this.money -= cost;
    this.today.penalty += cost;
    this.contracts = this.contracts.filter((x) => x !== c);
    this.rep = Math.max(0, this.rep - 2);
    this.emit(`Vertrag mit ${c.line} gekündigt: −${eur(cost)}, Ruf −2`, 'bad');
    return { ok: true, cost };
  }

  updateMissions(silent = false) {
    while (this.mission < MISSIONS.length && MISSIONS[this.mission].done(this)) {
      if (!silent) this.emit(`Mission geschafft: ${MISSIONS[this.mission].title}`, 'good', { tag: 'mission' });
      this.mission++;
    }
  }

  /** Laufende Kosten pro Spieltag für den jetzigen Ausbau. */
  runningCost(): number {
    const R = RUN_COST_PER_DAY;
    let cost = 0;
    for (const c of this.cranes) cost += CRANE_MODELS[c.model].run;
    for (let i = 0; i < this.roadTier.length; i++) cost += ROAD_RUN[this.roadTier[i]] * (this.kind[i] === T.Road ? 1 : 0);
    for (const t of this.trucks) cost += (t.agv ? R.agv : R.truck) * (this.tech.diesel ? 0.6 : 1);
    cost += this.gates.length * R.gate + this.rails.length * R.rail + this.plants.length * R.plant + this.shops.length * R.shop;
    cost += this.yardTiles.length * R.yardTile + this.reeferTiles.length * R.reeferTile + this.hazTiles.length * R.hazTile + this.emptyTiles.length * R.emptyTile;
    for (let i = 0; i < this.kind.length; i++) if (this.kind[i] === T.Kai) cost += R.kaiTile;
    return cost;
  }

  private rollDay() {
    const d = Math.floor(this.gm / MIN_PER_DAY);
    if (d === this.lastDay) return;
    this.lastDay = d;
    const cost = this.runningCost();
    this.money -= cost;
    this.today.running += cost;
    const interest = this.interestPerDay;
    this.money -= interest;
    this.today.interest += interest;
    this.history.push(this.today);
    if (this.history.length > 14) this.history.shift();
    this.today = emptyBook();
    this.makeOffers();
    this.planWeather();
    this.rollSickness();
    this.updateRival();
    this.rollDecision();
    this.updateMarket();
    this.rollWorld();
    this.emit(`Tagesabschluss: Betriebskosten −${eur(cost)}${interest ? `, Zinsen −${eur(interest)}` : ''}`, 'info', { tag: 'day' });
    this.checkEnd();
  }

  /** Täglich: Erfahrung, Stimmung, Konjunktur, Gebrauchtmarkt, Lagergebühren, Kontrollen, Spezialisierung */
  private rollWorld() {
    for (const r of Object.keys(ROLES) as Role[]) if (this.trainLeft[r] > 0) this.trainLeft[r]--;
    // Erfahrung wächst
    for (const r of Object.keys(ROLES) as Role[]) this.xp[r] += (1 - this.xp[r]) * 0.03;
    // Stimmung strebt ihrem Ziel zu
    const heads = (Object.keys(ROLES) as Role[]).reduce((n, r) => n + this.staff[r], 0);
    const sick = (Object.keys(ROLES) as Role[]).reduce((n, r) => n + this.sick[r].length, 0);
    let target = 0.6 + (this.traits.includes('union') ? 0.1 : 0) + WAGE_POLICY[this.wagePolicy].mood - (this.nightShift ? 0.08 : 0) - (this.tech.akkord ? 0.1 : 0) - (heads ? (sick / heads) * 0.3 : 0) - (this.strikeLeft > 0 ? 0.2 : 0);
    target = clamp(target, 0, 1);
    this.mood = clamp(this.mood + (target - this.mood) * 0.35, 0, 1);
    if (this.mood < 0.25 && this.level >= 2 && this.strikeLeft <= 0 && this.rnd() < 0.3) {
      this.strikeLeft = 480;
      this.emit('Die Stimmung ist am Boden: Die Fahrer streiken 8 Stunden.', 'bad');
    }
    // Konjunktur
    this.cycle.left--;
    if (this.cycle.left <= 0) {
      const roll = this.rnd();
      const kind: CycleKind = roll < 0.5 ? 'normal' : roll < 0.75 ? 'boom' : 'crisis';
      this.cycle = { kind, left: 4 + Math.floor(this.rnd() * 6) };
      if (kind === 'boom') this.emit(`Konjunktur: Boom für ${this.cycle.left} Tage. Mehr Schiffe, höhere Gebühren, Gebrauchtes wird teurer.`, 'good');
      else if (kind === 'crisis') this.emit(`Konjunktur: Krise für ${this.cycle.left} Tage. Weniger Schiffe, niedrigere Gebühren, aber Gebrauchtes ist billig.`, 'bad');
      else this.emit('Konjunktur: Wieder normale Lage.', 'info');
    }
    // Weltereignisse: Handel und Politik
    if (this.world) {
      this.world.left--;
      if (this.world.left <= 0) {
        this.emit(`Vorbei: ${WORLD[this.world.id].name}.`, 'info');
        this.world = null;
      }
    } else if (this.level >= 2 && this.rnd() < 0.12) {
      const id = this.pick(Object.keys(WORLD) as WorldId[]);
      const [a, b] = WORLD[id].days;
      this.world = { id, left: a + Math.floor(this.rnd() * (b - a + 1)) };
      if (id === 'embargo') this.world.product = this.pick(['elec', 'cloth', 'food'] as ProductId[]);
      const extra = id === 'embargo' ? ` (${PRODUCTS[this.world.product!].name})` : '';
      this.emit(`Weltlage: ${WORLD[id].name}${extra}. ${WORLD[id].text}. Dauer ${this.world.left} Tage.`, id === 'portstrike' || id === 'newroute' ? 'good' : 'bad');
    }
    // Gebrauchtmarkt: täglich wechselnde Ware
    const q = this.rnd();
    const cm = CYCLES[this.cycle.kind].used;
    if (q < 0.2) this.usedMarket = { factor: Math.round(0.4 * cm * 100) / 100, lo: 0.6, hi: 0.8, label: 'Schnäppchen' };
    else if (q < 0.45) this.usedMarket = { factor: Math.round(0.35 * cm * 100) / 100, lo: 0.3, hi: 0.5, label: 'Schrott' };
    else this.usedMarket = { factor: Math.round(0.5 * cm * 100) / 100, lo: 0.5, hi: 0.75, label: 'Durchschnitt' };
    // Lagergebühr: Spediteure zahlen für Container, die im Lager stehen
    const stored = this.yardStock + this.reeferStock;
    if (stored > 0) {
      const f = Math.round(stored * STORAGE_FEE * (1 + 0.05 * this.tech.sales));
      this.money += f;
      this.today.fees += f;
      this.emit(`Lagergebühren: +${eur(f)} für ${stored} Container im Lager`, 'good');
    }
    // Kontrolle durch Zoll und Arbeitsschutz
    if (this.level >= 2 && this.day >= this.nextInspect) {
      this.nextInspect = this.day + (this.traits.includes('freezone') ? 6 : 10) + Math.floor(this.rnd() * 8);
      const old = [...this.cranes, ...this.trucks].filter((o) => o.cap < 0.5).length;
      const tired = this.nightShift && this.mood < 0.4 ? 1 : 0;
      const bad = old + tired * 2;
      if (bad === 0) {
        this.rep = Math.min(REP_MAX, this.rep + 2);
        this.emit('Kontrolle des Arbeitsschutzes bestanden. Ruf +2', 'good');
      } else {
        const fine = Math.round((5_000 * bad * this.inflation) / 500) * 500;
        this.money -= fine;
        this.today.penalty += fine;
        this.emit(`Kontrolle: ${old ? `${old} Geräte in schlechtem Zustand` : 'Überlastete Belegschaft'}. Strafe −${eur(fine)}`, 'bad');
      }
    }
    // Spezialisierung ab Stufe 3
    if (this.level >= 3 && !this.spec && !this.pending && this.status !== 'lost') {
      this.pending = {
        id: 'spec',
        title: 'Wähle die Richtung deines Hafens',
        text: (Object.keys(SPECS) as SpecId[]).map((k) => `${SPECS[k].name}: ${SPECS[k].pros}. Nachteil: ${SPECS[k].cons}.`).join(' '),
        options: (Object.keys(SPECS) as SpecId[]).map((k) => SPECS[k].name),
      };
      this.emit(undefined, 'info', { tag: 'decision' });
    }
  }

  setNightShift(on: boolean) {
    this.nightShift = on;
    this.version++;
  }
  setWagePolicy(p: WagePolicy) {
    this.wagePolicy = p;
    this.version++;
  }

  // ───────────────────────── Speichern ─────────────────────────

  serialize(): SaveData {
    return {
      v: 2,
      kind: Array.from(this.kind),
      stock: Array.from(this.stock),
      stockExp: Array.from(this.stockExp),
      stockRail: Array.from(this.stockRail),
      yardUse: Array.from(this.yardUse),
      depth: Array.from(this.depth),
      cranes: this.cranes.map((c) => ({ x: c.x, y: c.y, big: c.big, model: c.model, wear: c.wear })),
      shops: this.shops.map((s) => ({ x: s.x, y: s.y })),
      zone: Array.from(this.zone),
      rtgs: this.rtgs.map((r) => ({ x: r.x, y: r.y })),
      market: this.market,
      marketPrev: this.marketPrev,
      products: this.plants.map((p) => p.product),
      foodDone: this.foodDone,
      scenario: this.scenario,
      devs: {
        cranes: this.cranes.map((c) => [c.cap, c.paid, c.build ?? 0]),
        trucks: this.trucks.map((t) => [t.cap, t.paid, t.build ?? 0]),
        gates: this.gates.map((g) => g.build ?? 0),
        plants: this.plants.map((p) => p.build ?? 0),
        rails: this.rails.map((r) => r.build ?? 0),
        rtgs: this.rtgs.map((r) => r.build ?? 0),
        shops: this.shops.map((r) => r.build ?? 0),
      },
      zones: {
        cranes: this.cranes.map((c) => c.zone),
        gates: this.gates.map((g) => g.zone),
        plants: this.plants.map((p) => p.zone),
        rails: this.rails.map((r) => r.zone),
        trucks: this.trucks.map((t) => t.zone),
      },
      oneway: Array.from(this.oneway),
      roadTier: Array.from(this.roadTier),
      roadUnder: Array.from(this.roadUnder),
      closedQ: Array.from(this.closedQ),
      railX: Array.from(this.railX),
      owned: Array.from(this.owned),
      plotsBought: this.plotsBought,
      map: this.map,
      rivalRate: this.rivalRate,
      lostToRival: this.lostToRival,
      wageBoost: this.wageBoost,
      strikeLeft: this.strikeLeft,
      pending: this.pending,
      gates: this.gates.map((g) => ({ x: g.x, y: g.y, served: g.served, rot: g.h > g.w })),
      rails: this.rails.map((r) => ({ x: r.x, y: r.y, platform: r.platform, value: r.value })),
      trucks: this.trucks.map((t) => ({ tile: t.tile, agv: t.agv, role: t.role, wear: t.wear })),
      plants: this.plants.map((p) => ({ x: p.x, y: p.y, kind: p.kind, rot: p.w !== sizeOf(p.kind)[0] })),
      premiumDone: this.premiumDone,
      money: this.money,
      rep: this.rep,
      gm: this.gm,
      mission: this.mission,
      level: this.level,
      handled: this.handled,
      exportsLoaded: this.exportsLoaded,
      reefersHandled: this.reefersHandled,
      trainsDone: this.trainsDone,
      bigShipsDone: this.bigShipsDone,
      spec: this.spec,
      nightShift: this.nightShift,
      wagePolicy: this.wagePolicy,
      mood: this.mood,
      xp: this.xp,
      cycle: this.cycle,
      usedMarket: this.usedMarket,
      nextInspect: this.nextInspect,
      sandbox: this.sandbox,
      traits: this.traits,
      world: this.world,
      batteryCharge: this.batteryCharge,
      rules: this.rules,
      trainLeft: this.trainLeft,
      tech: this.tech,
      megaDone: this.megaDone,
      shipsDone: this.shipsDone,
      shipsOnTime: this.shipsOnTime,
      containersDone: this.containersDone,
      seed: this.seed,
      nextShipIn: this.nextShipIn,
      contracts: this.contracts,
      offers: this.offers,
      contractsDone: this.contractsDone,
      loan: this.loan,
      debtDays: this.debtDays,
      status: this.status,
      endReason: this.endReason,
      diff: this.diff,
      staff: this.staff,
      sick: this.sick,
      today: this.today,
      history: this.history,
    };
  }

  static deserialize(d: SaveData): Sim {
    const s = new Sim(d.seed, d.diff ?? 'normal', d.map ?? 'coast');
    s.kind.set(d.kind);
    if (d.oneway) s.oneway.set(d.oneway);
    if (d.roadTier) s.roadTier.set(d.roadTier);
    if (d.roadUnder) s.roadUnder.set(d.roadUnder);
    if (d.closedQ) s.closedQ.set(d.closedQ);
    if (d.railX) s.railX.set(d.railX);
    if (d.owned) s.owned.set(d.owned);
    s.plotsBought = d.plotsBought ?? 0;
    if (d.rivalRate) s.rivalRate = d.rivalRate;
    s.lostToRival = d.lostToRival ?? 0;
    if (d.wageBoost) s.wageBoost = { ...s.wageBoost, ...d.wageBoost };
    s.strikeLeft = d.strikeLeft ?? 0;
    s.pending = d.pending ?? null;
    s.stock.set(d.stock);
    if (d.stockExp) s.stockExp.set(d.stockExp);
    if (d.stockRail) s.stockRail.set(d.stockRail);
    if (d.yardUse) s.yardUse.set(d.yardUse);
    if (d.depth) s.depth.set(d.depth);
    for (const c of d.cranes) {
      s.place('crane', c.x, c.y);
      const cr = s.cranes[s.cranes.length - 1];
      s.setModel(cr, c.model ?? (c.big ? 'bridge' : 'mobile'));
      s.cranes[s.cranes.length - 1].wear = c.wear ?? 0;
    }
    for (const g of d.gates) {
      s.place('gate', g.x, g.y, !!g.rot);
      s.gates[s.gates.length - 1].served = g.served;
    }
    for (const r of d.rails ?? []) {
      s.place('rail', r.x, r.y);
      const rl = s.rails[s.rails.length - 1];
      rl.platform = r.platform;
      rl.value = r.value;
    }
    for (const t of d.trucks) {
      s.place('truck', t.tile % GRID_W, (t.tile / GRID_W) | 0);
      if (t.agv) s.trucks[s.trucks.length - 1].agv = true;
      s.trucks[s.trucks.length - 1].role = t.role ?? 'auto';
      s.trucks[s.trucks.length - 1].wear = t.wear ?? 0;
    }
    for (const p of d.plants ?? []) s.place(p.kind, p.x, p.y, !!p.rot);
    for (const p of d.shops ?? []) s.place('workshop', p.x, p.y);
    if (d.zone) s.zone.set(d.zone);
    for (const r of d.rtgs ?? []) s.place('rtg', r.x, r.y);
    if (d.market) s.market = { ...s.market, ...d.market };
    if (d.marketPrev) s.marketPrev = { ...s.marketPrev, ...d.marketPrev };
    s.plants.forEach((p, i) => (p.product = d.products?.[i] ?? 'elec'));
    s.foodDone = d.foodDone ?? 0;
    s.scenario = d.scenario ?? null;
    if (d.devs) {
      const v = d.devs;
      s.cranes.forEach((c, i) => ([c.cap, c.paid, c.build] = v.cranes[i] ?? [1, c.paid, 0]));
      s.trucks.forEach((t, i) => ([t.cap, t.paid, t.build] = v.trucks[i] ?? [1, t.paid, 0]));
      s.gates.forEach((e, i) => (e.build = v.gates[i] ?? 0));
      s.plants.forEach((e, i) => (e.build = v.plants[i] ?? 0));
      s.rails.forEach((e, i) => (e.build = v.rails[i] ?? 0));
      s.rtgs.forEach((e, i) => (e.build = v.rtgs[i] ?? 0));
      s.shops.forEach((e, i) => (e.build = v.shops[i] ?? 0));
    } else {
      for (const c of s.cranes) c.paid = s.craneValue(c.model);
    }
    if (d.zones) {
      s.cranes.forEach((c, i) => (c.zone = d.zones!.cranes[i] ?? 0));
      s.gates.forEach((g, i) => (g.zone = d.zones!.gates[i] ?? 0));
      s.plants.forEach((p, i) => (p.zone = d.zones!.plants[i] ?? 0));
      s.rails.forEach((r, i) => (r.zone = d.zones!.rails[i] ?? 0));
      s.trucks.forEach((t, i) => (t.zone = d.zones!.trucks[i] ?? 0));
    }
    s.premiumDone = d.premiumDone ?? 0;
    s.money = d.money;
    s.rep = d.rep;
    s.gm = d.gm;
    s.lastDay = Math.floor(d.gm / MIN_PER_DAY);
    s.mission = d.mission;
    s.level = d.level ?? 1;
    s.handled = d.handled ?? d.containersDone;
    s.exportsLoaded = d.exportsLoaded ?? 0;
    s.reefersHandled = d.reefersHandled ?? 0;
    s.trainsDone = d.trainsDone ?? 0;
    s.spec = d.spec ?? null;
    s.nightShift = d.nightShift ?? true;
    s.wagePolicy = d.wagePolicy ?? 'normal';
    s.mood = d.mood ?? 0.6;
    if (d.xp) s.xp = { ...s.xp, ...d.xp };
    if (d.cycle) s.cycle = d.cycle;
    if (d.usedMarket) s.usedMarket = d.usedMarket;
    s.nextInspect = d.nextInspect ?? 12;
    s.sandbox = d.sandbox ?? false;
    s.traits = d.traits ?? [];
    s.world = d.world ?? null;
    s.batteryCharge = d.batteryCharge ?? 0;
    s.rules = d.rules ?? [];
    if (d.trainLeft) s.trainLeft = { ...s.trainLeft, ...d.trainLeft };
    s.bigShipsDone = d.bigShipsDone ?? 0;
    if (d.tech) s.tech = { ...s.tech, ...d.tech };
    s.megaDone = d.megaDone ?? 0;
    s.shipsDone = d.shipsDone;
    s.shipsOnTime = d.shipsOnTime;
    s.containersDone = d.containersDone;
    s.nextShipIn = d.nextShipIn;
    s.contracts = d.contracts ?? [];
    s.offers = d.offers ?? [];
    s.contractsDone = d.contractsDone ?? 0;
    s.loan = d.loan ?? 0;
    s.debtDays = d.debtDays ?? 0;
    s.status = d.status ?? 'free';
    s.endReason = d.endReason ?? '';
    if (d.staff) s.staff = { ...s.staff, ...d.staff };
    else s.staff.driver = s.trucks.filter((t) => !t.agv).length;
    if (d.sick) s.sick = { driver: [...d.sick.driver], crane: [...d.sick.crane], gate: [...d.sick.gate], mech: [...(d.sick.mech ?? [])] };
    s.nextId = Math.max(s.nextId, ...s.contracts.map((c) => c.id + 1), ...s.offers.map((c) => c.id + 1));
    s.today = { ...emptyBook(), ...d.today };
    s.history = d.history.map((h) => ({ ...emptyBook(), ...h }));
    s.touch();
    for (const i of s.reeferTiles) if (s.stock[i]) s.reefTimes.set(i, new Array(s.stock[i]).fill(s.gm));
    return s;
  }
}
