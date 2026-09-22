import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Headphones, MapPin, Mail, Zap } from 'lucide-react';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="bg-brand-charcoal text-white mt-auto relative overflow-hidden">
      {/* Subtle industrial lines overlay */}
      <div className="absolute inset-0 bg-motion-lines pointer-events-none opacity-60" />

      {/* Orange top accent */}
      <div className="w-full h-0.5" style={{ background: 'linear-gradient(90deg, #F5A623, #DC8A0E 40%, transparent)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid md:grid-cols-3 gap-10">

          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-brand-primary">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight">
                Fast<span className="text-brand-primary">Get</span>
              </span>
            </div>
            <p className="text-neutral-400 text-sm leading-relaxed">
              {t('tagline')}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)', color: '#F5A623' }}
              >
                {t('deliveryBadge')}
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">{t('quickLinks')}</h3>
            <ul className="space-y-3">
              {[
                { href: '/catalog', label: t('browseProducts') },
                { href: '/my-orders', label: t('orderHistory') },
                { href: '/cart',    label: t('shoppingCart') },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href as any}
                    className="text-sm text-neutral-400 hover:text-brand-primary transition-colors duration-150 flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-brand-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">{t('contact')}</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={'/support' as any}
                  className="flex items-center gap-2.5 text-sm text-neutral-400 hover:text-brand-primary transition-colors"
                >
                  <Headphones className="w-4 h-4 text-brand-primary flex-shrink-0" />
                  <span>{t('support')}</span>
                </Link>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-neutral-400">
                <MapPin className="w-4 h-4 text-brand-primary flex-shrink-0" />
                <span>{t('location')}</span>
              </li>
              <li>
                <a
                  href="mailto:sukhmeet.bedi@elemantra.in"
                  className="flex items-center gap-2.5 text-sm text-neutral-400 hover:text-brand-primary transition-colors"
                >
                  <Mail className="w-4 h-4 text-brand-primary flex-shrink-0" />
                  <span>sukhmeet.bedi@elemantra.in</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <span>{t('copyright', { year: new Date().getFullYear() })}</span>
          <span className="flex items-center gap-1.5">
            {t('builtFor')}
            <span className="text-brand-primary">⚡</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
