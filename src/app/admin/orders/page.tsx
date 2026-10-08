import { searchOrdersForAdmin } from '@/lib/db';
import { OrdersListClient } from '../components/OrdersListClient';
import { requireAdminPage } from '@/lib/auth';
import { parseAdminOrderFilters } from '@/lib/admin-order-filters';
import { AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requireAdminPage();

  // Invalid filter values in a hand-edited URL fall back to "no filter".
  const parsed = parseAdminOrderFilters(searchParams);
  const filters = parsed.filters ?? {};
  const pageParam = Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page);
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;

  const result = await searchOrdersForAdmin(filters, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal">Orders</h1>
        <p className="text-brand-slate text-sm">
          {result ? `${result.total.toLocaleString('en-IN')} matching orders` : 'Orders could not be loaded'}
        </p>
      </div>

      {result ? (
        <OrdersListClient
          orders={result.orders}
          total={result.total}
          page={page}
          pageSize={PAGE_SIZE}
          filters={filters}
        />
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Couldn&apos;t load orders</h3>
            <p className="text-red-800 text-sm">The database didn&apos;t respond. Refresh the page to try again.</p>
          </div>
        </div>
      )}
    </div>
  );
}
