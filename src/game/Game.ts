import { ANIMALS } from './config/animals';
import { LEVELS } from './config/levels';
import { PRODUCTS } from './config/products';
import { Animal } from './entities/Animal';
import { Field } from './entities/Field';
import { cellAt, cellToPx, computeLayout, type Layout } from './layout';
import { render } from './render';
import { clearSave, loadSave, writeSave, type SaveData } from './save';
import { coinsWord } from './text';
import { goalTarget, type AnimalId, type Drop, type Floater, type LevelConfig, type ProductId } from './types';

export interface ShopOffer {
  id: AnimalId;
  name: string;
  blurb: string;
  price: number;
  reason: string | null;
}

export interface HudModel {
  levelIndex: number;
  levelCount: number;
  title: string;
  hint: string;
  goalText: string;
  goalKind: 'collect' | 'earn';
  progress: number;
  target: number;
  coins: number;
  bucket: number;
  bucketMax: number;
  well: number;
  wellMax: number;
  warehouse: ProductId[];
  capacity: number;
  shop: ShopOffer[];
  completed: boolean;
  lastLevel: boolean;
  message: string;
  messageOn: boolean;
  messageCoin: boolean;
  animalCount: number;
  maxAnimals: number;
}

export interface FarmSnapshot {
  coins: number;
  bucket: number;
  well: number;
  progress: number;
  target: number;
  warehouse: number;
  capacity: number;
  drops: number;
  animals: number;
  hungry: number;
  completed: boolean;
  levelIndex: number;
  dropPoints: { x: number; y: number; product: ProductId }[];
  cells: { c: number; r: number; x: number; y: number; grass: number }[];
}

interface BeginOptions {
  coins?: number;
  goalProgress?: number;
  warehouse?: ProductId[];
  animals?: AnimalId[];
  bucket?: number;
  wellWater?: number;
  completed?: boolean;
}

export class Game {
  levelIndex = 0;
  coins = 0;
  goalProgress = 0;
  bucket = 0;
  wellWater = 0;
  warehouse: ProductId[] = [];
  animals: Animal[] = [];
  drops: Drop[] = [];
  floaters: Floater[] = [];
  field: Field = new Field(6, 6);
  layout: Layout = computeLayout(320, 320, 6, 6);
  time = 0;
  paused = false;
  completed = false;
  message = '';
  messageT = 0;
  messageCoin = false;
  truck = 0;
  scoopFlash = 0;
  cssW = 320;
  cssH = 320;
  dpr = 1;
  private nextDropId = 1;
  private level: LevelConfig = LEVELS[0];

  constructor() {
    const saved = loadSave();
    if (saved) this.applySave(saved);
    else this.beginLevel(0, {});
  }

  setViewport(width: number, height: number, dpr: number): void {
    this.cssW = Math.max(1, width);
    this.cssH = Math.max(1, height);
    this.dpr = dpr;
    this.layout = computeLayout(this.cssW, this.cssH, this.level.cols, this.level.rows);
    for (const animal of this.animals) {
      if (animal.cx < 0) this.placeAnimal(animal);
    }
  }

  update(dt: number): void {
    const step = Math.min(0.05, dt);
    if (this.messageT > 0) this.messageT = Math.max(0, this.messageT - step);
    if (this.truck > 0) this.truck = Math.max(0, this.truck - step / 1.35);
    if (this.scoopFlash > 0) this.scoopFlash = Math.max(0, this.scoopFlash - step);
    for (const floater of this.floaters) floater.life -= step;
    if (this.floaters.length) this.floaters = this.floaters.filter((floater) => floater.life > 0);

    if (this.paused) return;

    let left = dt;
    if (left > 1) {
      this.regen(Math.min(60, left));
      left = 0.05;
    }
    while (left > 0) {
      const slice = Math.min(0.05, left);
      this.simulate(slice);
      left -= slice;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    render(ctx, {
      layout: this.layout,
      field: this.field,
      animals: this.animals,
      drops: this.drops,
      wellRatio: this.level.wellMax ? this.wellWater / this.level.wellMax : 0,
      scoopFlash: this.scoopFlash,
      truck: this.truck,
      floaters: this.floaters,
      time: this.time,
    });
  }

  pointer(x: number, y: number): void {
    if (this.completed) return;
    const well = this.layout.well;
    const dx = x - well.x;
    const dy = y - well.y;
    if (dx * dx + dy * dy <= (well.r + 10) ** 2) {
      this.scoop();
      return;
    }

    const hitR = Math.max(26, this.layout.cell * 0.42);
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      const p = cellToPx(this.layout, drop.cx, drop.cy);
      if ((p.x - x) ** 2 + (p.y - y) ** 2 <= hitR ** 2) {
        this.collect(i);
        return;
      }
    }

    const cell = cellAt(this.layout, x, y);
    if (!cell) return;
    this.plant(cell.c, cell.r);
  }

