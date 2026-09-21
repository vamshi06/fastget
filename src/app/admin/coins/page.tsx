import { requireAdminPage } from '@/lib/auth';
import { getAllCoinBalancesForAdmin } from '@/lib/db';
import { CoinsLookupClient } from './CoinsLookupClient';

export const dynamic = 'force-dynamic';

export default async function AdminCoinsPage() {
  await requireAdminPage();
  const balances = await getAllCoinBalancesForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal">Coins</h1>
        <p className="text-brand-slate text-sm">
          {balances.length} customer{balances.length !== 1 ? 's' : ''} with a coin balance. Search by email or phone to view full history or make a correction.
        </p>
      </div>

      <CoinsLookupClient initialBalances={balances} />
    </div>
  );
}
