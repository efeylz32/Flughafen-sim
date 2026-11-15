import { Sound } from './audio/sound';
import { Renderer, View } from './render/renderer';
import { BuildTool, DiffId, GRID_H, GRID_W, MapId, ProductId, Role, ROLE_NAMES, T, TICKS_PER_SEC, TILE, Tool, TruckRole } from './sim/data';
import { Progress } from './achievements';
import { CRANE_MODELS, DIFFS, dimsOf, MAPS, movesPerHour, sizeOf, TechId } from './sim/data';
import { buildDemo, buildShowcase } from './sim/demo';
import { setupScenario } from './sim/scenario-setup';
import { SCENARIOS } from './sim/scenarios';
import { GameEvent, Removed, Sim } from './sim/sim';
import type { UI } from './ui/ui';

import { latestSlot, loadSettings, readSlot, saveSettings, Settings, Slot, writeSlot } from './saves';
interface BpItem {
  dx: number;
  dy: number;
  tool: BuildTool;
  rot?: boolean;
  ow?: number;
}
export interface Blueprint {
  w: number;
  h: number;
  items: BpItem[];
}
const BP_KEY = 'hafen-imperium-blueprint';
const BP_ORDER: BuildTool[] = ['kai', 'road', 'road2', 'hwy', 'yard', 'reefer', 'hazard', 'emptyyard', 'gate', 'unpack', 'pack', 'cold', 'fill', 'workshop', 'rtg', 'crane', 'lcrane'];
function loadBp(): Blueprint | null {
  try {
    const raw = localStorage.getItem(BP_KEY);
    return raw ? (JSON.parse(raw) as Blueprint) : null;
  } catch {
    return null;
  }
}

export const PAINT_TOOLS: Tool[] = ['kai', 'road', 'road2', 'hwy', 'yard', 'reefer', 'hazard', 'emptyyard', 'dredge', 'zone', 'demolish'];

/** So lange (in Spielminuten) lässt sich eine Bauaktion rückgängig machen. */
const UNDO_WINDOW_GM = 240;
const UNDO_MAX = 60;

type UndoAction =
  | { kind: 'build'; tool: BuildTool; x: number; y: number; truckId?: number; prev?: { tier: number; ow: number } }
  | { kind: 'demolish'; removed: Removed[] }
  | { kind: 'upgrade'; what: 'crane' | 'truck'; id: number; x: number; y: number };
interface UndoGroup {
  gm: number;
  actions: UndoAction[];
}

export class Game {
  sim = new Sim();
  renderer = new Renderer();
  sound = new Sound();
  ui!: UI;
  /** 0 = Pause */
  speed = 1;
  lastSpeed = 1;
  tool: Tool = 'view';
  progress = new Progress();
  private achTimer = 0;
  /** Engpass-Färbung auf der Karte */
  overlay = false;
  selected: View['selected'] = null;
  hover: View['hover'] = null;
  /** Festgesetzte Vorschau: erst ein zweiter Klick baut wirklich */
  ghost: { x: number; y: number } | null = null;
  /** Kopierter Bauplan (bleibt im Browser gespeichert) */
  blueprint: Blueprint | null = loadBp();
  /** Aufgabe, die die Sammelzuweisung vergibt */
  assignRole: TruckRole = 'crane';
  /** Zone, die das Zonen-Werkzeug vergibt (0 = entfernen) */
  zonePick = 1;
  rect: View['rect'] = null;

  private acc = 0;
  private time = 0;
  private saveTimer = 0;
  settings: Settings = loadSettings();
  /** Läuft schon ein Spiel (neu gestartet oder geladen)? */
  inGame = false;
  /** Hauptmenü: Ein Schauhafen läuft im Hintergrund, die Kamera schwebt darüber */
  showcase = false;
  private undoStack: UndoGroup[] = [];
  private stroke: UndoGroup | null = null;
  /** Einnahmen pro Feld, die gesammelt als ein aufsteigender Text erscheinen */
  private pending = new Map<number, { x: number; y: number; amount: number; age: number }>();

  async start(host: HTMLElement) {
    await this.renderer.init(host);
    this.renderer.app.ticker.add((tk) => this.frame(tk.deltaMS / 1000));
    this.fitCamera();
  }

