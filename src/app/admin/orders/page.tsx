import { getAllOrdersFromSheets } from '@/lib/sheets';
import { OrdersListClient } from '../components/OrdersListClient';
import { cookies } from 'next/headers';

export default async function OrdersPage() {
  const orders = await getAllOrdersFromSheets();
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-500">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Orders
        </h2>
        <p className="text-gray-600 text-lg">Manage and view all customer orders</p>
      </div>

      <OrdersListClient orders={orders} token={token} />
    </div>
  );
}
