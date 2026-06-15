import { NextRequest, NextResponse } from 'next/server';
import { setPrimaryAddress } from '@/lib/users';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const ok = await setPrimaryAddress(userId, params.id);
  if (!ok) return NextResponse.json({ error: 'Address not found or does not belong to user' }, { status: 404 });

  return NextResponse.json({ success: true });
}
