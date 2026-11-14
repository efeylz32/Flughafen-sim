import {
  BERTH_FEE,
  BuildTool,
  COAST_ROW,
  COST,
  CRANE_BUFFER,
  CRANE_MOVE_GM,
  FEE_PER_CONTAINER,
  GATE_APRON_CAP,
  GATE_PROCESS_GM,
  GRID_H,
  GRID_W,
  MIN_PER_DAY,
  REFUND,
  REP_MAX,
  RUN_COST_PER_DAY,
  SHIP_CONTAINERS,
  SHIP_DWELL_TARGET_GM,
  SHIP_LEN,
  SHIP_PATIENCE_GM,
  SHIP_SPEED,
  START_GM,
  START_MONEY,
  START_REP,
  T,
  TICK_GM,
  TRUCK_CAP,
  TRUCK_HANDLE_GM,
  TRUCK_JAM,
  TRUCK_SPEED,
  YARD_CAP_PER_TILE,
} from './data';
import { MISSIONS } from './missions';

export interface Crane {
  id: number;
  x: number;
  y: number;
  buffer: number;
  reserved: number;
  cd: number;
  state: 'idle' | 'working' | 'blocked';
}

export interface Gate {
  id: number;
  x: number;
  y: number;
  apron: number;
  reservedIn: number;
  proc: number;
  served: number;
}

export interface Job {
  kind: 'C2Y' | 'Y2G';
  stage: 0 | 1;
  /** C2Y: Kran-ID, Y2G: Stapelplatz-Feld */
  src: number;
  /** C2Y: Stapelplatz-Feld, Y2G: Gate-ID */
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
  job: Job | null;
  /** Blickrichtung in Radiant für die Darstellung */
  angle: number;
}

export type ShipState = 'queued' | 'sailing' | 'unloading' | 'leaving';

export interface Ship {
  id: number;
  name: string;
  color: number;
  state: ShipState;
  x: number;
  y: number;
  px: number;
  py: number;
  berthX: number;
  containers: number;
  total: number;
  queuedFor: number;
  atBerth: number;
  reason: string;
  /** Das Schiff kommt nicht voran und braucht die Aufmerksamkeit des Spielers. */
  blocked: boolean;
}

export type EventTag = 'container' | 'ship-arrived' | 'ship-done' | 'ship-late' | 'ship-cancel' | 'mission' | 'day';

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
  berth: number;
  running: number;
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
  served?: number;
}

export interface DemolishResult extends BuildCheck {
  removed: Removed[];
}

export interface SaveData {
  v: 1;
  kind: number[];
  stock: number[];
  cranes: { x: number; y: number }[];
  gates: { x: number; y: number; served: number }[];
  trucks: { tile: number }[];
  money: number;
  rep: number;
  gm: number;
  mission: number;
  shipsDone: number;
  shipsOnTime: number;
  containersDone: number;
  seed: number;
  nextShipIn: number;
  today: DayBook;
  history: DayBook[];
}

const SHIP_COLORS = [0xd9534f, 0x3b82c4, 0x2f9e6b, 0xe0a030, 0x7a5cc7, 0x2a9d9d];
const SHIP_PREFIX = ['NV', 'KM', 'OR', 'TL'];
const UNLOADING = 'Wird entladen.';
const emptyBook = (): DayBook => ({ fees: 0, berth: 0, running: 0, building: 0 });

export class Sim {
  readonly w = GRID_W;
  readonly h = GRID_H;
  kind = new Uint8Array(GRID_W * GRID_H);
  stock = new Uint16Array(GRID_W * GRID_H);
  yardRes = new Int16Array(GRID_W * GRID_H);
  yardOut = new Int16Array(GRID_W * GRID_H);

  cranes: Crane[] = [];
  gates: Gate[] = [];
  trucks: Truck[] = [];
  ships: Ship[] = [];

