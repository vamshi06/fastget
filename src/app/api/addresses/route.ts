import { NextRequest, NextResponse } from 'next/server';
import { getUserAddresses, createUserAddress } from '@/lib/users';
import { AddressType } from '@/types';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const addresses = await getUserAddresses(userId);
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, type, street, city, phone, landmark, isPrimary } = body;

  if (!userId || !type || !street || !city || !phone) {
    return NextResponse.json({ error: 'userId, type, street, city and phone are required' }, { status: 400 });
  }

  const validTypes: AddressType[] = ['home', 'work', 'other'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'type must be home, work, or other' }, { status: 400 });
  }

  const address = await createUserAddress(userId, type, street, city, phone, landmark, isPrimary ?? false);
  if (!address) return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });

  return NextResponse.json({ address }, { status: 201 });
}
