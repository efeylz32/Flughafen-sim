import {
  AGV_SPEED,
  BuildTool,
  COAST_ROW,
  COST,
  CRANE_BIG_MOVE_GM,
  CRANE_BUFFER,
  CRANE_EXP_BUFFER,
  CRANE_BUFFER_BIG,
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
export type Cargo = 'imp' | 'reef' | 'exp' | 'ware' | 'prem' | 'food';

export interface Shop {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  staffed: boolean;
  /** Gerät in Reparatur */
  target: { kind: 'crane' | 'truck'; id: number } | null;
}

export interface Decision {
  id: 'strike' | 'customs' | 'vip' | 'parts' | 'press';
  title: string;
  text: string;
  options: string[];
}

export interface Rtg {
  id: number;
  x: number;
  y: number;
  staffed: boolean;
}

export interface Plant {
  id: number;
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
  x: number;
  y: number;
  /** Kaiposition (siehe quay.ts) */
  q: number;
  /** Containerbrücke statt Mobilkran */
  big: boolean;
  /** Entladene Container am Kran, die auf einen Truck warten */
  buffer: number;
  bufReef: number;
  resOut: number;
  resOutReef: number;
  /** Export-Container am Kran, die aufs Schiff sollen */
  expBuf: number;
  resExpIn: number;
  cd: number;
  state: 'idle' | 'working' | 'blocked' | 'storm' | 'broken';
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
}

export interface Job {
  cargo: Cargo;
  stage: 0 | 1;
  srcKind: 'crane' | 'store' | 'gate' | 'plant';
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
  | 'broken';

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
  served?: number;
  platform?: number;
  value?: number;
  /** Kran war Containerbrücke, Truck war fahrerlos */
  upgraded?: boolean;
  /** Gebäude war gedreht */
  rot?: boolean;
}

export interface DemolishResult extends BuildCheck {
  removed: Removed[];
}

export interface SaveData {
  v: 1 | 2;
  kind: number[];
  stock: number[];
  stockExp?: number[];
  depth?: number[];
  cranes: { x: number; y: number; big?: boolean; wear?: number }[];
  shops?: { x: number; y: number }[];
  zone?: number[];
  rtgs?: { x: number; y: number }[];
  market?: Record<ProductId, number>;
  marketPrev?: Record<ProductId, number>;
  products?: ProductId[];
  foodDone?: number;
  scenario?: string | null;
  zones?: { cranes: number[]; gates: number[]; plants: number[]; rails: number[]; trucks: number[] };
  oneway?: number[];
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
const emptyBook = (): DayBook => ({ fees: 0, exportFees: 0, rail: 0, berth: 0, bonus: 0, penalty: 0, running: 0, wages: 0, interest: 0, building: 0, handled: 0, ships: 0, onTime: 0, bn: { crane: 0, trucks: 0, yard: 0, gate: 0 }, jamPeak: 0 });
const TILE_OF: Partial<Record<BuildTool, T>> = { kai: T.Kai, road: T.Road, yard: T.Yard, reefer: T.Reefer, gate: T.Gate, rail: T.Rail, unpack: T.Plant, pack: T.Plant, cold: T.Plant, workshop: T.Shop };
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
  /** Gebäude beim nächsten Bauen gedreht (Breite und Höhe getauscht). Nur Bedienung, wird nicht gespeichert. */
  rot = false;

  private nextId = 1;
  private seed: number;
  private distCache = new Map<number, Int16Array>();
  private yardTiles: number[] = [];
  private reeferTiles: number[] = [];
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
          if (k !== T.Land && k !== T.Water && k !== T.Rock) used = true;
        }
      }
      if (used) continue;
      for (let x = p * PLOT_W; x < Math.min(GRID_W, (p + 1) * PLOT_W); x++) this.owned[x] = 0;
    }
    this.version++;
  }

  get plotPrice(): number {
    return PLOT_PRICE + this.plotsBought * PLOT_PRICE_STEP;
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
    if (k === T.Yard || k === T.Reefer) {
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
    for (const i of [...this.yardTiles, ...this.reeferTiles]) if (this.zone[i]) used.add(this.zone[i]);
    if (used.size === 0) return [];
    const free = this.trucks.filter((t) => t.zone === 0).length;
    const out = [];
    for (const z of [...used, 0].sort((a, b) => (a || 9) - (b || 9))) {
      const r = {
        z,
        cranes: this.cranes.filter((c) => c.zone === z).length,
        trucks: this.trucks.filter((t) => t.zone === z).length,
        yard: this.yardTiles.filter((i) => this.zone[i] === z).length,
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
    this.oneway[i] = this.oneway[i] >= 3 ? -1 : this.oneway[i] + 1;
    this.touch();
    return { ok: true, cost: 0 };
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
    return this.rtgCovers(i) ? RTG_CAP : YARD_CAP_PER_TILE;
  }
  rtgCovers(i: number): boolean {
    const x = i % GRID_W;
    const y = (i / GRID_W) | 0;
    return this.rtgs.some((r) => r.staffed && Math.abs(r.x - x) <= RTG_RADIUS && Math.abs(r.y - y) <= RTG_RADIUS);
  }
  rtgAt(x: number, y: number): Rtg | undefined {
    return this.rtgs.find((r) => r.x === x && r.y === y);
  }
  /** Aktueller Verkaufspreis einer Ware */
  price(p: ProductId): number {
    return Math.round((PRODUCTS[p].base * this.market[p]) / 10) * 10;
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
    return (c.big ? CRANE_BIG_MOVE_GM : CRANE_MOVE_GM) / (1 - WEAR_SLOWDOWN * Math.min(1, c.wear));
  }
  /** Ältester Kühlcontainer auf einem Kühlplatz: verbleibende Spielminuten, oder null */
  reeferTimeLeft(tile: number): number | null {
    const q = this.reefTimes.get(tile);
    return q && q.length ? REEFER_MAX_GM - (this.gm - q[0]) : null;
  }

  /** Straßenfelder, die direkt (4er-Nachbarschaft) an Feld `i` grenzen. */
  adjRoad(i: number): number[] {
    const x = i % GRID_W;
    const y = (i / GRID_W) | 0;
    const out: number[] = [];
    if (x > 0 && this.kind[i - 1] === T.Road) out.push(i - 1);
    if (x < GRID_W - 1 && this.kind[i + 1] === T.Road) out.push(i + 1);
    if (y > 0 && this.kind[i - GRID_W] === T.Road) out.push(i - GRID_W);
    if (y < GRID_H - 1 && this.kind[i + GRID_W] === T.Road) out.push(i + GRID_W);
    return out;
  }

  /** Abstandskarte (in Feldern) über das Straßennetz zum Zielfeld. -1 = nicht erreichbar. */
  distMap(target: number): Int16Array {
    let d = this.distCache.get(target);
    if (d) return d;
    d = new Int16Array(GRID_W * GRID_H).fill(-1);
    if (this.kind[target] === T.Road) {
      const q: number[] = [target];
      d[target] = 0;
      for (let qi = 0; qi < q.length; qi++) {
        const c = q[qi];
        const cx = c % GRID_W;
        const cy = (c / GRID_W) | 0;
        // Von n nach c wird in Richtung dir gefahren: n westlich von c heißt Fahrt nach Osten usw.
        const cand = [cx > 0 ? c - 1 : -1, cx < GRID_W - 1 ? c + 1 : -1, cy > 0 ? c - GRID_W : -1, cy < GRID_H - 1 ? c + GRID_W : -1];
        const dirs = [0, 2, 1, 3];
        const ow = this.oneway;
        for (let ci = 0; ci < 4; ci++) {
          const n = cand[ci];
          const dir = dirs[ci];
          if (n >= 0 && d[n] < 0 && this.kind[n] === T.Road && (ow[n] < 0 || ow[n] === dir) && (ow[c] < 0 || ow[c] !== (dir + 2) % 4)) {
            d[n] = d[c] + 1;
            q.push(n);
          }
        }
      }
    }
    this.distCache.set(target, d);
    return d;
  }

  private touch() {
    this.version++;
    this.distCache.clear();
    this.yardTiles = [];
    this.reeferTiles = [];
    for (let i = 0; i < this.kind.length; i++) {
      if (this.kind[i] === T.Yard) this.yardTiles.push(i);
      else if (this.kind[i] === T.Reefer) this.reeferTiles.push(i);
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
    return c.big ? CRANE_BUFFER_BIG : exp ? CRANE_EXP_BUFFER : CRANE_BUFFER;
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
        if (!this.isKai(x + k)) ok = false;
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
    const cost = COST[tool];
    if (!this.inBounds(x, y)) return { ok: false, reason: 'Außerhalb der Karte', cost };
    if (this.level < UNLOCK[tool]) return { ok: false, reason: `Erst ab Stufe ${UNLOCK[tool]} (${LEVELS[UNLOCK[tool] - 1].name})`, cost };
    const i = this.idx(x, y);
    const k = this.kind[i];
    if (!this.owned[x]) return { ok: false, reason: `Das Land gehört dir noch nicht. Kaufe es mit „Land kaufen“ (${eur(this.plotPrice)}).`, cost };
    if (k === T.Rock) return { ok: false, reason: `Hier liegt ein Felsen. Sprenge ihn mit „Abriss“ (${eur(ROCK_COST)}).`, cost };
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
        if (k !== T.Kai) reason = 'Kran braucht ein Kai-Feld';
        else if (this.craneAt(x, y)) reason = 'Hier steht schon ein Kran';
        break;
      case 'road':
      case 'yard':
      case 'reefer':
      case 'gate':
      case 'unpack':
      case 'pack':
      case 'cold':
      case 'workshop':
        if (k !== T.Land) reason = k === T.Water ? 'Nicht auf dem Wasser' : 'Das Feld ist belegt';
        break;
      case 'rail':
        if (k !== T.Land) reason = k === T.Water ? 'Nicht auf dem Wasser' : 'Das Feld ist belegt';
        else if (x !== GRID_W - 1) reason = 'Gleisanschluss nur am rechten Kartenrand';
        break;
      case 'rtg':
        if (k !== T.Yard && k !== T.Reefer) reason = 'Der Portalkran steht auf einer Lagerfläche';
        else if (this.rtgAt(x, y)) reason = 'Hier steht schon ein Portalkran';
        break;
      case 'truck':
        if (k !== T.Road) reason = 'Truck braucht eine Straße';
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

  /** Setzt ein Objekt ohne Prüfung und ohne Kosten. Liefert bei Trucks die neue ID. */
  private place(tool: BuildTool, x: number, y: number, rot = this.rot): number | undefined {
    const [bw, bh] = dimsOf(tool, rot);
    const i = this.idx(x, y);
    switch (tool) {
      case 'kai':
      case 'road':
        this.kind[i] = TILE_OF[tool]!;
        return undefined;
      case 'yard':
      case 'reefer':
        this.kind[i] = TILE_OF[tool]!;
        this.stock[i] = 0;
        this.stockExp[i] = 0;
        this.resIn[i] = 0;
        this.resOut[i] = 0;
        this.resOutExp[i] = 0;
        this.reefTimes.delete(i);
        this.zone[i] = 0;
        return undefined;
      case 'crane':
        this.cranes.push({
          id: this.nextId++,
          x,
          y,
          q: qOf(x, y),
          big: false,
          buffer: 0,
          bufReef: 0,
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
        this.staff.crane++;
        return undefined;
      case 'gate':
        for (const f of this.footprintOf({ x, y, w: bw, h: bh })) this.kind[f] = T.Gate;
        this.gates.push({ id: this.nextId++, x, y, w: bw, h: bh, apron: [], resIn: 0, inApron: 0, resOut: 0, proc: 0, procIn: false, procFee: 0, lastIn: false, served: 0, staffed: true, zone: 0 });
        this.staff.gate++;
        return undefined;
      case 'rail':
        this.kind[i] = T.Rail;
        this.rails.push({ id: this.nextId++, x, y, platform: 0, value: 0, resIn: 0, state: 'away', timer: 60, lastLoad: 0, zone: 0 });
        return undefined;
      case 'dredge':
        this.depth[qOfWater(x, y)] = 1;
        return undefined;
      case 'rtg':
        this.rtgs.push({ id: this.nextId++, x, y, staffed: true });
        this.staff.crane++;
        return undefined;
      case 'workshop':
        for (const f of this.footprintOf({ x, y, w: 2, h: 2 })) this.kind[f] = T.Shop;
        this.shops.push({ id: this.nextId++, x, y, w: 2, h: 2, staffed: true, target: null });
        this.staff.mech++;
        return undefined;
      case 'unpack':
      case 'pack':
      case 'cold':
        for (const f of this.footprintOf({ x, y, w: bw, h: bh })) this.kind[f] = T.Plant;
        this.plants.push({ id: this.nextId++, x, y, w: bw, h: bh, kind: tool, product: 'elec', inBuf: 0, outBuf: 0, resIn: 0, resOut: 0, proc: 0, made: 0, zone: 0 });
        return undefined;
      case 'truck': {
        const id = this.nextId++;
        this.trucks.push({ id, tile: i, next: -1, prog: 0, fx: x, fy: y, px: x, py: y, wait: 0, load: 0, cargo: 'imp', agv: false, job: null, angle: 0, dir: -1, stuck: 0, slot: 0, staffed: true, role: 'auto', wear: 0, zone: 0 });
        this.staff.driver++;
        return id;
      }
    }
  }

  build(tool: BuildTool, x: number, y: number): BuildResult {
    const chk = this.canBuild(tool, x, y);
    if (!chk.ok) return chk;
    this.money -= chk.cost;
    this.today.building += chk.cost;
    const truckId = this.place(tool, x, y);
    this.touch();
    return { ...chk, truckId };
  }

  canDemolish(x: number, y: number): BuildCheck {
    if (!this.inBounds(x, y)) return { ok: false, reason: 'Außerhalb der Karte', cost: 0 };
    const i = this.idx(x, y);
    const k = this.kind[i];
    if (k === T.Rock && !this.owned[x]) return { ok: false, reason: 'Das Land gehört dir nicht', cost: 0 };
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
    if (this.kind[i] === T.Rock) {
      this.kind[i] = T.Land;
      this.money -= ROCK_COST;
      this.today.building += ROCK_COST;
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
      refund: this.give(COST.truck + (t.agv ? UPGRADE.truck.cost : 0), factor),
      upgraded: t.agv,
    });
  }

  private takeRtg(r: Rtg, factor: number, out: Removed[]) {
    this.rtgs = this.rtgs.filter((q) => q !== r);
    this.staff.crane = Math.max(0, this.staff.crane - 1);
    out.push({ tool: 'rtg', x: r.x, y: r.y, refund: this.give(COST.rtg, factor) });
  }

  private takeCrane(c: Crane, factor: number, out: Removed[]) {
    this.cranes = this.cranes.filter((x) => x !== c);
    this.staff.crane = Math.max(0, this.staff.crane - 1);
    out.push({ tool: 'crane', x: c.x, y: c.y, refund: this.give(COST.crane + (c.big ? UPGRADE.crane.cost : 0), factor), upgraded: c.big });
  }

  private takeTile(i: number, factor: number, out: Removed[]) {
    const x = i % GRID_W;
    const y = (i / GRID_W) | 0;
    switch (this.kind[i]) {
      case T.Kai:
        out.push({ tool: 'kai', x, y, refund: this.give(COST.kai, factor) });
        break;
      case T.Road:
        // Trucks auf diesem Feld oder auf dem Weg dorthin gehen mit
        for (const tr of [...this.trucks]) {
          if (tr.tile === i || tr.next === i) this.takeTruck(tr, factor, out);
        }
        out.push({ tool: 'road', x, y, refund: this.give(COST.road, factor) });
        break;
      case T.Yard:
      case T.Reefer: {
        const rt = this.rtgAt(x, y);
        if (rt) this.takeRtg(rt, factor, out);
        const tool: BuildTool = this.kind[i] === T.Yard ? 'yard' : 'reefer';
        out.push({ tool, x, y, refund: this.give(COST[tool], factor), stock: this.stock[i], stockExp: this.stockExp[i] });
        this.stock[i] = 0;
        this.stockExp[i] = 0;
        this.resIn[i] = 0;
        this.resOut[i] = 0;
        this.resOutExp[i] = 0;
        this.reefTimes.delete(i);
        this.zone[i] = 0;
        break;
      }
      case T.Gate: {
        const g = this.gateAt(x, y);
        if (!g) return;
        out.push({ tool: 'gate', x: g.x, y: g.y, refund: this.give(COST.gate, factor), served: g.served, rot: g.h > g.w });
        this.gates = this.gates.filter((q) => q !== g);
        this.staff.gate = Math.max(0, this.staff.gate - 1);
        for (const f of this.footprintOf(g)) this.kind[f] = T.Land;
        break;
      }
      case T.Shop: {
        const sh = this.shopAt(x, y);
        if (!sh) return;
        out.push({ tool: 'workshop', x: sh.x, y: sh.y, refund: this.give(COST.workshop, factor) });
        this.shops = this.shops.filter((q) => q !== sh);
        this.staff.mech = Math.max(0, this.staff.mech - 1);
        for (const f of this.footprintOf(sh)) this.kind[f] = T.Land;
        break;
      }
      case T.Plant: {
        const p = this.plantAt(x, y);
        if (!p) return;
        out.push({ tool: p.kind, x: p.x, y: p.y, refund: this.give(COST[p.kind], factor), rot: p.w !== sizeOf(p.kind)[0] });
        this.plants = this.plants.filter((q) => q !== p);
        for (const f of this.footprintOf(p)) this.kind[f] = T.Land;
        break;
      }
      case T.Rail: {
        const r = this.railAt(x, y);
        out.push({ tool: 'rail', x, y, refund: this.give(COST.rail, factor), platform: r?.platform ?? 0, value: r?.value ?? 0 });
        this.rails = this.rails.filter((q) => q !== r);
        break;
      }
      default:
        return;
    }
    this.kind[i] = T.Land;
  }

  /** Macht einen Bau rückgängig. Die Baukosten werden voll erstattet. */
  undoBuild(a: { tool: BuildTool; x: number; y: number; truckId?: number }): DemolishResult {
    const fail = (reason: string): DemolishResult => ({ ok: false, reason, cost: 0, removed: [] });
    const removed: Removed[] = [];
    if (a.tool === 'truck') {
      const t = this.trucks.find((t) => t.id === a.truckId);
      if (!t) return fail('Der Truck existiert nicht mehr');
      this.takeTruck(t, 1, removed);
    } else if (a.tool === 'crane') {
      const c = this.craneAt(a.x, a.y);
      if (!c) return fail('Der Kran existiert nicht mehr');
      this.takeCrane(c, 1, removed);
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
      removed.push({ tool: 'dredge', x: a.x, y: a.y, refund: this.give(COST.dredge, 1) });
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
      } else if (r.tool === 'crane') {
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
      if (r.tool === 'yard' || r.tool === 'reefer') {
        this.stock[i] = r.stock ?? 0;
        this.stockExp[i] = r.stockExp ?? 0;
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
      } else if (r.tool === 'crane' && r.upgraded) {
        const c = this.craneAt(r.x, r.y);
        if (c) c.big = true;
      } else if (r.tool === 'truck' && r.upgraded) {
        const t = this.trucks.find((t) => t.id === id);
        if (t) t.agv = true;
      }
    }
    this.money -= total;
    this.today.building += total;
    this.touch();
    return { ok: true, cost: total };
  }

  // ───────────────────────── Aufrüsten ─────────────────────────

  canUpgrade(kind: 'crane' | 'truck', id: number): BuildCheck {
    const u = UPGRADE[kind];
    const fail = (reason: string): BuildCheck => ({ ok: false, reason, cost: u.cost });
    if (this.level < u.level) return fail(`Erst ab Stufe ${u.level} (${LEVELS[u.level - 1].name})`);
    if (kind === 'crane') {
      const c = this.cranes.find((c) => c.id === id);
      if (!c) return fail('Der Kran existiert nicht mehr');
      if (c.big) return fail('Ist schon eine Containerbrücke');
      if (!this.bridgeRoom(c)) return fail('Die Containerbrücke steht auf zwei Feldern: Rechts (bzw. unten) daneben muss ein freies Kai-Feld sein');
    } else {
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
    if (kind === 'crane') this.cranes.find((c) => c.id === id)!.big = true;
    else this.trucks.find((t) => t.id === id)!.agv = true;
    this.version++;
    return chk;
  }

  undoUpgrade(kind: 'crane' | 'truck', id: number): BuildCheck {
    const cost = UPGRADE[kind].cost;
    const obj = kind === 'crane' ? this.cranes.find((c) => c.id === id && c.big) : this.trucks.find((t) => t.id === id && t.agv);
    if (!obj) return { ok: false, reason: 'Das Objekt existiert nicht mehr', cost };
    if (kind === 'crane') (obj as Crane).big = false;
    else (obj as Truck).agv = false;
    this.give(cost, 1);
    this.version++;
    return { ok: true, cost };
  }

  // ───────────────────────── Lager und Jobs ─────────────────────────

  private freeAt(i: number): number {
    return this.capAt(i) - this.stock[i] - this.stockExp[i] - this.resIn[i];
  }
  private tilesOf(kind: T): number[] {
    return kind === T.Reefer ? this.reeferTiles : this.yardTiles;
  }
  private hasFreeStore(kind: T, zone = 0): boolean {
    return this.tilesOf(kind).some((i) => this.zone[i] === zone && this.freeAt(i) > 0);
  }

  /** Nächstgelegenes Lagerfeld mit freiem Platz ab Straßenfeld `from`. */
  private findSlot(kind: T, from: number, zone: number): { tile: number; access: number; d: number; free: number } | null {
    let best: { tile: number; access: number; d: number; free: number } | null = null;
    for (const y of this.tilesOf(kind)) {
      if (this.zone[y] !== zone) continue;
      const free = this.freeAt(y);
      if (free <= 0) continue;
      for (const a of this.adjRoad(y)) {
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
      const avail = cargo === 'exp' ? this.stockExp[y] - this.resOutExp[y] : this.stock[y] - this.resOut[y];
      if (avail <= 0) continue;
      for (const a of this.adjRoad(y)) {
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
      else c.resOut = Math.max(0, c.resOut + d);
    } else if (j.srcKind === 'store') {
      if (j.cargo === 'exp') this.resOutExp[j.src] = Math.max(0, this.resOutExp[j.src] + d);
      else this.resOut[j.src] = Math.max(0, this.resOut[j.src] + d);
    } else if (j.srcKind === 'plant') {
      const p = this.plants.find((p) => p.id === j.src);
      if (p) p.resOut = Math.max(0, p.resOut + d);
    } else {
      const g = this.gates.find((g) => g.id === j.src);
      if (g) g.resOut = Math.max(0, g.resOut + d);
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
      if (p) p.resIn = Math.max(0, p.resIn + d);
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
    const storeKind = j.cargo === 'reef' ? T.Reefer : T.Yard;
    if (j.stage === 0) {
      if (j.srcKind === 'crane' && !this.cranes.some((c) => c.id === j.src)) return false;
      if (j.srcKind === 'store' && this.kind[j.src] !== storeKind) return false;
      if (j.srcKind === 'gate' && !this.gates.some((g) => g.id === j.src)) return false;
      if (j.srcKind === 'plant' && !this.plants.some((p) => p.id === j.src)) return false;
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
      const score = weight / (1 + dist / 15);
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
      if (!zOk(c.zone)) continue;
      const ci = this.idx(c.x, c.y);
      const ship = this.shipAtBerth(this.cq(c));
      // 1. Entladene Container vom Kran wegfahren
      const more = ship !== undefined && ship.containers + ship.reefers > 0;
      const full = c.buffer + c.bufReef >= this.bufCap(c);
      for (const cargo of ['imp', 'reef'] as const) {
        const avail = cargo === 'imp' ? c.buffer - c.resOut : c.bufReef - c.resOutReef;
        if (avail <= 0) continue;
        // Volle Fahrt abwarten, außer der Kran liefert nichts mehr nach
        if (avail < TRUCK_CAP && more && !full) continue;
        const acc = this.nearestAccess(ci, t.tile);
        if (!acc) continue;
        const slot = this.findSlot(cargo === 'imp' ? T.Yard : T.Reefer, acc.access, c.zone);
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
      if (!zOk(g.zone)) continue;
      // 3. Import-Container vom Lager zum Gate
      const room = GATE_APRON_CAP - g.apron.length - g.resIn;
      if (room > 0) {
        const starving = g.apron.length + g.resIn === 0;
        for (const cargo of ['imp', 'reef'] as const) {
          const src = this.findSource(cargo === 'imp' ? T.Yard : T.Reefer, cargo, t.tile, g.zone);
          const acc = src ? this.nearestAccess(g, src.access) : null;
          if (!src || !acc) continue;
          offer('out', (starving ? 2.4 : 1.2) * (cargo === 'reef' ? 1.3 : press), src.d + acc.d, {
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
      // 4. Angekommene Export-Container vom Gate auf den Stapelplatz
      const waiting = g.inApron - g.resOut;
      if (waiting > 0) {
        const acc = this.nearestAccess(g, t.tile);
        const slot = acc ? this.findSlot(T.Yard, acc.access, g.zone) : null;
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
      if (!zOk(p.zone)) continue;
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
      const done = p.kind !== 'unpack' ? p.outBuf - p.resOut : 0;
      const sold: Cargo = p.kind === 'cold' ? 'food' : 'prem';
      if (done > 0) {
        const a1 = this.nearestAccess(p, t.tile);
        if (!a1) continue;
        for (const g of this.gates) {
          if (g.zone !== p.zone) continue;
          const gr = GATE_APRON_CAP - g.apron.length - g.resIn;
          const a2 = gr > 0 ? this.nearestAccess(g, a1.access) : null;
          if (a2) {
            offer('plant out', 2.2, a1.d + a2.d, { cargo: sold, stage: 0, srcKind: 'plant', src: p.id, dstKind: 'gate', dst: g.id, tgt: [a1.access, a2.access], n: Math.min(TRUCK_CAP, done, gr) });
          }
        }
        for (const r of this.rails) {
          if (r.zone !== p.zone) continue;
          const rr = RAIL_CAP - r.platform - r.resIn;
          const a2 = rr > 0 ? this.nearestAccess(r, a1.access) : null;
          if (a2) {
            offer('plant out', 1.8, a1.d + a2.d, { cargo: sold, stage: 0, srcKind: 'plant', src: p.id, dstKind: 'rail', dst: r.id, tgt: [a1.access, a2.access], n: Math.min(TRUCK_CAP, done, rr) });
          }
        }
      }
    }

    // 5. Import-Container vom Lager zum Gleisanschluss
    for (const r of this.rails) {
      if (!zOk(r.zone)) continue;
      const room = RAIL_CAP - r.platform - r.resIn;
      if (room <= 0) continue;
      for (const cargo of ['imp', 'reef'] as const) {
        const src = this.findSource(cargo === 'imp' ? T.Yard : T.Reefer, cargo, t.tile, r.zone);
        const acc = src ? this.nearestAccess(r, src.access) : null;
        if (!src || !acc) continue;
        offer('out', 1.5 * (cargo === 'reef' ? 1.3 : press), src.d + acc.d, {
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
      } else {
        if (c.buffer < j.n) return false;
        c.buffer -= j.n;
      }
    } else if (j.srcKind === 'store') {
      if (j.cargo === 'exp') {
        if (this.stockExp[j.src] < j.n) return false;
        this.stockExp[j.src] -= j.n;
      } else {
        if (this.stock[j.src] < j.n) return false;
        this.stock[j.src] -= j.n;
        if (j.cargo === 'reef') this.reefTimes.get(j.src)?.splice(0, j.n);
      }
    } else if (j.srcKind === 'plant') {
      const p = this.plants.find((p) => p.id === j.src);
      if (!p || p.outBuf < j.n) return false;
      p.outBuf -= j.n;
    } else {
      const g = this.gates.find((g) => g.id === j.src);
      if (!g || g.inApron < j.n) return false;
      g.inApron -= j.n;
    }
    this.srcRes(j, -j.n);
    t.load = j.n;
    t.cargo = j.cargo;
    j.stage = 1;
    return true;
  }

  private dropOff(t: Truck, j: Job): boolean {
    let fee = j.cargo === 'reef' ? REEFER_FEE : FEE_PER_CONTAINER;
    if (j.cargo === 'prem') fee = this.price(this.plants.find((p) => p.id === j.src)?.product ?? 'elec');
    if (j.cargo === 'food') fee = this.price('food');
    if (j.dstKind === 'gate' || j.dstKind === 'rail') {
      if (j.cargo === 'prem') this.premiumDone += j.n;
      if (j.cargo === 'food') this.foodDone += j.n;
    }
    if (j.dstKind === 'store') {
      if (j.cargo === 'exp') this.stockExp[j.dst] += j.n;
      else {
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
      for (let k = 0; k < j.n; k++) g.apron.push(fee);
    } else if (j.dstKind === 'rail') {
      const r = this.rails.find((r) => r.id === j.dst);
      if (!r) return false;
      r.platform += j.n;
      r.value += j.n * fee;
    } else if (j.dstKind === 'plant') {
      const p = this.plants.find((p) => p.id === j.dst);
      if (!p) return false;
      p.inBuf += j.n;
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
    return this.oneway[tile] === dir ? 2 : 1;
  }

  private stepTruck(t: Truck, dt: number) {
    const j = t.job!;
    const tgt = j.tgt[j.stage];

    if (t.tile === tgt && t.next < 0) {
      t.wait = TRUCK_HANDLE_GM * (t.role === 'auto' ? 1 : ROUTINE_HANDLE);
      const storeTile = j.stage === 0 ? (j.srcKind === 'store' ? j.src : -1) : j.dstKind === 'store' ? j.dst : -1;
      if (storeTile >= 0 && this.rtgCovers(storeTile)) t.wait *= RTG_HANDLE;
      const ok = j.stage === 0 ? this.pickUp(t, j) : this.dropOff(t, j);
      if (!ok) this.cancelJob(t);
      return;
    }

    if (t.next < 0) {
      const d = this.distMap(tgt);
      const here = d[t.tile];
      if (here < 0) return this.cancelJob(t);
      const x = t.tile % GRID_W;
      const y = (t.tile / GRID_W) | 0;
      // Nachbarn in der Reihenfolge Ost, Süd, West, Nord (entspricht der Spurrichtung)
      const cand = [x < GRID_W - 1 ? t.tile + 1 : -1, y < GRID_H - 1 ? t.tile + GRID_W : -1, x > 0 ? t.tile - 1 : -1, y > 0 ? t.tile - GRID_W : -1];
      let pick = -1;
      let pickDir = -1;
      for (let dir = 0; dir < 4; dir++) {
        const n = cand[dir];
        if (n < 0 || d[n] !== here - 1) continue;
        // Unter gleich kurzen Wegen den nehmen, dessen Spur frei ist
        const free = this.lane[n * 4 + dir] < this.laneCap(n, dir);
        if (pick < 0 || free) {
          pick = n;
          pickDir = dir;
          if (free) break;
        }
      }
      if (pick < 0) return this.cancelJob(t);
      t.angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][pickDir];
      // Die Spur im nächsten Feld ist belegt: warten. Das ist der Stau.
      if (this.lane[pick * 4 + pickDir] >= this.laneCap(pick, pickDir) && t.stuck < TRUCK_PATIENCE_GM) {
        t.stuck += dt;
        this.roadJam[t.tile] += dt;
        return;
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

    t.prog += (t.agv ? AGV_SPEED : TRUCK_SPEED) * (t.role === 'auto' ? 1 : ROUTINE_SPEED) * (1 - WEAR_SLOWDOWN * t.wear) * dt;
    if (this.level >= 2) {
      t.wear = Math.min(1, t.wear + WEAR_TRUCK_PER_GM * dt);
      if (t.wear >= 1) this.noteBroken('Ein Truck');
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
    return Math.max(0, this.staff[role] - this.sick[role].length);
  }
  wagePerHour(role: Role): number {
    // Größere Häfen zahlen Tariflohn: +8 % je Stufe
    return Math.round(ROLES[role].wage * DIFFS[this.diff].wage * this.wageBoost[role] * (1 + 0.08 * (Math.min(this.level, 7) - 1)));
  }
  hire(role: Role) {
    this.staff[role]++;
  }
  fire(role: Role): BuildCheck {
    if (this.staff[role] <= 0) return { ok: false, reason: 'Niemand angestellt', cost: 0 };
    this.staff[role]--;
    // Wer krank ist und entlassen wird, zählt nicht mehr als krank
    if (this.sick[role].length > this.staff[role]) this.sick[role].pop();
    return { ok: true, cost: 0 };
  }

  /** Verteilt die anwesenden Leute und zahlt den Lohn. Kranke bekommen weiter Lohn. */
  private updateStaff(dt: number) {
    let n = this.staffAvail('driver');
    for (const t of this.trucks) t.staffed = t.agv || n-- > 0;
    n = this.staffAvail('crane');
    for (const c of this.cranes) c.staffed = n-- > 0;
    for (const r of this.rtgs) r.staffed = n-- > 0;
    n = this.staffAvail('gate');
    for (const g of this.gates) g.staffed = n-- > 0;
    n = this.staffAvail('mech');
    for (const s of this.shops) s.staffed = n-- > 0;
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

  private noteBroken(what: string) {
    if (this.gm - this.brokeNote < 120) return;
    this.brokeNote = this.gm;
    this.emit(
      `${what} ist ausgefallen. ${this.shops.length ? 'Die Werkstatt kümmert sich darum.' : 'Baue eine Werkstatt mit Mechaniker.'}`,
      'bad',
      { tag: 'broken' },
    );
  }

  /** Jede besetzte Werkstatt repariert das am stärksten abgenutzte Gerät. */
  private updateShops(dt: number) {
    const busy = new Set(this.shops.map((s) => (s.target ? `${s.target.kind}${s.target.id}` : '')));
    for (const s of this.shops) {
      if (!s.staffed) continue;
      let obj: { wear: number } | undefined = s.target
        ? s.target.kind === 'crane'
          ? this.cranes.find((c) => c.id === s.target!.id)
          : this.trucks.find((t) => t.id === s.target!.id)
        : undefined;
      if (!obj || obj.wear <= 0.02) {
        s.target = null;
        let best: { kind: 'crane' | 'truck'; id: number; wear: number } | null = null;
        for (const c of this.cranes) if (c.wear > 0.3 && !busy.has(`crane${c.id}`) && (!best || c.wear > best.wear)) best = { kind: 'crane', id: c.id, wear: c.wear };
        for (const t of this.trucks) if (t.wear > 0.3 && !busy.has(`truck${t.id}`) && (!best || t.wear > best.wear)) best = { kind: 'truck', id: t.id, wear: t.wear };
        if (!best) continue;
        s.target = { kind: best.kind, id: best.id };
        busy.add(`${best.kind}${best.id}`);
        obj = best.kind === 'crane' ? this.cranes.find((c) => c.id === best!.id) : this.trucks.find((t) => t.id === best!.id);
      }
      if (obj) obj.wear = Math.max(0, obj.wear - REPAIR_PER_GM * dt);
    }
  }

  /** Jeden Morgen: Kranke werden gesund, neue melden sich krank. */
  private rollSickness() {
    const p = DIFFS[this.diff].sick;
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
    if (this.level < 2 || this.forecast || this.weather !== 'clear' || this.rnd() > 0.55) return;
    const kind = this.rnd() < 0.5 ? 'storm' : 'fog';
    this.forecast = { kind, in: 180 + this.rnd() * 900, dur: kind === 'storm' ? 120 + this.rnd() * 120 : 120 + this.rnd() * 90, warned: false };
  }

  // ───────────────────────── Schiffe ─────────────────────────

  private addShip(type: ShipTypeId, c: Contract | null, reefer: boolean) {
    const st = SHIP_TYPES[type];
    const n = 100 + Math.floor(this.rnd() * 900);
    const reefers = reefer ? Math.round(st.containers * REEFER_SHARE) : 0;
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
      containers: st.containers - reefers,
      reefers,
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
    const mega = this.level >= 4 && this.hasDeepBerth(SHIP_TYPES.mega.len) && this.rnd() < 0.3;
    const big = !mega && this.level >= 3 && this.hasDeepBerth() && this.rnd() < 0.25;
    const reefer = this.level >= 3 && this.reeferCapacity >= 12 && this.rnd() < 0.4;
    this.addShip(mega ? 'mega' : big ? 'panamax' : 'feeder', null, reefer);
    // Ist die Konkurrenz pünktlicher als du, kommen weniger freie Schiffe
    const mine = this.myRate;
    const rival = this.level >= 2 && mine !== null ? 1 + Math.max(0, this.rivalRate - mine) : 1;
    const base = (Math.min(300, Math.max(120, 300 - this.rep * 1.5)) + this.contracts.length * 90) * (this.level >= 2 ? MAPS[this.map].ships : 1) * rival;
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
      for (const s of this.ships) {
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
          const imports = s.containers + s.reefers;
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
    if (this.weather === 'storm') return { text: 'Sturm: Die Kräne stehen still. Die Liegezeit läuft nicht weiter.', blocked: false };
    const cr = this.cranesAtBerth(s.berthX, s.len);
    if (cr.length === 0) return bad('Kein Kran am Liegeplatz. Setze einen Kran auf eines der Kai-Felder am Schiff.');
    if (cr.every((c) => !c.staffed)) return bad('Kein Kranführer im Dienst. Stelle im Personal jemanden ein.');
    const imports = s.containers + s.reefers;
    if (imports > 0 && cr.every((c) => c.state === 'blocked')) {
      if (this.trucks.length === 0) return bad('Es gibt keinen Truck. Kaufe einen Truck.');
      const zoned = cr.find((c) => c.zone && c.buffer + c.bufReef > 0 && !this.tilesOf(c.bufReef ? T.Reefer : T.Yard).some((i) => this.zone[i] === c.zone));
      if (zoned) return bad(`Der Kran gehört zu Zone ${ZONES[zoned.zone].name}, aber es gibt dort kein passendes Lager. Male Lagerflächen in Zone ${ZONES[zoned.zone].name} an.`);
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
      if (this.trucks.some((t) => !t.staffed)) return bad('Es fehlen Fahrer: Trucks stehen still. Stelle im Personal jemanden ein.');
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
    } else {
      this.money -= c.penalty;
      this.today.penalty += c.penalty;
      this.emit(`Vertragsstrafe von ${c.line}: −${eur(c.penalty)}`, 'bad');
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
    const imports = s.containers + s.reefers;
    const onTime = imports <= 0 && s.atBerth <= s.dwellTarget + 1;
    this.shipsDone++;
    this.today.ships++;
    if (st.deep && imports <= 0) this.bigShipsDone++;
    if (s.type === 'mega' && imports <= 0) this.megaDone++;
    const c = this.contracts.find((c) => c.id === s.contractId);
    const bonus = onTime && c ? c.bonus : 0;
    if (imports <= 0) {
      this.money += st.berthFee;
      this.today.berth += st.berthFee;
    }
    if (onTime) {
      this.shipsOnTime++;
      this.today.onTime++;
      this.rep = Math.min(REP_MAX, this.rep + 1);
      const extra = bonus ? ` und ${eur(bonus)} Vertragsbonus` : '';
      this.emit(`${s.name} abgefertigt: +${eur(st.berthFee)} Liegegebühr${extra}, Ruf +1`, 'good', {
        tag: 'ship-done',
        x: this.shipBox(s).x + this.shipBox(s).w / 2,
        y: this.shipBox(s).y,
        amount: st.berthFee + bonus,
      });
    } else if (imports > 0) {
      this.rep = Math.max(0, this.rep - 3);
      this.emit(`${s.name} ist mit ${imports} Containern an Bord wieder ausgelaufen. Ruf −3`, 'bad', { tag: 'ship-late' });
    } else {
      this.rep = Math.max(0, this.rep - 1);
      this.emit(`${s.name} hat zu lange gelegen (${Math.round(s.atBerth / 60)} h statt ${Math.round(s.dwellTarget / 60)} h). Ruf −1`, 'bad', {
        tag: 'ship-late',
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
      if (c.wear >= 1) {
        c.state = 'broken';
        continue;
      }
      if (!ship || !c.staffed) {
        c.state = 'idle';
        c.cd = mt;
        continue;
      }
      const imports = ship.containers + ship.reefers;
      const canUnload = imports > 0 && c.buffer + c.bufReef < this.bufCap(c);
      const canLoad = ship.exportLeft > 0 && c.expBuf > 0;
      if (canUnload || canLoad) {
        c.state = 'working';
        c.cd = Math.min(c.cd, mt) - dt;
        if (c.cd <= 0) {
          c.cd += mt;
          if (this.level >= 2) c.wear = Math.min(1, c.wear + WEAR_CRANE_PER_MOVE);
          if (c.wear >= 1) this.noteBroken('Ein Kran');
          // Abwechselnd ent- und beladen, wenn beides geht
          const load = canLoad && (!canUnload || !c.lastLoad);
          c.lastLoad = load;
          if (load) {
            c.expBuf--;
            ship.exportLeft--;
            ship.loaded++;
            this.exportsLoaded++;
            this.handled++, this.today.handled++;
            this.money += EXPORT_FEE;
            this.today.exportFees += EXPORT_FEE;
            this.emit(undefined, 'good', { tag: 'export', x: c.x, y: c.y - 1, amount: EXPORT_FEE });
          } else if (ship.reefers > 0 && this.rnd() < ship.reefers / imports) {
            ship.reefers--;
            c.bufReef++;
          } else if (ship.containers > 0) {
            ship.containers--;
            c.buffer++;
          } else {
            ship.reefers--;
            c.bufReef++;
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
      if (!t.job && t.wait <= 0) continue;
      if (t.dir >= 0) this.lane[t.tile * 4 + t.dir]++;
      if (t.next >= 0) {
        const d = t.next - t.tile;
        this.lane[t.next * 4 + (d === 1 ? 0 : d === GRID_W ? 1 : d === -1 ? 2 : 3)]++;
      }
    }
    if (this.tickCount % 5 === 0) for (let i = 0; i < this.roadJam.length; i++) this.roadJam[i] *= 0.93;
    for (const t of this.trucks) {
      // Ausgefallen: bleibt stehen, wo er ist, bis die Werkstatt kommt
      if (t.wear >= 1) continue;
      if (t.wait > 0) {
        t.wait -= dt;
        continue;
      }
      if (!t.job) {
        t.stuck = 0;
        // Ohne Fahrer bleibt der Truck stehen
        if (!t.staffed) continue;
        this.assignJob(t);
        if (!t.job) continue;
        // Die Leitstelle braucht Funkzeit. Trucks mit fester Aufgabe fahren sofort los.
        if (t.role === 'auto') {
          t.wait = DISPATCH_GM;
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
          if (g.procIn) {
            g.inApron++;
          } else {
            g.served++;
            this.containersDone++;
            this.handled++, this.today.handled++;
            if (g.procFee === REEFER_FEE) this.reefersHandled++;
            this.money += g.procFee;
            this.today.fees += g.procFee;
            this.emit(undefined, 'good', { tag: 'container', x: g.x, y: g.y, amount: g.procFee });
          }
        }
      }
      if (g.proc > 0 || !g.staffed) continue;
      const wantOut = g.apron.length > 0;
      const wantIn = this.exportNeed > 0 && g.inApron < GATE_IN_CAP;
      if (!wantOut && !wantIn) continue;
      // Abwechselnd rein und raus, wenn beides ansteht
      const takeIn = wantIn && (!wantOut || !g.lastIn);
      g.lastIn = takeIn;
      g.procIn = takeIn;
      g.proc = GATE_PROCESS_GM;
      if (takeIn) this.exportNeed--;
      else g.procFee = g.apron.shift()!;
    }
  }

  private updateRails(dt: number) {
    for (const r of this.rails) {
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
          r.timer = RAIL_INTERVAL_GM - 2 * RAIL_TRAVEL_GM - RAIL_STAY_GM;
          break;
      }
    }
  }

  private updatePlants(dt: number) {
    for (const p of this.plants) {
      const cfg = PLANTS[p.kind];
      if (p.proc > 0) {
        p.proc -= dt;
        if (p.proc > 0) continue;
        p.proc = 0;
        p.outBuf++;
        p.made++;
      }
      if (p.inBuf >= cfg.needs && p.outBuf < PLANT_BUF) {
        p.inBuf -= cfg.needs;
        p.proc = cfg.time;
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
      while (q.length > this.resOut[i] && this.gm - q[0] > REEFER_MAX_GM && this.stock[i] > 0) {
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
    if (this.level < 2 || this.pending || this.status === 'lost' || this.rnd() > EVENT_CHANCE) return;
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
    if (this.cranes.some((c) => !c.big && this.bridgeRoom(c))) {
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
        const c = this.cranes.find((c) => !c.big && this.bridgeRoom(c));
        if (!c || this.money < 60_000) {
          this.emit('Das Geschäft kam nicht zustande.', 'info');
          break;
        }
        this.money -= 60_000;
        this.today.building += 60_000;
        c.big = true;
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
    return Math.round(this.loan * LOAN_RATE * DIFFS[this.diff].rate);
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
    const calls = 4 + Math.floor(this.rnd() * 6);
    const tight = (SHIP_TYPES[ship].dwell - dwell) / 60;
    const raw = (big ? 12_000 : 2_500) + tight * 1_500 + this.rnd() * (big ? 8_000 : 2_000) + (reefer ? 2_000 : 0);
    const bonus = Math.round(raw / 500) * 500;
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
      dwell,
      bonus,
      penalty: Math.round((bonus * 0.8 * DIFFS[this.diff].penalty) / 500) * 500,
      next: 30 + this.rnd() * 30,
    };
  }

  private makeOffers() {
    this.offers = [];
    if (this.level < 2) return;
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
    for (const c of this.cranes) cost += c.big ? R.craneBig : R.crane;
    for (const t of this.trucks) cost += t.agv ? R.agv : R.truck;
    cost += this.gates.length * R.gate + this.rails.length * R.rail + this.plants.length * R.plant + this.shops.length * R.shop;
    cost += this.yardTiles.length * R.yardTile + this.reeferTiles.length * R.reeferTile;
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
    this.emit(`Tagesabschluss: Betriebskosten −${eur(cost)}${interest ? `, Zinsen −${eur(interest)}` : ''}`, 'info', { tag: 'day' });
    this.checkEnd();
  }

  // ───────────────────────── Speichern ─────────────────────────

  serialize(): SaveData {
    return {
      v: 2,
      kind: Array.from(this.kind),
      stock: Array.from(this.stock),
      stockExp: Array.from(this.stockExp),
      depth: Array.from(this.depth),
      cranes: this.cranes.map((c) => ({ x: c.x, y: c.y, big: c.big, wear: c.wear })),
      shops: this.shops.map((s) => ({ x: s.x, y: s.y })),
      zone: Array.from(this.zone),
      rtgs: this.rtgs.map((r) => ({ x: r.x, y: r.y })),
      market: this.market,
      marketPrev: this.marketPrev,
      products: this.plants.map((p) => p.product),
      foodDone: this.foodDone,
      scenario: this.scenario,
      zones: {
        cranes: this.cranes.map((c) => c.zone),
        gates: this.gates.map((g) => g.zone),
        plants: this.plants.map((p) => p.zone),
        rails: this.rails.map((r) => r.zone),
        trucks: this.trucks.map((t) => t.zone),
      },
      oneway: Array.from(this.oneway),
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
    if (d.owned) s.owned.set(d.owned);
    s.plotsBought = d.plotsBought ?? 0;
    if (d.rivalRate) s.rivalRate = d.rivalRate;
    s.lostToRival = d.lostToRival ?? 0;
    if (d.wageBoost) s.wageBoost = { ...s.wageBoost, ...d.wageBoost };
    s.strikeLeft = d.strikeLeft ?? 0;
    s.pending = d.pending ?? null;
    s.stock.set(d.stock);
    if (d.stockExp) s.stockExp.set(d.stockExp);
    if (d.depth) s.depth.set(d.depth);
    for (const c of d.cranes) {
      s.place('crane', c.x, c.y);
      if (c.big) s.cranes[s.cranes.length - 1].big = true;
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
    s.bigShipsDone = d.bigShipsDone ?? 0;
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