  money = START_MONEY;
  rep = START_REP;
  gm = START_GM;
  tickCount = 0;
  mission = 0;
  shipsDone = 0;
  shipsOnTime = 0;
  containersDone = 0;
  nextShipIn = 20;

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
  private truckCount = new Int16Array(GRID_W * GRID_H);
  private lastDay: number;

  constructor(seed = 1234) {
    this.seed = seed >>> 0;
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
    const m = Math.floor(this.gm % MIN_PER_DAY);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }
  get yardCapacity(): number {
    return this.yardTiles.length * YARD_CAP_PER_TILE;
  }
  get yardStock(): number {
    let s = 0;
    for (const i of this.yardTiles) s += this.stock[i];
    return s;
  }
  get yardTileList(): readonly number[] {
    return this.yardTiles;
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
        const cand = [
          cx > 0 ? c - 1 : -1,
          cx < GRID_W - 1 ? c + 1 : -1,
          cy > 0 ? c - GRID_W : -1,
          cy < GRID_H - 1 ? c + GRID_W : -1,
        ];
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
    for (let i = 0; i < this.kind.length; i++) if (this.kind[i] === T.Yard) this.yardTiles.push(i);
  }

  craneAt(x: number, y: number): Crane | undefined {
    return this.cranes.find((c) => c.x === x && c.y === y);
  }
  gateAt(x: number, y: number): Gate | undefined {
    return this.gates.find((g) => g.x === x && g.y === y);
  }
  truckAtTile(tile: number): Truck | undefined {
    return this.trucks.find((t) => t.tile === tile);
  }

