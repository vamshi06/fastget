'use client';

import { useRouter } from 'next/navigation';
import { OrderStatusUpdater } from '@/components/OrderStatusUpdater';
import type { OrderStatus } from '@/types';

interface AdminOrderStatusCardProps {
  orderId: string;
  status: OrderStatus;
  customerName: string;
  paidOnlineAmount?: number;
}

/** Status controls on the admin order page - re-renders the page after a change. */
export function AdminOrderStatusCard(props: AdminOrderStatusCardProps) {
  const router = useRouter();
  return <OrderStatusUpdater {...props} onUpdated={() => router.refresh()} />;
}
