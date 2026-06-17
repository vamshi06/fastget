import { getRecentOrders } from '@/lib/db';
import { OrdersListClient } from '../components/OrdersListClient';
import { requireAdminPage } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  await requireAdminPage();
  const orders = await getRecentOrders(1000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal">Orders</h1>
        <p className="text-brand-slate text-sm">{orders.length} orders total</p>
      </div>

      <OrdersListClient orders={orders} />
    </div>
  );
}
