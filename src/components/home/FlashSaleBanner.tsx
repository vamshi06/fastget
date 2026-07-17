'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Zap, ArrowRight, Package } from 'lucide-react';
import type { ActiveFlashSale } from '@/lib/products';

interface FlashSaleBannerProps {
  sale: ActiveFlashSale;
}

function getTimeLeft(endsAt: string) {
  const diffMs = new Date(endsAt).getTime() - Date.now();
  const clamped = Math.max(0, diffMs);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    expired: diffMs <= 0,
    days:    Math.floor(totalSeconds / 86400),
    hours:   Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function FlashSaleBanner({ sale }: FlashSaleBannerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(sale.saleEndsAt));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft(sale.saleEndsAt)), 1000);
    return () => clearInterval(interval);
  }, [sale.saleEndsAt]);

  // Sale window has lapsed client-side — hide rather than show a stale ₹1 offer.
  if (timeLeft.expired) return null;

  const discountPct = Math.round((1 - sale.salePriceRupees / sale.originalPriceRupees) * 100);

  return (
    <Link
      href={`/product/${sale.productCode}`}
      className="relative block overflow-hidden rounded-2xl text-white p-4 active:scale-[0.99] transition-transform duration-150"
      style={{
        background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 60%, #7F1D1D 100%)',
      }}
    >
      <div className="absolute inset-0 bg-motion-lines opacity-10 pointer-events-none" />
      <div
        className="absolute top-0 right-0 w-56 h-56 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 90% 10%, rgba(245,166,35,0.35) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10">
        {/* Eyebrow */}
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-3"
          style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.35)' }}
        >
          <Zap className="w-3 h-3 fill-current" />
          FLASH SALE · LIMITED TIME
        </span>

        {/* Product row: image + name/price */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-16 h-16 flex-shrink-0 bg-white rounded-xl overflow-hidden">
            {sale.imageUrl ? (
              <Image
                src={sale.imageUrl}
                alt={sale.name}
                fill
                sizes="64px"
                className="object-contain p-1.5"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-6 h-6 text-neutral-300" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight truncate mb-1">
              {sale.brand ? `${sale.brand} ` : ''}{sale.name}
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl font-black" style={{ color: '#F5A623' }}>
                ₹{sale.salePriceRupees}
              </span>
              <span className="text-sm font-medium line-through text-white/50">
                ₹{sale.originalPriceRupees}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-red-700">
                {discountPct}% OFF
              </span>
            </div>
          </div>
        </div>

        {/* Countdown + CTA */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {[
              [timeLeft.days, 'd'],
              [timeLeft.hours, 'h'],
              [timeLeft.minutes, 'm'],
              [timeLeft.seconds, 's'],
            ].map(([val, unit]) => (
              <span
                key={unit as string}
                suppressHydrationWarning
                className="min-w-[2.25rem] text-center px-1.5 py-1 rounded-md bg-white/20 font-mono font-bold text-[11px] tabular-nums"
              >
                {pad(val as number)}{unit}
              </span>
            ))}
          </div>

          <span
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl font-semibold text-xs text-red-700 bg-white flex-shrink-0"
          >
            Grab It Now
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
