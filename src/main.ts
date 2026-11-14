// Ohne eval(), damit das Spiel auch unter strenger Content-Security-Policy läuft (z. B. eingebettet).
import 'pixi.js/unsafe-eval';
import './style.css';
import { Game } from './game';
import { setupInput } from './ui/input';
import { UI } from './ui/ui';

async function boot() {
  const game = new Game();
  const host = document.getElementById('game')!;
  const hud = document.getElementById('hud')!;
  game.ui = new UI(game, hud);
  await game.start(host);
  setupInput(game, host);

  // Ton darf erst nach einer Nutzeraktion starten
  const unlock = () => game.sound.unlock();
  // iPhone und iPad zählen erst das Loslassen als Nutzeraktion, deshalb mehrere Ereignisse
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, unlock, { capture: true });
  document.addEventListener('visibilitychange', () => game.sound.setHidden(document.hidden));

  // Letzten Spielstand laden, sonst Menü zeigen
  if (game.hasSave() && game.load()) {
    game.setSpeed(1);
  } else {
    game.ui.showMenu();
  }

  // Test- und Debug-Zugriff: ?debug in der URL
  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as { __game: Game }).__game = game;
  }
}

boot();
