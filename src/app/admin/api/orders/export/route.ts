import { getRecentOrders, getOrdersByStatus } from '@/lib/db';
import { Order, OrderStatus, PaymentMethod } from '@/types';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/auth';

// Force dynamic rendering to allow search params
export const dynamic = 'force-dynamic';

const ORDER_STATUSES: OrderStatus[] = [
  'received',
  'eta_assigned',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();
  try {
    // Get + validate filter parameters
    const statusFilter = request.nextUrl.searchParams.get('status') || 'all';
    if (statusFilter !== 'all' && !ORDER_STATUSES.includes(statusFilter as OrderStatus)) {
      return NextResponse.json(
        { error: `status must be "all" or one of: ${ORDER_STATUSES.join(', ')}.` },
        { status: 400 },
      );
    }
    const paymentFilter = request.nextUrl.searchParams.get('payment') || 'all';
    if (paymentFilter !== 'all' && paymentFilter !== 'cod' && paymentFilter !== 'razorpay') {
      return NextResponse.json(
        { error: 'payment must be "all", "cod", or "razorpay".' },
        { status: 400 },
      );
    }

    const nameFilter = (request.nextUrl.searchParams.get('name') || '').slice(0, 100);

    // Invalid dates would make every comparison false and silently export an
    // empty file — reject them with a clear message instead.
    let fromDate: Date | null = null;
    const dateFromFilter = request.nextUrl.searchParams.get('dateFrom') || '';
    if (dateFromFilter) {
      fromDate = new Date(dateFromFilter);
      if (Number.isNaN(fromDate.getTime())) {
        return NextResponse.json({ error: 'dateFrom is not a valid date.' }, { status: 400 });
      }
    }

    let toDate: Date | null = null;
    const dateToFilter = request.nextUrl.searchParams.get('dateTo') || '';
    if (dateToFilter) {
      toDate = new Date(dateToFilter);
      if (Number.isNaN(toDate.getTime())) {
        return NextResponse.json({ error: 'dateTo is not a valid date.' }, { status: 400 });
      }
      toDate.setHours(23, 59, 59, 999);
    }

    logger.info('API', 'GET /admin/api/orders/export', { statusFilter, paymentFilter, nameFilter: nameFilter || undefined });

    // Fetch orders from Neon database
    let orders: Order[];

    if (statusFilter !== 'all') {
      orders = await getOrdersByStatus(statusFilter as OrderStatus);
    } else {
      orders = await getRecentOrders(10000);
    }

    // Apply filters
    if (paymentFilter !== 'all') {
      orders = orders.filter((order) => order.paymentMethod === (paymentFilter as PaymentMethod));
    }

    if (nameFilter) {
      const searchTerm = nameFilter.toLowerCase();
      orders = orders.filter((order) => {
        const matchesName = order.customerName.toLowerCase().includes(searchTerm);
        const matchesPhone = order.customerPhone.includes(searchTerm);
        return matchesName || matchesPhone;
      });
    }

    if (fromDate) {
      orders = orders.filter((order) => new Date(order.createdAt) >= fromDate!);
    }

    if (toDate) {
      orders = orders.filter((order) => new Date(order.createdAt) <= toDate!);
    }

    // Generate CSV
    const csv = generateCSV(orders);

    logger.info('Admin', 'Orders CSV exported', { count: orders.length, statusFilter });
    logger.api('GET', '/admin/api/orders/export', 200, Date.now() - start);

    // Return CSV with proper headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    logger.error('API', 'GET /admin/api/orders/export — unhandled error', { error: error instanceof Error ? error.message : String(error) });
    logger.api('GET', '/admin/api/orders/export', 500, Date.now() - start);
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 });
  }
}

function generateCSV(orders: Order[]): string {
  // CSV Headers
  const headers = [
    'Order ID',
    'Created Date',
    'Customer Name',
    'Customer Phone',
    'Site Address',
    'Landmark',
    'Delivery Type',
    'Scheduled Time',
    'Items',
    'Subtotal',
    'Convenience Fee',
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
      escapeCSV(new Date(order.createdAt).toISOString().split('T')[0]),
      escapeCSV(order.customerName),
      escapeCSV(order.customerPhone),
      escapeCSV(order.siteAddress),
      escapeCSV(order.landmark || ''),
      escapeCSV(order.deliveryType),
      escapeCSV(order.scheduledTime || ''),
      escapeCSV(items),
      order.subtotal.toFixed(2),
      order.convenienceFee.toFixed(2),
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
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
