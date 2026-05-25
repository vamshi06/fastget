import { getRecentOrders, getOrdersByStatus } from '@/lib/db';
import { Order, OrderStatus } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to allow search params
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get filter parameters
    const statusFilter = request.nextUrl.searchParams.get('status') || 'all';
    const nameFilter = request.nextUrl.searchParams.get('name') || '';
    const dateFromFilter = request.nextUrl.searchParams.get('dateFrom') || '';
    const dateToFilter = request.nextUrl.searchParams.get('dateTo') || '';

    // Fetch orders from Neon database
    let orders: Order[];
    
    if (statusFilter !== 'all') {
      orders = await getOrdersByStatus(statusFilter as OrderStatus);
    } else {
      orders = await getRecentOrders(10000); // Get up to 10000 recent orders
    }

    // Apply filters
    if (nameFilter) {
      const searchTerm = nameFilter.toLowerCase();
      orders = orders.filter((order) => {
        const matchesName = order.customerName.toLowerCase().includes(searchTerm);
        const matchesPhone = order.customerPhone.includes(searchTerm);
        return matchesName || matchesPhone;
      });
    }

    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      orders = orders.filter((order) => new Date(order.createdAt) >= fromDate);
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      orders = orders.filter((order) => new Date(order.createdAt) <= toDate);
    }

    // Generate CSV
    const csv = generateCSV(orders);

    // Return CSV with proper headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate CSV from Neon database:', error);
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
