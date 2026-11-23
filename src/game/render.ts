import type { Animal } from './entities/Animal';
import type { Field } from './entities/Field';
import { cellToPx, type Layout } from './layout';
import type { Drop, Floater } from './types';

export interface RenderState {
  layout: Layout;
  field: Field;
  animals: Animal[];
  drops: Drop[];
  wellRatio: number;
  scoopFlash: number;
  truck: number;
  floaters: Floater[];
  time: number;
}

export function render(ctx: CanvasRenderingContext2D, state: RenderState): void {
  const { layout } = state;
  const { width, height } = layout;
  ctx.clearRect(0, 0, width, height);
  drawMeadow(ctx, width, height, state.time);
  drawPlots(ctx, state);
  drawFence(ctx, layout);
  for (const animal of state.animals) drawAnimal(ctx, animal, layout);
  for (const drop of state.drops) drawDrop(ctx, drop, layout);
  drawWell(ctx, layout, state.wellRatio, state.scoopFlash);
  for (const floater of state.floaters) drawFloater(ctx, floater);
  if (state.truck > 0) drawTruck(ctx, width, height, state.truck);
}

function drawMeadow(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#b7eb72');
  sky.addColorStop(1, '#6fbf45');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 5; i++) {
    const x = ((i * 180 + time * 12) % (w + 160)) - 80;
    const y = 18 + (i % 3) * 16;
    ctx.beginPath();
    ctx.ellipse(x, y, 28, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 22, y + 2, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlots(ctx: CanvasRenderingContext2D, state: RenderState): void {
  const { field, layout, time } = state;
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const x = layout.gridX + c * layout.cell;
      const y = layout.gridY + r * layout.cell;
      ctx.fillStyle = (c + r) % 2 === 0 ? '#e6c48f' : '#dcb27a';
      roundRect(ctx, x + 3, y + 3, layout.cell - 6, layout.cell - 6, 8);
      ctx.fill();
      const growth = field.growthAt(c, r);
      if (growth > 0) drawGrass(ctx, x, y, layout.cell, growth, time, c, r);
    }
  }
}

