// Which items of an order can't be covered by the recorded stock. Stock is
// maintained by hand (orders don't reduce it), so this compares each product's
// current available stock with the quantity this order asks for. Pure helpers -
// safe to use on the server and in client components.

import type { OrderItem } from '@/types';

export interface StockProblem {
  /** Available stock right now; null when the product no longer exists in the catalog. */
  available: number | null;
  /** Total quantity of this product in the order (sale + regular lines combined). */
  ordered: number;
}

/**
 * Products (keyed by sku/product code) whose available stock is below what
 * the order needs. Products missing from `stock` (lookup failed) are skipped
 * rather than flagged, so a DB hiccup never raises a false alarm.
 */
export function findStockProblems(
  items: OrderItem[],
  stock: Map<string, number | null>,
): Map<string, StockProblem> {
  const ordered = new Map<string, number>();
  for (const item of items) {
    ordered.set(item.sku, (ordered.get(item.sku) ?? 0) + item.quantity);
  }

  const problems = new Map<string, StockProblem>();
  ordered.forEach((qty, sku) => {
    if (!stock.has(sku)) return;
    const available = stock.get(sku) ?? null;
    if (available === null || available < qty) {
      problems.set(sku, { available, ordered: qty });
    }
  });
  return problems;
}

export function stockProblemLabel(problem: StockProblem): string {
  if (problem.available === null) return 'No longer in catalog';
  if (problem.available <= 0) return 'Out of stock';
  return `Only ${problem.available} in stock (needs ${problem.ordered})`;
}
