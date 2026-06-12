'use client';

import { useState, useEffect } from 'react';

const slides = [
  {
    title: 'Construction Materials',
    highlight: 'Delivered in 60 Min',
    description:
      'Carpentry, Plumbing, Hardware, Electrical & more everything your site needs, delivered same-day.',
  },
  {
    title: 'Keep Your Project',
    highlight: 'Moving Without Stops',
    description:
      'Plywood, hinges, CPVC fittings, wires, bolts urgent materials to your Mumbai site before work stops.',
  },
  {
    title: 'Carpentry, Plumbing,',
    highlight: 'Hardware & More',
    description:
      'From plywood boards to CPVC fittings, electrical accessories to adhesives your one-stop site store.',
  },
];

export function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

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

      {/* Orange radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 78% 42%, rgba(245,166,35,0.11) 0%, transparent 58%)',
        }}
      />

      <div className="page-container relative z-10 py-7 md:py-10">

        {/* All slides stacked in the same grid cell — container sized to tallest */}
        <div className="grid">
          {slides.map((slide, i) => (
            <div
              key={i}
              style={{ gridArea: '1 / 1' }}
              className={`transition-opacity duration-500 ${
                i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.04] tracking-tight mb-4">
                {slide.title}
                <br />
                <span className="text-orange-gradient">{slide.highlight}</span>
              </h1>
              <p className="text-neutral-400 text-sm md:text-base leading-relaxed max-w-md mb-7">
                {slide.description}
              </p>
            </div>
          ))}
        </div>

        {/* Indicators — outside the grid, always in the same place */}
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
    </section>
  );
}
