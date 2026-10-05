'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActiveFlashSale } from '@/lib/products';
import { FlashSaleBanner } from './FlashSaleBanner';

interface FlashSaleCarouselProps {
  sales: ActiveFlashSale[];
}

/**
 * Homepage flash sale strip. A single sale renders as the full-width banner;
 * several sales become a swipeable row (2 per view on desktop, with the next
 * card peeking on mobile). Each card runs its own countdown and drops out
 * when its sale ends.
 */
export function FlashSaleCarousel({ sales: initialSales }: FlashSaleCarouselProps) {
  const [sales, setSales] = useState(initialSales);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Arrows/dots only make sense when cards overflow — e.g. 2 sales on desktop
  // both fit side by side, so there's nothing to navigate.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => setCanScroll(track.scrollWidth > track.clientWidth + 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [sales.length]);

  const handleExpire = useCallback((productCode: string) => {
    setSales((prev) => prev.filter((s) => s.productCode !== productCode));
  }, []);

  const handleScroll = () => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return;
    // At the far end (2-up desktop view) the last card can't snap to the left
    // edge, so treat "scrolled to end" as the last card being active.
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) {
      setActiveIndex(sales.length - 1);
      return;
    }
    const step = first.offsetWidth + 12; // card width + gap-3
    setActiveIndex(Math.min(sales.length - 1, Math.round(track.scrollLeft / step)));
  };

  const scrollToIndex = (index: number) => {
    const track = trackRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  };

  if (sales.length === 0) return null;

  if (sales.length === 1) {
    return <FlashSaleBanner sale={sales[0]} onExpire={handleExpire} />;
  }

  return (
    <div className="relative group">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scrollbar"
      >
        {sales.map((sale) => (
          <div
            key={sale.productCode}
            className="snap-start flex-shrink-0 w-[88%] sm:w-[70%] lg:w-[calc(50%-6px)]"
          >
            <FlashSaleBanner sale={sale} onExpire={handleExpire} />
          </div>
        ))}
      </div>

      {canScroll && (
        <>
          {/* Desktop arrows */}
          <button
            type="button"
            aria-label="Previous sale"
            onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-white shadow-md text-neutral-700 disabled:opacity-0 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Next sale"
            onClick={() => scrollToIndex(Math.min(sales.length - 1, activeIndex + 1))}
            disabled={activeIndex >= sales.length - 1}
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-white shadow-md text-neutral-700 disabled:opacity-0 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {sales.map((sale, i) => (
              <button
                key={sale.productCode}
                type="button"
                aria-label={`Go to sale ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex ? 'w-5 bg-red-600' : 'w-1.5 bg-neutral-300'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
