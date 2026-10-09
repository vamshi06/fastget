import { getTranslations } from 'next-intl/server';
import { Banknote, Coins, Gift, Truck, Zap } from 'lucide-react';

/**
 * Row of reasons-to-buy under the header (HomeRun style). Every claim here is
 * backed by real behaviour - keep it that way:
 *   freeDelivery - no delivery fee exists anywhere in pricing (order-pricing.ts);
 *                  remove this if a delivery charge is ever introduced
 *   delivery   - the 60-min promise used across the site
 *   cod        - cash on delivery at checkout
 *   firstOrder - order-pricing FIRST_ORDER_DISCOUNT_RUPEES
 *   coins      - db.ts credits 10% of the order total on delivery
 */
export async function TrustStrip() {
  const t = await getTranslations('home.trust');
  const items = [
    { Icon: Truck, label: t('freeDelivery') },
    { Icon: Zap, label: t('delivery') },
    { Icon: Banknote, label: t('cod') },
    { Icon: Gift, label: t('firstOrder') },
    { Icon: Coins, label: t('coins') },
  ];

  return (
    <div className="bg-white border-b border-neutral-100">
      <ul className="page-container flex gap-5 overflow-x-auto hide-scrollbar py-2.5 md:justify-center md:gap-10">
        {items.map(({ Icon, label }) => (
          <li key={label} className="flex items-center gap-1.5 flex-shrink-0 text-[13px] font-semibold text-brand-graphite">
            <Icon className="w-4 h-4 text-brand-primary" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
