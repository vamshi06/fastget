import { NextRequest, NextResponse } from 'next/server';
import { updateUserAddress, deleteUserAddress } from '@/lib/users';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { type, street, city, phone, landmark } = body;

  const address = await updateUserAddress(params.id, { type, street, city, phone, landmark });
  if (!address) return NextResponse.json({ error: 'Address not found or update failed' }, { status: 404 });

  return NextResponse.json({ address });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const deleted = await deleteUserAddress(params.id);
  if (!deleted) return NextResponse.json({ error: 'Address not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
