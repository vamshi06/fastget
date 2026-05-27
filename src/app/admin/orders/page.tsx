import { getRecentOrders } from '@/lib/db';
import { OrdersListClient } from '../components/OrdersListClient';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const orders = await getRecentOrders(1000);
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal">Orders</h1>
        <p className="text-brand-slate text-sm">{orders.length} orders total</p>
      </div>

      <OrdersListClient orders={orders} token={token} />
    </div>
  );
}
