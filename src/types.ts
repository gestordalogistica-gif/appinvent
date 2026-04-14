export type InventoryStatus = 'PENDING' | 'OK' | 'DIVERGENT';

export interface InventoryItem {
  id: string;
  address: string;
  code: string;
  expectedQty: number;
  counts: number[]; // Array of counts: [count1, count2, count3, ...]
  status: InventoryStatus;
  lastUpdated: number;
}

export interface InventoryStats {
  total: number;
  completed: number;
  pending: number;
  ok: number;
  divergent: number;
}
