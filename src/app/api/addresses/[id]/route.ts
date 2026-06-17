import { NextRequest, NextResponse } from 'next/server';
import { updateUserAddress, deleteUserAddress } from '@/lib/users';
import { requireSession } from '@/lib/auth';

// Mutations are scoped to the authenticated user's own addresses: the DB layer
// matches on (id AND user_id), so a user cannot modify or delete someone else's
// address even if they know its id (IDOR fix, C3).
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  const body = await req.json();
  const { type, street, city, phone, landmark } = body;

  const address = await updateUserAddress(params.id, auth.session.userId, {
    type,
    street,
    city,
    phone,
    landmark,
  });
  if (!address) return NextResponse.json({ error: 'Address not found or update failed' }, { status: 404 });

  return NextResponse.json({ address });
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
