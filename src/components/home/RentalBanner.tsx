import Link from 'next/link';
import { ArrowRight, Wrench } from 'lucide-react';

export function RentalBanner() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1a1a2e] to-[#16213e] text-white p-8 md:p-12">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 80% 50%, #9333EA 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10 max-w-lg">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30 mb-4">
          <Wrench className="w-3.5 h-3.5" /> Site Materials
        </span>
        <h2 className="text-3xl md:text-4xl font-black leading-tight mb-3">
          Everything Your Site Needs.<br />
          <span className="text-purple-400">Delivered in Minutes.</span>
        </h2>
        <p className="text-gray-300 mb-6">
          Carpentry, plumbing, hardware, electrical & adhesives — all from one place with 30–60 min delivery across Mumbai.
        </p>
        <div className="flex items-center gap-4 mb-8">
          {[
            ['30–60 min ETA', '⚡'],
            ['Pay on delivery', '💰'],
            ['No app needed', '📱'],
          ].map(([text, emoji]) => (
            <div key={text} className="text-sm text-gray-300 flex items-center gap-1.5">
              <span>{emoji}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
        >
          Browse All Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
