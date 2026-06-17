import { NextRequest, NextResponse } from 'next/server';
import { getUserAddresses, createUserAddress } from '@/lib/users';
import { requireSession } from '@/lib/auth';
import { AddressType } from '@/types';

// The user is derived from the verified session cookie, never from the request
// (IDOR fix, C3) — a client can only read/create its own addresses.
export async function GET(_req: NextRequest) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  const addresses = await getUserAddresses(auth.session.userId);
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  const body = await req.json();
  const { type, street, city, phone, landmark, isPrimary } = body;

  if (!type || !street || !city || !phone) {
    return NextResponse.json({ error: 'type, street, city and phone are required' }, { status: 400 });
  }

  const validTypes: AddressType[] = ['home', 'work', 'other'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'type must be home, work, or other' }, { status: 400 });
  }

  const address = await createUserAddress(
    auth.session.userId,
    type,
    street,
    city,
    phone,
    landmark,
    isPrimary ?? false,
  );
  if (!address) return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });

  return NextResponse.json({ address }, { status: 201 });
}
