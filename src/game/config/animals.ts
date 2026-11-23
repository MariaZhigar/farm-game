import type { AnimalDef, AnimalId } from '../types';

/**
 * Каталог животных. Чтобы выпустить новое животное на уровень, добавьте его
 * в `startingAnimals` и/или `shop` этого уровня в `levels.ts`.
 * Продукт должен быть описан в `products.ts`, а отрисовка — в `render.ts`.
 */
export const ANIMALS: Record<AnimalId, AnimalDef> = {
  chicken: {
    id: 'chicken',
    name: 'Курица',
    product: 'egg',
    blurb: 'Клюёт траву и несёт яйца.',
    cellsPerSec: 1.55,
    eatDuration: 0.7,
    produceDelay: 3.2,
    hungerRate: 0.085,
    hungryAt: 0.4,
  },
  cow: {
    id: 'cow',
    name: 'Корова',
    product: 'milk',
    blurb: 'Ест траву и даёт молоко.',
    cellsPerSec: 0.85,
    eatDuration: 1.25,
    produceDelay: 6,
    hungerRate: 0.05,
    hungryAt: 0.42,
  },
};
