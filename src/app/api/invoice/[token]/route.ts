import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { getOrderByStatusToken } from '@/lib/db';
import { InvoicePDF } from '@/lib/InvoicePDF';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const order = await getOrderByStatusToken(token.toLowerCase());

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const buffer = await renderToBuffer(React.createElement(InvoicePDF, { order }));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="fastget-invoice-${order.statusToken.toUpperCase()}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Invoice generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
