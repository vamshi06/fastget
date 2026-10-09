'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Makes a full-screen overlay / bottom sheet behave like a native screen: the
// Android back button (and browser back) closes it instead of leaving the page.
//
// Opening pushes a same-URL history entry; Next 14.2 patches pushState to
// carry its router state, so popping it is a no-op route restore. Returns a
// close() to use for in-UI close buttons - it pops that entry, which then
// fires onClose via popstate, keeping history and UI in step.
export function useBackToClose(open: boolean, onClose: () => void) {
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ fgOverlay: true }, '');
    pushedRef.current = true;

    const onPopState = () => {
      pushedRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [open]);

  // Only pop if our entry is still on top - a router.replace() while open
  // overwrites it, and popping then would undo that navigation instead.
  // Don't use this hook for UI that router.replace()s while open (e.g. the
  // catalog filter sheet).
  const close = useCallback(() => {
    if (pushedRef.current && window.history.state?.fgOverlay) {
      window.history.back();
    } else {
      pushedRef.current = false;
      onCloseRef.current();
    }
  }, []);

  // For leaving the overlay by navigating somewhere (e.g. picking a search
  // result): forget the entry so the caller can router.replace() over it
  // and Back returns to the page underneath, not to a dead overlay entry.
  const release = useCallback(() => {
    pushedRef.current = false;
  }, []);

  return { close, release };
}

// True below Tailwind's md breakpoint - for UI that's a bottom sheet on
// phones but inline on larger screens.
export function useIsPhone() {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isPhone;
}

// Stops the page behind an overlay from scrolling.
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
