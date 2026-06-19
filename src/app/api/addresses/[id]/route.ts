import { NextRequest, NextResponse } from 'next/server';
import { updateUserAddress, deleteUserAddress } from '@/lib/users';
import { requireSession } from '@/lib/auth';
import {
  ValidationError,
  requireString,
  optionalString,
  optionalEnum,
  requirePhone10,
} from '@/lib/validation';

const ADDRESS_TYPES = ['home', 'work', 'other'] as const;

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

// Mutations are scoped to the authenticated user's own addresses: the DB layer
// matches on (id AND user_id), so a user cannot modify or delete someone else's
// address even if they know its id (IDOR fix, C3).
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();

    // Partial update: only validate fields that are actually provided. The DB
    // layer COALESCEs undefined fields, leaving them unchanged.
    const updates = {
      type: optionalEnum(body.type, ADDRESS_TYPES, 'type'),
      street: optionalString(body.street, 'street', { max: 200 }),
      city: optionalString(body.city, 'city', { max: 100 }),
      phone: isBlank(body.phone) ? undefined : requirePhone10(body.phone),
      landmark: optionalString(body.landmark, 'landmark', { max: 200 }),
    };

    const address = await updateUserAddress(params.id, auth.session.userId, updates);
    if (!address) {
      return NextResponse.json({ error: 'Address not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ address });
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  const deleted = await deleteUserAddress(params.id, auth.session.userId);
  if (!deleted) return NextResponse.json({ error: 'Address not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
