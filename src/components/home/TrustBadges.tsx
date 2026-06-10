import { Clock, Shield, Smartphone, BadgeCheck, Package } from 'lucide-react';

const badges = [
  { icon: Clock,      title: '30–60 Min Delivery', desc: 'Same-day across Mumbai'     },
  { icon: Shield,     title: 'Pay on Delivery',    desc: 'No upfront payment'         },
  { icon: Smartphone, title: 'No App Required',    desc: 'Order from web'             },
  { icon: BadgeCheck, title: '100% Genuine',       desc: 'Verified quality materials' },
  { icon: Package,    title: '5,000+ Orders',      desc: 'Successfully delivered'     },
];

export function TrustBadges() {
  return (
    <div className="flex items-center overflow-x-auto hide-scrollbar py-4">
      {badges.map(({ icon: Icon, title, desc }, i) => (
        <div key={title} className="flex items-center">
          <div className="flex items-center gap-3 px-4 sm:px-6 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center flex-shrink-0">
              <Icon className="w-[18px] h-[18px] text-brand-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-charcoal leading-tight whitespace-nowrap">{title}</p>
              <p className="text-xs text-brand-slate mt-0.5 whitespace-nowrap">{desc}</p>
            </div>
          </div>
          {i < badges.length - 1 && (
            <div className="h-10 w-px bg-neutral-100 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
