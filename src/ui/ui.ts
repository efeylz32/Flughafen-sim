import type { Game } from '../game';
import {
  BuildTool,
  CRANE_BUFFER,
  DIFFS,
  DiffId,
  ROLES,
  Role,
  CRANE_EXP_BUFFER,
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
} from '../sim/data';
import { MISSIONS } from '../sim/missions';
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
  road: svg('<path d="M8.5 3L5 21M15.5 3L19 21"/><path d="M12 4.5v3M12 10.5v3M12 16.5v3"/>'),
  yard: svg('<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/>'),
  reefer: svg('<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>'),
  gate: svg('<path d="M3 20h18"/><path d="M5 20V9h14v11"/><path d="M5 13h14M9 9v4M14 9v4"/>'),
  rail: svg('<path d="M7 3v18M17 3v18"/><path d="M7 6h10M7 10h10M7 14h10M7 18h10"/>'),
  truck: svg('<rect x="2" y="7" width="12" height="9" rx="1.2"/><path d="M14 10h4l3 3.5V16h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'),
  unpack: svg('<path d="M3 20V9l4.5 3V9l4.5 3V9l4.5 3V5h4.5v15z"/><path d="M7 16h3M13 16h3"/>'),
  pack: svg('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>'),
  assign: svg('<rect x="3.5" y="5" width="17" height="14" rx="1.5" stroke-dasharray="3 2.4"/><path d="M8 12.5l2.6 2.6L16 9.5"/>'),
  chart: svg('<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="6" rx=".6"/><rect x="12" y="8" width="3" height="10" rx=".6"/><rect x="17" y="10.5" width="3" height="7.5" rx=".6"/>'),
  dredge: svg('<path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M12 11v9M8.5 16.5L12 20l3.5-3.5"/>'),
  demolish: svg('<path d="M5 5l14 14M19 5L5 19"/>'),
  eye: svg('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  coins: svg('<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-1-1.6-1.5-2.8-1.5-1.8 0-3.2 1.8-3.2 4.3s1.4 4.3 3.2 4.3c1.2 0 2.2-.5 2.8-1.5M7.5 11h5M7.5 13h5"/>'),
  deal: svg('<path d="M3 8.5l4-2 4 1.5 2-1.5h3l5 2.5v6l-3 1.5"/><path d="M3 8.5v7l3 1 5.5 3.5c1 .6 2-.2 1.8-1.2M11 8l-3 3.5c1.2 1.2 2.8 1 3.8 0l1.2-1 5 4.5"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  pause: svg('<path d="M8 5v14M16 5v14"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  undo: svg('<path d="M8 5.5L3.5 10 8 14.5"/><path d="M3.5 10H14a5.5 5.5 0 0 1 0 11h-3.5"/>'),
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
  { cat: 'gear', tool: 'crane', label: 'Kran', sub: '80k', color: '#e2582c' },
  { cat: 'land', tool: 'road', label: 'Straße', sub: '500 €', color: '#59606a' },
  { cat: 'store', tool: 'yard', label: 'Stapel', sub: '1k', color: '#c9b88a' },
  { cat: 'build', tool: 'gate', label: 'Gate', sub: '20k', color: '#d9534f' },
  { cat: 'gear', tool: 'assign', label: 'Aufgaben', sub: 'Rahmen', color: '#2a6fdb' },
  { cat: 'gear', tool: 'truck', label: 'Truck', sub: '25k', color: '#e0a030' },
  { cat: 'build', tool: 'unpack', label: 'Packhalle', sub: '60k', color: '#c98a3c' },
  { cat: 'build', tool: 'pack', label: 'Veredeln', sub: '90k', color: '#7a5cc7' },
  { cat: 'store', tool: 'reefer', label: 'Kühlplatz', sub: '4k', color: '#3b9bd6' },
  { cat: 'build', tool: 'rail', label: 'Gleis', sub: '150k', color: '#5f6f82' },
  { cat: 'land', tool: 'dredge', label: 'Baggern', sub: '15k', color: '#1f5f95' },
  { cat: 'always', tool: 'demolish', label: 'Abriss', sub: '50 %', color: '#8a8f98' },
];

const STAGES: { key: 'crane' | 'trucks' | 'yard' | 'gate'; label: string; hint: string }[] = [
  { key: 'crane', label: 'Kran', hint: 'Der Kran ist voll ausgelastet. Ein zweiter Kran am Liegeplatz oder eine Containerbrücke verdoppelt das Tempo.' },
  { key: 'trucks', label: 'Trucks', hint: 'Die Trucks sind der Engpass. Kaufe mehr Trucks oder verkürze die Wege. Rote Straßen stauen sich: Baue dort eine zweite Straße.' },
  { key: 'yard', label: 'Stapelplatz', hint: 'Der Stapelplatz läuft voll. Baue mehr Stapelplatz oder mehr Ausgänge, damit Container abfließen.' },
  { key: 'gate', label: 'Gate', hint: 'Das Gate ist der Engpass. Baue ein weiteres Gate an die Straße.' },
];

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
  const store = j.cargo === 'reef' ? 'Kühlplatz' : 'Stapelplatz';
  const cargo = { imp: 'Container', reef: 'Kühlcontainer', exp: 'Export-Container', ware: 'ausgepackte Ware', prem: 'Fertigware' }[j.cargo];
  if (j.stage === 0) return `Fährt zu: ${j.srcKind === 'crane' ? 'Kran' : j.srcKind === 'gate' ? 'Gate' : j.srcKind === 'plant' ? 'Verarbeitung' : store}`;
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
  private resumeBtn!: HTMLButtonElement;
  private deals!: HTMLElement;
  private dealsBody!: HTMLElement;
  private staffModal!: HTMLElement;
  private staffBody!: HTMLElement;
  private staffBtn!: HTMLButtonElement;
  private staffBadge!: HTMLElement;
  private lastStaff = '';
  private diff: DiffId = 'normal';
  private rolePick!: HTMLElement;
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
    this.bnCard.innerHTML = `<div class="ctitle">Engpass-Überblick</div><div class="rows"></div><div class="hint"></div>`;
    const rows = this.bnCard.querySelector('.rows')!;
    for (const s of STAGES) {
      const r = el('div', 'row');
      r.innerHTML = `<span class="lbl">${s.label}</span><span class="track"><span class="bar"></span></span><span class="val"></span>`;
      rows.appendChild(r);
      this.bnRows.set(s.key, { bar: r.querySelector('.bar')!, val: r.querySelector('.val')! });
    }
    this.bnHint = this.bnCard.querySelector('.hint')!;

    this.finCard = el('div', 'modal hidden');
    this.finCard.innerHTML = `<div class="dialog deals fin"><div class="dhead"><h2>Bilanz</h2><button class="x" aria-label="Schließen">${ICONS.close}</button></div><div class="body"></div></div>`;
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

    left.append(status, this.missionCard, this.bnCard);

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
    this.staffBtn = mk(ICONS.people, 'Personal', () => {
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
    const finBtn = mk(ICONS.chart, 'Bilanz und Statistik', () => {
      this.toggleCard(this.finCard);
      click();
    });
    this.soundBtn = mk(ICONS.sound, 'Ton an oder aus', () => this.game.toggleSound());
    const menuBtn = mk(ICONS.menu, 'Menü', () => this.showMenu());
    side.append(this.undoBtn, this.dealBtn, this.staffBtn, this.overlayBtn, finBtn, this.soundBtn, menuBtn);

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
    });

    // Werkzeugleiste
    const bar = el('div', 'toolbar');
    const tabs = el('div', 'tabs');
    for (const c of CATS) {
      const b = el('button', 'tab', c.name);
      b.addEventListener('click', () => {
        this.cat = c.id;
        this.refreshTools();
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
    bar.append(this.rolePick, tabs, row);
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

    this.toasts = el('div', 'toasts');

    // Menü
    this.menu = el('div', 'modal hidden');
    this.menu.innerHTML = `
      <div class="dialog">
        <h1>Hafen-Imperium</h1>
        <p class="sub">Vom Anleger zum Weltklasse-Hafen</p>
        <button class="primary resume">Weiterspielen</button>
        <div class="difflabel">Schwierigkeit für ein neues Spiel</div>
        <div class="diff">${(Object.keys(DIFFS) as DiffId[]).map((d) => `<button data-diff="${d}">${DIFFS[d].name}</button>`).join('')}</div>
        <p class="sub difftext"></p>
        <button class="primary demo">Demo-Hafen mit Engpass</button>
        <button class="secondary empty">Neuer leerer Hafen</button>
        <details><summary>Bedienung</summary>
          <ul>
            <li><b>Handy:</b> Werkzeug unten wählen, tippen oder ziehen zum Bauen. Mit zwei Fingern verschieben und zoomen, mit „Ansehen" auch mit einem Finger.</li>
            <li><b>PC:</b> Linksklick baut, Rechtsklick oder Mittelklick verschiebt, Mausrad zoomt.</li>
            <li><b>Aufrüsten:</b> Mit „Ansehen" einen Kran oder Truck antippen, dann im Info-Blatt aufrüsten.</li>
            <li><b>Rückgängig:</b> Der Pfeil-Knopf oder Strg+Z nimmt den letzten Bauschritt zurück, mit voller Erstattung. Das geht 4 Spielstunden lang, danach hilft nur der Abriss (50 %).</li>
            <li><b>Tasten:</b> Leertaste Pause, 1/2/3 Tempo, O Engpass einfärben, M Ton, V K C R Y G T X Werkzeuge, Esc Abbrechen.</li>
          </ul>
        </details>
        <details><summary>Wie verdiene ich Geld?</summary>
          <ul>
            <li>Jeder Container, der den Hafen verlässt, bringt 200 €, Kühlcontainer 400 €, Export aufs Schiff 250 €.</li>
            <li>Jedes abgefertigte Schiff zahlt Liegegebühr. Verträge zahlen Bonus bei pünktlicher Abfertigung und Strafe bei Verspätung.</li>
            <li>Kräne, Trucks, Gates und Flächen kosten jeden Tag Betrieb. Die Finanzen zeigen, was heute läuft.</li>
          </ul>
        </details>
        <button class="close-menu">Zurück zum Spiel</button>
      </div>`;
    this.resumeBtn = this.menu.querySelector('.resume')!;
    this.resumeBtn.addEventListener('click', () => {
      if (this.game.load()) this.hideMenu();
    });
    const diffText = this.menu.querySelector('.difftext')!;
    const showDiff = () => {
      for (const b of this.menu.querySelectorAll<HTMLElement>('[data-diff]')) b.classList.toggle('on', b.dataset.diff === this.diff);
      const d = DIFFS[this.diff];
      diffText.textContent = `${d.text}. Startgeld ${eur(d.money)}.`;
    };
    for (const b of this.menu.querySelectorAll<HTMLElement>('[data-diff]')) {
      b.addEventListener('click', () => {
        this.diff = b.dataset.diff as DiffId;
        showDiff();
        click();
      });
    }
    showDiff();
    this.menu.querySelector('.demo')!.addEventListener('click', () => {
      this.game.newGame('demo', this.diff);
      this.hideMenu();
    });
    this.menu.querySelector('.empty')!.addEventListener('click', () => {
      this.game.newGame('empty', this.diff);
      this.hideMenu();
    });
    this.menu.querySelector('.close-menu')!.addEventListener('click', () => this.hideMenu());

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

    // Personal
    this.staffModal = el('div', 'modal hidden');
    this.staffModal.innerHTML = `<div class="dialog deals"><div class="dhead"><h2>Personal</h2><button class="x" aria-label="Schließen">${ICONS.close}</button></div><div class="body"></div></div>`;
    this.staffBody = this.staffModal.querySelector('.body')!;
    this.staffModal.querySelector('.x')!.addEventListener('click', () => this.staffModal.classList.add('hidden'));
    this.staffModal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === this.staffModal) return this.staffModal.classList.add('hidden');
      const h = t.closest<HTMLElement>('[data-hire]');
      const f = t.closest<HTMLElement>('[data-fire]');
      if (h) this.game.hire(h.dataset.hire as Role);
      else if (f) this.game.fire(f.dataset.fire as Role);
      this.renderStaff(true);
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
      this.showMenu();
    });

    // Neue Stufe
    this.levelUp = el('div', 'modal hidden');
    this.levelUp.innerHTML = `<div class="dialog levelup"><div class="body"></div><button class="primary go">Weiter</button></div>`;
    this.levelUpBody = this.levelUp.querySelector('.body')!;
    this.levelUp.querySelector('.go')!.addEventListener('click', () => {
      this.levelUp.classList.add('hidden');
      this.game.setSpeed(this.speedBeforeModal);
    });

    root.append(top, left, side, this.sheet, bar, this.toasts, this.menu, this.deals, this.staffModal, this.finCard, this.endModal, this.levelUp);
    this.refreshSpeed();
    this.refreshTools();
    this.refreshOverlay();
    this.refreshSound();
  }

  // ───────────────────────── Sichtbarkeit ─────────────────────────

  private toggleCard(c: HTMLElement) {
    c.classList.toggle('hidden');
  }

  showMenu() {
    this.resumeBtn.style.display = this.game.hasSave() ? '' : 'none';
    this.menu.classList.remove('hidden');
    this.game.setSpeed(0);
  }
  hideMenu() {
    this.menu.classList.add('hidden');
    if (this.game.speed === 0) this.game.setSpeed(this.game.lastSpeed || 1);
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
  refreshTools() {
    // Die Abteilung folgt dem gewählten Werkzeug (auch bei Tastenkürzeln)
    const cur = this.toolBtns.get(this.game.tool)?.def.cat;
    if (cur && cur !== 'always') this.cat = cur;
    for (const [id, b] of this.catBtns) b.classList.toggle('on', id === this.cat);
    this.rolePick.classList.toggle('hidden', this.game.tool !== 'assign');
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

  update(dt: number) {
    this.acc += dt;
    if (this.acc < 0.12) return;
    this.acc = 0;
    const sim = this.game.sim;

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
        v.sub.textContent = locked ? `Stufe ${need}` : v.def.sub;
      }
    }

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
    this.bnHint.classList.toggle('alert', b !== null);

    if (!this.finCard.classList.contains('hidden')) this.renderFinance(sim);
    this.updateSheet();
  }

  private renderFinance(sim: Sim) {
    const d = sim.today;
    const income = (b: typeof d) => b.fees + b.rail + b.exportFees + b.berth + b.bonus;
    const costs = (b: typeof d) => b.running + b.building + b.penalty + b.wages + b.interest;
    const inc = income(d);
    const exp = costs(d);
    const row = (label: string, v: number) => (v ? `<div class="fl sub"><span>${label}</span><span>${eur(v)}</span></div>` : '');
    const left = sim.goalDay - sim.day;
    const goal =
      sim.status === 'play'
        ? `<div class="goal"><b>Ziel: Weltklasse-Hafen bis Tag ${sim.goalDay}</b><span>Heute ist Tag ${sim.day}, noch ${Math.max(0, left)} ${left === 1 ? 'Tag' : 'Tage'}. Stufe ${sim.level} von ${LEVELS.length}.${
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
      ${row('Löhne', d.wages)}${row('Bau und Aufrüstung', d.building)}${row('Strafen', d.penalty)}${row('Wartung (Tagesabschluss)', d.running)}${row('Zinsen (Tagesabschluss)', d.interest)}
      <div class="fl total"><b>Ergebnis heute</b><b class="${inc - exp >= 0 ? 'pos' : 'neg'}">${eur(inc - exp)}</b></div>
      <div class="fl sub"><span>Laufend pro Tag: Wartung / Löhne</span><span>${eur(sim.runningCost())} / ${eur((Object.keys(ROLES) as Role[]).reduce((n, r) => n + sim.staff[r] * sim.wagePerHour(r) * 24, 0))}</span></div>
      <h3>Kredit</h3>
      <div class="fl sub"><span>Offen</span><span>${eur(sim.loan)} von ${eur(sim.loanLimit)}</span></div>
      <div class="fl sub"><span>Zinsen pro Tag</span><span>${eur(sim.interestPerDay)}</span></div>
      <div class="pm"><button class="secondary" data-loan="repay" ${sim.loan ? '' : 'disabled'}>100.000 € tilgen</button><button class="primary" data-loan="take" ${sim.loan + 100_000 > sim.loanLimit ? 'disabled' : ''}>100.000 € leihen</button></div>
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
  }

  private renderStaff(force: boolean) {
    const sim = this.game.sim;
    const roles = Object.keys(ROLES) as Role[];
    const key = roles.map((r) => `${sim.staff[r]}:${sim.sick[r].length}:${sim.staffNeed(r)}`).join('|');
    if (!force && key === this.lastStaff) return;
    this.lastStaff = key;
    const total = roles.reduce((n, r) => n + sim.staff[r] * sim.wagePerHour(r), 0);
    this.staffBody.innerHTML = `
      <p class="sub">Wer einen Truck, Kran oder ein Gate kauft, stellt automatisch jemanden dafür ein. Jeden Morgen können sich Leute für ein bis zwei Tage krankmelden. Sie bekommen weiter Lohn, ihre Maschine steht aber still. Stelle Ersatz ein, wenn du das abfedern willst.</p>
      ${roles
        .map((r) => {
          const need = sim.staffNeed(r);
          const sick = sim.sick[r].length;
          const avail = sim.staffAvail(r);
          const miss = Math.max(0, need - avail);
          return `<div class="deal">
            <div class="dl"><b>${ROLES[r].name}</b><span class="tag">${sim.wagePerHour(r)} € pro Stunde</span></div>
            <div class="terms"><span>Angestellt ${sim.staff[r]}</span><span>Gebraucht ${need}</span>${sick ? `<span class="neg">Krank ${sick}</span>` : ''}${
              miss ? `<span class="neg">Es fehlen ${miss}</span>` : avail > need ? `<span class="pos">Reserve ${avail - need}</span>` : ''
            }</div>
            <div class="meta">${ROLES[r].need}</div>
            <div class="pm"><button class="secondary" data-fire="${r}">Entlassen</button><button class="primary" data-hire="${r}">Einstellen</button></div>
          </div>`;
        })
        .join('')}
      <p class="sub">Löhne gesamt: ${eur(total)} pro Stunde, ${eur(total * 24)} pro Tag.</p>`;
  }

  private contractCard(c: Contract, active: boolean, canAccept: boolean): string {
    const st = SHIP_TYPES[c.ship];
    const tags = `<span class="tag">${st.name} · ${st.containers} Container</span>${c.reefer ? '<span class="tag cold">Kühlfracht</span>' : ''}`;
    const need =
      c.ship === 'panamax' && !this.game.sim.hasDeepBerth()
        ? '<div class="warn">Braucht einen tiefen Liegeplatz mit 6 Kai-Feldern.</div>'
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
      </div>${need}${btn}</div>`;
  }

  private renderDeals(force: boolean) {
    const sim = this.game.sim;
    const key = `${sim.level}|${sim.contracts.map((c) => `${c.id}:${c.calls}:${Math.round(c.next / 6)}`)}|${sim.offers.map((o) => o.id)}|${this.confirmCancel}`;
    if (!force && key === this.lastDeals) return;
    this.lastDeals = key;
    if (sim.level < 2) {
      this.dealsBody.innerHTML = `<p class="sub">Verträge gibt es ab Stufe 2 (${LEVELS[1].name}). Schlage dafür ${num(LEVELS[1].need)} Container um, bisher sind es ${num(sim.handled)}.</p>`;
      return;
    }
    const free = sim.contracts.length < sim.maxContracts;
    this.dealsBody.innerHTML = `
      <p class="sub">Vertragsschiffe kommen nach Fahrplan. Pünktlich abgefertigt gibt es den Bonus, sonst die Strafe. Bei Sturm läuft die Liegezeit nicht.</p>
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
    const upgradeBtn = (kind: 'crane' | 'truck', label: string) => {
      const u = UPGRADE[kind];
      return sim.level < u.level
        ? `<div class="locknote">${ICONS.lock}<span>${label} ab Stufe ${u.level} (${LEVELS[u.level - 1].name})</span></div>`
        : `<button class="primary" data-upgrade="1">${label} · ${eur(u.cost)}</button>`;
    };
    if (sel.kind === 'ship') {
      const s = sim.ships.find((s) => s.id === sel.id);
      if (!s) return gone();
      const done = s.total - s.containers - s.reefers;
      const late = s.atBerth > s.dwellTarget;
      const c = sim.contracts.find((c) => c.id === s.contractId);
      html = `<h3>${s.name} <span class="tag">${SHIP_TYPES[s.type].name}</span></h3>
        <div class="meta">${s.line}${c ? ` · Bonus ${eur(c.bonus)} bei pünktlicher Abfertigung` : ''}</div>
        <div class="progress"><span style="width:${Math.round((done / s.total) * 100)}%"></span></div>
        <div class="meta">${done} von ${s.total} Containern abgeladen${s.reefers ? `, noch ${s.reefers} Kühlcontainer an Bord` : ''}</div>
        ${s.exportTotal ? `<div class="progress exp"><span style="width:${Math.round((s.loaded / s.exportTotal) * 100)}%"></span></div><div class="meta">${s.loaded} von ${s.exportTotal} Export-Containern geladen</div>` : ''}
        <div class="why ${s.blocked ? 'alert' : ''}"><b>Warum steht das Schiff?</b><br>${s.reason || '–'}</div>
        ${s.state === 'unloading' ? `<div class="meta ${late ? 'neg' : ''}">Liegezeit ${hours(s.atBerth)} (zugesagt: ${hours(s.dwellTarget)})</div>` : ''}`;
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
              : 'Wartet auf ein Schiff';
      html = `<h3>${c.big ? 'Containerbrücke' : 'Mobilkran'} <span class="tag">${c.big ? 40 : 20} Moves pro Stunde</span></h3>
        <div class="meta">${st}</div>
        <div class="meta">Entladen am Kran: ${c.buffer + c.bufReef} von ${CRANE_BUFFER}${sim.level >= 2 ? ` · Export am Kran: ${c.expBuf} von ${CRANE_EXP_BUFFER}` : ''}</div>`;
      if (!c.big) actions = upgradeBtn('crane', 'Zur Containerbrücke aufrüsten');
    } else if (sel.kind === 'gate') {
      const g = sim.gates.find((g) => g.id === sel.id);
      if (!g) return gone();
      html = `<h3>Gate <span class="tag">30 Container pro Stunde</span></h3>
        <div class="meta">${g.proc > 0 ? (g.procIn ? 'Nimmt einen Export-Container an' : 'Fertigt einen Container ab') : 'Wartet auf Container'}</div>
        <div class="meta">Wartend nach draußen: ${g.apron.length} von ${GATE_APRON_CAP}${sim.level >= 2 ? ` · Export wartet auf Truck: ${g.inApron}` : ''}</div>
        <div class="meta">Abgefertigt: ${num(g.served)}</div>`;
    } else if (sel.kind === 'yard') {
      html = `<h3>Stapelplatz <span class="tag">${YARD_CAP_PER_TILE} Container pro Feld</span></h3>
        <div class="meta">Dieses Feld: ${sim.stock[sel.id]} Import, ${sim.stockExp[sel.id]} Export</div>
        <div class="meta">Gesamt: ${sim.yardStock} von ${sim.yardCapacity}</div>`;
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
        <div class="meta">${pack ? 'Macht aus 2 Einheiten ausgepackter Ware 1 Container Fertigware (900 €).' : 'Packt Import-Container vom Stapelplatz aus. Die Ware geht weiter zur Veredelung.'}</div>
        <div class="meta">Eingang: ${p.inBuf} von ${PLANT_BUF} · Ausgang: ${p.outBuf} von ${PLANT_BUF} · Hergestellt: ${num(p.made)}</div>
        <div class="meta ${p.outBuf >= PLANT_BUF ? 'neg' : ''}">${p.proc > 0 ? 'Arbeitet' : p.outBuf >= PLANT_BUF ? 'Ausgang voll: Es fehlt ein Truck, der abholt' : p.inBuf < cfg.needs ? 'Wartet auf Nachschub' : 'Bereit'}</div>`;
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
        <div class="progress"><span style="width:${Math.round((r.platform / RAIL_CAP) * 100)}%"></span></div>
        <div class="meta">Am Bahnsteig: ${r.platform} von ${RAIL_CAP} · Wert ${eur(r.value)}</div>
        <div class="meta">${st}</div>`;
    } else {
      const t = sim.trucks.find((t) => t.id === sel.id);
      if (!t) return gone();
      html = `<h3>${t.agv ? 'Fahrerloses Fahrzeug' : 'Truck'} <span class="tag">2 Container pro Fahrt</span></h3>
        <div class="meta">${jobText(t.job)}</div>
        <div class="meta">Geladen: ${t.load}</div>`;
      const roles = (Object.keys(ROLE_NAMES) as TruckRole[]).filter((r) => r !== 'plant' || sim.level >= 2).filter((r) => r !== 'export' || sim.level >= 2);
      actions = `<div class="rolelabel">Aufgabe</div><div class="roles">${roles
        .map((r) => `<button data-role="${r}" class="${t.role === r ? 'on' : ''}">${ROLE_NAMES[r].name}</button>`)
        .join('')}</div><div class="meta">${ROLE_NAMES[t.role].text}${t.role === 'auto' ? '' : ' Feste Aufgabe: 25 % schneller, lädt doppelt so schnell.'}</div>`;
      if (!t.agv) actions += upgradeBtn('truck', 'Fahrerlos machen');
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
