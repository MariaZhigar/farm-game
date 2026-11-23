import type { AnimalId, ProductId } from './types';
import { LEVELS } from './config/levels';
import { ANIMALS } from './config/animals';
import { PRODUCTS } from './config/products';

const KEY = 'farm-frenzy-save-v1';

export interface SaveData {
  v: 1;
  levelIndex: number;
  coins: number;
  goalProgress: number;
  warehouse: ProductId[];
  animals: AnimalId[];
  bucket: number;
  wellWater: number;
  completed: boolean;
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.v !== 1 || typeof data.levelIndex !== 'number') return null;
    if (data.levelIndex < 0 || data.levelIndex >= LEVELS.length) return null;
    const animals = (data.animals ?? []).filter((id): id is AnimalId => id in ANIMALS);
    const warehouse = (data.warehouse ?? []).filter((id): id is ProductId => id in PRODUCTS);
    return {
      v: 1,
      levelIndex: data.levelIndex,
      coins: clampNumber(data.coins, 0, 999999),
      goalProgress: clampNumber(data.goalProgress, 0, 999999),
      warehouse,
      animals,
      bucket: clampNumber(data.bucket, 0, 999),
      wellWater: clampNumber(data.wellWater, 0, 999),
      completed: Boolean(data.completed),
    };
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearSave(): void {
  localStorage.removeItem(KEY);
}

function clampNumber(value: unknown, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, n));
}