function drawGrass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  growth: number,
  time: number,
  col: number,
  row: number,
): void {
  const h = cell * 0.42 * growth;
  const baseY = y + cell * 0.72;
  const colors = ['#2f8a2c', '#46ac3e', '#7dce4e'];
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const bx = x + cell * (0.2 + i * 0.15);
    const sway = Math.sin(time * 2.2 + col * 0.7 + row + i) * 2.2 * growth;
    ctx.strokeStyle = colors[i % colors.length];
    ctx.lineWidth = Math.max(2.4, cell * 0.045);
    ctx.beginPath();
    ctx.moveTo(bx, baseY);
    ctx.quadraticCurveTo(bx + sway, baseY - h * 0.55, bx + sway * 1.3, baseY - h);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(63, 140, 48, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + cell * 0.5, baseY + 1, cell * 0.22, cell * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFence(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const x = layout.gridX - 8;
  const y = layout.gridY - 8;
  const w = layout.gridW + 16;
  const h = layout.gridH + 16;
  ctx.strokeStyle = '#8d5a32';
  ctx.lineWidth = 5;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = '#c48a55';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  ctx.fillStyle = '#6d4324';
  const posts: Array<[number, number]> = [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ];
  for (let i = 1; i < 3; i++) {
    posts.push([x + (w * i) / 3, y], [x + (w * i) / 3, y + h]);
    posts.push([x, y + (h * i) / 3], [x + w, y + (h * i) / 3]);
  }
  for (const [px, py] of posts) {
    roundRect(ctx, px - 5, py - 6, 10, 16, 2);
    ctx.fill();
  }
}

function drawAnimal(ctx: CanvasRenderingContext2D, animal: Animal, layout: Layout): void {
  if (animal.cx < 0) return;
  const p = cellToPx(layout, animal.cx, animal.cy);
  const scale = layout.cell / 68;
  if (animal.def.id === 'cow') drawCow(ctx, p.x, p.y, scale, animal);
  else drawChicken(ctx, p.x, p.y, scale, animal);

  if (animal.happy > 0) drawBubble(ctx, p.x, p.y - layout.cell * 0.46, 'Сыта', '#2f7d32');
  else if (animal.isHungry) drawBubble(ctx, p.x, p.y - layout.cell * 0.46, 'Голод', '#b42318');
}

function drawChicken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  animal: Animal,
): void {
  const peck = animal.state === 'eat' ? Math.sin(animal.bob * 22) * 3 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(animal.facing * scale, scale);
  ctx.fillStyle = 'rgba(70, 40, 10, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f4efe6';
  ctx.beginPath();
  ctx.ellipse(-15, 2, 7, 5.5, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fffaf3';
  ctx.strokeStyle = '#3b2614';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-2, 4, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f3e2cb';
  ctx.beginPath();
  ctx.ellipse(-3, 6, 6.5, 4.5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const step = animal.moving ? Math.sin(animal.bob * 14) * 3 : 0;
  ctx.strokeStyle = '#e39b3e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, 13);
  ctx.lineTo(-6, 20 + step);
  ctx.moveTo(3, 13);
  ctx.lineTo(5, 20 - step);
  ctx.stroke();

  ctx.fillStyle = '#fffaf3';
  ctx.strokeStyle = '#3b2614';
  ctx.beginPath();
  ctx.arc(11, -6 + peck * 0.2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e23b3b';
  ctx.beginPath();
  ctx.arc(9, -13, 2.7, 0, Math.PI * 2);
  ctx.arc(13, -14.5, 3, 0, Math.PI * 2);
  ctx.arc(16.5, -11.5, 2.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f0a03a';
  ctx.beginPath();
  ctx.moveTo(17, -5 + peck);
  ctx.lineTo(25, -2 + peck);
  ctx.lineTo(17, 1 + peck);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#3b2614';
  ctx.beginPath();
  ctx.arc(13, -7, 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e23b3b';
  ctx.beginPath();
  ctx.ellipse(15, 1, 1.8, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCow(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, animal: Animal): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(animal.facing * scale, scale);
  ctx.fillStyle = 'rgba(70, 40, 10, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f7f7f4';
  ctx.strokeStyle = '#3b2614';
  ctx.lineWidth = 2;
  roundRect(ctx, -20, -2, 36, 20, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#3b2614';
  ctx.beginPath();
  ctx.ellipse(-8, 4, 5, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(4, 8, 4, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();

  const step = animal.moving ? Math.sin(animal.bob * 10) * 2 : 0;
  ctx.strokeStyle = '#d9d4cc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 16);
  ctx.lineTo(-12, 24 + step);
  ctx.moveTo(-4, 16);
  ctx.lineTo(-4, 24 - step);
  ctx.moveTo(8, 16);
  ctx.lineTo(8, 24 + step);
  ctx.moveTo(16, 16);
  ctx.lineTo(16, 24 - step);
  ctx.stroke();

  ctx.fillStyle = '#f7f7f4';
  ctx.beginPath();
  ctx.ellipse(20, -2, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f4d27a';
  ctx.beginPath();
  ctx.moveTo(14, -8);
  ctx.lineTo(12, -16);
  ctx.lineTo(18, -8);
  ctx.moveTo(24, -8);
  ctx.lineTo(28, -16);
  ctx.lineTo(26, -7);
  ctx.fill();

  ctx.fillStyle = '#3b2614';
  ctx.beginPath();
  ctx.arc(24, -3, 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e7a0b4';
  ctx.beginPath();
  ctx.ellipse(-16, 16, 3, 2.4, 0, 0, Math.PI * 2);
  ctx.ellipse(-10, 16, 3, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3b2614';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-18, 4);
  ctx.quadraticCurveTo(-28, animal.moving ? 0 : 8, -24, 12);
  ctx.stroke();
  ctx.restore();
}

function drawDrop(ctx: CanvasRenderingContext2D, drop: Drop, layout: Layout): void {
  const p = cellToPx(layout, drop.cx, drop.cy);
  const bob = Math.sin(drop.age * 3) * 1.5;
  const s = layout.cell / 46;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.fillStyle = 'rgba(70, 40, 10, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 12 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  if (drop.product === 'milk') {
    ctx.fillStyle = '#f4fbff';
    ctx.strokeStyle = '#3b2614';
    ctx.lineWidth = 2;
    roundRect(ctx, -8 * s, -12 * s, 16 * s, 22 * s, 3 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#49b3e6';
    ctx.fillRect(-8 * s, -2 * s, 16 * s, 5 * s);
  } else {
    ctx.fillStyle = '#fffaf2';
    ctx.strokeStyle = '#c9b08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-2.2 * s, -3 * s, 2.4 * s, 3.2 * s, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWell(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  ratio: number,
  flash: number,
): void {
  const { x, y, r } = layout.well;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#c4553a';
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, -r * 0.15);
  ctx.lineTo(0, -r * 1.15);
  ctx.lineTo(r * 1.05, -r * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a311f';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = flash > 0 ? '#eef6fb' : '#d5dbe3';
  ctx.strokeStyle = '#5c6774';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, r * 0.05, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const waterR = r * 0.48;
  ctx.fillStyle = '#2f86c4';
  ctx.beginPath();
  ctx.arc(0, r * 0.08, waterR, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, r * 0.08, waterR, 0, Math.PI * 2);
  ctx.clip();
  const level = Math.max(0.08, Math.min(1, ratio));
  ctx.fillStyle = '#7fd0f2';
  ctx.fillRect(-waterR, r * 0.08 + waterR - waterR * 2 * level, waterR * 2, waterR * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-waterR * 0.25, r * 0.08 + waterR - waterR * 2 * level + 2, waterR * 0.35, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string): void {
  ctx.save();
  ctx.font = '700 12px "Segoe UI", "Liberation Sans", "DejaVu Sans", sans-serif';
  const padX = 7;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 18;
  ctx.fillStyle = '#fffaf3';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundRect(ctx, x - w / 2, y - h, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x + 4, y);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - h / 2);
  ctx.restore();
}

function drawFloater(ctx: CanvasRenderingContext2D, floater: Floater): void {
  const t = 1 - floater.life / floater.max;
  ctx.save();
  ctx.globalAlpha = Math.max(0, floater.life / floater.max);
  ctx.fillStyle = '#3b2614';
  ctx.font = '800 16px "Segoe UI", "Liberation Sans", "DejaVu Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(floater.text, floater.x, floater.y - t * 28);
  ctx.restore();
}

function drawTruck(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const x = -140 + (1 - t) * (w + 260);
  const y = h * 0.62;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(70,40,10,0.15)';
  ctx.beginPath();
  ctx.ellipse(50, 36, 70, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f7fb';
  roundRect(ctx, 0, 0, 78, 36, 6);
  ctx.fill();
  ctx.strokeStyle = '#3b2614';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e07a3d';
  roundRect(ctx, 78, 10, 36, 26, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fd8ef';
  roundRect(ctx, 84, 14, 16, 12, 2);
  ctx.fill();
  const spin = (1 - t) * 18;
  for (const wx of [18, 58, 96]) drawWheel(ctx, wx, 36, spin);
  ctx.restore();
}

function drawWheel(ctx: CanvasRenderingContext2D, x: number, y: number, spin: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.fillStyle = '#3b2614';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f4f7fb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(5, 0);
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 5);
  ctx.stroke();
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
