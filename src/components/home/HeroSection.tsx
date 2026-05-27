'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Package, Clock, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

const slides = [
  {
    eyebrow: 'Mumbai\'s Fastest Delivery',
    title: 'Construction Materials',
    highlight: 'Delivered in 30–60 Min',
    description: 'Carpentry, Plumbing, Hardware, Electrical & more — everything your build site needs, delivered same-day across Andheri, Goregaon & Malad.',
    cta: 'Browse Products',
    ctaHref: '/catalog',
    stat: '500+ Products',
    statIcon: Package,
  },
  {
    eyebrow: 'Site Materials · No Delays',
    title: 'Keep Your Project',
    highlight: 'Moving Without Stops',
    description: 'Plywood, hinges, CPVC fittings, wires, bolts — urgent materials delivered to your Mumbai site before work stops.',
    cta: 'Shop Now',
    ctaHref: '/catalog',
    stat: '30–60 min ETA',
    statIcon: Clock,
  },
  {
    eyebrow: '5 Categories · One Place',
    title: 'Carpentry, Plumbing,',
    highlight: 'Hardware & More',
    description: 'From plywood boards to CPVC fittings, electrical accessories to adhesives — your one-stop shop for all site materials in Mumbai.',
    cta: 'Track Your Order',
    ctaHref: '/order',
    stat: 'Pay on Delivery',
    statIcon: Shield,
  },
];

export function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const slide = slides[current];
  const StatIcon = slide.statIcon;

  return (
    <section
      className="relative overflow-hidden text-white"
      style={{
        minHeight: '480px',
        background: 'linear-gradient(135deg, #1C1C1E 0%, #2A2A2C 40%, #1C1C1E 100%)',
      }}
    >
      {/* Industrial diagonal motion lines */}
      <div className="absolute inset-0 bg-motion-lines opacity-100 pointer-events-none" />

      {/* Subtle orange glow — bottom-right corner */}
      <div
        className="absolute bottom-0 right-0 w-[480px] h-[480px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 80% 80%, rgba(245,166,35,0.08) 0%, transparent 65%)',
        }}
      />

      {/* Orange top-left accent streak */}
      <div
        className="absolute top-0 left-0 w-1 h-full pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #F5A623, transparent 60%)' }}
      />

      <div className="page-container relative z-10 py-16 md:py-24">
        <div className="max-w-2xl">

          {/* Eyebrow tag */}
          <div className="flex items-center gap-2 mb-5" key={`tag-${current}`}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold animate-fade-in"
              style={{
                background: 'rgba(245,166,35,0.12)',
                border: '1px solid rgba(245,166,35,0.30)',
                color: '#F5A623',
              }}
            >
              <Zap className="w-3 h-3" />
              {slide.eyebrow}
            </span>
          </div>

          {/* Main heading */}
          <h1
            key={`h-${current}`}
            className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight animate-slide-up"
          >
            {slide.title}
            <br />
            <span className="text-orange-gradient">{slide.highlight}</span>
          </h1>

          <p
            key={`p-${current}`}
            className="text-neutral-400 text-base md:text-lg mt-5 mb-8 leading-relaxed max-w-xl animate-fade-in"
          >
            {slide.description}
          </p>

          {/* CTA row */}
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href={slide.ctaHref as any}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl font-semibold text-sm text-white transition-all duration-150 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #F5A623 0%, #DC8A0E 100%)',
                boxShadow: '0 4px 14px rgba(245,166,35,0.35)',
              }}
            >
              {slide.cta}
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.60)' }}>
              <StatIcon className="w-4 h-4 text-brand-primary" />
              <span>{slide.stat}</span>
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="flex items-center gap-2 mt-12">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === current ? '28px' : '8px',
                background: i === current ? '#F5A623' : 'rgba(255,255,255,0.25)',
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Floating trust badges — bottom right */}
      <div className="absolute bottom-6 right-6 hidden lg:flex flex-col gap-2">
        {[
          { icon: Clock,  text: '30–60 min delivery' },
          { icon: Shield, text: 'Pay on Delivery' },
        ].map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Icon className="w-4 h-4 text-brand-primary" />
            <span style={{ color: 'rgba(255,255,255,0.80)' }}>{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
