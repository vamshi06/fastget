'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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

// A clone of the first slide appended at the end lets the track scroll one
// step past the last real slide, which we then jump back from invisibly —
// giving a seamless loop from slide 3 back to slide 1.
const extendedSlides = [...slides, slides[0]];

export function HeroSection() {
  const [dot, setDot] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const isInteracting = useRef(false);
  const resumeAt = useRef(0);
  const loopTimeout = useRef<ReturnType<typeof setTimeout>>();

  const scrollToIndex = useCallback((i: number) => {
    const track = trackRef.current;
    const child = track?.children[i] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }, []);

  // Autoplay — pauses while the user is actively dragging/swiping the track
  useEffect(() => {
    const t = setInterval(() => {
      if (isInteracting.current || Date.now() < resumeAt.current) return;
      const next = positionRef.current + 1;
      positionRef.current = next;
      setDot(next % slides.length);
      scrollToIndex(next);
    }, 5000);
    return () => clearInterval(t);
  }, [scrollToIndex]);

  // Keep the indicators in sync with manual scrolling/swiping, and loop back
  // to the real first slide once the cloned slide at the end is reached.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame: number;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const index = Math.round(track.scrollLeft / track.clientWidth);
        positionRef.current = index;
        setDot(index % slides.length);

        if (index === slides.length && !loopTimeout.current) {
          loopTimeout.current = setTimeout(() => {
            track.scrollLeft = 0;
            positionRef.current = 0;
            loopTimeout.current = undefined;
          }, 400);
        }
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(loopTimeout.current);
    };
  }, []);

  const handleInteractionStart = () => {
    isInteracting.current = true;
  };
  const handleInteractionEnd = () => {
    isInteracting.current = false;
    resumeAt.current = Date.now() + 4000;
  };

  const handleDotClick = (i: number) => {
    resumeAt.current = Date.now() + 4000;
    positionRef.current = i;
    setDot(i);
    scrollToIndex(i);
  };

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

        {/* Scrollable, snap-paged track — auto-advances but the user can swipe/drag too */}
        <div
          ref={trackRef}
          className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onPointerDown={handleInteractionStart}
          onPointerUp={handleInteractionEnd}
          onPointerCancel={handleInteractionEnd}
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
        >
          {extendedSlides.map((slide, i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-full"
              aria-hidden={i === slides.length}
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

        {/* Indicators — outside the track, always in the same place */}
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === dot ? '28px' : '6px',
                background: i === dot ? '#F5A623' : 'rgba(255,255,255,0.18)',
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