  /** x-Anfang aller Liegeplätze (4 Kai-Felder in Folge), ohne Überlappung, von links. */
  berths(): number[] {
    const out: number[] = [];
    let x = 0;
    while (x <= GRID_W - SHIP_LEN) {
      let ok = true;
      for (let k = 0; k < SHIP_LEN; k++) {
        if (this.kind[this.idx(x + k, COAST_ROW)] !== T.Kai) {
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
  berthContaining(x: number): number {
    for (const b of this.berths()) if (x >= b && x < b + SHIP_LEN) return b;
    return -1;
  }
  cranesAtBerth(b: number): Crane[] {
    return this.cranes.filter((c) => c.x >= b && c.x < b + SHIP_LEN);
  }
  private berthOccupied(b: number): boolean {
    return this.ships.some(
      (s) =>
        (s.state === 'sailing' || s.state === 'unloading' || (s.state === 'leaving' && s.x < s.berthX + SHIP_LEN + 0.5)) &&
        s.berthX < b + SHIP_LEN &&
        s.berthX + SHIP_LEN > b,
    );
  }
  private pickBerth(): number {
    let best = -1;
    let bestCranes = -1;
    for (const b of this.berths()) {
      if (this.berthOccupied(b)) continue;
      const n = this.cranesAtBerth(b).length;
      if (n > bestCranes) {
        best = b;
        bestCranes = n;
      }
    }
    return best;
  }
  shipAtBerth(x: number): Ship | undefined {
    return this.ships.find((s) => s.state === 'unloading' && x >= s.berthX && x < s.berthX + SHIP_LEN);
  }

  // ───────────────────────── Bauen ─────────────────────────

  canBuild(tool: BuildTool, x: number, y: number): BuildCheck {
    const cost = COST[tool];
    if (!this.inBounds(x, y)) return { ok: false, reason: 'Außerhalb der Karte', cost };
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
      case 'gate':
        if (k !== T.Land) reason = k === T.Water ? 'Nicht auf dem Wasser' : 'Das Feld ist belegt';
        break;
      case 'truck':
        if (k !== T.Road) reason = 'Truck braucht eine Straße';
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
        this.kind[i] = T.Kai;
        return undefined;
      case 'crane':
        this.cranes.push({ id: this.nextId++, x, y, buffer: 0, reserved: 0, cd: CRANE_MOVE_GM, state: 'idle' });
        return undefined;
      case 'road':
        this.kind[i] = T.Road;
        return undefined;
      case 'yard':
        this.kind[i] = T.Yard;
        this.stock[i] = 0;
        return undefined;
      case 'gate':
        this.kind[i] = T.Gate;
        this.gates.push({ id: this.nextId++, x, y, apron: 0, reservedIn: 0, proc: 0, served: 0 });
        return undefined;
      case 'truck': {
        const id = this.nextId++;
        this.trucks.push({ id, tile: i, next: -1, prog: 0, fx: x, fy: y, px: x, py: y, wait: 0, load: 0, job: null, angle: 0 });
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
    return this.ships.some((s) => (s.state === 'sailing' || s.state === 'unloading') && s.berthX <= x && x < s.berthX + SHIP_LEN);
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

  private give(tool: BuildTool, factor: number): number {
    const r = Math.round(COST[tool] * factor);
    this.money += r;
    this.today.building -= r;
    return r;
  }

  private takeTruck(t: Truck, factor: number, out: Removed[]) {
    if (t.job) this.cancelJob(t);
    this.trucks = this.trucks.filter((x) => x !== t);
    out.push({ tool: 'truck', x: t.tile % GRID_W, y: (t.tile / GRID_W) | 0, refund: this.give('truck', factor) });
  }

  private takeCrane(c: Crane, factor: number, out: Removed[]) {
    this.cranes = this.cranes.filter((x) => x !== c);
    out.push({ tool: 'crane', x: c.x, y: c.y, refund: this.give('crane', factor) });
  }

  private takeTile(i: number, factor: number, out: Removed[]) {
    const x = i % GRID_W;
    const y = (i / GRID_W) | 0;
    switch (this.kind[i]) {
      case T.Kai:
        out.push({ tool: 'kai', x, y, refund: this.give('kai', factor) });
        break;
      case T.Road:
        // Trucks auf diesem Feld oder auf dem Weg dorthin gehen mit
        for (const tr of [...this.trucks]) {
          if (tr.tile === i || tr.next === i) this.takeTruck(tr, factor, out);
        }
        out.push({ tool: 'road', x, y, refund: this.give('road', factor) });
        break;
      case T.Yard:
        out.push({ tool: 'yard', x, y, refund: this.give('yard', factor), stock: this.stock[i] });
        this.stock[i] = 0;
        this.yardRes[i] = 0;
        this.yardOut[i] = 0;
        break;
      case T.Gate: {
        const g = this.gateAt(x, y);
        out.push({ tool: 'gate', x, y, refund: this.give('gate', factor), served: g?.served ?? 0 });
        this.gates = this.gates.filter((q) => q !== g);
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
    } else {
      const want = { kai: T.Kai, road: T.Road, yard: T.Yard, gate: T.Gate }[a.tool];
      const i = this.idx(a.x, a.y);
      if (this.kind[i] !== want) return fail('Das Feld wurde inzwischen geändert');
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
    const tileKind = { kai: T.Kai, road: T.Road, yard: T.Yard, gate: T.Gate };
    const willBe = new Map<number, T>();
    for (const r of order) {
      const i = this.idx(r.x, r.y);
      const k = willBe.get(i) ?? this.kind[i];
      if (r.tool === 'truck') {
        if (k !== T.Road) return fail('Die Straße fehlt inzwischen');
      } else if (r.tool === 'crane') {
        if (k !== T.Kai || this.craneAt(r.x, r.y)) return fail('Der Platz am Kai ist belegt');
      } else {
        if (k !== T.Land) return fail('Das Feld ist inzwischen belegt');
        willBe.set(i, tileKind[r.tool]);
      }
    }
    for (const r of order) {
      this.place(r.tool, r.x, r.y);
      if (r.tool === 'yard' && r.stock) this.stock[this.idx(r.x, r.y)] = r.stock;
      if (r.tool === 'gate' && r.served) {
        const g = this.gateAt(r.x, r.y);
        if (g) g.served = r.served;
      }
    }
    this.money -= total;
    this.today.building += total;
    this.touch();
    return { ok: true, cost: total };
  }

  // ───────────────────────── Jobs ─────────────────────────

  private cancelJob(t: Truck) {
    const j = t.job;
    if (!j) return;
    if (j.kind === 'C2Y') {
      const c = this.cranes.find((c) => c.id === j.src);
      if (j.stage === 0 && c) c.reserved = Math.max(0, c.reserved - j.n);
      this.yardRes[j.dst] = Math.max(0, this.yardRes[j.dst] - j.n);
    } else {
      const g = this.gates.find((g) => g.id === j.dst);
      if (j.stage === 0) this.yardOut[j.src] = Math.max(0, this.yardOut[j.src] - j.n);
      if (g) g.reservedIn = Math.max(0, g.reservedIn - j.n);
    }
    t.job = null;
    t.load = 0;
    t.next = -1;
    t.prog = 0;
  }

  private jobValid(j: Job): boolean {
    if (this.kind[j.tgt[0]] !== T.Road || this.kind[j.tgt[1]] !== T.Road) return false;
    if (j.kind === 'C2Y') {
      if (j.stage === 0 && !this.cranes.some((c) => c.id === j.src)) return false;
      return this.kind[j.dst] === T.Yard;
    }
    if (j.stage === 0 && this.kind[j.src] !== T.Yard) return false;
    return this.gates.some((g) => g.id === j.dst);
  }

  private invalidateJobs() {
    for (const t of this.trucks) {
      if (t.job && !this.jobValid(t.job)) this.cancelJob(t);
    }
  }

  /** Nächstgelegenes freies Stapelplatz-Feld (Aufnahme) ab Straßenfeld `from`. */
  private findYardSlot(from: number): { tile: number; access: number; d: number; free: number } | null {
    let best: { tile: number; access: number; d: number; free: number } | null = null;
    for (const y of this.yardTiles) {
      const free = YARD_CAP_PER_TILE - this.stock[y] - this.yardRes[y];
      if (free <= 0) continue;
      for (const a of this.adjRoad(y)) {
        const d = this.distMap(a)[from];
        if (d >= 0 && (!best || d < best.d)) best = { tile: y, access: a, d, free };
      }
    }
    return best;
  }

  private findYardSource(from: number): { tile: number; access: number; d: number; avail: number } | null {
    let best: { tile: number; access: number; d: number; avail: number } | null = null;
    for (const y of this.yardTiles) {
      const avail = this.stock[y] - this.yardOut[y];
      if (avail <= 0) continue;
      for (const a of this.adjRoad(y)) {
        const d = this.distMap(a)[from];
        if (d >= 0 && (!best || d < best.d)) best = { tile: y, access: a, d, avail };
      }
    }
    return best;
  }

  private assignJob(t: Truck) {
    let bestScore = 0;
    let best: Job | null = null;
    const fill = this.yardCapacity ? this.yardStock / this.yardCapacity : 0;

    for (const c of this.cranes) {
      const avail = c.buffer - c.reserved;
      if (avail <= 0) continue;
      // Volle Fahrt abwarten, außer der Kran liefert nichts mehr nach
      const ship = this.shipAtBerth(c.x);
      const more = ship !== undefined && ship.containers > 0;
      if (avail < TRUCK_CAP && more) continue;
      const ci = this.idx(c.x, c.y);
      let access = -1;
      let dA = Infinity;
      for (const a of this.adjRoad(ci)) {
        const d = this.distMap(a)[t.tile];
        if (d >= 0 && d < dA) {
          dA = d;
          access = a;
        }
      }
      if (access < 0) continue;
      const slot = this.findYardSlot(access);
      if (!slot) continue;
      const weight = c.buffer >= CRANE_BUFFER ? 3 : 2;
      const score = weight / (1 + (dA + slot.d) / 15);
      if (score > bestScore) {
        bestScore = score;
        const n = Math.min(TRUCK_CAP, avail, slot.free);
        best = { kind: 'C2Y', stage: 0, src: c.id, dst: slot.tile, tgt: [access, slot.access], n };
      }
    }

    for (const g of this.gates) {
      const room = GATE_APRON_CAP - g.apron - g.reservedIn;
      if (room <= 0) continue;
      const gi = this.idx(g.x, g.y);
      for (const ga of this.adjRoad(gi)) {
        const src = this.findYardSource(t.tile);
        if (!src) continue;
        const dg = this.distMap(ga)[src.access];
        if (dg < 0) continue;
        const starving = g.apron + g.reservedIn === 0;
        const weight = (starving ? 2.4 : 1.2) * (fill > 0.8 ? 1.4 : 1);
        const score = weight / (1 + (src.d + dg) / 15);
        if (score > bestScore) {
          bestScore = score;
          const n = Math.min(TRUCK_CAP, src.avail, room);
          best = { kind: 'Y2G', stage: 0, src: src.tile, dst: g.id, tgt: [src.access, ga], n };
        }
      }
    }

    if (!best) return;
    // Reservieren
    if (best.kind === 'C2Y') {
      const c = this.cranes.find((c) => c.id === best!.src)!;
      c.reserved += best.n;
      this.yardRes[best.dst] += best.n;
    } else {
      this.yardOut[best.src] += best.n;
      this.gates.find((g) => g.id === best!.dst)!.reservedIn += best.n;
    }
    t.job = best;
  }

  private stepTruck(t: Truck, dt: number) {
    const j = t.job!;
    const tgt = j.tgt[j.stage];

    if (t.tile === tgt && t.next < 0) {
      // Ziel erreicht: Aktion ausführen
      t.wait = TRUCK_HANDLE_GM;
      if (j.kind === 'C2Y') {
        if (j.stage === 0) {
          const c = this.cranes.find((c) => c.id === j.src);
          if (!c || c.buffer < j.n) return this.cancelJob(t);
          c.buffer -= j.n;
          c.reserved = Math.max(0, c.reserved - j.n);
          t.load = j.n;
          j.stage = 1;
        } else {
          this.stock[j.dst] += j.n;
          this.yardRes[j.dst] = Math.max(0, this.yardRes[j.dst] - j.n);
          t.load = 0;
          t.job = null;
        }
      } else if (j.stage === 0) {
        if (this.stock[j.src] < j.n) return this.cancelJob(t);
        this.stock[j.src] -= j.n;
        this.yardOut[j.src] = Math.max(0, this.yardOut[j.src] - j.n);
        t.load = j.n;
        j.stage = 1;
      } else {
        const g = this.gates.find((g) => g.id === j.dst);
        if (!g) return this.cancelJob(t);
        g.apron += j.n;
        g.reservedIn = Math.max(0, g.reservedIn - j.n);
        t.load = 0;
        t.job = null;
      }
      return;
    }

    if (t.next < 0) {
      const d = this.distMap(tgt);
      const here = d[t.tile];
      if (here < 0) return this.cancelJob(t);
      const x = t.tile % GRID_W;
      const y = (t.tile / GRID_W) | 0;
      const cand = [
        x < GRID_W - 1 ? t.tile + 1 : -1,
        x > 0 ? t.tile - 1 : -1,
        y < GRID_H - 1 ? t.tile + GRID_W : -1,
        y > 0 ? t.tile - GRID_W : -1,
      ];
      for (const n of cand) {
        if (n >= 0 && d[n] === here - 1) {
          t.next = n;
          break;
        }
      }
      if (t.next < 0) return this.cancelJob(t);
      t.prog = 0;
    }

    const crowd = Math.max(1, this.truckCount[t.tile]);
    const factor = 1 / (1 + TRUCK_JAM * (crowd - 1));
    t.prog += TRUCK_SPEED * dt * factor;
    const nx = t.next % GRID_W;
    const ny = (t.next / GRID_W) | 0;
    const cx = t.tile % GRID_W;
    const cy = (t.tile / GRID_W) | 0;
    t.angle = Math.atan2(ny - cy, nx - cx);
    if (t.prog >= 1) {
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

    this.spawnShips(dt);
    this.updateShips(dt);
    this.updateCranes(dt);
    this.updateTrucks(dt);
    this.updateGates(dt);
    this.updateStats();
    this.updateMissions();
    this.rollDay();
  }

  private spawnShips(dt: number) {
    if (this.mission < 6 || !this.hasBerth() || this.cranes.length === 0) return;
    this.nextShipIn -= dt;
    if (this.nextShipIn > 0) return;
    if (this.ships.filter((s) => s.state === 'queued').length >= 3) {
      this.nextShipIn = 30;
      return;
    }
    const n = 100 + Math.floor(this.rnd() * 900);
    this.ships.push({
      id: this.nextId++,
      name: `${SHIP_PREFIX[Math.floor(this.rnd() * SHIP_PREFIX.length)]}${n}`,
      color: SHIP_COLORS[Math.floor(this.rnd() * SHIP_COLORS.length)],
      state: 'queued',
      x: -SHIP_LEN - 2,
      y: 3,
      px: -SHIP_LEN - 2,
      py: 3,
      berthX: -1,
      containers: SHIP_CONTAINERS,
      total: SHIP_CONTAINERS,
      queuedFor: 0,
      atBerth: 0,
      reason: '',
      blocked: false,
    });
    const base = Math.min(300, Math.max(120, 300 - this.rep * 1.5));
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
    // Wartende Schiffe bekommen einen Liegeplatz (FIFO)
    for (const s of this.ships) {
      if (s.state !== 'queued') continue;
      const b = this.pickBerth();
      if (b < 0) break;
      s.berthX = b;
      s.state = 'sailing';
    }
    let qi = 0;
    for (const s of [...this.ships]) {
      const step = SHIP_SPEED * dt;
      switch (s.state) {
        case 'queued': {
          this.moveToward(s, 1 + qi * 6, 2.5, step);
          qi++;
          s.queuedFor += dt;
          s.blocked = s.queuedFor > 60;
          s.reason = this.hasBerth()
            ? 'Wartet auf einen freien Liegeplatz. Baue einen weiteren Liegeplatz (4 Kai-Felder in einer Reihe).'
            : 'Kein Liegeplatz: Baue 4 Kai-Felder in einer Reihe.';
          if (s.queuedFor > SHIP_PATIENCE_GM) {
            this.rep = Math.max(0, this.rep - 3);
            this.emit(`${s.name} hat den Anlauf abgesagt (zu lange gewartet). Ruf −3`, 'bad', { tag: 'ship-cancel' });
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
          s.blocked = false;
          s.reason = 'Läuft in den Hafen ein.';
          break;
        case 'unloading':
          s.atBerth += dt;
          s.reason = this.unloadReason(s);
          s.blocked = s.reason !== UNLOADING;
          if (s.containers <= 0) this.finishShip(s);
          break;
        case 'leaving':
          if (this.moveToward(s, GRID_W + 6, s.y, step)) this.ships = this.ships.filter((x) => x !== s);
          s.reason = 'Läuft aus.';
          s.blocked = false;
          break;
      }
    }
  }

  private unloadReason(s: Ship): string {
    const cr = this.cranesAtBerth(s.berthX);
    if (cr.length === 0) return 'Kein Kran am Liegeplatz. Setze einen Kran auf eines der vier Kai-Felder.';
    if (cr.every((c) => c.state === 'blocked')) {
      if (this.trucks.length === 0) return 'Es gibt keinen Truck. Kaufe einen Truck.';
      const cap = this.yardCapacity;
      if (cap === 0) return 'Es gibt keinen Stapelplatz. Baue einen Stapelplatz an die Straße.';
      if (this.yardStock >= cap) return 'Stapelplatz voll. Baue mehr Stapelplatz oder mehr Gates, damit Container abfließen.';
      if (this.trucks.every((t) => t.job !== null || t.wait > 0)) return 'Alle Trucks sind unterwegs. Kaufe mehr Trucks oder kürze die Wege.';
      return 'Wartet auf einen Truck am Kran. Prüfe, ob eine Straße Kran und Stapelplatz verbindet.';
    }
    return UNLOADING;
  }

  private finishShip(s: Ship) {
    this.money += BERTH_FEE;
    this.today.berth += BERTH_FEE;
    this.shipsDone++;
    const onTime = s.atBerth <= SHIP_DWELL_TARGET_GM;
    if (onTime) {
      this.shipsOnTime++;
      this.rep = Math.min(REP_MAX, this.rep + 1);
      this.emit(`${s.name} abgefertigt: +${BERTH_FEE.toLocaleString('de-DE')} € Liegegebühr, Ruf +1`, 'good', {
        tag: 'ship-done',
        x: s.x + SHIP_LEN / 2,
        y: s.y,
        amount: BERTH_FEE,
      });
    } else {
      this.rep = Math.max(0, this.rep - 1);
      this.emit(`${s.name} hat zu lange gelegen (${Math.round(s.atBerth / 60)} h). Ruf −1`, 'bad', { tag: 'ship-late' });
    }
    s.state = 'leaving';
  }

  private updateCranes(dt: number) {
    for (const c of this.cranes) {
      const ship = this.shipAtBerth(c.x);
      if (ship && ship.containers > 0) {
        if (c.buffer < CRANE_BUFFER) {
          c.state = 'working';
          c.cd -= dt;
          if (c.cd <= 0) {
            c.buffer++;
            ship.containers--;
            c.cd += CRANE_MOVE_GM;
          }
        } else {
          c.state = 'blocked';
          c.cd = Math.max(c.cd, 0);
        }
      } else {
        c.state = 'idle';
        c.cd = CRANE_MOVE_GM;
      }
    }
  }

  private updateTrucks(dt: number) {
    this.truckCount.fill(0);
    for (const t of this.trucks) if (t.job) this.truckCount[t.tile]++;
    for (const t of this.trucks) {
      if (t.wait > 0) {
        t.wait -= dt;
        continue;
      }
      if (!t.job) {
        this.assignJob(t);
        if (!t.job) continue;
      }
      this.stepTruck(t, dt);
    }
  }

  private updateGates(dt: number) {
    for (const g of this.gates) {
      if (g.proc > 0) {
        g.proc -= dt;
        if (g.proc <= 0) {
          g.proc = 0;
          g.served++;
          this.containersDone++;
          this.money += FEE_PER_CONTAINER;
          this.today.fees += FEE_PER_CONTAINER;
          this.emit(undefined, 'good', { tag: 'container', x: g.x, y: g.y, amount: FEE_PER_CONTAINER });
        }
      }
      if (g.proc <= 0 && g.apron > 0) {
        g.apron--;
        g.proc = GATE_PROCESS_GM;
      }
    }
  }

  private updateStats() {
    const a = 0.03;
    const ema = (cur: number, x: number) => cur + (x - cur) * a;
    // Kran: Anteil arbeitender Kräne unter denen, die ein Schiff vor sich haben
    const withShip = this.cranes.filter((c) => c.state !== 'idle');
    const working = withShip.filter((c) => c.state === 'working').length;
    this.stats.crane = ema(this.stats.crane, withShip.length ? working / withShip.length : 0);
    const busyT = this.trucks.filter((t) => t.job !== null || t.wait > 0).length;
    this.stats.trucks = ema(this.stats.trucks, this.trucks.length ? busyT / this.trucks.length : 0);
    const cap = this.yardCapacity;
    this.stats.yard = cap ? this.yardStock / cap : 0;
    const busyG = this.gates.filter((g) => g.proc > 0).length;
    this.stats.gate = ema(this.stats.gate, this.gates.length ? busyG / this.gates.length : 0);
  }

  /** Auslastungsstufe mit dem größten Druck, oder null wenn nichts auffällt. */
  bottleneck(): 'crane' | 'trucks' | 'yard' | 'gate' | null {
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

  updateMissions(silent = false) {
    while (this.mission < MISSIONS.length && MISSIONS[this.mission].done(this)) {
      if (!silent) this.emit(`Mission geschafft: ${MISSIONS[this.mission].title}`, 'good', { tag: 'mission' });
      this.mission++;
    }
  }

  private rollDay() {
    const d = Math.floor(this.gm / MIN_PER_DAY);
    if (d === this.lastDay) return;
    this.lastDay = d;
    const cost =
      this.cranes.length * RUN_COST_PER_DAY.crane +
      this.trucks.length * RUN_COST_PER_DAY.truck +
      this.gates.length * RUN_COST_PER_DAY.gate +
      this.yardTiles.length * RUN_COST_PER_DAY.yardTile +
      this.countKind(T.Kai) * RUN_COST_PER_DAY.kaiTile;
    this.money -= cost;
    this.today.running += cost;
    this.history.push(this.today);
    if (this.history.length > 7) this.history.shift();
    this.today = emptyBook();
    this.emit(`Tagesabschluss: Betriebskosten −${cost.toLocaleString('de-DE')} €`, 'info', { tag: 'day' });
  }

  private countKind(k: T): number {
    let n = 0;
    for (let i = 0; i < this.kind.length; i++) if (this.kind[i] === k) n++;
    return n;
  }

  // ───────────────────────── Speichern ─────────────────────────

  serialize(): SaveData {
    return {
      v: 1,
      kind: Array.from(this.kind),
      stock: Array.from(this.stock),
      cranes: this.cranes.map((c) => ({ x: c.x, y: c.y })),
      gates: this.gates.map((g) => ({ x: g.x, y: g.y, served: g.served })),
      trucks: this.trucks.map((t) => ({ tile: t.tile })),
      money: this.money,
      rep: this.rep,
      gm: this.gm,
      mission: this.mission,
      shipsDone: this.shipsDone,
      shipsOnTime: this.shipsOnTime,
      containersDone: this.containersDone,
      seed: this.seed,
      nextShipIn: this.nextShipIn,
      today: this.today,
      history: this.history,
    };
  }

  static deserialize(d: SaveData): Sim {
    const s = new Sim(d.seed);
    s.kind.set(d.kind);
    s.stock.set(d.stock);
    for (const c of d.cranes) s.cranes.push({ id: s.nextId++, x: c.x, y: c.y, buffer: 0, reserved: 0, cd: CRANE_MOVE_GM, state: 'idle' });
    for (const g of d.gates) s.gates.push({ id: s.nextId++, x: g.x, y: g.y, apron: 0, reservedIn: 0, proc: 0, served: g.served });
    for (const t of d.trucks) {
      const x = t.tile % GRID_W;
      const y = (t.tile / GRID_W) | 0;
      s.trucks.push({ id: s.nextId++, tile: t.tile, next: -1, prog: 0, fx: x, fy: y, px: x, py: y, wait: 0, load: 0, job: null, angle: 0 });
    }
    s.money = d.money;
    s.rep = d.rep;
    s.gm = d.gm;
    s.lastDay = Math.floor(d.gm / MIN_PER_DAY);
    s.mission = d.mission;
    s.shipsDone = d.shipsDone;
    s.shipsOnTime = d.shipsOnTime;
    s.containersDone = d.containersDone;
    s.nextShipIn = d.nextShipIn;
    s.today = d.today;
    s.history = d.history;
    s.touch();
    return s;
  }
}
