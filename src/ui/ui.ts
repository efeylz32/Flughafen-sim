import type { Game } from '../game';
import {
  BuildTool,
  DIFFS,
  DiffId,
  MAPS,
  MapId,
  RIVAL_NAME,
  PRODUCTS,
  ProductId,
  ZONES,
  ROLES,
  Role,
  GATE_APRON_CAP,
  LEVELS,
  LEVEL_NEWS,
  PLANTS,
  PLANT_BUF,
  ROLE_NAMES,
  TruckRole,
  RAIL_CAP,
  RAIL_TRAVEL_GM,
  SHIP_TYPES,
  Tool,
  UNLOCK,
  UPGRADE,
  YARD_CAP_PER_TILE,
  dimsOf,
  sizeOf,
  SHIP_PATIENCE_GM,
  GOAL_LEVEL,
  YARD_USES,
  TRAITS,
  WORLD,
  RULE_CONDS,
  RULE_ACTS,
  RuleCond,
  RuleAct,
  WAGE_POLICY,
  WagePolicy,
  SPECS,
  COST,
  CRANE_MODELS,
  movesPerHour,
  TECH,
  TECH_IDS,
  TechId,
} from '../sim/data';
import { ACHIEVEMENTS } from '../achievements';
import { latestSlot, metaOfSlot, removeSlot, Slot, SLOTS } from '../saves';
import { MISSIONS } from '../sim/missions';
import { SCENARIOS } from '../sim/scenarios';
import type { Contract, Job, Sim } from '../sim/sim';

