import { NextRequest, NextResponse } from 'next/server';
import { getUserAddresses, createUserAddress } from '@/lib/users';
import { requireSession } from '@/lib/auth';
import {
  ValidationError,
  requireString,
  optionalString,
  requireEnum,
  requirePhone10,
} from '@/lib/validation';

const ADDRESS_TYPES = ['home', 'work', 'other'] as const;

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

  try {
    const body = await req.json();
    const type = requireEnum(body.type, ADDRESS_TYPES, 'type');
    const street = requireString(body.street, 'street', { max: 200 });
    const city = requireString(body.city, 'city', { max: 100 });
    const phone = requirePhone10(body.phone);
    const landmark = optionalString(body.landmark, 'landmark', { max: 200 });
    const isPrimary = body.isPrimary === true;

    const address = await createUserAddress(
      auth.session.userId,
      type,
      street,
      city,
      phone,
      landmark,
      isPrimary,
    );
    if (!address) return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Something went wrong on our end. Please try again in a few moments.' },
      { status: 500 },
    );
  }
}
