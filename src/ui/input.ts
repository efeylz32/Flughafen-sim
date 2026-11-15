import { Game, PAINT_TOOLS } from '../game';
import type { Tool } from '../sim/data';

const KEY_TOOLS: Record<string, Tool> = {
  v: 'view',
  k: 'kai',
  c: 'crane',
  r: 'road',
  y: 'yard',
  g: 'gate',
  t: 'truck',
  e: 'oneway',
  a: 'assign',
  x: 'demolish',
};

interface Ptr {
  x: number;
  y: number;
  sx: number;
  sy: number;
}

/** Zeigerbedienung für Maus und Touch: Tippen, Malen, Ziehen, Zoomen. */
export function setupInput(game: Game, el: HTMLElement) {
  const ptrs = new Map<number, Ptr>();
  let mode: 'none' | 'paint' | 'pan' | 'tap' | 'pinch' | 'rect' | 'ghostdrag' = 'none';
  let grab = { x: 0, y: 0 };
  let ghostMoved = false;
  let last: { x: number; y: number } | null = null;
  let failReason: string | null = null;
  let okCount = 0;
  let pinchDist = 0;

  const rel = (e: { clientX: number; clientY: number }) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const tileOf = (p: { x: number; y: number }) => game.renderer.screenToTile(p.x, p.y);

  function paintLine(a: { x: number; y: number }, b: { x: number; y: number }, skipFirst = false) {
    // Autobahn: Die Zugrichtung bestimmt, ob die Fahrbahnen waagerecht oder senkrecht liegen
    if (game.tool === 'hwy' && (a.x !== b.x || a.y !== b.y)) game.sim.rot = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
    // Bresenham über Felder
    let x0 = a.x;
    let y0 = a.y;
    const dx = Math.abs(b.x - x0);
    const dy = Math.abs(b.y - y0);
    const sx = x0 < b.x ? 1 : -1;
    const sy = y0 < b.y ? 1 : -1;
    let err = dx - dy;
    let first = true;
    for (;;) {
      if (!(skipFirst && first)) {
        const r = game.applyTool(x0, y0);
        if (r) failReason ??= r;
        else okCount++;
      }
      first = false;
      if (x0 === b.x && y0 === b.y) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Beendet einen Malzug: ein Rückgängig-Schritt, und eine Meldung, falls gar nichts ging. */
  function finishPaint() {
    game.endStroke();
    if (okCount === 0 && failReason) game.fail(failReason);
    failReason = null;
    okCount = 0;
  }

  el.addEventListener('contextmenu', (e) => e.preventDefault());

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    const p = rel(e);
    ptrs.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y });
    if (ptrs.size === 2) {
      if (mode === 'paint') finishPaint();
      game.rect = null;
      mode = 'pinch';
      game.hover = null;
      const [a, b] = [...ptrs.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      return;
    }
    if (ptrs.size > 2) return;
    failReason = null;
    okCount = 0;
    const wantPan = e.button === 1 || e.button === 2;
    if (wantPan) {
      mode = 'pan';
    } else if (game.tool === 'assign' || game.tool === 'copy') {
      mode = 'rect';
      const t = tileOf(p);
      game.rect = { x0: t.x, y0: t.y, x1: t.x, y1: t.y };
    } else if (PAINT_TOOLS.includes(game.tool)) {
      mode = 'paint';
      game.beginStroke();
      last = tileOf(p);
      paintLine(last, last);
      game.hover = { ...last, ok: game.previewOk(last.x, last.y) };
    } else {
      const t = tileOf(p);
      if (game.needsConfirm() && game.ghost && game.inGhost(t.x, t.y)) {
        // Die festgesetzte Vorschau lässt sich anfassen und verschieben
        mode = 'ghostdrag';
        ghostMoved = false;
        grab = { x: t.x - game.ghost.x, y: t.y - game.ghost.y };
      } else {
        mode = 'tap';
        if (e.pointerType !== 'mouse' && game.tool !== 'view' && !game.ghost) game.hover = { ...t, ok: game.previewOk(t.x, t.y) };
      }
    }
  });

  el.addEventListener('pointermove', (e) => {
    const p = rel(e);
    const ptr = ptrs.get(e.pointerId);
    if (!ptr) {
      if (e.pointerType === 'mouse' && game.tool !== 'view' && !game.ghost) {
        const t = tileOf(p);
        game.hover = { ...t, ok: game.previewOk(t.x, t.y) };
      }
      return;
    }
    const dx = p.x - ptr.x;
    const dy = p.y - ptr.y;
    ptr.x = p.x;
    ptr.y = p.y;

    if (mode === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) game.renderer.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinchDist);
      pinchDist = d;
      game.renderer.panBy(dx / 2, dy / 2);
      return;
    }
    if (mode === 'ghostdrag') {
      if (Math.hypot(p.x - ptr.sx, p.y - ptr.sy) > 6) ghostMoved = true;
      if (ghostMoved) {
        const t = tileOf(p);
        game.setGhost(t.x - grab.x, t.y - grab.y);
      }
      return;
    }
    if (mode === 'rect' && game.rect) {
      const t = tileOf(p);
      game.rect = { ...game.rect, x1: t.x, y1: t.y };
      return;
    }
    if (mode === 'paint') {
      const t = tileOf(p);
      if (last && (t.x !== last.x || t.y !== last.y)) {
        paintLine(last, t, true);
        last = t;
      }
      game.hover = { ...t, ok: game.previewOk(t.x, t.y) };
      return;
    }
    if (mode === 'tap' && Math.hypot(p.x - ptr.sx, p.y - ptr.sy) > 8) {
      mode = 'pan';
      game.hover = null;
    }
    if (mode === 'pan') game.renderer.panBy(dx, dy);
  });

  function end(e: PointerEvent) {
    const ptr = ptrs.get(e.pointerId);
    ptrs.delete(e.pointerId);
    if (!ptr) return;
    if (mode === 'tap' && ptrs.size === 0) {
      const t = tileOf(ptr);
      if (game.tool === 'view') {
        const w = game.renderer.screenToWorld(ptr.x, ptr.y);
        game.pick(w.x, w.y);
      } else if (game.needsConfirm()) {
        // Erst die Vorschau setzen oder verschieben, gebaut wird mit dem zweiten Klick
        game.setGhost(t.x, t.y);
      } else {
        const r = game.applyTool(t.x, t.y);
        if (r) game.fail(r);
      }
    } else if (mode === 'ghostdrag') {
      if (!ghostMoved) game.confirmGhost();
    } else if (mode === 'paint') {
      finishPaint();
    } else if (mode === 'rect' && game.rect) {
      if (game.tool === 'copy') game.copyRect(game.rect);
      else game.assignRect(game.rect);
      game.rect = null;
    }
    if (ptrs.size === 0) {
      mode = 'none';
      last = null;
      if (e.pointerType !== 'mouse') game.hover = null;
    } else if (mode === 'pinch' && ptrs.size < 2) {
      mode = 'pan';
    }
  }
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse' && ptrs.size === 0) game.hover = null;
  });

  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const p = rel(e);
      game.renderer.zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') {
      e.preventDefault();
      game.undo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space') {
      game.togglePause();
      e.preventDefault();
      return;
    }
    if (k === '1') game.setSpeed(1);
    else if (k === '2') game.setSpeed(3);
    else if (k === '3') game.setSpeed(8);
    else if (k === 'o') game.toggleOverlay();
    else if (k === 'm') game.toggleSound();
    else if (k === 'r') game.rotate();
    else if (k === 'enter' && game.ghost) game.confirmGhost();
    else if (k === 'escape' && game.ghost) game.cancelGhost();
    else if (k === 'escape') {
      game.setTool('view');
      game.selected = null;
    } else if (KEY_TOOLS[k]) game.setTool(KEY_TOOLS[k]);
  });
}