  private frame(dtSec: number) {
    dtSec = Math.min(dtSec, 0.1);
    this.time += dtSec;
    if (this.showcase) {
      // Drohnenflug: langsames Gleiten und leichtes Zoomen
      const t = this.time;
      const r = this.renderer;
      r.panBy(Math.cos(t * 0.11) * 30 * dtSec, Math.sin(t * 0.17) * 9 * dtSec);
      r.zoomAt(window.innerWidth / 2, window.innerHeight / 2, Math.exp(Math.cos(t * 0.07) * 0.018 * dtSec * 6));
    }
    if (this.speed > 0) {
      this.acc += dtSec * TICKS_PER_SEC * this.speed;
      let n = 0;
      while (this.acc >= 1 && n < 400) {
        this.sim.tick();
        this.acc -= 1;
        n++;
      }
      if (n >= 400) this.acc = 0;
    }
    for (const e of this.sim.drainEvents()) this.onEvent(e);
    this.flushPending(dtSec);
    this.pruneUndo();

    if (this.ghost) this.hover = { ...this.ghost, ok: this.previewOk(this.ghost.x, this.ghost.y) };
    this.renderer.draw(this.sim, {
      overlay: this.overlay,
      tool: this.tool,
      hover: this.hover,
      ghost: !!this.ghost,
      calm: this.showcase,
      bp: this.tool === 'paste' ? this.blueprint : null,
      selected: this.selected,
      alpha: this.speed > 0 ? this.acc : 1,
      time: this.time,
      dt: dtSec,
      rect: this.rect,
    });
    this.ui.update(dtSec);
    // Erfolge etwa einmal pro Sekunde prüfen
    if (!this.showcase) this.achTimer += dtSec;
    if (this.achTimer > 1) {
      this.achTimer = 0;
      for (const a of this.progress.check(this.sim)) {
        this.ui.toast(`Erfolg: ${a.name} – ${a.text}`, 'good');
        this.sound.play('mission');
      }
    }
    this.saveTimer += dtSec;
    if (this.saveTimer > 30) {
      this.saveTimer = 0;
      this.save();
    }
  }

  private onEvent(e: GameEvent) {
    if (this.showcase) return;
    if (e.text) this.ui.toast(e.text, e.kind);
    switch (e.tag) {
      case 'container': {
        this.sound.play('coin');
        if (e.x !== undefined && e.y !== undefined) this.addPending(e.x, e.y, e.amount ?? 0);
        break;
      }
      case 'export':
        this.sound.play('coin');
        if (e.x !== undefined && e.y !== undefined) this.addPending(e.x, e.y, e.amount ?? 0);
        break;
      case 'train':
        this.sound.play('train');
        if (e.x !== undefined && e.y !== undefined && e.amount) this.renderer.addFloat(e.x, e.y, `+${e.amount.toLocaleString('de-DE')} €`);
        break;
      case 'train-arrive':
        this.sound.play('train');
        break;
      case 'level':
        this.sound.play('level');
        this.ui.showLevelUp();
        break;
      case 'won': {
        this.sound.play('mission');
        const s = this.sim;
        const sc = SCENARIOS.find((x) => x.id === s.scenario);
        this.progress.addRecord({
          title: sc ? `Szenario: ${sc.name}` : `${DIFFS[s.diff].name} · ${MAPS[s.map].name}`,
          day: s.day,
          handled: s.handled,
          money: Math.round(s.money - s.loan),
          date: new Date().toISOString().slice(0, 10),
        });
        this.ui.showEnd();
        break;
      }
      case 'lost':
        this.sound.play('bad');
        this.ui.showEnd();
        break;
      case 'debt':
      case 'broken':
        this.sound.play('bad');
        break;
      case 'decision':
        this.sound.play('mission');
        this.ui.showDecision();
        break;
      case 'weather-warn':
        this.sound.play('bad');
        break;
      case 'weather-start':
        this.sound.play(this.sim.weather === 'storm' ? 'thunder' : 'foghorn');
        this.sound.setStorm(this.sim.weather === 'storm');
        break;
      case 'weather-end':
        this.sound.setStorm(false);
        break;
      case 'spoil':
        this.sound.play('bad');
        break;
      case 'contract':
        this.sound.play('mission');
        break;
      case 'ship-done':
        this.sound.play('shipDone');
        if (e.x !== undefined && e.y !== undefined) this.renderer.addFloat(e.x - 0.5, e.y, `+${(e.amount ?? 0).toLocaleString('de-DE')} €`);
        break;
      case 'ship-arrived':
        this.sound.play('horn');
        break;
      case 'ship-late':
      case 'ship-cancel':
        this.sound.play('bad');
        break;
      case 'mission':
        this.sound.play('mission');
        break;
      case 'day':
        this.save();
        this.sound.play('day');
        this.ui.showDayReport();
        break;
    }
  }

