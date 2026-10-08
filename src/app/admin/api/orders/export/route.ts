import { searchOrdersForAdmin } from '@/lib/db';
import { Order } from '@/types';
import { orderCoinDiscount } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/auth';
import { parseAdminOrderFilters } from '@/lib/admin-order-filters';

// Force dynamic rendering to allow search params
export const dynamic = 'force-dynamic';

// Upper bound on one export - large enough for any realistic date range.
const MAX_EXPORT_ROWS = 50000;

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();
  try {
    // Same parser and same SQL query as the Orders page, so the file always
    // contains exactly the orders the admin was looking at (dates in IST).
    const parsed = parseAdminOrderFilters(request.nextUrl.searchParams);
    if (!parsed.filters) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const filters = parsed.filters;

    logger.info('API', 'GET /admin/api/orders/export', { ...filters, q: filters.q ? '[set]' : undefined });

    const result = await searchOrdersForAdmin(filters, MAX_EXPORT_ROWS, 0);
    if (!result) {
      logger.api('GET', '/admin/api/orders/export', 500, Date.now() - start);
      return NextResponse.json({ error: 'Failed to load orders for export' }, { status: 500 });
    }
    const orders = result.orders;

    // Generate CSV
    const csv = generateCSV(orders);

    logger.info('Admin', 'Orders CSV exported', { count: orders.length, status: filters.status ?? 'all' });
    logger.api('GET', '/admin/api/orders/export', 200, Date.now() - start);

    // Return CSV with proper headers. The BOM makes Excel read ₹ and Hindi text as UTF-8.
    return new NextResponse(`﻿${csv}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${istDate(new Date().toISOString())}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error('API', 'GET /admin/api/orders/export - unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('GET', '/admin/api/orders/export', 500, Date.now() - start);
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 });
  }
}

/** YYYY-MM-DD of an instant in India time (the server itself runs in UTC). */
function istDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(iso));
}

/** HH:MM (24h) of an instant in India time. */
function istTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

function generateCSV(orders: Order[]): string {
  // CSV Headers
  const headers = [
    'Order ID',
    'Created Date (IST)',
    'Created Time (IST)',
    'Customer Name',
    'Customer Phone',
    'Site Address',
    'Landmark',
    'Delivery Type',
    'Scheduled Time',
    'Items',
    'Subtotal',
    'Convenience Fee',
    'Discount',
    'Coins Used',
    'Total',
    'Payment Method',
    'Payment Status',
    'Status',
    'ETA',
  ];

  // CSV Rows
  const rows = orders.map((order) => {
    const items = order.items
      .map((item) => `${item.name} (Qty: ${item.quantity}, ₹${item.price})`)
      .join('; ');

    return [
      escapeCSV(order.id),
      escapeCSV(istDate(order.createdAt)),
      escapeCSV(istTime(order.createdAt)),
      escapeCSV(order.customerName),
      escapeCSV(order.customerPhone),
      escapeCSV(order.siteAddress),
      escapeCSV(order.landmark || ''),
      escapeCSV(order.deliveryType),
      escapeCSV(order.scheduledTime || ''),
      escapeCSV(items),
      order.subtotal.toFixed(2),
      order.convenienceFee.toFixed(2),
      order.discount.toFixed(2),
      orderCoinDiscount(order).toFixed(2),
      order.total.toFixed(2),
      escapeCSV(order.paymentMethod),
      escapeCSV(
        order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentStatus === 'captured' ? 'Paid' : 'Pending'
      ),
      escapeCSV(order.status),
      escapeCSV(order.eta || ''),
    ].join(',');
  });

  // Combine headers and rows
  return [headers.join(','), ...rows].join('\n');
}

function escapeCSV(value: string): string {
  if (!value) return '';
  // Customer-entered text starting with = + - @ would run as a formula when
  // the file is opened in Excel/Sheets - prefix it so it stays plain text.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}
