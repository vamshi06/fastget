import Link from 'next/link';
import { ArrowRight, HardHat } from 'lucide-react';

export function RentalBanner() {
  return (
    <section
      className="relative overflow-hidden rounded-3xl text-white p-8 md:p-12"
      style={{
        background: 'linear-gradient(135deg, #1C1C1E 0%, #2A2A2C 60%, #1C1C1E 100%)',
      }}
    >
      {/* Industrial motion lines */}
      <div className="absolute inset-0 bg-motion-lines pointer-events-none" />

      {/* Orange glow — top right */}
      <div
        className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 85% 15%, rgba(245,166,35,0.12) 0%, transparent 65%)',
        }}
      />

      {/* Left orange accent bar */}
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-3xl pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #F5A623, #B8690A 70%, transparent)' }}
      />

      <div className="relative z-10 max-w-lg">
        {/* Eyebrow */}
        <span
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
          style={{
            background: 'rgba(245,166,35,0.12)',
            border: '1px solid rgba(245,166,35,0.28)',
            color: '#F5A623',
          }}
        >
          <HardHat className="w-3.5 h-3.5" />
          Site Materials · Fast Delivery
        </span>

        <h2 className="text-3xl md:text-4xl font-black leading-tight mb-3 tracking-tight">
          Everything Your Site Needs.
          <br />
          <span className="text-orange-gradient">Delivered in Minutes.</span>
        </h2>

        <p className="text-neutral-400 mb-6 leading-relaxed">
          Carpentry, plumbing, hardware, electrical & adhesives — all from one place
          with 30–60 min delivery across Mumbai.
        </p>

        {/* Proof points */}
        <div className="flex items-center gap-5 mb-8 flex-wrap">
          {[
            ['⚡', '30–60 min ETA'],
            ['💳', 'Pay on delivery'],
            ['📱', 'No app needed'],
          ].map(([emoji, text]) => (
            <div key={text} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
              <span>{emoji}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white transition-all duration-150 active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #F5A623 0%, #DC8A0E 100%)',
            boxShadow: '0 4px 14px rgba(245,166,35,0.32)',
          }}
        >
          Browse All Products
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
