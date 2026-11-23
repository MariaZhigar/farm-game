import type { ProductId } from '../types';

export interface ProductDef {
  id: ProductId;
  name: string;
  fallbackPrice: number;
}

export const PRODUCTS: Record<ProductId, ProductDef> = {
  egg: { id: 'egg', name: 'Яйцо', fallbackPrice: 8 },
  milk: { id: 'milk', name: 'Молоко', fallbackPrice: 18 },
};
