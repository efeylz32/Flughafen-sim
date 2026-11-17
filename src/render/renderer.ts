import { Application, Container, Graphics, Rectangle, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import { CRANE_MODELS, YARD_USES, DIFFS, SHIP_PATIENCE_GM, TRUCK_PATIENCE_GM, ZONES, COAST_ROW, CRANE_EXP_BUFFER, GRID_H, GRID_W, MapId, MIN_PER_DAY, PLOT_W, RAIL_CAP, RAIL_TRAVEL_GM, dimsOf, T, TICK_GM, TILE, YARD_CAP_PER_TILE, RTG_CAP } from '../sim/data';
import type { Crane, Rail, Ship, Sim, Truck } from '../sim/sim';
import { N as QN, S as QS_, W as QW, qOf, qOfWater, qTile, sideOf, OUT, Q_MAX } from '../sim/quay';
/** Drehung der Kai-Grafik: Wasser liegt im Norden, Süden, Westen oder Osten */
const SIDE_ANGLE = [0, Math.PI, -Math.PI / 2, Math.PI / 2];

export interface View {
  overlay: boolean;
  tool: string;
  hover: { x: number; y: number; ok: boolean } | null;
  /** Die Vorschau ist festgesetzt und wartet auf den zweiten Klick */
  ghost: boolean;
  /** Größe der Vorschau, wenn sie vom Werkzeug abweicht (Liegeplatz) */
  size?: [number, number];
  /** Hauptmenü-Hintergrund: keine Warnzeichen, Staumarkierungen und Balken */
  calm?: boolean;
  /** Blaupause, die gerade eingefügt werden soll (für die Vorschau) */
  bp?: { w: number; h: number; items: { dx: number; dy: number; tool: string; rot?: boolean }[] } | null;
  selected: { kind: 'ship' | 'crane' | 'gate' | 'yard' | 'reefer' | 'hazmat' | 'emptyyard' | 'kai' | 'rail' | 'plant' | 'shop' | 'truck'; id: number } | null;
  /** Anteil zwischen letztem und nächstem Tick (0..1) für weiche Bewegung. */
  alpha: number;
  /** Laufzeit in Sekunden (Echtzeit) für Animationen. */
  time: number;
  /** Dauer des letzten Frames in Sekunden. */
  dt: number;
  /** Auswahlrahmen für die Sammelzuweisung (Felder) */
  rect: { x0: number; y0: number; x1: number; y1: number } | null;
}

const W = GRID_W * TILE;
const H = GRID_H * TILE;
const COAST = COAST_ROW * TILE;
/** Einfarbige Fläche weit außerhalb der Karte. */
const FAR = 120 * TILE;
/** Streifen mit Wald und Strand rund um die Karte. */
const DECOR = 36 * TILE;
const WATER_EXT = DECOR + 18 * TILE;

const C = {
  deep: 0x2a76b0,
  shallow: 0x5fb3de,
  surf: 0x9adbee,
  sand: 0xe8d9a9,
  sandDark: 0xd3c08b,
  grassA: 0x8dc86d,
  grassB: 0x82bd63,
  grassTuft: 0x6aa953,
  grassOut: 0x78b65e,
  grassOutDark: 0x69a853,
  kai: 0xd3d7da,
  kaiJoint: 0xb9bfc4,
  kaiWall: 0x75808b,
  kaiCurb: 0x98a1aa,
  yellow: 0xf2c230,
  bollard: 0x39424f,
  road: 0x4b525c,
  roadSpeck: 0x434952,
  roadEdge: 0xe4e7ea,
  roadDash: 0xf1cc52,
  yard: 0xbcc2c6,
  yardLine: 0xf6f8f9,
  steel: 0x5a6370,
  white: 0xf3f5f7,
  ink: 0x1d2a3a,
  good: 0x35b26a,
  warn: 0xf0b429,
  bad: 0xe5484d,
  accent: 0x2a6fdb,
};
/** Containerfarben. Die Textur ist hellgrau und wird damit eingefärbt. */
const BOX = [0xd2503f, 0x3b7fc8, 0xeba433, 0x35996c, 0x8a6bc4, 0xe6e1d3, 0x27a5ad];
const CAB = [0xf2b632, 0xe8542f, 0x2f7fd0, 0xf4f5f7];
/** Export-Container sind einheitlich dunkel, Kühlcontainer weiß. */
const EXPORT_BOX = 0x4a607c;
const REEFER_BOX = 0xf4f9fd;
const HAZ_BOX = 0xe8602c;
/** Import-Container mit Ziel Bahn: braun */
const RAIL_BOX = 0x8a5a33;
const EMPTY_BOX = 0x9aa8b6;
/** Ausgepackte Ware ist braun (Kisten), Fertigware gold. */
const WARE_BOX = 0xb98a52;
const PREM_BOX = 0xf4c430;
const FOOD_BOX = 0x5fbf6a;
/** Farbe der festen Truck-Aufgabe (Automatik hat keinen Punkt) */
export const ROLE_COLOR: Record<string, number> = { crane: 0xe2582c, out: 0x2f9e6b, export: 0x2f6db0, plant: 0x7a5cc7 };
const CARGO_TINT: Record<string, number> = { reef: REEFER_BOX, exp: EXPORT_BOX, ware: WARE_BOX, prem: PREM_BOX, food: FOOD_BOX };

function hash(x: number, y: number): number {
  let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1274126177, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const r = Math.round(ar + (((b >> 16) & 255) - ar) * t);
  const g = Math.round(ag + (((b >> 8) & 255) - ag) * t);
  const bl = Math.round(ab + ((b & 255) - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

const shade = (c: number, f: number) => mix(0x000000, c, f);
const tint = (c: number, f: number) => mix(c, 0xffffff, f);

function utilColor(u: number): number {
  if (u < 0.6) return C.good;
  if (u < 0.85) return C.warn;
  return C.bad;
}

interface ShipView {
  root: Container;
  /** Dreht sich mit dem Schiff, Name und Warnzeichen bleiben waagerecht */
  rotor: Container;
  wake: Graphics;
  body: Container;
  cargo: Sprite[];
  alert: Graphics;
  filled: number;
  len: number;
}
interface TruckView {
  root: Container;
  load: Sprite[];
  brake: Graphics;
  badge: Graphics;
  /** Seitlicher Versatz: fahrend in der rechten Spur, ohne Auftrag am Rand geparkt */
  lat: number;
  /** Ladung und Art, um Änderungen zu erkennen */
  key: string;
  agv: boolean;
  rot: number;
}
interface CraneView {
  root: Container;
  trolley: Container;
  hook: Sprite;
  lamp: Graphics;
  buffer: Sprite[];
  exp: Sprite[];
  key: string;
  big: boolean;
  model: string;
  pos: number;
}
interface TrainView {
  root: Container;
  cargo: Sprite[];
  n: number;
}
interface StoreView {
  sprites: Sprite[];
  key: number;
  /** yard, reefer, haz oder empty */
  type: string;
  cap: number;
  px: number;
  py: number;
}
interface Float {
  text: Text;
  x: number;
  y: number;
  age: number;
}
interface Pop {
  x: number;
  y: number;
  age: number;
  color: number;
}

export class Renderer {
  app!: Application;
  readonly world = new Container();
  private base = new Graphics();
  private swell!: TilingSprite;
  private waves!: TilingSprite;
  private decor = new Container();
  private terrain = new Graphics();
  private yardLayer = new Container();
  private shipLayer = new Container();
  private truckLayer = new Container();
  private craneLayer = new Container();
  private heat = new Graphics();
  private grid = new Graphics();
  private birdLayer = new Container();
  private night = new Graphics();
  private lights = new Container();
  private dynLights = new Container();
  private dynGlows: Sprite[] = [];
  private birds: { root: Container; wings: Graphics; cx: number; cy: number; r: number; speed: number; phase: number }[] = [];
  private dyn = new Graphics();
  private fxLayer = new Container();

  private boxV!: Texture;
  private boxH!: Texture;
  private glowTex!: Texture;
  private treeTex: Texture[] = [];
  private ships = new Map<number, ShipView>();
  private trucks = new Map<number, TruckView>();
  private cranes = new Map<number, CraneView>();
  private yard = new Map<number, StoreView>();
  private trains = new Map<number, TrainView>();
  private trainLayer = new Container();
  private stormTint = new Graphics();
  private fogTint = new Graphics();
  private rain!: TilingSprite;
  private fog!: TilingSprite;
  private stormA = 0;
  private fogA = 0;
  private floats: Float[] = [];
  private pops: Pop[] = [];
  private simRef: Sim | null = null;
  private version = -1;
  private heatTimer = 0;
  /** 0 = Tag, 1 = Nacht */
  private nightF = 0;
  private baseMap: MapId = 'coast';

  scale = 1;
  ox = 0;
  oy = 0;

  async init(host: HTMLElement) {
    this.app = new Application();
    await this.app.init({
      resizeTo: host,
      background: C.deep,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.canvas);
    this.app.canvas.style.touchAction = 'none';

    this.makeTextures();
    this.drawBase('coast');
    this.drawGrid();
    this.night.rect(-FAR, -FAR, W + 2 * FAR, H + 2 * FAR).fill(0xffffff);
    this.night.alpha = 0;
    this.makeBirds();
    this.world.addChild(
      this.base,
      this.swell,
      this.waves,
      this.decor,
      this.terrain,
      this.yardLayer,
      this.shipLayer,
      this.truckLayer,
      this.trainLayer,
      this.craneLayer,
      this.heat,
      this.grid,
      this.birdLayer,
      this.night,
      this.lights,
      this.dynLights,
      this.dyn,
      this.fxLayer,
    );
    // Wetter liegt über der Karte und füllt immer den ganzen Bildschirm
    this.stormTint.rect(0, 0, 8, 8).fill(0x1b2a3f);
    this.fogTint.rect(0, 0, 8, 8).fill(0xe9eff3);
    for (const o of [this.stormTint, this.rain, this.fogTint, this.fog]) o.visible = false;
    this.app.stage.addChild(this.world, this.stormTint, this.rain, this.fogTint, this.fog);
    this.fitCamera();
    this.app.renderer.on('resize', () => this.clampCamera());
  }

  // ───────────────────────── Kamera ─────────────────────────

  get viewW(): number {
    return this.app.screen.width;
  }
  get viewH(): number {
    return this.app.screen.height;
  }

  /** Kleinster Zoom, bei dem der Wald rund um die Karte den Bildschirm noch füllt. */
  private get minScale(): number {
    const d = DECOR - 2 * TILE;
    return Math.max(0.42, this.viewW / (W + 2 * d), this.viewH / (H + 2 * d));
  }

  /**
   * Startansicht: Der Hafenbereich (Schiffe, Kai, Straße, Stapelplatz) wird in den
   * Bereich eingepasst, den die Oberfläche frei lässt.
   */
  fitCamera(ins: { left: number; top: number; right: number; bottom: number } = { left: 0, top: 0, right: 0, bottom: 0 }) {
    const x0 = 4;
    const x1 = 28;
    const y0 = COAST_ROW - 3;
    const y1 = COAST_ROW + 8;
    const availW = Math.max(120, this.viewW - ins.left - ins.right);
    const availH = Math.max(120, this.viewH - ins.top - ins.bottom);
    const s = Math.min(availW / ((x1 - x0) * TILE), availH / ((y1 - y0) * TILE));
    this.scale = Math.min(1.5, Math.max(this.minScale, s));
    this.ox = ins.left + availW / 2 - ((x0 + x1) / 2) * TILE * this.scale;
    this.oy = ins.top + availH / 2 - ((y0 + y1) / 2) * TILE * this.scale;
    this.clampCamera();
  }

  private clampCamera() {
    const s = this.scale;
    const mw = W * s;
    const mh = H * s;
    const d = (DECOR - 2 * TILE) * s;
    // Höchstens so weit schieben, dass der Wald den Rand füllt und ein Teil der Karte sichtbar bleibt.
    const loX = Math.max(this.viewW - mw - d, this.viewW * 0.4 - mw);
    const hiX = Math.min(d, this.viewW * 0.6);
    const loY = Math.max(this.viewH - mh - d, this.viewH * 0.4 - mh);
    const hiY = this.viewH * 0.6;
    this.ox = loX > hiX ? (loX + hiX) / 2 : Math.min(hiX, Math.max(loX, this.ox));
    this.oy = loY > hiY ? (loY + hiY) / 2 : Math.min(hiY, Math.max(loY, this.oy));
    this.world.position.set(this.ox, this.oy);
    this.world.scale.set(s);
  }

  panBy(dx: number, dy: number) {
    this.ox += dx;
    this.oy += dy;
    this.clampCamera();
  }

  zoomAt(sx: number, sy: number, factor: number) {
    const ns = Math.min(3, Math.max(this.minScale, this.scale * factor));
    const k = ns / this.scale;
    this.ox = sx - (sx - this.ox) * k;
    this.oy = sy - (sy - this.oy) * k;
    this.scale = ns;
    this.clampCamera();
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.ox) / this.scale, y: (sy - this.oy) / this.scale };
  }
  screenToTile(sx: number, sy: number): { x: number; y: number } {
    const w = this.screenToWorld(sx, sy);
    return { x: Math.floor(w.x / TILE), y: Math.floor(w.y / TILE) };
  }
  tileToScreen(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE * this.scale + this.ox, y: ty * TILE * this.scale + this.oy };
  }

  // ───────────────────────── Effekte von außen ─────────────────────────

  /** Aufsteigender Text über einem Feld, z. B. „+200 €“. */
  addFloat(tx: number, ty: number, text: string, good = true) {
    if (this.floats.length > 14) return;
    const t = new Text({
      text,
      style: {
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: 13,
        fontWeight: '800',
        fill: 0xffffff,
        stroke: { color: good ? 0x14693c : 0x8c2420, width: 3.5, join: 'round' },
      },
    });
    t.resolution = 2;
    t.anchor.set(0.5, 1);
    const f: Float = { text: t, x: (tx + 0.5) * TILE, y: ty * TILE + 4, age: 0 };
    t.position.set(f.x, f.y);
    this.fxLayer.addChild(t);
    this.floats.push(f);
  }

  /** Kurzer Ring auf einem Feld nach Bau oder Abriss. */
  addPop(tx: number, ty: number, kind: 'build' | 'demolish' | 'undo') {
    if (this.pops.length > 60) return;
    this.pops.push({ x: tx * TILE, y: ty * TILE, age: 0, color: kind === 'build' ? 0xffffff : kind === 'undo' ? 0x9cc4ff : 0xffb3a8 });
  }

  // ───────────────────────── Texturen und statische Ebenen ─────────────────────────

  private makeTextures() {
    const make = (w: number, h: number, res: number, draw: (g: Graphics) => void): Texture => {
      const g = new Graphics();
      draw(g);
      const tex = this.app.renderer.generateTexture({ target: g, frame: new Rectangle(0, 0, w, h), resolution: res, antialias: true });
      g.destroy();
      return tex;
    };
    // Container stehend (8 × 12) und liegend (9 × 8), hellgrau zum Einfärben, Schatten eingebacken
    this.boxV = make(10, 14, 4, (g) => {
      g.roundRect(1.5, 1.9, 8, 12, 0.9).fill({ color: 0x000000, alpha: 0.3 });
      g.roundRect(0, 0, 8, 12, 0.9).fill(0x767676);
      g.roundRect(0.6, 0.6, 6.8, 10.8, 0.5).fill(0xd9d9d9);
      g.rect(0.6, 3.8, 6.8, 0.7).fill(0xb9b9b9);
      g.rect(0.6, 7.6, 6.8, 0.7).fill(0xb9b9b9);
      g.rect(1.2, 1.1, 5.6, 1.5).fill(0xffffff);
    });
    this.boxH = make(11, 10, 4, (g) => {
      g.roundRect(1.5, 1.8, 9, 8, 0.9).fill({ color: 0x000000, alpha: 0.3 });
      g.roundRect(0, 0, 9, 8, 0.9).fill(0x767676);
      g.roundRect(0.6, 0.6, 7.8, 6.8, 0.5).fill(0xd9d9d9);
      g.rect(3, 0.6, 0.7, 6.8).fill(0xb9b9b9);
      g.rect(5.6, 0.6, 0.7, 6.8).fill(0xb9b9b9);
      g.rect(1.1, 1.1, 6.8, 1.4).fill(0xffffff);
    });

    // Weiches Leuchten für Lampen bei Nacht
    this.glowTex = make(64, 64, 1, (g) => {
      for (let i = 0; i < 22; i++) g.circle(32, 32, 32 * (1 - i / 22)).fill({ color: 0xffffff, alpha: 0.045 });
      g.circle(32, 32, 5).fill({ color: 0xffffff, alpha: 0.35 });
    });
    // Bäume in vier Farbvarianten
    for (let v = 0; v < 4; v++) {
      this.treeTex.push(
        make(48, 48, 2, (g) => {
          const r = 16;
          const x = 21;
          const y = 21;
          g.ellipse(x + r * 0.38, y + r * 0.48, r * 1.02, r * 0.86).fill({ color: 0x173f24, alpha: 0.3 });
          g.circle(x, y, r).fill(v & 1 ? 0x347f49 : 0x2d7341);
          g.circle(x - r * 0.2, y - r * 0.24, r * 0.72).fill(v & 2 ? 0x45995a : 0x3f8f52);
          g.circle(x - r * 0.36, y - r * 0.42, r * 0.34).fill({ color: 0x86cf8f, alpha: 0.55 });
        }),
      );
    }

    const rainTex = make(128, 128, 1, (g) => {
      for (let i = 0; i < 26; i++) {
        const h = hash(i, 313);
        const x = 10 + (h % 108);
        const y = 4 + ((h >>> 8) % 104);
        g.moveTo(x, y).lineTo(x - 5, y + 16).stroke({ width: 1.2, color: 0xffffff, alpha: 0.4, cap: 'round' });
      }
    });
    this.rain = new TilingSprite({ texture: rainTex, width: 64, height: 64 });
    const fogTex = make(512, 512, 1, (g) => {
      for (let i = 0; i < 12; i++) {
        const h = hash(i, 707);
        const x = 130 + (h % 250);
        const y = 70 + ((h >>> 9) % 370);
        for (let k = 0; k < 6; k++) g.ellipse(x, y, (120 - k * 16) * (1 + ((h >>> 20) % 5) / 10), 46 - k * 6).fill({ color: 0xffffff, alpha: 0.07 });
      }
    });
    this.fog = new TilingSprite({ texture: fogTex, width: 64, height: 64 });

    const wavesTex = make(256, 256, 2, (g) => {
      for (let i = 0; i < 18; i++) {
        const h = hash(i, 77);
        const x = 10 + (h % 208);
        const y = 12 + ((h >>> 8) % 232);
        const len = 7 + ((h >>> 16) % 8);
        g.moveTo(x, y)
          .quadraticCurveTo(x + len / 2, y - 3, x + len, y)
          .quadraticCurveTo(x + len * 1.5, y + 3, x + len * 2, y)
          .stroke({ width: 1.6, color: 0xffffff, alpha: 0.34, cap: 'round' });
      }
    });
    const swellTex = make(512, 512, 1, (g) => {
      for (let i = 0; i < 9; i++) {
        const h = hash(i, 911);
        const x = 120 + (h % 270);
        const y = 50 + ((h >>> 9) % 410);
        const rx = 50 + ((h >>> 18) % 55);
        const ry = 10 + ((h >>> 24) % 14);
        g.ellipse(x, y, rx, ry).fill(i % 2 ? { color: 0x1f5f95, alpha: 0.1 } : { color: 0xa6dcf2, alpha: 0.1 });
      }
    });
    const ww = W + 2 * WATER_EXT;
    const wh = WATER_EXT + COAST - 4;
    this.swell = new TilingSprite({ texture: swellTex, width: ww, height: wh });
    this.swell.position.set(-WATER_EXT, -WATER_EXT);
    this.waves = new TilingSprite({ texture: wavesTex, width: ww, height: wh });
    this.waves.position.set(-WATER_EXT, -WATER_EXT);
  }

  /** Sandstreifen mit Brandung zwischen x0 und x1 an der Küstenlinie. */
  private shore(g: Graphics, x0: number, x1: number) {
    g.rect(x0, COAST - 3, x1 - x0, 13).fill(C.sand);
    for (let x = x0; x < x1; x += 16) {
      const h = hash(x, 5);
      g.circle(x + 4 + (h % 9), COAST + 10, 3 + (h % 3)).fill(C.sand);
      g.roundRect(x + (h % 5), COAST - 8 - (h % 3), 9 + ((h >>> 4) % 7), 3, 1.5).fill({ color: 0xffffff, alpha: 0.7 });
      if (h % 3 === 0) g.circle(x + 3 + ((h >>> 7) % 10), COAST + 2 + ((h >>> 11) % 5), 1.3).fill(C.sandDark);
      if (h % 7 === 0) g.circle(x + 8, COAST + 3, 2.2).fill(0xa3a9ae);
    }
  }

  private drawBase(map: MapId) {
    const g = this.base;
    g.clear();
    for (const c of this.decor.removeChildren()) c.destroy();
    this.baseMap = map;
    if (map === 'island') {
      // Ringsum Meer, zur Insel hin heller
      g.rect(-FAR, -FAR, W + 2 * FAR, H + 2 * FAR).fill(C.deep);
      for (let i = 8; i >= 1; i--) {
        const p = i * TILE;
        g.roundRect(-p, COAST - p, W + 2 * p, H - COAST + 2 * p, 40 + i * 12).fill(mix(C.deep, C.shallow, Math.pow((9 - i) / 9, 1.6)));
      }
      this.waves.height = this.swell.height = WATER_EXT * 2 + H;
      return;
    }
    this.waves.height = this.swell.height = WATER_EXT + COAST - 4;
    // Meer: weit draußen dunkel, zur Küste hin heller
    g.rect(-FAR, -FAR, W + 2 * FAR, FAR + COAST).fill(C.deep);
    const bands = 11;
    for (let i = 0; i < bands; i++) {
      const y = COAST - (bands - i) * TILE;
      g.rect(-FAR, y, W + 2 * FAR, TILE + 0.5).fill(mix(C.deep, C.shallow, Math.pow((i + 1) / bands, 1.6)));
    }
    g.rect(-FAR, COAST - 12, W + 2 * FAR, 12).fill({ color: C.surf, alpha: 0.6 });

    // Land außerhalb der Karte
    g.rect(-FAR, COAST, W + 2 * FAR, H - COAST + FAR).fill(C.grassOut);
    for (let y = COAST + 40; y < H + DECOR; y += 150) {
      for (let x = -DECOR; x < W + DECOR; x += 150) {
        const h = hash(x, y);
        if (h % 3 === 0) continue;
        g.ellipse(x + (h % 90), y + ((h >>> 8) % 90), 60 + ((h >>> 16) % 50), 34 + ((h >>> 22) % 26)).fill({
          color: h & 1 ? C.grassOutDark : 0x86c26a,
          alpha: 0.28,
        });
      }
    }
    this.shore(g, -DECOR - 400, 0);
    this.shore(g, W, W + DECOR + 400);

    // Wald
    const step = 50;
    for (let cy = COAST + 26; cy < H + DECOR; cy += step) {
      for (let cx = -DECOR; cx < W + DECOR; cx += step) {
        const h = hash(cx, cy);
        const tx = cx + 6 + (h % 38);
        const ty = cy + 6 + ((h >>> 6) % 38);
        if (tx > -24 && tx < W + 24 && ty < H + 24) continue;
        const patch = hash(Math.floor(cx / (step * 4)), Math.floor(cy / (step * 4))) % 4;
        const p = patch === 0 ? 10 : 70;
        if ((h >>> 12) % 100 >= p) continue;
        const sp = new Sprite(this.treeTex[(h >>> 3) & 3]);
        sp.anchor.set(21 / 48);
        sp.position.set(tx, ty);
        sp.scale.set((11 + ((h >>> 20) % 9)) / 16);
        this.decor.addChild(sp);
      }
    }
  }

  private drawGrid() {
    const g = this.grid;
    for (let x = 0; x <= GRID_W; x++) g.rect(x * TILE - 0.5, COAST, 1, H - COAST).fill({ color: 0xffffff, alpha: 0.16 });
    for (let y = COAST_ROW; y <= GRID_H; y++) g.rect(0, y * TILE - 0.5, W, 1).fill({ color: 0xffffff, alpha: 0.16 });
    g.visible = false;
  }

  private drawTerrain(sim: Sim) {
    const g = this.terrain;
    g.clear();
    const kindAt = (x: number, y: number) => (x >= 0 && y >= 0 && x < GRID_W && y < GRID_H ? sim.kind[y * GRID_W + x] : -1);

    // Wiese des Baugebiets: eine Fläche mit weichen Flecken statt Schachbrett
    g.rect(0, COAST, W, H - COAST).fill(C.grassA);
    for (let y = COAST + 50; y < H - 40; y += 120) {
      for (let x = 60; x < W - 60; x += 130) {
        const h = hash(x, y + 1);
        g.ellipse(x + (h % 50), y + ((h >>> 8) % 40), 46 + ((h >>> 14) % 30), 24 + ((h >>> 20) % 14)).fill({
          color: h & 1 ? C.grassB : 0x97cf78,
          alpha: 0.3,
        });
      }
    }

    for (let y = COAST_ROW; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const k = sim.kind[y * GRID_W + x];
        const px = x * TILE;
        const py = y * TILE;
        const h = hash(x, y);
        const same = (dx: number, dy: number) => kindAt(x + dx, y + dy) === k;

        switch (k) {
          case T.Land: {
            if (h % 3 === 0) {
              const bx = px + 5 + (h % 20);
              const by = py + 8 + ((h >>> 5) % 18);
              g.moveTo(bx, by).lineTo(bx - 1.5, by - 4).stroke({ width: 1.2, color: C.grassTuft, alpha: 0.8 });
              g.moveTo(bx + 2, by).lineTo(bx + 2.5, by - 5).stroke({ width: 1.2, color: C.grassTuft, alpha: 0.8 });
              g.moveTo(bx + 4, by).lineTo(bx + 6, by - 3.5).stroke({ width: 1.2, color: C.grassTuft, alpha: 0.8 });
            }
            if (h % 17 === 0) {
              const fx = px + 6 + ((h >>> 9) % 20);
              const fy = py + 6 + ((h >>> 14) % 20);
              g.circle(fx, fy, 1.4).fill(h & 4 ? 0xfff3b0 : 0xffffff);
              g.circle(fx + 4, fy + 2, 1.2).fill(0xffffff);
            }
            if (y === COAST_ROW) this.shore(g, px, px + TILE);
            break;
          }
          case T.Kai: {
            // Kaimauer ragt ein Stück ins Wasser. Gezeichnet für Wasser im Norden, dann zur Küste gedreht.
            const q = qOf(x, y);
            const side = q < 0 ? QN : sideOf(q);
            const ang = SIDE_ANGLE[side];
            const ax = Math.round(Math.cos(ang));
            const ay = Math.round(Math.sin(ang));
            g.save();
            const ca = Math.round(Math.cos(ang));
            const sa = Math.round(Math.sin(ang));
            g.setTransform(ca, sa, -sa, ca, px + TILE / 2, py + TILE / 2);
            const lx = -TILE / 2;
            const ly = -TILE / 2;
            g.rect(lx, ly - 6, TILE, 7).fill(C.kaiWall);
            g.rect(lx, ly - 6, TILE, 1.5).fill(shade(C.kaiWall, 0.75));
            g.rect(lx, ly, TILE, TILE).fill(C.kai);
            g.rect(lx, ly, TILE, 2.5).fill(C.kaiCurb);
            g.rect(lx, ly + 8, TILE, 2).fill(C.yellow);
            g.rect(lx + TILE - 0.6, ly + 10, 1.2, TILE - 10).fill(C.kaiJoint);
            g.rect(lx, ly + TILE - 1, TILE, 1).fill(C.kaiJoint);
            // Kranschienen
            g.rect(lx, ly + 13, TILE, 1.4).fill(0x8b939c);
            g.rect(lx, ly + 20, TILE, 1.4).fill(0x8b939c);
            // Poller und Fender
            g.circle(lx + 8, ly + 4.6, 2.5).fill(C.bollard);
            g.circle(lx + 24, ly + 4.6, 2.5).fill(C.bollard);
            g.circle(lx + 7.4, ly + 4, 1).fill({ color: 0xffffff, alpha: 0.35 });
            g.circle(lx + 23.4, ly + 4, 1).fill({ color: 0xffffff, alpha: 0.35 });
            g.roundRect(lx + 13, ly - 8, 6, 6, 2.5).fill(0x20252c);
            if (!same(-ax, -ay)) g.rect(lx, ly - 6, 2, TILE + 6).fill(C.kaiWall);
            if (!same(ax, ay)) g.rect(lx + TILE - 2, ly - 6, 2, TILE + 6).fill(C.kaiWall);
            // Gesperrter Liegeplatz: rot-weiße Absperrung an der Kante
            if (q >= 0 && sim.closedQ[q]) for (let k = 0; k < 4; k++) g.rect(lx + k * 8, ly - 3, 8, 3).fill(k % 2 ? 0xffffff : 0xd9473f);
            g.restore();
            g.resetTransform();
            break;
          }
          case T.Road: {
            g.rect(px, py, TILE, TILE).fill(C.road);
            for (let i = 0; i < 3; i++) {
              const hh = hash(x * 7 + i, y * 13);
              g.rect(px + 2 + (hh % 27), py + 2 + ((hh >>> 6) % 27), 2, 1.2).fill(C.roadSpeck);
            }
            const n = same(0, -1);
            const s = same(0, 1);
            const w = same(-1, 0);
            const e = same(1, 0);
            const cnt = +n + +s + +w + +e;
            const ow = sim.oneway[y * GRID_W + x];
            const cx = px + TILE / 2;
            const cy = py + TILE / 2;
            const edge = { color: C.roadEdge, alpha: 0.85 };
            if (!n) g.rect(px, py + 1.5, TILE, 1.3).fill(edge);
            if (!s) g.rect(px, py + TILE - 2.8, TILE, 1.3).fill(edge);
            if (!w) g.rect(px + 1.5, py, 1.3, TILE).fill(edge);
            if (!e) g.rect(px + TILE - 2.8, py, 1.3, TILE).fill(edge);
            if (cnt >= 3) {
              // Kreuzung: Haltelinie an jeder Zufahrt, jeweils auf der rechten Spur
              const stop = { color: 0xffffff, alpha: 0.9 };
              if (w) g.rect(px + 1, cy + 1.5, 2.2, 13).fill(stop);
              if (e) g.rect(px + TILE - 3.2, py + 1.5, 2.2, 13).fill(stop);
              if (n) g.rect(px + 1.5, py + 1, 13, 2.2).fill(stop);
              if (s) g.rect(cx + 1.5, py + TILE - 3.2, 13, 2.2).fill(stop);
            } else if ((w || e) && !(n || s)) {
              g.rect(px + 4, cy - 1, 9, 2).fill(C.roadDash);
              g.rect(px + 20, cy - 1, 9, 2).fill(C.roadDash);
              // Sackgasse: Wendeplatz andeuten
              if (cnt === 1) g.circle(w ? px + TILE - 9 : px + 9, cy, 4).stroke({ width: 1.2, color: C.roadEdge, alpha: 0.6 });
            } else if ((n || s) && !(w || e)) {
              g.rect(cx - 1, py + 4, 2, 9).fill(C.roadDash);
              g.rect(cx - 1, py + 20, 2, 9).fill(C.roadDash);
              if (cnt === 1) g.circle(cx, n ? py + TILE - 9 : py + 9, 4).stroke({ width: 1.2, color: C.roadEdge, alpha: 0.6 });
            } else if (cnt === 2 && ow < 0) {
              // Kurve: Mittellinie als Bogen, Außenecke abgerundet
              const ax = w ? px : px + TILE;
              const ay = n ? py : py + TILE;
              const ox = w ? px + TILE : px;
              const oy = n ? py + TILE : py;
              const dx = w ? -1 : 1;
              const dy = n ? -1 : 1;
              g.moveTo(cx, ay).quadraticCurveTo(cx, cy, ax, cy).stroke({ width: 2, color: C.roadDash });
              g.moveTo(ox, oy + dy * 11)
                .quadraticCurveTo(ox, oy, ox + dx * 11, oy)
                .lineTo(ox, oy)
                .closePath()
                .fill(C.grassA);
              g.moveTo(ox, oy + dy * 12.5).quadraticCurveTo(ox + dx * 1.5, oy + dy * 1.5, ox + dx * 12.5, oy).stroke({ width: 1.3, color: C.roadEdge, alpha: 0.85 });
            }
            // Tunnel: dunkle Röhre mit Portalen, Brücke: Geländer und Schatten aufs Wasser
            const under = sim.roadUnder[y * GRID_W + x];
            if (under === 1) {
              g.rect(px, py, TILE, TILE).fill({ color: 0x1d2228, alpha: 0.45 });
              const tun = (dx: number, dy: number) => sim.kind[(y + dy) * GRID_W + x + dx] === T.Road && sim.roadUnder[(y + dy) * GRID_W + x + dx] === 1;
              const portal = { color: 0x8d949b };
              if (w && !tun(-1, 0)) g.rect(px, py + 2, 4, TILE - 4).fill(portal);
              if (e && !tun(1, 0)) g.rect(px + TILE - 4, py + 2, 4, TILE - 4).fill(portal);
              if (n && !tun(0, -1)) g.rect(px + 2, py, TILE - 4, 4).fill(portal);
              if (s && !tun(0, 1)) g.rect(px + 2, py + TILE - 4, TILE - 4, 4).fill(portal);
            } else if (under === 2) {
              const rail = { color: 0xe9edf1 };
              if ((w || e) && !(n || s)) {
                g.rect(px, py - 1, TILE, 3).fill(rail);
                g.rect(px, py + TILE - 2, TILE, 3).fill(rail);
              } else {
                g.rect(px - 1, py, 3, TILE).fill(rail);
                g.rect(px + TILE - 2, py, 3, TILE).fill(rail);
              }
            }
            // Bahnübergang: Schienen über die Straße, weiß-rote Markierung
            if (sim.railX[y * GRID_W + x]) {
              g.rect(px, py + 19.6, TILE, 1.5).fill(0x8f979f);
              g.rect(px, py + 25.4, TILE, 1.5).fill(0x8f979f);
              for (let k = 0; k < 4; k++) g.rect(px + 2 + k * 8, py + 14, 4, 2).fill(k % 2 ? 0xd9473f : 0xffffff);
            }
            // Ausbaustufen: Doppelspur mit gelber Doppellinie, Autobahn dunkel mit weißen Randlinien
            const tier = sim.roadTier[y * GRID_W + x];
            if (tier === 1) {
              g.rect(px, py, TILE, TILE).fill({ color: 0x7d8895, alpha: 0.2 });
              if ((w || e) && !(n || s)) {
                g.rect(px, cy - 3, TILE, 1.4).fill(0xf2c230);
                g.rect(px, cy + 1.6, TILE, 1.4).fill(0xf2c230);
              } else if ((n || s) && !(w || e)) {
                g.rect(cx - 3, py, 1.4, TILE).fill(0xf2c230);
                g.rect(cx + 1.6, py, 1.4, TILE).fill(0xf2c230);
              }
            } else if (tier === 2) {
              g.rect(px, py, TILE, TILE).fill({ color: 0x0f2540, alpha: 0.38 });
              const lw = { color: 0xffffff, alpha: 0.85 };
              if (!(n && s) || (w || e)) {
                if (w || e) {
                  g.rect(px, py + 2.5, TILE, 1.6).fill(lw);
                  g.rect(px, py + TILE - 4.1, TILE, 1.6).fill(lw);
                }
              }
              if (n || s) {
                g.rect(px + 2.5, py, 1.6, TILE).fill(lw);
                g.rect(px + TILE - 4.1, py, 1.6, TILE).fill(lw);
              }
            }
            break;
          }
          case T.Yard: {
            g.rect(px, py, TILE, TILE).fill(C.yard);
            const line = { color: C.yardLine, alpha: 0.55 };
            g.rect(px + 11, py + 2, 0.8, TILE - 4).fill(line);
            g.rect(px + 20.5, py + 2, 0.8, TILE - 4).fill(line);
            g.rect(px + 2, py + 15.6, TILE - 4, 0.8).fill(line);
            if (!same(0, -1)) g.rect(px, py, TILE, 2).fill(C.yellow);
            if (!same(0, 1)) g.rect(px, py + TILE - 2, TILE, 2).fill(C.yellow);
            if (!same(-1, 0)) g.rect(px, py, 2, TILE).fill(C.yellow);
            if (!same(1, 0)) g.rect(px + TILE - 2, py, 2, TILE).fill(C.yellow);
            break;
          }
          case T.Plant:
          case T.Shop:
            g.rect(px, py, TILE, TILE).fill(0xc9c4b8);
            break;
          case T.Water: {
            // Wasser innerhalb der Karte (Insel)
            g.rect(px, py, TILE, TILE).fill(C.shallow);
            if (h % 4 === 0) g.moveTo(px + 6, py + 14).lineTo(px + 17, py + 14).stroke({ width: 1.5, color: 0xffffff, alpha: 0.25 });
            const sandy = { color: C.sand };
            if (kindAt(x, y - 1) > T.Water) g.rect(px, py, TILE, 4).fill(sandy);
            if (kindAt(x, y + 1) > T.Water) g.rect(px, py + TILE - 4, TILE, 4).fill(sandy);
            if (kindAt(x - 1, y) > T.Water) g.rect(px, py, 4, TILE).fill(sandy);
            if (kindAt(x + 1, y) > T.Water) g.rect(px + TILE - 4, py, 4, TILE).fill(sandy);
            break;
          }
          case T.Rock: {
            const r1 = 7 + (h % 4);
            g.ellipse(px + 13 + 2, py + 18 + 3, r1 + 2, r1 * 0.7).fill({ color: 0x000000, alpha: 0.18 });
            g.circle(px + 13, py + 17, r1).fill(0x8d949b);
            g.circle(px + 11, py + 14, r1 * 0.55).fill(0xb3b9be);
            g.circle(px + 23, py + 23, 5.5).fill(0x7c838a);
            g.circle(px + 22, py + 21.5, 2.8).fill(0xa2a9ae);
            if (h & 1) g.circle(px + 24, py + 9, 3.6).fill(0x949ba1);
            break;
          }
          case T.Reefer: {
            g.rect(px, py, TILE, TILE).fill(0xdde8ef);
            const line = { color: 0x3b9bd6, alpha: 0.45 };
            g.rect(px + 11, py + 2, 0.8, TILE - 4).fill(line);
            g.rect(px + 20.5, py + 2, 0.8, TILE - 4).fill(line);
            g.rect(px + 2, py + 15.6, TILE - 4, 0.8).fill(line);
            // Stromanschlüsse zwischen den Reihen
            for (let i = 0; i < 3; i++) g.roundRect(px + 4.6 + i * 9.4, py + 14.4, 3.2, 3.2, 0.8).fill(0x2f7fd0);
            if (!same(0, -1)) g.rect(px, py, TILE, 2).fill(0x3b9bd6);
            if (!same(0, 1)) g.rect(px, py + TILE - 2, TILE, 2).fill(0x3b9bd6);
            if (!same(-1, 0)) g.rect(px, py, 2, TILE).fill(0x3b9bd6);
            if (!same(1, 0)) g.rect(px + TILE - 2, py, 2, TILE).fill(0x3b9bd6);
            break;
          }
          case T.Hill: {
            // Hügel: höhere Ebene mit Schattenkante und Höhenlinien
            g.rect(px, py, TILE, TILE).fill(0x7fb35f);
            const up = kindAt(x, y - 1) === T.Hill;
            const dn = kindAt(x, y + 1) === T.Hill;
            const lf = kindAt(x - 1, y) === T.Hill;
            const rt = kindAt(x + 1, y) === T.Hill;
            if (!dn) g.rect(px, py + TILE - 6, TILE, 6).fill({ color: 0x3f6e33, alpha: 0.55 });
            if (!rt) g.rect(px + TILE - 4, py, 4, TILE).fill({ color: 0x3f6e33, alpha: 0.35 });
            if (!up) g.rect(px, py, TILE, 3).fill({ color: 0xc8e6a8, alpha: 0.7 });
            if (!lf) g.rect(px, py, 3, TILE).fill({ color: 0xc8e6a8, alpha: 0.5 });
            g.moveTo(px + 4, py + 12).quadraticCurveTo(px + 16, py + 6 + (h % 5), px + 28, py + 12).stroke({ width: 1, color: 0x5f8f48, alpha: 0.6 });
            g.moveTo(px + 6, py + 21).quadraticCurveTo(px + 16, py + 16 + (h % 4), px + 26, py + 21).stroke({ width: 1, color: 0x5f8f48, alpha: 0.5 });
            if (h % 3 === 0) g.circle(px + 9 + (h % 13), py + 8 + ((h >>> 4) % 14), 3.2).fill(0x5b9447);
            break;
          }
          case T.Parking: {
            // Stellplatz: Asphalt, vier Buchten, P-Schild
            g.rect(px, py, TILE, TILE).fill(0x6b737c);
            for (let k = 0; k <= 4; k++) g.rect(px + 1.5 + k * 7.3, py + 9, 1.2, 21).fill({ color: 0xffffff, alpha: 0.85 });
            g.roundRect(px + 2, py + 1.5, 9, 7, 1.5).fill(0x2f6db0);
            g.rect(px + 5, py + 2.8, 1.4, 4.6).fill(0xffffff);
            g.rect(px + 5, py + 2.8, 3, 1.3).fill(0xffffff);
            g.rect(px + 5, py + 4.8, 3, 1.3).fill(0xffffff);
            g.rect(px + 7.6, py + 2.8, 1.3, 3.3).fill(0xffffff);
            break;
          }
          case T.Track: {
            // Gleis: Schotter, Schwellen, zwei Schienen
            g.rect(px, py, TILE, TILE).fill(0xcbc6ba);
            g.rect(px, py + 15, TILE, 16).fill(0xb7ad97);
            for (let sx = px + 2; sx < px + TILE; sx += 6) g.rect(sx, py + 17.5, 2.6, 11).fill(0x6e5d4b);
            g.rect(px, py + 19.6, TILE, 1.5).fill(0x8f979f);
            g.rect(px, py + 25.4, TILE, 1.5).fill(0x8f979f);
            break;
          }
          case T.Solar: {
            // Solarfläche: blaue Module mit Rahmen
            g.rect(px, py, TILE, TILE).fill(0xd6dbe0);
            for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
              g.roundRect(px + 2.5 + c * 14, py + 2.5 + r * 14, 13, 13, 1.5).fill(0x1f4f8a);
              g.rect(px + 2.5 + c * 14, py + 2.5 + r * 14 + 6, 13, 0.8).fill({ color: 0x9cc4ff, alpha: 0.6 });
              g.rect(px + 2.5 + c * 14 + 6, py + 2.5 + r * 14, 0.8, 13).fill({ color: 0x9cc4ff, alpha: 0.6 });
              g.poly([px + 3 + c * 14, py + 3 + r * 14, px + 9 + c * 14, py + 3 + r * 14, px + 3 + c * 14, py + 9 + r * 14]).fill({ color: 0xffffff, alpha: 0.18 });
            }
            break;
          }
          case T.Battery: {
            // Batteriespeicher: Container mit Lüftern und grüner Ladeanzeige
            g.roundRect(px + 3, py + 6, TILE - 4, TILE - 9, 2).fill({ color: 0x000000, alpha: 0.2 });
            g.roundRect(px + 2, py + 4, TILE - 4, TILE - 9, 2).fill(0xe9edf1);
            g.rect(px + 2, py + 4, TILE - 4, 3).fill(0x2f9e6b);
            for (let k = 0; k < 3; k++) g.circle(px + 8 + k * 8, py + 14, 2.6).fill(0x6d7a87);
            g.roundRect(px + 6, py + 20, TILE - 12, 3.5, 1.5).fill(0x2a3442);
            g.roundRect(px + 6, py + 20, (TILE - 12) * (sim.batteryCap ? sim.batteryCharge / sim.batteryCap : 0), 3.5, 1.5).fill(0x3fe08a);
            break;
          }
          case T.Hazmat: {
            // Gefahrgut: Warnstreifen, rote Umrandung
            g.rect(px, py, TILE, TILE).fill(0xe9d8b4);
            for (let sx = -TILE; sx < TILE; sx += 10) g.poly([px + sx, py + TILE, px + sx + 5, py + TILE, px + sx + 5 + TILE, py, px + sx + TILE, py]).fill({ color: 0xf2c230, alpha: 0.55 });
            g.rect(px + 2, py + 2, TILE - 4, TILE - 4).stroke({ width: 2, color: 0xd9473f });
            g.poly([px + TILE - 9, py + 3, px + TILE - 3, py + 3, px + TILE - 6, py + 9]).fill(0xd9473f);
            break;
          }
          case T.Empty: {
            // Leerlager: graue Fläche mit blauer Markierung
            g.rect(px, py, TILE, TILE).fill(0xcfd6dc);
            g.rect(px + 2, py + 2, TILE - 4, TILE - 4).stroke({ width: 1.6, color: 0x6d8aa8 });
            g.rect(px + 3, py + TILE - 4, TILE - 6, 1.4).fill({ color: 0x6d8aa8, alpha: 0.7 });
            break;
          }
          case T.Rail: {
            // Schotterbett und Gleis führen nach rechts aus der Karte
            const far = DECOR + 500;
            g.rect(W - 4, py + 15, far, 16).fill(0xb7ad97);
            g.rect(px, py, TILE, TILE).fill(0xcbc6ba);
            g.rect(px, py + 15, TILE, 16).fill(0xb7ad97);
            for (let x = px + 5; x < W + far; x += 6) g.rect(x, py + 17.5, 2.6, 11).fill(0x6e5d4b);
            g.rect(px + 4, py + 19.6, far + TILE, 1.5).fill(0x8f979f);
            g.rect(px + 4, py + 25.4, far + TILE, 1.5).fill(0x8f979f);
            g.roundRect(px + 1, py + 17, 4, 12, 1).fill(0xd9473f);
            // Bahnsteigdach
            g.roundRect(px + 3.5, py + 4.5, 26, 9, 2).fill({ color: 0x000000, alpha: 0.22 });
            g.roundRect(px + 2, py + 2, 26, 9, 2).fill(0x5f6f82);
            g.rect(px + 2, py + 2, 26, 2.2).fill(0x7c8da1);
            g.rect(px, py, TILE, 1.5).fill(C.yellow);
            break;
          }
          case T.Gate:
            g.rect(px, py, TILE, TILE).fill(C.road);
            break;
        }
      }
    }
    this.drawBuildings(g, sim);

    // Lagerzweck: farbiges Band unten am Stapelfeld
    for (let i = 0; i < sim.yardUse.length; i++) {
      const u = sim.yardUse[i];
      if (!u || sim.kind[i] !== T.Yard) continue;
      const px = (i % GRID_W) * TILE;
      const py = ((i / GRID_W) | 0) * TILE;
      g.rect(px + 2, py + TILE - 5, TILE - 4, 3).fill(YARD_USES[u].color);
    }
    // Zonen: Lagerfelder mit farbigem Rand, Gebäude mit farbiger Ecke
    for (let i = 0; i < sim.zone.length; i++) {
      const z = sim.zone[i];
      if (!z || (sim.kind[i] !== T.Yard && sim.kind[i] !== T.Reefer && sim.kind[i] !== T.Hazmat && sim.kind[i] !== T.Empty)) continue;
      const px = (i % GRID_W) * TILE;
      const py = ((i / GRID_W) | 0) * TILE;
      g.rect(px + 2.5, py + 2.5, TILE - 5, TILE - 5).stroke({ width: 2.2, color: ZONES[z].color });
      g.poly([px + 2, py + 2, px + 11, py + 2, px + 2, py + 11]).fill(ZONES[z].color);
    }
    const tag = (x: number, y: number, z: number) => {
      if (!z) return;
      g.roundRect(x * TILE + 1, y * TILE + 1, 11, 11, 2.5).fill(0xffffff);
      g.roundRect(x * TILE + 2.5, y * TILE + 2.5, 8, 8, 2).fill(ZONES[z].color);
    };
    for (const e of [...sim.gates, ...sim.plants, ...sim.rails]) tag(e.x, e.y, e.zone);

    // Überführungen: helles Deck mit Schatten und Geländer über der Kreuzung
    for (let i = 0; i < sim.overpass.length; i++) {
      if (!sim.overpass[i] || sim.kind[i] !== T.Road) continue;
      const px = (i % GRID_W) * TILE;
      const py = ((i / GRID_W) | 0) * TILE;
      g.rect(px - 2, py + 6, TILE + 4, TILE - 8).fill({ color: 0x000000, alpha: 0.22 });
      g.rect(px - 3, py + 3, TILE + 6, TILE - 10).fill(0xb9c2cc);
      g.rect(px - 3, py + 3, TILE + 6, 2).fill(0xeef2f6);
      g.rect(px - 3, py + TILE - 9, TILE + 6, 2).fill(0xeef2f6);
      g.rect(px - 3, py + TILE / 2 - 5, TILE + 6, 1.2).fill({ color: 0xffffff, alpha: 0.8 });
    }
    // Einbahnstraßen: weiße Pfeile in Fahrtrichtung
    for (let i = 0; i < sim.oneway.length; i++) {
      const ow = sim.oneway[i];
      if (ow < 0 || sim.kind[i] !== T.Road) continue;
      const cx = (i % GRID_W) * TILE + TILE / 2;
      const cy = ((i / GRID_W) | 0) * TILE + TILE / 2;
      const ang = [0, Math.PI / 2, Math.PI, -Math.PI / 2][ow];
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const P = (lx: number, ly: number) => [cx + lx * c - ly * s, cy + lx * s + ly * c];
      // Auf der Autobahn nur jedes zweite Feld und etwas dezenter
      const hw = sim.roadTier[i] === 2;
      if (hw && ((i % GRID_W) + ((i / GRID_W) | 0)) % 2 === 1) continue;
      if (!hw) g.rect(cx - 7, cy - 7, 14, 14).fill(C.road);
      g.poly([...P(-8, -2.2), ...P(2, -2.2), ...P(2, -6.5), ...P(9, 0), ...P(2, 6.5), ...P(2, 2.2), ...P(-8, 2.2)]).fill(hw ? { color: 0xffffff, alpha: 0.55 } : 0xffffff);
    }

    // Land, das dir noch nicht gehört: abgedunkelt mit Grenzlinie
    for (let x = 0; x < GRID_W; x++) {
      if (sim.owned[x]) continue;
      g.rect(x * TILE, COAST, TILE, H - COAST).fill({ color: 0x14263d, alpha: 0.28 });
      if (x === 0 || sim.owned[x - 1]) {
        for (let y = COAST; y < H; y += 14) g.rect(x * TILE - 1, y, 2.5, 8).fill({ color: 0xffffff, alpha: 0.85 });
      }
    }

    // Ausgebaggerte Fahrrinne vor dem Kai: dunkleres Wasser mit Bojen an den Rändern
    for (let q = 0; q < Q_MAX; q++) {
      if (!sim.depth[q]) continue;
      const r = this.channelRect(q);
      if (!r) continue;
      g.rect(r.x, r.y, r.w, r.h).fill({ color: 0x0c3560, alpha: 0.4 });
      for (const d of [-1, 1]) {
        if (sim.depth[q + d] && qTile(q + d)) continue;
        // Boje an der äußeren Ecke der Rinne
        const [ox, oy] = OUT[sideOf(q)];
        const along = ox === 0;
        const bx = along ? (d < 0 ? r.x + 2 : r.x + r.w - 2) : ox < 0 ? r.x + 2 : r.x + r.w - 2;
        const by = along ? (oy < 0 ? r.y + 2 : r.y + r.h - 2) : d < 0 ? r.y + 2 : r.y + r.h - 2;
        g.circle(bx, by, 3.2).fill(0xffffff);
        g.circle(bx, by, 2.3).fill(d < 0 ? 0xd9473f : 0x2f9e6b);
      }
    }
    // Hinterland: Straßen am unteren oder linken Rand führen aus der Karte hinaus
    for (const e of sim.hinterlandExits()) {
      const ex = (e % GRID_W) * TILE;
      const ey = ((e / GRID_W) | 0) * TILE;
      const bottom = ((e / GRID_W) | 0) === GRID_H - 1;
      if (bottom) {
        g.rect(ex, ey + TILE, TILE, DECOR).fill(C.road);
        for (let yy = ey + TILE + 6; yy < ey + TILE + DECOR; yy += 16) g.rect(ex + TILE / 2 - 1, yy, 2, 8).fill(C.roadDash);
      } else {
        g.rect(ex - DECOR, ey, DECOR, TILE).fill(C.road);
        for (let xx = ex - DECOR + 4; xx < ex; xx += 16) g.rect(xx, ey + TILE / 2 - 1, 8, 2).fill(C.roadDash);
      }
    }
    // Rand des Baugebiets
    g.rect(0, COAST, W, H - COAST).stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
  }

  /** Wasserfläche vor der Kaiposition q, drei Felder tief (in Pixeln) */
  private channelRect(q: number): { x: number; y: number; w: number; h: number } | null {
    const t = qTile(q);
    if (!t) return null;
    const [ox, oy] = OUT[sideOf(q)];
    const x0 = t[0] * TILE;
    const y0 = t[1] * TILE;
    if (oy < 0) return { x: x0, y: y0 - 3 * TILE, w: TILE, h: 3 * TILE - 7 };
    if (oy > 0) return { x: x0, y: y0 + TILE + 7, w: TILE, h: 3 * TILE - 7 };
    if (ox < 0) return { x: x0 - 2 * TILE, y: y0, w: 2 * TILE - 7, h: TILE };
    return { x: x0 + TILE + 7, y: y0, w: 2 * TILE - 7, h: TILE };
  }

  private glow(x: number, y: number, r: number, color: number, alpha: number): Sprite {
    const sp = new Sprite(this.glowTex);
    sp.anchor.set(0.5);
    sp.blendMode = 'add';
    sp.position.set(x, y);
    sp.scale.set(r / 32);
    sp.tint = color;
    sp.alpha = alpha;
    return sp;
  }

  /** Gebäude über mehrere Felder: Halle mit Sheddach, Werkstatt, Gate mit Spuren. */
  private drawBuildings(g: Graphics, sim: Sim) {
    for (const p of sim.plants) {
      const x = p.x * TILE;
      const y = p.y * TILE;
      const w = p.w * TILE;
      const h = p.h * TILE;
      const roof = p.kind === 'pack' ? 0x7a5cc7 : p.kind === 'cold' ? 0x3b9bd6 : p.kind === 'fill' ? 0x3f9a6b : 0xc98a3c;
      g.roundRect(x + 4, y + 6, w - 5, h - 13, 3).fill({ color: 0x000000, alpha: 0.25 });
      g.roundRect(x + 2, y + 2.5, w - 5, h - 13, 3).fill(shade(roof, 0.75));
      g.roundRect(x + 3, y + 3.5, w - 7, h - 15, 2.5).fill(roof);
      // Sheddach: helle Streifen über die ganze Halle
      for (let sx = x + 6; sx < x + w - 8; sx += 7) g.rect(sx, y + 5, 3, h - 18).fill(tint(roof, 0.35));
      // Dachaufbauten: Lüfter und bei der Kühlhalle Kühlaggregate
      for (let k = 0; k < p.w; k++) {
        const cx = x + 16 + k * TILE;
        if (p.kind === 'cold') {
          g.roundRect(cx - 6, y + 7, 12, 8, 1.5).fill(0xe8eef2);
          g.circle(cx - 2.5, y + 11, 2.4).fill(0x6d7a87);
          g.circle(cx + 2.5, y + 11, 2.4).fill(0x6d7a87);
        } else if (k % 2 === 0) {
          g.circle(cx, y + 10, 3.2).fill(0x3a424c);
          g.circle(cx, y + 10, 1.7).fill(0xd8dde2);
        }
      }
      // Laderampen mit Toren zur Straße
      g.rect(x + 3, y + h - 9, w - 6, 6.5).fill(0x8d949b);
      g.rect(x + 3, y + h - 9, w - 6, 1.3).fill(C.yellow);
      for (let k = 0; k < p.w; k++) g.rect(x + 9 + k * TILE, y + h - 13, 14, 4.5).fill(0x4b525c);
    }
    for (const sh of sim.shops) {
      const x = sh.x * TILE;
      const y = sh.y * TILE;
      const w = sh.w * TILE;
      const h = sh.h * TILE;
      g.roundRect(x + 4, y + 6, w - 5, h - 15, 3).fill({ color: 0x000000, alpha: 0.25 });
      g.roundRect(x + 2, y + 2.5, w - 5, h - 15, 3).fill(0x4a5868);
      g.roundRect(x + 3, y + 3.5, w - 7, h - 17, 2.5).fill(0x5b6b82);
      g.rect(x + 3, y + 3.5, w - 7, 3).fill(0x6f8099);
      // Werkzeugschild
      const cx = x + w / 2;
      const cy = y + 18;
      g.circle(cx, cy, 8).fill(0xf2c230);
      g.rect(cx - 5, cy - 1.2, 10, 2.4).fill(0x2b323b);
      g.circle(cx - 5, cy, 2.6).fill(0x2b323b);
      g.circle(cx + 5, cy, 2.6).fill(0x2b323b);
      // Zwei Rolltore
      for (let k = 0; k < 2; k++) {
        const dx = x + 6 + k * (w / 2 - 2);
        g.rect(dx, y + h - 13, w / 2 - 10, 11).fill(0x8d949b);
        for (let i = 0; i < 5; i++) g.rect(dx, y + h - 12 + i * 2.2, w / 2 - 10, 0.8).fill(0x6d747b);
      }
    }
    for (const gt of sim.gates) {
      // Gezeichnet waagerecht; ein gedrehtes Gate (1 × 2) wird um 90° gedreht
      const vert = gt.h > gt.w;
      const n = Math.max(gt.w, gt.h);
      if (vert) g.setTransform(0, 1, -1, 0, gt.x * TILE + TILE, gt.y * TILE);
      else g.setTransform(1, 0, 0, 1, gt.x * TILE, gt.y * TILE);
      const x = 0;
      const y = 0;
      const w = n * TILE;
      g.rect(x + 1.5, y + 1.5, w - 3, TILE - 3).stroke({ width: 1.3, color: C.roadEdge, alpha: 0.85 });
      // Trennlinie zwischen den Spuren
      for (let k = 1; k < n; k++) g.rect(x + k * TILE - 1, y + 3, 2, TILE - 6).fill({ color: 0xffffff, alpha: 0.7 });
      // Dach über beide Spuren, Häuschen in der Mitte
      g.roundRect(x + 4.5, y + 7, w - 6, 13, 2).fill({ color: 0x000000, alpha: 0.25 });
      g.roundRect(x + 3, y + 4, w - 6, 13, 2).fill(C.white);
      g.rect(x + 3, y + 4, w - 6, 3).fill(0xd9473f);
      g.rect(x + 3, y + 14, w - 6, 3).fill(0xd9473f);
      for (let sx = x + 6; sx < x + w - 6; sx += 6.5) g.rect(sx, y + 4, 3, 3).fill(C.white);
      g.roundRect(x + w / 2 - 5, y + 8, 10, 5, 1.2).fill(0x2f6db0);
      g.rect(x + w / 2 - 3.5, y + 9.2, 7, 1.6).fill(0xbfe1ff);
      g.resetTransform();
    }
  }

  /** Lampen, die nur nachts leuchten. */
  private drawLights(sim: Sim) {
    for (const c of this.lights.removeChildren()) c.destroy();
    const add = (x: number, y: number, r: number, color: number, a: number) => this.lights.addChild(this.glow(x, y, r, color, a));
    for (let i = 0; i < sim.kind.length; i++) {
      const x = (i % GRID_W) * TILE;
      const y = ((i / GRID_W) | 0) * TILE;
      const k = sim.kind[i];
      if (k === T.Road && hash(i, 3) % 3 === 0) add(x + 16, y + 4, 36, 0xffd08a, 0.3);
      else if (k === T.Kai && (i % GRID_W) % 2 === 0) add(x + 16, y + 26, 40, 0xffdcae, 0.26);
      else if (k === T.Gate) add(x + 16, y + 11, 46, 0xffe2b8, 0.42);
      else if (k === T.Yard && hash(i, 9) % 4 === 0) add(x + 16, y + 16, 46, 0xffdcae, 0.22);
      else if (k === T.Reefer && hash(i, 9) % 2 === 0) add(x + 16, y + 16, 40, 0x9fd4ff, 0.3);
      else if (k === T.Rail) add(x + 14, y + 8, 48, 0xffe2b8, 0.4);
    }
    for (const c of sim.cranes) {
      const x = c.x * TILE + 16;
      const y = c.y * TILE;
      add(x, y - (c.big ? 66 : 56), 16, 0xff5a4a, 0.75);
      add(x, y - 26, 50, 0xffe6c2, 0.3);
      add(x, y + 12, 44, 0xffe6c2, 0.3);
    }
  }

  private makeBirds() {
    for (let i = 0; i < 5; i++) {
      const h = hash(i, 4242);
      const root = new Container();
      const shadow = new Graphics();
      shadow.moveTo(-5, 0).quadraticCurveTo(-2.5, -2.5, 0, 0).quadraticCurveTo(2.5, -2.5, 5, 0).stroke({ width: 1.6, color: 0x0a2440, alpha: 0.22, cap: 'round' });
      shadow.position.set(9, 13);
      const wings = new Graphics();
      wings.moveTo(-5.5, 0).quadraticCurveTo(-2.7, -3.4, 0, 0).quadraticCurveTo(2.7, -3.4, 5.5, 0).stroke({ width: 1.7, color: 0xffffff, cap: 'round', join: 'round' });
      wings.circle(0, 0.2, 1).fill(0xffffff);
      root.addChild(shadow, wings);
      this.birdLayer.addChild(root);
      this.birds.push({
        root,
        wings,
        cx: 120 + (h % (W - 240)),
        cy: COAST - 150 + ((h >>> 8) % 260),
        r: 60 + ((h >>> 16) % 110),
        speed: (0.12 + ((h >>> 22) % 10) / 80) * (h & 1 ? 1 : -1),
        phase: (h >>> 4) % 628 / 100,
      });
    }
  }

  // ───────────────────────── Objekte ─────────────────────────

  private resetViews() {
    for (const v of this.ships.values()) v.root.destroy({ children: true });
    for (const v of this.trucks.values()) v.root.destroy({ children: true });
    for (const v of this.cranes.values()) v.root.destroy({ children: true });
    for (const y of this.yard.values()) for (const s of y.sprites) s.destroy();
    for (const f of this.floats) f.text.destroy();
    for (const v of this.trains.values()) v.root.destroy({ children: true });
    this.trains.clear();
    this.ships.clear();
    this.trucks.clear();
    this.cranes.clear();
    this.yard.clear();
    this.floats = [];
    this.pops = [];
  }

  private box(tex: Texture, color: number, x: number, y: number, scale = 1): Sprite {
    const s = new Sprite(tex);
    s.tint = color;
    s.position.set(x, y);
    s.scale.set(scale);
    return s;
  }

  /** Stapelplatz und Kühlplätze: sechs Stellplätze pro Feld. */
  private syncYard(sim: Sim) {
    const tiles = new Map<number, string>();
    for (const i of sim.yardTileList) tiles.set(i, 'yard');
    for (const i of sim.reeferTileList) tiles.set(i, 'reefer');
    for (const i of sim.hazTileList) tiles.set(i, 'haz');
    for (const i of sim.emptyTileList) tiles.set(i, 'empty');
    for (const [i, y] of this.yard) {
      if (tiles.get(i) !== y.type) {
        for (const s of y.sprites) s.destroy();
        this.yard.delete(i);
      }
    }
    for (const [i, type] of tiles) {
      if (this.yard.has(i)) continue;
      const px = (i % GRID_W) * TILE;
      const py = ((i / GRID_W) | 0) * TILE;
      const sprites: Sprite[] = [];
      const slots = type === 'empty' ? 12 : RTG_CAP;
      for (let k = 0; k < slots; k++) {
        // Leerlager: vier Reihen flach gestapelt, sonst drei Spalten
        const s = type === 'empty' ? this.box(this.boxV, 0xffffff, px + 1.5 + (k % 4) * 7.4, py + 1.6 + Math.floor(k / 4) * 10, 1) : this.box(this.boxV, 0xffffff, px + 2.3 + (k % 3) * 9.4, py + 2.6 + Math.floor(k / 3) * 14);
        if (type === 'empty') s.scale.set(0.78, 0.68);
        this.yardLayer.addChild(s);
        sprites.push(s);
      }
      this.yard.set(i, { sprites, key: -1, type, cap: YARD_CAP_PER_TILE, px, py });
    }
  }

  private updateYard(sim: Sim) {
    for (const [i, y] of this.yard) {
      const imp = sim.stock[i];
      const exp = sim.stockExp[i];
      const rail = sim.stockRail[i];
      const cap = sim.capAt(i);
      const key = imp * 16 + exp + cap * 256 + rail * 65536;
      if (key === y.key) continue;
      y.key = key;
      if (y.type === 'empty') {
        for (let k = 0; k < y.sprites.length; k++) {
          y.sprites[k].visible = k < imp;
          y.sprites[k].tint = EMPTY_BOX;
        }
        continue;
      }
      if (cap !== y.cap) {
        // Mit Portalkran: drei Reihen flacher gestapelt
        y.cap = cap;
        y.sprites.forEach((sp, k) => {
          const row = Math.floor(k / 3);
          sp.position.set(y.px + 2.3 + (k % 3) * 9.4, y.py + (cap > YARD_CAP_PER_TILE ? 1.6 + row * 9.8 : 2.6 + row * 14));
          sp.scale.set(1, cap > YARD_CAP_PER_TILE ? 0.68 : 1);
        });
      }
      for (let k = 0; k < y.sprites.length; k++) {
        const sp = y.sprites[k];
        sp.visible = k < imp + exp;
        sp.tint = k < imp ? (y.type === 'reefer' ? REEFER_BOX : y.type === 'haz' ? HAZ_BOX : k >= imp - rail ? RAIL_BOX : BOX[hash(i, k) % BOX.length]) : EXPORT_BOX;
      }
    }
  }

  private hullPath(g: Graphics, inset: number, L: number): Graphics {
    const y0 = 7 + inset;
    const y1 = 57 - inset;
    const x0 = 3 + inset;
    const xb = L - 31 - inset * 0.5;
    const xt = L - 2 - inset * 2.2;
    return g
      .moveTo(x0 + 5, y0)
      .lineTo(xb, y0)
      .quadraticCurveTo(xt - 5, y0 + 4, xt, 32)
      .quadraticCurveTo(xt - 5, y1 - 4, xb, y1)
      .lineTo(x0 + 5, y1)
      .quadraticCurveTo(x0, y1, x0, y1 - 5)
      .lineTo(x0, y0 + 5)
      .quadraticCurveTo(x0, y0, x0 + 5, y0)
      .closePath();
  }

  private makeShip(s: Ship): ShipView {
    const L = s.len * TILE;
    const cols = Math.floor((L - 48) / 10);
    const root = new Container();
    const wake = new Graphics();
    const body = new Container();
    const hull = new Graphics();
    // Schatten auf dem Wasser
    const shadow = new Graphics();
    this.hullPath(shadow, 0, L).fill({ color: 0x0a2440, alpha: 0.3 });
    shadow.position.set(4, 6);
    // Rumpf, Scheuerleiste, Deck
    this.hullPath(hull, 0, L).fill(shade(s.color, 0.62));
    this.hullPath(hull, 1.4, L).fill(s.color);
    this.hullPath(hull, 4, L).fill(C.steel);
    // Lukendeckel
    for (let c = 0; c < cols; c++) hull.roundRect(24 + c * 10, 11.2, 9.2, 41.6, 1).fill(0x4c5560);
    // Vorschiff: Ankerwinden und Mast
    hull.circle(L - 18, 27, 2.2).fill(C.bollard);
    hull.circle(L - 18, 37, 2.2).fill(C.bollard);
    hull.rect(L - 14.5, 31, 5, 2).fill(0x8d96a0);
    hull.circle(L - 9, 32, 1.4).fill(C.white);
    // Aufbau am Heck
    hull.roundRect(7.5, 13, 15, 39, 2).fill({ color: 0x000000, alpha: 0.25 });
    hull.roundRect(6, 11.5, 15, 39, 2).fill(C.white);
    hull.rect(8, 9.5, 9, 3).fill(C.white);
    hull.rect(8, 49.5, 9, 3).fill(C.white);
    hull.rect(17.6, 14.5, 2.4, 33).fill(0x25384f);
    hull.roundRect(9, 25.5, 7.5, 12, 3).fill(shade(s.color, 0.85));
    hull.roundRect(10.6, 27.6, 4.3, 7.8, 2).fill(0x1c232c);
    hull.roundRect(7.4, 16, 3, 6.5, 1.5).fill(0xf08a24);
    hull.roundRect(7.4, 40.5, 3, 6.5, 1.5).fill(0xf08a24);
    body.addChild(shadow, hull);

    const cargo: Sprite[] = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < 5; r++) {
        const sp = this.box(this.boxH, BOX[hash(c * 5 + r, s.id) % BOX.length], 24.1 + c * 10, 11.4 + r * 8.3, 1);
        body.addChild(sp);
        cargo.push(sp);
      }
    }

    const label = new Text({
      text: s.name,
      style: {
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: 11,
        fontWeight: '800',
        fill: 0xffffff,
        stroke: { color: 0x14263d, width: 3, join: 'round' },
      },
    });
    label.resolution = 2;
    label.position.set(4, -9);

    const alert = new Graphics();
    alert.circle(0, 0, 9.5).fill(0xffffff);
    alert.circle(0, 0, 8).fill(C.bad);
    alert.roundRect(-1.4, -5, 2.8, 6.2, 1.2).fill(0xffffff);
    alert.circle(0, 3.8, 1.5).fill(0xffffff);
    alert.position.set(L / 2, 2);
    alert.visible = false;

    const rotor = new Container();
    rotor.addChild(wake, body);
    root.addChild(rotor, label, alert);
    return { root, rotor, wake, body, cargo, alert, filled: -1, len: L };
  }

  private syncShips(sim: Sim, a: number, view: View) {
    const seen = new Set<number>();
    for (const s of sim.ships) {
      seen.add(s.id);
      let v = this.ships.get(s.id);
      if (!v) {
        v = this.makeShip(s);
        this.ships.set(s.id, v);
        this.shipLayer.addChild(v.root);
      }
      v.root.position.set((s.px + (s.x - s.px) * a) * TILE, (s.py + (s.y - s.py) * a) * TILE);
      // Drehung um die linke obere Ecke der Umrandung
      const L = v.len;
      const r = s.rot;
      v.rotor.rotation = r;
      const vert = Math.abs(Math.sin(r)) > 0.5;
      if (!vert) v.rotor.position.set(Math.cos(r) > 0 ? 0 : L, Math.cos(r) > 0 ? 0 : 2 * TILE);
      else v.rotor.position.set(Math.sin(r) > 0 ? 2 * TILE : 0, Math.sin(r) > 0 ? 0 : L);
      v.alert.position.set(vert ? TILE : L / 2, 2);
      // Ladung an Deck: was noch an Bord ist, plus was schon verladen wurde
      const filled = Math.ceil(Math.min(1, (s.containers + s.reefers + s.haz + s.loaded) / s.total) * v.cargo.length);
      if (filled !== v.filled) {
        for (let k = 0; k < v.cargo.length; k++) v.cargo[k].visible = k < filled;
        v.filled = filled;
      }
      const moving = Math.abs(s.x - s.px) + Math.abs(s.y - s.py) > 0.0005;
      v.wake.visible = moving;
      if (moving) {
        const g = v.wake;
        const L = v.len;
        g.clear();
        for (let i = 0; i < 7; i++) {
          const wob = Math.sin(view.time * 5 + i * 1.3 + s.id) * 2.5;
          g.circle(-3 - i * 8, 32 + wob, 6.5 - i * 0.7).fill({ color: 0xffffff, alpha: 0.42 - i * 0.055 });
        }
        g.moveTo(L - 6, 22).quadraticCurveTo(L - 20, 6, L - 44, 2).stroke({ width: 2, color: 0xffffff, alpha: 0.35, cap: 'round' });
        g.moveTo(L - 6, 42).quadraticCurveTo(L - 20, 58, L - 44, 62).stroke({ width: 2, color: 0xffffff, alpha: 0.35, cap: 'round' });
      }
      // Leichtes Schaukeln am Liegeplatz, stärker bei Sturm
      v.body.position.y = moving ? 0 : Math.sin(view.time * 1.4 + s.id) * (0.5 + this.stormA * 1.5);
      v.alert.visible = s.blocked && !view.calm;
      if (s.blocked) v.alert.scale.set(1 + Math.sin(view.time * 6) * 0.12);
    }
    for (const [id, v] of this.ships) {
      if (!seen.has(id)) {
        v.root.destroy({ children: true });
        this.ships.delete(id);
      }
    }
  }

  private makeTruck(t: Truck): TruckView {
    const root = new Container();
    const g = new Graphics();
    g.roundRect(-11.5, -3, 26, 11, 2.5).fill({ color: 0x000000, alpha: 0.24 });
    if (t.agv) {
      // Fahrerloses Fahrzeug: flache Plattform ohne Kabine
      g.roundRect(-13.5, -5.2, 27, 10.4, 3).fill(0x1f8f97);
      g.roundRect(-12.5, -4.2, 25, 8.4, 2.2).fill(0xe8eef2);
      g.rect(-12.5, -0.4, 25, 0.8).fill(0xb9c4cc);
      g.circle(11, -3, 1.1).fill(0x27d7c4);
      g.circle(11, 3, 1.1).fill(0x27d7c4);
      g.circle(-11, -3, 1.1).fill(0xff6a5a);
      g.circle(-11, 3, 1.1).fill(0xff6a5a);
    } else {
      g.roundRect(-13, -4.4, 19.5, 8.8, 1.4).fill(0x2f353e);
      g.rect(-12.2, -3.6, 17.9, 7.2).fill(0x8b949f);
      g.rect(-12.2, -0.4, 17.9, 0.8).fill(0x6d7681);
      const cab = CAB[t.id % CAB.length];
      g.roundRect(5.6, -5.4, 8, 10.8, 2.4).fill(shade(cab, 0.72));
      g.roundRect(6.2, -4.8, 6.8, 9.6, 2).fill(cab);
      g.roundRect(10.2, -3.8, 2.4, 7.6, 1).fill(0x22344b);
      g.rect(6.8, -3.6, 2.6, 7.2).fill(tint(cab, 0.3));
    }
    const brake = new Graphics();
    brake.circle(-13.2, -3, 1.9).fill(0xff3b30);
    brake.circle(-13.2, 3, 1.9).fill(0xff3b30);
    brake.circle(-13.2, -3, 3.6).fill({ color: 0xff3b30, alpha: 0.3 });
    brake.circle(-13.2, 3, 3.6).fill({ color: 0xff3b30, alpha: 0.3 });
    brake.visible = false;
    root.addChild(g, brake);
    const load: Sprite[] = [];
    for (let k = 0; k < 2; k++) {
      const s = this.box(this.boxH, 0xffffff, (t.agv ? -10 : -12.4) + k * (t.agv ? 10.4 : 8.9), -3.9, 0.96);
      s.visible = false;
      root.addChild(s);
      load.push(s);
    }
    const badge = new Graphics();
    badge.position.set(t.agv ? 0 : -3.5, 0);
    root.addChild(badge);
    return { root, load, brake, badge, lat: 7, key: '', agv: t.agv, rot: t.angle };
  }

  private syncTrucks(sim: Sim, a: number, view: View) {
    // Buchten auf den Stellplätzen verteilen
    const parkedSlot = new Map<number, number>();
    const perLot = new Map<number, number>();
    for (const t of sim.trucks) {
      if (!t.parked || t.parkAt === undefined || t.parkAt < 0) continue;
      const n = perLot.get(t.parkAt) ?? 0;
      parkedSlot.set(t.id, n);
      perLot.set(t.parkAt, n + 1);
    }
    const seen = new Set<number>();
    for (const t of sim.trucks) {
      seen.add(t.id);
      let v = this.trucks.get(t.id);
      if (v && v.agv !== t.agv) {
        v.root.destroy({ children: true });
        v = undefined;
      }
      if (!v) {
        v = this.makeTruck(t);
        this.trucks.set(t.id, v);
        this.truckLayer.addChild(v.root);
      }
      // Weich in die neue Richtung drehen (kürzester Weg)
      let d = t.angle - v.rot;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      v.rot += d * Math.min(1, view.dt * 12);
      v.root.rotation = v.rot;
      // Rechtsverkehr: in Fahrtrichtung rechts von der Mittellinie
      const idle = !t.job && t.wait <= 0;
      // Einbahnstraße: zwei Spuren, die zweite links der Mitte
      const ow = sim.oneway[t.tile] >= 0 || (t.next >= 0 && sim.oneway[t.next] >= 0);
      const want = idle ? 10.5 : ow ? (t.slot ? -6.5 : 6.5) : 7;
      v.lat += (want - v.lat) * Math.min(1, view.dt * 6);
      if (t.parked && t.parkAt !== undefined && t.parkAt >= 0 && t.next < 0) {
        // Auf dem Stellplatz: in einer der vier Buchten, quer geparkt
        const slot = parkedSlot.get(t.id) ?? 0;
        v.rot = -Math.PI / 2;
        v.root.rotation = v.rot;
        v.root.position.set((t.parkAt % GRID_W) * TILE + 5 + slot * 7.3, ((t.parkAt / GRID_W) | 0) * TILE + 20);
      } else
        v.root.position.set(
          (t.px + (t.fx - t.px) * a + 0.5) * TILE - Math.sin(v.rot) * v.lat,
          (t.py + (t.fy - t.py) * a + 0.5) * TILE + Math.cos(v.rot) * v.lat,
        );
      v.brake.visible = t.stuck > 0;
      const key = t.load + t.cargo + t.role + t.zone;
      if (key !== v.key) {
        v.key = key;
        // Farbpunkt für die feste Aufgabe, dahinter ein Quadrat in Zonenfarbe
        v.badge.clear();
        if (t.zone) v.badge.roundRect(-5.2, -5.2, 10.4, 10.4, 2).fill(0xffffff).roundRect(-4, -4, 8, 8, 1.5).fill(ZONES[t.zone].color);
        const rc = ROLE_COLOR[t.role];
        if (rc) v.badge.circle(0, 0, 3.6).fill(0xffffff).circle(0, 0, 2.6).fill(rc);
        for (let k = 0; k < v.load.length; k++) {
          v.load[k].visible = k < t.load;
          v.load[k].tint = CARGO_TINT[t.cargo] ?? BOX[hash(t.id, k + 40) % BOX.length];
        }
      }
    }
    for (const [id, v] of this.trucks) {
      if (!seen.has(id)) {
        v.root.destroy({ children: true });
        this.trucks.delete(id);
      }
    }
  }

  private makeCrane(c: Crane): CraneView {
    const root = new Container();
    // Gezeichnet für Wasser im Norden, dann zur Küste gedreht. Süd und West werden gespiegelt,
    // damit die Containerbrücke auf das nächste Kai-Feld (q + 1) reicht.
    const side = sideOf(c.q);
    root.pivot.set(TILE / 2, TILE / 2);
    root.position.set(c.x * TILE + TILE / 2, c.y * TILE + TILE / 2);
    root.rotation = SIDE_ANGLE[side] ?? 0;
    if (side === QS_ || side === QW) root.scale.x = -1;
    // Mobilkran: orange. Containerbrücke: blau, mit längerem und breiterem Ausleger
    // Farbe und Größe je Modell: Leichtkran gelb und kurz, Super-Brücke grün und lang
    const main = CRANE_MODELS[c.model].color;
    const dark = shade(main, 0.7);
    const light = tint(main, 0.35);
    const top = { light: -50, mobile: -60, bridge: -70, super: -82 }[c.model];
    const bw = { light: 7.5, mobile: 9, bridge: 11, super: 13 }[c.model];
    // Breite: Mobilkran ein Feld, Containerbrücke zwei Felder
    const cw = c.big ? 2 * TILE : TILE;
    const mid = cw / 2;
    const bx = mid - bw / 2;
    const len = 22 - top;

    // Schatten von Ausleger und Portal
    const shadow = new Graphics();
    shadow.rect(bx + 0.5, top, bw - 1, len).fill({ color: 0x06182c, alpha: 0.22 });
    shadow.rect(1, 2, cw - 2, 4.5).fill({ color: 0x06182c, alpha: 0.22 });
    shadow.rect(1, 15, cw - 2, 4.5).fill({ color: 0x06182c, alpha: 0.22 });
    shadow.position.set(5, 7);

    const g = new Graphics();
    // Portal quer zum Ausleger, auf den Schienen
    g.roundRect(0.5, 1.5, cw - 1, 5, 1.5).fill(dark);
    g.roundRect(0.5, 14.5, cw - 1, 5, 1.5).fill(dark);
    g.rect(1.5, 2.3, cw - 3, 1.6).fill(main);
    g.rect(1.5, 15.3, cw - 3, 1.6).fill(main);
    for (const lx of [1, cw - 5]) {
      g.roundRect(lx, 0.5, 4, 7, 1).fill(0x2b323b);
      g.roundRect(lx, 13.5, 4, 7, 1).fill(0x2b323b);
    }
    // Ausleger mit Fachwerk
    g.roundRect(bx, top, bw, len, 1.5).fill(dark);
    g.rect(bx + 1.1, top + 1, bw - 2.2, len - 2).fill(main);
    for (let y = top + 4; y < 18; y += 8) {
      g.moveTo(bx + 1.3, y)
        .lineTo(bx + bw - 1.3, y + 4)
        .lineTo(bx + 1.3, y + 8)
        .stroke({ width: 0.9, color: light, alpha: 0.9 });
    }
    g.rect(mid - 0.8, top + 1, 1.6, len - 2).fill({ color: 0x2b323b, alpha: 0.55 });
    if (c.big) {
      g.rect(bx - 1.5, top + 14, bw + 3, 2).fill(dark);
      g.rect(bx - 1.5, top + 40, bw + 3, 2).fill(dark);
    }
    // Maschinenhaus
    g.roundRect(mid - 6.5, 6, 13, 9, 1.5).fill({ color: 0x000000, alpha: 0.2 });
    g.roundRect(mid - 7.5, 5, 13, 9, 1.5).fill(C.white);
    g.rect(mid - 6.5, 6, 11, 2).fill(c.big ? 0x9cc4ff : 0xcfd6dc);

    // Laufkatze mit Container am Haken
    const trolley = new Container();
    const tg = new Graphics();
    tg.roundRect(-6.5, -4.5, 13, 9, 1.5).fill(0x2b323b);
    tg.roundRect(-5, -3, 10, 6, 1).fill(0xf2c230);
    const hook = this.box(this.boxH, BOX[c.id % BOX.length], -4.5, -4, 1);
    hook.visible = false;
    trolley.addChild(hook, tg);
    trolley.position.set(mid, 11);

    const lamp = new Graphics();
    lamp.circle(0, 0, 3.2).fill(0xffffff);
    lamp.position.set(mid, top + 3);

    // Am Fuß des Krans: unten entladene Container, darüber Export fürs Schiff
    const buffer: Sprite[] = [];
    for (let k = 0; k < CRANE_MODELS[c.model].buffer; k++) {
      const s = this.box(this.boxV, 0xffffff, 1.6 + k * 7.4 + (c.big ? 1.2 : 0), 22.2, 0.8);
      s.visible = false;
      buffer.push(s);
    }
    const exp: Sprite[] = [];
    for (let k = 0; k < (c.big ? CRANE_MODELS[c.model].buffer : CRANE_EXP_BUFFER); k++) {
      const s = this.box(this.boxV, EXPORT_BOX, 2.4 + k * 7.2 + (c.big ? 1.2 : 0), 12.6, 0.7);
      s.visible = false;
      exp.push(s);
    }
    root.addChild(shadow, ...buffer, g, ...exp, trolley, lamp);
    return { root, trolley, hook, lamp, buffer, exp, key: '', big: c.big, model: c.model, pos: 0 };
  }

  private syncCranes(sim: Sim, a: number, view: View) {
    const seen = new Set<number>();
    for (const c of sim.cranes) {
      seen.add(c.id);
      let v = this.cranes.get(c.id);
      if (v && v.model !== c.model) {
        v.root.destroy({ children: true });
        v = undefined;
      }
      if (!v) {
        v = this.makeCrane(c);
        this.cranes.set(c.id, v);
        this.craneLayer.addChild(v.root);
      }
      // Im Bau: halb durchsichtig, der Kran entsteht noch
      v.root.alpha = c.build ? 0.45 + 0.35 * (1 - c.build / Math.max(1, c.buildMax ?? c.build)) : 1;
      // Laufkatze: 0 = über dem Kai, 1 = über dem Schiff
      let carrying = false;
      if (c.state === 'working') {
        const u = Math.min(1, Math.max(0, 1 - (c.cd - a * TICK_GM) / sim.moveTime(c)));
        v.pos = u < 0.5 ? u * 2 : 2 - u * 2;
        carrying = u >= 0.5;
      } else {
        carrying = c.state === 'blocked';
        const target = c.state === 'blocked' ? 0.35 : 0;
        v.pos += (target - v.pos) * Math.min(1, view.dt * 6);
      }
      const e = v.pos * v.pos * (3 - 2 * v.pos);
      v.trolley.position.y = 11 - e * 44;
      v.hook.visible = carrying;
      v.lamp.tint = c.state === 'working' ? 0x3fe08a : c.state === 'blocked' ? 0xffb020 : c.state === 'storm' ? 0x8fb4ff : 0x9aa5b1;
      v.lamp.alpha = c.state === 'blocked' || c.state === 'storm' ? 0.45 + 0.55 * Math.abs(Math.sin(view.time * 5)) : 1;
      const key = `${c.buffer}.${c.bufReef}.${c.bufHaz}.${c.expBuf}`;
      if (key !== v.key) {
        v.key = key;
        for (let k = 0; k < v.buffer.length; k++) {
          v.buffer[k].visible = k < c.buffer + c.bufReef + c.bufHaz;
          v.buffer[k].tint = k < c.buffer ? BOX[hash(c.id, k + 7) % BOX.length] : k < c.buffer + c.bufReef ? REEFER_BOX : HAZ_BOX;
        }
        for (let k = 0; k < v.exp.length; k++) v.exp[k].visible = k < c.expBuf;
      }
    }
    for (const [id, v] of this.cranes) {
      if (!seen.has(id)) {
        v.root.destroy({ children: true });
        this.cranes.delete(id);
      }
    }
  }

  private makeTrain(r: Rail): TrainView {
    const root = new Container();
    const g = new Graphics();
    const y = r.y * TILE + 23;
    // Lok
    g.roundRect(2, y - 5, 30, 14, 3).fill({ color: 0x000000, alpha: 0.22 });
    g.roundRect(0, y - 7, 30, 14, 3).fill(0xa8322b);
    g.roundRect(1.2, y - 5.8, 27.6, 11.6, 2.4).fill(0xd9473f);
    g.roundRect(3, y - 4.6, 7, 9.2, 1.5).fill(0x25384f);
    g.rect(13, y - 3.2, 13, 6.4).fill(0xf2c230);
    g.circle(1.5, y - 3.5, 1.2).fill(0xfff4c2);
    g.circle(1.5, y + 3.5, 1.2).fill(0xfff4c2);
    // Fünf Tragwagen mit je zwei Stellplätzen
    const cargo: Sprite[] = [];
    for (let k = 0; k < 5; k++) {
      const x = 34 + k * 26;
      g.rect(x - 2, y - 1, 2, 2).fill(0x2b323b);
      g.roundRect(x + 1.5, y - 4, 23, 11, 1.5).fill({ color: 0x000000, alpha: 0.2 });
      g.roundRect(x, y - 5.5, 23, 11, 1.5).fill(0x3a424c);
      g.rect(x + 1, y - 4.5, 21, 9).fill(0x6c7682);
      for (let j = 0; j < 2; j++) {
        const sp = this.box(this.boxH, BOX[hash(r.id + k, j) % BOX.length], x + 1.6 + j * 10.2, y - 4, 1);
        sp.visible = false;
        cargo.push(sp);
      }
    }
    root.addChild(g, ...cargo);
    return { root, cargo, n: -1 };
  }

  private syncTrains(sim: Sim, a: number) {
    const seen = new Set<number>();
    for (const r of sim.rails) {
      seen.add(r.id);
      let v = this.trains.get(r.id);
      if (!v) {
        v = this.makeTrain(r);
        this.trains.set(r.id, v);
        this.trainLayer.addChild(v.root);
      }
      v.root.visible = r.state !== 'away';
      if (!v.root.visible) continue;
      // Der Zug rollt von rechts ein und wieder nach rechts hinaus
      const t = Math.max(0, r.timer - a * TICK_GM) / RAIL_TRAVEL_GM;
      const u = r.state === 'arriving' ? t : r.state === 'leaving' ? 1 - t : 0;
      v.root.position.set(r.x * TILE + 3 + u * u * (W - r.x * TILE + 900), 0);
      const n = r.state === 'leaving' ? Math.ceil((r.lastLoad / RAIL_CAP) * v.cargo.length) : 0;
      if (n !== v.n) {
        v.n = n;
        for (let k = 0; k < v.cargo.length; k++) v.cargo[k].visible = k < n;
      }
    }
    for (const [id, v] of this.trains) {
      if (!seen.has(id)) {
        v.root.destroy({ children: true });
        this.trains.delete(id);
      }
    }
  }

  /** Sturm: dunkler Himmel und Regen. Nebel: heller Schleier. Beides blendet weich ein und aus. */
  private updateWeather(sim: Sim, view: View) {
    const k = Math.min(1, view.dt * 1.2);
    this.stormA += ((sim.weather === 'storm' ? 1 : 0) - this.stormA) * k;
    this.fogA += ((sim.weather === 'fog' ? 1 : 0) - this.fogA) * k;
    const w = this.viewW;
    const h = this.viewH;
    const storm = this.stormA > 0.01;
    this.stormTint.visible = storm;
    this.rain.visible = storm;
    if (storm) {
      this.stormTint.scale.set(w / 8, h / 8);
      this.stormTint.alpha = this.stormA * 0.34;
      this.rain.width = w;
      this.rain.height = h;
      this.rain.alpha = this.stormA * 0.85;
      this.rain.tilePosition.set(-view.time * 190, view.time * 620);
    }
    const fog = this.fogA > 0.01;
    this.fogTint.visible = fog;
    this.fog.visible = fog;
    if (fog) {
      this.fogTint.scale.set(w / 8, h / 8);
      this.fogTint.alpha = this.fogA * 0.34;
      this.fog.width = w;
      this.fog.height = h;
      this.fog.alpha = this.fogA * 0.9;
      this.fog.tilePosition.set(view.time * 14, Math.sin(view.time * 0.2) * 20);
    }
  }

  // ───────────────────────── Zeichnen pro Frame ─────────────────────────

  draw(sim: Sim, view: View) {
    if (this.simRef !== sim) {
      this.resetViews();
      this.simRef = sim;
      this.version = -1;
    }
    if (this.baseMap !== sim.map) this.drawBase(sim.map);
    if (this.version !== sim.version) {
      this.drawTerrain(sim);
      this.syncYard(sim);
      this.drawLights(sim);
      this.version = sim.version;
      this.heatTimer = 1;
    }
    const a = Math.max(0, Math.min(1, view.alpha));

    // Wasser, bei Sturm schneller
    this.updateWeather(sim, view);
    const sea = 1 + this.stormA * 2.5;
    this.waves.tilePosition.set(view.time * 7 * sea, Math.sin(view.time * 0.6 * sea) * 5);
    this.swell.tilePosition.set(-view.time * 3, view.time * 1.2);

    this.syncShips(sim, a, view);
    this.syncTrucks(sim, a, view);
    this.syncCranes(sim, a, view);
    this.syncTrains(sim, a);
    this.updateYard(sim);

    // Tageszeit
    const hr = (sim.gm % MIN_PER_DAY) / 60;
    let nf = 0;
    if (hr >= 21 || hr < 4.5) nf = 1;
    else if (hr >= 19) nf = (hr - 19) / 2;
    else if (hr < 6.5) nf = 1 - (hr - 4.5) / 2;
    const dusk = Math.max(0, 1 - Math.abs(hr - 19.7) / 1.5, 1 - Math.abs(hr - 5.7) / 1.3);
    this.nightF = nf;
    this.night.tint = mix(0xff8f5a, 0x0b1c3d, Math.min(1, nf * 1.7));
    this.night.alpha = Math.max(nf * 0.42, dusk * 0.15);
    this.night.visible = this.night.alpha > 0.004;
    this.lights.alpha = nf;
    this.lights.visible = nf > 0.02;

    // Möwen kreisen tagsüber über der Küste
    this.birdLayer.visible = nf < 0.6 && this.stormA < 0.5;
    if (this.birdLayer.visible) {
      this.birdLayer.alpha = (1 - nf / 0.6) * (1 - this.stormA * 2);
      for (const b of this.birds) {
        const ang = b.phase + view.time * b.speed;
        b.root.position.set(b.cx + Math.cos(ang) * b.r, b.cy + Math.sin(ang) * b.r * 0.6);
        b.wings.scale.y = 0.55 + 0.6 * Math.sin(view.time * 7 + b.phase);
      }
    }

    // Engpass-Färbung (nur ein paar Mal pro Sekunde neu)
    this.heat.visible = view.overlay;
    this.heatTimer += view.dt;
    if (view.overlay && this.heatTimer > 0.25) {
      this.heatTimer = 0;
      this.drawHeat(sim);
    }
    this.grid.visible = view.tool !== 'view';

    this.drawDyn(sim, view, a);
    this.drawDynLights(sim, a);
    this.updateFx(view.dt);
  }

  private drawHeat(sim: Sim) {
    const g = this.heat;
    g.clear();
    for (let i = 0; i < sim.kind.length; i++) {
      const k = sim.kind[i];
      const x = i % GRID_W;
      const y = (i / GRID_W) | 0;
      let col = -1;
      if (k === T.Road) col = utilColor(sim.stats.trucks);
      else if (k === T.Yard) col = utilColor((sim.stock[i] + sim.stockExp[i]) / YARD_CAP_PER_TILE);
      else if (k === T.Reefer) col = utilColor(sim.stock[i] / YARD_CAP_PER_TILE);
      else if (k === T.Hazmat || k === T.Empty) col = utilColor(sim.stock[i] / sim.capAt(i));
      else if (k === T.Gate) col = utilColor(sim.stats.gate);
      else if (k === T.Rail) col = utilColor((sim.railAt(x, y)?.platform ?? 0) / RAIL_CAP);
      else if (k === T.Kai && sim.craneAt(x, y)) col = utilColor(sim.stats.crane);
      if (col >= 0) g.rect(x * TILE, y * TILE, TILE, TILE).fill({ color: col, alpha: 0.4 });
    }
  }

  private badge(g: Graphics, x: number, y: number, time: number) {
    const by = y + Math.sin(time * 5) * 1.6;
    g.circle(x, by, 8.2).fill(0xffffff);
    g.circle(x, by, 6.8).fill(C.bad);
    g.roundRect(x - 1.2, by - 4.3, 2.4, 5.2, 1).fill(0xffffff);
    g.circle(x, by + 3.2, 1.3).fill(0xffffff);
  }

  private drawDyn(sim: Sim, view: View, a: number) {
    const g = this.dyn;
    g.clear();

    // Festmacherleinen
    for (const s of sim.ships) {
      if (s.state !== 'unloading' || s.berthX < 0) continue;
      const rope = { width: 1.1, color: 0xe9e3cf, alpha: 0.9 };
      const [ox, oy] = OUT[sideOf(s.berthX)];
      for (const [q, shift] of [
        [s.berthX, 6],
        [s.berthX + s.len - 1, -6],
      ] as const) {
        const t = qTile(q);
        if (!t) continue;
        // Poller an der Kaikante, Klampe an Deck etwas weiter draußen
        const bx = (t[0] + 0.5) * TILE + ox * 11.4;
        const by = (t[1] + 0.5) * TILE + oy * 11.4;
        const along = [Math.abs(oy), Math.abs(ox)];
        g.moveTo(bx + ox * 22 + along[0] * shift, by + oy * 22 + along[1] * shift).lineTo(bx, by).stroke(rope);
      }
    }

    // Stau: Felder, auf denen Trucks zuletzt warten mussten, färben sich rot
    for (let i = COAST_ROW * GRID_W; i < sim.roadJam.length; i++) {
      const j = sim.roadJam[i];
      if (view.calm || j < 1.2 || sim.kind[i] !== T.Road) continue;
      g.rect((i % GRID_W) * TILE, ((i / GRID_W) | 0) * TILE, TILE, TILE).fill({ color: C.bad, alpha: Math.min(0.42, 0.1 + j * 0.035) });
    }

    // Gates: wartende Container, Schranke, Ampel
    for (const gt of sim.gates) {
      const lanes = Math.max(gt.w, gt.h);
      if (gt.h > gt.w) g.setTransform(0, 1, -1, 0, gt.x * TILE + TILE, gt.y * TILE);
      else g.setTransform(1, 0, 0, 1, gt.x * TILE, gt.y * TILE);
      const px = 0;
      const py = 0;
      for (let k = 0; k < gt.apron.length; k++) {
        const bx = px + 3.5 + k * 6.4;
        g.roundRect(bx + 0.8, py + 22.3, 5.4, 7.4, 0.8).fill({ color: 0x000000, alpha: 0.3 });
        g.roundRect(bx, py + 21.5, 5.4, 7.4, 0.8).fill(gt.apron[k] >= 100000 ? REEFER_BOX : BOX[(gt.id + k) % BOX.length]);
      }
      // Angekommener Export wartet oben am Gate auf einen Truck
      for (let k = 0; k < gt.inApron; k++) {
        g.roundRect(px + 2.5 + k * 6.8, py - 4.5, 5.8, 5.8, 1).fill(0xffffff);
        g.roundRect(px + 3.2 + k * 6.8, py - 3.8, 4.4, 4.4, 0.7).fill(EXPORT_BOX);
      }
      const open = gt.proc > 0;
      for (let lane = 0; lane < lanes; lane++) {
        const lx = px + lane * TILE;
        if (open) {
          g.rect(lx + 4, py + 17.5, 2, 4).fill(C.white);
        } else {
          g.rect(lx + 4, py + 18.5, 24, 1.8).fill(0xd9473f);
          for (let i = 0; i < 3; i++) g.rect(lx + 8 + i * 8, py + 18.5, 4, 1.8).fill(C.white);
        }
      }
      g.circle(px + lanes * TILE - 5.5, py + 10.5, 1.8).fill(open ? 0x3fe08a : 0xff5a4a);
      g.resetTransform();
    }

    // Verarbeitung: links wartender Eingang, rechts fertiger Ausgang, Lampe zeigt Arbeit
    for (const p of sim.plants) {
      const px = p.x * TILE;
      const py = (p.y + p.h - 1) * TILE;
      const cin = p.kind === 'pack' ? WARE_BOX : p.kind === 'cold' ? REEFER_BOX : 0x3b7fc8;
      const cout = p.kind === 'pack' ? PREM_BOX : p.kind === 'cold' ? FOOD_BOX : WARE_BOX;
      for (let k = 0; k < Math.min(3, p.inBuf); k++) g.rect(px + 5 + k * 3.4, py + 25.4, 2.8, 3.6).fill(cin);
      for (let k = 0; k < Math.min(3, p.outBuf); k++) g.rect(px + 24.2 - k * 3.4, py + 25.4, 2.8, 3.6).fill(cout);
      g.circle(p.x * TILE + 9, p.y * TILE + 9, 2.6).fill(p.proc > 0 ? (Math.sin(view.time * 8 + p.id) > 0 ? 0x3fe08a : 0x1f8f55) : p.outBuf >= 6 ? 0xff5a4a : 0x9aa5b1);
    }

    // Gleisanschluss: Füllstand des Bahnsteigs
    for (const r of sim.rails) {
      const px = r.x * TILE;
      const py = r.y * TILE;
      const u = Math.min(1, r.platform / RAIL_CAP);
      g.roundRect(px + 3, py + 12.2, 26, 3.6, 1.8).fill({ color: 0x1d2a3a, alpha: 0.55 });
      if (u > 0) g.roundRect(px + 3, py + 12.2, Math.max(3.6, 26 * u), 3.6, 1.8).fill(u >= 1 ? C.bad : C.good);
      g.circle(px + 25, py + 6.5, 1.8).fill(r.state === 'loading' ? 0x3fe08a : r.state === 'away' ? 0x9aa5b1 : 0xffb020);
    }

    // Hinweise, wo das aktive Werkzeug bauen kann
    if (view.tool === 'kai') {
      for (let i = 0; i < sim.kind.length; i++) {
        const x = i % GRID_W;
        const y = (i / GRID_W) | 0;
        if (sim.kind[i] === T.Land && sim.kaiSpot(x, y)) {
          g.rect(x * TILE + 1.5, y * TILE + 1.5, TILE - 3, TILE - 3).stroke({ width: 1.5, color: 0xffffff, alpha: 0.5 + 0.2 * Math.sin(view.time * 4) });
        }
      }
    } else if (view.tool === 'dredge') {
      for (let q = 0; q < Q_MAX; q++) {
        const t = qTile(q);
        if (!t || sim.depth[q] || !sim.kaiSpot(t[0], t[1]) && sim.kind[t[1] * GRID_W + t[0]] !== T.Kai) continue;
        const r = this.channelRect(q)!;
        g.rect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3).stroke({ width: 1.5, color: 0xffffff, alpha: 0.4 + 0.2 * Math.sin(view.time * 4) });
      }
    } else if (view.tool === 'buyland') {
      for (let x = 0; x < GRID_W; x += PLOT_W) {
        if (sim.owned[x]) continue;
        g.rect(x * TILE + 3, COAST + 3, PLOT_W * TILE - 6, H - COAST - 6).stroke({ width: 2.5, color: 0xffffff, alpha: 0.5 + 0.25 * Math.sin(view.time * 4) });
      }
    } else if (view.tool === 'oneway') {
      for (let i = 0; i < sim.kind.length; i++) {
        if (sim.kind[i] !== T.Road) continue;
        g.rect((i % GRID_W) * TILE + 1.5, ((i / GRID_W) | 0) * TILE + 1.5, TILE - 3, TILE - 3).stroke({ width: 1.2, color: 0xffffff, alpha: 0.4 });
      }
    } else if (view.tool === 'rail') {
      // Bahnhof: am rechten Rand oder am Ende eines durchgehenden Gleises
      for (let y = COAST_ROW; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (sim.kind[y * GRID_W + x] !== T.Land || (x !== GRID_W - 1 && !sim.trackToEdge(x + 1, y))) continue;
          g.rect(x * TILE + 1.5, y * TILE + 1.5, TILE - 3, TILE - 3).stroke({ width: 1.5, color: 0xffffff, alpha: 0.5 + 0.2 * Math.sin(view.time * 4) });
        }
      }
    } else if (view.tool === 'crane') {
      for (let i = 0; i < sim.kind.length; i++) {
        const x = i % GRID_W;
        const y = (i / GRID_W) | 0;
        if (sim.kind[i] === T.Kai && !sim.craneAt(x, y)) {
          g.rect(x * TILE + 2.5, y * TILE + 2.5, TILE - 5, TILE - 5).stroke({ width: 1.5, color: 0xffffff, alpha: 0.55 + 0.2 * Math.sin(view.time * 4) });
        }
      }
    }

    // Portalkräne: Schienen über den Block, Brücke fährt langsam hin und her
    for (const r of sim.rtgs) {
      const x0 = (r.x - 1) * TILE + 2;
      const x1 = (r.x + 2) * TILE - 2;
      const y0 = (r.y - 1) * TILE + 3;
      const y1 = (r.y + 2) * TILE - 3;
      const rail = { color: 0x3a424c, alpha: 0.7 };
      g.rect(x0, y0, x1 - x0, 2).fill(rail);
      g.rect(x0, y1 - 2, x1 - x0, 2).fill(rail);
      const bxp = r.x * TILE + 16 + Math.sin(view.time * 0.7 + r.id) * TILE * (r.staffed ? 0.9 : 0);
      g.rect(bxp - 6, y0 - 2, 12, y1 - y0 + 4).fill({ color: 0x000000, alpha: 0.18 });
      g.roundRect(bxp - 7, y0 - 3, 4, y1 - y0 + 6, 1.5).fill(0xf2a030);
      g.roundRect(bxp + 3, y0 - 3, 4, y1 - y0 + 6, 1.5).fill(0xf2a030);
      g.roundRect(bxp - 7, y0 - 3, 14, 6, 1.5).fill(0xe0892a);
      g.roundRect(bxp - 7, y1 - 3, 14, 6, 1.5).fill(0xe0892a);
      const ty = (y0 + y1) / 2 + Math.cos(view.time * 1.1 + r.id) * TILE * (r.staffed ? 0.8 : 0);
      g.roundRect(bxp - 5, ty - 4, 10, 8, 1.5).fill(0x2b323b);
      g.circle(bxp, y0, 1.6).fill(r.staffed ? 0x3fe08a : 0xff5a4a);
    }

    // Kräne mit Zone: farbiger Balken am Fuß
    for (const c of sim.cranes) {
      if (!c.zone) continue;
      g.roundRect(c.x * TILE + 3, c.y * TILE + TILE - 4, (c.big ? 2 : 1) * TILE - 6, 4, 2).fill(ZONES[c.zone].color);
    }

    // Ausgefallene Geräte: Schraubenschlüssel-Zeichen, abgenutzte Geräte: kleiner gelber Punkt
    const wrench = (x: number, y: number) => {
      const by = y + Math.sin(view.time * 4) * 1.4;
      g.circle(x, by, 8).fill(0xffffff);
      g.circle(x, by, 6.6).fill(0x2b323b);
      g.rect(x - 3.6, by - 0.9, 7.2, 1.8).fill(0xf2c230);
      g.circle(x - 3.6, by, 1.7).fill(0xf2c230);
      g.circle(x + 3.6, by, 1.7).fill(0xf2c230);
    };
    for (const t of sim.trucks) {
      const cx = (t.px + (t.fx - t.px) * a + 0.5) * TILE;
      const cy = (t.py + (t.fy - t.py) * a + 0.5) * TILE;
      if (t.wear >= 1) wrench(cx, cy - 13);
      else if (t.wear > 0.75) g.circle(cx + 9, cy - 8, 2.6).fill(C.warn);
    }
    for (const c of sim.cranes) {
      if (c.wear >= 1) wrench(c.x * TILE + 16, c.y * TILE - 8);
      else if (c.wear > 0.75) g.circle(c.x * TILE + 27, c.y * TILE + 4, 2.8).fill(C.warn);
    }
    for (const sh of sim.shops) {
      if (!sh.target) continue;
      const o = sh.target.kind === 'crane' ? sim.cranes.find((c) => c.id === sh.target!.id) : sim.trucks.find((t) => t.id === sh.target!.id);
      if (!o) continue;
      const tx = 'fx' in o ? (o.fx + 0.5) * TILE : (o.x + 0.5) * TILE;
      const ty = 'fy' in o ? (o.fy + 0.5) * TILE : (o.y + 0.5) * TILE;
      g.moveTo(sh.x * TILE + 16, sh.y * TILE + 16).lineTo(tx, ty).stroke({ width: 1.5, color: 0xf2c230, alpha: 0.5 + 0.3 * Math.sin(view.time * 6) });
    }

    // Warnzeichen an der Stufe, die bremst
    const b = sim.bottleneck();
    if (b === 'crane') {
      for (const c of sim.cranes) if (c.state === 'working') this.badge(g, c.x * TILE + 27, c.y * TILE - 2, view.time);
    } else if (b === 'gate') {
      for (const gt of sim.gates) this.badge(g, gt.x * TILE + 27, gt.y * TILE + 1, view.time);
    } else if (b === 'yard') {
      const first = sim.yardTileList[0];
      if (first !== undefined) this.badge(g, (first % GRID_W) * TILE + 4, ((first / GRID_W) | 0) * TILE + 2, view.time);
    } else if (b === 'trucks') {
      for (const t of sim.trucks) {
        if (t.id % 3 === 0) this.badge(g, (t.px + (t.fx - t.px) * a + 0.5) * TILE + 10, (t.py + (t.fy - t.py) * a + 0.5) * TILE - 11, view.time);
      }
    }

    // Kurze Ringe nach Bau und Abriss
    for (const p of this.pops) {
      const u = p.age / 0.32;
      const grow = u * 5;
      g.roundRect(p.x - grow, p.y - grow, TILE + grow * 2, TILE + grow * 2, 3 + grow).stroke({ width: 2.5, color: p.color, alpha: (1 - u) * 0.95 });
      g.rect(p.x, p.y, TILE, TILE).fill({ color: p.color, alpha: (1 - u) * 0.35 });
    }

    if (view.rect) {
      const r = view.rect;
      const x0 = Math.min(r.x0, r.x1) * TILE;
      const y0 = Math.min(r.y0, r.y1) * TILE;
      const w = (Math.abs(r.x1 - r.x0) + 1) * TILE;
      const h = (Math.abs(r.y1 - r.y0) + 1) * TILE;
      g.rect(x0, y0, w, h).fill({ color: C.accent, alpha: 0.14 });
      g.rect(x0, y0, w, h).stroke({ width: 2, color: C.accent });
      for (const t of sim.trucks) {
        const tx = t.tile % GRID_W;
        const ty = (t.tile / GRID_W) | 0;
        if (tx * TILE < x0 || tx * TILE >= x0 + w || ty * TILE < y0 || ty * TILE >= y0 + h) continue;
        g.circle((t.fx + 0.5) * TILE, (t.fy + 0.5) * TILE, 13).stroke({ width: 2, color: 0xffffff });
      }
    }
    this.drawSites(g, sim, view.time);
    // Verkehr ins Hinterland: Speditions-Lkw fahren auf den Anschlussstraßen
    for (const e of sim.hinterlandExits()) {
      const ex = (e % GRID_W) * TILE;
      const ey = ((e / GRID_W) | 0) * TILE;
      const bottom = ((e / GRID_W) | 0) === GRID_H - 1;
      for (let k = 0; k < 3; k++) {
        const u = (view.time * 0.12 + k / 3 + (e % 7) * 0.13) % 1;
        const away = k % 2 === 0;
        const d = (away ? u : 1 - u) * 600;
        const col = BOX[(e + k) % BOX.length];
        if (bottom) {
          const tx = ex + (away ? 18 : 6);
          const ty = ey + TILE + 10 + d;
          g.roundRect(tx, ty, 8, 20, 2).fill(col);
          g.roundRect(tx, away ? ty - 6 : ty + 20, 8, 6, 1.5).fill(0x2b323b);
        } else {
          const tx = ex - 30 - d;
          const ty = ey + (away ? 6 : 18);
          g.roundRect(tx, ty, 20, 8, 2).fill(col);
          g.roundRect(away ? tx - 6 : tx + 20, ty, 6, 8, 1.5).fill(0x2b323b);
        }
      }
    }
    // Rauch über arbeitenden Hallen und aus den Schornsteinen der Schiffe am Kai
    const puff = (px: number, py: number, seed: number, size: number) => {
      for (let k = 0; k < 4; k++) {
        const u = (view.time * 0.35 + k / 4 + seed * 0.37) % 1;
        const wind = Math.sin(seed + view.time * 0.3) * 6;
        g.circle(px + u * 16 + wind * u, py - u * 26, size * (0.5 + u * 0.9)).fill({ color: 0xe9edf1, alpha: 0.42 * (1 - u) });
      }
    };
    for (const p of sim.plants) if (p.proc > 0 && !p.build) puff((p.x + p.w - 0.5) * TILE - 6, p.y * TILE + 6, p.id, 4);
    for (const sh of sim.ships) {
      if (sh.state !== 'unloading') continue;
      const b = sim.shipBox(sh);
      puff((b.x + b.w * 0.5) * TILE, (b.y + b.h * 0.5) * TILE - 4, sh.id, 3.2);
    }
    if (!view.calm) this.drawWaitBars(g, sim, a);
    if (view.selected) this.drawSelection(g, sim, view.selected, a, view.time);

    // Bau-Vorschau
    if (view.hover && view.tool !== 'view') {
      const { ok } = view.hover;
      const x = view.tool === 'rtg' ? view.hover.x - 1 : view.hover.x;
      const y = view.tool === 'rtg' ? view.hover.y - 1 : view.hover.y;
      if (x >= 0 && y >= 0 && x < GRID_W && y < GRID_H) {
        const col = view.tool === 'demolish' || !ok ? C.bad : C.good;
        // Portalkran: 3 × 3 Felder um das angetippte Feld
        const rtg = view.tool === 'rtg';
        const [fw, fh] = rtg ? [3, 3] : view.size ? view.size : view.tool === 'paste' && view.bp ? [view.bp.w, view.bp.h] : view.tool === 'hwy' ? (sim.rot ? [2, 1] : [1, 2]) : dimsOf(view.tool, sim.rot);
        // Festgesetzte Vorschau pulsiert und hat einen dicken Rahmen mit Eckmarken
        const pulse = view.ghost ? 0.5 + 0.25 * Math.sin(view.time * 6) : 0.38;
        g.roundRect(x * TILE, y * TILE, fw * TILE, fh * TILE, 3).fill({ color: col, alpha: pulse });
        g.roundRect(x * TILE + 1, y * TILE + 1, fw * TILE - 2, fh * TILE - 2, 3).stroke({ width: view.ghost ? 3 : 2, color: 0xffffff, alpha: 0.95 });
        if (view.ghost) {
          for (const [cx, cy] of [[x, y], [x + fw, y], [x, y + fh], [x + fw, y + fh]]) g.circle(cx * TILE, cy * TILE, 4.5).fill(0xffffff).stroke({ width: 1.5, color: ok ? C.good : C.bad });
        }
        // Blaupause: jedes Teil als Farbfläche
        if (view.tool === 'paste' && view.bp) {
          const col: Record<string, number> = { kai: 0xb8b2a3, road: 0x59606a, road2: 0x4a5560, hwy: 0x2f6db0, yard: 0xc9b88a, reefer: 0x3b9bd6, hazard: 0xe8602c, emptyyard: 0x7d8da0, gate: 0xd9534f, unpack: 0xc98a3c, pack: 0x7a5cc7, cold: 0x3b9bd6, fill: 0x3f9a6b, workshop: 0x5b6b82, rtg: 0xf2a030, crane: 0xe2582c, lcrane: 0xe0a526 };
          for (const it of view.bp.items) {
            const [iw, ih] = dimsOf(it.tool, !!it.rot);
            g.rect((x + it.dx) * TILE + 3, (y + it.dy) * TILE + 3, iw * TILE - 6, ih * TILE - 6).fill({ color: col[it.tool] ?? 0x888888, alpha: 0.75 });
          }
        }
        // Autobahn: Fahrtrichtung der beiden Spuren andeuten
        if (view.tool === 'hwy') {
          const ar = (ax: number, ay: number, dx: number, dy: number) => g.poly([ax + dx * 7, ay + dy * 7, ax - dx * 3 - dy * 5, ay - dy * 3 + dx * 5, ax - dx * 3 + dy * 5, ay - dy * 3 - dx * 5]).fill({ color: 0xffffff, alpha: 0.9 });
          if (sim.rot) { ar((x + 0.5) * TILE, (y + 0.5) * TILE, 0, 1); ar((x + 1.5) * TILE, (y + 0.5) * TILE, 0, -1); }
          else { ar((x + 0.5) * TILE, (y + 0.5) * TILE, -1, 0); ar((x + 0.5) * TILE, (y + 1.5) * TILE, 1, 0); }
        }
        if (view.tool === 'crane' && ok) {
          g.roundRect(x * TILE + 11.5, y * TILE - 60, 9, 82, 1.5).fill({ color: 0xffffff, alpha: 0.35 });
        }
        if (view.tool === 'dredge' && ok) {
          const r = this.channelRect(qOfWater(x, y));
          if (r) g.rect(r.x, r.y, r.w, r.h).fill({ color: 0x0c3560, alpha: 0.45 });
        }
      }
    }
  }

  private drawDynLights(sim: Sim, a: number) {
    const nf = this.nightF;
    this.dynLights.visible = nf > 0.02;
    if (!this.dynLights.visible) return;
    this.dynLights.alpha = nf;
    let n = 0;
    const use = (x: number, y: number, r: number, color: number, alpha: number) => {
      let sp = this.dynGlows[n];
      if (!sp) {
        sp = this.glow(0, 0, 1, 0xffffff, 1);
        this.dynGlows.push(sp);
        this.dynLights.addChild(sp);
      }
      n++;
      sp.visible = true;
      sp.position.set(x, y);
      sp.scale.set(r / 32);
      sp.tint = color;
      sp.alpha = alpha;
    };
    for (const s of sim.ships) {
      const b = sim.shipBox(s);
      const cx = (s.px + (s.x - s.px) * a + b.w / 2) * TILE;
      const cy = (s.py + (s.y - s.py) * a + b.h / 2) * TILE;
      const dx = Math.cos(s.rot);
      const dy = Math.sin(s.rot);
      const L = s.len * TILE;
      use(cx - dx * (L / 2 - 15), cy - dy * (L / 2 - 15), 44, 0xffe2b0, 0.4);
      use(cx + dx * (L / 2 - 9) + dy * 7, cy + dy * (L / 2 - 9) - dx * 7, 10, 0xff4a3d, 0.8);
      use(cx + dx * (L / 2 - 9) - dy * 7, cy + dy * (L / 2 - 9) + dx * 7, 10, 0x3fe08a, 0.8);
    }
    for (const t of sim.trucks) {
      const cx = (t.px + (t.fx - t.px) * a + 0.5) * TILE;
      const cy = (t.py + (t.fy - t.py) * a + 0.5) * TILE;
      const r = this.trucks.get(t.id)?.rot ?? t.angle;
      use(cx + Math.cos(r) * 24, cy + Math.sin(r) * 24, 30, 0xffedc0, 0.38);
    }
    for (let i = n; i < this.dynGlows.length; i++) this.dynGlows[i].visible = false;
  }

  private updateFx(dt: number) {
    for (const p of this.pops) p.age += dt;
    this.pops = this.pops.filter((p) => p.age < 0.32);
    for (const f of this.floats) {
      f.age += dt;
      const u = f.age / 1.25;
      f.text.position.set(f.x, f.y - 30 * (1 - (1 - u) * (1 - u)));
      f.text.alpha = u < 0.65 ? 1 : Math.max(0, 1 - (u - 0.65) / 0.35);
      f.text.scale.set(u < 0.12 ? 0.6 + (u / 0.12) * 0.5 : 1.1 - Math.min(0.1, (u - 0.12) * 0.5));
    }
    this.floats = this.floats.filter((f) => {
      if (f.age < 1.25) return true;
      f.text.destroy();
      return false;
    });
  }

  /** Baustellen: gelb-schwarzer Bauzaun, blinkende Warnlampen, Fortschrittsbalken */
  private drawSites(g: Graphics, sim: Sim, time: number) {
    const site = (x: number, y: number, w: number, h: number, e: { build?: number; buildMax?: number }, fill: boolean) => {
      if (!e.build) return;
      const px = x * TILE;
      const py = y * TILE;
      const W = w * TILE;
      const H = h * TILE;
      if (fill) {
        g.rect(px + 2, py + 2, W - 4, H - 4).fill({ color: 0xd8cfb8, alpha: 0.85 });
        // Fundament und Gerüst wachsen mit dem Fortschritt
        const u = 1 - e.build / Math.max(1, e.buildMax ?? e.build);
        const rows = Math.max(1, Math.floor(u * (H - 8) / 6));
        for (let r = 0; r < rows; r++) g.rect(px + 5, py + H - 6 - r * 6, W - 10, 2).fill({ color: 0x8d7a5b, alpha: 0.8 });
        for (let cx = px + 6; cx < px + W - 4; cx += 12) g.rect(cx, py + H - 6 - rows * 6, 1.6, rows * 6).fill({ color: 0x6b5a40, alpha: 0.8 });
      }
      // Bauzaun mit wanderndem Streifenmuster
      const off = (time * 12) % 8;
      for (let k = -off; k < W; k += 8) {
        const a0 = Math.max(0, k);
        const a1 = Math.min(W, k + 4);
        if (a1 > a0) {
          g.rect(px + a0, py, a1 - a0, 2.5).fill(0xf2c230);
          g.rect(px + a0, py + H - 2.5, a1 - a0, 2.5).fill(0xf2c230);
        }
      }
      for (let k = -off; k < H; k += 8) {
        const a0 = Math.max(0, k);
        const a1 = Math.min(H, k + 4);
        if (a1 > a0) {
          g.rect(px, py + a0, 2.5, a1 - a0).fill(0xf2c230);
          g.rect(px + W - 2.5, py + a0, 2.5, a1 - a0).fill(0xf2c230);
        }
      }
      const blink = Math.sin(time * 6) > 0;
      for (const [lx, ly] of [
        [px + 2, py + 2],
        [px + W - 2, py + H - 2],
      ]) {
        g.circle(lx, ly, 2.6).fill(blink ? 0xffb020 : 0x7a5a10);
      }
      // Fortschritt
      const u = 1 - e.build / Math.max(1, e.buildMax ?? e.build);
      const bw = Math.min(W - 8, 48);
      const bx = px + W / 2 - bw / 2;
      const by = py + H / 2 - 3;
      g.roundRect(bx - 1.5, by - 1.5, bw + 3, 8, 3).fill({ color: 0xffffff, alpha: 0.92 });
      g.roundRect(bx, by, bw, 5, 2).fill(0x2a3442);
      g.roundRect(bx, by, Math.max(5, bw * u), 5, 2).fill(0xf2c230);
    };
    for (const e of sim.gates) site(e.x, e.y, e.w, e.h, e, true);
    for (const e of sim.plants) site(e.x, e.y, e.w, e.h, e, true);
    for (const e of sim.shops) site(e.x, e.y, e.w, e.h, e, true);
    for (const e of sim.rails) site(e.x, e.y, 1, 1, e, true);
    for (const e of sim.rtgs) site(e.x, e.y, 1, 1, e, false);
    for (const c of sim.cranes) {
      const t2 = c.big ? qTile(c.q + 1) : null;
      const x0 = Math.min(c.x, t2 ? t2[0] : c.x);
      const y0 = Math.min(c.y, t2 ? t2[1] : c.y);
      site(x0, y0, t2 && t2[0] !== c.x ? 2 : 1, t2 && t2[1] !== c.y ? 2 : 1, c, false);
    }
    for (const t of sim.trucks) {
      if (!t.build) continue;
      const cx = (t.fx + 0.5) * TILE;
      const cy = (t.fy + 0.5) * TILE;
      g.circle(cx, cy - 16, 7).fill(0xffffff);
      g.circle(cx, cy - 16, 5.5).fill(0x5b6b82);
      g.rect(cx - 3, cy - 17, 6, 2).fill(0xffffff);
    }
  }

  /** Wartebalken: Schiffe auf Reede (Geduld), am Kai (zugesagte Liegezeit), Trucks im Stau */
  private drawWaitBars(g: Graphics, sim: Sim, a: number) {
    const bar = (cx: number, top: number, w: number, u: number, col: number) => {
      const h = 4.5;
      g.roundRect(cx - w / 2 - 1.5, top - 1.5, w + 3, h + 3, 3).fill({ color: 0xffffff, alpha: 0.92 });
      g.roundRect(cx - w / 2, top, w, h, 2).fill(0x2a3442);
      g.roundRect(cx - w / 2, top, Math.max(h, w * Math.min(1, u)), h, 2).fill(col);
    };
    const patience = SHIP_PATIENCE_GM * DIFFS[sim.diff].patience;
    for (const s of sim.ships) {
      let u = -1;
      if (s.state === 'queued' && s.queuedFor > 0) u = s.queuedFor / patience;
      else if (s.state === 'unloading') u = s.atBerth / Math.max(1, s.dwellTarget);
      if (u < 0) continue;
      const b = sim.shipBox(s);
      const x = (s.px + (s.x - s.px) * a + b.w / 2) * TILE;
      const y = (s.py + (s.y - s.py) * a) * TILE;
      bar(x, y - 22, Math.min(64, b.w * TILE - 20), u, u < 0.6 ? C.good : u < 0.9 ? C.warn : C.bad);
    }
    for (const t of sim.trucks) {
      if (t.stuck < 0.6) continue;
      const cx = (t.px + (t.fx - t.px) * a + 0.5) * TILE;
      const cy = (t.py + (t.fy - t.py) * a + 0.5) * TILE;
      const u = t.stuck / TRUCK_PATIENCE_GM;
      bar(cx, cy - 20, 20, u, u < 0.5 ? C.warn : C.bad);
    }
  }

  private drawSelection(g: Graphics, sim: Sim, sel: NonNullable<View['selected']>, a: number, time: number) {
    let x = 0;
    let y = 0;
    let w = TILE;
    let h = TILE;
    if (sel.kind === 'ship') {
      const s = sim.ships.find((s) => s.id === sel.id);
      if (!s) return;
      const b = sim.shipBox(s);
      x = (s.px + (s.x - s.px) * a) * TILE + (b.w === 2 ? 3 : 0);
      y = (s.py + (s.y - s.py) * a) * TILE + (b.h === 2 ? 3 : 0);
      w = b.w * TILE - (b.w === 2 ? 6 : 0);
      h = b.h * TILE - (b.h === 2 ? 6 : 0);
    } else if (sel.kind === 'crane') {
      const c = sim.cranes.find((c) => c.id === sel.id);
      if (!c) return;
      const up = c.big ? 70 : 60;
      const t2 = c.big ? qTile(c.q + 1) : null;
      const xs = [c.x, t2 ? t2[0] : c.x];
      const ys = [c.y, t2 ? t2[1] : c.y];
      x = Math.min(...xs) * TILE;
      y = Math.min(...ys) * TILE;
      w = (Math.max(...xs) + 1) * TILE - x;
      h = (Math.max(...ys) + 1) * TILE - y;
      // Der Ausleger ragt übers Wasser
      const [ox, oy] = OUT[sideOf(c.q)];
      if (ox < 0) x -= up;
      if (oy < 0) y -= up;
      w += Math.abs(ox) * up;
      h += Math.abs(oy) * up;
    } else if (sel.kind === 'gate') {
      const gt = sim.gates.find((gt) => gt.id === sel.id);
      if (!gt) return;
      x = gt.x * TILE;
      y = gt.y * TILE;
      w = gt.w * TILE;
      h = gt.h * TILE;
    } else if (sel.kind === 'plant') {
      const p = sim.plants.find((p) => p.id === sel.id);
      if (!p) return;
      x = p.x * TILE;
      y = p.y * TILE;
      w = p.w * TILE;
      h = p.h * TILE;
    } else if (sel.kind === 'shop') {
      const sh = sim.shops.find((q) => q.id === sel.id);
      if (!sh) return;
      x = sh.x * TILE;
      y = sh.y * TILE;
      w = sh.w * TILE;
      h = sh.h * TILE;
    } else if (sel.kind === 'rail') {
      const r = sim.rails.find((r) => r.id === sel.id);
      if (!r) return;
      x = r.x * TILE;
      y = r.y * TILE;
    } else if (sel.kind === 'yard' || sel.kind === 'reefer' || sel.kind === 'hazmat' || sel.kind === 'emptyyard' || sel.kind === 'kai') {
      x = (sel.id % GRID_W) * TILE;
      y = ((sel.id / GRID_W) | 0) * TILE;
    } else {
      const t = sim.trucks.find((t) => t.id === sel.id);
      if (!t) return;
      x = (t.px + (t.fx - t.px) * a) * TILE;
      y = (t.py + (t.fy - t.py) * a) * TILE;
    }
    const pulse = 3 + Math.sin(time * 5) * 1.2;
    g.roundRect(x - pulse, y - pulse, w + pulse * 2, h + pulse * 2, 6).stroke({ width: 3.5, color: C.accent, alpha: 0.95 });
    g.roundRect(x - pulse, y - pulse, w + pulse * 2, h + pulse * 2, 6).stroke({ width: 1.5, color: 0xffffff });
  }
}
