import { Clock, Shield, Truck, Award } from 'lucide-react';

const badges = [
  { icon: Clock,  title: '30–60 Min Delivery', desc: 'Same-day delivery across Mumbai' },
  { icon: Shield, title: 'Pay on Delivery',    desc: 'No upfront payment required' },
  { icon: Truck,  title: 'No App Required',    desc: 'Order directly from the web' },
  { icon: Award,  title: '100% Genuine',       desc: 'Verified quality materials' },
];

export function TrustBadges() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {badges.map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-brand-primary transition-colors"
        >
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-charcoal">{title}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
