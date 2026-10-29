import Link from 'next/link';
import { requireAdminPage } from '@/lib/auth';
import { searchUsersForAdmin } from '@/lib/users';
import { AlertCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  await requireAdminPage();

  const q = (searchParams.q ?? '').trim().slice(0, 100);
  const pageParam = Number(searchParams.page);
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  const result = await searchUsersForAdmin(q, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (p > 1) params.set('page', String(p));
    const query = params.toString();
    return `/admin/users${query ? `?${query}` : ''}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal">Users</h1>
        <p className="text-brand-slate text-sm">
          Registered customers, newest first.{result && ` ${result.total.toLocaleString('en-IN')} ${q ? 'matching' : 'in total'}.`}
        </p>
      </div>

      <form action="/admin/users" className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-brand-steel absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, email or phone"
            className="input pl-9 w-full"
          />
        </div>
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {!result ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Couldn&apos;t load users</h3>
            <p className="text-red-800 text-sm">The database didn&apos;t respond. Refresh the page to try again.</p>
          </div>
        </div>
      ) : result.users.length === 0 ? (
        <div className="card p-8 text-center text-sm text-brand-slate">
          {q ? 'No customers match that search.' : 'No customers yet.'}
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-brand-steel border-b border-neutral-100">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Last order</th>
                  <th className="px-4 py-3">Coins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {result.users.map((u) => (
                  <tr key={u.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-brand-charcoal">{u.name}</p>
                      <p className="text-xs text-brand-slate">{u.phone}</p>
                      <p className="text-xs text-brand-slate break-all">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-brand-slate">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.orderCount > 0 ? (
                        // Orders search by phone; last 10 digits so a +91 prefix on either side still matches.
                        <Link
                          href={`/admin/orders?q=${encodeURIComponent(u.phone.replace(/\D/g, '').slice(-10))}` as any}
                          className="font-semibold text-brand-primary hover:underline"
                        >
                          {u.orderCount}
                        </Link>
                      ) : (
                        <span className="text-brand-slate">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-brand-slate">
                      {u.lastOrderAt ? formatDate(u.lastOrderAt) : '-'}
                    </td>
                    <td className="px-4 py-3 text-brand-charcoal">{u.coinBalance.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link href={pageHref(page - 1) as any} className="btn-secondary">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Link>
              ) : <span />}
              <span className="text-brand-slate">
                Page {page} of {Math.ceil(result.total / PAGE_SIZE)}
              </span>
              {page * PAGE_SIZE < result.total ? (
                <Link href={pageHref(page + 1) as any} className="btn-secondary">
                  Next <ChevronRight className="w-4 h-4" />
                </Link>
              ) : <span />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
