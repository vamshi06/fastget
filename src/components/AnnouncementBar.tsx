'use client';

import { useState, useEffect } from 'react';
import { Truck, X } from 'lucide-react';

const messages = [
  '🚀 Free delivery on orders above ₹10,000 — serving Andheri, Goregaon & Malad',
  '⚡ 30–60 minute delivery on construction materials in Mumbai',
  '🔨 Carpentry, Plumbing, Hardware, Electrical & more — all in one place',
];

export function AnnouncementBar() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="announcement-bar relative overflow-hidden">
      <div className="flex items-center justify-center gap-2 relative z-10">
        <Truck className="w-3.5 h-3.5 flex-shrink-0 text-brand-primary" />
        <span key={current} className="animate-fade-in">
          {messages[current]}
        </span>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
        aria-label="Close announcement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
