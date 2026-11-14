import { Application, Container, Graphics, Rectangle, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import { COAST_ROW, CRANE_BUFFER, CRANE_MOVE_GM, GRID_H, GRID_W, MIN_PER_DAY, SHIP_LEN, T, TICK_GM, TILE, YARD_CAP_PER_TILE } from '../sim/data';
import type { Crane, Ship, Sim, Truck } from '../sim/sim';

export interface View {
  overlay: boolean;
  tool: string;
  hover: { x: number; y: number; ok: boolean } | null;
  selected: { kind: 'ship' | 'crane' | 'gate' | 'yard' | 'truck'; id: number } | null;
  /** Anteil zwischen letztem und nächstem Tick (0..1) für weiche Bewegung. */
  alpha: number;
  /** Laufzeit in Sekunden (Echtzeit) für Animationen. */
  time: number;
  /** Dauer des letzten Frames in Sekunden. */
  dt: number;
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
  wake: Graphics;
  body: Container;
  cargo: Sprite[];
  alert: Graphics;
  filled: number;
}
interface TruckView {
  root: Container;
  load: Sprite[];
  n: number;
  rot: number;
}
interface CraneView {
  root: Container;
  trolley: Container;
  hook: Sprite;
  lamp: Graphics;
  buffer: Sprite[];
  n: number;
  pos: number;
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
  private yard = new Map<number, { sprites: Sprite[]; n: number }>();
  private floats: Float[] = [];
  private pops: Pop[] = [];
  private simRef: Sim | null = null;
  private version = -1;
  private heatTimer = 0;
  /** 0 = Tag, 1 = Nacht */
  private nightF = 0;

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
    this.drawBase();
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
    this.app.stage.addChild(this.world);
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

  private drawBase() {
    const g = this.base;
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
            // Kaimauer ragt ein Stück ins Wasser
            g.rect(px, py - 6, TILE, 7).fill(C.kaiWall);
            g.rect(px, py - 6, TILE, 1.5).fill(shade(C.kaiWall, 0.75));
            g.rect(px, py, TILE, TILE).fill(C.kai);
            g.rect(px, py, TILE, 2.5).fill(C.kaiCurb);
            g.rect(px, py + 8, TILE, 2).fill(C.yellow);
            g.rect(px + TILE - 0.6, py + 10, 1.2, TILE - 10).fill(C.kaiJoint);
            g.rect(px, py + TILE - 1, TILE, 1).fill(C.kaiJoint);
            // Kranschienen
            g.rect(px, py + 13, TILE, 1.4).fill(0x8b939c);
            g.rect(px, py + 20, TILE, 1.4).fill(0x8b939c);
            // Poller und Fender
            g.circle(px + 8, py + 4.6, 2.5).fill(C.bollard);
            g.circle(px + 24, py + 4.6, 2.5).fill(C.bollard);
            g.circle(px + 7.4, py + 4, 1).fill({ color: 0xffffff, alpha: 0.35 });
            g.circle(px + 23.4, py + 4, 1).fill({ color: 0xffffff, alpha: 0.35 });
            g.roundRect(px + 13, py - 8, 6, 6, 2.5).fill(0x20252c);
            if (!same(-1, 0)) g.rect(px, py - 6, 2, TILE + 6).fill(C.kaiWall);
            if (!same(1, 0)) g.rect(px + TILE - 2, py - 6, 2, TILE + 6).fill(C.kaiWall);
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
            const edge = { color: C.roadEdge, alpha: 0.85 };
            if (!n) g.rect(px, py + 1.5, TILE, 1.3).fill(edge);
            if (!s) g.rect(px, py + TILE - 2.8, TILE, 1.3).fill(edge);
            if (!w) g.rect(px + 1.5, py, 1.3, TILE).fill(edge);
            if (!e) g.rect(px + TILE - 2.8, py, 1.3, TILE).fill(edge);
            const horiz = w || e;
            const vert = n || s;
            if (horiz && !vert) {
              g.rect(px + 4, py + TILE / 2 - 1, 9, 2).fill(C.roadDash);
              g.rect(px + 20, py + TILE / 2 - 1, 9, 2).fill(C.roadDash);
            } else if (vert && !horiz) {
              g.rect(px + TILE / 2 - 1, py + 4, 2, 9).fill(C.roadDash);
              g.rect(px + TILE / 2 - 1, py + 20, 2, 9).fill(C.roadDash);
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
          case T.Gate: {
            g.rect(px, py, TILE, TILE).fill(C.road);
            g.rect(px + 1.5, py + 1.5, TILE - 3, TILE - 3).stroke({ width: 1.3, color: C.roadEdge, alpha: 0.85 });
            // Dach mit Schatten, darunter die Spur
            g.roundRect(px + 4.5, py + 7, 26, 13, 2).fill({ color: 0x000000, alpha: 0.25 });
            g.roundRect(px + 3, py + 4, 26, 13, 2).fill(C.white);
            g.rect(px + 3, py + 4, 26, 3).fill(0xd9473f);
            g.rect(px + 3, py + 14, 26, 3).fill(0xd9473f);
            for (let i = 0; i < 4; i++) g.rect(px + 6 + i * 6.5, py + 4, 3, 3).fill(C.white);
            g.roundRect(px + 12, py + 8, 8, 5, 1.2).fill(0x2f6db0);
            g.rect(px + 13.5, py + 9.2, 5, 1.6).fill(0xbfe1ff);
            break;
          }
        }
      }
    }
    // Rand des Baugebiets
    g.rect(0, COAST, W, H - COAST).stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
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
    }
    for (const c of sim.cranes) {
      const x = c.x * TILE + 16;
      const y = c.y * TILE;
      add(x, y - 56, 16, 0xff5a4a, 0.75);
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

  private syncYard(sim: Sim) {
    const tiles = new Set(sim.yardTileList);
    for (const [i, y] of this.yard) {
      if (!tiles.has(i)) {
        for (const s of y.sprites) s.destroy();
        this.yard.delete(i);
      }
    }
    for (const i of tiles) {
      if (this.yard.has(i)) continue;
      const px = (i % GRID_W) * TILE;
      const py = ((i / GRID_W) | 0) * TILE;
      const sprites: Sprite[] = [];
      for (let k = 0; k < YARD_CAP_PER_TILE; k++) {
        const s = this.box(this.boxV, BOX[hash(i, k) % BOX.length], px + 2.3 + (k % 3) * 9.4, py + 2.6 + Math.floor(k / 3) * 14);
        s.visible = false;
        this.yardLayer.addChild(s);
        sprites.push(s);
      }
      this.yard.set(i, { sprites, n: 0 });
    }
  }

  private hullPath(g: Graphics, inset: number): Graphics {
    const y0 = 7 + inset;
    const y1 = 57 - inset;
    const x0 = 3 + inset;
    const xb = 97 - inset * 0.5;
    const xt = 126 - inset * 2.2;
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
    const root = new Container();
    const wake = new Graphics();
    const body = new Container();
    const hull = new Graphics();
    // Schatten auf dem Wasser
    const shadow = new Graphics();
    this.hullPath(shadow, 0).fill({ color: 0x0a2440, alpha: 0.3 });
    shadow.position.set(4, 6);
    // Rumpf, Scheuerleiste, Deck
    this.hullPath(hull, 0).fill(shade(s.color, 0.62));
    this.hullPath(hull, 1.4).fill(s.color);
    this.hullPath(hull, 4).fill(C.steel);
    // Lukendeckel
    for (let c = 0; c < 8; c++) hull.roundRect(24 + c * 10, 11.2, 9.2, 41.6, 1).fill(0x4c5560);
    // Vorschiff: Ankerwinden und Mast
    hull.circle(110, 27, 2.2).fill(C.bollard);
    hull.circle(110, 37, 2.2).fill(C.bollard);
    hull.rect(113.5, 31, 5, 2).fill(0x8d96a0);
    hull.circle(119, 32, 1.4).fill(C.white);
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
    for (let c = 0; c < 8; c++) {
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
    alert.position.set(64, 2);
    alert.visible = false;

    root.addChild(wake, body, label, alert);
    return { root, wake, body, cargo, alert, filled: -1 };
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
      const filled = Math.ceil((s.containers / s.total) * v.cargo.length);
      if (filled !== v.filled) {
        for (let k = 0; k < v.cargo.length; k++) v.cargo[k].visible = k < filled;
        v.filled = filled;
      }
      const moving = Math.abs(s.x - s.px) + Math.abs(s.y - s.py) > 0.0005;
      v.wake.visible = moving;
      if (moving) {
        const g = v.wake;
        g.clear();
        for (let i = 0; i < 7; i++) {
          const wob = Math.sin(view.time * 5 + i * 1.3 + s.id) * 2.5;
          g.circle(-3 - i * 8, 32 + wob, 6.5 - i * 0.7).fill({ color: 0xffffff, alpha: 0.42 - i * 0.055 });
        }
        g.moveTo(122, 22).quadraticCurveTo(108, 6, 84, 2).stroke({ width: 2, color: 0xffffff, alpha: 0.35, cap: 'round' });
        g.moveTo(122, 42).quadraticCurveTo(108, 58, 84, 62).stroke({ width: 2, color: 0xffffff, alpha: 0.35, cap: 'round' });
      }
      // Leichtes Schaukeln am Liegeplatz
      v.body.position.y = moving ? 0 : Math.sin(view.time * 1.4 + s.id) * 0.5;
      v.alert.visible = s.blocked;
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
    g.roundRect(-13, -4.4, 19.5, 8.8, 1.4).fill(0x2f353e);
    g.rect(-12.2, -3.6, 17.9, 7.2).fill(0x8b949f);
    g.rect(-12.2, -0.4, 17.9, 0.8).fill(0x6d7681);
    const cab = CAB[t.id % CAB.length];
    g.roundRect(5.6, -5.4, 8, 10.8, 2.4).fill(shade(cab, 0.72));
    g.roundRect(6.2, -4.8, 6.8, 9.6, 2).fill(cab);
    g.roundRect(10.2, -3.8, 2.4, 7.6, 1).fill(0x22344b);
    g.rect(6.8, -3.6, 2.6, 7.2).fill(tint(cab, 0.3));
    root.addChild(g);
    const load: Sprite[] = [];
    for (let k = 0; k < 2; k++) {
      const s = this.box(this.boxH, BOX[hash(t.id, k + 40) % BOX.length], -12.4 + k * 8.9, -3.9, 0.96);
      s.visible = false;
      root.addChild(s);
      load.push(s);
    }
    return { root, load, n: 0, rot: t.angle };
  }

  private syncTrucks(sim: Sim, a: number, view: View) {
    const seen = new Set<number>();
    for (const t of sim.trucks) {
      seen.add(t.id);
      let v = this.trucks.get(t.id);
      if (!v) {
        v = this.makeTruck(t);
        this.trucks.set(t.id, v);
        this.truckLayer.addChild(v.root);
      }
      v.root.position.set((t.px + (t.fx - t.px) * a + 0.5) * TILE, (t.py + (t.fy - t.py) * a + 0.5) * TILE);
      // Weich in die neue Richtung drehen (kürzester Weg)
      let d = t.angle - v.rot;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      v.rot += d * Math.min(1, view.dt * 16);
      v.root.rotation = v.rot;
      if (t.load !== v.n) {
        for (let k = 0; k < v.load.length; k++) v.load[k].visible = k < t.load;
        v.n = t.load;
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
    root.position.set(c.x * TILE, c.y * TILE);
    const main = 0xe2582c;
    const dark = shade(main, 0.7);
    const light = tint(main, 0.35);

    // Schatten von Ausleger und Portal
    const shadow = new Graphics();
    shadow.rect(12, -60, 8, 82).fill({ color: 0x06182c, alpha: 0.22 });
    shadow.rect(1, 2, 30, 4.5).fill({ color: 0x06182c, alpha: 0.22 });
    shadow.rect(1, 15, 30, 4.5).fill({ color: 0x06182c, alpha: 0.22 });
    shadow.position.set(5, 7);

    const g = new Graphics();
    // Portal quer zum Ausleger, auf den Schienen
    g.roundRect(0.5, 1.5, 31, 5, 1.5).fill(dark);
    g.roundRect(0.5, 14.5, 31, 5, 1.5).fill(dark);
    g.rect(1.5, 2.3, 29, 1.6).fill(main);
    g.rect(1.5, 15.3, 29, 1.6).fill(main);
    for (const lx of [1, 27]) {
      g.roundRect(lx, 0.5, 4, 7, 1).fill(0x2b323b);
      g.roundRect(lx, 13.5, 4, 7, 1).fill(0x2b323b);
    }
    // Ausleger mit Fachwerk
    g.roundRect(11.5, -60, 9, 82, 1.5).fill(dark);
    g.rect(12.6, -59, 6.8, 80).fill(main);
    for (let y = -56; y < 18; y += 8) {
      g.moveTo(12.8, y)
        .lineTo(19.2, y + 4)
        .lineTo(12.8, y + 8)
        .stroke({ width: 0.9, color: light, alpha: 0.9 });
    }
    g.rect(15.2, -59, 1.6, 80).fill({ color: 0x2b323b, alpha: 0.55 });
    // Maschinenhaus
    g.roundRect(9.5, 6, 13, 9, 1.5).fill({ color: 0x000000, alpha: 0.2 });
    g.roundRect(8.5, 5, 13, 9, 1.5).fill(C.white);
    g.rect(9.5, 6, 11, 2).fill(0xcfd6dc);

    // Laufkatze mit Container am Haken
    const trolley = new Container();
    const tg = new Graphics();
    tg.roundRect(-6.5, -4.5, 13, 9, 1.5).fill(0x2b323b);
    tg.roundRect(-5, -3, 10, 6, 1).fill(0xf2c230);
    const hook = this.box(this.boxH, BOX[c.id % BOX.length], -4.5, -4, 1);
    hook.visible = false;
    trolley.addChild(hook, tg);
    trolley.position.set(16, 11);

    const lamp = new Graphics();
    lamp.circle(0, 0, 3.2).fill(0xffffff);
    lamp.position.set(16, -57);

    const buffer: Sprite[] = [];
    for (let k = 0; k < CRANE_BUFFER; k++) {
      const s = this.box(this.boxV, BOX[hash(c.id, k + 7) % BOX.length], 1.6 + k * 7.4, 21.6, 0.82);
      s.visible = false;
      buffer.push(s);
    }
    root.addChild(shadow, ...buffer, g, trolley, lamp);
    return { root, trolley, hook, lamp, buffer, n: 0, pos: 0 };
  }

  private syncCranes(sim: Sim, a: number, view: View) {
    const seen = new Set<number>();
    for (const c of sim.cranes) {
      seen.add(c.id);
      let v = this.cranes.get(c.id);
      if (!v) {
        v = this.makeCrane(c);
        this.cranes.set(c.id, v);
        this.craneLayer.addChild(v.root);
      }
      // Laufkatze: 0 = über dem Kai, 1 = über dem Schiff
      let target = 0;
      let carrying = false;
      if (c.state === 'working') {
        const u = Math.min(1, Math.max(0, 1 - (c.cd - a * TICK_GM) / CRANE_MOVE_GM));
        target = u < 0.5 ? u * 2 : 2 - u * 2;
        carrying = u >= 0.5;
        v.pos = target;
      } else {
        carrying = c.state === 'blocked';
        target = c.state === 'blocked' ? 0.35 : 0;
        v.pos += (target - v.pos) * Math.min(1, view.dt * 6);
      }
      const e = v.pos * v.pos * (3 - 2 * v.pos);
      v.trolley.position.y = 11 - e * 44;
      v.hook.visible = carrying;
      v.lamp.tint = c.state === 'working' ? 0x3fe08a : c.state === 'blocked' ? 0xffb020 : 0x9aa5b1;
      v.lamp.alpha = c.state === 'blocked' ? 0.45 + 0.55 * Math.abs(Math.sin(view.time * 5)) : 1;
      if (c.buffer !== v.n) {
        for (let k = 0; k < v.buffer.length; k++) v.buffer[k].visible = k < c.buffer;
        v.n = c.buffer;
      }
    }
    for (const [id, v] of this.cranes) {
      if (!seen.has(id)) {
        v.root.destroy({ children: true });
        this.cranes.delete(id);
      }
    }
  }

  // ───────────────────────── Zeichnen pro Frame ─────────────────────────

  draw(sim: Sim, view: View) {
    if (this.simRef !== sim) {
      this.resetViews();
      this.simRef = sim;
      this.version = -1;
    }
    if (this.version !== sim.version) {
      this.drawTerrain(sim);
      this.syncYard(sim);
      this.drawLights(sim);
      this.version = sim.version;
      this.heatTimer = 1;
    }
    const a = Math.max(0, Math.min(1, view.alpha));

    // Wasser
    this.waves.tilePosition.set(view.time * 7, Math.sin(view.time * 0.6) * 5);
    this.swell.tilePosition.set(-view.time * 3, view.time * 1.2);

    this.syncShips(sim, a, view);
    this.syncTrucks(sim, a, view);
    this.syncCranes(sim, a, view);
    for (const [i, y] of this.yard) {
      const n = sim.stock[i];
      if (n !== y.n) {
        for (let k = 0; k < y.sprites.length; k++) y.sprites[k].visible = k < n;
        y.n = n;
      }
    }

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
    this.birdLayer.visible = nf < 0.6;
    if (this.birdLayer.visible) {
      this.birdLayer.alpha = 1 - nf / 0.6;
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
      else if (k === T.Yard) col = utilColor(sim.stock[i] / YARD_CAP_PER_TILE);
      else if (k === T.Gate) col = utilColor(sim.stats.gate);
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
      if (s.state !== 'unloading') continue;
      const x = s.x * TILE;
      const y = s.y * TILE;
      const rope = { width: 1.1, color: 0xe9e3cf, alpha: 0.9 };
      g.moveTo(x + 9, y + 56).lineTo(x + 8, COAST + 4.6).stroke(rope);
      g.moveTo(x + 100, y + 56).lineTo(x + 120, COAST + 4.6).stroke(rope);
    }

    // Gates: wartende Container, Schranke, Ampel
    for (const gt of sim.gates) {
      const px = gt.x * TILE;
      const py = gt.y * TILE;
      for (let k = 0; k < gt.apron; k++) {
        const bx = px + 3.5 + k * 6.4;
        g.roundRect(bx + 0.8, py + 22.3, 5.4, 7.4, 0.8).fill({ color: 0x000000, alpha: 0.3 });
        g.roundRect(bx, py + 21.5, 5.4, 7.4, 0.8).fill(BOX[(gt.id + k) % BOX.length]);
      }
      const open = gt.proc > 0;
      if (open) {
        g.rect(px + 4, py + 17.5, 2, 4).fill(C.white);
      } else {
        g.rect(px + 4, py + 18.5, 24, 1.8).fill(0xd9473f);
        for (let i = 0; i < 3; i++) g.rect(px + 8 + i * 8, py + 18.5, 4, 1.8).fill(C.white);
      }
      g.circle(px + 26.5, py + 10.5, 1.8).fill(open ? 0x3fe08a : 0xff5a4a);
    }

    // Hinweise, wo das aktive Werkzeug bauen kann
    if (view.tool === 'kai') {
      for (let x = 0; x < GRID_W; x++) {
        if (sim.kind[COAST_ROW * GRID_W + x] === T.Land) {
          g.rect(x * TILE + 1.5, COAST + 1.5, TILE - 3, TILE - 3).stroke({ width: 1.5, color: 0xffffff, alpha: 0.5 + 0.2 * Math.sin(view.time * 4) });
        }
      }
    } else if (view.tool === 'crane') {
      for (let x = 0; x < GRID_W; x++) {
        if (sim.kind[COAST_ROW * GRID_W + x] === T.Kai && !sim.craneAt(x, COAST_ROW)) {
          g.rect(x * TILE + 2.5, COAST + 2.5, TILE - 5, TILE - 5).stroke({ width: 1.5, color: 0xffffff, alpha: 0.55 + 0.2 * Math.sin(view.time * 4) });
        }
      }
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

    if (view.selected) this.drawSelection(g, sim, view.selected, a, view.time);

    // Bau-Vorschau
    if (view.hover && view.tool !== 'view') {
      const { x, y, ok } = view.hover;
      if (x >= 0 && y >= 0 && x < GRID_W && y < GRID_H) {
        const col = view.tool === 'demolish' || !ok ? C.bad : C.good;
        g.roundRect(x * TILE, y * TILE, TILE, TILE, 3).fill({ color: col, alpha: 0.38 });
        g.roundRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2, 3).stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
        if (view.tool === 'crane' && ok) {
          g.roundRect(x * TILE + 11.5, y * TILE - 60, 9, 82, 1.5).fill({ color: 0xffffff, alpha: 0.35 });
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
      const x = (s.px + (s.x - s.px) * a) * TILE;
      const y = (s.py + (s.y - s.py) * a) * TILE;
      use(x + 15, y + 32, 44, 0xffe2b0, 0.4);
      use(x + 119, y + 25, 10, 0xff4a3d, 0.8);
      use(x + 119, y + 39, 10, 0x3fe08a, 0.8);
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

  private drawSelection(g: Graphics, sim: Sim, sel: NonNullable<View['selected']>, a: number, time: number) {
    let x = 0;
    let y = 0;
    let w = TILE;
    let h = TILE;
    if (sel.kind === 'ship') {
      const s = sim.ships.find((s) => s.id === sel.id);
      if (!s) return;
      x = (s.px + (s.x - s.px) * a) * TILE;
      y = (s.py + (s.y - s.py) * a) * TILE + 3;
      w = SHIP_LEN * TILE;
      h = 2 * TILE - 6;
    } else if (sel.kind === 'crane') {
      const c = sim.cranes.find((c) => c.id === sel.id);
      if (!c) return;
      x = c.x * TILE;
      y = c.y * TILE - 60;
      h = TILE + 60;
    } else if (sel.kind === 'gate') {
      const gt = sim.gates.find((gt) => gt.id === sel.id);
      if (!gt) return;
      x = gt.x * TILE;
      y = gt.y * TILE;
    } else if (sel.kind === 'yard') {
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