  private addPending(x: number, y: number, amount: number) {
    const key = y * GRID_W + x;
    const p = this.pending.get(key);
    if (p) p.amount += amount;
    else this.pending.set(key, { x, y, amount, age: 0 });
  }

  private flushPending(dt: number) {
    for (const [key, p] of this.pending) {
      p.age += dt;
      if (p.age < 0.7) continue;
      this.renderer.addFloat(p.x, p.y, `+${p.amount.toLocaleString('de-DE')} €`);
      this.pending.delete(key);
    }
  }

  // ───────────────────────── Zustand ─────────────────────────

  setSpeed(s: number) {
    if (s > 0) this.lastSpeed = s;
    this.speed = s;
    this.ui.refreshSpeed();
  }
  togglePause() {
    this.setSpeed(this.speed === 0 ? this.lastSpeed : 0);
  }
  setTool(t: Tool) {
    this.tool = t;
    this.ghost = null;
    this.hover = null;
    this.ui.refreshTools();
  }
  overhaulSelected() {
    const sel = this.selected;
    if (!sel || (sel.kind !== 'crane' && sel.kind !== 'truck')) return;
    const r = this.sim.overhaul(sel.kind, sel.id);
    if (!r.ok) return this.fail(r.reason ?? 'Nicht möglich');
    this.sound.play('upgrade');
    this.ui.toast('Generalüberholung läuft. Das Gerät ist eine Weile außer Betrieb.', 'good');
  }
  prioritizeShip(id: number) {
    const r = this.sim.prioritize(id);
    if (!r.ok) return this.fail(r.reason ?? 'Nicht möglich');
    this.sound.play('upgrade');
  }
  trainRole(role: Role) {
    const r = this.sim.train(role);
    if (!r.ok) return this.fail(r.reason ?? 'Nicht möglich');
    this.sound.play('upgrade');
  }
  buyTech(id: TechId) {
    const r = this.sim.buyTech(id);
    if (!r.ok) return this.fail(r.reason ?? 'Nicht möglich');
    this.sound.play('upgrade');
  }
  /** Dreht das nächste Gebäude (Breite und Höhe tauschen) */
  rotate() {
    const [w, h] = sizeOf(this.tool);
    if (w === h && this.tool !== 'hwy') return;
    this.sim.rot = !this.sim.rot;
    this.hover = null;
    this.ui.refreshTools();
  }
  toggleOverlay() {
    this.overlay = !this.overlay;
    this.ui.refreshOverlay();
  }
  toggleSound() {
    this.sound.toggle();
    this.sound.play('click');
    this.ui.refreshSound();
  }

  /** Startet ein Szenario mit fester Ausgangslage und eigenem Ziel. */
  newScenario(id: string) {
    this.sim = setupScenario(id, Math.floor(Math.random() * 1e9));
    this.resetTransient();
    this.setTool('view');
    this.setSpeed(1);
    this.inGame = true;
    this.fitCamera();
    this.save();
  }

  setProduct(plantId: number, p: ProductId) {
    this.sim.setProduct(plantId, p);
    this.sound.play('click');
  }

  newGame(mode: 'empty' | 'demo', diff: DiffId = 'normal', map: MapId = 'coast') {
    // Der Demo-Hafen ist für die Küste gebaut
    this.sim = new Sim(Math.floor(Math.random() * 1e9), diff, mode === 'demo' ? 'coast' : map);
    if (mode === 'demo') buildDemo(this.sim);
    this.sim.limitLand();
    this.resetTransient();
    this.setTool('view');
    this.setSpeed(1);
    this.inGame = true;
    this.fitCamera();
    this.save();
  }

  /** Sandbox: Startgeld frei wählbar, alle Werkzeuge, keine Frist und keine Pleite */
  newSandbox(money: number, map: MapId = 'coast') {
    this.sim = new Sim(Math.floor(Math.random() * 1e9), 'easy', map);
    this.sim.sandbox = true;
    this.sim.status = 'free';
    this.sim.level = 5;
    this.sim.money = money;
    this.sim.mission = 30;
    this.sim.limitLand();
    this.sim.owned.fill(1);
    this.sim.nextShipIn = 5;
    this.resetTransient();
    this.setTool('view');
    this.setSpeed(1);
    this.inGame = true;
    this.fitCamera();
    this.save();
  }

