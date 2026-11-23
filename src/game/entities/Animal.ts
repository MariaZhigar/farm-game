import type { AnimalDef } from '../types';
import type { Field } from './Field';

export interface AnimalContext {
  dt: number;
  field: Field;
  animals: Animal[];
  onProduce: (animal: Animal) => void;
}

export class Animal {
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  facing: 1 | -1 = 1;
  hunger: number;
  state: 'wander' | 'seek' | 'eat' = 'wander';
  targetC = -1;
  targetR = -1;
  eatLeft = 0;
  produceLeft = 0;
  wanderLeft = 0;
  bob = Math.random() * 10;
  happy = 0;
  moving = false;

  constructor(
    readonly def: AnimalDef,
    cx: number,
    cy: number,
    hunger: number,
  ) {
    this.cx = cx;
    this.cy = cy;
    this.tx = cx;
    this.ty = cy;
    this.hunger = hunger;
  }

  get isHungry(): boolean {
    return this.hunger <= this.def.hungryAt && this.state !== 'eat';
  }

  update(ctx: AnimalContext): void {
    const { dt, field } = ctx;
    this.bob += dt;
    if (this.happy > 0) this.happy -= dt;
    this.hunger = Math.max(0, this.hunger - this.def.hungerRate * dt);

    if (this.produceLeft > 0) {
      this.produceLeft -= dt;
      if (this.produceLeft <= 0) {
        this.produceLeft = 0;
        ctx.onProduce(this);
      }
    }

    if (this.state === 'eat') {
      this.moving = false;
      this.eatLeft -= dt;
      if (this.eatLeft <= 0) {
        field.consume(this.targetC, this.targetR);
        this.hunger = 1;
        this.happy = 1.15;
        this.state = 'wander';
        this.wanderLeft = 0;
        this.targetC = -1;
        this.targetR = -1;
        if (this.produceLeft <= 0) this.produceLeft = this.def.produceDelay;
      }
      return;
    }

    const wantsFood = this.hunger <= this.def.hungryAt;
    if (wantsFood) {
      if (!this.targetValid(field)) {
        this.releaseTarget(field);
        const spot = field.nearestClaimable(this.cx, this.cy);
        if (spot) {
          this.state = 'seek';
          this.targetC = spot.c;
          this.targetR = spot.r;
          field.reserve(spot.c, spot.r);
          this.tx = spot.c + 0.5;
          this.ty = spot.r + 0.5;
        } else {
          this.state = 'wander';
        }
      }
    } else if (this.state === 'seek') {
      this.releaseTarget(field);
      this.state = 'wander';
    }

    if (this.state === 'seek') {
      const arrived = this.moveToward(this.tx, this.ty, dt, this.def.cellsPerSec * 1.12);
      if (arrived) {
        if (field.growthAt(this.targetC, this.targetR) >= 1) {
          this.state = 'eat';
          this.eatLeft = this.def.eatDuration;
          this.moving = false;
        } else {
          this.moving = false;
        }
      }
    } else {
      this.wander(dt, field.cols, field.rows);
    }

    this.separate(ctx.animals);
    this.clamp(field.cols, field.rows);
  }

  private targetValid(field: Field): boolean {
    if (this.state !== 'seek' || this.targetC < 0) return false;
    return field.growthAt(this.targetC, this.targetR) > 0;
  }

  private releaseTarget(field: Field): void {
    if (this.targetC >= 0) field.release(this.targetC, this.targetR);
    this.targetC = -1;
    this.targetR = -1;
  }

  private wander(dt: number, cols: number, rows: number): void {
    this.wanderLeft -= dt;
    const dx = this.tx - this.cx;
    const dy = this.ty - this.cy;
    if (this.wanderLeft <= 0 || dx * dx + dy * dy < 0.04) {
      this.tx = 0.45 + Math.random() * (cols - 0.9);
      this.ty = 0.45 + Math.random() * (rows - 0.9);
      this.wanderLeft = 1.4 + Math.random() * 2.2;
    }
    this.moveToward(this.tx, this.ty, dt, this.def.cellsPerSec * 0.55);
  }

  private moveToward(tx: number, ty: number, dt: number, speed: number): boolean {
    const dx = tx - this.cx;
    const dy = ty - this.cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.08) {
      this.cx = tx;
      this.cy = ty;
      this.moving = false;
      return true;
    }
    const step = Math.min(dist, speed * dt);
    this.cx += (dx / dist) * step;
    this.cy += (dy / dist) * step;
    if (Math.abs(dx) > 0.05) this.facing = dx > 0 ? 1 : -1;
    this.moving = true;
    return false;
  }

  private separate(animals: Animal[]): void {
    for (const other of animals) {
      if (other === this || other.cx < 0) continue;
      const dx = this.cx - other.cx;
      const dy = this.cy - other.cy;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const min = 0.62;
      if (dist < min) {
        const push = ((min - dist) / min) * 0.35;
        this.cx += (dx / dist) * push;
        this.cy += (dy / dist) * push;
      }
    }
  }

  private clamp(cols: number, rows: number): void {
    this.cx = Math.min(cols - 0.35, Math.max(0.35, this.cx));
    this.cy = Math.min(rows - 0.35, Math.max(0.35, this.cy));
  }
}
