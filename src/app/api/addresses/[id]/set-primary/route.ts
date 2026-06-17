import { NextRequest, NextResponse } from 'next/server';
import { setPrimaryAddress } from '@/lib/users';
import { requireSession } from '@/lib/auth';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSession();
  if ('response' in auth) return auth.response;

  // setPrimaryAddress already scopes its UPDATE by user_id, so this only affects
  // the caller's own address (IDOR fix, C3).
  const ok = await setPrimaryAddress(auth.session.userId, params.id);
  if (!ok) return NextResponse.json({ error: 'Address not found or does not belong to user' }, { status: 404 });

  return NextResponse.json({ success: true });
}
