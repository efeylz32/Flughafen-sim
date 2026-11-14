import type { Game } from '../game';
import { CRANE_BUFFER, GATE_APRON_CAP, SHIP_DWELL_TARGET_GM, Tool, YARD_CAP_PER_TILE } from '../sim/data';
import { MISSIONS } from '../sim/missions';

const eur = (n: number) => `${Math.round(n).toLocaleString('de-DE')} €`;

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS: Record<string, string> = {
  view: svg('<path d="M7 3.5l11 7-4.6 1.4 2.8 5.6-2.6 1.3-2.8-5.6L5.8 16z"/>'),
  kai: svg('<rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M3 9h18M7 9v4M12 9v4M17 9v4"/>'),
  crane: svg('<path d="M6 21V6M3 21h6M6 6h14M17 6v6"/><rect x="15" y="12" width="4" height="3" rx=".6"/><path d="M6 6l6-3"/>'),
  road: svg('<path d="M8.5 3L5 21M15.5 3L19 21"/><path d="M12 4.5v3M12 10.5v3M12 16.5v3"/>'),
  yard: svg('<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/>'),
  gate: svg('<path d="M3 20h18"/><path d="M5 20V9h14v11"/><path d="M5 13h14M9 9v4M14 9v4"/>'),
  truck: svg('<rect x="2" y="7" width="12" height="9" rx="1.2"/><path d="M14 10h4l3 3.5V16h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'),
  demolish: svg('<path d="M5 5l14 14M19 5L5 19"/>'),
  eye: svg('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  coins: svg('<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-1-1.6-1.5-2.8-1.5-1.8 0-3.2 1.8-3.2 4.3s1.4 4.3 3.2 4.3c1.2 0 2.2-.5 2.8-1.5M7.5 11h5M7.5 13h5"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  pause: svg('<path d="M8 5v14M16 5v14"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  undo: svg('<path d="M8 5.5L3.5 10 8 14.5"/><path d="M3.5 10H14a5.5 5.5 0 0 1 0 11h-3.5"/>'),
  sound: svg('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
  mute: svg('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  star: svg('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>'),
};

interface ToolDef {
  tool: Tool;
  label: string;
  sub: string;
  color: string;
}
const TOOLS: ToolDef[] = [
  { tool: 'view', label: 'Ansehen', sub: 'Info', color: '#5b6b82' },
  { tool: 'kai', label: 'Kai', sub: '5k', color: '#b8b2a3' },
  { tool: 'crane', label: 'Kran', sub: '80k', color: '#3b82c4' },
  { tool: 'road', label: 'Straße', sub: '500 €', color: '#59606a' },
  { tool: 'yard', label: 'Stapel', sub: '1k', color: '#c9b88a' },
  { tool: 'gate', label: 'Gate', sub: '20k', color: '#d9534f' },
  { tool: 'truck', label: 'Truck', sub: '25k', color: '#e0a030' },
  { tool: 'demolish', label: 'Abriss', sub: '50 %', color: '#8a8f98' },
];

const STAGES: { key: 'crane' | 'trucks' | 'yard' | 'gate'; label: string; hint: string }[] = [
  { key: 'crane', label: 'Kran', hint: 'Der Kran ist voll ausgelastet. Ein zweiter Kran am Liegeplatz verdoppelt das Tempo.' },
  { key: 'trucks', label: 'Trucks', hint: 'Die Trucks sind der Engpass. Kaufe mehr Trucks oder verkürze die Wege.' },
  { key: 'yard', label: 'Stapelplatz', hint: 'Der Stapelplatz läuft voll. Baue mehr Stapelplatz oder mehr Gates, damit Container abfließen.' },
  { key: 'gate', label: 'Gate', hint: 'Das Gate ist der Engpass. Baue ein weiteres Gate an die Straße.' },
];

const utilClass = (u: number) => (u < 0.6 ? 'ok' : u < 0.85 ? 'mid' : 'hi');

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export class UI {
  private acc = 1;
  private moneyEl!: HTMLElement;
  private repEl!: HTMLElement;
  private clockEl!: HTMLElement;
  private speedBtns: HTMLButtonElement[] = [];
  private toolBtns = new Map<Tool, HTMLButtonElement>();
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
  private toasts!: HTMLElement;
  private overlayBtn!: HTMLButtonElement;
  private undoBtn!: HTMLButtonElement;
  private soundBtn!: HTMLButtonElement;
  private menu!: HTMLElement;
  private resumeBtn!: HTMLButtonElement;

  constructor(
    private game: Game,
    private root: HTMLElement,
  ) {
    this.build();
  }

  private build() {
    const root = this.root;

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
    rep.title = 'Ruf';
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
        this.game.sound.play('click');
      });
      b.dataset.v = String(v);
      this.speedBtns.push(b);
      speed.appendChild(b);
    }
    top.append(money, rep, speed);

    this.clockEl = el('div', 'pill clock');

    // Rechte Knopfleiste
    const side = el('div', 'side');
    this.undoBtn = el('button', 'roundbtn');
    this.undoBtn.innerHTML = ICONS.undo;
    this.undoBtn.title = 'Rückgängig (Strg+Z)';
    this.undoBtn.setAttribute('aria-label', 'Rückgängig');
    this.undoBtn.addEventListener('click', () => this.game.undo());
    this.soundBtn = el('button', 'roundbtn');
    this.soundBtn.title = 'Ton an/aus (M)';
    this.soundBtn.setAttribute('aria-label', 'Ton an oder aus');
    this.soundBtn.addEventListener('click', () => this.game.toggleSound());
    this.overlayBtn = el('button', 'roundbtn');
    this.overlayBtn.innerHTML = ICONS.eye;
    this.overlayBtn.title = 'Engpass auf der Karte einfärben (O)';
    this.overlayBtn.setAttribute('aria-label', 'Engpass auf der Karte einfärben');
    this.overlayBtn.addEventListener('click', () => {
      this.game.toggleOverlay();
      this.game.sound.play('click');
    });
    const finBtn = el('button', 'roundbtn');
    finBtn.innerHTML = ICONS.coins;
    finBtn.title = 'Finanzen';
    finBtn.addEventListener('click', () => this.toggleCard(this.finCard));
    const menuBtn = el('button', 'roundbtn');
    menuBtn.innerHTML = ICONS.menu;
    menuBtn.title = 'Menü';
    menuBtn.addEventListener('click', () => this.showMenu());
    side.append(this.undoBtn, this.overlayBtn, finBtn, this.soundBtn, menuBtn);

    // Karten links
    const cards = el('div', 'cards');
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

    this.finCard = el('div', 'card fin hidden');
    this.finCard.innerHTML = `<div class="ctitle">Finanzen <button class="x" aria-label="Schließen">${ICONS.close}</button></div><div class="body"></div>`;
    this.finBody = this.finCard.querySelector('.body')!;
    this.finCard.querySelector('.x')!.addEventListener('click', () => this.finCard.classList.add('hidden'));

    cards.append(this.missionCard, this.bnCard, this.finCard);

    // Info-Blatt
    this.sheet = el('div', 'sheet hidden');
    this.sheet.innerHTML = `<button class="x" aria-label="Schließen">${ICONS.close}</button><div class="body"></div>`;
    this.sheetBody = this.sheet.querySelector('.body')!;
    this.sheet.querySelector('.x')!.addEventListener('click', () => (this.game.selected = null));

    // Werkzeugleiste
    const bar = el('div', 'toolbar');
    for (const t of TOOLS) {
      const b = el('button', 'tool');
      b.innerHTML = `<span class="ico" style="--c:${t.color}">${ICONS[t.tool]}</span><b>${t.label}</b><small>${t.sub}</small>`;
      b.addEventListener('click', () => {
        this.game.setTool(t.tool);
        this.game.sound.play('click');
      });
      b.title = `${t.label}`;
      this.toolBtns.set(t.tool, b);
      bar.appendChild(b);
    }

    this.toasts = el('div', 'toasts');

    // Menü
    this.menu = el('div', 'modal hidden');
    this.menu.innerHTML = `
      <div class="dialog">
        <h1>Hafen-Imperium</h1>
        <p class="sub">Prototyp · Phase 0: Ein Schiff, ein Container-Fluss</p>
        <button class="primary resume">Weiterspielen</button>
        <button class="primary demo">Demo-Hafen mit Engpass</button>
        <button class="secondary empty">Neuer leerer Hafen</button>
        <details><summary>Bedienung</summary>
          <ul>
            <li><b>Handy:</b> Werkzeug unten wählen, tippen oder ziehen zum Bauen. Mit zwei Fingern verschieben und zoomen, mit „Ansehen" auch mit einem Finger.</li>
            <li><b>PC:</b> Linksklick baut, Rechtsklick oder Mittelklick verschiebt, Mausrad zoomt.</li>
            <li><b>Rückgängig:</b> Der Pfeil-Knopf oder Strg+Z nimmt den letzten Bauschritt zurück, mit voller Erstattung. Das geht 4 Spielstunden lang, danach hilft nur der Abriss (50 %).</li>
            <li><b>Tasten:</b> Leertaste Pause, 1/2/3 Tempo, O Engpass einfärben, M Ton, V K C R Y G T X Werkzeuge, Esc Abbrechen.</li>
            <li><b>Ziel:</b> Finde den Engpass und beseitige ihn, bevor die Schiffe zu lange liegen.</li>
          </ul>
        </details>
        <button class="close-menu">Zurück zum Spiel</button>
      </div>`;
    this.resumeBtn = this.menu.querySelector('.resume')!;
    this.resumeBtn.addEventListener('click', () => {
      if (this.game.load()) this.hideMenu();
    });
    this.menu.querySelector('.demo')!.addEventListener('click', () => {
      this.game.newGame('demo');
      this.hideMenu();
    });
    this.menu.querySelector('.empty')!.addEventListener('click', () => {
      this.game.newGame('empty');
      this.hideMenu();
    });
    this.menu.querySelector('.close-menu')!.addEventListener('click', () => this.hideMenu());

    root.append(top, this.clockEl, side, cards, this.sheet, bar, this.toasts, this.menu);
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
  get menuOpen(): boolean {
    return !this.menu.classList.contains('hidden');
  }

  refreshSpeed() {
    for (const b of this.speedBtns) b.classList.toggle('on', Number(b.dataset.v) === this.game.speed);
  }
  refreshTools() {
    for (const [t, b] of this.toolBtns) b.classList.toggle('on', t === this.game.tool);
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
    this.repEl.textContent = String(Math.round(sim.rep));
    this.clockEl.textContent = `Tag ${sim.day} ${sim.clock}`;

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

    this.undoBtn.classList.toggle('off', !this.game.canUndo);

    // Engpass
    {
      for (const s of STAGES) {
        const v = sim.stats[s.key];
        const r = this.bnRows.get(s.key)!;
        r.bar.style.width = `${Math.round(v * 100)}%`;
        r.bar.className = `bar ${utilClass(v)}`;
        r.val.textContent = `${Math.round(v * 100)} %`;
      }
      const b = sim.bottleneck();
      this.bnHint.textContent = b ? STAGES.find((s) => s.key === b)!.hint : 'Kein Engpass erkennbar.';
      this.bnHint.classList.toggle('alert', b !== null);
    }

    // Finanzen
    if (!this.finCard.classList.contains('hidden')) {
      const d = sim.today;
      const inc = d.fees + d.berth;
      const exp = d.running + d.building;
      const y = sim.history.at(-1);
      this.finBody.innerHTML = `
        <div class="fl"><b>Einnahmen</b><b>${eur(inc)}</b></div>
        <div class="fl sub"><span>Container (Gate)</span><span>${eur(d.fees)}</span></div>
        <div class="fl sub"><span>Liegegebühren</span><span>${eur(d.berth)}</span></div>
        <div class="fl"><b>Ausgaben</b><b>${eur(exp)}</b></div>
        <div class="fl sub"><span>Betrieb (Tagesabschluss)</span><span>${eur(d.running)}</span></div>
        <div class="fl sub"><span>Bau</span><span>${eur(d.building)}</span></div>
        <div class="fl total"><b>Ergebnis heute</b><b class="${inc - exp >= 0 ? 'pos' : 'neg'}">${eur(inc - exp)}</b></div>
        ${y ? `<div class="fl sub"><span>Gestern</span><span>${eur(y.fees + y.berth - y.running - y.building)}</span></div>` : ''}
        <div class="fl sub"><span>Schiffe / Container gesamt</span><span>${sim.shipsDone} / ${sim.containersDone}</span></div>`;
    }

    this.updateSheet();
  }

  private updateSheet() {
    const sel = this.game.selected;
    const sim = this.game.sim;
    if (!sel) {
      this.sheet.classList.add('hidden');
      return;
    }
    let html = '';
    if (sel.kind === 'ship') {
      const s = sim.ships.find((s) => s.id === sel.id);
      if (!s) {
        this.game.selected = null;
        return;
      }
      const done = s.total - s.containers;
      const hours = s.atBerth / 60;
      const late = s.atBerth > SHIP_DWELL_TARGET_GM;
      html = `<h3>${s.name} <span class="tag">Containerschiff</span></h3>
        <div class="progress"><span style="width:${Math.round((done / s.total) * 100)}%"></span></div>
        <div class="meta">${done} von ${s.total} Containern abgeladen</div>
        <div class="why ${s.blocked ? 'alert' : ''}"><b>Warum steht das Schiff?</b><br>${s.reason || '–'}</div>
        ${s.state === 'unloading' ? `<div class="meta ${late ? 'neg' : ''}">Liegezeit ${hours.toFixed(1).replace('.', ',')} h (Ziel: ${SHIP_DWELL_TARGET_GM / 60} h)</div>` : ''}`;
    } else if (sel.kind === 'crane') {
      const c = sim.cranes.find((c) => c.id === sel.id);
      if (!c) {
        this.game.selected = null;
        return;
      }
      const st = c.state === 'working' ? 'Entlädt ein Schiff' : c.state === 'blocked' ? 'Blockiert: Container am Kran warten auf einen Truck' : 'Wartet auf ein Schiff';
      html = `<h3>Kran <span class="tag">20 Moves pro Stunde</span></h3><div class="meta">${st}</div><div class="meta">Container am Kran: ${c.buffer} von ${CRANE_BUFFER}</div>`;
    } else if (sel.kind === 'gate') {
      const g = sim.gates.find((g) => g.id === sel.id);
      if (!g) {
        this.game.selected = null;
        return;
      }
      html = `<h3>Gate <span class="tag">30 Container pro Stunde</span></h3><div class="meta">${g.proc > 0 ? 'Fertigt einen Container ab' : 'Wartet auf Container'}</div><div class="meta">Wartend: ${g.apron} von ${GATE_APRON_CAP} · Abgefertigt: ${g.served}</div>`;
    } else if (sel.kind === 'yard') {
      html = `<h3>Stapelplatz <span class="tag">${YARD_CAP_PER_TILE} Container pro Feld</span></h3><div class="meta">Dieses Feld: ${sim.stock[sel.id]} von ${YARD_CAP_PER_TILE}</div><div class="meta">Gesamt: ${sim.yardStock} von ${sim.yardCapacity}</div>`;
    } else {
      const t = sim.trucks.find((t) => t.id === sel.id);
      if (!t) {
        this.game.selected = null;
        return;
      }
      const what = !t.job ? 'Wartet auf einen Auftrag' : t.job.kind === 'C2Y' ? (t.job.stage === 0 ? 'Fährt zum Kran' : 'Bringt Container zum Stapelplatz') : t.job.stage === 0 ? 'Fährt zum Stapelplatz' : 'Bringt Container zum Gate';
      html = `<h3>Truck <span class="tag">2 Container pro Fahrt</span></h3><div class="meta">${what}</div><div class="meta">Geladen: ${t.load}</div>`;
    }
    this.sheetBody.innerHTML = html;
    this.sheet.classList.remove('hidden');
  }
}
