'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const messages = [
  'Free delivery on orders above ₹10,000 — serving Andheri, Goregaon & Malad 🚀',
  '⚡ 30–60 minute delivery on construction materials in Mumbai',
  'Carpentry · Plumbing · Hardware · Electrical & more — all in one place',
];

export function AnnouncementBar() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((p) => (p + 1) % messages.length), 4000);
    return () => clearInterval(timer);
  }, []);

  if (!visible) return null;

  const prev = () => setCurrent((p) => (p - 1 + messages.length) % messages.length);
  const next = () => setCurrent((p) => (p + 1) % messages.length);

  return (
    <div className="w-full bg-brand-primary text-white text-center py-2.5 px-4 text-xs font-semibold relative overflow-hidden select-none">
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={prev}
          className="text-white/70 hover:text-white transition-colors shrink-0"
          aria-label="Previous announcement"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span key={current} className="animate-ticker">
          {messages[current]}
        </span>
        <button
          onClick={next}
          className="text-white/70 hover:text-white transition-colors shrink-0"
          aria-label="Next announcement"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
        aria-label="Close announcement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
