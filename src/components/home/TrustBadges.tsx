import { Clock, Shield, Smartphone, BadgeCheck } from 'lucide-react';

const badges = [
  {
    icon: Clock,
    title: '30–60 Min Delivery',
    desc: 'Same-day delivery across Mumbai',
    stat: '⚡ Fast',
  },
  {
    icon: Shield,
    title: 'Pay on Delivery',
    desc: 'No upfront payment required',
    stat: '🔒 Safe',
  },
  {
    icon: Smartphone,
    title: 'No App Required',
    desc: 'Order directly from the web',
    stat: '📱 Easy',
  },
  {
    icon: BadgeCheck,
    title: '100% Genuine',
    desc: 'Verified quality materials',
    stat: '✓ Trusted',
  },
];

export function TrustBadges() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {badges.map(({ icon: Icon, title, desc, stat }) => (
        <div
          key={title}
          className="group relative flex flex-col gap-3 p-5 bg-white rounded-2xl border border-neutral-100 hover:border-primary-200 transition-all duration-200 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          {/* Hover orange top accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-primary group-hover:border-brand-primary transition-all duration-200">
            <Icon className="w-5 h-5 text-brand-primary group-hover:text-white transition-colors duration-200" />
          </div>

          <div>
            <p className="text-sm font-bold text-brand-charcoal leading-tight">{title}</p>
            <p className="text-xs text-brand-slate mt-0.5 leading-snug">{desc}</p>
          </div>

          <span className="text-xs font-semibold text-brand-primary">{stat}</span>
        </div>
      ))}
    </div>
  );
}
