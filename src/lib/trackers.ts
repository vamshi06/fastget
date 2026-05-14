export function toSku(productId: string) {
  return productId;
}

export function safeNumber(n: unknown) {
  const num = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(num) ? num : 0;
}

