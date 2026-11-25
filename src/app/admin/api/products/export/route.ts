import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getProductsFromCategoryTables } from '@/lib/products';
import type { Product } from '@/types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const EXPORT_PAGE_SIZE = 5000;

export async function GET(_request: NextRequest) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;

  const start = Date.now();
  try {
    const firstPage = await getProductsFromCategoryTables({
      limit: EXPORT_PAGE_SIZE,
      offset: 0,
      includeInactive: true,
    });
    const products = [...firstPage.products];

    for (let offset = products.length; offset < firstPage.total; offset += EXPORT_PAGE_SIZE) {
      const page = await getProductsFromCategoryTables({
        limit: EXPORT_PAGE_SIZE,
        offset,
        includeInactive: true,
      });
      if (page.products.length === 0) {
        throw new Error('Product list changed or could not be fully loaded during export.');
      }
      products.push(...page.products);
    }

    const csv = generateCSV(products);
    logger.info('Admin', 'Products CSV exported', { count: products.length });
    logger.api('GET', '/admin/api/products/export', 200, Date.now() - start);

    return new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error('API', 'GET /admin/api/products/export failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.api('GET', '/admin/api/products/export', 500, Date.now() - start);
    return NextResponse.json({ error: 'Failed to generate products CSV' }, { status: 500 });
  }
}

function generateCSV(products: Product[]): string {
  const headers = [
    'Product Code',
    'SKU',
    'Name',
    'Brand',
    'Description',
    'Category',
    'Price',
    'MRP',
    'Unit',
    'Minimum Order Quantity',
    'Stock Quantity',
    'Status',
    'Image URL',
  ];
  const rows = products.map((product) => [
    product.productCode || product.id,
    product.sku || product.productCode || product.id,
    product.name,
    product.brand || '',
    product.description || '',
    product.categoryName || product.category,
    product.price,
    product.mrpPrice ?? '',
    product.unit,
    product.moq ?? 1,
    product.stockQuantity ?? '',
    product.status || 'active',
    product.imageUrl || '',
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\n');
}

function escapeCSV(value: string | number): string {
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