  private resetTransient() {
    this.selected = null;
    this.hover = null;
    this.acc = 0;
    this.undoStack = [];
    this.stroke = null;
    this.pending.clear();
    this.sound.setStorm(false);
  }

  /** Passt die Kamera an den Platz an, den HUD und Werkzeugleiste frei lassen. */
  fitCamera() {
    const wide = window.innerWidth >= 760;
    this.renderer.fitCamera({ left: wide ? 350 : 0, top: wide ? 70 : 190, right: wide ? 70 : 0, bottom: 150 });
  }

  /** Zeigt im Hintergrund einen vollen Hafen mit schwebender Kamera */
  startShowcase() {
    this.sim = new Sim(20240607, 'easy', 'coast');
    buildShowcase(this.sim);
    for (let i = 0; i < 4000; i++) this.sim.tick();
    this.sim.drainEvents();
    this.inGame = false;
    this.showcase = true;
    this.resetTransient();
    this.setTool('view');
    this.fitCamera();
    this.setSpeed(2);
  }
  endShowcase() {
    this.showcase = false;
    this.setSpeed(1);
  }

  hasSave(): boolean {
    return latestSlot() !== null;
  }

  /** Autosave: nur, wenn ein Spiel läuft, es nicht verloren ist und der Autosave an ist */
  save() {
    if (!this.inGame || !this.settings.autosave || this.sim.status === 'lost') return;
    writeSlot('auto', this.sim);
  }

  /** Speichert in einen der drei Speicherplätze */
  saveSlot(slot: Slot): boolean {
    return writeSlot(slot, this.sim);
  }

  /** Lädt einen Speicherplatz. Ohne Angabe den zuletzt gespeicherten Stand. */
  load(slot: Slot | null = latestSlot()): boolean {
    if (!slot) return false;
    try {
      const data = readSlot(slot);
      if (!data) return false;
      this.sim = Sim.deserialize(data);
      this.inGame = true;
      this.resetTransient();
      this.setTool('view');
      this.fitCamera();
      return true;
    } catch {
      return false;
    }
  }

  setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
    this.settings[k] = v;
    saveSettings(this.settings);
  }

  // ───────────────────────── Bauen und Rückgängig ─────────────────────────

  /** Fasst alles, was bis `endStroke` gebaut wird, zu einem Rückgängig-Schritt zusammen. */
  beginStroke() {
    this.stroke = { gm: this.sim.gm, actions: [] };
  }
  endStroke() {
    if (this.stroke && this.stroke.actions.length) this.pushUndo(this.stroke);
    this.stroke = null;
  }
  private pushUndo(g: UndoGroup) {
    this.undoStack.push(g);
    if (this.undoStack.length > UNDO_MAX) this.undoStack.shift();
  }
  private record(a: UndoAction) {
    if (this.stroke) this.stroke.actions.push(a);
    else this.pushUndo({ gm: this.sim.gm, actions: [a] });
  }
  private pruneUndo() {
    while (this.undoStack.length && this.sim.gm - this.undoStack[0].gm > UNDO_WINDOW_GM) this.undoStack.shift();
  }
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Wendet das aktive Werkzeug auf ein Feld an. Liefert den Fehlergrund oder null bei Erfolg. */
  applyTool(x: number, y: number): string | null {
    if (this.tool === 'view' || this.tool === 'assign' || this.tool === 'copy') return null;
    if (this.tool === 'paste') return this.pasteAt(x, y);
    if (this.tool === 'zone') {
      const r = this.sim.setZone(x, y, this.zonePick);
      if (!r.ok) return r.reason ?? 'Nicht möglich';
      this.sound.play('click');
      return null;
    }
    if (this.tool === 'oneway') {
      const r = this.sim.toggleOneway(x, y);
      if (!r.ok) return r.reason ?? 'Nicht möglich';
      this.sound.play('click');
      return null;
    }
    if (this.tool === 'buyland') {
      const r = this.sim.buyPlot(x);
      if (!r.ok) return r.reason ?? 'Nicht möglich';
      this.sound.play('buildBig');
      this.ui.toast(`Land gekauft: −${r.cost.toLocaleString('de-DE')} €`, 'good');
      return null;
    }
    if (this.tool === 'demolish') {
      const res = this.sim.demolish(x, y);
      if (!res.ok) return res.reason ?? 'Nicht möglich';
      if (res.removed.length) this.record({ kind: 'demolish', removed: res.removed });
      this.sound.play('demolish');
      this.renderer.addPop(x, y, 'demolish');
      return null;
    }
    const tool = this.tool as BuildTool;
    if (tool === 'hwy') return this.buildHighway(x, y);
    const res = this.sim.build(tool, x, y);
    if (!res.ok) return res.reason ?? 'Nicht möglich';
    this.record({ kind: 'build', tool, x, y, truckId: res.truckId, prev: res.prev });
    this.sound.play(tool === 'crane' || tool === 'gate' ? 'buildBig' : tool === 'truck' ? 'truck' : 'build');
    this.renderer.addPop(x, y, 'build');
    return null;
  }

  /** Autobahn: zwei Fahrbahnen nebeneinander mit fester Richtung (Rechtsverkehr). Gedreht (R) liegen sie senkrecht. */
  private buildHighway(x: number, y: number): string | null {
    const vert = this.sim.rot;
    const b = vert ? { x: x + 1, y } : { x, y: y + 1 };
    const ca = this.sim.canBuild('hwy', x, y);
    const cb = this.sim.canBuild('hwy', b.x, b.y);
    if (!ca.ok) return ca.reason ?? 'Nicht möglich';
    if (!cb.ok) return cb.reason ?? 'Nicht möglich';
    if (this.sim.money < ca.cost + cb.cost) return 'Zu wenig Geld';
    // Waagerecht: obere Spur nach Westen, untere nach Osten. Senkrecht: linke Spur nach Süden, rechte nach Norden.
    for (const [t, dir] of [[{ x, y }, vert ? 1 : 2], [b, vert ? 3 : 0]] as const) {
      const res = this.sim.build('hwy', t.x, t.y);
      if (!res.ok) return res.reason ?? 'Nicht möglich';
      this.sim.setOneway(t.x, t.y, dir);
      this.record({ kind: 'build', tool: 'hwy', x: t.x, y: t.y, prev: res.prev });
      this.renderer.addPop(t.x, t.y, 'build');
    }
    this.sound.play('build');
    return null;
  }

  // ───────────────────────── Blaupausen ─────────────────────────

  /** Kopiert alles im Rahmen: Kai, Straßen (mit Ausbau und Einbahn), Lager, Gebäude, Kräne. Trucks, Zonen und Aufrüstungen nicht. */
  copyRect(r: NonNullable<View['rect']>) {
    const x0 = Math.min(r.x0, r.x1);
    const x1 = Math.max(r.x0, r.x1);
    const y0 = Math.min(r.y0, r.y1);
    const y1 = Math.max(r.y0, r.y1);
    const sim = this.sim;
    const inside = (x: number, y: number, w = 1, h = 1) => x >= x0 && y >= y0 && x + w - 1 <= x1 && y + h - 1 <= y1;
    const items: BpItem[] = [];
    const add = (tool: BuildTool, x: number, y: number, extra: Partial<BpItem> = {}) => items.push({ dx: x - x0, dy: y - y0, tool, ...extra });
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = sim.idx(x, y);
        const k = sim.kind[i];
        if (k === T.Kai) add('kai', x, y);
        else if (k === T.Road) add(sim.roadTier[i] === 2 ? 'hwy' : sim.roadTier[i] === 1 ? 'road2' : 'road', x, y, sim.oneway[i] >= 0 ? { ow: sim.oneway[i] } : {});
        else if (k === T.Yard) add('yard', x, y);
        else if (k === T.Reefer) add('reefer', x, y);
        else if (k === T.Hazmat) add('hazard', x, y);
        else if (k === T.Empty) add('emptyyard', x, y);
      }
    }
    for (const gt of sim.gates) if (inside(gt.x, gt.y, gt.w, gt.h)) add('gate', gt.x, gt.y, { rot: gt.h > gt.w });
    for (const p of sim.plants) if (inside(p.x, p.y, p.w, p.h)) add(p.kind, p.x, p.y, { rot: p.w !== sizeOf(p.kind)[0] });
    for (const s of sim.shops) if (inside(s.x, s.y, s.w, s.h)) add('workshop', s.x, s.y);
    for (const t of sim.rtgs) if (inside(t.x, t.y)) add('rtg', t.x, t.y);
    for (const c of sim.cranes) if (inside(c.x, c.y)) add(c.model === 'light' ? 'lcrane' : 'crane', c.x, c.y);
    if (!items.length) return this.fail('Im Rahmen ist nichts zum Kopieren');
    this.blueprint = { w: x1 - x0 + 1, h: y1 - y0 + 1, items };
    try {
      localStorage.setItem(BP_KEY, JSON.stringify(this.blueprint));
    } catch {
      /* nur für diese Sitzung */
    }
    this.ui.toast(`${items.length} Teile kopiert. Mit „Einfügen“ setzt du sie irgendwo hin.`, 'good');
    this.sound.play('upgrade');
    this.setTool('paste');
  }

  /** Geschätzte Kosten der Blaupause zu heutigen Preisen */
  bpCost(): number {
    return (this.blueprint?.items ?? []).reduce((n, it) => n + this.sim.costOf(it.tool), 0);
  }

  private pasteAt(x: number, y: number): string | null {
    const bp = this.blueprint;
    if (!bp) return 'Noch nichts kopiert';
    if (x < 0 || y < 0 || x + bp.w > GRID_W || y + bp.h > GRID_H) return 'Passt nicht auf die Karte';
    const items = [...bp.items].sort((a, b) => BP_ORDER.indexOf(a.tool) - BP_ORDER.indexOf(b.tool));
    const rot = this.sim.rot;
    let ok = 0;
    let cost = 0;
    let fail: string | undefined;
    this.beginStroke();
    for (const it of items) {
      const tx = x + it.dx;
      const ty = y + it.dy;
      this.sim.rot = !!it.rot;
      const res = this.sim.build(it.tool, tx, ty);
      if (!res.ok) {
        fail ??= res.reason;
        continue;
      }
      ok++;
      cost += res.cost;
      if (it.ow !== undefined) this.sim.setOneway(tx, ty, it.ow);
      this.record({ kind: 'build', tool: it.tool, x: tx, y: ty, truckId: res.truckId, prev: res.prev });
    }
    this.endStroke();
    this.sim.rot = rot;
    if (!ok) return fail ?? 'Nichts gebaut';
    this.renderer.addPop(x, y, 'build');
    this.sound.play('buildBig');
    this.ui.toast(`${ok} von ${items.length} Teilen gebaut${fail ? ` (${fail})` : ''}: −${cost.toLocaleString('de-DE')} €`, ok === items.length ? 'good' : 'info');
    return null;
  }

  // ───────────────────────── Vorschau mit Bestätigung ─────────────────────────

  /** Große Bauten werden erst als Vorschau gesetzt, verschoben und mit einem zweiten Klick gebaut. */
  needsConfirm(tool: Tool = this.tool): boolean {
    return ['paste', 'crane', 'lcrane', 'gate', 'unpack', 'pack', 'cold', 'fill', 'workshop', 'rtg', 'rail', 'truck'].includes(tool);
  }
  /** Größe der Vorschau in Feldern */
  ghostSize(): [number, number] {
    if (this.tool === 'paste') return this.blueprint ? [this.blueprint.w, this.blueprint.h] : [1, 1];
    return dimsOf(this.tool, this.sim.rot);
  }
  inGhost(x: number, y: number): boolean {
    const g = this.ghost;
    if (!g) return false;
    const [w, h] = this.ghostSize();
    return x >= g.x && x < g.x + w && y >= g.y && y < g.y + h;
  }
  setGhost(x: number, y: number) {
    this.ghost = { x, y };
    this.hover = { x, y, ok: this.previewOk(x, y) };
  }
  confirmGhost() {
    const g = this.ghost;
    if (!g) return;
    const r = this.applyTool(g.x, g.y);
    if (r) return this.fail(r);
    this.ghost = null;
    this.hover = null;
  }
  cancelGhost() {
    this.ghost = null;
    this.hover = null;
  }

  /** Rüstet den ausgewählten Kran oder Truck auf. */
  upgradeSelected() {
    const sel = this.selected;
    if (!sel || (sel.kind !== 'crane' && sel.kind !== 'truck')) return;
    const res = this.sim.upgrade(sel.kind, sel.id);
    if (!res.ok) {
      this.fail(res.reason ?? 'Nicht möglich');
      return;
    }
    const c = sel.kind === 'crane' ? this.sim.cranes.find((c) => c.id === sel.id) : undefined;
    const t = sel.kind === 'truck' ? this.sim.trucks.find((t) => t.id === sel.id) : undefined;
    const x = c ? c.x : t ? Math.round(t.fx) : 0;
    const y = c ? c.y : t ? Math.round(t.fy) : 0;
    this.record({ kind: 'upgrade', what: sel.kind, id: sel.id, x, y });
    this.sound.play('upgrade');
    this.renderer.addPop(x, y, 'build');
    this.ui.toast(c ? `${CRANE_MODELS[c.model].name} in Betrieb: ${movesPerHour(c.model)} Moves pro Stunde` : 'Der Truck fährt jetzt fahrerlos', 'good');
  }

  setAllRoles(role: TruckRole) {
    for (const t of this.sim.trucks) this.sim.setRole(t.id, role);
    this.ui.toast(`Alle Trucks: ${ROLE_NAMES[role].name}`, 'info');
    this.sound.play('click');
  }

  /** Vergibt die gewählte Aufgabe an alle Trucks im Rahmen. */
  assignRect(r: NonNullable<View['rect']>) {
    const x0 = Math.min(r.x0, r.x1);
    const x1 = Math.max(r.x0, r.x1);
    const y0 = Math.min(r.y0, r.y1);
    const y1 = Math.max(r.y0, r.y1);
    let n = 0;
    for (const t of this.sim.trucks) {
      const x = t.tile % GRID_W;
      const y = (t.tile / GRID_W) | 0;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      this.sim.setRole(t.id, this.assignRole);
      n++;
    }
    if (!n) return this.fail('Kein Truck im Rahmen');
    this.ui.toast(`${n} ${n === 1 ? 'Truck' : 'Trucks'}: ${ROLE_NAMES[this.assignRole].name}`, 'good');
    this.sound.play('upgrade');
  }

  decide(choice: number) {
    this.sim.resolveDecision(choice);
    this.sound.play('click');
  }

  takeLoan() {
    const r = this.sim.takeLoan();
    if (!r.ok) return this.fail(r.reason ?? 'Nicht möglich');
    this.sound.play('coin');
  }
  repayLoan() {
    const r = this.sim.repayLoan();
    if (!r.ok) return this.fail(r.reason ?? 'Nicht möglich');
    this.sound.play('click');
  }

  /** Gibt dem ausgewählten Truck eine feste Aufgabe oder stellt ihn auf Automatik. */
  setTruckRole(role: TruckRole) {
    if (this.selected?.kind !== 'truck') return;
    this.sim.setRole(this.selected.id, role);
    this.sound.play('click');
  }

  hire(role: Role) {
    this.sim.hire(role);
    this.sound.play('click');
  }

  fire(role: Role) {
    const res = this.sim.fire(role);
    if (!res.ok) this.fail(res.reason ?? 'Nicht möglich');
    else this.sound.play('undo');
  }

  acceptContract(id: number) {
    const res = this.sim.acceptContract(id);
    if (!res.ok) this.fail(res.reason ?? 'Nicht möglich');
  }

  cancelContract(id: number) {
    const res = this.sim.cancelContract(id);
    if (!res.ok) this.fail(res.reason ?? 'Nicht möglich');
  }

  /** Meldet einen Fehlversuch mit Text und Ton. */
  fail(reason: string) {
    this.ui.toast(reason, 'bad');
    this.sound.play('error');
  }

  /** Nimmt den letzten Bauschritt zurück. Baukosten werden voll erstattet. */
  undo() {
    this.endStroke();
    const group = this.undoStack.pop();
    if (!group) {
      this.fail('Nichts zum Rückgängigmachen');
      return;
    }
    const before = this.sim.money;
    let reason: string | null = null;
    while (group.actions.length) {
      const a = group.actions[group.actions.length - 1];
      if (a.kind === 'upgrade') {
        const res = this.sim.undoUpgrade(a.what, a.id);
        if (!res.ok) {
          reason = res.reason ?? 'Nicht möglich';
          break;
        }
        this.renderer.addPop(a.x, a.y, 'undo');
      } else if (a.kind === 'build') {
        const res = this.sim.undoBuild(a);
        // Ein Truck, der schon mit seiner Straße verschwunden ist, gilt als erledigt
        if (!res.ok && a.tool !== 'truck') {
          reason = res.reason ?? 'Nicht möglich';
          break;
        }
        this.renderer.addPop(a.x, a.y, 'undo');
      } else {
        const res = this.sim.undoDemolish(a.removed);
        if (!res.ok) {
          reason = res.reason ?? 'Nicht möglich';
          break;
        }
        for (const r of a.removed) this.renderer.addPop(r.x, r.y, 'undo');
      }
      group.actions.pop();
    }
    if (reason) {
      // Was nicht zurückging, bleibt als Schritt erhalten
      this.undoStack.push(group);
      this.fail(`Rückgängig nicht möglich: ${reason}`);
      return;
    }
    const diff = Math.round(this.sim.money - before);
    const money = diff === 0 ? '' : ` (${diff > 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('de-DE')} €)`;
    this.ui.toast(`Rückgängig gemacht${money}`, 'info');
    this.sound.play('undo');
    this.selected = null;
  }

  previewOk(x: number, y: number): boolean {
    if (this.tool === 'view' || this.tool === 'assign') return true;
    if (this.tool === 'zone') {
      const i = this.sim.idx(x, y);
      const k = this.sim.kind[i];
      return k === T.Yard || k === T.Reefer || k === T.Hazmat || k === T.Empty || !!(this.sim.craneAt(x, y) ?? this.sim.gateAt(x, y) ?? this.sim.plantAt(x, y) ?? this.sim.railAt(x, y) ?? this.sim.truckAtTile(i));
    }
    if (this.tool === 'oneway') return this.sim.kind[this.sim.idx(x, y)] === T.Road;
    if (this.tool === 'buyland') return x >= 0 && x < GRID_W && !this.sim.owned[x];
    if (this.tool === 'demolish') return this.sim.canDemolish(x, y).ok;
    if (this.tool === 'paste') return !!this.blueprint && x >= 0 && y >= 0 && x + this.blueprint.w <= GRID_W && y + this.blueprint.h <= GRID_H;
    if (this.tool === 'hwy') {
      const b = this.sim.rot ? { x: x + 1, y } : { x, y: y + 1 };
      return this.sim.canBuild('hwy', x, y).ok && this.sim.canBuild('hwy', b.x, b.y).ok;
    }
    return this.sim.canBuild(this.tool as BuildTool, x, y).ok;
  }

  /** Wählt das Objekt an Weltposition (Pixel) aus. */
  pick(wx: number, wy: number) {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    const sim = this.sim;
    const before = this.selected;
    this.selected = null;
    for (const s of sim.ships) {
      const b = sim.shipBox(s);
      if (wx >= b.x * TILE && wx <= (b.x + b.w) * TILE && wy >= b.y * TILE && wy <= (b.y + b.h) * TILE) {
        this.selected = { kind: 'ship', id: s.id };
        break;
      }
    }
    if (!this.selected) {
      for (const t of sim.trucks) {
        const cx = (t.fx + 0.5) * TILE;
        const cy = (t.fy + 0.5) * TILE;
        if (Math.abs(wx - cx) < 14 && Math.abs(wy - cy) < 14) {
          this.selected = { kind: 'truck', id: t.id };
          break;
        }
      }
    }
    if (!this.selected && tx >= 0 && ty >= 0 && tx < GRID_W && ty < GRID_H) {
      const c = sim.craneAt(tx, ty);
      const g = sim.gateAt(tx, ty);
      const r = sim.railAt(tx, ty);
      const k = sim.kind[sim.idx(tx, ty)];
      if (c) this.selected = { kind: 'crane', id: c.id };
      else if (g) this.selected = { kind: 'gate', id: g.id };
      else if (r) this.selected = { kind: 'rail', id: r.id };
      else if (sim.plantAt(tx, ty)) this.selected = { kind: 'plant', id: sim.plantAt(tx, ty)!.id };
      else if (k === T.Shop) this.selected = { kind: 'shop', id: sim.shopAt(tx, ty)!.id };
      else if (k === T.Yard) this.selected = { kind: 'yard', id: sim.idx(tx, ty) };
      else if (k === T.Reefer) this.selected = { kind: 'reefer', id: sim.idx(tx, ty) };
      else if (k === T.Hazmat) this.selected = { kind: 'hazmat', id: sim.idx(tx, ty) };
      else if (k === T.Empty) this.selected = { kind: 'emptyyard', id: sim.idx(tx, ty) };
    }
    if (this.selected && (this.selected.kind !== before?.kind || this.selected.id !== before?.id)) this.sound.play('click');
  }
}