  scoop(): void {
    if (this.completed) return;
    const space = this.level.bucketMax - this.bucket;
    if (space <= 0.2) {
      this.toast('Ведро уже полное');
      return;
    }
    if (this.wellWater < 0.35) {
      this.toast('Колодец ещё наполняется');
      return;
    }
    const take = Math.min(this.level.scoopAmount, space, this.wellWater);
    this.wellWater -= take;
    this.bucket += take;
    this.scoopFlash = 0.35;
    this.save();
  }

  sell(): void {
    if (this.completed) return;
    if (this.warehouse.length === 0) {
      this.toast('Склад пуст');
      return;
    }
    let sum = 0;
    for (const product of this.warehouse) sum += this.priceOf(product);
    this.warehouse = [];
    this.coins += sum;
    if (this.level.goal.kind === 'earn') this.goalProgress += sum;
    this.truck = 1;
    this.floaters.push({
      x: this.cssW * 0.55,
      y: this.cssH * 0.42,
      text: `+${sum}`,
      life: 1.25,
      max: 1.25,
      coin: true,
    });
    const done = this.checkGoal();
    this.toast(
      done ? `Цель выполнена. +${sum} ${coinsWord(sum)}` : `+${sum} ${coinsWord(sum)}`,
      true,
    );
    this.save();
  }

  buy(id: AnimalId): void {
    if (this.completed) return;
    const offer = this.level.shop.find((item) => item.id === id);
    if (!offer) return;
    if (this.animals.length >= this.level.maxAnimals) {
      this.toast('На поле больше нет места');
      return;
    }
    if (this.coins < offer.price) {
      this.toast('Не хватает монет', true);
      return;
    }
    this.coins -= offer.price;
    const animal = this.spawn(id, 0.42);
    this.placeAnimal(animal);
    this.toast(`${ANIMALS[id].name} теперь на ферме`);
    this.save();
  }

  nextLevel(): void {
    if (!this.completed) return;
    if (this.levelIndex >= LEVELS.length - 1) {
      this.newGame();
      return;
    }
    const coins = this.coins;
    this.beginLevel(this.levelIndex + 1, { coins });
    this.save();
  }

  newGame(): void {
    clearSave();
    this.beginLevel(0, {});
    this.save();
    this.toast('Новая игра');
  }

  toast(text: string, coin = false): void {
    if (text === this.message && this.messageT > 1.5 && coin === this.messageCoin) return;
    this.message = text;
    this.messageCoin = coin;
    this.messageT = 2.3;
  }

  view(): HudModel {
    const goal = this.level.goal;
    const offers: ShopOffer[] = this.level.shop.map((item) => {
      const def = ANIMALS[item.id];
      let reason: string | null = null;
      if (this.animals.length >= this.level.maxAnimals) reason = 'Нет места';
      else if (this.coins < item.price) reason = 'Мало монет';
      return { id: item.id, name: def.name, blurb: def.blurb, price: item.price, reason };
    });
    return {
      levelIndex: this.levelIndex,
      levelCount: LEVELS.length,
      title: this.level.title,
      hint: this.level.hint,
      goalText: goal.text,
      goalKind: goal.kind,
      progress: Math.min(this.goalProgress, goalTarget(goal)),
      target: goalTarget(goal),
      coins: Math.floor(this.coins),
      bucket: this.bucket,
      bucketMax: this.level.bucketMax,
      well: this.wellWater,
      wellMax: this.level.wellMax,
      warehouse: this.warehouse.slice(),
      capacity: this.level.warehouseCapacity,
      shop: offers,
      completed: this.completed,
      lastLevel: this.levelIndex >= LEVELS.length - 1,
      message: this.message,
      messageOn: this.messageT > 0,
      messageCoin: this.messageCoin,
      animalCount: this.animals.length,
      maxAnimals: this.level.maxAnimals,
    };
  }

