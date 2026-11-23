import { Game } from './game/Game';
import { attachPointer } from './game/input';
import { startLoop } from './game/loop';
import { Hud } from './ui/hud';

const canvasQuery = document.querySelector<HTMLCanvasElement>('#game');
const stageQuery = document.querySelector<HTMLElement>('#stage');
if (!canvasQuery || !stageQuery) throw new Error('Не найдено поле игры');
const canvas: HTMLCanvasElement = canvasQuery;
const stage: HTMLElement = stageQuery;

const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas недоступен');
const ctx: CanvasRenderingContext2D = context;

const game = new Game();
const hud = new Hud(game);

function resize(): void {
  const rect = stage.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  game.setViewport(width, height, dpr);
}

const observer = new ResizeObserver(resize);
observer.observe(stage);
resize();

attachPointer(canvas, (x, y) => game.pointer(x, y));

if (import.meta.env.DEV) {
  window.__farm = {
    snapshot: () => game.snapshot(),
    pointer: (x, y) => game.pointer(x, y),
    advance: (seconds) => {
      const steps = Math.max(1, Math.round(seconds / 0.05));
      for (let i = 0; i < steps; i++) game.update(0.05);
    },
  };
}

startLoop((dt) => {
  game.update(dt);
  game.draw(ctx);
  hud.sync();
});
