export type AnimalId = 'chicken' | 'cow';

export type ProductId = 'egg' | 'milk';

export type Goal =
  | { kind: 'collect'; product: ProductId; count: number; text: string }
  | { kind: 'earn'; coins: number; text: string };

export interface AnimalDef {
  id: AnimalId;
  name: string;
  product: ProductId;
  blurb: string;
  /** Скорость в клетках поля за секунду. */
  cellsPerSec: number;
  eatDuration: number;
  produceDelay: number;
  /** Насколько сытость падает за секунду. 1 — сыт, 0 — очень голоден. */
  hungerRate: number;
  hungryAt: number;
}

export interface LevelConfig {
  id: string;
  title: string;
  hint: string;
  goal: Goal;
  /** Монеты, с которыми начинается новая игра на первом уровне. */
  startingCoins: number;
  startingAnimals: { id: AnimalId; count: number }[];
  cols: number;
  rows: number;
  warehouseCapacity: number;
  maxAnimals: number;
  plantWaterCost: number;
  bucketMax: number;
  bucketStart: number;
  wellMax: number;
  wellStart: number;
  /** Сколько воды в секунду прибывает в колодец. */
  wellRegen: number;
  /** Сколько воды за одно нажатие переливается из колодца в ведро. */
  scoopAmount: number;
  prices: Partial<Record<ProductId, number>>;
  shop: { id: AnimalId; price: number }[];
}

export interface Drop {
  id: number;
  product: ProductId;
  /** Позиция в координатах клеток (0..cols, 0..rows). */
  cx: number;
  cy: number;
  age: number;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
}

export function goalTarget(goal: Goal): number {
  return goal.kind === 'collect' ? goal.count : goal.coins;
}