  snapshot(): FarmSnapshot {
    const cells: FarmSnapshot['cells'] = [];
    for (let r = 0; r < this.layout.rows; r++) {
      for (let c = 0; c < this.layout.cols; c++) {
        const p = cellToPx(this.layout, c + 0.5, r + 0.5);
        cells.push({ c, r, x: p.x, y: p.y, grass: this.field.growthAt(c, r) });
      }
    }
    return {
      coins: this.coins,
      bucket: this.bucket,
      well: this.wellWater,
      progress: this.goalProgress,
      target: goalTarget(this.level.goal),
      warehouse: this.warehouse.length,
      capacity: this.level.warehouseCapacity,
      drops: this.drops.length,
      animals: this.animals.length,
      hungry: this.animals.filter((animal) => animal.isHungry).length,
      completed: this.completed,
      levelIndex: this.levelIndex,
      dropPoints: this.drops.map((drop) => {
        const p = cellToPx(this.layout, drop.cx, drop.cy);
        return { x: p.x, y: p.y, product: drop.product };
      }),
      cells,
    };
  }

  private simulate(dt: number): void {
    this.time += dt;
    this.field.update(dt);
    this.regen(dt);
    for (const drop of this.drops) drop.age += dt;
    for (const animal of this.animals) {
      animal.update({
        dt,
        field: this.field,
        animals: this.animals,
        onProduce: (producer) => this.lay(producer),
      });
    }
  }

  private regen(dt: number): void {
    this.wellWater = Math.min(this.level.wellMax, this.wellWater + this.level.wellRegen * dt);
  }

  private plant(c: number, r: number): void {
    if (this.field.growthAt(c, r) > 0) return;
    if (this.bucket + 1e-3 < this.level.plantWaterCost) {
      this.toast('Не хватает воды — наберите в колодце');
      return;
    }
    if (!this.field.plant(c, r)) return;
    this.bucket -= this.level.plantWaterCost;
    this.save();
  }

  private collect(index: number): void {
    const drop = this.drops[index];
    if (!drop) return;
    if (this.warehouse.length >= this.level.warehouseCapacity) {
      this.toast('Склад полон — продайте товар');
      return;
    }
    this.drops.splice(index, 1);
    this.warehouse.push(drop.product);
    if (this.level.goal.kind === 'collect' && this.level.goal.product === drop.product) {
      this.goalProgress += 1;
    }
    const p = cellToPx(this.layout, drop.cx, drop.cy);
    this.floaters.push({
      x: p.x,
      y: p.y,
      text: PRODUCTS[drop.product].name,
      life: 0.9,
      max: 0.9,
    });
    const before = this.coins;
    const done = this.checkGoal();
    if (done) {
      const bonus = Math.floor(this.coins - before);
      this.toast(
        bonus > 0 ? `Цель выполнена. Склад продан: +${bonus} ${coinsWord(bonus)}` : 'Цель выполнена',
        bonus > 0,
      );
    }
    this.save();
  }

  private lay(animal: Animal): void {
    const jitter = () => (Math.random() - 0.5) * 0.55;
    let cx = animal.cx + jitter();
    let cy = animal.cy + 0.28 + Math.random() * 0.2;
    cx = Math.min(this.level.cols - 0.3, Math.max(0.3, cx));
    cy = Math.min(this.level.rows - 0.3, Math.max(0.3, cy));
    this.drops.push({
      id: this.nextDropId++,
      product: animal.def.product,
      cx,
      cy,
      age: 0,
    });
  }

