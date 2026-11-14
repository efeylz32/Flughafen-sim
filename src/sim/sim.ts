import {
  AGV_SPEED,
  BuildTool,
  COAST_ROW,
  COST,
  CRANE_BIG_MOVE_GM,
  CRANE_BUFFER,
  CRANE_EXP_BUFFER,
  CRANE_MOVE_GM,
  DIFFS,
  DISPATCH_GM,
  DiffId,
  EXPORT_FEE,
  EXPORT_PRESTOCK,
  EXPORT_SHARE,
  FEE_PER_CONTAINER,
  GATE_APRON_CAP,
  GATE_IN_CAP,
  GATE_PROCESS_GM,
  GRID_H,
  GRID_W,
  LEVELS,
  MIN_PER_DAY,
  PLANTS,
  PLANT_BUF,
  PREMIUM_FEE,
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
import { MISSIONS } from './missions';

/** Import, Kühlfracht (Import) oder Export */
export type Cargo = 'imp' | 'reef' | 'exp' | 'ware' | 'prem';

export interface Plant {
  id: number;
  x: number;
  y: number;
  kind: PlantKind;
  inBuf: number;
  outBuf: number;
  resIn: number;
  resOut: number;
  proc: number;
  made: number;
}

export interface Crane {
  id: number;
  x: number;
  y: number;
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
  state: 'idle' | 'working' | 'blocked' | 'storm';
  /** Letzter Zug war ein Beladen (für abwechselndes Ent- und Beladen) */
  lastLoad: boolean;
  /** Ein Kranführer ist im Dienst */
  staffed: boolean;
}

export interface Gate {
  id: number;
  x: number;
  y: number;
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
  /** Ein Fahrer ist im Dienst (fahrerlose Fahrzeuge brauchen keinen) */
  staffed: boolean;
  role: TruckRole;
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
  berthX: number;
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
  | 'contract';

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
  building: number;
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
  cranes: { x: number; y: number; big?: boolean }[];
  gates: { x: number; y: number; served: number }[];
  rails?: { x: number; y: number; platform: number; value: number }[];
  trucks: { tile: number; agv?: boolean; role?: TruckRole }[];
  plants?: { x: number; y: number; kind: PlantKind }[];
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
  shipsDone: number;
  shipsOnTime: number;
  containersDone: number;
  seed: number;
  nextShipIn: number;
  contracts?: Contract[];
  offers?: Contract[];
  contractsDone?: number;
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
const UNLOADING = 'Wird entladen.';
const LOADING = 'Wird beladen.';
const emptyBook = (): DayBook => ({ fees: 0, exportFees: 0, rail: 0, berth: 0, bonus: 0, penalty: 0, running: 0, wages: 0, building: 0 });
const TILE_OF: Partial<Record<BuildTool, T>> = { kai: T.Kai, road: T.Road, yard: T.Yard, reefer: T.Reefer, gate: T.Gate, rail: T.Rail, unpack: T.Plant, pack: T.Plant };
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
  /** Ausgebaggerte Spalten vor dem Kai (1 = tief) */
  depth = new Uint8Array(GRID_W);

  cranes: Crane[] = [];
  gates: Gate[] = [];
  rails: Rail[] = [];
  plants: Plant[] = [];
  premiumDone = 0;
  trucks: Truck[] = [];
  ships: Ship[] = [];
  contracts: Contract[] = [];
  offers: Contract[] = [];

  money: number;
  /** Angestellte je Aufgabe */
  staff: Record<Role, number> = { driver: 0, crane: 0, gate: 0 };
  /** Krankmeldungen je Aufgabe: verbleibende Tage */
  sick: Record<Role, number[]> = { driver: [], crane: [], gate: [] };
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
  events: GameEvent[] = [];
  /** Wird bei jeder Bauänderung erhöht, damit der Renderer neu zeichnet. */
  version = 0;

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
  ) {
    this.seed = seed >>> 0;
    this.money = DIFFS[diff].money;
    this.lastDay = Math.floor(this.gm / MIN_PER_DAY);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        this.kind[y * GRID_W + x] = y < COAST_ROW ? T.Water : T.Land;
      }
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
    return this.yardTiles.length * YARD_CAP_PER_TILE;
  }
  /** Alle Container auf dem Stapelplatz (Import und Export) */
  get yardStock(): number {
    let s = 0;
    for (const i of this.yardTiles) s += this.stock[i] + this.stockExp[i];
    return s;
  }
  get reeferCapacity(): number {
    return this.reeferTiles.length * YARD_CAP_PER_TILE;
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
    return c.big ? CRANE_BIG_MOVE_GM : CRANE_MOVE_GM;
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
        const cand = [cx > 0 ? c - 1 : -1, cx < GRID_W - 1 ? c + 1 : -1, cy > 0 ? c - GRID_W : -1, cy < GRID_H - 1 ? c + GRID_W : -1];
        for (const n of cand) {
          if (n >= 0 && d[n] < 0 && this.kind[n] === T.Road) {
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

  craneAt(x: number, y: number): Crane | undefined {
    return this.cranes.find((c) => c.x === x && c.y === y);
  }
  gateAt(x: number, y: number): Gate | undefined {
    return this.gates.find((g) => g.x === x && g.y === y);
  }
  plantAt(x: number, y: number): Plant | undefined {
    return this.plants.find((p) => p.x === x && p.y === y);
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
  private isKai(x: number): boolean {
    return x >= 0 && x < GRID_W && this.kind[this.idx(x, COAST_ROW)] === T.Kai;
  }

  /** x-Anfang aller kleinen Liegeplätze (4 Kai-Felder in Folge), ohne Überlappung, von links. */
  berths(): number[] {
    const out: number[] = [];
    let x = 0;
    while (x <= GRID_W - SHIP_LEN) {
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
    return out;
  }
  hasBerth(): boolean {
    return this.berths().length > 0;
  }
  /** Gibt es einen ausgebaggerten Liegeplatz mit 6 Kai-Feldern für große Schiffe? */
  hasDeepBerth(): boolean {
    const len = SHIP_TYPES.panamax.len;
    let run = 0;
    for (let x = 0; x < GRID_W; x++) {
      run = this.isKai(x) && this.depth[x] ? run + 1 : 0;
      if (run >= len) return true;
    }
    return false;
  }
  berthContaining(x: number): number {
    for (const b of this.berths()) if (x >= b && x < b + SHIP_LEN) return b;
    return -1;
  }
  cranesAtBerth(b: number, len = SHIP_LEN): Crane[] {
    return this.cranes.filter((c) => c.x >= b && c.x < b + len);
  }
  shipAtBerth(x: number): Ship | undefined {
    return this.ships.find((s) => s.state === 'unloading' && x >= s.berthX && x < s.berthX + s.len);
  }

  /** Sucht einen freien Liegeplatz für ein Schiff. Liefert den x-Anfang oder -1. */
  private findBerth(len: number, deep: boolean): number {
    const occ = this.ships
      .filter((s) => s.state === 'sailing' || s.state === 'unloading' || (s.state === 'leaving' && s.berthX >= 0 && s.x < s.berthX + s.len + 0.5))
      .map((s) => [s.berthX, s.berthX + s.len] as const);
    let best = -1;
    let bestScore = -Infinity;
    for (let x = 0; x <= GRID_W - len; x++) {
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
    let reason: string | undefined;
    switch (tool) {
      case 'kai':
        if (k === T.Water) reason = 'Kai steht an Land, direkt am Wasser';
        else if (k !== T.Land || y !== COAST_ROW) reason = 'Kai nur in der ersten Reihe am Wasser';
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
        if (k !== T.Land) reason = k === T.Water ? 'Nicht auf dem Wasser' : 'Das Feld ist belegt';
        break;
      case 'rail':
        if (k !== T.Land) reason = k === T.Water ? 'Nicht auf dem Wasser' : 'Das Feld ist belegt';
        else if (x !== GRID_W - 1) reason = 'Gleisanschluss nur am rechten Kartenrand';
        break;
      case 'truck':
        if (k !== T.Road) reason = 'Truck braucht eine Straße';
        break;
      case 'dredge':
        if (k !== T.Water || y < COAST_ROW - 3) reason = 'Baggern nur im Wasser direkt vor dem Kai';
        else if (this.depth[x]) reason = 'Hier ist schon gebaggert';
        break;
    }
    if (!reason && this.money < cost) reason = 'Zu wenig Geld';
    return { ok: !reason, reason, cost };
  }

  /** Setzt ein Objekt ohne Prüfung und ohne Kosten. Liefert bei Trucks die neue ID. */
  private place(tool: BuildTool, x: number, y: number): number | undefined {
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
        return undefined;
      case 'crane':
        this.cranes.push({
          id: this.nextId++,
          x,
          y,
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
        });
        this.staff.crane++;
        return undefined;
      case 'gate':
        this.kind[i] = T.Gate;
        this.gates.push({ id: this.nextId++, x, y, apron: [], resIn: 0, inApron: 0, resOut: 0, proc: 0, procIn: false, procFee: 0, lastIn: false, served: 0, staffed: true });
        this.staff.gate++;
        return undefined;
      case 'rail':
        this.kind[i] = T.Rail;
        this.rails.push({ id: this.nextId++, x, y, platform: 0, value: 0, resIn: 0, state: 'away', timer: 60, lastLoad: 0 });
        return undefined;
      case 'dredge':
        this.depth[x] = 1;
        return undefined;
      case 'unpack':
      case 'pack':
        this.kind[i] = T.Plant;
        this.plants.push({ id: this.nextId++, x, y, kind: tool, inBuf: 0, outBuf: 0, resIn: 0, resOut: 0, proc: 0, made: 0 });
        return undefined;
      case 'truck': {
        const id = this.nextId++;
        this.trucks.push({ id, tile: i, next: -1, prog: 0, fx: x, fy: y, px: x, py: y, wait: 0, load: 0, cargo: 'imp', agv: false, job: null, angle: 0, dir: -1, stuck: 0, staffed: true, role: 'auto' });
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
    if (k === T.Water || k === T.Land) {
      return this.truckAtTile(i) ? { ok: true, cost: 0 } : { ok: false, reason: 'Hier ist nichts', cost: 0 };
    }
    if (k === T.Kai && !this.craneAt(x, y) && this.shipUsesKai(x)) {
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
    const truck = this.truckAtTile(i);
    const crane = this.craneAt(x, y);
    if (truck) this.takeTruck(truck, factor, removed);
    else if (crane) this.takeCrane(crane, factor, removed);
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
        const tool: BuildTool = this.kind[i] === T.Yard ? 'yard' : 'reefer';
        out.push({ tool, x, y, refund: this.give(COST[tool], factor), stock: this.stock[i], stockExp: this.stockExp[i] });
        this.stock[i] = 0;
        this.stockExp[i] = 0;
        this.resIn[i] = 0;
        this.resOut[i] = 0;
        this.resOutExp[i] = 0;
        this.reefTimes.delete(i);
        break;
      }
      case T.Gate: {
        const g = this.gateAt(x, y);
        out.push({ tool: 'gate', x, y, refund: this.give(COST.gate, factor), served: g?.served ?? 0 });
        this.gates = this.gates.filter((q) => q !== g);
        this.staff.gate = Math.max(0, this.staff.gate - 1);
        break;
      }
      case T.Plant: {
        const p = this.plantAt(x, y);
        const tool: BuildTool = p?.kind ?? 'unpack';
        out.push({ tool, x, y, refund: this.give(COST[tool], factor) });
        this.plants = this.plants.filter((q) => q !== p);
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
    } else if (a.tool === 'dredge') {
      if (!this.depth[a.x]) return fail('Hier ist nicht mehr gebaggert');
      if (this.ships.some((s) => SHIP_TYPES[s.type].deep && (s.state === 'sailing' || s.state === 'unloading') && s.berthX <= a.x && a.x < s.berthX + s.len)) {
        return fail('Ein großes Schiff liegt dort');
      }
      this.depth[a.x] = 0;
      removed.push({ tool: 'dredge', x: a.x, y: a.y, refund: this.give(COST.dredge, 1) });
    } else {
      const i = this.idx(a.x, a.y);
      if (this.kind[i] !== TILE_OF[a.tool]) return fail('Das Feld wurde inzwischen geändert');
      if ((a.tool === 'unpack' || a.tool === 'pack') && this.plantAt(a.x, a.y)?.kind !== a.tool) return fail('Das Feld wurde inzwischen geändert');
      if (a.tool === 'kai') {
        if (this.craneAt(a.x, a.y)) return fail('Auf dem Kai steht ein Kran');
        if (this.shipUsesKai(a.x)) return fail('Ein Schiff liegt am Kai');
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
      } else if (r.tool !== 'dredge') {
        if (k !== T.Land) return fail('Das Feld ist inzwischen belegt');
        willBe.set(i, TILE_OF[r.tool]!);
      }
    }
    for (const r of order) {
      const id = this.place(r.tool, r.x, r.y);
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
    return YARD_CAP_PER_TILE - this.stock[i] - this.stockExp[i] - this.resIn[i];
  }
  private tilesOf(kind: T): number[] {
    return kind === T.Reefer ? this.reeferTiles : this.yardTiles;
  }
  private hasFreeStore(kind: T): boolean {
    return this.tilesOf(kind).some((i) => this.freeAt(i) > 0);
  }

  /** Nächstgelegenes Lagerfeld mit freiem Platz ab Straßenfeld `from`. */
  private findSlot(kind: T, from: number): { tile: number; access: number; d: number; free: number } | null {
    let best: { tile: number; access: number; d: number; free: number } | null = null;
    for (const y of this.tilesOf(kind)) {
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
  private findSource(kind: T, cargo: Cargo, from: number): { tile: number; access: number; d: number; avail: number } | null {
    let best: { tile: number; access: number; d: number; avail: number } | null = null;
    for (const y of this.tilesOf(kind)) {
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
  private nearestAccess(i: number, from: number): { access: number; d: number } | null {
    let best: { access: number; d: number } | null = null;
    for (const a of this.adjRoad(i)) {
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

    for (const c of this.cranes) {
      const ci = this.idx(c.x, c.y);
      const ship = this.shipAtBerth(c.x);
      // 1. Entladene Container vom Kran wegfahren
      const more = ship !== undefined && ship.containers + ship.reefers > 0;
      const full = c.buffer + c.bufReef >= CRANE_BUFFER;
      for (const cargo of ['imp', 'reef'] as const) {
        const avail = cargo === 'imp' ? c.buffer - c.resOut : c.bufReef - c.resOutReef;
        if (avail <= 0) continue;
        // Volle Fahrt abwarten, außer der Kran liefert nichts mehr nach
        if (avail < TRUCK_CAP && more && !full) continue;
        const acc = this.nearestAccess(ci, t.tile);
        if (!acc) continue;
        const slot = this.findSlot(cargo === 'imp' ? T.Yard : T.Reefer, acc.access);
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
        const room = CRANE_EXP_BUFFER - c.expBuf - c.resExpIn;
        if (need > 0 && room > 0) {
          const src = this.findSource(T.Yard, 'exp', t.tile);
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
      const gi = this.idx(g.x, g.y);
      // 3. Import-Container vom Lager zum Gate
      const room = GATE_APRON_CAP - g.apron.length - g.resIn;
      if (room > 0) {
        const starving = g.apron.length + g.resIn === 0;
        for (const cargo of ['imp', 'reef'] as const) {
          const src = this.findSource(cargo === 'imp' ? T.Yard : T.Reefer, cargo, t.tile);
          const acc = src ? this.nearestAccess(gi, src.access) : null;
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
        const acc = this.nearestAccess(gi, t.tile);
        const slot = acc ? this.findSlot(T.Yard, acc.access) : null;
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
      const pi = this.idx(p.x, p.y);
      const room = PLANT_BUF - p.inBuf - p.resIn;
      const hungry = p.inBuf + p.resIn < PLANTS[p.kind].needs;
      if (room > 0 && p.kind === 'unpack') {
        const src = this.findSource(T.Yard, 'imp', t.tile);
        const acc = src ? this.nearestAccess(pi, src.access) : null;
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
      if (room > 0 && p.kind === 'pack') {
        for (const q of this.plants) {
          const avail = q.outBuf - q.resOut;
          if (q.kind !== 'unpack' || avail <= 0) continue;
          const a1 = this.nearestAccess(this.idx(q.x, q.y), t.tile);
          const a2 = a1 ? this.nearestAccess(pi, a1.access) : null;
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
      const done = p.kind === 'pack' ? p.outBuf - p.resOut : 0;
      if (done > 0) {
        const a1 = this.nearestAccess(pi, t.tile);
        if (!a1) continue;
        for (const g of this.gates) {
          const gr = GATE_APRON_CAP - g.apron.length - g.resIn;
          const a2 = gr > 0 ? this.nearestAccess(this.idx(g.x, g.y), a1.access) : null;
          if (a2) {
            offer('plant out', 2.2, a1.d + a2.d, { cargo: 'prem', stage: 0, srcKind: 'plant', src: p.id, dstKind: 'gate', dst: g.id, tgt: [a1.access, a2.access], n: Math.min(TRUCK_CAP, done, gr) });
          }
        }
        for (const r of this.rails) {
          const rr = RAIL_CAP - r.platform - r.resIn;
          const a2 = rr > 0 ? this.nearestAccess(this.idx(r.x, r.y), a1.access) : null;
          if (a2) {
            offer('plant out', 1.8, a1.d + a2.d, { cargo: 'prem', stage: 0, srcKind: 'plant', src: p.id, dstKind: 'rail', dst: r.id, tgt: [a1.access, a2.access], n: Math.min(TRUCK_CAP, done, rr) });
          }
        }
      }
    }

    // 5. Import-Container vom Lager zum Gleisanschluss
    for (const r of this.rails) {
      const room = RAIL_CAP - r.platform - r.resIn;
      if (room <= 0) continue;
      const ri = this.idx(r.x, r.y);
      for (const cargo of ['imp', 'reef'] as const) {
        const src = this.findSource(cargo === 'imp' ? T.Yard : T.Reefer, cargo, t.tile);
        const acc = src ? this.nearestAccess(ri, src.access) : null;
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
    const fee = j.cargo === 'reef' ? REEFER_FEE : j.cargo === 'prem' ? PREMIUM_FEE : FEE_PER_CONTAINER;
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
      if (j.cargo === 'prem') this.premiumDone += j.n;
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

  private stepTruck(t: Truck, dt: number) {
    const j = t.job!;
    const tgt = j.tgt[j.stage];

    if (t.tile === tgt && t.next < 0) {
      t.wait = TRUCK_HANDLE_GM * (t.role === 'auto' ? 1 : ROUTINE_HANDLE);
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
        if (pick < 0 || this.lane[n * 4 + dir] === 0) {
          pick = n;
          pickDir = dir;
          if (this.lane[n * 4 + dir] === 0) break;
        }
      }
      if (pick < 0) return this.cancelJob(t);
      t.angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][pickDir];
      // Die Spur im nächsten Feld ist belegt: warten. Das ist der Stau.
      if (this.lane[pick * 4 + pickDir] > 0 && t.stuck < TRUCK_PATIENCE_GM) {
        t.stuck += dt;
        this.roadJam[t.tile] += dt;
        return;
      }
      this.lane[pick * 4 + pickDir]++;
      t.next = pick;
      t.prog = 0;
      t.stuck = 0;
    }

    t.prog += (t.agv ? AGV_SPEED : TRUCK_SPEED) * (t.role === 'auto' ? 1 : ROUTINE_SPEED) * dt;
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
    this.updateMissions();
    this.rollDay();
  }

  // ───────────────────────── Personal ─────────────────────────

  /** So viele Leute braucht der jetzige Ausbau. */
  staffNeed(role: Role): number {
    if (role === 'driver') return this.trucks.filter((t) => !t.agv).length;
    return role === 'crane' ? this.cranes.length : this.gates.length;
  }
  /** Angestellt und nicht krank */
  staffAvail(role: Role): number {
    return Math.max(0, this.staff[role] - this.sick[role].length);
  }
  wagePerHour(role: Role): number {
    return Math.round(ROLES[role].wage * DIFFS[this.diff].wage);
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
    n = this.staffAvail('gate');
    for (const g of this.gates) g.staffed = n-- > 0;
    let perHour = 0;
    for (const r of Object.keys(ROLES) as Role[]) perHour += this.staff[r] * this.wagePerHour(r);
    const pay = (perHour * dt) / 60;
    this.money -= pay;
    this.today.wages += pay;
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
      containers: st.containers - reefers,
      reefers,
      total: st.containers,
      exportLeft: exp,
      exportTotal: exp,
      loaded: 0,
      queuedFor: 0,
      atBerth: 0,
      dwellTarget: c ? c.dwell : Math.round(st.dwell * DIFFS[this.diff].dwell),
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
    const big = this.level >= 3 && this.hasDeepBerth() && this.rnd() < 0.25;
    const reefer = this.level >= 3 && this.reeferCapacity >= 12 && this.rnd() < 0.4;
    this.addShip(big ? 'panamax' : 'feeder', null, reefer);
    const base = Math.min(300, Math.max(120, 300 - this.rep * 1.5)) + this.contracts.length * 90;
    this.nextShipIn = base * (0.8 + this.rnd() * 0.4);
  }

  private moveToward(s: Ship, tx: number, ty: number, step: number): boolean {
    const dx = tx - s.x;
    const dy = ty - s.y;
    const d = Math.hypot(dx, dy);
    if (d <= step) {
      s.x = tx;
      s.y = ty;
      return true;
    }
    s.x += (dx / d) * step;
    s.y += (dy / d) * step;
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
          if (SHIP_TYPES[s.type].deep && !this.hasDeepBerth()) {
            s.reason = 'Braucht einen tiefen Liegeplatz: 6 Kai-Felder in einer Reihe, davor ausgebaggert.';
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
        case 'sailing':
          if (this.moveToward(s, s.berthX, COAST_ROW - 2, step)) {
            s.state = 'unloading';
            s.atBerth = 0;
            this.emit(undefined, 'info', { tag: 'ship-arrived', x: s.x, y: s.y });
          }
          s.reason = 'Läuft in den Hafen ein.';
          s.blocked = false;
          break;
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
          if (this.moveToward(s, GRID_W + 8, s.y, step)) this.ships = this.ships.filter((x) => x !== s);
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
      if (cr.some((c) => c.bufReef > 0) && !this.hasFreeStore(T.Reefer)) {
        return bad(
          this.reeferTiles.length
            ? 'Kühlplätze voll. Baue mehr Kühlplätze oder mehr Ausgänge.'
            : 'Kühlcontainer brauchen Kühlplätze mit Strom. Baue Kühlplätze an die Straße.',
        );
      }
      const cap = this.yardCapacity;
      if (cap === 0) return bad('Es gibt keinen Stapelplatz. Baue einen Stapelplatz an die Straße.');
      if (cr.some((c) => c.buffer > 0) && !this.hasFreeStore(T.Yard)) {
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
    if (st.deep && imports <= 0) this.bigShipsDone++;
    const c = this.contracts.find((c) => c.id === s.contractId);
    const bonus = onTime && c ? c.bonus : 0;
    if (imports <= 0) {
      this.money += st.berthFee;
      this.today.berth += st.berthFee;
    }
    if (onTime) {
      this.shipsOnTime++;
      this.rep = Math.min(REP_MAX, this.rep + 1);
      const extra = bonus ? ` und ${eur(bonus)} Vertragsbonus` : '';
      this.emit(`${s.name} abgefertigt: +${eur(st.berthFee)} Liegegebühr${extra}, Ruf +1`, 'good', {
        tag: 'ship-done',
        x: s.x + s.len / 2,
        y: s.y,
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
      const ship = this.shipAtBerth(c.x);
      if (storm) {
        c.state = 'storm';
        continue;
      }
      if (!ship || !c.staffed) {
        c.state = 'idle';
        c.cd = mt;
        continue;
      }
      const imports = ship.containers + ship.reefers;
      const canUnload = imports > 0 && c.buffer + c.bufReef < CRANE_BUFFER;
      const canLoad = ship.exportLeft > 0 && c.expBuf > 0;
      if (canUnload || canLoad) {
        c.state = 'working';
        c.cd = Math.min(c.cd, mt) - dt;
        if (c.cd <= 0) {
          c.cd += mt;
          // Abwechselnd ent- und beladen, wenn beides geht
          const load = canLoad && (!canUnload || !c.lastLoad);
          c.lastLoad = load;
          if (load) {
            c.expBuf--;
            ship.exportLeft--;
            ship.loaded++;
            this.exportsLoaded++;
            this.handled++;
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
            this.handled++;
            if (g.procFee === REEFER_FEE) this.reefersHandled++;
            if (g.procFee === PREMIUM_FEE) this.premiumDone++;
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
    const busyT = this.trucks.filter((t) => t.job !== null || t.wait > 0).length;
    this.stats.trucks = ema(this.stats.trucks, this.trucks.length ? busyT / this.trucks.length : 0);
    const cap = this.yardCapacity;
    this.stats.yard = cap ? this.yardStock / cap : 0;
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
  }

  private makeOffer(): Contract {
    const l = this.pick(LINES);
    const roll = this.rnd();
    const big = this.level >= 3 && roll < 0.3;
    const reefer = this.level >= 3 && !big && roll > 0.65;
    const ship: ShipTypeId = big ? 'panamax' : 'feeder';
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
    cost += this.gates.length * R.gate + this.rails.length * R.rail + this.plants.length * R.plant;
    cost += this.yardTiles.length * R.yardTile + this.reeferTiles.length * R.reeferTile;
    for (let x = 0; x < GRID_W; x++) if (this.isKai(x)) cost += R.kaiTile;
    return cost;
  }

  private rollDay() {
    const d = Math.floor(this.gm / MIN_PER_DAY);
    if (d === this.lastDay) return;
    this.lastDay = d;
    const cost = this.runningCost();
    this.money -= cost;
    this.today.running += cost;
    this.history.push(this.today);
    if (this.history.length > 7) this.history.shift();
    this.today = emptyBook();
    this.makeOffers();
    this.planWeather();
    this.rollSickness();
    this.emit(`Tagesabschluss: Betriebskosten −${eur(cost)}`, 'info', { tag: 'day' });
  }

  // ───────────────────────── Speichern ─────────────────────────

  serialize(): SaveData {
    return {
      v: 2,
      kind: Array.from(this.kind),
      stock: Array.from(this.stock),
      stockExp: Array.from(this.stockExp),
      depth: Array.from(this.depth),
      cranes: this.cranes.map((c) => ({ x: c.x, y: c.y, big: c.big })),
      gates: this.gates.map((g) => ({ x: g.x, y: g.y, served: g.served })),
      rails: this.rails.map((r) => ({ x: r.x, y: r.y, platform: r.platform, value: r.value })),
      trucks: this.trucks.map((t) => ({ tile: t.tile, agv: t.agv, role: t.role })),
      plants: this.plants.map((p) => ({ x: p.x, y: p.y, kind: p.kind })),
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
      shipsDone: this.shipsDone,
      shipsOnTime: this.shipsOnTime,
      containersDone: this.containersDone,
      seed: this.seed,
      nextShipIn: this.nextShipIn,
      contracts: this.contracts,
      offers: this.offers,
      contractsDone: this.contractsDone,
      diff: this.diff,
      staff: this.staff,
      sick: this.sick,
      today: this.today,
      history: this.history,
    };
  }

  static deserialize(d: SaveData): Sim {
    const s = new Sim(d.seed, d.diff ?? 'normal');
    s.kind.set(d.kind);
    s.stock.set(d.stock);
    if (d.stockExp) s.stockExp.set(d.stockExp);
    if (d.depth) s.depth.set(d.depth);
    for (const c of d.cranes) {
      s.place('crane', c.x, c.y);
      if (c.big) s.cranes[s.cranes.length - 1].big = true;
    }
    for (const g of d.gates) {
      s.place('gate', g.x, g.y);
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
    }
    for (const p of d.plants ?? []) s.place(p.kind, p.x, p.y);
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
    s.shipsDone = d.shipsDone;
    s.shipsOnTime = d.shipsOnTime;
    s.containersDone = d.containersDone;
    s.nextShipIn = d.nextShipIn;
    s.contracts = d.contracts ?? [];
    s.offers = d.offers ?? [];
    s.contractsDone = d.contractsDone ?? 0;
    if (d.staff) s.staff = { ...d.staff };
    else s.staff.driver = s.trucks.filter((t) => !t.agv).length;
    if (d.sick) s.sick = { driver: [...d.sick.driver], crane: [...d.sick.crane], gate: [...d.sick.gate] };
    s.nextId = Math.max(s.nextId, ...s.contracts.map((c) => c.id + 1), ...s.offers.map((c) => c.id + 1));
    s.today = { ...emptyBook(), ...d.today };
    s.history = d.history.map((h) => ({ ...emptyBook(), ...h }));
    s.touch();
    for (const i of s.reeferTiles) if (s.stock[i]) s.reefTimes.set(i, new Array(s.stock[i]).fill(s.gm));
    return s;
  }
}
