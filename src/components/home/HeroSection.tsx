'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Zap, Hammer, Wrench, Building2 } from 'lucide-react';
import Link from 'next/link';

const slides = [
  {
    eyebrow: "Mumbai's Fastest Delivery",
    title: 'Construction Materials',
    highlight: 'Delivered in 30–60 Min',
    description:
      'Carpentry, Plumbing, Hardware, Electrical & more — everything your site needs, delivered same-day.',
    cta: 'Browse Products',
    ctaHref: '/catalog',
    secondaryCta: 'Track Order',
    secondaryHref: '/order',
  },
  {
    eyebrow: 'Site Materials · No Delays',
    title: 'Keep Your Project',
    highlight: 'Moving Without Stops',
    description:
      'Plywood, hinges, CPVC fittings, wires, bolts — urgent materials to your Mumbai site before work stops.',
    cta: 'Shop Now',
    ctaHref: '/catalog',
    secondaryCta: 'View Catalog',
    secondaryHref: '/catalog',
  },
  {
    eyebrow: '8 Categories · One Place',
    title: 'Carpentry, Plumbing,',
    highlight: 'Hardware & More',
    description:
      'From plywood boards to CPVC fittings, electrical accessories to adhesives — your one-stop site store.',
    cta: 'Explore Catalog',
    ctaHref: '/catalog',
    secondaryCta: 'Browse All',
    secondaryHref: '/catalog',
  },
];

const CATEGORY_CARDS = [
  { icon: Hammer,    label: 'Carpentry',  href: '/catalog?category=carpentry'       },
  { icon: Zap,       label: 'Electrical', href: '/catalog?category=electrical'      },
  { icon: Wrench,    label: 'Plumbing',   href: '/catalog?category=plumbing'        },
  { icon: Building2, label: 'Civil',      href: '/catalog?category=civil-materials' },
];

const STATS = [
  { value: '500+', label: 'Products'     },
  { value: '3',    label: 'Zones'        },
  { value: '₹0',   label: 'Delivery fee' },
];

export function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const slide = slides[current];

  return (
    <section
      className="relative overflow-hidden text-white"
      style={{ background: 'linear-gradient(140deg, #111113 0%, #1E1E21 55%, #111113 100%)' }}
    >
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: [
            'linear-gradient(rgba(245,166,35,1) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(245,166,35,1) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '44px 44px',
        }}
      />

      {/* Orange radial glow — right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 78% 42%, rgba(245,166,35,0.11) 0%, transparent 58%)',
        }}
      />

      {/* Large ghost "30" watermark */}
      <div
        className="absolute right-8 top-1/2 -translate-y-1/2 text-[220px] font-black leading-none pointer-events-none select-none hidden xl:block"
        style={{ color: 'rgba(245,166,35,0.04)', letterSpacing: '-0.04em' }}
        aria-hidden
      >
        30
      </div>

      {/* Left orange bar */}
      <div
        className="absolute top-0 left-0 w-1 h-full pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #F5A623 0%, transparent 65%)' }}
      />

      <div className="page-container relative z-10 py-12 md:py-16">
        <div className="flex items-start lg:items-center gap-10 xl:gap-20">

          {/* ── LEFT: Text ── */}
          <div className="flex-1 min-w-0">

            {/* Eyebrow */}
            <div key={`tag-${current}`} className="mb-5">
              <span
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold animate-fade-in"
                style={{
                  background: 'rgba(245,166,35,0.14)',
                  border: '1px solid rgba(245,166,35,0.32)',
                  color: '#F5A623',
                }}
              >
                <Zap className="w-3 h-3" />
                {slide.eyebrow}
              </span>
            </div>

            {/* Heading */}
            <h1
              key={`h-${current}`}
              className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.04] tracking-tight mb-4 animate-slide-up"
            >
              {slide.title}
              <br />
              <span className="text-orange-gradient">{slide.highlight}</span>
            </h1>

            {/* Stats strip */}
            <div className="flex items-center gap-6 mb-4 flex-wrap">
              {STATS.map(({ value, label }, i) => (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <span className="w-px h-4 bg-white/10" />}
                  <span className="text-lg font-black text-brand-primary">{value}</span>
                  <span className="text-xs text-neutral-500 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <p
              key={`p-${current}`}
              className="text-neutral-400 text-sm md:text-base leading-relaxed max-w-md mb-7 animate-fade-in"
            >
              {slide.description}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
              <Link
                href={slide.ctaHref as any}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white
                           active:scale-[0.97] transition-transform duration-100"
                style={{
                  background: 'linear-gradient(135deg, #F5A623 0%, #DC8A0E 100%)',
                  boxShadow: '0 4px 22px rgba(245,166,35,0.45)',
                }}
              >
                {slide.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href={slide.secondaryHref as any}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm
                           active:scale-[0.97] transition-all duration-150"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.78)',
                }}
              >
                {slide.secondaryCta}
              </Link>
            </div>

            {/* Slide indicators */}
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? '28px' : '6px',
                    background: i === current ? '#F5A623' : 'rgba(255,255,255,0.18)',
                  }}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* ── RIGHT: Delivery badge + category grid (desktop) ── */}
          <div className="hidden lg:flex flex-col gap-3 w-60 xl:w-64 flex-shrink-0">

            {/* Delivery time — hero element */}
            <div
              className="rounded-2xl p-5 text-center relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, rgba(245,166,35,0.18) 0%, rgba(245,166,35,0.07) 100%)',
                border: '1px solid rgba(245,166,35,0.28)',
              }}
            >
              {/* Subtle orange glow */}
              <div
                className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 80% 10%, rgba(245,166,35,0.25) 0%, transparent 65%)',
                }}
              />
              <div className="relative z-10">
                <p className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.15em] mb-2">
                  Express Delivery
                </p>
                <p className="text-[72px] font-black text-white leading-none tracking-tight">
                  ~45
                </p>
                <p className="text-sm font-bold text-brand-primary leading-none mt-1 tracking-widest uppercase">
                  Minutes
                </p>
                <p className="text-[11px] text-neutral-500 mt-2 font-medium">
                  Andheri · Goregaon · Malad
                </p>
              </div>
            </div>

            {/* 2×2 category quick-links */}
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_CARDS.map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href as any}
                  className="flex flex-col items-center gap-2 py-4 rounded-xl group transition-all duration-200 cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onMouseEnter={e =>
                    ((e.currentTarget as HTMLElement).style.background =
                      'rgba(245,166,35,0.12)')
                  }
                  onMouseLeave={e =>
                    ((e.currentTarget as HTMLElement).style.background =
                      'rgba(255,255,255,0.04)')
                  }
                >
                  <Icon className="w-5 h-5 text-brand-primary" />
                  <span className="text-[11px] font-semibold text-neutral-400 group-hover:text-white transition-colors">
                    {label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Pay on delivery pill */}
            <div
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
              style={{
                background: 'rgba(22,163,74,0.09)',
                border: '1px solid rgba(22,163,74,0.22)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
              <span className="text-sm font-semibold text-green-400">Pay on Delivery</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
