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
