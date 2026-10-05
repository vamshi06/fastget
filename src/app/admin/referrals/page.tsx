import Link from 'next/link';
import { requireAdminPage } from '@/lib/auth';
import { getReferralOrdersForAdmin, type ReferralPayoutStatus } from '@/lib/db';
import { REFERRAL_REWARD_RUPEES } from '@/lib/referral';
import { ORDER_STATUS_LABELS } from '@/types';
import { MarkReferralPaidButton } from './MarkReferralPaidButton';

export const dynamic = 'force-dynamic';

const TABS: { key: ReferralPayoutStatus | 'all'; label: string }[] = [
  { key: 'to_pay', label: 'To pay' },
  { key: 'pending', label: 'Awaiting delivery' },
  { key: 'paid', label: 'Paid' },
  { key: 'all', label: 'All' },
];

const PAYOUT_BADGES: Record<ReferralPayoutStatus, { label: string; className: string }> = {
  pending: { label: 'Awaiting delivery', className: 'bg-amber-100 text-amber-800' },
  to_pay: { label: 'To pay', className: 'bg-primary-100 text-primary-700' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Order cancelled', className: 'bg-neutral-100 text-brand-slate' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  });
}

export default async function AdminReferralsPage({ searchParams }: { searchParams: { tab?: string } }) {
  await requireAdminPage();
  const rows = await getReferralOrdersForAdmin();

  const activeTab = TABS.some((t) => t.key === searchParams.tab) ? searchParams.tab! : 'to_pay';
  const visible = activeTab === 'all' ? rows : rows.filter((r) => r.payoutStatus === activeTab);
  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, t.key === 'all' ? rows.length : rows.filter((r) => r.payoutStatus === t.key).length]),
  );
  const totalPaid = rows.reduce((sum, r) => sum + (r.payoutAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal">Referrals</h1>
        <p className="text-brand-slate text-sm">
          Orders placed with a friend&apos;s referral code. Once an order is delivered, pay the referrer
          ₹{REFERRAL_REWARD_RUPEES} (cash / UPI) and mark it paid here. Total paid so far: ₹{totalPaid.toLocaleString('en-IN')}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/referrals?tab=${t.key}` as any}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              activeTab === t.key
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-white text-brand-slate border-neutral-200 hover:border-brand-primary'
            }`}
          >
            {t.label} <span className="opacity-75">({counts[t.key]})</span>
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card p-8 text-center text-sm text-brand-slate">Nothing here.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-brand-steel border-b border-neutral-100">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer (referred)</th>
                <th className="px-4 py-3">Referrer - pay to</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.map((r) => {
                const badge = PAYOUT_BADGES[r.payoutStatus];
                return (
                  <tr key={r.orderId} className="align-top">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${r.orderId}`} className="font-mono text-xs text-brand-primary hover:underline">
                        {r.orderId.slice(0, 8)}
                      </Link>
                      <p className="text-xs text-brand-slate mt-0.5">{formatDate(r.createdAt)}</p>
                      <p className="text-xs text-brand-slate">{ORDER_STATUS_LABELS[r.orderStatus]} · ₹{r.orderTotal.toLocaleString('en-IN')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-brand-charcoal">{r.customerName}</p>
                      <p className="text-xs text-brand-slate">{r.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.referrerUserId ? (
                        <>
                          <p className="font-semibold text-brand-charcoal">{r.referrerName}</p>
                          <p className="text-xs text-brand-slate">{r.referrerPhone}</p>
                          <p className="text-xs text-brand-slate">{r.referrerEmail}</p>
                        </>
                      ) : (
                        <p className="text-xs text-red-600">Referrer account deleted</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold tracking-wider text-brand-charcoal">{r.referralCode}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                        {r.payoutStatus === 'paid' && r.payoutAmount ? `Paid ₹${r.payoutAmount}` : badge.label}
                      </span>
                      {r.payoutStatus === 'paid' && (
                        <p className="text-xs text-brand-slate mt-1">
                          {r.paidAt && formatDate(r.paidAt)}
                          {r.payoutRef && <><br />Ref: {r.payoutRef}</>}
                        </p>
                      )}
                      {r.payoutStatus === 'to_pay' && r.referrerUserId && (
                        <div className="mt-2">
                          <MarkReferralPaidButton orderId={r.orderId} amount={REFERRAL_REWARD_RUPEES} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