  /** Returns true when this call completes the level. Unsold goods become coins. */
  private checkGoal(): boolean {
    if (this.completed) return false;
    if (this.goalProgress + 1e-6 < goalTarget(this.level.goal)) return false;
    this.completed = true;
    this.paused = true;
    this.coins += this.liquidateWarehouse();
    return true;
  }

  private liquidateWarehouse(): number {
    let sum = 0;
    for (const product of this.warehouse) sum += this.priceOf(product);
    this.warehouse = [];
    if (sum > 0) this.truck = 1;
    return sum;
  }

  private priceOf(product: ProductId): number {
    return this.level.prices[product] ?? PRODUCTS[product].fallbackPrice;
  }

  private spawn(id: AnimalId, hunger: number): Animal {
    const animal = new Animal(ANIMALS[id], -1, -1, hunger);
    this.animals.push(animal);
    return animal;
  }

  private placeAnimal(animal: Animal): void {
    if (this.layout.cell < 12) return;
    for (let attempt = 0; attempt < 24; attempt++) {
      const c = Math.floor(Math.random() * this.layout.cols);
      const r = Math.floor(Math.random() * this.layout.rows);
      const cx = c + 0.5;
      const cy = r + 0.5;
      const crowded = this.animals.some((other) => {
        if (other === animal || other.cx < 0) return false;
        return (other.cx - cx) ** 2 + (other.cy - cy) ** 2 < 0.7;
      });
      if (!crowded) {
        animal.cx = cx;
        animal.cy = cy;
        animal.tx = cx;
        animal.ty = cy;
        return;
      }
    }
    animal.cx = 0.5;
    animal.cy = 0.5;
    animal.tx = 0.5;
    animal.ty = 0.5;
  }

  private beginLevel(index: number, options: BeginOptions): void {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.field = new Field(this.level.cols, this.level.rows);
    this.drops = [];
    this.floaters = [];
    this.animals = [];
    this.warehouse = (options.warehouse ?? []).slice(0, this.level.warehouseCapacity);
    this.goalProgress = options.goalProgress ?? 0;
    this.coins = options.coins ?? this.level.startingCoins;
    this.bucket = Math.min(this.level.bucketMax, options.bucket ?? this.level.bucketStart);
    this.wellWater = Math.min(this.level.wellMax, options.wellWater ?? this.level.wellStart);
    this.completed = Boolean(options.completed);
    this.paused = this.completed;
    this.truck = 0;
    this.time = 0;
    const list =
      options.animals && options.animals.length > 0
        ? options.animals.slice(0, this.level.maxAnimals)
        : expandAnimals(this.level);
    list.forEach((id, i) => {
      const animal = this.spawn(id, Math.max(0.48, 0.92 - i * 0.16));
      this.placeAnimal(animal);
    });
    this.layout = computeLayout(this.cssW, this.cssH, this.level.cols, this.level.rows);
    for (const animal of this.animals) {
      if (animal.cx < 0) this.placeAnimal(animal);
    }
  }

  private applySave(save: SaveData): void {
    this.beginLevel(save.levelIndex, {
      coins: save.coins,
      goalProgress: save.goalProgress,
      warehouse: save.warehouse,
      animals: save.animals.length ? save.animals : undefined,
      bucket: save.bucket,
      wellWater: save.wellWater,
      completed: save.completed,
    });
  }

  private save(): void {
    const data: SaveData = {
      v: 1,
      levelIndex: this.levelIndex,
      coins: this.coins,
      goalProgress: this.goalProgress,
      warehouse: this.warehouse.slice(),
      animals: this.animals.map((animal) => animal.def.id),
      bucket: this.bucket,
      wellWater: this.wellWater,
      completed: this.completed,
    };
    writeSave(data);
  }
}

function expandAnimals(level: LevelConfig): AnimalId[] {
  const list: AnimalId[] = [];
  for (const group of level.startingAnimals) {
    for (let i = 0; i < group.count; i++) list.push(group.id);
  }
  return list;
}
