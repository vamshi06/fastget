import Link from 'next/link';
import { Headphones, MapPin, Mail, Zap } from 'lucide-react';

export function Footer() {
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
              Urgent building materials delivered to your site in 30–60 minutes.
              Serving Andheri, Goregaon, and Malad.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)', color: '#F5A623' }}
              >
                ⚡ 30–60 min delivery
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-3">
              {[
                { href: '/catalog', label: 'Browse Products' },
                { href: '/my-orders', label: 'Order History' },
                { href: '/cart',    label: 'Shopping Cart' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
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
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Contact</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={'/support' as any}
                  className="flex items-center gap-2.5 text-sm text-neutral-400 hover:text-brand-primary transition-colors"
                >
                  <Headphones className="w-4 h-4 text-brand-primary flex-shrink-0" />
                  <span>FastGet Support</span>
                </Link>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-neutral-400">
                <MapPin className="w-4 h-4 text-brand-primary flex-shrink-0" />
                <span>Mumbai, Maharashtra</span>
              </li>
              <li>
                <a
                  href="mailto:support@elemantra.in"
                  className="flex items-center gap-2.5 text-sm text-neutral-400 hover:text-brand-primary transition-colors"
                >
                  <Mail className="w-4 h-4 text-brand-primary flex-shrink-0" />
                  <span>support@elemantra.in</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <span>© {new Date().getFullYear()} FastGet. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            Built for Mumbai's construction sites
            <span className="text-brand-primary">⚡</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
