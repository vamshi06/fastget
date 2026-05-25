'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Package, Clock, Shield } from 'lucide-react';
import Link from 'next/link';

const slides = [
  {
    tag: '⚡ Mumbai\'s Fastest',
    title: 'Construction Materials',
    subtitle: 'Delivered in 30–60 Minutes',
    description: 'Carpentry, Plumbing, Hardware, Electrical & more — everything for your build site, delivered same-day across Andheri, Goregaon & Malad.',
    cta: 'Browse Products',
    ctaLink: '/catalog',
    accent: '#F5A623',
    bg: 'from-[#1A1A1A] via-[#2a2a2a] to-[#1A1A1A]',
    stat: '500+ Products',
  },
  {
    tag: '🏗️ Site Materials',
    title: 'Keep Your Project',
    subtitle: 'Moving Without Stops',
    description: 'Plywood, hinges, CPVC fittings, wires, bolts — urgent materials delivered to your Mumbai site before work stops.',
    cta: 'Shop Now',
    ctaLink: '/catalog',
    accent: '#10B981',
    bg: 'from-[#0a1628] via-[#1a2840] to-[#0a1628]',
    stat: '30–60 min ETA',
  },
  {
    tag: '🎯 5 Categories',
    title: 'Carpentry, Plumbing',
    subtitle: 'Hardware & More',
    description: 'From plywood boards to CPVC fittings, electrical accessories to adhesives — your one-stop shop for site materials in Mumbai.',
    cta: 'Track Your Order',
    ctaLink: '/order',
    accent: '#9333EA',
    bg: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
    stat: 'Pay on Delivery',
  },
];

export function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const slide = slides[current];

  return (
    <section
      className={`relative bg-gradient-to-br ${slide.bg} text-white overflow-hidden transition-all duration-700`}
      style={{ minHeight: '480px' }}
    >
      {/* Background dot pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="page-container relative z-10 py-16 md:py-24">
        <div className="max-w-2xl">
          {/* Tag */}
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5 animate-fade-in"
            style={{
              backgroundColor: `${slide.accent}20`,
              color: slide.accent,
              border: `1px solid ${slide.accent}40`,
            }}
          >
            {slide.tag}
          </span>

          {/* Heading */}
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight animate-slide-up"
            key={current}
          >
            {slide.title}
            <br />
            <span style={{ color: slide.accent }}>{slide.subtitle}</span>
          </h1>

          <p className="text-gray-300 text-lg mt-4 mb-8 leading-relaxed max-w-xl animate-fade-in">
            {slide.description}
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href={slide.ctaLink as any}
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl text-white font-semibold text-base transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: slide.accent }}
            >
              {slide.cta} <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
              <Package className="w-4 h-4" style={{ color: slide.accent }} />
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
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === current ? '32px' : '8px',
                backgroundColor: i === current ? slide.accent : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Floating delivery badges */}
      <div className="absolute bottom-6 right-6 hidden lg:flex flex-col gap-2">
        {[
          { icon: Clock, text: '30–60 min delivery' },
          { icon: Shield, text: 'Pay on Delivery' },
        ].map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-medium border border-white/20"
          >
            <Icon className="w-4 h-4" style={{ color: slide.accent }} />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