const num = (n: number) => Math.round(n).toLocaleString('de-DE');
const eur = (n: number) => `${num(n)} €`;
const hours = (gm: number) => `${(gm / 60).toFixed(1).replace('.', ',').replace(',0', '')} h`;

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS: Record<string, string> = {
  view: svg('<path d="M7 3.5l11 7-4.6 1.4 2.8 5.6-2.6 1.3-2.8-5.6L5.8 16z"/>'),
  kai: svg('<rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M3 9h18M7 9v4M12 9v4M17 9v4"/>'),
  crane: svg('<path d="M6 21V6M3 21h6M6 6h14M17 6v6"/><rect x="15" y="12" width="4" height="3" rx=".6"/><path d="M6 6l6-3"/>'),
  yarduse: svg('<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><path d="M14 16.5h5M16.5 14v5"/>'),
  solar: svg('<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 12h18M9 6v12M15 6v12"/>'),
  battery: svg('<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M7 10v4M11 10v4"/>'),
  monitor: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M6 12l3-3 3 2 5-5"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  paste: svg('<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2M9 12h6M9 16h4"/>'),
  road2: svg('<path d="M8 3v18M16 3v18"/><path d="M12 5v3M12 11v3M12 17v3" stroke-dasharray="1 2"/>'),
  hwy: svg('<path d="M6 3v18M18 3v18"/><path d="M10 8l-2-2-2 2M14 16l2 2 2-2"/><path d="M12 4v16" stroke-dasharray="2 3"/>'),
  hazard: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>'),
  emptyyard: svg('<rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M8 6v12M12 6v12M16 6v12"/>'),
  fill: svg('<path d="M3 10l9-6 9 6v10H3z"/><path d="M9 20v-6h6v6"/><path d="M12 2v4"/>'),
  lcrane: svg('<path d="M7 21V9M4 21h6M7 9h10M15 9v5"/><rect x="13.5" y="14" width="3.5" height="2.6" rx=".6"/>'),
  tech: svg('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.5"/>'),
  road: svg('<path d="M8.5 3L5 21M15.5 3L19 21"/><path d="M12 4.5v3M12 10.5v3M12 16.5v3"/>'),
  yard: svg('<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/>'),
  reefer: svg('<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>'),
  gate: svg('<path d="M3 20h18"/><path d="M5 20V9h14v11"/><path d="M5 13h14M9 9v4M14 9v4"/>'),
  rail: svg('<path d="M7 3v18M17 3v18"/><path d="M7 6h10M7 10h10M7 14h10M7 18h10"/>'),
  truck: svg('<rect x="2" y="7" width="12" height="9" rx="1.2"/><path d="M14 10h4l3 3.5V16h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'),
  unpack: svg('<path d="M3 20V9l4.5 3V9l4.5 3V9l4.5 3V5h4.5v15z"/><path d="M7 16h3M13 16h3"/>'),
  pack: svg('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>'),
  assign: svg('<rect x="3.5" y="5" width="17" height="14" rx="1.5" stroke-dasharray="3 2.4"/><path d="M8 12.5l2.6 2.6L16 9.5"/>'),
  rtg: svg('<path d="M4 20V5M20 20V5M3 5h18M3 9h18"/><rect x="10" y="10" width="4" height="3" rx=".5"/><path d="M12 13v3"/><rect x="9" y="16" width="6" height="4" rx=".6"/>'),
  zone: svg('<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5"/><path d="M13 16.8h7.5M16.8 13v7.5"/>'),
  chart: svg('<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="6" rx=".6"/><rect x="12" y="8" width="3" height="10" rx=".6"/><rect x="17" y="10.5" width="3" height="7.5" rx=".6"/>'),
  oneway: svg('<path d="M3 12h14"/><path d="M13 7l5 5-5 5"/><path d="M3 5h18M3 19h18" opacity=".5"/>'),
  buyland: svg('<path d="M4 20V9l8-5 8 5v11z"/><path d="M9 20v-6h6v6"/><path d="M12 4v-1"/>'),
  cold: svg('<path d="M3 20V9l4.5 3V9l4.5 3V9l4.5 3V5h4.5v15z"/><path d="M12 14v4M10 16h4"/>'),
  workshop: svg('<path d="M14.5 4.5a4.5 4.5 0 0 0-5.6 5.6L3.5 15.5a2 2 0 0 0 2.8 2.8l5.4-5.4a4.5 4.5 0 0 0 5.6-5.6l-2.8 2.8-2.4-.6-.6-2.4z"/>'),
  dredge: svg('<path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M12 11v9M8.5 16.5L12 20l3.5-3.5"/>'),
  demolish: svg('<path d="M5 5l14 14M19 5L5 19"/>'),
  eye: svg('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  coins: svg('<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-1-1.6-1.5-2.8-1.5-1.8 0-3.2 1.8-3.2 4.3s1.4 4.3 3.2 4.3c1.2 0 2.2-.5 2.8-1.5M7.5 11h5M7.5 13h5"/>'),
  deal: svg('<path d="M3 8.5l4-2 4 1.5 2-1.5h3l5 2.5v6l-3 1.5"/><path d="M3 8.5v7l3 1 5.5 3.5c1 .6 2-.2 1.8-1.2M11 8l-3 3.5c1.2 1.2 2.8 1 3.8 0l1.2-1 5 4.5"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  pause: svg('<path d="M8 5v14M16 5v14"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  undo: svg('<path d="M8 5.5L3.5 10 8 14.5"/><path d="M3.5 10H14a5.5 5.5 0 0 1 0 11h-3.5"/>'),
  rotate: svg('<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4.5h-4.5"/>'),
  sound: svg('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
  mute: svg('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  star: svg('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>'),
  people: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.9.2 5 2.6 5 5.8"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  trophy: svg('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 20h8"/>'),
};

type Cat = 'always' | 'land' | 'store' | 'build' | 'gear';
const CATS: { id: Exclude<Cat, 'always'>; name: string }[] = [
  { id: 'land', name: 'Gelände' },
  { id: 'store', name: 'Lager' },
  { id: 'build', name: 'Gebäude' },
  { id: 'gear', name: 'Geräte' },
];

interface ToolDef {
  cat: Cat;
  tool: Tool;
  label: string;
  sub: string;
  color: string;
}
const TOOLS: ToolDef[] = [
  { cat: 'always', tool: 'view', label: 'Ansehen', sub: 'Info', color: '#5b6b82' },
  { cat: 'land', tool: 'kai', label: 'Kai', sub: '5k', color: '#b8b2a3' },
  { cat: 'gear', tool: 'lcrane', label: 'Leichtkran', sub: '40k', color: '#e0a526' },
  { cat: 'gear', tool: 'crane', label: 'Mobilkran', sub: '80k', color: '#e2582c' },
  { cat: 'land', tool: 'road', label: 'Straße', sub: '500 €', color: '#59606a' },
  { cat: 'land', tool: 'road2', label: 'Doppelspur', sub: '1,8k', color: '#4a5560' },
  { cat: 'land', tool: 'hwy', label: 'Autobahn', sub: '4k × 2', color: '#2f6db0' },
  { cat: 'store', tool: 'yard', label: 'Stapel', sub: '1k', color: '#c9b88a' },
  { cat: 'build', tool: 'gate', label: 'Gate', sub: '20k · 2×1', color: '#d9534f' },
  { cat: 'gear', tool: 'assign', label: 'Aufgaben', sub: 'Rahmen', color: '#2a6fdb' },
  { cat: 'gear', tool: 'copy', label: 'Kopieren', sub: 'Rahmen', color: '#2a9d8f' },
  { cat: 'gear', tool: 'paste', label: 'Einfügen', sub: 'Plan', color: '#2a9d8f' },
  { cat: 'gear', tool: 'zone', label: 'Zonen', sub: 'Farbe', color: '#f0b429' },
  { cat: 'gear', tool: 'truck', label: 'Truck', sub: '25k', color: '#e0a030' },
  { cat: 'build', tool: 'unpack', label: 'Packhalle', sub: '60k · 3×2', color: '#c98a3c' },
  { cat: 'build', tool: 'pack', label: 'Veredeln', sub: '90k · 3×3', color: '#7a5cc7' },
  { cat: 'store', tool: 'yarduse', label: 'Lagerzweck', sub: 'Malen', color: '#9c6b3c' },
  { cat: 'store', tool: 'rtg', label: 'Portalkran', sub: '60k', color: '#f2a030' },
  { cat: 'store', tool: 'reefer', label: 'Kühlplatz', sub: '4k', color: '#3b9bd6' },
  { cat: 'store', tool: 'hazard', label: 'Gefahrgut', sub: '12k', color: '#e8602c' },
  { cat: 'store', tool: 'emptyyard', label: 'Leerlager', sub: '2k', color: '#7d8da0' },
  { cat: 'build', tool: 'fill', label: 'Befüllhalle', sub: '110k · 3×2', color: '#3f9a6b' },
  { cat: 'build', tool: 'cold', label: 'Kühlhalle', sub: '80k · 2×2', color: '#3b9bd6' },
  { cat: 'build', tool: 'solar', label: 'Solar', sub: '15k', color: '#f2c230' },
  { cat: 'build', tool: 'battery', label: 'Batterie', sub: '40k', color: '#2f9e6b' },
  { cat: 'build', tool: 'workshop', label: 'Werkstatt', sub: '40k · 2×2', color: '#5b6b82' },
  { cat: 'build', tool: 'rail', label: 'Gleis', sub: '150k', color: '#5f6f82' },
  { cat: 'land', tool: 'oneway', label: 'Einbahn', sub: 'Gratis', color: '#4b525c' },
  { cat: 'land', tool: 'buyland', label: 'Land kaufen', sub: '60k', color: '#6aa953' },
  { cat: 'land', tool: 'dredge', label: 'Baggern', sub: '15k', color: '#1f5f95' },
  { cat: 'always', tool: 'demolish', label: 'Abriss', sub: '50 %', color: '#8a8f98' },
];

const STAGES: { key: 'crane' | 'trucks' | 'yard' | 'gate'; label: string; hint: string }[] = [
  { key: 'crane', label: 'Kran', hint: 'Der Kran ist voll ausgelastet. Ein zweiter Kran am Liegeplatz oder eine Containerbrücke verdoppelt das Tempo.' },
  { key: 'trucks', label: 'Trucks', hint: 'Die Trucks sind der Engpass. Kaufe mehr Trucks oder verkürze die Wege. Rote Straßen stauen sich: Baue dort eine zweite Straße.' },
  { key: 'yard', label: 'Stapelplatz', hint: 'Der Stapelplatz läuft voll. Baue mehr Stapelplatz oder mehr Ausgänge, damit Container abfließen.' },
  { key: 'gate', label: 'Gate', hint: 'Das Gate ist der Engpass. Baue ein weiteres Gate an die Straße.' },
];

/** Farben der Truck-Aufgaben, wie auf der Karte */
const ROLE_DOT: Partial<Record<TruckRole, string>> = { crane: '#e2582c', out: '#2f9e6b', export: '#2f6db0', plant: '#7a5cc7' };

type MenuView = 'main' | 'pause' | 'new' | 'saves' | 'settings' | 'help';

const utilClass = (u: number) => (u < 0.6 ? 'ok' : u < 0.85 ? 'mid' : 'hi');
const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function jobText(j: Job | null): string {
  if (!j) return 'Wartet auf einen Auftrag';
  const store = j.cargo === 'reef' ? 'Kühlplatz' : j.cargo === 'haz' ? 'Gefahrgutfläche' : j.cargo === 'empty' ? 'Leerlager' : 'Stapelplatz';
  const cargo = { imp: 'Container', rimp: 'Bahn-Container', reef: 'Kühlcontainer', haz: 'Gefahrgut', empty: 'Leercontainer', exp: 'Export-Container', ware: 'ausgepackte Ware', prem: 'Fertigware', food: 'Lebensmittel' }[j.cargo];
  if (j.stage === 0) return `Fährt zu: ${j.srcKind === 'crane' ? 'Kran' : j.srcKind === 'gate' ? 'Gate' : j.srcKind === 'plant' ? 'Verarbeitung' : j.srcKind === 'rail' ? 'Gleisanschluss' : store}`;
  const dst = j.dstKind === 'store' ? store : j.dstKind === 'gate' ? 'Gate' : j.dstKind === 'rail' ? 'Gleisanschluss' : j.dstKind === 'plant' ? 'Verarbeitung' : 'Kran';
  return `Bringt ${cargo} zu: ${dst}`;
}

export class UI {
  private acc = 1;
  private moneyEl!: HTMLElement;
  private repEl!: HTMLElement;
  private clockEl!: HTMLElement;
  private levelEl!: HTMLElement;
  private levelBar!: HTMLElement;
  private levelName!: HTMLElement;
  private weatherEl!: HTMLElement;
  private speedBtns: HTMLButtonElement[] = [];
  private toolBtns = new Map<Tool, { btn: HTMLButtonElement; sub: HTMLElement; def: ToolDef }>();
  private missionCard!: HTMLElement;
  private missionCount!: HTMLElement;
  private missionTitle!: HTMLElement;
  private missionText!: HTMLElement;
  private bnCard!: HTMLElement;
  private bnRows = new Map<string, { bar: HTMLElement; val: HTMLElement }>();
  private bnHint!: HTMLElement;
  private finCard!: HTMLElement;
  private finBody!: HTMLElement;
  private sheet!: HTMLElement;
  private sheetBody!: HTMLElement;
  private sheetActions!: HTMLElement;
  private toasts!: HTMLElement;
  private overlayBtn!: HTMLButtonElement;
  private undoBtn!: HTMLButtonElement;
  private soundBtn!: HTMLButtonElement;
  private dealBtn!: HTMLButtonElement;
  private dealBadge!: HTMLElement;
  private menu!: HTMLElement;
  private menuView: MenuView = 'main';
  private menuConfirm = '';
  private menuNote = '';
  private deals!: HTMLElement;
  private dealsBody!: HTMLElement;
  private staffModal!: HTMLElement;
  private staffBody!: HTMLElement;
  private staffBtn!: HTMLButtonElement;
  private staffBadge!: HTMLElement;
  private lastStaff = '';
  private diff: DiffId = 'normal';
  private map: MapId = 'coast';
  private decision!: HTMLElement;
  private decisionBody!: HTMLElement;
  private rolePick!: HTMLElement;
  private dayCard!: HTMLElement;
  private dayTimer = 0;
  private achModal!: HTMLElement;
  private zonePick!: HTMLElement;
  private rotPick!: HTMLElement;
  private usePick!: HTMLElement;
  private ctlModal!: HTMLElement;
  private ctlBody!: HTMLElement;
  private ctlTab: 'overview' | 'devices' | 'rules' | 'power' = 'overview';
  private ctlKey = '';
  private newRule: { cond: RuleCond; act: RuleAct } = { cond: 'yardHigh', act: 'role:out' };
  private ghostBar!: HTMLElement;
  private ghostKey = '';
  private usedPick!: HTMLElement;
  private techModal!: HTMLElement;
  private techBody!: HTMLElement;
  private techBadge!: HTMLElement;
  private lastTech = '';
  private zoneCard!: HTMLElement;
  private zoneKey = '';
  private alertEl!: HTMLElement;
  private lastFin = '';
  private endModal!: HTMLElement;
  private endBody!: HTMLElement;
  private levelUp!: HTMLElement;
  private levelUpBody!: HTMLElement;
  private cat: Exclude<Cat, 'always'> = 'land';
  private catBtns = new Map<string, HTMLButtonElement>();
  private speedBeforeModal = 1;
  private lastLevel = 0;
  private lastSheet = '';
  private lastActions = '';
  private lastDeals = '';
  private confirmCancel = 0;

  constructor(
    private game: Game,
    private root: HTMLElement,
  ) {
    this.build();
  }

  private build() {
    const root = this.root;
    const click = () => this.game.sound.play('click');

    // Obere Leiste
    const top = el('div', 'topbar');
    const money = el('button', 'pill money');
    money.innerHTML = `<span class="coin"></span><span class="v"></span>`;
    this.moneyEl = money.querySelector('.v')!;
    money.addEventListener('click', () => this.toggleCard(this.finCard));
    money.title = 'Finanzen';
    const rep = el('div', 'pill rep');
    rep.innerHTML = `<span class="star">${ICONS.star}</span><span class="v"></span>`;
    this.repEl = rep.querySelector('.v')!;
    rep.title = 'Ruf: Pünktliche Schiffe heben ihn, wartende Schiffe senken ihn. Guter Ruf bringt mehr Schiffe.';
    const speed = el('div', 'pill speed');
    const sp: [string, number][] = [
      ['pause', 0],
      ['1×', 1],
      ['3×', 3],
      ['8×', 8],
    ];
    for (const [label, v] of sp) {
      const b = el('button', 'spd');
      b.innerHTML = label === 'pause' ? ICONS.pause : label;
      b.setAttribute('aria-label', v === 0 ? 'Pause' : `Geschwindigkeit ${label}`);
      b.addEventListener('click', () => {
        this.game.setSpeed(v);
        click();
      });
      b.dataset.v = String(v);
      this.speedBtns.push(b);
      speed.appendChild(b);
    }
    top.append(money, rep, speed);

    // Linke Spalte: Status, dann Karten
    const left = el('div', 'left');
    const status = el('div', 'status');
    this.clockEl = el('div', 'pill small clock');
    this.levelEl = el('div', 'pill small level');
    this.levelEl.innerHTML = `<span class="lname"></span><span class="track"><span class="bar"></span></span>`;
    this.levelName = this.levelEl.querySelector('.lname')!;
    this.levelBar = this.levelEl.querySelector('.bar')!;
    this.weatherEl = el('div', 'pill small weather hidden');
    this.alertEl = el('button', 'pill small debt hidden');
    this.alertEl.addEventListener('click', () => this.toggleCard(this.finCard));
    status.append(this.clockEl, this.levelEl, this.weatherEl, this.alertEl);

    this.missionCard = el('div', 'card mission');
    this.missionCard.innerHTML = `
      <div class="mhead"><div class="flag">${ICONS.star}</div>
        <div><div class="mcount"></div><div class="mtitle"></div></div></div>
      <div class="mtext"></div>
      <button class="skip">Überspringen</button>`;
    this.missionCount = this.missionCard.querySelector('.mcount')!;
    this.missionTitle = this.missionCard.querySelector('.mtitle')!;
    this.missionText = this.missionCard.querySelector('.mtext')!;
    this.missionCard.querySelector('.skip')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.sim.mission = Math.min(MISSIONS.length, this.game.sim.mission + 1);
    });
    this.missionCard.addEventListener('click', () => this.missionCard.classList.toggle('open'));

    this.bnCard = el('div', 'card bn');
    this.bnCard.innerHTML = `<div class="ctitle"><span>Engpass</span><span class="bnsum"></span></div><div class="rows"></div><div class="hint"></div>`;
    this.bnCard.addEventListener('click', () => this.bnCard.classList.toggle('open'));
    const rows = this.bnCard.querySelector('.rows')!;
    for (const s of STAGES) {
      const r = el('div', 'row');
      r.innerHTML = `<span class="lbl">${s.label}</span><span class="track"><span class="bar"></span></span><span class="val"></span>`;
      rows.appendChild(r);
      this.bnRows.set(s.key, { bar: r.querySelector('.bar')!, val: r.querySelector('.val')! });
    }
    this.bnHint = this.bnCard.querySelector('.hint')!;

    this.finCard = el('div', 'modal hidden');
    this.finCard.innerHTML = `<div class="dialog deals fin"><div class="dhead"><h2>Bilanz</h2><button class="x" aria-label="Schließen">${ICONS.close}</button></div><div class="body"></div><div class="pm loanbar"><button class="secondary" data-loan="repay">100.000 € tilgen</button><button class="primary" data-loan="take">100.000 € leihen</button></div></div>`;
    this.finBody = this.finCard.querySelector('.body')!;
    this.finCard.querySelector('.x')!.addEventListener('click', () => this.finCard.classList.add('hidden'));
    this.finCard.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === this.finCard) return this.finCard.classList.add('hidden');
      const l = t.closest<HTMLElement>('[data-loan]');
      if (l) {
        if (l.dataset.loan === 'take') this.game.takeLoan();
        else this.game.repayLoan();
        this.renderFinance(this.game.sim);
      }
    });

    this.dayCard = el('div', 'card dayrep hidden');
    this.dayCard.addEventListener('click', () => this.dayCard.classList.add('hidden'));
    // Zonen-Übersicht, solange das Zonen-Werkzeug aktiv ist
    this.zoneCard = el('div', 'card zonerep hidden');
    this.zoneCard.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-clearzones]')) {
        this.game.sim.clearZones();
        this.zoneKey = '';
      }
    });
    left.append(status, this.missionCard, this.bnCard, this.dayCard, this.zoneCard);

    // Rechte Knopfleiste
    const side = el('div', 'side');
    const mk = (icon: string, title: string, fn: () => void) => {
      const b = el('button', 'roundbtn');
      b.innerHTML = icon;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.addEventListener('click', fn);
      return b;
    };
    this.undoBtn = mk(ICONS.undo, 'Rückgängig', () => this.game.undo());
    this.dealBtn = mk(ICONS.deal, 'Verträge', () => {
      this.showDeals();
      click();
    });
    this.dealBadge = el('span', 'badge hidden');
    this.dealBtn.appendChild(this.dealBadge);
    this.staffBtn = mk(ICONS.people, 'Fuhrpark und Personal', () => {
      this.staffModal.classList.remove('hidden');
      this.renderStaff(true);
      click();
    });
    this.staffBadge = el('span', 'badge hidden', '!');
    this.staffBtn.appendChild(this.staffBadge);
    this.overlayBtn = mk(ICONS.eye, 'Engpass auf der Karte einfärben', () => {
      this.game.toggleOverlay();
      click();
    });
    const techBtn = mk(ICONS.tech, 'Verbesserungen', () => {
      this.techModal.classList.remove('hidden');
      this.renderTech(true);
      click();
    });
    this.techBadge = el('span', 'badge hidden', '!');
    techBtn.appendChild(this.techBadge);
    const ctlBtn = mk(ICONS.monitor, 'Leitstand', () => {
      this.ctlModal.classList.remove('hidden');
      this.renderCtl(true);
      click();
    });
    const finBtn = mk(ICONS.chart, 'Bilanz und Statistik', () => {
      this.toggleCard(this.finCard);
      click();
    });
    this.soundBtn = mk(ICONS.sound, 'Ton an oder aus', () => this.game.toggleSound());
    const menuBtn = mk(ICONS.menu, 'Menü', () => this.showMenu());
    side.append(this.undoBtn, this.dealBtn, this.staffBtn, techBtn, ctlBtn, this.overlayBtn, finBtn, this.soundBtn, menuBtn);

    // Info-Blatt
    this.sheet = el('div', 'sheet hidden');
    this.sheet.innerHTML = `<button class="x" aria-label="Schließen">${ICONS.close}</button><div class="body"></div><div class="actions"></div>`;
    this.sheetBody = this.sheet.querySelector('.body')!;
    this.sheetActions = this.sheet.querySelector('.actions')!;
    this.sheet.querySelector('.x')!.addEventListener('click', () => (this.game.selected = null));
    this.sheetActions.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const role = t.closest<HTMLElement>('[data-role]');
      if (role) this.game.setTruckRole(role.dataset.role as TruckRole);
      else if (t.closest('[data-upgrade]')) this.game.upgradeSelected();
      else if (t.closest('[data-overhaul]')) this.game.overhaulSelected();
      else if (t.closest('[data-vip]') && this.game.selected?.kind === 'ship') this.game.prioritizeShip(this.game.selected.id);
      const prod = t.closest<HTMLElement>('[data-product]');
      if (prod && this.game.selected?.kind === 'plant') this.game.setProduct(this.game.selected.id, prod.dataset.product as ProductId);
    });

    // Werkzeugleiste
    const bar = el('div', 'toolbar');
    const tabs = el('div', 'tabs');
    for (const c of CATS) {
      const b = el('button', 'tab', c.name);
      b.addEventListener('click', () => {
        this.cat = c.id;
        // Werkzeug einer anderen Abteilung abwählen, sonst springt die Leiste zurück
        const cur = this.toolBtns.get(this.game.tool)?.def.cat;
        if (cur && cur !== 'always' && cur !== c.id) this.game.setTool('view');
        else this.refreshTools();
        click();
      });
      this.catBtns.set(c.id, b);
      tabs.appendChild(b);
    }
    const row = el('div', 'tools');
    this.rolePick = el('div', 'rolepick hidden');
    for (const r of Object.keys(ROLE_NAMES) as TruckRole[]) {
      const b = el('button', '', ROLE_NAMES[r].name);
      b.dataset.role = r;
      b.addEventListener('click', () => {
        this.game.assignRole = r;
        this.refreshTools();
        click();
      });
      this.rolePick.appendChild(b);
    }
    this.zonePick = el('div', 'rolepick zonepick hidden');
    ZONES.forEach((z, i) => {
      const b = el('button', '', `<span class="zdot" style="background:${hex(z.color)}"></span>${i ? `Zone ${z.name}` : 'Keine'}`);
      b.dataset.zone = String(i);
      b.addEventListener('click', () => {
        this.game.zonePick = i;
        this.refreshTools();
        click();
      });
      this.zonePick.appendChild(b);
    });
    // Drehen: für Gebäude, die nicht quadratisch sind
    this.rotPick = el('div', 'rolepick rotpick hidden');
    const rb = el('button', '', '');
    rb.addEventListener('click', () => {
      this.game.rotate();
      click();
    });
    this.rotPick.appendChild(rb);
    // Neu oder gebraucht: für Kräne und Trucks
    this.usedPick = el('div', 'rolepick usedpick hidden');
    for (const u of [false, true]) {
      const b = el('button', '', '');
      b.dataset.used = u ? '1' : '0';
      b.addEventListener('click', () => {
        this.game.sim.used = u;
        this.refreshTools();
        click();
      });
      this.usedPick.appendChild(b);
    }
    this.usePick = el('div', 'rolepick zonepick hidden');
    YARD_USES.forEach((u, i) => {
      const b = el('button', '', `<span class="zdot" style="background:${hex(u.color)}"></span>${u.name}`);
      b.dataset.use = String(i);
      b.addEventListener('click', () => {
        this.game.usePick = i;
        this.refreshTools();
        click();
      });
      this.usePick.appendChild(b);
    });
    bar.append(this.usePick, this.rolePick, this.zonePick, this.rotPick, this.usedPick, tabs, row);
    for (const t of TOOLS) {
      const b = el('button', 'tool');
      b.innerHTML = `<span class="ico" style="--c:${t.color}">${ICONS[t.tool]}<span class="lk">${ICONS.lock}</span></span><b>${t.label}</b><small>${t.sub}</small>`;
      b.addEventListener('click', () => {
        const need = UNLOCK[t.tool as BuildTool] ?? 1;
        if (this.game.sim.level < need) {
          this.game.fail(`${t.label} gibt es ab Stufe ${need} (${LEVELS[need - 1].name})`);
          return;
        }
        this.game.setTool(t.tool);
        click();
      });
      b.title = t.label;
      this.toolBtns.set(t.tool, { btn: b, sub: b.querySelector('small')!, def: t });
      row.appendChild(b);
    }

    // Leiste für die Vorschau: Platzieren, Drehen, Abbrechen
    this.ghostBar = el('div', 'ghostbar hidden');
    this.ghostBar.innerHTML = `<div class="ghosttext"></div><div class="ghostbtns"><button class="primary gok"></button><button class="secondary grot">${ICONS.rotate}</button><button class="secondary gno" aria-label="Abbrechen">${ICONS.close}</button></div>`;
    this.ghostBar.querySelector('.gok')!.addEventListener('click', () => this.game.confirmGhost());
    this.ghostBar.querySelector('.grot')!.addEventListener('click', () => this.game.rotate());
    this.ghostBar.querySelector('.gno')!.addEventListener('click', () => this.game.cancelGhost());

    this.toasts = el('div', 'toasts');

    // Menü: Hauptmenü, Pause, Neues Spiel, Spielstände, Einstellungen
    this.menu = el('div', 'modal hidden');
    this.menu.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (b) this.menuAction(b.dataset.act!, b.dataset.arg ?? '');
    });

    // Verträge
    this.deals = el('div', 'modal hidden');
    this.deals.innerHTML = `<div class="dialog deals"><div class="dhead"><h2>Verträge</h2><button class="x" aria-label="Schließen">${ICONS.close}</button></div><div class="body"></div></div>`;
    this.dealsBody = this.deals.querySelector('.body')!;
    this.deals.querySelector('.x')!.addEventListener('click', () => this.hideDeals());
    this.deals.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === this.deals) return this.hideDeals();
      const acc = t.closest<HTMLElement>('[data-accept]');
      const can = t.closest<HTMLElement>('[data-cancel]');
      if (acc) this.game.acceptContract(Number(acc.dataset.accept));
      else if (can) {
        const id = Number(can.dataset.cancel);
        if (this.confirmCancel === id) {
          this.game.cancelContract(id);
          this.confirmCancel = 0;
        } else {
          this.confirmCancel = id;
        }
      }
      this.renderDeals(true);
    });

    // Leitstand: Verläufe, Anlagen, Regeln, Strom
    this.ctlModal = el('div', 'modal hidden');
    this.ctlModal.innerHTML = `<div class="dialog deals ctl"><div class="dhead"><h2>Leitstand</h2><button class="x" aria-label="Schließen">${ICONS.close}</button></div><div class="tabs ctltabs">${[
      ['overview', 'Verlauf'],
      ['devices', 'Anlagen'],
      ['rules', 'Regeln'],
      ['power', 'Strom'],
    ]
      .map(([k, n]) => `<button data-tab="${k}">${n}</button>`)
      .join('')}</div><div class="body"></div></div>`;
    this.ctlBody = this.ctlModal.querySelector('.body')!;
    this.ctlModal.querySelector('.x')!.addEventListener('click', () => this.ctlModal.classList.add('hidden'));
    this.ctlModal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === this.ctlModal) return this.ctlModal.classList.add('hidden');
      const tab = t.closest<HTMLElement>('[data-tab]');
      if (tab) this.ctlTab = tab.dataset.tab as typeof this.ctlTab;
      const sim = this.game.sim;
      const ra = t.closest<HTMLElement>('[data-rule]');
      if (ra) {
        const [what, idx] = ra.dataset.rule!.split(':');
        const i = Number(idx);
        if (what === 'del') sim.rules.splice(i, 1);
        else if (what === 'toggle') sim.rules[i].on = !sim.rules[i].on;
        else if (what === 'add') {
          const r = sim.addRule(this.newRule.cond, this.newRule.act);
          if (!r.ok) this.game.fail(r.reason ?? 'Nicht möglich');
        }
      }
      this.renderCtl(true);
    });
    this.ctlModal.addEventListener('change', (e) => {
      const t = e.target as HTMLSelectElement;
      if (t.name === 'cond') this.newRule.cond = t.value as RuleCond;
      if (t.name === 'act') this.newRule.act = t.value as RuleAct;
    });

    // Verbesserungen
    this.techModal = el('div', 'modal hidden');
    this.techModal.innerHTML = `<div class="dialog deals"><div class="dhead"><h2>Verbesserungen</h2><button class="x" aria-label="Schließen">${ICONS.close}</button></div><div class="body"></div></div>`;
    this.techBody = this.techModal.querySelector('.body')!;
    this.techModal.querySelector('.x')!.addEventListener('click', () => this.techModal.classList.add('hidden'));
    this.techModal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === this.techModal) return this.techModal.classList.add('hidden');
      const b = t.closest<HTMLElement>('[data-tech]');
      if (b) {
        this.game.buyTech(b.dataset.tech as TechId);
        this.renderTech(true);
      }
    });

    // Personal
    this.staffModal = el('div', 'modal hidden');
    this.staffModal.innerHTML = `<div class="dialog deals"><div class="dhead"><h2>Fuhrpark und Personal</h2><button class="x" aria-label="Schließen">${ICONS.close}</button></div><div class="body"></div></div>`;
    this.staffBody = this.staffModal.querySelector('.body')!;
    this.staffModal.querySelector('.x')!.addEventListener('click', () => this.staffModal.classList.add('hidden'));
    this.staffModal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === this.staffModal) return this.staffModal.classList.add('hidden');
      const fl = t.closest<HTMLElement>('[data-fleet]');
      if (fl) this.game.setAllRoles(fl.dataset.fleet as TruckRole);
      const h = t.closest<HTMLElement>('[data-hire]');
      const f = t.closest<HTMLElement>('[data-fire]');
      if (h) this.game.hire(h.dataset.hire as Role);
      else if (f) this.game.fire(f.dataset.fire as Role);
      const tr = t.closest<HTMLElement>('[data-train]');
      if (tr) this.game.trainRole(tr.dataset.train as Role);
      const sh = t.closest<HTMLElement>('[data-shift]');
      const wp = t.closest<HTMLElement>('[data-wage]');
      if (sh) this.game.sim.setNightShift(sh.dataset.shift === 'night');
      else if (wp) this.game.sim.setWagePolicy(wp.dataset.wage as WagePolicy);
      this.renderStaff(true);
    });

    // Entscheidung
    this.decision = el('div', 'modal hidden');
    this.decision.innerHTML = `<div class="dialog levelup decision"><div class="body"></div><div class="opts"></div></div>`;
    this.decisionBody = this.decision.querySelector('.body')!;
    this.decision.querySelector('.opts')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-opt]');
      if (!b) return;
      this.game.decide(Number(b.dataset.opt));
      this.decision.classList.add('hidden');
      this.game.setSpeed(this.speedBeforeModal);
    });

    // Ende: Sieg oder Niederlage
    this.endModal = el('div', 'modal hidden');
    this.endModal.innerHTML = `<div class="dialog levelup"><div class="body"></div><button class="primary free">Ohne Wertung weiterspielen</button><button class="secondary again">Neues Spiel</button></div>`;
    this.endBody = this.endModal.querySelector('.body')!;
    this.endModal.querySelector('.free')!.addEventListener('click', () => {
      this.game.sim.continueFree();
      this.endModal.classList.add('hidden');
      this.game.setSpeed(this.speedBeforeModal);
    });
    this.endModal.querySelector('.again')!.addEventListener('click', () => {
      this.endModal.classList.add('hidden');
      this.showMenu('new');
    });

    // Neue Stufe
    this.levelUp = el('div', 'modal hidden');
    this.levelUp.innerHTML = `<div class="dialog levelup"><div class="body"></div><button class="primary go">Weiter</button></div>`;
    this.levelUpBody = this.levelUp.querySelector('.body')!;
    this.levelUp.querySelector('.go')!.addEventListener('click', () => {
      this.levelUp.classList.add('hidden');
      this.game.setSpeed(this.speedBeforeModal);
    });

    root.append(top, left, side, this.sheet, bar, this.ghostBar, this.toasts, this.menu, this.deals, this.ctlModal, this.techModal, this.staffModal, this.finCard, this.endModal, this.decision, this.levelUp, this.buildAchModal());
    this.refreshSpeed();
    this.refreshTools();
    this.refreshOverlay();
    this.refreshSound();
  }

  // ───────────────────────── Sichtbarkeit ─────────────────────────

  private toggleCard(c: HTMLElement) {
    c.classList.toggle('hidden');
  }

  /** Zeigt das Menü. Ohne Angabe: Pause, wenn ein Spiel läuft, sonst das Hauptmenü. */
  showMenu(view?: MenuView) {
    this.menuView = view ?? (this.game.inGame ? 'pause' : 'main');
    this.menuConfirm = '';
    this.renderMenu();
    this.menu.classList.remove('hidden');
    this.game.setSpeed(0);
    if (this.menuView === 'main' && !this.game.showcase) this.enterShowcase();
  }
  private enterShowcase() {
    this.game.startShowcase();
    this.root.classList.add('showcase');
  }
  hideMenu() {
    this.menu.classList.add('hidden');
    if (this.game.showcase) {
      this.game.endShowcase();
      this.root.classList.remove('showcase');
    }
    if (this.game.speed === 0) this.game.setSpeed(this.game.lastSpeed || 1);
  }

  private menuAction(act: string, arg: string) {
    const g = this.game;
    g.sound.play('click');
    switch (act) {
      case 'view':
        this.menuView = arg as MenuView;
        this.menuConfirm = '';
        break;
      case 'close':
        return this.hideMenu();
      case 'resume':
        if (g.load()) return this.hideMenu();
        this.menuNote = 'Dieser Spielstand lässt sich nicht laden.';
        break;
      case 'diff':
        this.diff = arg as DiffId;
        break;
      case 'map':
        this.map = arg as MapId;
        break;
      case 'demo':
        g.newGame('demo', this.diff);
        return this.hideMenu();
      case 'empty':
        g.newGame('empty', this.diff, this.map);
        return this.hideMenu();
      case 'scenario':
        g.newScenario(arg);
        return this.hideMenu();
      case 'sandbox':
        g.newSandbox(Number(arg), this.map);
        return this.hideMenu();
      case 'achv':
        return this.showAchievements();
      case 'main':
        // Beim Verlassen wird gespeichert, damit „Weiterspielen“ hier weitermacht
        g.save();
        this.menuView = 'main';
        this.enterShowcase();
        break;
      case 'save': {
        const slot = arg as Slot;
        if (metaOfSlot(slot) && this.menuConfirm !== `save${slot}`) {
          this.menuConfirm = `save${slot}`;
          break;
        }
        this.menuNote = g.saveSlot(slot) ? `Gespeichert in Spielstand ${slot}.` : 'Speichern ist in diesem Browser nicht möglich.';
        this.menuConfirm = '';
        break;
      }
      case 'load': {
        if (this.menuView === 'saves' && this.game.inGame && this.menuConfirm !== `load${arg}`) {
          this.menuConfirm = `load${arg}`;
          break;
        }
        if (g.load(arg as Slot)) return this.hideMenu();
        this.menuNote = 'Dieser Spielstand lässt sich nicht laden.';
        this.menuConfirm = '';
        break;
      }
      case 'delete':
        if (this.menuConfirm !== `del${arg}`) {
          this.menuConfirm = `del${arg}`;
          break;
        }
        removeSlot(arg as Slot);
        this.menuConfirm = '';
        break;
      case 'sound':
        g.toggleSound();
        break;
      case 'autosave':
        g.setSetting('autosave', !g.settings.autosave);
        break;
      case 'dayreport':
        g.setSetting('dayReport', !g.settings.dayReport);
        if (!g.settings.dayReport) this.dayCard.classList.add('hidden');
        break;
      case 'wipe':
        if (this.menuConfirm !== 'wipe') {
          this.menuConfirm = 'wipe';
          break;
        }
        for (const sl of ['auto', ...SLOTS] as Slot[]) removeSlot(sl);
        this.menuConfirm = '';
        this.menuNote = 'Alle Spielstände gelöscht.';
        break;
    }
    this.renderMenu();
  }

  private slotRow(slot: Slot, canSave: boolean): string {
    const m = metaOfSlot(slot);
    const name = slot === 'auto' ? 'Autosave' : `Spielstand ${slot}`;
    const info = m
      ? `Tag ${m.day} · ${m.scenario ? 'Szenario' : DIFFS[m.diff as DiffId]?.name ?? m.diff} · ${m.levelName} · ${eur(m.money)}${m.t ? ` · ${new Date(m.t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}`
      : 'Leer';
    const c = this.menuConfirm;
    const btns: string[] = [];
    if (canSave && slot !== 'auto') btns.push(`<button class="${c === `save${slot}` ? 'danger' : 'primary'}" data-act="save" data-arg="${slot}">${c === `save${slot}` ? 'Überschreiben?' : 'Speichern'}</button>`);
    if (m) btns.push(`<button class="${c === `load${slot}` ? 'danger' : 'secondary'}" data-act="load" data-arg="${slot}">${c === `load${slot}` ? 'Laufendes Spiel verwerfen?' : 'Laden'}</button>`);
    if (m && slot !== 'auto') btns.push(`<button class="${c === `del${slot}` ? 'danger' : 'secondary'}" data-act="delete" data-arg="${slot}">${c === `del${slot}` ? 'Sicher?' : 'Löschen'}</button>`);
    return `<div class="slot ${m ? '' : 'empty'}"><div class="slotname"><b>${name}</b><span>${info}</span></div><div class="slotbtns">${btns.join('')}</div></div>`;
  }

  private renderMenu() {
    const g = this.game;
    const sim = g.sim;
    const back = (to: MenuView) => `<button class="close-menu" data-act="view" data-arg="${to}">Zurück</button>`;
    const note = this.menuNote ? `<p class="menunote">${this.menuNote}</p>` : '';
    this.menuNote = '';
    const toggle = (label: string, text: string, on: boolean, act: string) =>
      `<div class="setrow"><div><b>${label}</b><span>${text}</span></div><button class="switch ${on ? 'on' : ''}" data-act="${act}" aria-pressed="${on}">${on ? 'An' : 'Aus'}</button></div>`;
    let body = '';
    switch (this.menuView) {
      case 'main': {
        const last = latestSlot();
        const m = last ? metaOfSlot(last) : null;
        body = `
          <h1 class="title">Hafen-Imperium</h1>
          <p class="sub">Vom Anleger zum Weltklasse-Hafen</p>
          ${note}
          ${m ? `<button class="primary resume" data-act="resume">Weiterspielen<small>Tag ${m.day} · ${m.levelName} · ${eur(m.money)}</small></button>` : ''}
          <button class="${m ? 'secondary' : 'primary'}" data-act="view" data-arg="new">Neues Spiel</button>
          <button class="secondary" data-act="view" data-arg="saves">Spielstand laden</button>
          <button class="secondary" data-act="achv">Erfolge und Bestenliste</button>
          <button class="secondary" data-act="view" data-arg="settings">Einstellungen</button>
          <button class="secondary" data-act="view" data-arg="help">Bedienung und Hilfe</button>`;
        break;
      }
      case 'pause': {
        const sc = sim.scenario ? SCENARIOS.find((x) => x.id === sim.scenario) : null;
        body = `
          <h1>Pause</h1>
          ${note}
          <div class="statecard">
            <div><span>Tag</span><b>${sim.day}</b></div>
            <div><span>Stufe</span><b>${sim.level} · ${sim.levelName}</b></div>
            <div><span>Geld</span><b>${eur(sim.money)}</b></div>
            <div><span>Modus</span><b>${sc ? sc.name : sim.sandbox ? `Sandbox, ${MAPS[sim.map].name}` : `${DIFFS[sim.diff].name}, ${MAPS[sim.map].name}`}</b></div>
            <div><span>Ziel</span><b>${sim.status === 'free' ? 'ohne Wertung' : sc ? `${sc.goal} bis Tag ${sim.goalDay}` : `Stufe ${GOAL_LEVEL} bis Tag ${sim.goalDay}`}</b></div>
            <div><span>Aufträge</span><b>${sim.contracts.length} Verträge · ${sim.shipsDone} Schiffe</b></div>
            ${sim.traits.length ? `<div class="wide"><span>Besonderheiten</span><b>${sim.traits.map((t) => `${TRAITS[t].name}: ${TRAITS[t].text}`).join(' · ')}</b></div>` : ''}
          </div>
          <button class="primary" data-act="close">Weiterspielen</button>
          <button class="secondary" data-act="view" data-arg="saves">Speichern und Laden</button>
          <button class="secondary" data-act="view" data-arg="settings">Einstellungen</button>
          <button class="secondary" data-act="achv">Erfolge und Bestenliste</button>
          <button class="secondary" data-act="view" data-arg="help">Bedienung und Hilfe</button>
          <button class="secondary" data-act="view" data-arg="new">Neues Spiel</button>
          <button class="secondary" data-act="main">Zurück zum Hauptmenü</button>`;
        break;
      }
      case 'new':
        body = `
          <h1>Neues Spiel</h1>
          <div class="difflabel">Schwierigkeit</div>
          <div class="diff">${(Object.keys(DIFFS) as DiffId[]).map((d) => `<button class="${d === this.diff ? 'on' : ''}" data-act="diff" data-arg="${d}">${DIFFS[d].name}</button>`).join('')}</div>
          <p class="sub">${DIFFS[this.diff].text}. Startgeld ${eur(DIFFS[this.diff].money)}.</p>
          <div class="difflabel">Karte für einen neuen leeren Hafen</div>
          <div class="diff">${(Object.keys(MAPS) as MapId[]).map((m) => `<button class="${m === this.map ? 'on' : ''}" data-act="map" data-arg="${m}">${MAPS[m].name}</button>`).join('')}</div>
          <p class="sub">${MAPS[this.map].text} Der Demo-Hafen liegt immer an der Küste.</p>
          <button class="primary" data-act="demo">Demo-Hafen mit Engpass</button>
          <button class="secondary" data-act="empty">Neuer leerer Hafen</button>
          <div class="difflabel">Sandbox: frei bauen ohne Frist und Pleite</div>
          <div class="diff">${[1_000_000, 10_000_000, 100_000_000].map((m) => `<button data-act="sandbox" data-arg="${m}">${m / 1_000_000} Mio. €</button>`).join('')}</div>
          <p class="sub">Alle Werkzeuge ab Stufe 5, das ganze Land gehört dir. Die gewählte Karte gilt auch hier.</p>
          <div class="difflabel">Szenarien</div>
          ${SCENARIOS.map((x) => `<button class="secondary scen" data-act="scenario" data-arg="${x.id}"><b>${x.name}</b><span>${x.text} Ziel: ${x.goal} bis Tag ${x.days}.</span></button>`).join('')}
          ${back(g.inGame ? 'pause' : 'main')}`;
        break;
      case 'saves': {
        const canSave = g.inGame;
        body = `
          <h1>${canSave ? 'Speichern und Laden' : 'Spielstand laden'}</h1>
          <p class="sub">Drei Speicherplätze und ein Autosave. Der Autosave sichert alle 30 Sekunden, jeden Tag und beim Verlassen. Alles liegt nur in diesem Browser.</p>
          ${note}
          ${SLOTS.map((x) => this.slotRow(x, canSave)).join('')}
          ${this.slotRow('auto', false)}
          ${back(g.inGame ? 'pause' : 'main')}`;
        break;
      }
      case 'settings':
        body = `
          <h1>Einstellungen</h1>
          ${note}
          ${toggle('Ton', 'Geräusche und Effekte', g.sound.enabled, 'sound')}
          ${toggle('Autosave', 'Speichert automatisch in den Autosave-Platz', g.settings.autosave, 'autosave')}
          ${toggle('Tagesbericht', 'Zeigt nach jedem Tag eine Karte mit dem Ergebnis', g.settings.dayReport, 'dayreport')}
          <button class="${this.menuConfirm === 'wipe' ? 'danger' : 'secondary'}" data-act="wipe">${this.menuConfirm === 'wipe' ? 'Wirklich alle Spielstände löschen?' : 'Alle Spielstände löschen'}</button>
          ${back(g.inGame ? 'pause' : 'main')}`;
        break;
      case 'help':
        body = `
          <h1>Bedienung und Hilfe</h1>
          <details open><summary>Bedienung</summary>
            <ul>
              <li><b>Handy:</b> Werkzeug unten wählen, tippen oder ziehen zum Bauen. Mit zwei Fingern verschieben und zoomen, mit „Ansehen“ auch mit einem Finger.</li>
              <li><b>PC:</b> Linksklick baut, Rechtsklick oder Mittelklick verschiebt, Mausrad zoomt.</li>
              <li><b>Zonen:</b> Unter Geräte „Zonen“ wählen, eine Farbe antippen und Lagerflächen, Kräne, Gates, Hallen, Gleise oder Trucks anmalen. Fahrten verbinden dann nur Dinge derselben Zone.</li>
              <li><b>Aufrüsten:</b> Mit „Ansehen“ einen Kran oder Truck antippen, dann im Info-Blatt aufrüsten.</li>
              <li><b>Rückgängig:</b> Der Pfeil-Knopf oder Strg+Z nimmt den letzten Bauschritt zurück, mit voller Erstattung (4 Spielstunden lang).</li>
              <li><b>Tasten:</b> Leertaste Pause, 1/2/3 Tempo, O Engpass einfärben, M Ton, R Drehen, V K C Y G T X Werkzeuge, Esc Abbrechen.</li>
            </ul>
          </details>
          <details><summary>Wie verdiene ich Geld?</summary>
            <ul>
              <li>Jeder Container, der den Hafen verlässt, bringt 200 €, Kühlcontainer 400 €, Gefahrgut 700 €, Export aufs Schiff 250 €.</li>
              <li>Jedes abgefertigte Schiff zahlt Liegegebühr. Verträge zahlen Bonus bei pünktlicher Abfertigung und Strafe bei Verspätung.</li>
              <li>Kräne, Trucks, Gates und Flächen kosten jeden Tag Betrieb. Die Finanzen zeigen, was heute läuft.</li>
            </ul>
          </details>
          ${back(g.inGame ? 'pause' : 'main')}`;
        break;
    }
    this.menu.innerHTML = `<div class="dialog menu">${body}</div>`;
  }
  showDeals() {
    this.confirmCancel = 0;
    this.deals.classList.remove('hidden');
    this.renderDeals(true);
  }
  hideDeals() {
    this.deals.classList.add('hidden');
  }

  /** Feier beim Stufenaufstieg. Das Spiel pausiert, bis der Spieler weiterklickt. */
  showLevelUp() {
    const sim = this.game.sim;
    const lv = LEVELS[sim.level - 1];
    const news = LEVEL_NEWS[sim.level - 1] ?? [];
    this.levelUpBody.innerHTML = `
      <div class="trophy">${ICONS.trophy}</div>
      <div class="eyebrow">Neue Stufe · ${sim.level} von ${LEVELS.length}</div>
      <h1>${lv.name}</h1>
      <p class="sub">Glückwunsch! Der Bonus von ${eur(lv.bonus)} ist auf deinem Konto. Das ist neu:</p>
      ${news.map((n) => `<div class="news"><b>${n.title}</b><span>${n.text}</span></div>`).join('')}`;
    if (this.levelUp.classList.contains('hidden')) this.speedBeforeModal = this.game.speed || this.game.lastSpeed || 1;
    this.levelUp.classList.remove('hidden');
    this.game.setSpeed(0);
  }

  private buildAchModal(): HTMLElement {
    this.achModal = el('div', 'modal hidden');
    this.achModal.innerHTML = `<div class="dialog deals"><div class="dhead"><h2>Erfolge</h2><button class="x" aria-label="Schließen">${ICONS.close}</button></div><div class="body"></div></div>`;
    this.achModal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === this.achModal || t.closest('.x')) this.achModal.classList.add('hidden');
    });
    return this.achModal;
  }

  showAchievements() {
    const pr = this.game.progress;
    const got = ACHIEVEMENTS.filter((a) => pr.unlocked[a.id]).length;
    this.achModal.querySelector('.body')!.innerHTML = `
      <p class="sub">${got} von ${ACHIEVEMENTS.length} freigeschaltet. Erfolge und Bestenliste werden nur in diesem Browser gespeichert.</p>
      <div class="achs">${ACHIEVEMENTS.map(
        (a) => `<div class="ach ${pr.unlocked[a.id] ? 'got' : ''}"><span class="ai">${pr.unlocked[a.id] ? ICONS.trophy : ICONS.lock}</span><span><b>${a.name}</b><small>${a.text}${pr.unlocked[a.id] ? ` · ${pr.unlocked[a.id]}` : ''}</small></span></div>`,
      ).join('')}</div>
      <h3>Bestenliste</h3>
      ${
        pr.records.length
          ? `<div class="board">${pr.records
              .slice(0, 12)
              .map((r, i) => `<div><span class="rk">${i + 1}</span><span><b>${r.title}</b><small>${r.date}, ${num(r.handled)} Container, Vermögen ${eur(r.money)}</small></span><b>Tag ${r.day}</b></div>`)
              .join('')}</div>`
          : '<p class="sub">Noch kein Sieg. Gewinne ein Spiel oder ein Szenario, dann steht es hier.</p>'
      }`;
    this.achModal.classList.remove('hidden');
  }

  /** Kurzer Bericht über den vergangenen Tag. Verschwindet von selbst oder per Tippen. */
  showDayReport() {
    const sim = this.game.sim;
    const y = sim.history.at(-1);
    if (!y || !this.game.settings.dayReport) return;
    const inc = y.fees + y.rail + y.exportFees + y.berth + y.bonus;
    const exp = y.running + y.building + y.penalty + y.wages + (y.interest ?? 0);
    const bn = y.bn ? (Object.entries(y.bn) as [keyof typeof y.bn, number][]).sort((a, b) => b[1] - a[1])[0] : null;
    const bnName = bn && bn[1] > 20 ? STAGES.find((s) => s.key === bn[0])!.label : 'keiner';
    this.dayCard.innerHTML = `
      <div class="ctitle"><span>Tag ${sim.day - 1} im Rückblick</span><span class="x">${ICONS.close}</span></div>
      <div class="fl sub"><span>Ergebnis</span><b class="${inc - exp >= 0 ? 'pos' : 'neg'}">${eur(inc - exp)}</b></div>
      <div class="fl sub"><span>Container</span><b>${num(y.handled)}</b></div>
      <div class="fl sub"><span>Schiffe pünktlich</span><b>${y.ships ? `${y.onTime} von ${y.ships}` : '–'}</b></div>
      <div class="fl sub"><span>Häufigster Engpass</span><b>${bnName}</b></div>
      ${y.jamPeak > 0.2 ? `<div class="fl sub"><span>Stau</span><b class="neg">bis ${Math.round(y.jamPeak * 100)} % der Trucks</b></div>` : ''}`;
    this.dayCard.classList.remove('hidden');
    this.dayTimer = 30;
  }

  showDecision() {
    const d = this.game.sim.pending;
    if (!d) return;
    this.decisionBody.innerHTML = `<div class="eyebrow">Entscheidung</div><h1>${d.title}</h1><p class="sub">${d.text}</p>`;
    this.decision.querySelector('.opts')!.innerHTML = d.options
      .map((o, i) => `<button class="${i === 0 ? 'primary' : 'secondary'}" data-opt="${i}">${o}</button>`)
      .join('');
    if (this.decision.classList.contains('hidden')) this.speedBeforeModal = this.game.speed || this.game.lastSpeed || 1;
    this.decision.classList.remove('hidden');
    this.game.setSpeed(0);
  }

  showEnd() {
    const sim = this.game.sim;
    const won = sim.status === 'won';
    this.endBody.innerHTML = `
      <div class="trophy ${won ? '' : 'lost'}">${won ? ICONS.trophy : ICONS.close}</div>
      <div class="eyebrow ${won ? '' : 'neg'}">${won ? 'Gewonnen' : 'Verloren'} · ${DIFFS[sim.diff].name}</div>
      <h1>${won ? 'Weltklasse-Hafen!' : 'Spiel vorbei'}</h1>
      <p class="sub">${sim.endReason}</p>
      <div class="news"><b>Deine Bilanz</b><span>${num(sim.handled)} Container umgeschlagen, ${num(sim.shipsDone)} Schiffe, davon ${num(sim.shipsOnTime)} pünktlich. Kontostand ${eur(sim.money)}${sim.loan ? `, Kredit ${eur(sim.loan)}` : ''}.</span></div>`;
    if (this.endModal.classList.contains('hidden')) this.speedBeforeModal = this.game.speed || this.game.lastSpeed || 1;
    this.endModal.classList.remove('hidden');
    this.game.setSpeed(0);
  }

  refreshSpeed() {
    for (const b of this.speedBtns) b.classList.toggle('on', Number(b.dataset.v) === this.game.speed);
  }
  /** Preis unter dem Werkzeug: steigt mit der Hafenstufe */
  private toolSub(d: ToolDef): string {
    const tool = d.tool as BuildTool;
    if (!(tool in COST) || tool === 'road') return d.sub;
    const c = this.game.sim.costOf(tool);
    const p = c >= 1000 ? `${Math.round(c / 1000)}k` : `${c} €`;
    const [w, h] = sizeOf(tool);
    if (tool === 'hwy') return `${p} × 2`;
    return w * h > 1 ? `${p} · ${w}×${h}` : p;
  }

  refreshTools() {
    // Die Abteilung folgt dem gewählten Werkzeug (auch bei Tastenkürzeln)
    const cur = this.toolBtns.get(this.game.tool)?.def.cat;
    if (cur && cur !== 'always') this.cat = cur;
    for (const [id, b] of this.catBtns) b.classList.toggle('on', id === this.cat);
    this.rolePick.classList.toggle('hidden', this.game.tool !== 'assign');
    this.zonePick.classList.toggle('hidden', this.game.tool !== 'zone');
    this.usePick.classList.toggle('hidden', this.game.tool !== 'yarduse');
    for (const b of this.usePick.querySelectorAll<HTMLElement>('button')) b.classList.toggle('on', Number(b.dataset.use) === this.game.usePick);
    const [sw, sh] = sizeOf(this.game.tool);
    this.rotPick.classList.toggle('hidden', sw === sh);
    const usable = this.game.tool === 'crane' || this.game.tool === 'lcrane' || this.game.tool === 'truck';
    this.usedPick.classList.toggle('hidden', !usable);
    if (usable) {
      const price = this.game.sim.costOf(this.game.tool as BuildTool);
      for (const b of this.usedPick.querySelectorAll<HTMLElement>('button')) {
        const u = b.dataset.used === '1';
        b.classList.toggle('on', u === this.game.sim.used);
        const um = this.game.sim.usedMarket;
        b.textContent = u ? `Gebraucht (${um.label}) · ${eur(Math.round((price * um.factor) / 100) * 100)} · ${Math.round(um.lo * 100)}–${Math.round(um.hi * 100)} %` : `Neu · ${eur(price)}`;
      }
    }
    this.rotPick.firstElementChild!.innerHTML = `${ICONS.rotate} Drehen (R) · ${dimsOf(this.game.tool, this.game.sim.rot).join(' × ')} Felder`;
    if (this.game.tool === 'hwy') {
      this.rotPick.classList.remove('hidden');
      this.rotPick.firstElementChild!.innerHTML = `${ICONS.rotate} Drehen (R) · Fahrbahnen ${this.game.sim.rot ? 'senkrecht' : 'waagerecht'}. Beim Ziehen passt es sich an.`;
    }
    for (const b of this.zonePick.querySelectorAll<HTMLElement>('button')) b.classList.toggle('on', Number(b.dataset.zone) === this.game.zonePick);
    for (const b of this.rolePick.querySelectorAll<HTMLElement>('button')) b.classList.toggle('on', b.dataset.role === this.game.assignRole);
    for (const [t, v] of this.toolBtns) {
      v.btn.classList.toggle('on', t === this.game.tool);
      v.btn.classList.toggle('hidden', v.def.cat !== 'always' && v.def.cat !== this.cat);
    }
  }
  refreshOverlay() {
    this.overlayBtn.classList.toggle('on', this.game.overlay);
  }
  refreshSound() {
    this.soundBtn.innerHTML = this.game.sound.enabled ? ICONS.sound : ICONS.mute;
    this.soundBtn.classList.toggle('off', !this.game.sound.enabled);
  }

  toast(text: string, kind: 'info' | 'good' | 'bad' = 'info') {
    const t = el('div', `toast ${kind}`);
    t.textContent = text;
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 4) this.toasts.firstElementChild?.remove();
    setTimeout(() => t.classList.add('out'), 3600);
    setTimeout(() => t.remove(), 4000);
  }

  // ───────────────────────── Aktualisieren ─────────────────────────

  private renderGhostBar(sim: Sim) {
    const gh = this.game.ghost;
    this.ghostBar.classList.toggle('hidden', !gh);
    if (!gh) return;
    const tool = this.game.tool as BuildTool;
    if (this.game.tool === 'paste') {
      const bp = this.game.blueprint;
      const fits = this.game.previewOk(gh.x, gh.y);
      this.ghostBar.querySelector('.ghosttext')!.innerHTML = fits
        ? `<b>Bauplan ${bp?.w}×${bp?.h} Felder, ${bp?.items.length} Teile</b> · Ziehen zum Verschieben. Was nicht passt, wird übersprungen.`
        : '<span class="neg">Passt nicht auf die Karte</span>';
      const okb = this.ghostBar.querySelector<HTMLButtonElement>('.gok')!;
      okb.textContent = `Einfügen · ca. ${eur(this.game.bpCost())}`;
      okb.disabled = !fits;
      this.ghostBar.querySelector('.grot')!.classList.add('hidden');
      return;
    }
    const chk = sim.canBuild(tool, gh.x, gh.y);
    const [w, h] = this.game.ghostSize();
    const key = `${gh.x},${gh.y},${chk.ok},${chk.cost},${chk.reason},${sim.rot},${this.game.sim.used}`;
    if (key === this.ghostKey) return;
    this.ghostKey = key;
    const label = tool === 'truck' || tool === 'crane' || tool === 'lcrane' ? `${this.game.sim.used ? 'Gebraucht' : 'Neu'} ` : '';
    this.ghostBar.querySelector('.ghosttext')!.innerHTML = chk.ok
      ? `<b>${w > 1 || h > 1 ? `${w}×${h} Felder` : 'Vorschau'}</b> · Ziehen zum Verschieben, nochmal tippen zum Bauen`
      : `<span class="neg">${chk.reason ?? 'Hier geht es nicht'}</span> · Ziehen zum Verschieben`;
    const ok = this.ghostBar.querySelector<HTMLButtonElement>('.gok')!;
    ok.textContent = `${label}Platzieren · ${eur(chk.cost)}`;
    ok.disabled = !chk.ok;
    this.ghostBar.querySelector('.grot')!.classList.toggle('hidden', sizeOf(tool)[0] === sizeOf(tool)[1]);
  }

  private renderZones(sim: Sim) {
    const on = this.game.tool === 'zone';
    this.zoneCard.classList.toggle('hidden', !on);
    if (!on) return;
    const rep = sim.zoneReport();
    const key = JSON.stringify(rep);
    if (key === this.zoneKey) return;
    this.zoneKey = key;
    if (!rep.length) {
      this.zoneCard.innerHTML = `<div class="ctitle"><span>Zonen</span></div><div class="sub">Noch keine Zonen. Zonen trennen Kreisläufe: Fahrten gibt es nur zwischen Kran, Lager, Gate, Halle und Bahn derselben Farbe. Trucks ohne Zone fahren überall, Trucks mit Zone nur in ihrer.</div>`;
      return;
    }
    const n = (v: number, word: string) => (v ? `${v} ${word}` : '');
    this.zoneCard.innerHTML =
      `<div class="ctitle"><span>Zonen</span><button class="linkbtn" data-clearzones>Alle löschen</button></div>` +
      rep
        .map((r) => {
          const parts = [n(r.cranes, 'Kran'), n(r.yard, 'Lager'), n(r.reefer, 'Kühl'), n(r.gates, 'Gate'), n(r.rails, 'Bahn'), n(r.plants, 'Halle'), n(r.trucks, 'Truck')].filter(Boolean).join(' · ');
          return `<div class="zrow"><div class="zhead"><span class="zdot" style="background:${hex(ZONES[r.z].color)}"></span><b>${r.z ? `Zone ${ZONES[r.z].name}` : 'Ohne Zone'}</b><span class="${r.problems.length ? 'neg' : 'pos'}">${r.problems.length ? '!' : 'ok'}</span></div><div class="sub">${parts || 'leer'}</div>${r.problems.map((p) => `<div class="zprob">${p}</div>`).join('')}</div>`;
        })
        .join('');
  }

  update(dt: number) {
    if (this.dayTimer > 0) {
      this.dayTimer -= dt;
      if (this.dayTimer <= 0) this.dayCard.classList.add('hidden');
    }
    this.acc += dt;
    if (this.acc < 0.12) return;
    this.acc = 0;
    const sim = this.game.sim;
    this.renderZones(sim);
    this.renderGhostBar(sim);

    this.moneyEl.textContent = eur(sim.money);
    this.moneyEl.classList.toggle('neg', sim.money < 0);
    this.repEl.textContent = String(Math.round(sim.rep));
    this.clockEl.textContent = `Tag ${sim.day} ${sim.clock}`;
    this.undoBtn.classList.toggle('off', !this.game.canUndo);

    // Hafenstufe
    const next = LEVELS[sim.level];
    this.levelName.textContent = `Stufe ${sim.level}`;
    this.levelBar.style.width = `${Math.round(sim.levelProgress * 100)}%`;
    this.levelEl.title =
      (next ? `${sim.levelName}: ${num(sim.handled)} von ${num(next.need)} Containern bis ${next.name}` : `${sim.levelName}: ${num(sim.handled)} Container umgeschlagen`) +
      (sim.status === 'play' ? `. Ziel: Weltklasse-Hafen bis Tag ${sim.goalDay}.` : '');
    const debt = sim.status === 'play' && sim.money < 0;
    this.alertEl.classList.toggle('hidden', !debt);
    if (debt) this.alertEl.textContent = `Minus: noch ${Math.max(1, sim.debtLimit - sim.debtDays)} ${sim.debtLimit - sim.debtDays === 1 ? 'Tag' : 'Tage'}`;
    if (sim.level !== this.lastLevel) {
      this.lastLevel = sim.level;
      for (const v of this.toolBtns.values()) {
        const need = UNLOCK[v.def.tool as BuildTool] ?? 1;
        const locked = sim.level < need;
        v.btn.classList.toggle('locked', locked);
        v.sub.textContent = locked ? `Stufe ${need}` : this.toolSub(v.def);
      }
      this.refreshTools();
    }

    const land = this.toolBtns.get('buyland');
    if (land && !land.btn.classList.contains('locked')) land.sub.textContent = `${Math.round(sim.plotPrice / 1000)}k`;

    // Wetter
    const f = sim.forecast;
    let wx = '';
    if (sim.weather === 'storm') wx = `Sturm bis ${sim.clockAt(sim.gm + sim.weatherLeft)}`;
    else if (sim.weather === 'fog') wx = `Nebel bis ${sim.clockAt(sim.gm + sim.weatherLeft)}`;
    else if (f && f.warned) wx = `${f.kind === 'storm' ? 'Sturm' : 'Nebel'} ab ${sim.clockAt(sim.gm + f.in)}`;
    this.weatherEl.classList.toggle('hidden', !wx);
    this.weatherEl.classList.toggle('now', sim.weather !== 'clear');
    this.weatherEl.textContent = wx;

    // Verträge: Zähler am Knopf, wenn Angebote offen und Plätze frei sind
    const open = sim.level >= 2 && sim.contracts.length < sim.maxContracts ? sim.offers.length : 0;
    this.dealBadge.classList.toggle('hidden', open === 0);
    this.dealBadge.textContent = String(open);
    if (!this.deals.classList.contains('hidden')) this.renderDeals(false);

    // Personal: Warnung am Knopf, wenn Leute fehlen
    const short = (Object.keys(ROLES) as Role[]).some((r) => sim.staffAvail(r) < sim.staffNeed(r));
    this.staffBadge.classList.toggle('hidden', !short);
    if (!this.staffModal.classList.contains('hidden')) this.renderStaff(false);
    if (!this.techModal.classList.contains('hidden')) this.renderTech(false);
    if (!this.ctlModal.classList.contains('hidden')) this.renderCtl(false);
    this.techBadge.classList.toggle('hidden', !TECH_IDS.some((id) => sim.canBuyTech(id).ok && sim.money > 2 * sim.canBuyTech(id).cost));

    // Mission
    const m = MISSIONS[sim.mission];
    if (m) {
      this.missionCard.classList.remove('hidden');
      this.missionCount.textContent = `MISSION ${sim.mission + 1} VON ${MISSIONS.length}`;
      this.missionTitle.textContent = m.title;
      this.missionText.textContent = m.text;
    } else {
      this.missionCard.classList.add('hidden');
    }

    // Engpass
    for (const s of STAGES) {
      const v = sim.stats[s.key];
      const r = this.bnRows.get(s.key)!;
      r.bar.style.width = `${Math.round(v * 100)}%`;
      r.bar.className = `bar ${utilClass(v)}`;
      r.val.textContent = `${Math.round(v * 100)} %`;
    }
    const b = sim.bottleneck();
    this.bnHint.textContent = b ? STAGES.find((s) => s.key === b)!.hint : sim.weather === 'storm' ? 'Sturm: Die Kräne stehen still.' : 'Kein Engpass erkennbar.';
    if (sim.jamShare > 0.2) this.bnHint.textContent += ` Stau: ${Math.round(sim.jamShare * 100)} % der Trucks stehen. Rote Straßen zeigen wo, Einbahnstraßen oder eine zweite Straße helfen.`;
    this.bnHint.classList.toggle('alert', b !== null || sim.jamShare > 0.2);
    const sum = this.bnCard.querySelector('.bnsum')!;
    sum.textContent = b ? `${STAGES.find((s) => s.key === b)!.label} ${Math.round(sim.stats[b] * 100)} %` : 'keiner';
    sum.className = `bnsum ${b ? 'alert' : ''}`;

    if (!this.finCard.classList.contains('hidden')) this.renderFinance(sim);
    this.updateSheet();
  }

  private renderFinance(sim: Sim) {
    const d = sim.today;
    const income = (b: typeof d) => b.fees + b.rail + b.exportFees + b.berth + b.bonus;
    const costs = (b: typeof d) => b.running + b.building + b.penalty + b.wages + b.interest + (b.power ?? 0);
    const inc = income(d);
    const exp = costs(d);
    const row = (label: string, v: number) => (v ? `<div class="fl sub"><span>${label}</span><span>${eur(v)}</span></div>` : '');
    const left = sim.goalDay - sim.day;
    const goal =
      sim.status === 'play'
        ? `<div class="goal"><b>Ziel: Weltklasse-Hafen bis Tag ${sim.goalDay}</b><span>Heute ist Tag ${sim.day}, noch ${Math.max(0, left)} ${left === 1 ? 'Tag' : 'Tage'}. Stufe ${sim.level}, Ziel ist Stufe ${GOAL_LEVEL}.${
            sim.debtDays ? ` <span class="neg">Konto seit ${sim.debtDays} Tagesabschluss im Minus, bei ${sim.debtLimit} ist es die Pleite.</span>` : ` Ist das Konto ${sim.debtLimit} Tagesabschlüsse in Folge im Minus, bist du pleite.`
          }</span></div>`
        : `<div class="goal"><b>${sim.status === 'won' ? 'Gewonnen' : sim.status === 'lost' ? 'Verloren' : 'Freies Spiel'}</b><span>${sim.endReason || 'Ohne Ziel und ohne Pleite.'}</span></div>`;

    // Verlauf der letzten Tage: Ergebnis und umgeschlagene Container
    const days = [...sim.history.slice(-7), d];
    const res = days.map((b) => income(b) - costs(b));
    const maxRes = Math.max(1, ...res.map(Math.abs));
    const cont = days.map((b) => b.handled);
    const maxCont = Math.max(1, ...cont);
    const label = (i: number) => (i === days.length - 1 ? 'heute' : `T${sim.day - (days.length - 1 - i)}`);
    const chart = (vals: number[], max: number, fmt: (v: number) => string, signed: boolean) =>
      `<div class="chart">${vals
        .map(
          (v, i) =>
            `<div class="col" title="${label(i)}: ${fmt(v)}"><span class="v">${fmt(v)}</span><span class="bar ${signed && v < 0 ? 'neg' : ''} ${i === vals.length - 1 ? 'now' : ''}" style="height:${Math.max(2, Math.round((Math.abs(v) / max) * 100))}%"></span><span class="l">${label(i)}</span></div>`,
        )
        .join('')}</div>`;
    const k = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));
    const y = sim.history.at(-1);

    const html = `
      ${goal}
      <h3>Heute</h3>
      <div class="fl"><b>Einnahmen</b><b>${eur(inc)}</b></div>
      ${row('Container am Gate', d.fees)}${row('Container per Bahn', d.rail)}${row('Export aufs Schiff', d.exportFees)}
      ${row('Liegegebühren', d.berth)}${row('Vertrags- und Stufenbonus', d.bonus)}
      <div class="fl"><b>Ausgaben</b><b>${eur(exp)}</b></div>
      ${row('Löhne', d.wages)}${row('Bau und Aufrüstung', d.building)}${row('Strafen', d.penalty)}${row('Wartung (Tagesabschluss)', d.running)}${row('Zinsen (Tagesabschluss)', d.interest)}${row('Strom aus dem Netz', d.power ?? 0)}
      <div class="fl total"><b>Ergebnis heute</b><b class="${inc - exp >= 0 ? 'pos' : 'neg'}">${eur(inc - exp)}</b></div>
      <div class="fl sub"><span>Laufend pro Tag: Wartung / Löhne</span><span>${eur(sim.runningCost())} / ${eur((Object.keys(ROLES) as Role[]).reduce((n, r) => n + sim.staff[r] * sim.wagePerHour(r) * 24, 0))}</span></div>
      ${sim.level >= 2 ? `<h3>Konkurrenz</h3><div class="fl sub"><span>${RIVAL_NAME}: pünktlich</span><span>${Math.round(sim.rivalRate * 100)} %</span></div><div class="fl sub"><span>Du gestern</span><span class="${sim.myRate !== null && sim.myRate < sim.rivalRate - 0.1 ? 'neg' : ''}">${sim.myRate === null ? '–' : `${Math.round(sim.myRate * 100)} %`}</span></div><p class="sub">Liegst du mehr als 10 Punkte darunter, wechseln Reedereien und es kommen weniger freie Schiffe.${sim.lostToRival ? ` Bisher verloren: ${sim.lostToRival} Verträge.` : ''}</p>` : ''}
      <h3>Lage</h3>
      <div class="fl sub"><span>Weltlage</span><span class="${sim.world ? 'neg' : ''}">${sim.world ? `${WORLD[sim.world.id].name}${sim.world.product ? ` (${PRODUCTS[sim.world.product].name})` : ''}, noch ${sim.world.left} Tage` : 'ruhig'}</span></div>
      ${sim.traits.length ? `<div class="fl sub"><span>Hafen</span><span>${sim.traits.map((t) => TRAITS[t].name).join(', ')}</span></div>` : ''}
      <div class="fl sub"><span>Konjunktur</span><span class="${sim.cycle.kind === 'crisis' ? 'neg' : sim.cycle.kind === 'boom' ? 'pos' : ''}">${sim.cycleInfo.name} (noch ${sim.cycle.left} ${sim.cycle.left === 1 ? 'Tag' : 'Tage'})</span></div>
      <div class="fl sub"><span>Jahreszeit</span><span>${sim.season.name}: ${sim.season.text}</span></div>
      <div class="fl sub"><span>Richtung</span><span>${sim.spec ? SPECS[sim.spec].name : sim.level >= 3 ? 'noch offen' : 'ab Stufe 3'}</span></div>
      <div class="fl sub"><span>Lagergebühr</span><span>${eur(Math.round(6 * (1 + 0.05 * sim.tech.sales)))} pro Container und Tag</span></div>
      <h3>Markt</h3>
      ${(Object.keys(PRODUCTS) as ProductId[])
        .map((p) => {
          const d = sim.market[p] - sim.marketPrev[p];
          const arrow = d > 0.02 ? '<span class="pos">▲</span>' : d < -0.02 ? '<span class="neg">▼</span>' : '<span class="sub">●</span>';
          return `<div class="fl sub"><span>${PRODUCTS[p].name}</span><span>${arrow} ${eur(sim.price(p))}</span></div>`;
        })
        .join('')}
      <h3>Kredit</h3>
      <div class="fl sub"><span>Offen</span><span>${eur(sim.loan)} von ${eur(sim.loanLimit)}</span></div>
      <div class="fl sub"><span>Zinsen pro Tag</span><span>${eur(sim.interestPerDay)}</span></div>
      <div class="fl sub"><span>Kreditwürdigkeit</span><span class="${sim.rateMul > 1.15 ? 'neg' : sim.rateMul < 0.95 ? 'pos' : ''}">Zinsfaktor ${sim.rateMul.toFixed(2)} (Ruf und Pünktlichkeit)</span></div>
      <h3>Ergebnis pro Tag</h3>
      ${chart(res, maxRes, k, true)}
      <h3>Container pro Tag</h3>
      ${chart(cont, maxCont, (v) => String(v), false)}
      ${y ? `<p class="sub">Gestern: ${y.ships} Schiffe abgefertigt, davon ${y.onTime} pünktlich.</p>` : ''}
      <div class="fl sub"><span>Gesamt: Schiffe / Container</span><span>${num(sim.shipsDone)} / ${num(sim.handled)}</span></div>`;
    if (html !== this.lastFin) {
      this.finBody.innerHTML = html;
      this.lastFin = html;
    }
    // Die Kredit-Knöpfe stehen fest unten und werden nur umgeschaltet, damit sie sich zuverlässig antippen lassen
    this.finCard.querySelector<HTMLButtonElement>('[data-loan="repay"]')!.disabled = sim.loan <= 0;
    this.finCard.querySelector<HTMLButtonElement>('[data-loan="take"]')!.disabled = sim.loan + 100_000 > sim.loanLimit;
  }

  private renderStaff(force: boolean) {
    const sim = this.game.sim;
    const roles = Object.keys(ROLES) as Role[];
    const tr = sim.trucks;
    const byRole = (Object.keys(ROLE_NAMES) as TruckRole[]).map((r) => [r, tr.filter((t) => t.role === r).length] as const);
    const fleet = {
      total: tr.length,
      agv: tr.filter((t) => t.agv).length,
      broken: tr.filter((t) => t.wear >= 1).length,
      worn: tr.filter((t) => t.wear > 0.75 && t.wear < 1).length,
      idle: tr.filter((t) => !t.job && t.wait <= 0 && t.wear < 1).length,
      jam: tr.filter((t) => t.stuck > 0).length,
      noDriver: tr.filter((t) => !t.staffed).length,
      cranes: sim.cranes.length,
      big: sim.cranes.filter((c) => c.big).length,
      cranesBroken: sim.cranes.filter((c) => c.wear >= 1).length,
    };
    const key = roles.map((r) => `${sim.staff[r]}:${sim.sick[r].length}:${sim.staffNeed(r)}:${Math.round(sim.xp[r] * 100)}`).join('|') + JSON.stringify(fleet) + byRole.join() + `|${sim.nightShift}|${sim.wagePolicy}|${Math.round(sim.mood * 100)}|${roles.map((r) => `${sim.trainLeft[r]}${Math.floor(sim.money / 5000)}`).join()}`;
    if (!force && key === this.lastStaff) return;
    this.lastStaff = key;
    const total = roles.reduce((n, r) => n + sim.staff[r] * sim.wagePerHour(r), 0);
    const dot = (r: TruckRole) => (ROLE_DOT[r] ? `<span class="dot" style="background:${ROLE_DOT[r]}"></span>` : '<span class="dot hollow"></span>');
    this.staffBody.innerHTML = `
      <h3>Fuhrpark</h3>
      <div class="stats">
        <div><b>${fleet.total}</b><span>Trucks</span></div>
        <div><b>${fleet.agv}</b><span>fahrerlos</span></div>
        <div><b>${fleet.idle}</b><span>ohne Auftrag</span></div>
        <div class="${fleet.jam ? 'warn' : ''}"><b>${fleet.jam}</b><span>im Stau</span></div>
        <div class="${fleet.broken ? 'bad' : ''}"><b>${fleet.broken}</b><span>ausgefallen</span></div>
        <div class="${fleet.noDriver ? 'bad' : ''}"><b>${fleet.noDriver}</b><span>ohne Fahrer</span></div>
      </div>
      <div class="roleList">${byRole.map(([r, n]) => `<div>${dot(r)}<span>${ROLE_NAMES[r].name}</span><b>${n}</b></div>`).join('')}</div>
      ${fleet.worn ? `<p class="sub">${fleet.worn} Trucks sind über 75 % abgenutzt.</p>` : ''}
      <div class="pm"><button class="secondary" data-fleet="auto">Alle auf Automatik</button></div>
      <p class="sub">Kräne: ${fleet.cranes}, davon ${fleet.big} Containerbrücken${fleet.cranesBroken ? `, <span class="neg">${fleet.cranesBroken} ausgefallen</span>` : ''}.</p>
      <h3>Betrieb und Stimmung</h3>
      <div class="deal">
        <div class="dl"><b>Stimmung</b><span class="tag ${sim.mood < 0.35 ? 'neg' : ''}">${Math.round(sim.mood * 100)} %</span></div>
        <div class="progress"><span style="width:${Math.round(sim.mood * 100)}%"></span></div>
        <div class="meta">${sim.mood < 0.25 ? 'Streikgefahr!' : sim.mood < 0.4 ? 'Schlecht: mehr Krankmeldungen' : sim.mood > 0.7 ? 'Gut: etwas mehr Tempo' : 'In Ordnung'}. Sie hängt von Lohn, Nachtschicht, Krankenstand und Akkord ab.</div>
        <div class="rolelabel">Schichtbetrieb</div>
        <div class="roles"><button data-shift="night" class="${sim.nightShift ? 'on' : ''}">Nachtschicht (+20 % Lohn nachts)</button><button data-shift="day" class="${sim.nightShift ? '' : 'on'}">Nur Tagschicht (nachts halbe Leistung)</button></div>
        <div class="rolelabel">Lohnpolitik</div>
        <div class="roles">${(Object.keys(WAGE_POLICY) as WagePolicy[]).map((w) => `<button data-wage="${w}" class="${sim.wagePolicy === w ? 'on' : ''}">${WAGE_POLICY[w].name} (${w === 'normal' ? '±0' : w === 'low' ? '−15' : '+20'} %)</button>`).join('')}</div>
      </div>
      <h3>Personal</h3>
      <p class="sub">Wer einen Truck, Kran oder ein Gate kauft, stellt automatisch jemanden dafür ein. Jeden Morgen können sich Leute für ein bis zwei Tage krankmelden. Sie bekommen weiter Lohn, ihre Maschine steht aber still. Stelle Ersatz ein, wenn du das abfedern willst.</p>
      ${roles
        .map((r) => {
          const need = sim.staffNeed(r);
          const sick = sim.sick[r].length;
          const avail = sim.staffAvail(r);
          const miss = Math.max(0, need - avail);
          return `<div class="deal">
            <div class="dl"><b>${ROLES[r].name}</b><span class="tag">${sim.wagePerHour(r)} € pro Stunde</span></div>
            <div class="meta">Erfahrung ${Math.round(sim.xp[r] * 100)} %: Tempo ${Math.round((0.85 + 0.3 * sim.xp[r]) * 100)} %. Neue Leute fangen bei 30 % an und drücken den Schnitt.</div>
            <div class="terms"><span>Angestellt ${sim.staff[r]}</span><span>Gebraucht ${need}</span>${sick ? `<span class="neg">Krank ${sick}</span>` : ''}${
              miss ? `<span class="neg">Es fehlen ${miss}</span>` : avail > need ? `<span class="pos">Reserve ${avail - need}</span>` : ''
            }</div>
            <div class="meta">${ROLES[r].need}</div>
            <div class="pm"><button class="secondary" data-fire="${r}">Entlassen</button><button class="primary" data-hire="${r}">Einstellen</button></div>
            <div class="pm"><button class="secondary" data-train="${r}" ${sim.canTrain(r).ok ? '' : 'disabled'}>${sim.trainLeft[r] > 0 ? `Weiterbildung läuft (${sim.trainLeft[r]} Tage)` : `Weiterbilden · ${eur(sim.trainCost(r))} (+20 % Erfahrung, 3 Tage eine Kraft weniger)`}</button></div>
          </div>`;
        })
        .join('')}
      <p class="sub">Löhne gesamt: ${eur(total)} pro Stunde, ${eur(total * 24)} pro Tag.</p>`;
  }

  private contractCard(c: Contract, active: boolean, canAccept: boolean): string {
    const st = SHIP_TYPES[c.ship];
    const condTag = c.cond === 'export' ? '<span class="tag">Export muss mit</span>' : c.cond === 'rush' ? '<span class="tag">Eilauftrag</span>' : c.cond === 'exclusive' ? '<span class="tag">Exklusiv</span>' : '';
    const condText = c.cond === 'export' ? 'Pünktlich zählt nur, wenn der gesamte Export mitgeladen ist. Bonus +40 %.' : c.cond === 'rush' ? 'Eilauftrag: 20 % kürzere Liegezeit, dafür Bonus +50 %.' : c.cond === 'exclusive' ? 'Exklusiv: Solange der Vertrag läuft, kommen keine freien Schiffe. Bonus +60 %.' : '';
    const tags = `<span class="tag">${st.name} · ${st.containers} Container</span>${c.reefer ? '<span class="tag cold">Kühlfracht</span>' : ''}${condTag}`;
    const need =
      st.deep && !this.game.sim.hasDeepBerth(st.len)
        ? `<div class="warn">Braucht einen tiefen Liegeplatz mit ${st.len} Kai-Feldern.</div>`
        : c.reefer && this.game.sim.reeferCapacity === 0
          ? '<div class="warn">Braucht Kühlplätze.</div>'
          : '';
    const btn = active
      ? `<button class="secondary" data-cancel="${c.id}">${this.confirmCancel === c.id ? `Wirklich kündigen? −${eur(c.penalty * 2)}` : 'Kündigen'}</button>`
      : `<button class="primary" data-accept="${c.id}" ${canAccept ? '' : 'disabled'}>Annehmen</button>`;
    return `<div class="deal">
      <div class="dl"><span class="dot" style="background:${hex(c.color)}"></span><b>${c.line}</b></div>
      <div class="tags">${tags}</div>
      <div class="terms">
        <span>Alle ${hours(c.interval)}</span>
        <span>${active ? `noch ${c.calls} von ${c.callsTotal}` : `${c.calls}`} Anläufe</span>
        <span>Liegezeit höchstens ${hours(c.dwell)}</span>
        <span class="pos">Bonus ${eur(c.bonus)}</span>
        <span class="neg">Strafe ${eur(c.penalty)}</span>
        ${active ? `<span>Nächstes Schiff in ${hours(Math.max(0, c.next))}</span>` : ''}
      </div>${condText ? `<div class="meta">${condText}</div>` : ''}${active && c.missed ? '<div class="warn">Verwarnt: Der nächste verpasste Anlauf beendet den Vertrag.</div>' : ''}${need}${btn}</div>`;
  }

  /** Kleine Verlaufskurve als SVG */
  private spark(vals: number[], max: number, color: string, label: string, fmt: (v: number) => string): string {
    const w = 260;
    const h = 46;
    const m = Math.max(max, 1e-9);
    const n = vals.length;
    const pts = vals.map((v, i) => `${n < 2 ? 0 : (i / (n - 1)) * w},${h - 3 - (Math.min(v, m) / m) * (h - 6)}`).join(' ');
    const last = vals.at(-1) ?? 0;
    return `<div class="spark"><div class="sl"><span>${label}</span><b>${fmt(last)}</b></div><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/></svg></div>`;
  }

  private renderCtl(force: boolean) {
    const sim = this.game.sim;
    const key = `${this.ctlTab}|${sim.hourly.length}|${sim.tickCount >> 6}|${sim.rules.map((r) => `${r.cond}${r.act}${r.on}`).join()}`;
    if (!force && key === this.ctlKey) return;
    this.ctlKey = key;
    for (const b of this.ctlModal.querySelectorAll<HTMLElement>('[data-tab]')) b.classList.toggle('on', b.dataset.tab === this.ctlTab);
    const pct = (v: number) => `${Math.round(v * 100)} %`;
    const H = sim.hourly;
    let html = '';
    if (this.ctlTab === 'overview') {
      html = H.length < 2
        ? '<p class="sub">Die Messwerte sammeln sich stündlich. Lass das Spiel ein paar Stunden laufen.</p>'
        : `<p class="sub">Die letzten ${H.length} Stunden.</p>
          ${this.spark(H.map((h) => h.done), Math.max(...H.map((h) => h.done), 1), '#2f6db0', 'Container pro Stunde', (v) => String(v))}
          ${this.spark(H.map((h) => h.yard), 1, '#c9a227', 'Stapelplatz belegt', pct)}
          ${this.spark(H.map((h) => h.wait), Math.max(...H.map((h) => h.wait), 3), '#d9473f', 'Wartende Schiffe', (v) => String(v))}
          ${this.spark(H.map((h) => h.idle), 1, '#7d8da0', 'Trucks ohne Auftrag', pct)}
          ${this.spark(H.map((h) => h.jam), 1, '#e8602c', 'Trucks im Stau', pct)}`;
    } else if (this.ctlTab === 'devices') {
      const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
      html = `<h3>Kräne</h3><table class="ctltab"><tr><th>Kran</th><th>letzte Std.</th><th>Ø 24 Std.</th><th>Zustand</th></tr>${sim.cranes
        .map((c, i) => {
          const h = sim.craneHist.get(c.id) ?? [];
          return `<tr><td>${i + 1}. ${CRANE_MODELS[c.model].name}</td><td>${h.at(-1) ?? 0}</td><td>${avg(h).toFixed(1)}</td><td class="${c.wear > 0.75 ? 'neg' : ''}">${Math.round((1 - c.wear) * 100)} %</td></tr>`;
        })
        .join('')}</table>
        <h3>Gates</h3><table class="ctltab"><tr><th>Gate</th><th>letzte Std.</th><th>Ø 24 Std.</th><th>Warten</th></tr>${sim.gates
          .map((g, i) => {
            const h = sim.gateHist.get(g.id) ?? [];
            return `<tr><td>${i + 1}. Gate</td><td>${h.at(-1) ?? 0}</td><td>${avg(h).toFixed(1)}</td><td>${g.apron.length}</td></tr>`;
          })
          .join('')}</table>
        <h3>Hallen</h3><table class="ctltab"><tr><th>Halle</th><th>Eingang</th><th>Ausgang</th><th>Gesamt</th></tr>${sim.plants
          .map((p) => `<tr><td>${PLANTS[p.kind].name}</td><td>${p.inBuf}</td><td>${p.outBuf}</td><td>${num(p.made)}</td></tr>`)
          .join('') || '<tr><td colspan="4">Keine</td></tr>'}</table>`;
    } else if (this.ctlTab === 'rules') {
      const opt = <K extends string>(rec: Record<K, string>, sel: K) =>
        (Object.keys(rec) as K[]).map((k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${rec[k]}</option>`).join('');
      html = `<p class="sub">Regeln werden jede Spielstunde geprüft. Ist die Bedingung erfüllt, führt der Leitstand die Aktion aus. Spätere Regeln gewinnen bei Widerspruch.</p>
        ${sim.rules
          .map(
            (r, i) => `<div class="rule ${r.on ? '' : 'off'}"><span><b>Wenn</b> ${RULE_CONDS[r.cond]} <b>dann</b> ${RULE_ACTS[r.act]}</span><div class="ruleb"><button class="secondary" data-rule="toggle:${i}">${r.on ? 'Aus' : 'An'}</button><button class="secondary" data-rule="del:${i}">Löschen</button></div></div>`,
          )
          .join('') || '<p class="sub">Noch keine Regel.</p>'}
        <div class="rule new"><label>Wenn <select name="cond">${opt(RULE_CONDS, this.newRule.cond)}</select></label><label>dann <select name="act">${opt(RULE_ACTS, this.newRule.act)}</select></label><button class="primary" data-rule="add:0">Regel hinzufügen</button></div>`;
    } else {
      const kw = sim.powerDemand();
      const sol = sim.solarNow();
      const cap = sim.batteryCap;
      html = `<div class="statecard">
          <div><span>Verbrauch</span><b>${Math.round(kw)} kW</b></div>
          <div><span>Solar gerade</span><b>${Math.round(sol)} kW</b></div>
          <div><span>Batterie</span><b>${cap ? `${Math.round(sim.batteryCharge)} von ${cap} kWh` : 'keine'}</b></div>
          <div><span>Netzpreis</span><b>0,30 € pro kWh</b></div>
          <div class="wide"><span>Status</span><b class="${sim.powerOutLeft > 0 ? 'neg' : ''}">${sim.powerOutLeft > 0 ? (sim.powerDown ? 'Stromausfall: Kräne und Hallen stehen' : 'Stromausfall: Batterien überbrücken') : 'Netz stabil'}</b></div>
        </div>
        ${H.length > 1 ? this.spark(H.map((h) => h.kw), Math.max(...H.map((h) => h.kw), 1), '#d9473f', 'Verbrauch (kW)', (v) => String(Math.round(v))) + this.spark(H.map((h) => h.solar), Math.max(...H.map((h) => h.kw), 1), '#f2c230', 'Solar (kW)', (v) => String(Math.round(v))) : ''}
        <p class="sub">Solarflächen (Gebäude-Reiter) liefern bei Sonne je 30 kW und senken die Stromrechnung. Batterien speichern 400 kWh und überbrücken Stromausfälle, ohne sie stehen Kräne und Hallen, und Kühlcontainer verderben schneller.</p>`;
    }
    this.ctlBody.innerHTML = html;
  }

  private renderTech(force: boolean) {
    const sim = this.game.sim;
    const key = `${sim.level}|${Math.floor(sim.money / 5000)}|${TECH_IDS.map((id) => sim.tech[id]).join(',')}`;
    if (!force && key === this.lastTech) return;
    this.lastTech = key;
    this.techBody.innerHTML =
      `<p class="sub">Kleine Verbesserungen für den ganzen Hafen. Jede Stufe kostet mehr und wird mit der Hafenstufe freigeschaltet.</p>` +
      TECH_IDS.map((id) => {
        const t = TECH[id];
        const n = sim.tech[id];
        const max = t.cost.length;
        const dots = Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
        const chk = sim.canBuyTech(id);
        const btn =
          n >= max
            ? '<span class="tag">voll ausgebaut</span>'
            : sim.level < t.level[n]
              ? `<div class="locknote">${ICONS.lock}<span>Stufe ${n + 1} ab Hafenstufe ${t.level[n]}</span></div>`
              : `<button class="primary" data-tech="${id}" ${chk.ok ? '' : 'disabled'}>Stufe ${n + 1} · ${eur(sim.techCost(id))}</button>`;
        return `<div class="deal tech"><div class="dl"><b>${t.name}</b><span class="dots">${dots}</span></div><div class="sub">${t.text} Pro Stufe ${t.per}.</div>${btn}</div>`;
      }).join('');
  }

  private renderDeals(force: boolean) {
    const sim = this.game.sim;
    const key = `${sim.level}|${sim.contracts.map((c) => `${c.id}:${c.calls}:${c.missed ?? 0}:${Math.round(c.next / 6)}`)}|${sim.offers.map((o) => o.id)}|${this.confirmCancel}`;
    if (!force && key === this.lastDeals) return;
    this.lastDeals = key;
    const free = sim.contracts.length < sim.maxContracts;
    this.dealsBody.innerHTML = `
      <p class="sub">Ohne Vertrag kommen nur kleine Küstenfrachter mit 60 Containern. Größere Schiffe kommen nur als Dauerauftrag nach Fahrplan. Pünktlich gibt es den Bonus, sonst die Strafe. Wer zweimal in Folge zu spät ist, verliert den Vertrag. Bei Sturm läuft die Liegezeit nicht.</p>
      <h3>Laufende Verträge (${sim.contracts.length} von ${sim.maxContracts})</h3>
      ${sim.contracts.length ? sim.contracts.map((c) => this.contractCard(c, true, false)).join('') : '<p class="sub">Noch kein Vertrag.</p>'}
      <h3>Angebote</h3>
      ${sim.offers.length ? sim.offers.map((c) => this.contractCard(c, false, free)).join('') : '<p class="sub">Neue Angebote kommen jeden Morgen.</p>'}
      ${free ? '' : '<p class="sub">Alle Vertragsplätze sind belegt. Die nächste Hafenstufe bringt mehr.</p>'}`;
  }

  private updateSheet() {
    const sel = this.game.selected;
    const sim = this.game.sim;
    if (!sel) {
      this.sheet.classList.add('hidden');
      this.lastSheet = '';
      this.lastActions = '';
      return;
    }
    let html = '';
    let actions = '';
    const gone = () => {
      this.game.selected = null;
    };
    // Zustand wie ein Akku: aktueller Zustand und Höchstwert, bis zu dem die Werkstatt repariert
    const wearRow = (w: number, cap = 1) =>
      sim.level >= 2 || cap < 1
        ? `<div class="meta ${w > 0.75 ? 'neg' : ''}">Zustand ${Math.round((1 - w) * 100)} % · Höchstwert ${Math.round(cap * 100)} %${cap < 0.6 ? ' · alt: fällt öfter aus' : ''}${w > 0.3 && !sim.shops.length && sim.level >= 2 ? ' · Ohne Werkstatt fällt es irgendwann aus' : ''}</div>
          <div class="progress cap"><span style="width:${Math.round((1 - w) * 100)}%"></span><i style="left:${Math.round(cap * 100)}%"></i></div>`
        : '';
    const buildRow = (b?: number, what = 'Im Bau') => (b ? `<div class="meta warnline">${what}: noch ${hours(b)}, bis dahin arbeitet es nicht</div>` : '');
    const overhaulBtn = (kind: 'crane' | 'truck', id: number, cap: number) => {
      if (cap >= 0.9) return '';
      const chk = sim.canOverhaul(kind, id);
      return `<button class="secondary" data-overhaul="1" ${chk.ok ? '' : 'disabled'} title="${chk.reason ?? ''}">Generalüberholung · ${eur(chk.cost)} (Höchstwert auf 90 %)</button>`;
    };
    const upgradeBtn = (kind: 'crane' | 'truck', label: string, info?: { cost: number; level: number }) => {
      const u = info ?? UPGRADE[kind];
      return sim.level < u.level
        ? `<div class="locknote">${ICONS.lock}<span>${label} ab Stufe ${u.level} (${LEVELS[u.level - 1].name})</span></div>`
        : `<button class="primary" data-upgrade="1">${label} · ${eur(u.cost)}</button>`;
    };
    if (sel.kind === 'ship') {
      const s = sim.ships.find((s) => s.id === sel.id);
      if (!s) return gone();
      const done = s.total - s.containers - s.reefers - s.haz;
      const late = s.atBerth > s.dwellTarget;
      const c = sim.contracts.find((c) => c.id === s.contractId);
      html = `<h3>${s.name} <span class="tag">${SHIP_TYPES[s.type].name}</span></h3>
        <div class="meta">${s.line}${c ? ` · Bonus ${eur(c.bonus)} bei pünktlicher Abfertigung` : ''}</div>
        <div class="progress"><span style="width:${Math.round((done / s.total) * 100)}%"></span></div>
        <div class="meta">${done} von ${s.total} Containern abgeladen${s.reefers ? `, noch ${s.reefers} Kühlcontainer an Bord` : ''}</div>
        ${s.exportTotal ? `<div class="progress exp"><span style="width:${Math.round((s.loaded / s.exportTotal) * 100)}%"></span></div><div class="meta">${s.loaded} von ${s.exportTotal} Export-Containern geladen</div>` : ''}
        <div class="why ${s.blocked ? 'alert' : ''}"><b>Warum steht das Schiff?</b><br>${s.reason || '–'}</div>
        ${s.state === 'unloading' ? `<div class="meta ${late ? 'neg' : ''}">Liegezeit ${hours(s.atBerth)} (zugesagt: ${hours(s.dwellTarget)})</div>` : ''}
        ${s.vip ? '<div class="meta pos">Vorgezogen: bekommt den nächsten freien Liegeplatz</div>' : ''}
        ${s.state === 'queued' && s.queuedFor > 0 ? `<div class="meta ${s.queuedFor > SHIP_PATIENCE_GM * DIFFS[sim.diff].patience * 0.6 ? 'neg' : ''}">Wartet seit ${hours(s.queuedFor)}, sagt nach ${hours(SHIP_PATIENCE_GM * DIFFS[sim.diff].patience)} ab</div>` : ''}`;
      if (s.state === 'queued' && !s.vip) actions = `<button class="secondary" data-vip="1">Vorziehen · ${eur(Math.round((3_000 * sim.inflation) / 500) * 500)} Lotsengebühr</button>`;
    } else if (sel.kind === 'crane') {
      const c = sim.cranes.find((c) => c.id === sel.id);
      if (!c) return gone();
      const st =
        c.state === 'working'
          ? 'Arbeitet am Schiff'
          : c.state === 'blocked'
            ? 'Blockiert: Container am Kran warten auf einen Truck'
            : c.state === 'storm'
              ? 'Steht wegen Sturm still'
              : c.state === 'power'
                ? 'Stromausfall: steht still'
              : 'Wartet auf ein Schiff';
      html = `<h3>${CRANE_MODELS[c.model].name} <span class="tag">${Math.round(movesPerHour(c.model) * (1 + 0.1 * sim.tech.spreader) * (sim.tech.akkord ? 1.2 : 1) * (sim.spec === 'hub' ? 1.15 : sim.spec === 'logi' ? 0.95 : 1))} Moves pro Stunde</span></h3>
        ${c.build ? buildRow(c.build, 'Im Bau oder Umbau') : `<div class="meta">${c.state === 'broken' ? 'Ausgefallen: wartet auf die Werkstatt' : st}</div>`}
        ${wearRow(c.wear, c.cap)}
        <div class="meta">Entladen am Kran: ${c.buffer + c.bufReef + c.bufHaz} von ${sim.bufCap(c)}${sim.level >= 2 ? ` · Export am Kran: ${c.expBuf} von ${sim.bufCap(c, true)}` : ''}</div>`;
      const ui = sim.upgradeInfo('crane', c.id);
      if (ui && !c.build) actions = upgradeBtn('crane', ui.label, ui);
      if (!c.build) actions += overhaulBtn('crane', c.id, c.cap);
    } else if (sel.kind === 'gate') {
      const g = sim.gates.find((g) => g.id === sel.id);
      if (!g) return gone();
      html = `<h3>Gate <span class="tag">${Math.round(30 * (1 + 0.2 * sim.tech.scanner))} Container pro Stunde</span></h3>
        ${buildRow(g.build)}
        <div class="meta">${g.proc > 0 ? (g.procIn ? 'Nimmt einen Export-Container an' : 'Fertigt einen Container ab') : 'Wartet auf Container'}</div>
        <div class="meta">Wartend nach draußen: ${g.apron.length} von ${GATE_APRON_CAP}${sim.level >= 2 ? ` · Export wartet auf Truck: ${g.inApron}` : ''}</div>
        <div class="meta">Abgefertigt: ${num(g.served)}</div>`;
    } else if (sel.kind === 'yard') {
      const kinds = [sim.stock[sel.id] - sim.stockRail[sel.id], sim.stockRail[sel.id], sim.stockExp[sel.id]].filter((n) => n > 0).length;
      html = `<h3>Stapelplatz <span class="tag">${sim.capAt(sel.id)} Container pro Feld${sim.rtgCovers(sel.id) ? ' mit Portalkran' : ''}</span></h3>
        <div class="meta"><span class="zdot" style="background:${hex(YARD_USES[sim.yardUse[sel.id]].color)}"></span>Zweck: ${YARD_USES[sim.yardUse[sel.id]].name}</div>
        <div class="meta">Dieses Feld: ${sim.stock[sel.id] - sim.stockRail[sel.id]} für die Straße, ${sim.stockRail[sel.id]} für die Bahn, ${sim.stockExp[sel.id]} Export</div>
        ${kinds > 1 ? '<div class="meta neg">Gemischt: Beim Abholen muss umgestapelt werden, das kostet Zeit. Mit „Lagerzweck“ sortieren.</div>' : ''}
        <div class="meta">Gesamt: ${sim.yardStock} von ${sim.yardCapacity}</div>`;
    } else if (sel.kind === 'hazmat') {
      html = `<h3>Gefahrgutfläche <span class="tag">${sim.capAt(sel.id)} Container pro Feld</span></h3>
        <div class="meta">Dieses Feld: ${sim.stock[sel.id]} · Gesamt: ${sim.hazStock} von ${sim.hazCapacity}</div>
        <div class="meta">Gefahrgut bringt 700 € pro Container. Die Fläche braucht 2 Felder Abstand zu Gates, Hallen und Werkstatt.</div>`;
    } else if (sel.kind === 'emptyyard') {
      html = `<h3>Leerlager <span class="tag">${sim.capAt(sel.id)} Container pro Feld</span></h3>
        <div class="meta">Dieses Feld: ${sim.stock[sel.id]} · Gesamt: ${sim.emptyStock} von ${sim.emptyCapacity}</div>
        <div class="meta">Hier landen leere Container aus der Packhalle. Die Befüllhalle macht daraus mit Ware aus Packhalle oder Zug einen Export-Container. Überzählige gehen für 90 € zurück an die Reederei.</div>`;
    } else if (sel.kind === 'reefer') {
      const left = sim.reeferTimeLeft(sel.id);
      html = `<h3>Kühlplatz <span class="tag">mit Strom</span></h3>
        <div class="meta">Dieses Feld: ${sim.stock[sel.id]} von ${YARD_CAP_PER_TILE} · Gesamt: ${sim.reeferStock} von ${sim.reeferCapacity}</div>
        <div class="meta ${left !== null && left < 120 ? 'neg' : ''}">${left === null ? 'Kein Kühlcontainer auf diesem Feld' : `Der älteste Container verdirbt in ${hours(Math.max(0, left))}`}</div>`;
    } else if (sel.kind === 'plant') {
      const p = sim.plants.find((p) => p.id === sel.id);
      if (!p) return gone();
      const cfg = PLANTS[p.kind];
      const pack = p.kind === 'pack';
      html = `<h3>${cfg.name} <span class="tag">${Math.round(60 / cfg.time)} pro Stunde</span></h3>
        ${buildRow(p.build)}
        <div class="meta">${p.kind === 'fill' ? 'Macht aus einem leeren Container und einer Ladung Ware einen Export-Container (+150 €). Leergut kommt aus dem Leerlager, Ware aus der Packhalle oder vom Zug.' : pack ? `Macht aus 2 Einheiten ausgepackter Ware 1 Container ${PRODUCTS[p.product].name} (zurzeit ${eur(sim.price(p.product))}).` : p.kind === 'cold' ? `Verarbeitet Kühlcontainer zu Lebensmitteln (zurzeit ${eur(sim.price('food'))} statt 400 €).` : 'Packt Import-Container vom Stapelplatz aus. Die Ware geht weiter zur Veredelung.'}</div>
        <div class="meta">Eingang: ${p.inBuf} von ${PLANT_BUF}${p.kind === 'fill' ? ` · Leergut: ${p.inEmpty} von ${PLANT_BUF}` : ''} · Ausgang: ${p.outBuf} von ${PLANT_BUF}${p.kind === 'unpack' ? ` · Leere Container: ${p.emptyOut}` : ''} · Hergestellt: ${num(p.made)}</div>
        <div class="meta ${p.outBuf >= PLANT_BUF ? 'neg' : ''}">${p.proc > 0 ? 'Arbeitet' : p.outBuf >= PLANT_BUF ? 'Ausgang voll: Es fehlt ein Truck, der abholt' : p.inBuf < cfg.needs ? 'Wartet auf Nachschub' : 'Bereit'}</div>`;
      if (pack) {
        actions = `<div class="rolelabel">Produkt</div><div class="roles">${(['elec', 'cloth'] as ProductId[])
          .map((q) => `<button data-product="${q}" class="${p.product === q ? 'on' : ''}">${PRODUCTS[q].name} · ${eur(sim.price(q))}</button>`)
          .join('')}</div>`;
      }
    } else if (sel.kind === 'shop') {
      const sh = sim.shops.find((q) => q.id === sel.id);
      if (!sh) return gone();
      const tgt = sh.target;
      html = `<h3>Werkstatt <span class="tag">braucht einen Mechaniker</span></h3>
        ${buildRow(sh.build)}
        <div class="meta">Repariert nur bis zum Höchstwert eines Geräts. Der Höchstwert sinkt mit der Nutzung, eine Generalüberholung hebt ihn wieder.</div>
        <div class="meta">${!sh.staffed ? 'Kein Mechaniker im Dienst. Stelle im Personal jemanden ein.' : tgt ? `Repariert gerade ${tgt.kind === 'crane' ? 'einen Kran' : 'einen Truck'}` : 'Wartet auf Arbeit. Repariert Geräte ab 30 % Verschleiß, das am stärksten abgenutzte zuerst.'}</div>
        <div class="meta">Ausgefallen: ${sim.trucks.filter((t) => t.wear >= 1).length + sim.cranes.filter((c) => c.wear >= 1).length} Geräte</div>`;
    } else if (sel.kind === 'rail') {
      const r = sim.rails.find((r) => r.id === sel.id);
      if (!r) return gone();
      const st =
        r.state === 'away'
          ? `Nächster Zug in ${hours(r.timer + RAIL_TRAVEL_GM)}`
          : r.state === 'arriving'
            ? 'Der Zug fährt ein'
            : r.state === 'loading'
              ? `Der Zug wird beladen, Abfahrt in ${Math.ceil(r.timer)} Minuten`
              : 'Der Zug fährt ab';
      html = `<h3>Gleisanschluss <span class="tag">bis zu ${RAIL_CAP} Container pro Zug</span></h3>
        ${buildRow(r.build)}
        <div class="progress"><span style="width:${Math.round((r.platform / RAIL_CAP) * 100)}%"></span></div>
        <div class="meta">Am Bahnsteig: ${r.platform} von ${RAIL_CAP} · Wert ${eur(r.value)}</div>
        <div class="meta">${st}</div>`;
    } else {
      const t = sim.trucks.find((t) => t.id === sel.id);
      if (!t) return gone();
      html = `<h3>${t.agv ? 'Fahrerloses Fahrzeug' : 'Truck'} <span class="tag">2 Container pro Fahrt</span></h3>
        ${t.build ? buildRow(t.build, 'In der Generalüberholung') : `<div class="meta">${t.wear >= 1 ? 'Ausgefallen: wartet auf die Werkstatt' : jobText(t.job)}</div>`}
        <div class="meta">Geladen: ${t.load}</div>
        ${wearRow(t.wear, t.cap)}`;
      const roles = (Object.keys(ROLE_NAMES) as TruckRole[]).filter((r) => r !== 'plant' || sim.level >= 2).filter((r) => r !== 'export' || sim.level >= 2);
      actions = `<div class="rolelabel">Aufgabe</div><div class="roles">${roles
        .map((r) => `<button data-role="${r}" class="${t.role === r ? 'on' : ''}">${ROLE_NAMES[r].name}</button>`)
        .join('')}</div><div class="meta">${ROLE_NAMES[t.role].text}${t.role === 'auto' ? '' : ' Feste Aufgabe: 25 % schneller, lädt doppelt so schnell.'}</div>`;
      if (!t.agv) actions += upgradeBtn('truck', 'Fahrerlos machen', sim.upgradeInfo('truck', t.id)!);
      if (!t.build) actions += overhaulBtn('truck', t.id, t.cap);
    }
    // Zone anzeigen, wo es eine gibt
    {
      const sel2 = this.game.selected!;
      let z = 0;
      if (sel2.kind === 'yard' || sel2.kind === 'reefer' || sel2.kind === 'hazmat' || sel2.kind === 'emptyyard') z = sim.zone[sel2.id];
      else if (sel2.kind === 'crane') z = sim.cranes.find((c) => c.id === sel2.id)?.zone ?? 0;
      else if (sel2.kind === 'gate') z = sim.gates.find((g) => g.id === sel2.id)?.zone ?? 0;
      else if (sel2.kind === 'plant') z = sim.plants.find((p) => p.id === sel2.id)?.zone ?? 0;
      else if (sel2.kind === 'rail') z = sim.rails.find((r) => r.id === sel2.id)?.zone ?? 0;
      else if (sel2.kind === 'truck') z = sim.trucks.find((t) => t.id === sel2.id)?.zone ?? 0;
      if (z) html += `<div class="meta"><span class="zdot" style="background:${hex(ZONES[z].color)}"></span>Zone ${ZONES[z].name}: arbeitet nur mit Zone ${ZONES[z].name}</div>`;
    }
    // Nur bei Änderung neu setzen, damit Knöpfe beim Antippen nicht verschwinden
    if (html !== this.lastSheet) {
      this.sheetBody.innerHTML = html;
      this.lastSheet = html;
    }
    if (actions !== this.lastActions) {
      this.sheetActions.innerHTML = actions;
      this.lastActions = actions;
    }
    this.sheet.classList.remove('hidden');
  }
}
