'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { HomeBanner } from '@/lib/banners';

const AUTOPLAY_MS = 4500;

/**
 * Home hero as image banners, managed from /admin/banners. Swipeable,
 * snaps slide-by-slide, auto-advances (paused while the user is touching it),
 * and wraps from the last slide back to the first.
 */
export function BannerCarousel({ banners }: { banners: HomeBanner[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const touching = useRef(false);
  const resumeAt = useRef(0);

  // Scroll only the track - scrollIntoView would also scroll the page.
  const scrollToIndex = useCallback((i: number) => {
    const track = trackRef.current;
    const slide = track?.children[i] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      if (touching.current || Date.now() < resumeAt.current) return;
      setActive((i) => {
        const next = (i + 1) % banners.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [banners.length, scrollToIndex]);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const first = track.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 12 : track.clientWidth; // + gap-3
    setActive(Math.min(banners.length - 1, Math.round(track.scrollLeft / step)));
  };

  const pause = () => { touching.current = true; };
  const resume = () => { touching.current = false; resumeAt.current = Date.now() + 4000; };

  return (
    <section className="page-container pt-3 md:pt-6" aria-roledescription="carousel">
      <div
        ref={trackRef}
        onScroll={onScroll}
        onTouchStart={pause}
        onTouchEnd={resume}
        onPointerDown={pause}
        onPointerUp={resume}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scrollbar"
      >
        {banners.map((b, i) => {
          const image = (
            // eslint-disable-next-line @next/next/no-img-element -- admin-managed external URL
            <img
              src={b.imageUrl}
              alt={b.altText}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          );
          const cls = 'block snap-start shrink-0 w-full aspect-[2/1] md:aspect-[3/1] rounded-2xl overflow-hidden bg-neutral-200';
          return b.linkUrl ? (
            <Link key={b.id} href={b.linkUrl as any} className={`pressable ${cls}`}>
              {image}
            </Link>
          ) : (
            <div key={b.id} className={cls}>{image}</div>
          );
        })}
      </div>

      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Banner ${i + 1}`}
              onClick={() => { resumeAt.current = Date.now() + 4000; setActive(i); scrollToIndex(i); }}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === active ? 20 : 6, background: i === active ? '#1C1C1E' : 'rgba(0,0,0,0.18)' }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
